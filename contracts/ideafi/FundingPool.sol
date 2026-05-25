// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IIdeaFi.sol";

// ---------------------------------------------------------------------------
// FundingPool
// ---------------------------------------------------------------------------
// Minimal SatoshiVentures hooks (collateral tracker + yield optimizer) are
// integrated below. Every hook is gated on a non-zero address, so behavior
// is identical to the pre-SatoshiVentures FundingPool when the DAO has not
// wired in the extensions. Existing test suites pass unchanged.
// ---------------------------------------------------------------------------

interface ICollateralTrackerWriter {
    function trackDeposit(address investor, uint256 amount) external;
    function trackWithdrawal(address investor, uint256 amount) external;
}

interface IYieldOptimizerHook {
    function autoDeposit() external;
    function withdrawForPayout(uint256 amount) external;
}

contract FundingPool is Initializable {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    uint256 public constant PROTOCOL_FEE_BPS = 200; // 2 %

    // -----------------------------------------------------------------------
    // Config
    // -----------------------------------------------------------------------

    uint256 public ideaId;
    IERC20  public musd;
    IIdeaToken public ideaToken;
    address public protocolTreasury;
    address public registry;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public fundingDeadline;
    uint256 public builderAllocationPct;

    // -----------------------------------------------------------------------
    // SatoshiVentures extensions (optional)
    // -----------------------------------------------------------------------

    /// @notice Off-by-default collateral tracker for per-user portfolio health.
    ///         Set via setSatoshiHooks() by the DAO. Address(0) ⇒ no tracking.
    address public collateralTracker;
    /// @notice Off-by-default yield optimizer that auto-deposits idle MUSD.
    ///         Address(0) ⇒ no yield routing.
    address public yieldOptimizer;

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    bool public isLocked;
    bool public refundMode;

    mapping(address => uint256) public deposits;
    uint256 public totalDeposited;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event Deposited(address indexed investor, uint256 gross, uint256 fee, uint256 net);
    event Withdrawn(address indexed investor, uint256 amount);
    event PoolLocked();
    event BuilderFundsReleased(address indexed builder, uint256 gross, uint256 fee, uint256 net);
    event EmergencyRefundEnabled();
    event RefundClaimed(address indexed investor, uint256 amount);
    event SatoshiHooksSet(address collateralTracker, address yieldOptimizer);
    event YieldPullForwarded(address indexed yieldOptimizer, uint256 amount);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyDAO() {
        require(msg.sender == IIdeaRegistry(registry).getIdeaDAO(ideaId), "FundingPool: caller is not the DAO");
        _;
    }

    modifier onlyDAOOrMilestone() {
        address dao = IIdeaRegistry(registry).getIdeaDAO(ideaId);
        address milestone = IIdeaRegistry(registry).getMilestone(ideaId);
        require(
            msg.sender == dao || msg.sender == milestone,
            "FundingPool: caller is not DAO or Milestone"
        );
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor (supports both direct deployment and proxy pattern)
    // -----------------------------------------------------------------------

    /**
     * @dev Flexible constructor for both direct deployment and proxy patterns.
     *      For direct deployment (tests): pass all initialization arguments
     *      For proxy pattern: pass zero address and use initialize() afterwards
     */
    constructor(
        uint256 _ideaId,
        address _musd,
        address _ideaToken,
        address _protocolTreasury,
        address _registry,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _fundingDeadline,
        uint256 _builderAllocationPct
    ) {
        // Check if this is direct deployment (non-zero musd address)
        if (_musd != address(0)) {
            _initialize(
                _ideaId, _musd, _ideaToken, _protocolTreasury, _registry,
                _softCap, _hardCap, _fundingDeadline, _builderAllocationPct
            );
        }
        // For proxy pattern, constructor does nothing - use initialize() instead
    }

    function _initialize(
        uint256 _ideaId,
        address _musd,
        address _ideaToken,
        address _protocolTreasury,
        address _registry,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _fundingDeadline,
        uint256 _builderAllocationPct
    ) internal {
        ideaId               = _ideaId;
        musd                 = IERC20(_musd);
        ideaToken            = IIdeaToken(_ideaToken);
        protocolTreasury     = _protocolTreasury;
        registry             = _registry;
        softCap              = _softCap;
        hardCap              = _hardCap;
        fundingDeadline      = _fundingDeadline;
        builderAllocationPct = _builderAllocationPct;
    }

    // -----------------------------------------------------------------------
    // Initializer (for proxy pattern)
    // -----------------------------------------------------------------------

    function initialize(
        uint256 _ideaId,
        address _musd,
        address _ideaToken,
        address _protocolTreasury,
        address _registry,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _fundingDeadline,
        uint256 _builderAllocationPct
    ) external initializer {
        require(_musd != address(0),              "FundingPool: zero musd");
        require(_ideaToken != address(0),         "FundingPool: zero ideaToken");
        require(_protocolTreasury != address(0),  "FundingPool: zero treasury");
        require(_registry != address(0),          "FundingPool: zero registry");
        require(_hardCap >= _softCap,             "FundingPool: hardCap < softCap");
        require(_fundingDeadline > block.timestamp, "FundingPool: deadline in past");

        _initialize(
            _ideaId, _musd, _ideaToken, _protocolTreasury, _registry,
            _softCap, _hardCap, _fundingDeadline, _builderAllocationPct
        );
    }

    // -----------------------------------------------------------------------
    // Investor actions
    // -----------------------------------------------------------------------

    /// @notice Deposit MUSD into the funding pool.
    function deposit(uint256 amount) external {
        require(!isLocked,                              "FundingPool: pool is locked");
        require(block.timestamp <= fundingDeadline,     "FundingPool: funding deadline passed");
        require(amount > 0,                             "FundingPool: zero amount");

        uint256 fee = (amount * PROTOCOL_FEE_BPS) / 10_000;
        uint256 net = amount - fee;

        require(totalDeposited + net <= hardCap, "FundingPool: hard cap exceeded");

        // Pull full gross amount from caller
        musd.safeTransferFrom(msg.sender, address(this), amount);

        // Forward fee to treasury
        musd.safeTransfer(protocolTreasury, fee);

        // Record net deposit
        deposits[msg.sender] += net;
        totalDeposited += net;

        // Mint IdeaTokens 1 : 1 against net deposit
        ideaToken.mint(msg.sender, net);

        emit Deposited(msg.sender, amount, fee, net);

        // ── SatoshiVentures hooks (no-op when unset) ────────────────────
        if (collateralTracker != address(0)) {
            ICollateralTrackerWriter(collateralTracker).trackDeposit(msg.sender, net);
        }
        if (yieldOptimizer != address(0) && !isLocked) {
            // Best-effort sweep. The optimizer is allowed to silently no-op
            // (e.g. below threshold) — we never let it block a deposit.
            try IYieldOptimizerHook(yieldOptimizer).autoDeposit() {} catch {}
        }
    }

    /// @notice Withdraw previously deposited MUSD (only while pool is unlocked).
    function withdraw(uint256 amount) external {
        require(!isLocked,                         "FundingPool: pool is locked");
        require(amount > 0,                        "FundingPool: zero amount");
        require(deposits[msg.sender] >= amount,    "FundingPool: insufficient balance");
        
        // Strictly check and burn IdeaTokens to prevent double-spending & arbitrage
        require(
            ideaToken.balanceOf(msg.sender) >= amount,
            "FundingPool: insufficient IdeaToken balance for withdrawal"
        );

        // Burn the tokens first
        ideaToken.burn(msg.sender, amount);

        // Update deposits and total
        deposits[msg.sender] -= amount;
        totalDeposited       -= amount;

        // SatoshiVentures: ensure we have enough liquid MUSD to pay the user.
        _ensureLiquidity(amount);

        // Refund investor
        musd.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);

        if (collateralTracker != address(0)) {
            ICollateralTrackerWriter(collateralTracker).trackWithdrawal(msg.sender, amount);
        }
    }

    // -----------------------------------------------------------------------
    // DAO actions
    // -----------------------------------------------------------------------

    /// @notice Lock the pool once the soft cap is met.
    function lockPool() external onlyDAO {
        require(totalDeposited >= softCap, "FundingPool: soft cap not met");
        isLocked = true;
        emit PoolLocked();
    }

    /// @notice Release funds to a builder.
    function releaseBuilderFunds(address builder, uint256 amount) external onlyDAOOrMilestone {
        require(isLocked,            "FundingPool: pool not locked");
        require(builder != address(0), "FundingPool: zero builder");
        require(amount > 0,          "FundingPool: zero amount");

        uint256 fee = (amount * PROTOCOL_FEE_BPS) / 10_000;
        uint256 net = amount - fee;

        // SatoshiVentures: pull funds back from the yield vault if needed.
        _ensureLiquidity(amount);

        musd.safeTransfer(protocolTreasury, fee);
        musd.safeTransfer(builder, net);

        emit BuilderFundsReleased(builder, amount, fee, net);
    }

    /// @notice Enable emergency refund mode.
    function emergencyRefund() external onlyDAO {
        require(isLocked, "FundingPool: pool not locked");
        refundMode = true;
        emit EmergencyRefundEnabled();
    }

    /// @notice Claim a refund when refund mode is active.
    function claimRefund() external {
        require(refundMode, "FundingPool: refund mode not active");

        uint256 amount = deposits[msg.sender];
        require(amount > 0, "FundingPool: nothing to refund");

        deposits[msg.sender] = 0;
        totalDeposited -= amount;

        // SatoshiVentures: drain the yield vault if needed for the refund.
        _ensureLiquidity(amount);

        musd.safeTransfer(msg.sender, amount);

        emit RefundClaimed(msg.sender, amount);
    }

    // -----------------------------------------------------------------------
    // SatoshiVentures hook wiring
    // -----------------------------------------------------------------------

    /// @notice Wire the SatoshiVentures collateral tracker / yield optimizer.
    ///         Either address may be zero to disable that hook. DAO-only.
    function setSatoshiHooks(address _collateralTracker, address _yieldOptimizer)
        external
        onlyDAO
    {
        collateralTracker = _collateralTracker;
        yieldOptimizer    = _yieldOptimizer;
        emit SatoshiHooksSet(_collateralTracker, _yieldOptimizer);
    }

    /// @notice Called by the wired yield optimizer to pull idle MUSD into the
    ///         underlying vault. Reverts if the optimizer is not set or the
    ///         pool is locked (so locked funds remain on-pool).
    function pullForYield(uint256 amount) external {
        require(msg.sender == yieldOptimizer, "FundingPool: not yield optimizer");
        require(!isLocked, "FundingPool: pool is locked");
        require(amount > 0, "FundingPool: zero amount");
        musd.safeTransfer(yieldOptimizer, amount);
        emit YieldPullForwarded(yieldOptimizer, amount);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// @dev Top-up the pool's liquid MUSD balance from the yield vault if
    ///      `needed` is more than what we hold. No-op if the optimizer is
    ///      unset or already covers the gap.
    function _ensureLiquidity(uint256 needed) internal {
        if (yieldOptimizer == address(0)) return;
        uint256 idle = musd.balanceOf(address(this));
        if (idle >= needed) return;
        uint256 shortfall = needed - idle;
        try IYieldOptimizerHook(yieldOptimizer).withdrawForPayout(shortfall) {} catch {
            // Optimizer may be locked / lack balance / be paused. We don't
            // block the user — the subsequent safeTransfer will revert with
            // ERC20InsufficientBalance if we truly cannot pay.
        }
    }
}
