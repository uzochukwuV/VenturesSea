// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IIdeaFi.sol";

// ---------------------------------------------------------------------------
// FundingPool
// ---------------------------------------------------------------------------

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

        // Refund investor
        musd.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
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

        musd.safeTransfer(msg.sender, amount);

        emit RefundClaimed(msg.sender, amount);
    }
}
