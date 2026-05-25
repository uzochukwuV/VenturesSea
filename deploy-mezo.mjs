import { ethers } from "ethers";

const PRIVATE_KEY = process.env.MEZO_TESTNET_KEY;
const RPC_URL = "https://rpc.test.mezo.org";

const MEZO_ADDRESSES = {
  MUSD:               "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
  BorrowerOperations: "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
  TroveManager:       "0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0",
  PriceFeed:          "0x86bCF0841622a5dAC14A313a15f96A95421b9366",
  SortedTroves:       "0x722E4D24FD6Ff8b0AC679450F3D91294607268fA",
  HintHelpers:        "0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6",
  StabilityPool:      "0x1CCA7E410eE41739792eA0A24e00349Dd247680e",
};

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Mezo Deployer: " + wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance: " + ethers.formatEther(balance) + " BTC");
  
  // Load ABI
  const connectorAbi = [
    "constructor(address,address,address,address,address,address)",
    "function getBtcPrice() view returns (uint256)",
    "function getTroveManager() view returns (address)",
    "function getMUSD() view returns (address)"
  ];
  
  // Get bytecode from artifacts
  const fs = await import('fs');
  const connectorArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/satoshi/MezoBorrowConnector.sol/MezoBorrowConnector.json', 'utf8'));
  const trackerArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/satoshi/CollateralTracker.sol/CollateralTracker.json', 'utf8'));
  
  console.log("\nDeploying MezoBorrowConnector...");
  const Connector = new ethers.ContractFactory(connectorArtifact.abi, connectorArtifact.bytecode, wallet);
  const connector = await Connector.deploy(
    MEZO_ADDRESSES.BorrowerOperations,
    MEZO_ADDRESSES.TroveManager,
    MEZO_ADDRESSES.PriceFeed,
    MEZO_ADDRESSES.SortedTroves,
    MEZO_ADDRESSES.HintHelpers,
    MEZO_ADDRESSES.MUSD
  );
  await connector.waitForDeployment();
  const connectorAddr = await connector.getAddress();
  console.log("MezoBorrowConnector: " + connectorAddr);
  
  // Try reading BTC price
  try {
    const price = await connector.getBtcPrice();
    console.log("BTC price (wei): " + price.toString());
  } catch (e) {
    console.log("getBtcPrice failed (may not exist in ABI)");
  }
  
  console.log("\nDeploying CollateralTracker...");
  const Tracker = new ethers.ContractFactory(trackerArtifact.abi, trackerArtifact.bytecode, wallet);
  const tracker = await Tracker.deploy(connectorAddr, MEZO_ADDRESSES.MUSD);
  await tracker.waitForDeployment();
  const trackerAddr = await tracker.getAddress();
  console.log("CollateralTracker: " + trackerAddr);
  
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("MEZO_BORROW_CONNECTOR=" + connectorAddr);
  console.log("MEZO_COLLATERAL_TRACKER=" + trackerAddr);
  console.log("MUSD=" + MEZO_ADDRESSES.MUSD);
  
  // Save to file
  const deployment = {
    timestamp: new Date().toISOString(),
    network: "mezoTestnet",
    chainId: 31611,
    deployer: wallet.address,
    contracts: {
      MezoBorrowConnector: connectorAddr,
      CollateralTracker: trackerAddr,
    },
    mezoAddresses: MEZO_ADDRESSES
  };
  fs.writeFileSync('./deployed-addresses.json', JSON.stringify(deployment, null, 2));
  console.log("\nSaved to deployed-addresses.json");
}

main().catch(console.error);
