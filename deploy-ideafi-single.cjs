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

  // Load artifacts one at a time
  console.log('Deploying contracts one by one...\n');

  // 1. ProtocolTreasury
  console.log('[1] ProtocolTreasury...');
  const ptArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/ProtocolTreasury.sol/ProtocolTreasury.json'));
  const ptFactory = new ethers.ContractFactory(ptArtifact.abi, ptArtifact.bytecode, wallet);
  const pt = await ptFactory.deploy([wallet.address], 1);
  await pt.waitForDeployment();
  const ProtocolTreasury = await pt.getAddress();
  console.log('  ->', ProtocolTreasury);

  // 2. ProtocolMarket
  console.log('[2] ProtocolMarket...');
  const pmArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/ProtocolMarket.sol/ProtocolMarket.json'));
  const pmFactory = new ethers.ContractFactory(pmArtifact.abi, pmArtifact.bytecode, wallet);
  const pm = await pmFactory.deploy(ProtocolTreasury, MUSD);
  await pm.waitForDeployment();
  const ProtocolMarket = await pm.getAddress();
  console.log('  ->', ProtocolMarket);

  // 3. IdeaRegistry
  console.log('[3] IdeaRegistry...');
  const irArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaRegistry.sol/IdeaRegistry.json'));
  const irFactory = new ethers.ContractFactory(irArtifact.abi, irArtifact.bytecode, wallet);
  const ir = await irFactory.deploy();
  await ir.waitForDeployment();
  const IdeaRegistry = await ir.getAddress();
  console.log('  ->', IdeaRegistry);

  // 4. IdeaDAO (proxy pattern - zero init)
  console.log('[4] IdeaDAO...');
  const daoArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaDAO.sol/IdeaDAO.json'));
  const daoFactory = new ethers.ContractFactory(daoArtifact.abi, daoArtifact.bytecode, wallet);
  const dao = await daoFactory.deploy(0, ZERO_ADDR, ZERO_ADDR);
  await dao.waitForDeployment();
  const IdeaDAO = await dao.getAddress();
  console.log('  ->', IdeaDAO);

  // 5. FundingPool
  console.log('[5] FundingPool...');
  const fpArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/FundingPool.sol/FundingPool.json'));
  const fpFactory = new ethers.ContractFactory(fpArtifact.abi, fpArtifact.bytecode, wallet);
  const fp = await fpFactory.deploy(0, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR);
  await fp.waitForDeployment();
  const FundingPool = await fp.getAddress();
  console.log('  ->', FundingPool);

  // 6. IdeaToken
  console.log('[6] IdeaToken...');
  const itArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaToken.sol/IdeaToken.json'));
  const itFactory = new ethers.ContractFactory(itArtifact.abi, itArtifact.bytecode, wallet);
  const it = await itFactory.deploy('', '', ProtocolMarket);
  await it.waitForDeployment();
  const IdeaToken = await it.getAddress();
  console.log('  ->', IdeaToken);

  // 7. BuilderAgreement
  console.log('[7] BuilderAgreement...');
  const baArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/BuilderAgreement.sol/BuilderAgreement.json'));
  const baFactory = new ethers.ContractFactory(baArtifact.abi, baArtifact.bytecode, wallet);
  const ba = await baFactory.deploy(0, ZERO_ADDR, ZERO_ADDR);
  await ba.waitForDeployment();
  const BuilderAgreement = await ba.getAddress();
  console.log('  ->', BuilderAgreement);

  // 8. Milestone
  console.log('[8] Milestone...');
  const msArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/Milestone.sol/Milestone.json'));
  const msFactory = new ethers.ContractFactory(msArtifact.abi, msArtifact.bytecode, wallet);
  const ms = await msFactory.deploy(0, ZERO_ADDR, ZERO_ADDR);
  await ms.waitForDeployment();
  const Milestone = await ms.getAddress();
  console.log('  ->', Milestone);

  // 9. RevenueReport
  console.log('[9] RevenueReport...');
  const rrArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/RevenueReport.sol/RevenueReport.json'));
  const rrFactory = new ethers.ContractFactory(rrArtifact.abi, rrArtifact.bytecode, wallet);
  const rr = await rrFactory.deploy(0, ZERO_ADDR, ZERO_ADDR);
  await rr.waitForDeployment();
  const RevenueReport = await rr.getAddress();
  console.log('  ->', RevenueReport);

  // 10. IdeaFactory
  console.log('[10] IdeaFactory...');
  const ifArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/IdeaFactory.sol/IdeaFactory.json'));
  const ifFactory = new ethers.ContractFactory(ifArtifact.abi, ifArtifact.bytecode, wallet);
  const factory = await ifFactory.deploy(
    IdeaRegistry, ProtocolTreasury, ProtocolMarket,
    IdeaDAO, FundingPool, IdeaToken,
    BuilderAgreement, Milestone, RevenueReport
  );
  await factory.waitForDeployment();
  const IdeaFactory = await factory.getAddress();
  console.log('  ->', IdeaFactory);

  // Set factory in registry
  console.log('\nSetting IdeaFactory in IdeaRegistry...');
  const registry = new ethers.Contract(IdeaRegistry, irArtifact.abi, wallet);
  await registry.setFactory(IdeaFactory);
  console.log('Done!');

  // Save
  const deployment = {
    ProtocolTreasury, ProtocolMarket, IdeaRegistry,
    IdeaDAO, FundingPool, IdeaToken,
    BuilderAgreement, Milestone, RevenueReport, IdeaFactory
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('IDEAFI DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  for (const [name, addr] of Object.entries(deployment)) {
    console.log(name + ': ' + addr);
  }
  console.log('='.repeat(60));
  
  const result = {
    timestamp: new Date().toISOString(),
    network: 'mezoTestnet',
    chainId: 31611,
    deployer: wallet.address,
    contracts: deployment
  };
  
  fs.writeFileSync('./deployed-ideafi.json', JSON.stringify(result, null, 2));
  console.log('\nSaved to deployed-ideafi.json');
  
  process.exit(0);
}

deploy().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
