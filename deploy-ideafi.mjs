import { ethers } from "ethers";
import fs from 'fs';

const PRIVATE_KEY = process.env.MEZO_TESTNET_KEY;
const RPC_URL = "https://rpc.test.mezo.org";

const MUSD = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Deployer: " + wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance: " + ethers.formatEther(balance) + " BTC\n");

  // Load all artifacts
  const artifacts = {
    ProtocolTreasury: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/ProtocolTreasury.sol/ProtocolTreasury.json', 'utf8')),
    ProtocolMarket: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/ProtocolMarket.sol/ProtocolMarket.json', 'utf8')),
    IdeaRegistry: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaRegistry.sol/IdeaRegistry.json', 'utf8')),
    IdeaDAO: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaDAO.sol/IdeaDAO.json', 'utf8')),
    FundingPool: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/FundingPool.sol/FundingPool.json', 'utf8')),
    IdeaToken: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaToken.sol/IdeaToken.json', 'utf8')),
    BuilderAgreement: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/BuilderAgreement.sol/BuilderAgreement.json', 'utf8')),
    Milestone: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/Milestone.sol/Milestone.json', 'utf8')),
    RevenueReport: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/RevenueReport.sol/RevenueReport.json', 'utf8')),
    IdeaFactory: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaFactory.sol/IdeaFactory.json', 'utf8')),
  };

  const deployment = {};
  const signers = [wallet.address]; // Deployer as initial signer

  // 1. Deploy ProtocolTreasury
  console.log("[1/10] Deploying ProtocolTreasury...");
  const ProtocolTreasury = new ethers.ContractFactory(
    artifacts.ProtocolTreasury.abi, 
    artifacts.ProtocolTreasury.bytecode, 
    wallet
  );
  const treasury = await ProtocolTreasury.deploy(signers, 1);
  await treasury.waitForDeployment();
  deployment.ProtocolTreasury = await treasury.getAddress();
  console.log("ProtocolTreasury: " + deployment.ProtocolTreasury);

  // 2. Deploy ProtocolMarket
  console.log("[2/10] Deploying ProtocolMarket...");
  const ProtocolMarket = new ethers.ContractFactory(
    artifacts.ProtocolMarket.abi,
    artifacts.ProtocolMarket.bytecode,
    wallet
  );
  const market = await ProtocolMarket.deploy(deployment.ProtocolTreasury, MUSD);
  await market.waitForDeployment();
  deployment.ProtocolMarket = await market.getAddress();
  console.log("ProtocolMarket: " + deployment.ProtocolMarket);

  // 3. Deploy IdeaRegistry
  console.log("[3/10] Deploying IdeaRegistry...");
  const IdeaRegistry = new ethers.ContractFactory(
    artifacts.IdeaRegistry.abi,
    artifacts.IdeaRegistry.bytecode,
    wallet
  );
  const registry = await IdeaRegistry.deploy();
  await registry.waitForDeployment();
  deployment.IdeaRegistry = await registry.getAddress();
  console.log("IdeaRegistry: " + deployment.IdeaRegistry);

  // 4-9. Deploy Implementation Contracts (UUPS proxies)
  const implContracts = ['IdeaDAO', 'FundingPool', 'IdeaToken', 'BuilderAgreement', 'Milestone', 'RevenueReport'];
  for (let i = 0; i < implContracts.length; i++) {
    const name = implContracts[i];
    console.log(`[${4+i}/10] Deploying ${name}...`);
    const Factory = new ethers.ContractFactory(
      artifacts[name].abi,
      artifacts[name].bytecode,
      wallet
    );
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    deployment[name] = await contract.getAddress();
    console.log(`${name}: ` + deployment[name]);
  }

  // 10. Deploy IdeaFactory
  console.log("[10/10] Deploying IdeaFactory...");
  const IdeaFactory = new ethers.ContractFactory(
    artifacts.IdeaFactory.abi,
    artifacts.IdeaFactory.bytecode,
    wallet
  );
  const factory = await IdeaFactory.deploy(
    deployment.IdeaRegistry,
    deployment.ProtocolTreasury,
    deployment.ProtocolMarket,
    deployment.IdeaDAO,
    deployment.FundingPool,
    deployment.IdeaToken,
    deployment.BuilderAgreement,
    deployment.Milestone,
    deployment.RevenueReport
  );
  await factory.waitForDeployment();
  deployment.IdeaFactory = await factory.getAddress();
  console.log("IdeaFactory: " + deployment.IdeaFactory);

  // Set factory in registry
  console.log("\nSetting IdeaFactory in IdeaRegistry...");
  const registryContract = new ethers.Contract(
    deployment.IdeaRegistry,
    artifacts.IdeaRegistry.abi,
    wallet
  );
  const tx = await registryContract.setFactory(deployment.IdeaFactory);
  await tx.wait();
  console.log("Factory set successfully");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("IDEAFI DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("ProtocolTreasury: " + deployment.ProtocolTreasury);
  console.log("ProtocolMarket:  " + deployment.ProtocolMarket);
  console.log("IdeaRegistry:    " + deployment.IdeaRegistry);
  console.log("IdeaDAO:         " + deployment.IdeaDAO);
  console.log("FundingPool:     " + deployment.FundingPool);
  console.log("IdeaToken:       " + deployment.IdeaToken);
  console.log("BuilderAgreement:" + deployment.BuilderAgreement);
  console.log("Milestone:       " + deployment.Milestone);
  console.log("RevenueReport:   " + deployment.RevenueReport);
  console.log("IdeaFactory:     " + deployment.IdeaFactory);
  console.log("=".repeat(60));

  // Save deployment
  const fullDeployment = {
    timestamp: new Date().toISOString(),
    network: "mezoTestnet",
    chainId: 31611,
    deployer: wallet.address,
    contracts: deployment
  };
  fs.writeFileSync('./deployed-ideafi.json', JSON.stringify(fullDeployment, null, 2));
  console.log("\nSaved to deployed-ideafi.json");
}

main().catch(console.error);
