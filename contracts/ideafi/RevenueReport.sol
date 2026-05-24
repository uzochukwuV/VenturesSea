// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IIdeaFi.sol";

// ---------------------------------------------------------------------------
// RevenueReport
// ---------------------------------------------------------------------------

contract RevenueReport is Initializable {

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------

    struct Report {
        uint256   reportId;
        uint256   ideaId;
        uint256   periodStart;
        uint256   periodEnd;
        bytes32   reportHash;
        address[] tokensReported;
        uint256[] amountsReported;
        bool      lpAcknowledged;
        bool      disputed;
        uint256   acknowledgementCount;
        uint256   disputeDeadline;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    uint256 public ideaId;
    address public registry;
    address public fundingPool;

    mapping(uint256 => Report) public reports;
    uint256 public reportCount;

    // Per-report acknowledgement & dispute tracking
    mapping(uint256 => mapping(address => bool)) public hasAcknowledged;
    mapping(uint256 => mapping(address => bool)) public hasDisputed;

    // LP tracking for majority calculation
    mapping(address => bool) public isKnownLP;
    uint256 public lpCount;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event ReportSubmitted(
        uint256 indexed reportId,
        address indexed builder,
        uint256 periodStart,
        uint256 periodEnd,
        bytes32 reportHash
    );
    event Acknowledged(uint256 indexed reportId, address indexed lp, uint256 newCount);
    event MajorityAcknowledged(uint256 indexed reportId);
    event DisputeRaised(uint256 indexed reportId, address indexed lp, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed reportId, bool builderGuilty, string recommendation);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyBuilder() {
        address agreementAddr = IIdeaRegistry(registry).getBuilderAgreement(ideaId);
        address builder = IBuilderAgreement(agreementAddr).getBuilder();
        require(msg.sender == builder, "RevenueReport: caller is not the builder");
        _;
    }

    modifier onlyLP() {
        uint256 deposited = IFundingPool(fundingPool).deposits(msg.sender);
        require(deposited > 0, "RevenueReport: caller has no LP deposit");
        _;
    }

    modifier onlyDAO() {
        require(msg.sender == IIdeaRegistry(registry).getIdeaDAO(ideaId), "RevenueReport: caller is not the DAO");
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor (supports both direct deployment and proxy pattern)
    // -----------------------------------------------------------------------

    /**
     * @dev Flexible constructor for both direct deployment and proxy patterns.
     *      For direct deployment (tests): pass all initialization arguments
     *      For proxy pattern: pass zero registry and use initialize() afterwards
     */
    constructor(uint256 _ideaId, address _registry, address _fundingPool) {
        if (_registry != address(0)) {
            _initialize(_ideaId, _registry, _fundingPool);
        }
        // For proxy pattern, constructor does nothing - use initialize() instead
    }

    function _initialize(uint256 _ideaId, address _registry, address _fundingPool) internal {
        ideaId      = _ideaId;
        registry    = _registry;
        fundingPool = _fundingPool;
    }

    // -----------------------------------------------------------------------
    // Initializer (for proxy pattern)
    // -----------------------------------------------------------------------

    function initialize(
        uint256 _ideaId,
        address _registry,
        address _fundingPool
    ) external initializer {
        require(_registry    != address(0), "RevenueReport: zero registry");
        require(_fundingPool != address(0), "RevenueReport: zero fundingPool");
        _initialize(_ideaId, _registry, _fundingPool);
    }

    // -----------------------------------------------------------------------
    // Builder actions
    // -----------------------------------------------------------------------

    /// @notice Submit a new revenue report for a given period.
    function submitReport(
        uint256          periodStart,
        uint256          periodEnd,
        bytes32          reportHash,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external onlyBuilder {
        require(periodEnd > periodStart,          "RevenueReport: invalid period");
        require(tokens.length == amounts.length,  "RevenueReport: array length mismatch");

        uint256 reportId = reportCount;
        reportCount++;

        Report storage r = reports[reportId];
        r.reportId             = reportId;
        r.ideaId               = ideaId;
        r.periodStart          = periodStart;
        r.periodEnd            = periodEnd;
        r.reportHash           = reportHash;
        r.lpAcknowledged       = false;
        r.disputed             = false;
        r.acknowledgementCount = 0;
        r.disputeDeadline      = block.timestamp + 30 days;

        for (uint256 i = 0; i < tokens.length; i++) {
            r.tokensReported.push(tokens[i]);
            r.amountsReported.push(amounts[i]);
        }

        emit ReportSubmitted(reportId, msg.sender, periodStart, periodEnd, reportHash);
    }

    // -----------------------------------------------------------------------
    // LP actions
    // -----------------------------------------------------------------------

    /// @notice Acknowledge a revenue distribution report.
    function acknowledgeDistribution(uint256 reportId) external onlyLP {
        require(reportId < reportCount,                       "RevenueReport: invalid reportId");
        require(!hasAcknowledged[reportId][msg.sender],       "RevenueReport: already acknowledged");

        // Track this LP if we haven't seen them before
        if (!isKnownLP[msg.sender]) {
            isKnownLP[msg.sender] = true;
            lpCount++;
        }

        hasAcknowledged[reportId][msg.sender] = true;
        reports[reportId].acknowledgementCount++;

        uint256 count = reports[reportId].acknowledgementCount;
        emit Acknowledged(reportId, msg.sender, count);

        // Majority check: count / lpCount >= 50 % → count * 10000 / lpCount >= 5000
        if (!reports[reportId].lpAcknowledged && lpCount > 0) {
            if (count * 10_000 / lpCount >= 5_000) {
                reports[reportId].lpAcknowledged = true;
                emit MajorityAcknowledged(reportId);
            }
        }
    }

    /// @notice Raise a dispute against a revenue report.
    function raiseDispute(uint256 reportId, bytes32 evidenceHash) external onlyLP {
        require(reportId < reportCount,                             "RevenueReport: invalid reportId");
        require(block.timestamp <= reports[reportId].disputeDeadline, "RevenueReport: dispute deadline passed");
        require(!hasDisputed[reportId][msg.sender],                 "RevenueReport: already disputed");

        hasDisputed[reportId][msg.sender] = true;
        reports[reportId].disputed = true;

        emit DisputeRaised(reportId, msg.sender, evidenceHash);
    }

    // -----------------------------------------------------------------------
    // DAO actions
    // -----------------------------------------------------------------------

    /// @notice Resolve a disputed report.
    function resolveDispute(uint256 reportId, bool builderGuilty) external onlyDAO {
        require(reportId < reportCount,          "RevenueReport: invalid reportId");
        require(reports[reportId].disputed,      "RevenueReport: report not disputed");

        // Mark dispute as resolved regardless of outcome
        reports[reportId].disputed = false;

        string memory recommendation = builderGuilty
            ? "SLASH_BUILDER: call BuilderAgreement.slash() to execute penalty"
            : "NO_ACTION: dispute resolved in builder's favour";

        emit DisputeResolved(reportId, builderGuilty, recommendation);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /// @notice Return the token and amount arrays for a given report.
    function getReportTokens(uint256 reportId)
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        require(reportId < reportCount, "RevenueReport: invalid reportId");
        Report storage r = reports[reportId];
        return (r.tokensReported, r.amountsReported);
    }

    /// @notice Check whether a report's dispute window is still open.
    function isDisputeWindowOpen(uint256 reportId) external view returns (bool) {
        require(reportId < reportCount, "RevenueReport: invalid reportId");
        return block.timestamp <= reports[reportId].disputeDeadline;
    }
}
