import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

task("deploy-phase1", "Deploy Seamless Phase 1", async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  console.log("=== Seamless Platform Phase 1 Deployment ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying from: ${deployer.address}`);

  try {
    // Step 1
    console.log("\n[1/4] Deploying TokenLaunchpad...");
    const TokenLaunchpad = await hre.ethers.getContractFactory("TokenLaunchpad");
    const tokenLaunchpad = await TokenLaunchpad.deploy();
    await tokenLaunchpad.waitForDeployment();
    const tla = await tokenLaunchpad.getAddress();
    console.log(`✓ TokenLaunchpad: ${tla}`);

    // Step 2
    console.log("\n[2/4] Deploying LiquidityEngine...");
    const LiquidityEngine = await hre.ethers.getContractFactory("LiquidityEngine");
    const liquidityEngine = await LiquidityEngine.deploy();
    await liquidityEngine.waitForDeployment();
    const lea = await liquidityEngine.getAddress();
    console.log(`✓ LiquidityEngine: ${lea}`);

    // Step 3
    console.log("\n[3/4] Deploying YieldVaultFactory...");
    const YieldVaultFactory = await hre.ethers.getContractFactory("YieldVaultFactory");
    const vaultFactory = await YieldVaultFactory.deploy();
    await vaultFactory.waitForDeployment();
    const vfa = await vaultFactory.getAddress();
    console.log(`✓ YieldVaultFactory: ${vfa}`);

    // Step 4
    console.log("\n[4/4] Deploying PlatformRegistry...");
    const PlatformRegistry = await hre.ethers.getContractFactory("PlatformRegistry");
    const platformRegistry = await PlatformRegistry.deploy(tla, lea, vfa);
    await platformRegistry.waitForDeployment();
    const pra = await platformRegistry.getAddress();
    console.log(`✓ PlatformRegistry: ${pra}`);

    // Summary
    console.log("\n=== Deployment Summary ===");
    console.log(`TokenLaunchpad:    ${tla}`);
    console.log(`LiquidityEngine:   ${lea}`);
    console.log(`YieldVaultFactory: ${vfa}`);
    console.log(`PlatformRegistry:  ${pra}`);

    console.log("\n=== Mezo Testnet (Chain 31611) ===");
    console.log("BasicRouter:  0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9");
    console.log("BasicFactory: 0x4947243CC818b627A5D06d14C4eCe7398A23Ce1A");
    console.log("MUSD:         0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503");
    console.log("PoolsVoter:   0x72F8dd7F44fFa19E45955aa20A5486E8EB255738");

    console.log("\n✓ Phase 1 Deployment Complete!");
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exitCode = 1;
  }
});
