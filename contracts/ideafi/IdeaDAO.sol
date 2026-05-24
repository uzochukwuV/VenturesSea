// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IIdeaFi.sol";

// ---------------------------------------------------------------------------
// IdeaDAO
// ---------------------------------------------------------------------------

contract IdeaDAO is Initializable {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    uint256 public constant QUORUM_BPS = 1000;         // 10%
    uint256 public constant TIMELOCK = 48 hours;
    uint256 public constant NULLIFY_THRESHOLD_BPS = 6600; // 66%
    uint8 public constant STATUS_CANCELLED = 3;

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    enum ProposalType {
        SELECT_BUILDER,
        APPROVE_MVP,
        APPROVE_MILESTONE,
        SET_MILESTONE_CRITERIA,
        NULLIFY_IDEA,
        FORK_IDEA,
        RELEASE_FUNDS,
        SET_REVENUE_TERMS
    }

    struct Proposal {
        uint256 proposalId;
        ProposalType pType;
        bytes32 descriptionHash;
        bytes callData;
        address target;
        address proposer;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
        bool cancelled;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    uint256 public ideaId;
    address public registry;
    address public ideaToken;

    // Cached idea-specific addresses (populated lazily via getIdeaAddresses)
    address public fundingPool;
    address public builderAgreement;
    address public milestone;
    address public revenueReport;
    bool private addressesCached;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => uint256) public proposalEta;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType pType,
        address indexed proposer,
        uint256 deadline
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event Queued(uint256 indexed proposalId, uint256 eta);
    event Executed(uint256 indexed proposalId);
    event Cancelled(uint256 indexed proposalId);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlySelf() {
        require(msg.sender == address(this), "IdeaDAO: only callable via executeProposal");
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
    constructor(uint256 _ideaId, address _registry, address _ideaToken) {
        if (_registry != address(0)) {
            _initialize(_ideaId, _registry, _ideaToken);
        }
        // For proxy pattern, constructor does nothing - use initialize() instead
    }

    function _initialize(uint256 _ideaId, address _registry, address _ideaToken) internal {
        ideaId = _ideaId;
        registry = _registry;
        ideaToken = _ideaToken;
    }

    // -----------------------------------------------------------------------
    // Initializer (for proxy pattern)
    // -----------------------------------------------------------------------

    function initialize(uint256 _ideaId, address _registry, address _ideaToken) external initializer {
        require(_registry != address(0), "IdeaDAO: zero registry");
        require(_ideaToken != address(0), "IdeaDAO: zero ideaToken");
        _initialize(_ideaId, _registry, _ideaToken);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// @dev Fetch and cache idea-specific addresses from the registry.
    function getIdeaAddresses() internal {
        if (addressesCached) return;
        IIdeaRegistry reg = IIdeaRegistry(registry);
        fundingPool = reg.getFundingPool(ideaId);
        builderAgreement = reg.getBuilderAgreement(ideaId);
        milestone = reg.getMilestone(ideaId);
        revenueReport = reg.getRevenueReport(ideaId);
        addressesCached = true;
    }

    // -----------------------------------------------------------------------
    // Proposal lifecycle
    // -----------------------------------------------------------------------

    /// @notice Create a governance proposal. Caller must hold IdeaTokens.
    function createProposal(
        ProposalType pType,
        bytes32 descriptionHash,
        address target,
        bytes calldata callData,
        uint256 votingPeriod
    ) external {
        require(IERC20(ideaToken).balanceOf(msg.sender) > 0, "IdeaDAO: no token balance");
        require(votingPeriod >= 1 days, "IdeaDAO: votingPeriod < 1 day");

        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            proposalId: id,
            pType: pType,
            descriptionHash: descriptionHash,
            callData: callData,
            target: target,
            proposer: msg.sender,
            forVotes: 0,
            againstVotes: 0,
            deadline: block.timestamp + votingPeriod,
            executed: false,
            cancelled: false
        });

        emit ProposalCreated(id, pType, msg.sender, block.timestamp + votingPeriod);
    }

    /// @notice Cast a vote on an active proposal.
    function castVote(uint256 proposalId, bool support) external {
        require(proposalId < proposalCount, "IdeaDAO: invalid proposalId");
        Proposal storage p = proposals[proposalId];
        require(!p.cancelled, "IdeaDAO: proposal cancelled");
        require(!p.executed, "IdeaDAO: proposal already executed");
        require(block.timestamp <= p.deadline, "IdeaDAO: voting period ended");
        require(!hasVoted[proposalId][msg.sender], "IdeaDAO: already voted");

        uint256 weight = IERC20(ideaToken).balanceOf(msg.sender);
        require(weight > 0, "IdeaDAO: no token balance");

        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }
        hasVoted[proposalId][msg.sender] = true;

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /// @notice Queue a passed proposal for execution after the timelock.
    function queueProposal(uint256 proposalId) external {
        require(proposalId < proposalCount, "IdeaDAO: invalid proposalId");
        Proposal storage p = proposals[proposalId];
        require(!p.cancelled, "IdeaDAO: proposal cancelled");
        require(!p.executed, "IdeaDAO: already executed");
        require(proposalEta[proposalId] == 0, "IdeaDAO: already queued");
        require(block.timestamp > p.deadline, "IdeaDAO: voting not ended");

        uint256 totalSupply = IERC20(ideaToken).totalSupply();
        require(totalSupply > 0, "IdeaDAO: zero total supply");
        require(p.forVotes > p.againstVotes, "IdeaDAO: proposal did not pass");
        require(
            (p.forVotes * 10000) / totalSupply >= QUORUM_BPS,
            "IdeaDAO: quorum not reached"
        );

        // Nullify requires 66% supermajority
        if (p.pType == ProposalType.NULLIFY_IDEA) {
            require(
                (p.forVotes * 10000) / totalSupply >= NULLIFY_THRESHOLD_BPS,
                "IdeaDAO: nullify requires 66% supermajority"
            );
        }

        uint256 eta = block.timestamp + TIMELOCK;
        proposalEta[proposalId] = eta;
        emit Queued(proposalId, eta);
    }

    /// @notice Execute a queued proposal after the timelock has elapsed.
    function executeProposal(uint256 proposalId) external {
        require(proposalId < proposalCount, "IdeaDAO: invalid proposalId");
        Proposal storage p = proposals[proposalId];
        require(!p.cancelled, "IdeaDAO: proposal cancelled");
        require(!p.executed, "IdeaDAO: already executed");

        uint256 eta = proposalEta[proposalId];
        require(eta != 0, "IdeaDAO: proposal not queued");
        require(block.timestamp >= eta, "IdeaDAO: timelock not elapsed");

        p.executed = true;

        if (p.target != address(0) && p.callData.length > 0) {
            (bool success, bytes memory returnData) = p.target.call(p.callData);
            if (!success) {
                // Bubble up revert reason
                if (returnData.length > 0) {
                    assembly {
                        revert(add(32, returnData), mload(returnData))
                    }
                }
                revert("IdeaDAO: execution failed");
            }
        }

        emit Executed(proposalId);
    }

    /// @notice Cancel a proposal. Only the original proposer may cancel.
    function cancelProposal(uint256 proposalId) external {
        require(proposalId < proposalCount, "IdeaDAO: invalid proposalId");
        Proposal storage p = proposals[proposalId];
        require(msg.sender == p.proposer, "IdeaDAO: not proposer");
        require(!p.executed, "IdeaDAO: already executed");
        require(!p.cancelled, "IdeaDAO: already cancelled");

        p.cancelled = true;
        emit Cancelled(proposalId);
    }

    // -----------------------------------------------------------------------
    // Convenience execution functions (onlySelf — must go through executeProposal)
    // -----------------------------------------------------------------------

    /// @notice Lock the funding pool.
    function lockPool() external onlySelf {
        getIdeaAddresses();
        IFundingPool(fundingPool).lockPool();
    }

    /// @notice Select a builder by proposing and immediately accepting the builder agreement.
    function selectBuilder(
        address builder,
        uint256 musdPayout,
        uint256 tokenSharePct,
        bytes32 agreementHash,
        uint256 stakeBps
    ) external onlySelf {
        getIdeaAddresses();
        IBuilderAgreement(builderAgreement).propose(
            builder,
            musdPayout,
            tokenSharePct,
            agreementHash,
            stakeBps
        );
        IBuilderAgreement(builderAgreement).accept();
    }

    /// @notice Approve a milestone by milestone index.
    function approveMilestone(uint256 milestoneId) external onlySelf {
        getIdeaAddresses();
        IMilestone(milestone).approveMilestone(milestoneId);
    }

    /// @notice Nullify the idea — emergency refund backers and mark idea as cancelled.
    function nullifyIdea() external onlySelf {
        getIdeaAddresses();
        IFundingPool(fundingPool).emergencyRefund();
        IIdeaRegistry(registry).updateStatus(ideaId, STATUS_CANCELLED);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /// @notice Force a refresh of cached idea addresses (useful after late registration).
    function refreshAddresses() external {
        addressesCached = false;
        getIdeaAddresses();
    }
}
