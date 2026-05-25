
# SATOSHIVENTURES — QUICK REFERENCE CARD
## Mezo Testnet (Chain ID: 31611) — Critical Addresses & Interfaces

---

## CONFIRMED ADDRESSES

| Contract | Testnet Address | Mainnet Address | Verified |
|----------|-----------------|-----------------|----------|
| **MUSD Token** | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` | ✅ Yes |
| **BTC (tBTC)** | `0x7b7C000000000000000000000000000000000000` | `0x18084fbA666a33d37592fA2633fD49a74DD93a88` | ✅ Yes |
| **MUSD/BTC Pool** | `0x52e604c44417233b6CcEDDDc0d640A405Caacefb` | Same | ✅ Yes |
| **MUSD/mUSDC Pool** | `0xEd812AEc0Fecc8fD882Ac3eccC43f3aA80A6c356` | Same | ✅ Yes |
| **PoolFactory** | `0x83FE469C636C4081b87bA5b3Ae9991c6Ed104248` | Same | ✅ Yes |
| **Router** | `0x16A76d3cd3C1e3CE843C6680d6B37E9116b5C706` | Same | ✅ Yes |

## NOW CONFIRMED — Pulled from `mezo-org/musd` repo (`solidity/artifacts/deployments/matsnet/`)

| Contract | Testnet Address (matsnet) | Verified |
|----------|---------------------------|----------|
| **BorrowerOperations** | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` | ✅ |
| **TroveManager** | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` | ✅ |
| **PriceFeed** | `0x86bCF0841622a5dAC14A313a15f96A95421b9366` | ✅ |
| **SortedTroves** | `0x722E4D24FD6Ff8b0AC679450F3D91294607268fA` | ✅ |
| **HintHelpers** | `0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6` | ✅ |
| **StabilityPool** | `0x1CCA7E410eE41739792eA0A24e00349Dd247680e` | ✅ |
| **ActivePool** | `0x143A063F62340DA3A8bEA1C5642d18C6D0F7FF51` | ✅ |
| **DefaultPool** | `0x59851D252090283f9367c159f0C9036e75483300` | ✅ |
| **CollSurplusPool** | `0xB4C35747c26E4aB5F1a7CdC7E875B5946eFa6fa9` | ✅ |
| **GasPool** | `0x8fa3EF45137C3AFF337e42f98023C1D7dd3666C0` | ✅ |
| **InterestRateManager** | `0xD4D6c36A592A2c5e86035A6bca1d57747a567f37` | ✅ |
| **PCV** | `0x4dDD70f4C603b6089c07875Be02fEdFD626b80Af` | ✅ |
| **BorrowerOperationsSignatures** | `0xD757e3646AF370b15f32EB557F0F8380Df7D639e` | ✅ |
| **GovernableVariables** | `0x6552059B6eFc6aA4AE3ea45f28ED4D92acE020cD` | ✅ |

> ⚠️ **MUSD does NOT ship a standalone user-deposit "Savings Vault"** in the current
> matsnet deployment. The closest analog is `StabilityPool` (deposit MUSD ↔ earn BTC
> from liquidations; principal is at risk during liquidations). The `IMUSDSavingsRate`
> interface only exposes `receiveProtocolYield(uint256)` — it's the *receiving* end
> for protocol fees, not a generic vault.
>
> SatoshiVentures `YieldOptimizer.sol` therefore targets a generic `IMUSDSavingsVault`
> interface (deposit/withdraw/balanceOf), with a thin adapter contract that can be
> pointed at the StabilityPool or a future Mezo-native vault. Auto-deposit is
> **disabled by default** to avoid principal risk; the DAO can opt-in.

---

## CRITICAL COMMANDS

### 1. Clone MUSD Repo & Find Addresses
```bash
git clone https://github.com/mezo-org/musd.git
cd musd/solidity
cat deployments/matsnet/*.json | grep -E '"address"|"contractName"'
# OR
ls deployments/matsnet/
# Look for files like: BorrowerOperations.json, TroveManager.json, etc.
```

### 2. Query Contract Addresses On-Chain (if you know one contract)
```javascript
// If you find BorrowerOperations, you can derive others:
// TroveManager is typically set in BorrowerOperations constructor
// PriceFeed is typically set in TroveManager

// Use ethers.js to read state variables:
const borrowerOps = new ethers.Contract(borrowerOpsAddress, abi, provider);
const troveManagerAddr = await borrowerOps.troveManager();
const sortedTrovesAddr = await borrowerOps.sortedTroves();
const priceFeedAddr = await troveManager.priceFeed();
```

### 3. Add Mezo Testnet to MetaMask
```
Network Name: Mezo Testnet
RPC URL: https://rpc.test.mezo.org
Chain ID: 31611
Currency Symbol: BTC
Block Explorer: https://explorer.test.mezo.org
```

### 4. Get Testnet BTC
- Join Mezo Discord (link in hackathon portal)
- Request testnet BTC in #faucet or #dev-support channel
- Or use the Mezo Testnet Faucet (if available on mezo.org)

---

## BORROWEROPERATIONS INTERFACE (CRITICAL)

```solidity
interface IBorrowerOperations {
    // Open a trove — deposit BTC, borrow MUSD
    function openTrove(
        uint256 _maxFeePercentage,    // e.g., 0.1% = 1e15 (in 1e18)
        uint256 _MUSDAmount,            // MUSD to borrow (18 decimals)
        address _upperHint,             // SortedTroves hint for gas optimization
        address _lowerHint,             // SortedTroves hint
        address _borrower               // Trove owner (usually msg.sender)
    ) external payable;               // Send BTC as msg.value

    // Adjust existing trove
    function adjustTrove(
        uint256 _maxFeePercentage,
        uint256 _collWithdrawal,        // BTC to withdraw (0 if adding)
        uint256 _debtChange,            // MUSD change amount
        bool _isDebtIncrease,           // true = borrow more, false = repay
        address _upperHint,
        address _lowerHint
    ) external payable;               // Send BTC if adding collateral

    // Close trove — repay all debt, withdraw all collateral
    function closeTrove() external;

    // Withdraw collateral only (no debt change)
    function withdrawColl(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    // Repay MUSD only (no collateral change)
    function repayMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    // Add collateral only (no debt change)
    function addColl(
        address _upperHint,
        address _lowerHint
    ) external payable;

    // View: get borrowing fee for amount
    function getBorrowingFee(uint256 _MUSDAmount) external view returns (uint256);

    // View: get trove owner count
    function getTroveOwnersCount() external view returns (uint256);
}
```

## TROVEMANAGER INTERFACE (CRITICAL)

```solidity
interface ITroveManager {
    // Trove status: 0 = non-existent, 1 = active, 2 = closed by owner, 3 = closed by liquidation, 4 = closed by redemption
    function getTroveStatus(address _borrower) external view returns (uint256);

    // Get collateral amount (in BTC wei)
    function getTroveColl(address _borrower) external view returns (uint256);

    // Get total debt (principal + fees + interest, in MUSD wei)
    function getTroveDebt(address _borrower) external view returns (uint256);

    // Get nominal ICR (collateral / debt, no price)
    function getNominalICR(address _borrower) external view returns (uint256);

    // Get current ICR with price (in BPS, 11000 = 110%)
    function getCurrentICR(address _borrower, uint256 _price) external view returns (uint256);

    // Get total system collateralization ratio
    function getTCR(uint256 _price) external view returns (uint256);

    // Get entire trove data
    function Troves(address _borrower) external view returns (
        uint256 debt,
        uint256 coll,
        uint256 stake,
        uint256 status,
        uint128 arrayIndex
    );

    // Liquidate a single trove
    function liquidate(address _borrower) external;

    // Batch liquidate multiple troves
    function batchLiquidateTroves(address[] calldata _troveArray) external;

    // Redeem MUSD for BTC (maintains peg)
    function redeemCollateral(
        uint256 _MUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) external;

    // Check if system is in recovery mode (TCR < 150%)
    function checkRecoveryMode(uint256 _price) external view returns (bool);

    // Get total system collateral and debt
    function getEntireSystemColl() external view returns (uint256);
    function getEntireSystemDebt() external view returns (uint256);
}
```

## PRICEFEED INTERFACE

```solidity
interface IPriceFeed {
    // Fetch and return latest BTC/USD price (18 decimals)
    function fetchPrice() external returns (uint256);

    // Get last good price without fetching
    function lastGoodPrice() external view returns (uint256);

    // Price feed status
    function priceFeedStatus() external view returns (uint256); // 0 = working, 1 = broken, 2 = frozen
}
```

## SORTEDTROVES INTERFACE (For Hints)

```solidity
interface ISortedTroves {
    // Find insert position for a new trove (gas optimization)
    function findInsertPosition(
        uint256 _NICR,      // Nominal ICR (coll * 1e20 / debt)
        address _prevId,    // Previous hint
        address _nextId     // Next hint
    ) external view returns (address, address);

    // Get approximate hint (for starting search)
    function getSize() external view returns (uint256);

    // Check if node exists
    function contains(address _id) external view returns (bool);

    // Get first/last node
    function getFirst() external view returns (address);
    function getLast() external view returns (address);
}
```

## HINTHELPERS INTERFACE

```solidity
interface IHintHelpers {
    // Get approximate hint for a given ICR
    function getApproxHint(
        uint256 _CR,                // Target collateral ratio
        uint256 _numTrials,         // Number of random trials (e.g., 15)
        uint256 _inputRandomSeed    // Random seed (e.g., block.timestamp)
    ) external view returns (address hintAddress, uint256 diff, uint256 latestRandomSeed);

    // Compute nominal ICR
    function computeNominalCR(uint256 _coll, uint256 _debt) external pure returns (uint256);

    // Compute CR with price
    function computeCR(uint256 _coll, uint256 _debt, uint256 _price) external pure returns (uint256);
}
```

---

## GAS OPTIMIZATION — HINT CALCULATION (CRITICAL FOR TESTNET)

```javascript
// Complete hint calculation for openTrove
async function getHintsForOpenTrove(
    borrowerOperations,
    troveManager,
    sortedTroves,
    hintHelpers,
    collateralAmount,    // BTC in wei
    debtAmount           // MUSD in wei (before fees)
) {
    // 1. Get borrowing fee
    const borrowingFee = await borrowerOperations.getBorrowingFee(debtAmount);
    const gasCompensation = await troveManager.MUSD_GAS_COMPENSENSATION(); // Usually 200e18

    // 2. Calculate total expected debt
    const expectedTotalDebt = debtAmount + borrowingFee + gasCompensation;

    // 3. Calculate NICR (Nominal ICR) = collateral * 1e20 / debt
    const nicr = (collateralAmount * BigInt(1e20)) / expectedTotalDebt;

    // 4. Get approximate hint
    const { '0': approxHint } = await hintHelpers.getApproxHint(nicr, 15, 42);

    // 5. Find exact insert position
    const { '0': upperHint, '1': lowerHint } = 
        await sortedTroves.findInsertPosition(nicr, approxHint, approxHint);

    return { upperHint, lowerHint, expectedTotalDebt, borrowingFee };
}
```

---

## TESTNET WORKFLOW CHECKLIST

### Step 1: Environment Setup
- [ ] Add Mezo Testnet to MetaMask (Chain ID: 31611)
- [ ] Get testnet BTC from Discord faucet
- [ ] Verify MUSD token at `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- [ ] Find BorrowerOperations, TroveManager, PriceFeed, SortedTroves, HintHelpers addresses

### Step 2: Manual Trove Test
- [ ] Call `openTrove` with 0.01 tBTC collateral, borrow 100 MUSD
- [ ] Verify trove status = 1 (active)
- [ ] Check `getTroveColl` and `getTroveDebt`
- [ ] Calculate ICR = coll * price / debt (should be > 110%)
- [ ] Call `addColl` to add more BTC
- [ ] Call `adjustTrove` to borrow more MUSD
- [ ] Call `closeTrove` to repay and withdraw

### Step 3: Integration Test
- [ ] Deploy MezoBorrowConnector with real MUSD addresses
- [ ] Test `openTroveOptimized` with hint calculation
- [ ] Test `getTroveHealth` returns correct data
- [ ] Test `isLiquidationRisk` at various prices
- [ ] Deploy CollateralTracker
- [ ] Test deposit tracking through FundingPool

### Step 4: Frontend Test
- [ ] Connect wallet to Mezo Testnet
- [ ] Display BTC balance
- [ ] Open trove via UI
- [ ] Display trove health (ICR, liquidation price)
- [ ] Deposit MUSD to FundingPool
- [ ] Display portfolio health

---

## DISCORD RESOURCES

- **Mezo Discord:** Available via hackathon portal (you're connected as visualise_crypto#0)
- **Channels to join:**
  - #dev-support — Ask for contract addresses
  - #faucet — Request testnet BTC
  - #general — General questions
- **Encode Club Discord:** Also available for hackathon-specific questions

---

## EMERGENCY CONTACTS

If you can't find contract addresses:
1. Check `musd/solidity/deployments/matsnet/` in the repo
2. Ask in #dev-support with: "Looking for testnet addresses for BorrowerOperations, TroveManager, PriceFeed, SortedTroves, HintHelpers"
3. Check Mezo Explorer (explorer.test.mezo.org) — search for MUSD token and trace transactions
4. Check if there's a `deployment-matsnet.json` or similar in the repo root

---

## KEY CONSTANTS

| Parameter | Value | Notes |
|-----------|-------|-------|
| MUSD Decimals | 18 | Same as ETH |
| BTC Decimals | 18 | On Mezo (not 8!) |
| Min ICR | 110% | 11000 BPS |
| Recovery Mode TCR | 150% | 15000 BPS |
| Borrowing Fee | 0.1% | 10 BPS |
| Redemption Fee | 0.75% | 75 BPS |
| Gas Compensation | 200 MUSD | Deducted on open, returned on close |
| Fixed Interest | Varies | Set per trove at open, can refinance |
| Max Fee % for openTrove | 0.5% | 5e15 in 1e18 |

---

## MUSD TOKEN INTERFACE

```solidity
interface IMUSD {
    // Standard ERC20
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    // MUSD-specific
    function mint(address _account, uint256 _amount) external;
    function burn(address _account, uint256 _amount) external;
    function sendToPool(address _sender, address _pool, uint256 _amount) external;
    function returnFromPool(address _pool, address _receiver, uint256 _amount) external;

    // TroveManager and StabilityPool are typically the minters
    function troveManagerAddress() external view returns (address);
    function stabilityPoolAddress() external view returns (address);
    function borrowerOperationsAddress() external view returns (address);
}
```
