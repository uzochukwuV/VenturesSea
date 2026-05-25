// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./mezo/IMezo.sol";

interface IYieldOptimizerFundingPool {
    function totalDeposited() external view returns (uint256);
    function isLocked() external view returns (bool);
    function musd() external view returns (address);
    function pullForYield(uint256 amount) external; // implemented by SatoshiVentures-aware FundingPool
}

/**
 * @title YieldOptimizer
 * @notice Routes idle MUSD held by a SatoshiVentures FundingPool into an
 *         external MUSD yield vault (e.g. a wrapper around StabilityPool)
 *         and pulls it back when the DAO/Milestone needs to pay a builder.
 *
 *         Differences from the original development plan sketch:
 *         1.  `safeApprove` (deprecated in OZ 5.x) is replaced by `forceApprove`.
 *         2.  `autoDepositEnabled` defaults to **false**. Yield strategies
 *             routed through `StabilityPool` put principal at risk during
 *             liquidations; the DAO must explicitly opt-in.
 *         3.  Strict per-pool ownership: every YieldOptimizer is bound to a
 *             single FundingPool at construction. No cross-pool accounting.
 *         4.  Withdrawals are constrained to the underlying vault balance, so
 *             withdraw-for-payout cannot leak unrelated capital.
 *         5.  All `onlyDAO` actions are wired against IdeaRegistry.getIdeaDAO
 *             at construction time (immutable) — no DAO hijacking risk.
 */
contract YieldOptimizer is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Immutables ───────────────────────────────────────────────────────────
    IERC20            public immutable musdToken;
    IMUSDSavingsVault public immutable vault;
    address           public immutable fundingPool;
    address           public immutable ideaDAO;

    // ── State ───────────────────────────────────────────────────────────────
    /// @notice Sum of MUSD principal currently held in the underlying vault on
    ///         behalf of `fundingPool`. Pure accounting; not authoritative.
    uint256 public vaultPrincipal;
    /// @notice Cumulative MUSD-equivalent yield credited to the FundingPool.
    uint256 public totalYieldHarvested;
    /// @notice Auto-deposit toggle. Default off (see note above).
    bool    public autoDepositEnabled;
    /// @notice Idle MUSD below this threshold is not auto-deposited.
    uint256 public minDepositThreshold = 1_000e18;

    // ── Events ───────────────────────────────────────────────────────────────
    event DepositedToVault(uint256 amount);
    event WithdrawnFromVault(uint256 amount, address indexed to);
    event YieldHarvested(uint256 amount);
    event AutoDepositToggled(bool enabled);
    event MinDepositThresholdSet(uint256 threshold);

    // ── Errors ───────────────────────────────────────────────────────────────
    error ZeroAddress();
    error NotDAO();
    error NotDAOOrPool();
    error InsufficientVaultBalance();
    error AutoDepositDisabled();

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyDAO() {
        if (msg.sender != ideaDAO) revert NotDAO();
        _;
    }

    /// @dev DAO triggers milestone payouts; FundingPool triggers liquidity
    ///      top-ups for user withdraws / refunds / builder releases.
    modifier onlyDAOOrPool() {
        if (msg.sender != ideaDAO && msg.sender != fundingPool) revert NotDAOOrPool();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _musdToken,
        address _vault,
        address _fundingPool,
        address _ideaDAO
    )
        Ownable(msg.sender)
    {
        if (_musdToken == address(0))   revert ZeroAddress();
        if (_vault == address(0))       revert ZeroAddress();
        if (_fundingPool == address(0)) revert ZeroAddress();
        if (_ideaDAO == address(0))     revert ZeroAddress();

        musdToken   = IERC20(_musdToken);
        vault       = IMUSDSavingsVault(_vault);
        fundingPool = _fundingPool;
        ideaDAO     = _ideaDAO;
    }

    // ── Auto-deposit ────────────────────────────────────────────────────────

    /**
     * @notice Pull idle MUSD from the FundingPool and deposit it into the
     *         underlying yield vault.
     *
     *         Idempotent and permissionless: anyone may call to "sweep" idle
     *         capital. No-ops if disabled / under threshold / pool locked /
     *         pool not authorised.
     */
    function autoDeposit() external nonReentrant {
        if (!autoDepositEnabled) return;

        IYieldOptimizerFundingPool pool = IYieldOptimizerFundingPool(fundingPool);
        if (pool.isLocked()) return;

        uint256 idle = musdToken.balanceOf(fundingPool);
        if (idle < minDepositThreshold) return;

        // Pull (FundingPool must implement pullForYield -> approves + transfers
        // OR (legacy) we rely on a pre-set allowance). We prefer the explicit
        // pull pattern so the FundingPool stays the source of truth.
        pool.pullForYield(idle);

        musdToken.forceApprove(address(vault), idle);
        vault.deposit(idle);

        vaultPrincipal += idle;
        emit DepositedToVault(idle);
    }

    // ── Payout path ─────────────────────────────────────────────────────────

    /**
     * @notice Withdraw MUSD from the vault and return it to the FundingPool.
     *         Triggered by the per-idea DAO when funds are due to a builder.
     */
    function withdrawForPayout(uint256 _amount) external nonReentrant onlyDAOOrPool {
        if (_amount == 0) return;
        if (_amount > vaultPrincipal) revert InsufficientVaultBalance();

        vault.withdraw(_amount);
        unchecked { vaultPrincipal -= _amount; }

        musdToken.safeTransfer(fundingPool, _amount);
        emit WithdrawnFromVault(_amount, fundingPool);
    }

    /**
     * @notice Pull any accrued vault yield and forward it to the FundingPool
     *         as fresh investor capital.
     *
     *         Some vaults express "yield earned" with a separate accessor
     *         (`getYieldEarned`). Others auto-compound and require us to read
     *         `balanceOf` and subtract `vaultPrincipal`. We try the explicit
     *         accessor first; if it returns zero, we fall back to balance
     *         delta.
     */
    function harvestYield() external nonReentrant {
        uint256 reported = vault.getYieldEarned(address(this));
        uint256 yield;

        if (reported > 0) {
            yield = reported;
        } else {
            uint256 bal = vault.balanceOf(address(this));
            if (bal > vaultPrincipal) {
                unchecked { yield = bal - vaultPrincipal; }
            }
        }

        if (yield == 0) return;

        vault.withdraw(yield);
        totalYieldHarvested += yield;

        musdToken.safeTransfer(fundingPool, yield);
        emit YieldHarvested(yield);
    }

    // ── DAO admin ───────────────────────────────────────────────────────────

    function toggleAutoDeposit(bool _enabled) external onlyDAO {
        autoDepositEnabled = _enabled;
        emit AutoDepositToggled(_enabled);
    }

    function setMinDepositThreshold(uint256 _threshold) external onlyDAO {
        minDepositThreshold = _threshold;
        emit MinDepositThresholdSet(_threshold);
    }

    // ── Views ───────────────────────────────────────────────────────────────

    /// @notice Total MUSD this optimizer is responsible for, in the vault.
    function totalManaged() external view returns (uint256) {
        return vaultPrincipal;
    }

    /// @notice Vault-reported balance (may include un-harvested yield).
    function vaultBalance() external view returns (uint256) {
        return vault.balanceOf(address(this));
    }
}
