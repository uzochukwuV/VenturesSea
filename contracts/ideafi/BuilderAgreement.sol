// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IIdeaFi.sol";

// ---------------------------------------------------------------------------
// BuilderAgreement
// ---------------------------------------------------------------------------

contract BuilderAgreement is Initializable {

    // -----------------------------------------------------------------------
    // Enums & Structs
    // -----------------------------------------------------------------------

    enum AgreementStatus { NONE, PROPOSED, ACCEPTED, ACTIVE, COMPLETED, SLASHED }

    struct Agreement {
        address  builder;
        uint256  musdPayout;
        uint256  tokenSharePct;
        bytes32  agreementHash;
        uint256  builderStakeBps;
        AgreementStatus status;
    }

    struct RevenueTerms {
        bytes32   agreementHash;
        address[] lpAddresses;
        uint256[] lpShareBps;
        uint256   builderShareBps;
        address[] acceptedTokens;
        uint256   reportingIntervalDays;
        bytes32   auditClauseHash;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    uint256 public ideaId;
    address public registry;
    address public fundingPool;
    address public protocolTreasury;
    address public musd;

    Agreement    public agreement;
    RevenueTerms public revenueTerms;

    /// @notice Builder stake held in escrow (MUSD)
    uint256 public builderStakeAmount;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event Proposed(
        address indexed builder,
        uint256 musdPayout,
        uint256 tokenSharePct,
        bytes32 agreementHash,
        uint256 builderStakeBps
    );
    event Accepted();
    event RevenueTermsSet(bytes32 indexed agreementHash);
    event Slashed(address indexed builder);
    event SlashDistributed(address indexed builder, uint256 builderStakeBps);
    event Completed(address indexed builder);

    // -----------------------------------------------------------------------
    // Modifier
    // -----------------------------------------------------------------------

    modifier onlyDAO() {
        require(msg.sender == IIdeaRegistry(registry).getIdeaDAO(ideaId), "BuilderAgreement: caller is not the DAO");
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
    constructor(
        uint256 _ideaId,
        address _registry,
        address _fundingPool,
        address _protocolTreasury
    ) {
        if (_registry != address(0)) {
            _initialize(_ideaId, _registry, _fundingPool, _protocolTreasury);
        }
        // For proxy pattern, constructor does nothing - use initialize() instead
    }

    function _initialize(
        uint256 _ideaId,
        address _registry,
        address _fundingPool,
        address _protocolTreasury
    ) internal {
        require(_registry         != address(0), "BuilderAgreement: zero registry");
        require(_fundingPool      != address(0), "BuilderAgreement: zero fundingPool");
        require(_protocolTreasury != address(0), "BuilderAgreement: zero treasury");

        ideaId            = _ideaId;
        registry          = _registry;
        fundingPool       = _fundingPool;
        protocolTreasury  = _protocolTreasury;

        agreement.status  = AgreementStatus.NONE;
    }

    // -----------------------------------------------------------------------
    // Initializer (for proxy pattern)
    // -----------------------------------------------------------------------

    function initialize(
        uint256 _ideaId,
        address _registry,
        address _fundingPool,
        address _protocolTreasury
    ) external initializer {
        _initialize(_ideaId, _registry, _fundingPool, _protocolTreasury);
    }

    // -----------------------------------------------------------------------
    // DAO actions
    // -----------------------------------------------------------------------

    /// @notice Propose a builder agreement.
    function propose(
        address  builder,
        uint256  musdPayout,
        uint256  tokenSharePct,
        bytes32  agreementHash,
        uint256  builderStakeBps
    ) external onlyDAO {
        require(builder != address(0),                    "BuilderAgreement: zero builder");
        require(agreement.status == AgreementStatus.NONE, "BuilderAgreement: already proposed");

        agreement = Agreement({
            builder:         builder,
            musdPayout:      musdPayout,
            tokenSharePct:   tokenSharePct,
            agreementHash:   agreementHash,
            builderStakeBps: builderStakeBps,
            status:          AgreementStatus.PROPOSED
        });

        emit Proposed(builder, musdPayout, tokenSharePct, agreementHash, builderStakeBps);
    }

    /// @notice Accept a proposed agreement and move it to ACTIVE status.
    function accept() external onlyDAO {
        require(
            agreement.status == AgreementStatus.PROPOSED ||
            agreement.status == AgreementStatus.ACCEPTED,
            "BuilderAgreement: not in PROPOSED/ACCEPTED state"
        );

        agreement.status = AgreementStatus.ACTIVE;
        emit Accepted();
    }

    /// @notice Store revenue-sharing terms for this agreement.
    function setRevenueTerms(RevenueTerms calldata terms) external onlyDAO {
        require(
            agreement.status == AgreementStatus.ACTIVE,
            "BuilderAgreement: agreement not ACTIVE"
        );
        require(
            terms.lpShareBps.length == terms.lpAddresses.length,
            "BuilderAgreement: lp arrays length mismatch"
        );

        // Copy dynamic arrays manually (calldata → storage)
        revenueTerms.agreementHash        = terms.agreementHash;
        revenueTerms.builderShareBps      = terms.builderShareBps;
        revenueTerms.reportingIntervalDays = terms.reportingIntervalDays;
        revenueTerms.auditClauseHash      = terms.auditClauseHash;

        delete revenueTerms.lpAddresses;
        for (uint256 i = 0; i < terms.lpAddresses.length; i++) {
            revenueTerms.lpAddresses.push(terms.lpAddresses[i]);
        }

        delete revenueTerms.lpShareBps;
        for (uint256 i = 0; i < terms.lpShareBps.length; i++) {
            revenueTerms.lpShareBps.push(terms.lpShareBps[i]);
        }

        delete revenueTerms.acceptedTokens;
        for (uint256 i = 0; i < terms.acceptedTokens.length; i++) {
            revenueTerms.acceptedTokens.push(terms.acceptedTokens[i]);
        }

        emit RevenueTermsSet(terms.agreementHash);
    }

    /// @notice Slash the builder.
    function slash() external onlyDAO {
        require(
            agreement.status == AgreementStatus.ACTIVE,
            "BuilderAgreement: agreement not ACTIVE"
        );

        address  builder         = agreement.builder;
        uint256  builderStakeBps = agreement.builderStakeBps;

        agreement.status = AgreementStatus.SLASHED;

        emit Slashed(builder);
        emit SlashDistributed(builder, builderStakeBps);
    }

    /// @notice Mark the agreement as successfully completed.
    function complete() external onlyDAO {
        require(
            agreement.status == AgreementStatus.ACTIVE,
            "BuilderAgreement: agreement not ACTIVE"
        );

        agreement.status = AgreementStatus.COMPLETED;
        emit Completed(agreement.builder);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    function getAgreementStatus() external view returns (AgreementStatus) {
        return agreement.status;
    }

    function getBuilder() external view returns (address) {
        return agreement.builder;
    }

    function getMusdPayout() external view returns (uint256) {
        return agreement.musdPayout;
    }
}
