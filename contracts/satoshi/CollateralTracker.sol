// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IMezoBorrowConnectorView.sol";

/**
 * @title CollateralTracker
 * @notice Maps SatoshiVentures investors to their per-FundingPool MUSD
 *         deposits and aggregates portfolio-wide health by reading the
 *         user's Mezo trove via {MezoBorrowConnector}.
 *
 *         Authorized callers (registered FundingPools) push deposit and
 *         withdrawal events here. Everyone can read.
 *
 *         The original plan's `isRegisteredPool` always returned true — that
 *         allowed anyone to inflate `totalDeployed`. This implementation
 *         keeps an owner-managed set of registered pools and gates writes on it.
 */
contract CollateralTracker is Ownable {
    // ── Immutables ───────────────────────────────────────────────────────────
    address public immutable mezoBorrowConnector;
    address public immutable musdToken;

    // ── Authorized writers ──────────────────────────────────────────────────
    /// @notice Pool addresses allowed to call `trackDeposit` / `trackWithdrawal`.
    mapping(address => bool) public isRegisteredPool;

    // ── Per-investor positions ──────────────────────────────────────────────
    /// @notice investor → pool → MUSD net deposited (after FundingPool fees).
    mapping(address => mapping(address => uint256)) public ventureDeposits;
    /// @notice investor → total MUSD currently deployed across all pools.
    mapping(address => uint256) public totalDeployed;
    /// @notice investor → ordered list of pools they've ever deposited into.
    mapping(address => address[]) private _investorPools;
    /// @notice investor → pool → 1-based index in `_investorPools[investor]`
    ///         (0 == not present).
    mapping(address => mapping(address => uint256)) private _investorPoolIndex;

    // ── Tuning ──────────────────────────────────────────────────────────────
    uint256 public warningThresholdBps   = 13_000; // 130% ICR → yellow alert
    uint256 public dangerThresholdBps    = 11_500; // 115% ICR → red alert
    uint256 public targetSafetyMarginBps = 15_000; // 150% ICR → recommended target

    // ── Events ───────────────────────────────────────────────────────────────
    event PoolRegistered(address indexed pool);
    event PoolUnregistered(address indexed pool);
    event ThresholdsUpdated(uint256 warningBps, uint256 dangerBps, uint256 targetBps);
    event PositionTracked(address indexed investor, address indexed pool, uint256 amount);
    event PositionWithdrawn(address indexed investor, address indexed pool, uint256 amount);
    event HealthAlert(
        address indexed investor,
        uint256 icrBps,
        uint256 liquidationPrice18,
        uint256 currentBtcPrice18,
        uint8   alertLevel // 0=safe, 1=warning, 2=danger
    );
    event CollateralTopUpRecommended(address indexed investor, uint256 shortfall);

    // ── Errors ───────────────────────────────────────────────────────────────
    error NotRegisteredPool();
    error InsufficientTracked();
    error ZeroAddress();
    error InvalidThresholds();

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyRegisteredPool() {
        if (!isRegisteredPool[msg.sender]) revert NotRegisteredPool();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address _mezoBorrowConnector, address _musdToken)
        Ownable(msg.sender)
    {
        if (_mezoBorrowConnector == address(0)) revert ZeroAddress();
        if (_musdToken == address(0))           revert ZeroAddress();
        mezoBorrowConnector = _mezoBorrowConnector;
        musdToken           = _musdToken;
    }

    // ── Pool registration (owner) ───────────────────────────────────────────

    function registerPool(address _pool) external onlyOwner {
        if (_pool == address(0)) revert ZeroAddress();
        if (!isRegisteredPool[_pool]) {
            isRegisteredPool[_pool] = true;
            emit PoolRegistered(_pool);
        }
    }

    function unregisterPool(address _pool) external onlyOwner {
        if (isRegisteredPool[_pool]) {
            isRegisteredPool[_pool] = false;
            emit PoolUnregistered(_pool);
        }
    }

    function setAlertThresholds(
        uint256 _warningBps,
        uint256 _dangerBps,
        uint256 _targetBps
    )
        external
        onlyOwner
    {
        if (_dangerBps <= 10_000)            revert InvalidThresholds(); // must be above 100% (illiquid)
        if (_warningBps <= _dangerBps)       revert InvalidThresholds();
        if (_targetBps <= _warningBps)       revert InvalidThresholds();
        warningThresholdBps   = _warningBps;
        dangerThresholdBps    = _dangerBps;
        targetSafetyMarginBps = _targetBps;
        emit ThresholdsUpdated(_warningBps, _dangerBps, _targetBps);
    }

    // ── Writer hooks (FundingPool) ──────────────────────────────────────────

    function trackDeposit(address _investor, uint256 _amount)
        external
        onlyRegisteredPool
    {
        if (_investor == address(0)) revert ZeroAddress();
        address pool = msg.sender;

        if (ventureDeposits[_investor][pool] == 0) {
            _investorPools[_investor].push(pool);
            _investorPoolIndex[_investor][pool] = _investorPools[_investor].length;
        }
        ventureDeposits[_investor][pool] += _amount;
        totalDeployed[_investor]         += _amount;

        emit PositionTracked(_investor, pool, _amount);
    }

    function trackWithdrawal(address _investor, uint256 _amount)
        external
        onlyRegisteredPool
    {
        if (_investor == address(0)) revert ZeroAddress();
        address pool = msg.sender;
        uint256 current = ventureDeposits[_investor][pool];
        if (current < _amount) revert InsufficientTracked();

        unchecked {
            ventureDeposits[_investor][pool] = current - _amount;
            totalDeployed[_investor] -= _amount;
        }

        if (ventureDeposits[_investor][pool] == 0) {
            _removeInvestorPool(_investor, pool);
        }

        emit PositionWithdrawn(_investor, pool, _amount);
    }

    /// @notice Permissionless health beacon. Anyone can ping this to emit
    ///         an alert event (useful for keepers / frontends).
    function pingHealth(address _investor) external {
        (
            ,
            ,
            uint256 icrBps,
            ,
            ,
            uint256 btcPrice,
            
        ) = IMezoBorrowConnectorView(mezoBorrowConnector).getTroveHealth(_investor);

        uint8 lvl = _alertLevel(icrBps);
        uint256 liq = IMezoBorrowConnectorView(mezoBorrowConnector).getLiquidationPrice(_investor);
        emit HealthAlert(_investor, icrBps, liq, btcPrice, lvl);

        if (lvl > 0) {
            (bool needsTopUp, uint256 shortfall, ) = _checkCollateralHealth(_investor, icrBps);
            if (needsTopUp) emit CollateralTopUpRecommended(_investor, shortfall);
        }
    }

    // ── Read API ────────────────────────────────────────────────────────────

    /**
     * @notice Full portfolio health snapshot for an investor.
     */
    function getPortfolioHealth(address _investor)
        external
        view
        returns (
            uint256 totalCollateral,    // BTC collateral (wei)
            uint256 totalDebt,          // MUSD debt
            uint256 icrBps,             // ICR (BPS, 0 if no trove)
            uint256 liquidationPrice18, // BTC price (1e18) where ICR == 110%
            uint256 currentBtcPrice18,  // current BTC/USD (1e18)
            uint256 deployedCapital,    // MUSD deployed across registered ventures
            uint256 availableMUSD,      // MUSD held in the investor's wallet
            uint8   alertLevel,         // 0=safe, 1=warning, 2=danger
            bool    isRecoveryMode
        )
    {
        IMezoBorrowConnectorView c = IMezoBorrowConnectorView(mezoBorrowConnector);
        (
            totalCollateral,
            totalDebt,
            icrBps,
            ,
            ,
            currentBtcPrice18,
            isRecoveryMode
        ) = c.getTroveHealth(_investor);

        liquidationPrice18 = c.getLiquidationPrice(_investor);
        deployedCapital    = totalDeployed[_investor];
        availableMUSD      = IERC20(musdToken).balanceOf(_investor);
        alertLevel         = _alertLevel(icrBps);
    }

    /**
     * @notice True if the investor's ICR is below `targetSafetyMarginBps`.
     * @return needsTopUp        Whether a top-up is recommended.
     * @return shortfallBtc      Additional BTC (wei) needed to reach target ICR.
     * @return targetCollateral  Total BTC (wei) at target ICR.
     */
    function checkCollateralHealth(address _investor)
        external
        view
        returns (bool needsTopUp, uint256 shortfallBtc, uint256 targetCollateral)
    {
        (, , uint256 icrBps, , , , ) = IMezoBorrowConnectorView(mezoBorrowConnector)
            .getTroveHealth(_investor);
        return _checkCollateralHealth(_investor, icrBps);
    }

    /// @notice All pools the investor has an active position in.
    function getInvestorPortfolio(address _investor)
        external
        view
        returns (address[] memory pools, uint256[] memory amounts)
    {
        pools = _investorPools[_investor];
        amounts = new uint256[](pools.length);
        for (uint256 i = 0; i < pools.length; i++) {
            amounts[i] = ventureDeposits[_investor][pools[i]];
        }
    }

    function getInvestorPoolCount(address _investor) external view returns (uint256) {
        return _investorPools[_investor].length;
    }

    // ── Internal ────────────────────────────────────────────────────────────

    function _alertLevel(uint256 _icrBps) internal view returns (uint8) {
        if (_icrBps == 0)                          return 0; // no trove → no alert
        if (_icrBps >= warningThresholdBps)        return 0;
        if (_icrBps >= dangerThresholdBps)         return 1;
        return 2;
    }

    function _checkCollateralHealth(address _investor, uint256 _icrBps)
        internal
        view
        returns (bool needsTopUp, uint256 shortfallBtc, uint256 targetCollateral)
    {
        IMezoBorrowConnectorView c = IMezoBorrowConnectorView(mezoBorrowConnector);
        (uint256 currentCollateral, uint256 debt, , , , uint256 btcPrice, ) = c.getTroveHealth(_investor);

        if (debt == 0 || _icrBps >= targetSafetyMarginBps || btcPrice == 0) {
            return (false, 0, 0);
        }

        targetCollateral = c.getRequiredCollateral(debt, targetSafetyMarginBps, btcPrice);
        if (targetCollateral > currentCollateral) {
            unchecked {
                shortfallBtc = targetCollateral - currentCollateral;
            }
            needsTopUp = true;
        }
    }

    /// @dev O(1) removal via swap-and-pop, maintaining `_investorPoolIndex`.
    function _removeInvestorPool(address _investor, address _pool) internal {
        uint256 oneBasedIdx = _investorPoolIndex[_investor][_pool];
        if (oneBasedIdx == 0) return;

        address[] storage arr = _investorPools[_investor];
        uint256 lastIdx = arr.length - 1;
        uint256 idx = oneBasedIdx - 1;

        if (idx != lastIdx) {
            address lastPool = arr[lastIdx];
            arr[idx] = lastPool;
            _investorPoolIndex[_investor][lastPool] = oneBasedIdx;
        }
        arr.pop();
        delete _investorPoolIndex[_investor][_pool];
    }
}
