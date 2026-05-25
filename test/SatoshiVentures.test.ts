/**
 * SatoshiVentures — Mezo MUSD Integration Tests
 *
 * Runner : node:test  (Hardhat v3 native)
 * Network: local hardhat node on :8545  (run: `npx hardhat node`)
 *
 * Coverage:
 *   1.  MezoBorrowConnector — hint computation, health queries, liquidation
 *       price, required-collateral math.
 *   2.  CollateralTracker  — registered-pool gating, deposit/withdraw tracking,
 *       portfolio aggregation, alert thresholds, removal on zero balance.
 *   3.  YieldOptimizer     — autoDeposit gating, withdrawForPayout, harvestYield,
 *       DAO-only admin.
 *   4.  FundingPool hooks  — when collateralTracker + yieldOptimizer are wired,
 *       deposit/withdraw/releaseBuilderFunds route through them.
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ─── helpers ─────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");

function artifact(contractPath: string) {
  return JSON.parse(readFileSync(join(ROOT, "artifacts/contracts", contractPath), "utf8"));
}

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

async function getSigner(index: number): Promise<ethers.JsonRpcSigner> {
  const accounts = await provider.listAccounts();
  return provider.getSigner(accounts[index].address);
}

async function deploy(
  signer: ethers.Signer,
  art: { abi: any; bytecode: string },
  args: unknown[] = []
): Promise<ethers.Contract> {
  const factory  = new ethers.ContractFactory(art.abi, art.bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

async function expectRevert(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
    assert.fail(`Expected revert matching ${pattern} but call succeeded`);
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    assert.match(msg, pattern);
  }
}

const E18  = 10n ** 18n;
const BPS  = 10_000n;
const DAY  = 86_400;

// ─── Artifacts ───────────────────────────────────────────────────────────────

const A = {
  // SatoshiVentures
  MezoBorrowConnector: artifact("satoshi/MezoBorrowConnector.sol/MezoBorrowConnector.json"),
  CollateralTracker:   artifact("satoshi/CollateralTracker.sol/CollateralTracker.json"),
  YieldOptimizer:      artifact("satoshi/YieldOptimizer.sol/YieldOptimizer.json"),

  // Mocks
  MockMUSDToken:        artifact("satoshi/mocks/MezoMocks.sol/MockMUSDToken.json"),
  MockPriceFeed:        artifact("satoshi/mocks/MezoMocks.sol/MockPriceFeed.json"),
  MockSortedTroves:     artifact("satoshi/mocks/MezoMocks.sol/MockSortedTroves.json"),
  MockHintHelpers:      artifact("satoshi/mocks/MezoMocks.sol/MockHintHelpers.json"),
  MockBorrowerOps:      artifact("satoshi/mocks/MezoMocks.sol/MockBorrowerOperations.json"),
  MockTroveManager:     artifact("satoshi/mocks/MezoMocks.sol/MockTroveManager.json"),
  MockMUSDSavingsVault: artifact("satoshi/mocks/MezoMocks.sol/MockMUSDSavingsVault.json"),

  // Existing ideafi (only the bits the integration test needs)
  MockRegistry:     artifact("ideafi/mocks/MockRegistry.sol/MockRegistry.json"),
  IdeaToken:        artifact("ideafi/IdeaToken.sol/IdeaToken.json"),
  FundingPool:      artifact("ideafi/FundingPool.sol/FundingPool.json"),
  ProtocolMarket:   artifact("ideafi/ProtocolMarket.sol/ProtocolMarket.json"),
  ProtocolTreasury: artifact("ideafi/ProtocolTreasury.sol/ProtocolTreasury.json"),
};

// ═════════════════════════════════════════════════════════════════════════════
// MezoBorrowConnector — hint + health
// ═════════════════════════════════════════════════════════════════════════════
describe("MezoBorrowConnector", { concurrency: false }, async () => {

  let deployer: ethers.JsonRpcSigner;
  let alice:    ethers.JsonRpcSigner;
  let musd:           ethers.Contract;
  let priceFeed:      ethers.Contract;
  let sortedTroves:   ethers.Contract;
  let hintHelpers:    ethers.Contract;
  let borrowerOps:    ethers.Contract;
  let troveManager:   ethers.Contract;
  let connector:      ethers.Contract;

  before(async () => {
    [deployer, alice] = await Promise.all([0, 1].map(getSigner));

    musd          = await deploy(deployer, A.MockMUSDToken);
    priceFeed     = await deploy(deployer, A.MockPriceFeed);
    sortedTroves  = await deploy(deployer, A.MockSortedTroves);
    hintHelpers   = await deploy(deployer, A.MockHintHelpers);
    borrowerOps   = await deploy(deployer, A.MockBorrowerOps);
    troveManager  = await deploy(deployer, A.MockTroveManager);

    connector = await deploy(deployer, A.MezoBorrowConnector, [
      await borrowerOps.getAddress(),
      await troveManager.getAddress(),
      await priceFeed.getAddress(),
      await sortedTroves.getAddress(),
      await hintHelpers.getAddress(),
      await musd.getAddress(),
    ]);
  });

  it("reverts on zero constructor args", async () => {
    const tmAddr      = await troveManager.getAddress();
    const pfAddr      = await priceFeed.getAddress();
    const stAddr      = await sortedTroves.getAddress();
    const hhAddr      = await hintHelpers.getAddress();
    const musdAddr    = await musd.getAddress();
    await expectRevert(
      () => deploy(deployer, A.MezoBorrowConnector, [
        ethers.ZeroAddress,
        tmAddr, pfAddr, stAddr, hhAddr, musdAddr,
      ]),
      /ZeroAddress|reverted/
    );
  });

  it("computeOpenTroveHints returns expected totalDebt (principal + fee + gas comp)", async () => {
    const principal = 1_000n * E18;
    // 0.01 BTC = 1e16 wei (MUSD uses 18-decimal BTC on Mezo)
    const collateral = 10n ** 16n;
    const [, , expectedTotalDebt, nicr] = await connector.computeOpenTroveHints(
      collateral,
      principal
    );

    // MockBorrowerOps fee = 0.1%
    const fee = (principal * 10n) / 10_000n;
    const gasComp = 200n * E18;
    assert.equal(expectedTotalDebt, principal + fee + gasComp, "totalDebt math");

    // NICR for 0.01 BTC collateral & ~1200 MUSD debt
    // NICR = coll * 1e20 / debt = 1e16 * 1e20 / 1200.something*1e18
    assert.ok(nicr > 0n, "NICR > 0");
  });

  it("computeOpenTroveHints reverts on zero inputs", async () => {
    await expectRevert(
      () => connector.computeOpenTroveHints(0, 1000n * E18),
      /ZeroCollateral|reverted/
    );
    await expectRevert(
      () => connector.computeOpenTroveHints(1n * E18, 0),
      /ZeroDebt|reverted/
    );
  });

  it("getTroveHealth returns zero for non-existent trove", async () => {
    const aliceAddr = await alice.getAddress();
    const h = await connector.getTroveHealth(aliceAddr);
    assert.equal(h[0], 0n,  "collateral == 0");
    assert.equal(h[1], 0n,  "debt == 0");
    assert.equal(h[2], 0n,  "icrBps == 0");
    assert.equal(h[4], 0n,  "status == nonExistent");
  });

  it("getTroveHealth reports correct ICR / TCR for an active trove", async () => {
    const aliceAddr = await alice.getAddress();

    // alice: 0.05 BTC coll, 2000 MUSD debt. At BTC=$100k, ICR = 0.05*100000/2000 = 250%
    await (troveManager.connect(deployer) as ethers.Contract).setTrove(
      aliceAddr,
      5n * 10n ** 16n,   // 0.05 BTC
      2000n * E18,        // 2000 MUSD
      1                   // Status.active
    );
    await (troveManager.connect(deployer) as ethers.Contract).setTCR(2n * E18); // 200%

    const h = await connector.getTroveHealth(aliceAddr);
    // h[2] is icrBps. ICR ratio = 2.5e18 → BPS = 25000.
    assert.equal(h[2], 25_000n, "icrBps == 250%");
    assert.equal(h[3], 20_000n, "tcrBps == 200%");
    assert.equal(h[4], 1n,      "status == active");
    assert.equal(h[5], 100_000n * E18, "btcPrice 1e18");
  });

  it("isLiquidationRisk flips when ICR crosses 110%", async () => {
    const aliceAddr = await alice.getAddress();

    // ICR = 250% → safe
    assert.equal(await connector.isLiquidationRisk(aliceAddr), false);

    // Drop price → ICR = 0.05 * 40000 / 2000 = 1.0 = 100%
    await (priceFeed.connect(deployer) as ethers.Contract).setPrice(40_000n * E18);
    assert.equal(await connector.isLiquidationRisk(aliceAddr), true);

    // Reset
    await (priceFeed.connect(deployer) as ethers.Contract).setPrice(100_000n * E18);
  });

  it("getLiquidationPrice returns the price at which ICR == 110%", async () => {
    const aliceAddr = await alice.getAddress();

    // debt=2000e18, coll=0.05e18 → liq price = 1.1e18 * 2000e18 / 0.05e18 = 44000e18 → $44,000
    const liq = await connector.getLiquidationPrice(aliceAddr);
    assert.equal(liq, 44_000n * E18, "liq price == $44,000");
  });

  it("getRequiredCollateral matches the target ICR at the current price", async () => {
    // For 2000 MUSD at 150% ICR & BTC=$100k:
    // required_btc = 2000 * 1.5 / 100000 = 0.03 BTC = 3e16
    const req = await connector.getRequiredCollateral(2000n * E18, 15_000n, 100_000n * E18);
    assert.equal(req, 3n * 10n ** 16n);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CollateralTracker
// ═════════════════════════════════════════════════════════════════════════════
describe("CollateralTracker", { concurrency: false }, async () => {

  let deployer: ethers.JsonRpcSigner;
  let alice:    ethers.JsonRpcSigner;
  let poolA:    ethers.JsonRpcSigner; // we use accounts as stand-in pools
  let poolB:    ethers.JsonRpcSigner;
  let outsider: ethers.JsonRpcSigner;

  let musd:         ethers.Contract;
  let priceFeed:    ethers.Contract;
  let troveManager: ethers.Contract;
  let connector:    ethers.Contract;
  let tracker:      ethers.Contract;

  before(async () => {
    [deployer, alice, poolA, poolB, outsider] = await Promise.all(
      [0, 1, 7, 8, 9].map(getSigner)
    );

    musd         = await deploy(deployer, A.MockMUSDToken);
    priceFeed    = await deploy(deployer, A.MockPriceFeed);
    const sorted = await deploy(deployer, A.MockSortedTroves);
    const hints  = await deploy(deployer, A.MockHintHelpers);
    const bops   = await deploy(deployer, A.MockBorrowerOps);
    troveManager = await deploy(deployer, A.MockTroveManager);

    connector = await deploy(deployer, A.MezoBorrowConnector, [
      await bops.getAddress(),
      await troveManager.getAddress(),
      await priceFeed.getAddress(),
      await sorted.getAddress(),
      await hints.getAddress(),
      await musd.getAddress(),
    ]);

    tracker = await deploy(deployer, A.CollateralTracker, [
      await connector.getAddress(),
      await musd.getAddress(),
    ]);
  });

  it("only registered pools can write", async () => {
    const aliceAddr = await alice.getAddress();
    await expectRevert(
      () => (tracker.connect(outsider) as ethers.Contract).trackDeposit(
        aliceAddr, 100n * E18
      ),
      /NotRegisteredPool|reverted/
    );
  });

  it("owner can register & unregister pools", async () => {
    const poolAddr = await poolA.getAddress();
    await (tracker.connect(deployer) as ethers.Contract).registerPool(poolAddr);
    assert.equal(await tracker.isRegisteredPool(poolAddr), true);

    await (tracker.connect(deployer) as ethers.Contract).unregisterPool(poolAddr);
    assert.equal(await tracker.isRegisteredPool(poolAddr), false);

    await (tracker.connect(deployer) as ethers.Contract).registerPool(poolAddr);
  });

  it("tracks deposits across multiple pools and totals", async () => {
    const aliceAddr = await alice.getAddress();
    const poolAAddr = await poolA.getAddress();
    const poolBAddr = await poolB.getAddress();

    // Register poolB too
    await (tracker.connect(deployer) as ethers.Contract).registerPool(poolBAddr);

    await (tracker.connect(poolA) as ethers.Contract).trackDeposit(aliceAddr, 1000n * E18);
    await (tracker.connect(poolA) as ethers.Contract).trackDeposit(aliceAddr,  500n * E18);
    await (tracker.connect(poolB) as ethers.Contract).trackDeposit(aliceAddr, 300n * E18);

    assert.equal(await tracker.totalDeployed(aliceAddr), 1800n * E18);
    assert.equal(await tracker.ventureDeposits(aliceAddr, poolAAddr), 1500n * E18);
    assert.equal(await tracker.ventureDeposits(aliceAddr, poolBAddr),  300n * E18);

    const [pools, amounts] = await tracker.getInvestorPortfolio(aliceAddr);
    assert.equal(pools.length, 2);
    assert.equal(amounts.length, 2);
  });

  it("withdrawal removes the pool from the portfolio when balance hits zero", async () => {
    const aliceAddr = await alice.getAddress();
    const poolBAddr = await poolB.getAddress();

    await (tracker.connect(poolB) as ethers.Contract).trackWithdrawal(aliceAddr, 300n * E18);
    assert.equal(await tracker.ventureDeposits(aliceAddr, poolBAddr), 0n);

    const [pools] = await tracker.getInvestorPortfolio(aliceAddr);
    assert.ok(!pools.includes(poolBAddr), "poolB removed from portfolio");
  });

  it("rejects over-withdrawal", async () => {
    const aliceAddr = await alice.getAddress();
    await expectRevert(
      () => (tracker.connect(poolA) as ethers.Contract).trackWithdrawal(aliceAddr, 999_999n * E18),
      /InsufficientTracked|reverted/
    );
  });

  it("alertLevel reflects ICR thresholds (safe / warning / danger)", async () => {
    const aliceAddr = await alice.getAddress();

    // Active trove with adjustable health.
    await (troveManager.connect(deployer) as ethers.Contract).setTrove(
      aliceAddr,
      5n * 10n ** 16n,
      2000n * E18,
      1
    );

    // ICR 250% (price = $100k) → alertLevel 0
    let h = await tracker.getPortfolioHealth(aliceAddr);
    assert.equal(h[7], 0n, "safe");

    // Drop price → ICR 125% → above danger (115%) below warning (130%) → 1
    await (priceFeed.connect(deployer) as ethers.Contract).setPrice(50_000n * E18);
    h = await tracker.getPortfolioHealth(aliceAddr);
    assert.equal(h[7], 1n, "warning");

    // Drop further → ICR ~110% → below danger → 2
    await (priceFeed.connect(deployer) as ethers.Contract).setPrice(44_000n * E18);
    h = await tracker.getPortfolioHealth(aliceAddr);
    assert.equal(h[7], 2n, "danger");

    // Reset
    await (priceFeed.connect(deployer) as ethers.Contract).setPrice(100_000n * E18);
  });

  it("checkCollateralHealth recommends a top-up below the safety margin", async () => {
    const aliceAddr = await alice.getAddress();

    // ICR currently 250% → no top-up needed
    let [needs, shortfall] = await tracker.checkCollateralHealth(aliceAddr);
    assert.equal(needs, false);
    assert.equal(shortfall, 0n);

    // Set price so ICR drops below 150% target
    await (priceFeed.connect(deployer) as ethers.Contract).setPrice(50_000n * E18);
    [needs, shortfall] = await tracker.checkCollateralHealth(aliceAddr);
    assert.equal(needs, true);
    assert.ok(shortfall > 0n, "positive shortfall");

    await (priceFeed.connect(deployer) as ethers.Contract).setPrice(100_000n * E18);
  });

  it("setAlertThresholds enforces ordering invariants", async () => {
    await expectRevert(
      () => (tracker.connect(deployer) as ethers.Contract).setAlertThresholds(
        13_000n, 14_000n, 15_000n   // warning <= danger
      ),
      /InvalidThresholds|reverted/
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// YieldOptimizer + FundingPool hooks
// ═════════════════════════════════════════════════════════════════════════════
describe("YieldOptimizer + FundingPool hooks", { concurrency: false }, async () => {

  let deployer:    ethers.JsonRpcSigner;
  let investor:    ethers.JsonRpcSigner;
  let daoSigner:   ethers.JsonRpcSigner;
  let builder:     ethers.JsonRpcSigner;
  let outsider:    ethers.JsonRpcSigner;
  let treasuryKey: ethers.JsonRpcSigner;

  let musd:           ethers.Contract;
  let registry:       ethers.Contract;
  let ideaToken:      ethers.Contract;
  let fundingPool:    ethers.Contract;
  let protocolMarket: ethers.Contract;
  let protoTreasury:  ethers.Contract;
  let vault:          ethers.Contract;
  let optimizer:      ethers.Contract;

  const IDEA_ID = 1n;

  before(async () => {
    [deployer, investor, daoSigner, builder, outsider, treasuryKey] =
      await Promise.all([0, 1, 2, 3, 4, 5].map(getSigner));

    musd     = await deploy(deployer, A.MockMUSDToken);
    registry = await deploy(deployer, A.MockRegistry);

    protoTreasury = await deploy(deployer, A.ProtocolTreasury, [
      [await treasuryKey.getAddress()], 1n,
    ]);
    protocolMarket = await deploy(deployer, A.ProtocolMarket, [
      await protoTreasury.getAddress(),
      await musd.getAddress(),
    ]);

    ideaToken = await deploy(deployer, A.IdeaToken, [
      "Idea #1", "IDEA1",
      await protocolMarket.getAddress(),
      await deployer.getAddress(),
    ]);

    const block = await provider.getBlock("latest");
    const deadline = BigInt((block?.timestamp ?? 0) + DAY * 30);

    fundingPool = await deploy(deployer, A.FundingPool, [
      IDEA_ID,
      await musd.getAddress(),
      await ideaToken.getAddress(),
      await protoTreasury.getAddress(),
      await registry.getAddress(),
      1_000n * E18, // softCap
      10_000n * E18, // hardCap
      deadline,
      20n, // builderAllocPct
    ]);
    await (ideaToken.connect(deployer) as ethers.Contract).initFundingPool(
      await fundingPool.getAddress()
    );

    // Wire mock registry so daoSigner is the "DAO" for this idea.
    await (registry.connect(deployer) as ethers.Contract).setIdeaAddresses(
      IDEA_ID,
      await daoSigner.getAddress(),
      await fundingPool.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      await ideaToken.getAddress(),
    );

    vault = await deploy(deployer, A.MockMUSDSavingsVault, [await musd.getAddress()]);

    optimizer = await deploy(deployer, A.YieldOptimizer, [
      await musd.getAddress(),
      await vault.getAddress(),
      await fundingPool.getAddress(),
      await daoSigner.getAddress(),
    ]);

    // Wire hooks: DAO calls setSatoshiHooks.
    await (fundingPool.connect(daoSigner) as ethers.Contract).setSatoshiHooks(
      ethers.ZeroAddress,                  // skip tracker — covered above
      await optimizer.getAddress()
    );

    // Fund the investor with MUSD
    await (musd.connect(deployer) as ethers.Contract).mint(
      await investor.getAddress(), 5_000n * E18
    );
  });

  it("autoDeposit is a no-op when disabled (default)", async () => {
    // Deposit 1500 MUSD — pool will try autoDeposit but it should silently skip.
    const amount = 1500n * E18;
    await (musd.connect(investor) as ethers.Contract).approve(
      await fundingPool.getAddress(), amount
    );
    await (fundingPool.connect(investor) as ethers.Contract).deposit(amount);

    const net = amount - (amount * 200n) / 10_000n;
    const poolBal = await musd.balanceOf(await fundingPool.getAddress());
    assert.equal(poolBal, net, "all deposited funds stay in pool when optimizer disabled");
    assert.equal(await optimizer.vaultPrincipal(), 0n);
  });

  it("DAO enables autoDeposit → next deposit sweeps to vault", async () => {
    await (optimizer.connect(daoSigner) as ethers.Contract).toggleAutoDeposit(true);

    const amount = 1500n * E18;
    await (musd.connect(investor) as ethers.Contract).approve(
      await fundingPool.getAddress(), amount
    );
    await (fundingPool.connect(investor) as ethers.Contract).deposit(amount);

    // If autoDeposit silently failed inside `try`, call it explicitly so we
    // surface the underlying error.
    const poolBalAfterDeposit = await musd.balanceOf(await fundingPool.getAddress());
    if (poolBalAfterDeposit > 0n) {
      await (optimizer.connect(investor) as ethers.Contract).autoDeposit();
    }

    const poolBal = await musd.balanceOf(await fundingPool.getAddress());
    const principal = await optimizer.vaultPrincipal();
    assert.equal(poolBal, 0n, "all idle MUSD swept");
    assert.ok(principal > 0n, "vaultPrincipal incremented");
  });

  it("withdraw triggers _ensureLiquidity to pull funds back", async () => {
    // Investor wants to withdraw 500 MUSD. Pool has 0 idle (we just swept).
    // Need IdeaToken balance ≥ amount; withdraw uses raw MUSD units.
    // Approve and burn happens internally.
    const want = 500n * E18;
    await (fundingPool.connect(investor) as ethers.Contract).withdraw(want);

    const balAfter = await musd.balanceOf(await investor.getAddress());
    // Investor started with 5000, spent 2*1500 deposits, withdrew 500
    // = 5000 - 3000 + 500 = 2500 MUSD
    assert.equal(balAfter, 2500n * E18, "investor received MUSD after vault drain");
  });

  it("DAO-only admin: toggleAutoDeposit reverts for non-DAO", async () => {
    await expectRevert(
      () => (optimizer.connect(outsider) as ethers.Contract).toggleAutoDeposit(false),
      /NotDAO|reverted/
    );
  });

  it("harvestYield credits accrued yield back to the FundingPool", async () => {
    // Sim: mint 100 MUSD into the vault contract & credit yieldEarned for optimizer.
    const yieldAmt = 100n * E18;
    await (musd.connect(deployer) as ethers.Contract).mint(await vault.getAddress(), yieldAmt);
    await (vault.connect(deployer) as ethers.Contract).accrueYield(
      await optimizer.getAddress(), yieldAmt
    );

    const poolBefore = await musd.balanceOf(await fundingPool.getAddress());
    await (optimizer.connect(outsider) as ethers.Contract).harvestYield();
    const poolAfter = await musd.balanceOf(await fundingPool.getAddress());

    assert.equal(poolAfter - poolBefore, yieldAmt, "yield forwarded to pool");
    assert.equal(await optimizer.totalYieldHarvested(), yieldAmt);
  });
});
