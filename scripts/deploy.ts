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

// SatoshiVentures Mezo deployment task
task("deploy-satoshi-mezo", "Deploy SatoshiVentures contracts to Mezo testnet")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    const chainId = (await ethers.provider.getNetwork()).chainId;

    console.log("SatoshiVentures Deployment on Mezo");
    console.log("Network: " + chainId);
    console.log("Deployer: " + deployer.address);
    console.log("Balance: " + ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    const MEZO_ADDRESSES = {
      MUSD:               "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
      BorrowerOperations: "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
      TroveManager:       "0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0",
      PriceFeed:          "0x86bCF0841622a5dAC14A313a15f96A95421b9366",
      SortedTroves:       "0x722E4D24FD6Ff8b0AC679450F3D91294607268fA",
      HintHelpers:        "0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6",
      StabilityPool:      "0x1CCA7E410eE41739792eA0A24e00349Dd247680e",
    };

    let connectorAddr = taskArgs.connector;
    if (!connectorAddr) {
      console.log("Deploying MezoBorrowConnector...");
      const ConnectorF = await ethers.getContractFactory("MezoBorrowConnector");
      const connector = await ConnectorF.deploy(
        MEZO_ADDRESSES.BorrowerOperations,
        MEZO_ADDRESSES.TroveManager,
        MEZO_ADDRESSES.PriceFeed,
        MEZO_ADDRESSES.SortedTroves,
        MEZO_ADDRESSES.HintHelpers,
        MEZO_ADDRESSES.MUSD,
      );
      await connector.waitForDeployment();
      connectorAddr = await connector.getAddress();
      console.log("MezoBorrowConnector: " + connectorAddr);
    }

    let trackerAddr = taskArgs.tracker;
    if (!trackerAddr) {
      console.log("Deploying CollateralTracker...");
      const TrackerF = await ethers.getContractFactory("CollateralTracker");
      const tracker = await TrackerF.deploy(connectorAddr, MEZO_ADDRESSES.MUSD);
      await tracker.waitForDeployment();
      trackerAddr = await tracker.getAddress();
      console.log("CollateralTracker: " + trackerAddr);
    }

    console.log("Deployed Addresses:");
    console.log("MEZO_BORROW_CONNECTOR=" + connectorAddr);
    console.log("MEZO_COLLATERAL_TRACKER=" + trackerAddr);
    console.log("MUSD=" + MEZO_ADDRESSES.MUSD);
  });
