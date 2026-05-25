/**
 * SatoshiVentures — YieldOptimizer per-FundingPool deployment script
 *
 * Usage:
 *   npx hardhat run scripts/deploy-yield-optimizer.ts --network mezoTestnet
 *
 * Required env vars (no defaults — must be explicit):
 *   YOPT_MUSD           — MUSD token address
 *   YOPT_VAULT          — IMUSDSavingsVault-compatible vault address
 *   YOPT_POOL           — SatoshiVentures FundingPool address
 *   YOPT_DAO            — IdeaDAO address (admin of this optimizer)
 *
 * Optional:
 *   YOPT_DEPLOYER_KEY   — private key of deployer (must be the DAO or
 *                         funded by the DAO to set initial admin ownership)
 */

import { network } from "hardhat";

function req(envKey: string): string {
  const v = process.env[envKey];
  if (!v) throw new Error(`Missing required env: ${envKey}`);
  return v;
}

async function main() {
  const conn = await (network as any).connect();
  const ethers = conn.ethers;

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const musdAddr    = req("YOPT_MUSD");
  const vaultAddr   = req("YOPT_VAULT");
  const poolAddr    = req("YOPT_POOL");
  const daoAddr     = req("YOPT_DAO");

  console.log("\n╔═════════════════════════════════════════════════════════╗");
  console.log("║  SatoshiVentures — YieldOptimizer Deployment              ║");
  console.log("╚═════════════════════════════════════════════════════════╝");
  console.log(`Network  : ${chainId}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`MUSD     : ${musdAddr}`);
  console.log(`Vault    : ${vaultAddr}`);
  console.log(`Pool     : ${poolAddr}`);
  console.log(`DAO      : ${daoAddr}`);
  console.log();

  console.log("Deploying YieldOptimizer…");
  const F = await ethers.getContractFactory("YieldOptimizer");
  const opt = await F.deploy(musdAddr, vaultAddr, poolAddr, daoAddr);
  await opt.waitForDeployment();
  const optAddr = await opt.getAddress();
  console.log(`✓ YieldOptimizer deployed: ${optAddr}`);
  console.log();
  console.log("Next step (DAO call on the FundingPool):");
  console.log(`  fundingPool.setSatoshiHooks(collateralTracker, ${optAddr})`);
  console.log("\nOr via ethers:");
  console.log(`  const fp = await ethers.getContractAt("FundingPool", "${poolAddr}");`);
  console.log(`  await fp.setSatoshiHooks(collateralTrackerAddr, "${optAddr}");`);
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});