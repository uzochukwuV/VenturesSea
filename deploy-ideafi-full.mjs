import { ethers } from "ethers";
import fs from 'fs';

const PRIVATE_KEY = '0x527c51adb6501c36c48098293425ffe0e2bae80b4344e22d6813e8247d1700f2';
const RPC_URL = 'https://rpc.test.mezo.org';
const MUSD = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'BTC\n');

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

  // 1. ProtocolTreasury
  console.log('[1/10] ProtocolTreasury...');
  let Factory = new ethers.ContractFactory(artifacts.ProtocolTreasury.abi, artifacts.ProtocolTreasury.bytecode, wallet);
  let contract = await Factory.deploy([wallet.address], 1);
  await contract.waitForDeployment();
  deployment.ProtocolTreasury = await contract.getAddress();
  console.log('  ->', deployment.ProtocolTreasury);

  // 2. ProtocolMarket
  console.log('[2/10] ProtocolMarket...');
  Factory = new ethers.ContractFactory(artifacts.ProtocolMarket.abi, artifacts.ProtocolMarket.bytecode, wallet);
  contract = await Factory.deploy(deployment.ProtocolTreasury, MUSD);
  await contract.waitForDeployment();
  deployment.ProtocolMarket = await contract.getAddress();
  console.log('  ->', deployment.ProtocolMarket);

  // 3. IdeaRegistry
  console.log('[3/10] IdeaRegistry...');
  Factory = new ethers.ContractFactory(artifacts.IdeaRegistry.abi, artifacts.IdeaRegistry.bytecode, wallet);
  contract = await Factory.deploy();
  await contract.waitForDeployment();
  deployment.IdeaRegistry = await contract.getAddress();
  console.log('  ->', deployment.IdeaRegistry);

  // 4-9. Implementation contracts
  const impls = ['IdeaDAO', 'FundingPool', 'IdeaToken', 'BuilderAgreement', 'Milestone', 'RevenueReport'];
  for (let i = 0; i < impls.length; i++) {
    const name = impls[i];
    console.log(`[${4+i}/10] ${name}...`);
    Factory = new ethers.ContractFactory(artifacts[name].abi, artifacts[name].bytecode, wallet);
    contract = await Factory.deploy();
    await contract.waitForDeployment();
    deployment[name] = await contract.getAddress();
    console.log('  ->', deployment[name]);
  }

  // 10. IdeaFactory
  console.log('[10/10] IdeaFactory...');
  Factory = new ethers.ContractFactory(artifacts.IdeaFactory.abi, artifacts.IdeaFactory.bytecode, wallet);
  contract = await Factory.deploy(
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
  await contract.waitForDeployment();
  deployment.IdeaFactory = await contract.getAddress();
  console.log('  ->', deployment.IdeaFactory);

  // Set factory in registry
  console.log('\nSetting IdeaFactory in IdeaRegistry...');
  const registry = new ethers.Contract(deployment.IdeaRegistry, artifacts.IdeaRegistry.abi, wallet);
  await registry.setFactory(deployment.IdeaFactory);
  console.log('Done!');

  // Save
  console.log('\n' + '='.repeat(60));
  console.log('IDEAFI DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  for (const [name, addr] of Object.entries(deployment)) {
    console.log(name + ': ' + addr);
  }
  console.log('='.repeat(60));

  fs.writeFileSync('./deployed-ideafi.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    network: 'mezoTestnet',
    chainId: 31611,
    deployer: wallet.address,
    contracts: deployment
  }, null, 2));
  console.log('\nSaved to deployed-ideafi.json');
}

main().catch(console.error);
