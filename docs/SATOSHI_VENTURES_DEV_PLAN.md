
# SATOSHIVENTURES — Development Plan
## Mezo Hackathon: Bank on Bitcoin Track
## Based on MUSD Integration Research & VenturesSea Codebase

---

## EXECUTIVE SUMMARY

**Project:** SatoshiVentures — A Bitcoin-native venture fund where BTC holders 
collateralize their Bitcoin to mint MUSD, invest in curated onchain ventures 
through DAO governance, and earn yield while never selling a single satoshi.

**Core Innovation:** The first investment protocol built natively on Mezo's 
MUSD borrow mechanics, combining CDP-based capital with milestone-governed 
venture funding.

**Hackathon Tracks:** Bank on Bitcoin (Primary) + Supernormal dApps (Secondary)

---

## 1. MUSD PROTOCOL INTEGRATION — RESEARCH FINDINGS

### 1.1 MUSD Architecture (from mezo-org/musd repo & docs)

MUSD is a **Threshold USD fork** (itself a Liquity fork) with these key mechanics:

| Component | Address (Testnet — matsnet) | Address (Mainnet) | Role |
|-----------|------------------------------|-------------------|------|
| **MUSD Token** | 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 | 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 | Stablecoin |
| **BorrowerOperations** | 0xCdF7028ceAB81fA0C6971208e83fa7872994beE5 | TBD | Open/close/adjust troves |
| **TroveManager** | 0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0 | TBD | Liquidations, redemptions, trove state |
| **SortedTroves** | 0x722E4D24FD6Ff8b0AC679450F3D91294607268fA | TBD | Ordered list of troves by ICR |
| **HintHelpers** | 0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6 | TBD | Gas-efficient insertion hints |
| **StabilityPool** | 0x1CCA7E410eE41739792eA0A24e00349Dd247680e | TBD | Liquidation backstop / yield venue |
| **PriceFeed** | 0x86bCF0841622a5dAC14A313a15f96A95421b9366 | TBD | BTC/USD oracle (Skip Connect) |
| **PCV** | 0x4dDD70f4C603b6089c07875Be02fEdFD626b80Af | TBD | Protocol Controlled Value |
| **InterestRateManager** | 0xD4D6c36A592A2c5e86035A6bca1d57747a567f37 | TBD | Per-trove interest rates |

> **Source:** `mezo-org/musd` git repo, `solidity/artifacts/deployments/matsnet/*.json` (`address` field of each JSON).

### 1.2 Key MUSD Mechanics

> ⚠️ **Interface Reality Check (verified against `mezo-org/musd@HEAD`):**
> The function signatures below in this section are *the simplified design-time
> sketches* used in the original plan. The **actual** on-chain signatures we
> implement against differ in a few important ways:
>
> 1. `BorrowerOperations.openTrove(uint256 _debtAmount, address _upperHint, address _lowerHint)` — **no** `_maxFeePercentage`, **no** explicit `_borrower` (the trove is owned by `msg.sender` of `BorrowerOperations`). Send BTC as `msg.value`.
> 2. `BorrowerOperations.adjustTrove(uint256 _collWithdrawal, uint256 _debtChange, bool _isDebtIncrease, address _upperHint, address _lowerHint)` — no max-fee arg.
> 3. `BorrowerOperations.withdrawMUSD` / `repayMUSD` / `addColl` / `closeTrove` are individual functions; no single "adjustTrove with all axes".
> 4. `TroveManager.getTroveStatus` returns an `enum Status { nonExistent, active, closedByOwner, closedByLiquidation, closedByRedemption }` — i.e. `uint8`, **not** `uint256`. We cast it.
> 5. `TroveManager.redeemCollateral` takes 6 args, not 7 (no `_maxFeePercentage`).
> 6. `PriceFeed.fetchPrice()` is `view returns (uint256)` — there is **no** `lastGoodPrice()` accessor in the public interface (price is fetched per-call).
> 7. `IMUSDSavingsRate.receiveProtocolYield(uint256)` is the only public method — there is **no** depositor-facing savings vault in the current MUSD release. `YieldOptimizer` targets a generic `IMUSDSavingsVault` interface and uses a thin adapter (`StabilityPoolAdapter`) to wire to `StabilityPool.provideToSP/withdrawFromSP` if we want yield, OR we leave it pluggable for a future native vault.
>
> **All sketches below are kept for narrative continuity. The canonical signatures
> are in `contracts/satoshi/mezo/IMezo.sol` and the live MUSD repo.**

**Trove (CDP) Operations:**
```solidity
// Open a trove — deposit BTC, borrow MUSD
BorrowerOperations.openTrove(
    _maxFeePercentage,    // Max borrowing fee (0.1%)
    _MUSDAmount,          // MUSD to borrow
    _upperHint,           // SortedTroves hint (gas optimization)
    _lowerHint,           // SortedTroves hint (gas optimization)
    _borrower             // Trove owner address
) { value: _collateral }  // BTC collateral (payable)

// Adjust trove — add/remove collateral, borrow/repay MUSD
BorrowerOperations.adjustTrove(
    _maxFeePercentage,
    _collWithdrawal,
    _debtChange,
    _isDebtIncrease,
    _upperHint,
    _lowerHint
) { value: _collChange }

// Close trove — repay all debt, withdraw collateral
BorrowerOperations.closeTrove()

// Withdraw collateral only
BorrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint)
```

**Trove State (TroveManager):**
```solidity
// Read trove data
TroveManager.getTroveColl(_borrower)      // BTC collateral amount
TroveManager.getTroveDebt(_borrower)      // Total debt (principal + fees + interest)
TroveManager.getTroveStatus(_borrower)    // 0=non-existent, 1=active, 2=closed, 3=liquidated
TroveManager.getCurrentICR(_borrower, _price)  // Individual Collateralization Ratio
TroveManager.getTCR(_price)               // Total Collateralization Ratio

// Liquidation
TroveManager.liquidate(_borrower)         // Single trove
TroveManager.batchLiquidateTroves(_troveArray)  // Batch

// Redemption (any MUSD holder)
TroveManager.redeemCollateral(
    _MUSDAmount,
    _firstRedemptionHint,
    _upperPartialRedemptionHint,
    _lowerPartialRedemptionHint,
    _partialRedemptionHintNICR,
    _maxIterations,
    _maxFeePercentage
)
```

**Fees:**
- Borrowing fee: 0.1% (governable) — added to debt, minted to governance
- Redemption fee: 0.75% (governable) — taken on redemption
- Fixed interest: Simple interest on principal (accrues over time)
- Gas compensation: 200 MUSD deducted on open, returned on close

**Collateral Requirements:**
- Minimum ICR: 110% (individual trove)
- Recovery Mode: Activated when TCR < 150%
  - New loans cannot open below 150% ICR
  - Refinancing blocked
  - Liquidation threshold remains 110%

**Price Feed:**
- Skip Connect oracle (integrated into validator consensus)
- Also supports Pyth, Stork, Supra as third-party oracles
- Price updated per block during consensus

### 1.3 MUSD Savings Vault (Yield)

- Deposit MUSD → receive sMUSD (receipt token)
- Earn share of protocol fees (borrowing interest, issuance fees, refinance fees)
- Governed by PCV (Protocol Controlled Value) contract
- sMUSD can be used in staking gauges for MEZO emissions

**Contract:** `MUSDSavings` (address TBD — need to find in deployments)

### 1.4 Mezo Testnet Configuration

| Parameter | Value |
|-----------|-------|
| Network Name | Mezo Testnet |
| RPC URL | https://rpc.test.mezo.org |
| Chain ID | 31611 |
| Currency Symbol | BTC |
| Block Explorer | explorer.test.mezo.org |
| Faucet | Discord (request testnet BTC) |

---

## 2. SATOSHIVENTURES CONTRACT ARCHITECTURE

### 2.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MEZO PROTOCOL LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  Borrower   │  │  Trove      │  │   MUSD      │  │ MUSD Savings   │  │
│  │ Operations  │  │  Manager    │  │   Token     │  │    Vault       │  │
│  │             │  │             │  │  (ERC20)    │  │   (sMUSD)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘  │
│         │                │                │                 │           │
│         └────────────────┴────────────────┘                 │           │
│                          │                                  │           │
└──────────────────────────┼──────────────────────────────────┼───────────┘
                           │                                  │
                           ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SATOSHIVENTURES CORE LAYER                              │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐   │
│  │  MezoBorrow     │    │  Collateral     │    │   YieldOptimizer    │   │
│  │  Connector      │◄──►│  Tracker        │◄──►│   (NEW)             │   │
│  │  (NEW)          │    │  (NEW)          │    │                     │   │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────────┘   │
│           │                      │                                        │
│           └──────────────────────┘                                        │
│                      │                                                  │
│           ┌──────────┴──────────┐                                      │
│           ▼                     ▼                                      │
│  ┌─────────────────┐    ┌─────────────────┐                            │
│  │  FundingPool    │    │  ProtocolMarket │                            │
│  │  (MODIFIED)     │    │  (MODIFIED)     │                            │
│  │  - Real MUSD    │    │  - Real MUSD    │                            │
│  │  - Yield hooks  │    │  - Real MUSD    │                            │
│  └────────┬────────┘    └─────────────────┘                            │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              VENTURE GOVERNANCE LAYER (REUSED)                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │IdeaToken│ │ IdeaDAO │ │Builder  │ │Milestone│ │Revenue  │  │   │
│  │  │         │ │         │ │Agreement│ │         │ │Report   │  │   │
│  │  │(REUSED) │ │(REUSED) │ │(REUSED) │ │(REUSED) │ │(REUSED) │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                          │   │
│  │  │IdeaReg. │ │IdeaFact.│ │Protocol │                          │   │
│  │  │(REUSED) │ │(REUSED) │ │Treasury │                          │   │
│  │  └─────────┘ └─────────┘ │(REUSED) │                          │   │
│  │                          └─────────┘                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Contract Inventory

| # | Contract | Status | Lines (est.) | Priority |
|---|----------|--------|--------------|----------|
| 1 | `MezoBorrowConnector.sol` | **NEW** | ~200 | P0 — Critical |
| 2 | `CollateralTracker.sol` | **NEW** | ~250 | P0 — Critical |
| 3 | `YieldOptimizer.sol` | **NEW** | ~180 | P1 — Important |
| 4 | `FundingPool.sol` | **MODIFY** | ~220 | P0 — Critical |
| 5 | `ProtocolMarket.sol` | **MODIFY** | ~180 | P1 — Important |
| 6 | `IdeaToken.sol` | REUSE | ~260 | P1 — Important |
| 7 | `IdeaDAO.sol` | REUSE | ~280 | P1 — Important |
| 8 | `IdeaRegistry.sol` | REUSE | ~120 | P2 — Standard |
| 9 | `IdeaFactory.sol` | REUSE | ~140 | P2 — Standard |
| 10 | `BuilderAgreement.sol` | REUSE | ~220 | P2 — Standard |
| 11 | `Milestone.sol` | REUSE | ~180 | P2 — Standard |
| 12 | `RevenueReport.sol` | REUSE | ~200 | P2 — Standard |
| 13 | `ProtocolTreasury.sol` | REUSE | ~140 | P2 — Standard |
| 14 | `IIdeaFi.sol` | REUSE | ~60 | P2 — Standard |

**Total New Code:** ~630 lines
**Total Modified Code:** ~400 lines
**Total Reused Code:** ~1,460 lines

---

## 3. NEW CONTRACT SPECIFICATIONS

### 3.1 MezoBorrowConnector.sol

**Purpose:** Interface between SatoshiVentures and Mezo Borrow contracts. 
Handles all trove operations, reads trove state, and provides clean abstractions 
for the rest of the system.

**Key Functions:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBorrowerOperations {
    function openTrove(
        uint256 _maxFeePercentage,
        uint256 _MUSDAmount,
        address _upperHint,
        address _lowerHint,
        address _borrower
    ) external payable;

    function adjustTrove(
        uint256 _maxFeePercentage,
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable;

    function closeTrove() external;
    function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external;
    function getBorrowingFee(uint256 _MUSDAmount) external view returns (uint256);
}

interface ITroveManager {
    function getTroveColl(address _borrower) external view returns (uint256);
    function getTroveDebt(address _borrower) external view returns (uint256);
    function getTroveStatus(address _borrower) external view returns (uint256);
    function getCurrentICR(address _borrower, uint256 _price) external view returns (uint256);
    function getTCR(uint256 _price) external view returns (uint256);
    function getNominalICR(address _borrower) external view returns (uint256);
    function liquidate(address _borrower) external;
    function redeemCollateral(
        uint256 _MUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) external;
}

interface IPriceFeed {
    function fetchPrice() external returns (uint256);
    function lastGoodPrice() external view returns (uint256);
}

interface ISortedTroves {
    function findInsertPosition(uint256 _NICR, address _prevId, address _nextId) 
        external view returns (address, address);
    function getSize() external view returns (uint256);
}

interface IHintHelpers {
    function getApproxHint(uint256 _CR, uint256 _numTrials, uint256 _inputRandomSeed)
        external view returns (address, uint256);
}

contract MezoBorrowConnector {

    // ── Immutables ─────────────────────────────────────────────────────
    address public immutable borrowerOperations;
    address public immutable troveManager;
    address public immutable priceFeed;
    address public immutable sortedTroves;
    address public immutable hintHelpers;
    address public immutable musdToken;

    uint256 public constant MIN_ICR = 11000; // 110% in BPS
    uint256 public constant RECOVERY_MODE_TCR = 15000; // 150% in BPS
    uint256 public constant BORROWING_FEE_BPS = 10; // 0.1%
    uint256 public constant GAS_COMPENSATION = 200e18; // 200 MUSD

    // ── Events ───────────────────────────────────────────────────────
    event TroveOpened(address indexed user, uint256 collateral, uint256 debt);
    event TroveAdjusted(address indexed user, uint256 collChange, uint256 debtChange);
    event TroveClosed(address indexed user);
    event CollateralAdded(address indexed user, uint256 amount);
    event CollateralWarning(address indexed user, uint256 currentICR, uint256 threshold);

    // ── Constructor ────────────────────────────────────────────────────
    constructor(
        address _borrowerOperations,
        address _troveManager,
        address _priceFeed,
        address _sortedTroves,
        address _hintHelpers,
        address _musdToken
    ) {
        require(_borrowerOperations != address(0), "Zero BorrowerOperations");
        require(_troveManager != address(0), "Zero TroveManager");
        require(_priceFeed != address(0), "Zero PriceFeed");
        require(_sortedTroves != address(0), "Zero SortedTroves");
        require(_hintHelpers != address(0), "Zero HintHelpers");
        require(_musdToken != address(0), "Zero MUSD");

        borrowerOperations = _borrowerOperations;
        troveManager = _troveManager;
        priceFeed = _priceFeed;
        sortedTroves = _sortedTroves;
        hintHelpers = _hintHelpers;
        musdToken = _musdToken;
    }

    // ── Core Trove Operations ────────────────────────────────────────

    /// @notice Open a trove with optimized hints for gas efficiency
    /// @param _collateralAmount BTC amount to deposit (in wei)
    /// @param _musdAmount MUSD to borrow
    /// @return troveOwner The address that owns the trove
    function openTroveOptimized(
        uint256 _collateralAmount,
        uint256 _musdAmount
    ) external payable returns (address troveOwner) {
        require(msg.value == _collateralAmount, "ETH mismatch");

        // Calculate expected debt for hint computation
        uint256 borrowingFee = (_musdAmount * BORROWING_FEE_BPS) / 10000;
        uint256 expectedDebt = _musdAmount + borrowingFee + GAS_COMPENSATION;

        // Compute NICR for hint helpers
        uint256 nicr = (_collateralAmount * 1e20) / expectedDebt;

        // Get approximate hint
        (address approxHint, ) = IHintHelpers(hintHelpers).getApproxHint(nicr, 15, 42);

        // Find exact insert position
        (address upperHint, address lowerHint) = ISortedTroves(sortedTroves)
            .findInsertPosition(nicr, approxHint, approxHint);

        // Open trove
        IBorrowerOperations(borrowerOperations).openTrove{value: _collateralAmount}(
            BORROWING_FEE_BPS * 100, // maxFeePercentage in 1e18 (0.1% = 1e15)
            _musdAmount,
            upperHint,
            lowerHint,
            msg.sender
        );

        troveOwner = msg.sender;
        emit TroveOpened(troveOwner, _collateralAmount, _musdAmount);

        return troveOwner;
    }

    /// @notice Add collateral to an existing trove
    function addCollateral(uint256 _amount) external payable {
        require(msg.value == _amount, "ETH mismatch");

        // Get current trove state for hints
        uint256 currentDebt = ITroveManager(troveManager).getTroveDebt(msg.sender);
        uint256 currentColl = ITroveManager(troveManager).getTroveColl(msg.sender);
        uint256 newColl = currentColl + _amount;
        uint256 nicr = (newColl * 1e20) / currentDebt;

        (address approxHint, ) = IHintHelpers(hintHelpers).getApproxHint(nicr, 15, 42);
        (address upperHint, address lowerHint) = ISortedTroves(sortedTroves)
            .findInsertPosition(nicr, approxHint, approxHint);

        // Adjust trove: add collateral, no debt change
        IBorrowerOperations(borrowerOperations).adjustTrove{value: _amount}(
            BORROWING_FEE_BPS * 100,
            0, // no collateral withdrawal
            0, // no debt change
            false, // not increasing debt
            upperHint,
            lowerHint
        );

        emit CollateralAdded(msg.sender, _amount);
    }

    /// @notice Close trove and withdraw all collateral
    function closeTrove() external {
        IBorrowerOperations(borrowerOperations).closeTrove();
        emit TroveClosed(msg.sender);
    }

    // ── Trove State Queries ──────────────────────────────────────────

    /// @notice Get complete trove health data
    function getTroveHealth(address _user) external view returns (
        uint256 collateral,
        uint256 debt,
        uint256 icr,           // Individual Collateralization Ratio (in BPS, 11000 = 110%)
        uint256 tcr,           // Total Collateralization Ratio
        uint256 status,        // 0=none, 1=active, 2=closed, 3=liquidated
        uint256 btcPrice,      // Current BTC price in USD (18 decimals)
        bool isRecoveryMode    // Is system in recovery mode?
    ) {
        collateral = ITroveManager(troveManager).getTroveColl(_user);
        debt = ITroveManager(troveManager).getTroveDebt(_user);
        status = ITroveManager(troveManager).getTroveStatus(_user);

        btcPrice = IPriceFeed(priceFeed).lastGoodPrice();

        if (debt > 0) {
            icr = ITroveManager(troveManager).getCurrentICR(_user, btcPrice);
        }

        tcr = ITroveManager(troveManager).getTCR(btcPrice);
        isRecoveryMode = tcr < RECOVERY_MODE_TCR;

        return (collateral, debt, icr, tcr, status, btcPrice, isRecoveryMode);
    }

    /// @notice Check if trove is at risk of liquidation
    function isLiquidationRisk(address _user) external view returns (bool) {
        uint256 status = ITroveManager(troveManager).getTroveStatus(_user);
        if (status != 1) return false; // Not active

        uint256 btcPrice = IPriceFeed(priceFeed).lastGoodPrice();
        uint256 icr = ITroveManager(troveManager).getCurrentICR(_user, btcPrice);

        return icr < MIN_ICR;
    }

    /// @notice Get liquidation price (BTC price where ICR = 110%)
    function getLiquidationPrice(address _user) external view returns (uint256) {
        uint256 debt = ITroveManager(troveManager).getTroveDebt(_user);
        uint256 collateral = ITroveManager(troveManager).getTroveColl(_user);

        if (collateral == 0) return 0;

        // liquidationPrice = debt * 110% / collateral
        return (debt * MIN_ICR) / collateral;
    }

    /// @notice Calculate required collateral to maintain safe ICR
    function getRequiredCollateral(uint256 _debt, uint256 _targetICR) 
        external pure returns (uint256) {
        // collateral = debt * targetICR / 10000
        return (_debt * _targetICR) / 10000;
    }

    // ── Liquidation Helpers ──────────────────────────────────────────

    /// @notice Liquidate a trove (can be called by anyone for gas compensation)
    function liquidateTrove(address _borrower) external {
        ITroveManager(troveManager).liquidate(_borrower);
    }

    /// @notice Batch liquidate multiple troves
    function batchLiquidate(address[] calldata _borrowers) external {
        ITroveManager(troveManager).batchLiquidateTroves(_borrowers);
    }
}
```

### 3.2 CollateralTracker.sol

**Purpose:** Maps investor CDPs to their venture investments, calculates portfolio-wide 
health, and emits alerts for undercollateralized positions.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMezoBorrowConnector {
    function getTroveHealth(address _user) external view returns (
        uint256 collateral, uint256 debt, uint256 icr, uint256 tcr,
        uint256 status, uint256 btcPrice, bool isRecoveryMode
    );
    function isLiquidationRisk(address _user) external view returns (bool);
    function getLiquidationPrice(address _user) external view returns (uint256);
}

interface IFundingPool {
    function deposits(address _investor) external view returns (uint256);
    function totalDeposited() external view returns (uint256);
    function musd() external view returns (address);
}

contract CollateralTracker {

    // ── Immutables ─────────────────────────────────────────────────────
    address public immutable mezoBorrowConnector;
    address public immutable musdToken;

    // ── State ──────────────────────────────────────────────────────────
    // investor => fundingPool => amount deposited
    mapping(address => mapping(address => uint256)) public ventureDeposits;
    // investor => total MUSD deployed across all ventures
    mapping(address => uint256) public totalDeployed;
    // investor => array of pools they've invested in
    mapping(address => address[]) public investorPools;

    // ── Config ─────────────────────────────────────────────────────────
    uint256 public warningThreshold = 13000; // 130% ICR — yellow alert
    uint256 public dangerThreshold = 11500;  // 115% ICR — red alert
    uint256 public targetSafetyMargin = 15000; // 150% ICR — green/safe

    // ── Events ───────────────────────────────────────────────────────
    event PositionTracked(address indexed investor, address indexed pool, uint256 amount);
    event PositionUpdated(address indexed investor, address indexed pool, uint256 newAmount);
    event HealthAlert(
        address indexed investor,
        uint256 icr,
        uint256 liquidationPrice,
        uint256 currentBtcPrice,
        uint8 alertLevel // 0=safe, 1=warning, 2=danger
    );
    event CollateralTopUpRecommended(address indexed investor, uint256 shortfall);

    // ── Constructor ────────────────────────────────────────────────────
    constructor(address _mezoBorrowConnector, address _musdToken) {
        mezoBorrowConnector = _mezoBorrowConnector;
        musdToken = _musdToken;
    }

    // ── Position Tracking ────────────────────────────────────────────

    /// @notice Called by FundingPool when investor deposits MUSD
    function trackDeposit(
        address _investor,
        address _pool,
        uint256 _amount
    ) external {
        // Only registered funding pools can call
        require(isRegisteredPool(_pool), "Unauthorized pool");

        if (ventureDeposits[_investor][_pool] == 0) {
            investorPools[_investor].push(_pool);
        }

        ventureDeposits[_investor][_pool] += _amount;
        totalDeployed[_investor] += _amount;

        emit PositionTracked(_investor, _pool, _amount);
    }

    /// @notice Called by FundingPool when investor withdraws MUSD
    function trackWithdrawal(
        address _investor,
        address _pool,
        uint256 _amount
    ) external {
        require(isRegisteredPool(_pool), "Unauthorized pool");
        require(ventureDeposits[_investor][_pool] >= _amount, "Insufficient tracked deposit");

        ventureDeposits[_investor][_pool] -= _amount;
        totalDeployed[_investor] -= _amount;

        emit PositionUpdated(_investor, _pool, ventureDeposits[_investor][_pool]);
    }

    // ── Health Monitoring ────────────────────────────────────────────

    /// @notice Get complete portfolio health for an investor
    function getPortfolioHealth(address _investor) external view returns (
        uint256 totalCollateral,      // BTC collateral (wei)
        uint256 totalDebt,              // MUSD debt
        uint256 currentICR,             // Current ICR (BPS)
        uint256 liquidationPrice,       // BTC price for liquidation
        uint256 currentBtcPrice,        // Current BTC/USD price
        uint256 deployedCapital,        // Total MUSD in ventures
        uint256 availableMUSD,          // MUSD balance not deployed
        uint8 alertLevel,               // 0=safe, 1=warning, 2=danger
        bool isRecoveryMode             // System-wide recovery mode
    ) {
        (totalCollateral, totalDebt, currentICR,,, currentBtcPrice, isRecoveryMode) = 
            IMezoBorrowConnector(mezoBorrowConnector).getTroveHealth(_investor);

        liquidationPrice = IMezoBorrowConnector(mezoBorrowConnector)
            .getLiquidationPrice(_investor);

        deployedCapital = totalDeployed[_investor];
        availableMUSD = IERC20(musdToken).balanceOf(_investor);

        alertLevel = _calculateAlertLevel(currentICR);

        return (
            totalCollateral, totalDebt, currentICR, liquidationPrice,
            currentBtcPrice, deployedCapital, availableMUSD, alertLevel, isRecoveryMode
        );
    }

    /// @notice Check if investor needs to top up collateral
    function checkCollateralHealth(address _investor) external view returns (
        bool needsTopUp,
        uint256 shortfall,      // How much additional BTC needed (wei)
        uint256 targetCollateral // Target collateral at 150% ICR
    ) {
        (, uint256 debt, uint256 icr,,,,) = 
            IMezoBorrowConnector(mezoBorrowConnector).getTroveHealth(_investor);

        if (debt == 0 || icr >= targetSafetyMargin) {
            return (false, 0, 0);
        }

        targetCollateral = (debt * targetSafetyMargin) / 10000;
        uint256 currentCollateral = (debt * icr) / 10000;

        if (targetCollateral > currentCollateral) {
            shortfall = targetCollateral - currentCollateral;
            needsTopUp = true;
        }

        return (needsTopUp, shortfall, targetCollateral);
    }

    /// @notice Get all venture investments for an investor
    function getInvestorPortfolio(address _investor) 
        external view returns (address[] memory pools, uint256[] memory amounts) {
        pools = investorPools[_investor];
        amounts = new uint256[](pools.length);

        for (uint256 i = 0; i < pools.length; i++) {
            amounts[i] = ventureDeposits[_investor][pools[i]];
        }

        return (pools, amounts);
    }

    // ── Internal ─────────────────────────────────────────────────────

    function _calculateAlertLevel(uint256 _icr) internal view returns (uint8) {
        if (_icr >= warningThreshold) return 0; // Safe (green)
        if (_icr >= dangerThreshold) return 1;  // Warning (yellow)
        return 2; // Danger (red)
    }

    function isRegisteredPool(address _pool) internal view returns (bool) {
        // Implementation: check against IdeaRegistry or maintain a set
        // For now, simplified — would need registry integration
        return _pool != address(0);
    }
}
```

### 3.3 YieldOptimizer.sol

**Purpose:** Automatically deposits idle MUSD from FundingPool into MUSD Savings Vault 
to earn yield, and withdraws when funds are needed for milestone payouts.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMUSDSavings {
    function deposit(uint256 _amount) external;
    function withdraw(uint256 _amount) external;
    function balanceOf(address _account) external view returns (uint256);
    function getYieldEarned(address _account) external view returns (uint256);
}

interface IFundingPool {
    function totalDeposited() external view returns (uint256);
    function isLocked() external view returns (bool);
    function musd() external view returns (address);
}

contract YieldOptimizer {
    using SafeERC20 for IERC20;

    // ── Immutables ─────────────────────────────────────────────────────
    address public immutable musdToken;
    address public immutable musdSavingsVault;
    address public immutable fundingPool;
    address public immutable ideaDAO; // Authorized to trigger withdrawals

    // ── State ──────────────────────────────────────────────────────────
    uint256 public vaultBalance;      // MUSD currently in savings vault
    uint256 public totalYieldEarned;  // Cumulative yield
    bool public autoDepositEnabled = true;
    uint256 public minDepositThreshold = 1000e18; // Min 1000 MUSD to deposit

    // ── Events ───────────────────────────────────────────────────────
    event DepositedToVault(uint256 amount);
    event WithdrawnFromVault(uint256 amount);
    event YieldHarvested(uint256 amount);
    event AutoDepositToggled(bool enabled);

    // ── Modifiers ────────────────────────────────────────────────────
    modifier onlyDAO() {
        require(msg.sender == ideaDAO, "Only DAO");
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────
    constructor(
        address _musdToken,
        address _musdSavingsVault,
        address _fundingPool,
        address _ideaDAO
    ) {
        musdToken = _musdToken;
        musdSavingsVault = _musdSavingsVault;
        fundingPool = _fundingPool;
        ideaDAO = _ideaDAO;
    }

    // ── Auto-Deposit ───────────────────────────────────────────────────

    /// @notice Deposit idle MUSD from FundingPool to savings vault
    function autoDeposit() external {
        require(autoDepositEnabled, "Auto-deposit disabled");

        uint256 idleBalance = IERC20(musdToken).balanceOf(fundingPool);
        if (idleBalance < minDepositThreshold) return;

        // Transfer from FundingPool (requires approval)
        IERC20(musdToken).safeTransferFrom(fundingPool, address(this), idleBalance);

        // Approve and deposit to savings vault
        IERC20(musdToken).safeApprove(musdSavingsVault, idleBalance);
        IMUSDSavings(musdSavingsVault).deposit(idleBalance);

        vaultBalance += idleBalance;

        emit DepositedToVault(idleBalance);
    }

    // ── Withdrawal ────────────────────────────────────────────────────

    /// @notice Withdraw from vault for milestone payout (DAO only)
    function withdrawForPayout(uint256 _amount) external onlyDAO {
        require(vaultBalance >= _amount, "Insufficient vault balance");

        IMUSDSavings(musdSavingsVault).withdraw(_amount);
        vaultBalance -= _amount;

        // Transfer back to FundingPool
        IERC20(musdToken).safeTransfer(fundingPool, _amount);

        emit WithdrawnFromVault(_amount);
    }

    /// @notice Harvest accumulated yield
    function harvestYield() external {
        uint256 yield = IMUSDSavings(musdSavingsVault).getYieldEarned(address(this));
        if (yield == 0) return;

        // Withdraw yield portion
        IMUSDSavings(musdSavingsVault).withdraw(yield);
        totalYieldEarned += yield;

        // Send to FundingPool as additional capital
        IERC20(musdToken).safeTransfer(fundingPool, yield);

        emit YieldHarvested(yield);
    }

    // ── View Functions ────────────────────────────────────────────────

    function getVaultAPY() external view returns (uint256) {
        // Would integrate with actual vault APY calculation
        // Placeholder: returns basis points (e.g., 500 = 5%)
        return 500; // 5% APY placeholder
    }

    function getNetBorrowCost(uint256 _ventureYieldBps) external pure returns (int256) {
        // MUSD borrow cost: 1% fixed APR (100 bps)
        // Vault yield: e.g., 5% APY (500 bps)
        // Net: venture yield + vault yield - borrow cost
        uint256 vaultYield = 500; // From getVaultAPY
        int256 net = int256(_ventureYieldBps) + int256(vaultYield) - int256(100);
        return net;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function toggleAutoDeposit(bool _enabled) external onlyDAO {
        autoDepositEnabled = _enabled;
        emit AutoDepositToggled(_enabled);
    }

    function setMinDepositThreshold(uint256 _threshold) external onlyDAO {
        minDepositThreshold = _threshold;
    }
}
```

---

## 4. MODIFIED CONTRACTS

### 4.1 FundingPool.sol — Modifications

**Changes Required:**
1. Replace MockMUSD with real MUSD token address
2. Add CollateralTracker integration
3. Add YieldOptimizer hooks
4. Add MUSD Savings Vault integration for idle funds

```solidity
// In FundingPool.sol, modify:

// ── NEW: External integrations ─────────────────────────────────────
address public collateralTracker;
address public yieldOptimizer;

// ── MODIFIED: Constructor/Initializer ──────────────────────────────
// Add parameters:
// address _collateralTracker,
// address _yieldOptimizer

// ── MODIFIED: deposit() ────────────────────────────────────────────
function deposit(uint256 amount) external {
    // ... existing logic ...

    // NEW: Track position in CollateralTracker
    if (collateralTracker != address(0)) {
        ICollateralTracker(collateralTracker).trackDeposit(msg.sender, address(this), net);
    }

    // NEW: Trigger auto-deposit to yield vault if idle
    if (yieldOptimizer != address(0) && !isLocked) {
        IYieldOptimizer(yieldOptimizer).autoDeposit();
    }

    emit Deposited(msg.sender, amount, fee, net);
}

// ── MODIFIED: withdraw() ─────────────────────────────────────────
function withdraw(uint256 amount) external {
    // ... existing logic ...

    // NEW: Update tracking
    if (collateralTracker != address(0)) {
        ICollateralTracker(collateralTracker).trackWithdrawal(msg.sender, address(this), amount);
    }

    emit Withdrawn(msg.sender, amount);
}

// ── MODIFIED: releaseBuilderFunds() ──────────────────────────────
function releaseBuilderFunds(address builder, uint256 amount) external onlyDAOOrMilestone {
    // ... existing logic ...

    // NEW: Withdraw from yield vault if needed
    if (yieldOptimizer != address(0)) {
        uint256 idleBalance = musd.balanceOf(address(this));
        if (idleBalance < amount) {
            uint256 needed = amount - idleBalance;
            IYieldOptimizer(yieldOptimizer).withdrawForPayout(needed);
        }
    }

    // ... rest of existing logic ...
}
```

### 4.2 ProtocolMarket.sol — Modifications

**Changes Required:**
1. Replace MockMUSD with real MUSD token address
2. Ensure MUSD token approval works with actual MUSD contract

Minimal changes — mostly address updates.

---

## 5. FRONTEND DEVELOPMENT PLAN

### 5.1 Key Screens

| Screen | Purpose | Priority |
|--------|---------|----------|
| **Dashboard** | Portfolio overview: BTC collateral, MUSD debt, venture investments, health score | P0 |
| **Borrow & Invest** | One-click flow: Open CDP → Mint MUSD → Deposit to Venture | P0 |
| **Collateral Health** | Real-time ICR, liquidation price, alerts, top-up button | P0 |
| **Venture Explorer** | Browse ideas, view funding pools, invest with MUSD | P1 |
| **DAO Governance** | Proposals, voting, milestone approvals | P1 |
| **Yield Optimizer** | Vault deposits, APY, auto-deposit settings | P2 |
| **Transparent Backing** | Protocol-wide BTC collateral backing all MUSD investments | P2 |

### 5.2 Key Components

```typescript
// Dashboard.tsx — Main investor dashboard
interface PortfolioData {
  btcCollateral: bigint;        // Wei
  musdDebt: bigint;             // 18 decimals
  icr: number;                  // BPS (11000 = 110%)
  liquidationPrice: number;     // USD
  currentBtcPrice: number;      // USD
  deployedCapital: bigint;      // MUSD in ventures
  availableMUSD: bigint;        // MUSD in wallet
  alertLevel: 0 | 1 | 2;       // Safe | Warning | Danger
  ventures: VenturePosition[];
}

// BorrowInvestFlow.tsx — One-click CDP + invest
async function borrowAndInvest(
  collateralAmount: bigint,    // BTC to deposit
  musdToBorrow: bigint,        // MUSD to mint
  venturePool: Address          // FundingPool to deposit into
) {
  // 1. Open trove via MezoBorrowConnector
  await mezoBorrowConnector.openTroveOptimized(collateralAmount, musdToBorrow);

  // 2. Approve MUSD to FundingPool
  await musdToken.approve(venturePool, musdToBorrow);

  // 3. Deposit to venture
  await fundingPool.deposit(musdToBorrow);
}

// CollateralHealth.tsx — Health monitoring
function CollateralHealth({ portfolio }: { portfolio: PortfolioData }) {
  const alertColor = portfolio.alertLevel === 0 ? 'green' 
    : portfolio.alertLevel === 1 ? 'yellow' : 'red';

  return (
    <Card>
      <HealthGauge icr={portfolio.icr} threshold={110} />
      <LiquidationPrice 
        price={portfolio.liquidationPrice} 
        current={portfolio.currentBtcPrice} 
      />
      {portfolio.alertLevel > 0 && (
        <TopUpButton shortfall={calculateShortfall(portfolio)} />
      )}
    </Card>
  );
}

// TransparentBacking.tsx — Protocol-wide transparency
function TransparentBacking() {
  const { totalMUSDDeployed, totalBTCCollateral, systemICR } = useProtocolData();

  return (
    <Card>
      <Stat label="Total MUSD in Ventures" value={totalMUSDDeployed} />
      <Stat label="BTC Collateral Backing" value={totalBTCCollateral} />
      <Stat label="System Collateral Ratio" value={`${systemICR / 100}%`} />
      <BackingVisualization 
        musd={totalMUSDDeployed} 
        btc={totalBTCCollateral} 
      />
    </Card>
  );
}
```

---

## 6. DEPLOYMENT PLAN

### 6.1 Testnet Deployment (Mezo Testnet — Chain ID 31611)

| Step | Contract | Address Source | Notes |
|------|----------|---------------|-------|
| 1 | MUSD Token | 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 | Official testnet address |
| 2 | BorrowerOperations | TBD | Need to find in MUSD repo deployments |
| 3 | TroveManager | TBD | Need to find in MUSD repo deployments |
| 4 | PriceFeed | TBD | Need to find in MUSD repo deployments |
| 5 | SortedTroves | TBD | Need to find in MUSD repo deployments |
| 6 | HintHelpers | TBD | Need to find in MUSD repo deployments |
| 7 | MUSD Savings Vault | TBD | Need to find in MUSD repo deployments |
| 8 | MezoBorrowConnector | Deploy | New contract |
| 9 | CollateralTracker | Deploy | New contract |
| 10 | YieldOptimizer | Deploy | New contract |
| 11 | IdeaRegistry | Deploy | Reused from VenturesSea |
| 12 | IdeaFactory | Deploy | Reused from VenturesSea |
| 13 | FundingPool (impl) | Deploy | Modified |
| 14 | IdeaToken (impl) | Deploy | Reused |
| 15 | IdeaDAO (impl) | Deploy | Reused |
| 16 | BuilderAgreement (impl) | Deploy | Reused |
| 17 | Milestone (impl) | Deploy | Reused |
| 18 | RevenueReport (impl) | Deploy | Reused |
| 19 | ProtocolMarket | Deploy | Modified |
| 20 | ProtocolTreasury | Deploy | Reused |

### 6.2 Finding MUSD Contract Addresses

**Method 1:** Check MUSD repo deployments directory
```bash
git clone https://github.com/mezo-org/musd.git
cd musd/solidity/deployments/matsnet/
ls -la
# Look for deployment JSON files with addresses
```

**Method 2:** Query from Mezo testnet explorer
- Explorer: https://explorer.test.mezo.org
- Search for known MUSD token: 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
- Check token holders/transactions to find related contracts

**Method 3:** Ask in Mezo Discord developer channels
- Discord: Available via hackathon portal
- Ask for testnet contract addresses for BorrowerOperations, TroveManager, etc.

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests (Hardhat/Foundry)

| Test Suite | Coverage | Priority |
|-----------|----------|----------|
| MezoBorrowConnector | Trove open, adjust, close, health queries, liquidation | P0 |
| CollateralTracker | Deposit tracking, health alerts, portfolio queries | P0 |
| YieldOptimizer | Auto-deposit, withdrawal, yield harvest | P1 |
| FundingPool (modified) | Deposit with tracking, withdrawal with tracking, yield hooks | P0 |
| Integration: Full Flow | Open CDP → Mint MUSD → Deposit → Governance → Payout | P0 |

### 7.2 Testnet Testing

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Open Trove + Invest | Deposit 0.1 tBTC, borrow 1000 MUSD, deposit to venture | Trove active, IdeaTokens minted |
| Health Monitoring | Drop BTC price (mock), check alerts | Alert emitted at 130% ICR |
| Liquidation Protection | ICR drops to 115%, top up collateral | Trove saved from liquidation |
| Yield Optimization | Idle MUSD auto-deposited to vault | sMUSD received, yield accrues |
| Milestone Payout | DAO approves milestone, funds released | Builder receives MUSD, vault withdraws |
| Emergency Refund | DAO nullifies idea, investors claim refund | MUSD returned, trove can be closed |

---

## 8. RISK ANALYSIS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Liquidation** | Medium | High | Health alerts, auto top-up from yield, conservative ICR targets (150%+) |
| **Smart Contract Bug** | Low | High | Reuse audited VenturesSea code, minimal new code, test thoroughly |
| **MUSD Depeg** | Low | Medium | MUSD has strong peg mechanisms (redemptions, arbitrage) |
| **Builder Failure** | Medium | Medium | Milestone-based releases, builder staking, emergency refund |
| **Gas Costs** | Medium | Low | Hint optimization, batch operations, test on Mezo |
| **Oracle Failure** | Low | High | Skip Connect is robust, multiple oracle providers |

---

## 9. HACKATHON SUBMISSION CHECKLIST

### Checkpoint 1 (Mid-Hackathon)
- [ ] Repo with all contracts (new + modified + reused)
- [ ] README with architecture diagram
- [ ] MezoBorrowConnector deployed on testnet
- [ ] CollateralTracker deployed on testnet
- [ ] Basic frontend showing trove health

### Final Submission
- [ ] All contracts deployed on Mezo testnet
- [ ] Working frontend with:
  - Borrow & Invest flow
  - Collateral health dashboard
  - Venture explorer
  - DAO governance interface
- [ ] Demo video (3-5 minutes) showing:
  - Opening CDP with BTC
  - Minting MUSD
  - Investing in venture
  - Monitoring collateral health
  - Approving milestone via DAO
- [ ] Documentation:
  - How it uses Mezo Borrow
  - How BTC collateral is transparent
  - How yield optimizes borrow cost
  - Architecture decisions

---

## 10. DEVELOPMENT TIMELINE (7-10 Days)

| Day | Focus | Deliverables |
|-----|-------|-------------|
| **Day 1** | Research & Setup | Find all MUSD contract addresses, set up testnet environment, get test BTC |
| **Day 2** | Core Integration | Build MezoBorrowConnector, test trove operations on testnet |
| **Day 3** | Tracking & Health | Build CollateralTracker, integrate with FundingPool, test health alerts |
| **Day 4** | Yield Layer | Build YieldOptimizer, integrate MUSD Savings Vault, test auto-deposit |
| **Day 5** | Frontend Core | Dashboard, Borrow & Invest flow, Collateral Health UI |
| **Day 6** | Frontend Governance | Venture explorer, DAO voting, milestone interface |
| **Day 7** | Integration Testing | End-to-end test: CDP → Invest → Govern → Payout |
| **Day 8** | Polish & Bugfix | UI polish, edge cases, gas optimization |
| **Day 9** | Demo & Docs | Record demo video, write documentation |
| **Day 10** | Submission | Deploy final contracts, submit to hackathon portal |

---

## 11. CRITICAL NEXT STEPS (DO TODAY)

1. **Clone MUSD repo and find testnet contract addresses**
   ```bash
   git clone https://github.com/mezo-org/musd.git
   cd musd/solidity/deployments/
   # Look for matsnet or testnet deployment files
   ```

2. **Join Mezo Discord and ask for:**
   - Testnet BorrowerOperations address
   - Testnet TroveManager address
   - Testnet MUSD Savings Vault address
   - Testnet faucet for BTC

3. **Set up testnet environment:**
   - Add Mezo Testnet to MetaMask (Chain ID: 31611)
   - Get testnet BTC from faucet
   - Verify MUSD token at 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503

4. **Start building MezoBorrowConnector.sol**
   - Use the interface definitions above
   - Test with real MUSD contracts on testnet

---

## APPENDIX: MUSD Contract Interfaces (Complete)

### BorrowerOperations
```solidity
function openTrove(
    uint256 _maxFeePercentage,
    uint256 _MUSDAmount,
    address _upperHint,
    address _lowerHint,
    address _borrower
) external payable;

function adjustTrove(
    uint256 _maxFeePercentage,
    uint256 _collWithdrawal,
    uint256 _debtChange,
    bool _isDebtIncrease,
    address _upperHint,
    address _lowerHint
) external payable;

function closeTrove() external;
function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external;
function getBorrowingFee(uint256 _MUSDAmount) external view returns (uint256);
```

### TroveManager
```solidity
function getTroveColl(address _borrower) external view returns (uint256);
function getTroveDebt(address _borrower) external view returns (uint256);
function getTroveStatus(address _borrower) external view returns (uint256);
function getCurrentICR(address _borrower, uint256 _price) external view returns (uint256);
function getTCR(uint256 _price) external view returns (uint256);
function getNominalICR(address _borrower) external view returns (uint256);
function liquidate(address _borrower) external;
function batchLiquidateTroves(address[] calldata _troveArray) external;
function redeemCollateral(
    uint256 _MUSDAmount,
    address _firstRedemptionHint,
    address _upperPartialRedemptionHint,
    address _lowerPartialRedemptionHint,
    uint256 _partialRedemptionHintNICR,
    uint256 _maxIterations,
    uint256 _maxFeePercentage
) external;
```

### PriceFeed
```solidity
function fetchPrice() external returns (uint256);
function lastGoodPrice() external view returns (uint256);
```

### SortedTroves
```solidity
function findInsertPosition(
    uint256 _NICR,
    address _prevId,
    address _nextId
) external view returns (address, address);
function getSize() external view returns (uint256);
```

### HintHelpers
```solidity
function getApproxHint(
    uint256 _CR,
    uint256 _numTrials,
    uint256 _inputRandomSeed
) external view returns (address, uint256);
```
