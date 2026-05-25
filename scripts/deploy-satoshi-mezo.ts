/**
 * SatoshiVentures — Mezo testnet (matsnet) deployment script
 *
 * Usage:
 *   npx hardhat run scripts/deploy-satoshi-mezo.ts --network mezoTestnet
 *
 * Environment overrides (any subset; falls back to the verified matsnet
 * addresses pulled from `mezo-org/musd@HEAD`):
 *   MEZO_MUSD                 (default: 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503)
 *   MEZO_BORROWER_OPS         (default: 0xCdF7028ceAB81fA0C6971208e83fa7872994beE5)
 *   MEZO_TROVE_MANAGER        (default: 0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0)
 *   MEZO_PRICE_FEED           (default: 0x86bCF0841622a5dAC14A313a15f96A95421b9366)
 *   MEZO_SORTED_TROVES        (default: 0x722E4D24FD6Ff8b0AC679450F3D91294607268fA)
 *   MEZO_HINT_HELPERS         (default: 0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6)
 *   MEZO_STABILITY_POOL       (default: 0x1CCA7E410eE41739792eA0A24e00349Dd247680e)
 *
 * Deploys:
 *   1. MezoBorrowConnector — read-only Mezo facade
 *   2. CollateralTracker   — investor portfolio aggregator
 *   (YieldOptimizer is deployed per-FundingPool — see deploy-yield-optimizer.ts)
 */

import { network } from "hardhat";

// ── Mezo testnet (matsnet) — verified against mezo-org/musd repo ────────────
const MEZO_ADDRESSES = {
  MUSD:               "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
  BorrowerOperations: "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
  TroveManager:       "0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0",
  PriceFeed:          "0x86bCF0841622a5dAC14A313a15f96A95421b9366",
  SortedTroves:       "0x722E4D24FD6Ff8b0AC679450F3D91294607268fA",
  HintHelpers:        "0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6",
  StabilityPool:      "0x1CCA7E410eE41739792eA0A24e00349Dd247680e",
  PCV:                "0x4dDD70f4C603b6089c07875Be02fEdFD626b80Af",
  InterestRateManager:"0xD4D6c36A592A2c5e86035A6bca1d57747a567f37",
};

function pick(envKey: string, fallback: string): string {
  const v = process.env[envKey];
  return v && v.length > 0 ? v : fallback;
}

async function main() {
  // Hardhat v3 network connection (matches the pattern in scripts/send-op-tx.ts).
  const conn = await (network as any).connect();
  const ethers = conn.ethers;

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log("\n╔═════════════════════════════════════════════════════════╗");
  console.log("║  SatoshiVentures — Mezo Integration Deployment          ║");
  console.log("╚═════════════════════════════════════════════════════════╝");
  console.log(`Network chainId : ${chainId}`);
  console.log(`Deployer        : ${deployer.address}`);
  console.log(`Balance         : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BTC`);
  console.log();

  if (chainId !== 31611n) {
    console.warn(`⚠  Expected Mezo testnet chainId 31611, got ${chainId}. Continuing anyway…`);
  }

  const addrs = {
    musd:               pick("MEZO_MUSD",            MEZO_ADDRESSES.MUSD),
    borrowerOperations: pick("MEZO_BORROWER_OPS",    MEZO_ADDRESSES.BorrowerOperations),
    troveManager:       pick("MEZO_TROVE_MANAGER",   MEZO_ADDRESSES.TroveManager),
    priceFeed:          pick("MEZO_PRICE_FEED",      MEZO_ADDRESSES.PriceFeed),
    sortedTroves:       pick("MEZO_SORTED_TROVES",   MEZO_ADDRESSES.SortedTroves),
    hintHelpers:        pick("MEZO_HINT_HELPERS",    MEZO_ADDRESSES.HintHelpers),
    stabilityPool:      pick("MEZO_STABILITY_POOL",  MEZO_ADDRESSES.StabilityPool),
  };

  console.log("Wired Mezo addresses:");
  for (const [k, v] of Object.entries(addrs)) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log();

  // ── 1. MezoBorrowConnector ────────────────────────────────────────────
  console.log("[1/2] Deploying MezoBorrowConnector…");
  const ConnectorF = await ethers.getContractFactory("MezoBorrowConnector");
  const connector  = await ConnectorF.deploy(
    addrs.borrowerOperations,
    addrs.troveManager,
    addrs.priceFeed,
    addrs.sortedTroves,
    addrs.hintHelpers,
    addrs.musd,
  );
  await connector.waitForDeployment();
  const connectorAddr = await connector.getAddress();
  console.log(`     ✓ MezoBorrowConnector: ${connectorAddr}`);

  // Sanity ping: read live BTC price. If wiring is wrong this throws.
  try {
    const price = await connector.getBtcPrice();
    console.log(`     · Live BTC price (1e18 USD): ${price.toString()}`);
  } catch (e: any) {
    console.warn(`     ⚠ getBtcPrice() failed — check addresses. Error: ${e?.message}`);
  }

  // ── 2. CollateralTracker ──────────────────────────────────────────────
  console.log("[2/2] Deploying CollateralTracker…");
  const TrackerF = await ethers.getContractFactory("CollateralTracker");
  const tracker  = await TrackerF.deploy(connectorAddr, addrs.musd);
  await tracker.waitForDeployment();
  const trackerAddr = await tracker.getAddress();
  console.log(`     ✓ CollateralTracker: ${trackerAddr}`);
  console.log(`     · Register your FundingPools later via tracker.registerPool(<addr>)`);

  // ── YieldOptimizer (deferred) ─────────────────────────────────────────
  console.log("\n[note] YieldOptimizer deployment is per-FundingPool — defer until pools exist.");
  console.log("       Use scripts/deploy-yield-optimizer.ts or call YieldOptimizer constructor");
  console.log("       directly with (musd, vault, fundingPool, ideaDAO).");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Summary (paste into frontend .env.local):");
  console.log(`  NEXT_PUBLIC_MEZO_BORROW_CONNECTOR=${connectorAddr}`);
  console.log(`  NEXT_PUBLIC_COLLATERAL_TRACKER=${trackerAddr}`);
  console.log(`  NEXT_PUBLIC_MUSD_TOKEN=${addrs.musd}`);
  console.log(`  NEXT_PUBLIC_MEZO_PRICE_FEED=${addrs.priceFeed}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
