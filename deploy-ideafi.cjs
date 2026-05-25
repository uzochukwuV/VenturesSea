const { ethers } = require('ethers');
const fs = require('fs');

const PRIVATE_KEY = '0x527c51adb6501c36c48098293425ffe0e2bae80b4344e22d6813e8247d1700f2';
const RPC_URL = 'https://rpc.test.mezo.org';
const MUSD = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

async function deploy() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'BTC\n');

  const artifacts = {
    ProtocolTreasury: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/ProtocolTreasury.sol/ProtocolTreasury.json')),
    ProtocolMarket: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/ProtocolMarket.sol/ProtocolMarket.json')),
    IdeaRegistry: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaRegistry.sol/IdeaRegistry.json')),
    IdeaDAO: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaDAO.sol/IdeaDAO.json')),
    FundingPool: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/FundingPool.sol/FundingPool.json')),
    IdeaToken: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaToken.sol/IdeaToken.json')),
    BuilderAgreement: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/BuilderAgreement.sol/BuilderAgreement.json')),
    Milestone: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/Milestone.sol/Milestone.json')),
    RevenueReport: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/RevenueReport.sol/RevenueReport.json')),
    IdeaFactory: JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaFactory.sol/IdeaFactory.json')),
  };

  const deployment = {};

  async function deployContract(name, ...args) {
    console.log('Deploying', name + '...');
    const Factory = new ethers.ContractFactory(artifacts[name].abi, artifacts[name].bytecode, wallet);
    const contract = await Factory.deploy(...args);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log(' ', name + ':', addr);
    return addr;
  }

  // Deploy base contracts first
  deployment.ProtocolTreasury = await deployContract('ProtocolTreasury', [wallet.address], 1);
  deployment.ProtocolMarket = await deployContract('ProtocolMarket', deployment.ProtocolTreasury, MUSD);
  deployment.IdeaRegistry = await deployContract('IdeaRegistry');

  // Deploy implementation contracts with zero args for proxy pattern
  deployment.IdeaDAO = await deployContract('IdeaDAO', 0, ZERO_ADDR, ZERO_ADDR);
  deployment.FundingPool = await deployContract('FundingPool', 0, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR);
  deployment.IdeaToken = await deployContract('IdeaToken', '', '', deployment.ProtocolMarket);
  deployment.BuilderAgreement = await deployContract('BuilderAgreement', 0, ZERO_ADDR, ZERO_ADDR);
  deployment.Milestone = await deployContract('Milestone', 0, ZERO_ADDR, ZERO_ADDR);
  deployment.RevenueReport = await deployContract('RevenueReport', 0, ZERO_ADDR, ZERO_ADDR);
  
  // Deploy factory with implementation addresses
  deployment.IdeaFactory = await deployContract('IdeaFactory',
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

  // Set factory in registry
  console.log('\nSetting IdeaFactory in IdeaRegistry...');
  const registry = new ethers.Contract(deployment.IdeaRegistry, artifacts.IdeaRegistry.abi, wallet);
  await registry.setFactory(deployment.IdeaFactory);
  console.log('Done!');

  // Save
  const result = {
    timestamp: new Date().toISOString(),
    network: 'mezoTestnet',
    chainId: 31611,
    deployer: wallet.address,
    contracts: deployment
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('IDEAFI DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  for (const [name, addr] of Object.entries(deployment)) {
    console.log(name + ': ' + addr);
  }
  console.log('='.repeat(60));
  
  fs.writeFileSync('./deployed-ideafi.json', JSON.stringify(result, null, 2));
  console.log('\nSaved to deployed-ideafi.json');
  
  process.exit(0);
}

deploy().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
