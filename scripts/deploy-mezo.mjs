import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const MEZO_ADDRESSES = {
    MUSD:               "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
    BorrowerOperations: "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
    TroveManager:       "0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0",
    PriceFeed:          "0x86bCF0841622a5dAC14A313a15f96A95421b9366",
    SortedTroves:       "0x722E4D24FD6Ff8b0AC679450F3D91294607268fA",
    HintHelpers:        "0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6",
    StabilityPool:      "0x1CCA7E410eE41739792eA0A24e00349Dd247680e",
  };

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log("\n╔═════════════════════════════════════════════════════════╗");
  console.log("║  SatoshiVentures — Mezo Integration Deployment          ║");
  console.log("╚═════════════════════════════════════════════════════════╝");
  console.log(`Network chainId : ${chainId}`);
  console.log(`Deployer        : ${deployer.address}`);
  console.log(`Balance         : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BTC`);

  // Deploy MezoBorrowConnector
  console.log("\n[1/2] Deploying MezoBorrowConnector…");
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
  const connectorAddr = await connector.getAddress();
  console.log(`✓ MezoBorrowConnector: ${connectorAddr}`);

  // Try reading BTC price
  try {
    const price = await connector.getBtcPrice();
    console.log(`· Live BTC price: ${price.toString()}`);
  } catch (e) {
    console.log(`⚠ getBtcPrice failed: ${e.message}`);
  }

  // Deploy CollateralTracker
  console.log("\n[2/2] Deploying CollateralTracker…");
  const TrackerF = await ethers.getContractFactory("CollateralTracker");
  const tracker = await TrackerF.deploy(connectorAddr, MEZO_ADDRESSES.MUSD);
  await tracker.waitForDeployment();
  const trackerAddr = await tracker.getAddress();
  console.log(`✓ CollateralTracker: ${trackerAddr}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Deployed Addresses:");
  console.log(`MEZO_BORROW_CONNECTOR=${connectorAddr}`);
  console.log(`MEZO_COLLATERAL_TRACKER=${trackerAddr}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(e => { console.error(e); process.exit(1); });
