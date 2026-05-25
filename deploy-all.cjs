const { ethers } = require('ethers');
const fs = require('fs');

const PK = '0x527c51adb6501c36c48098293425ffe0e2bae80b4344e22d6813e8247d1700f2';
const RPC = 'https://rpc.test.mezo.org';
const MUSD = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
const ZERO = '0x0000000000000000000000000000000000000000';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  console.log('\nDeployer:', wallet.address);
  console.log('Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'BTC\n');

  const deployed = {};
  const base = './artifacts/contracts/ideafi/';
  
  async function deploy(name, ...args) {
    console.log(`[${name}] Deploying...`);
    const artifact = JSON.parse(fs.readFileSync(base + name + '.sol/' + name + '.json'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const c = await factory.deploy(...args);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    console.log(`[${name}] -> ${addr}`);
    return addr;
  }

  // 1. ProtocolTreasury
  deployed.ProtocolTreasury = await deploy('ProtocolTreasury', [wallet.address], 1);
  
  // 2. ProtocolMarket
  deployed.ProtocolMarket = await deploy('ProtocolMarket', deployed.ProtocolTreasury, MUSD);
  
  // 3. IdeaRegistry
  deployed.IdeaRegistry = await deploy('IdeaRegistry');
  
  // 4-9. Implementation contracts (proxy pattern)
  // IdeaDAO: (ideaId, registry, ideaToken)
  deployed.IdeaDAO = await deploy('IdeaDAO', 0, ZERO, ZERO);
  // FundingPool: (ideaId, musd, ideaToken, protocolTreasury, registry, softCap, hardCap, deadline, builderAllocPct)
  deployed.FundingPool = await deploy('FundingPool', 0, ZERO, ZERO, ZERO, ZERO, 0, 0, 0, 0);
  // IdeaToken: (name, symbol, protocolMarket, owner)
  deployed.IdeaToken = await deploy('IdeaToken', '', '', ZERO, ZERO);
  // BuilderAgreement: (ideaId, registry, fundingPool, protocolTreasury)
  deployed.BuilderAgreement = await deploy('BuilderAgreement', 0, ZERO, ZERO, ZERO);
  // Milestone: (ideaId, registry, fundingPool)
  deployed.Milestone = await deploy('Milestone', 0, ZERO, ZERO);
  // RevenueReport: (ideaId, registry, fundingPool)
  deployed.RevenueReport = await deploy('RevenueReport', 0, ZERO, ZERO);
  
  // 10. IdeaFactory
  deployed.IdeaFactory = await deploy('IdeaFactory',
    deployed.IdeaRegistry, deployed.ProtocolTreasury, deployed.ProtocolMarket,
    deployed.IdeaDAO, deployed.FundingPool, deployed.IdeaToken,
    deployed.BuilderAgreement, deployed.Milestone, deployed.RevenueReport
  );

  // Set factory in registry
  console.log('\n[Setup] Setting IdeaFactory in IdeaRegistry...');
  const irArtifact = JSON.parse(fs.readFileSync(base + 'IdeaRegistry.sol/IdeaRegistry.json'));
  const registry = new ethers.Contract(deployed.IdeaRegistry, irArtifact.abi, wallet);
  await registry.setFactory(deployed.IdeaFactory);
  console.log('[Setup] Done!');

  // Summary
  console.log('\n' + '='.repeat(64));
  console.log('IDEAFI DEPLOYMENT COMPLETE');
  console.log('='.repeat(64));
  Object.entries(deployed).forEach(([k, v]) => console.log(`${k.padEnd(20)} ${v}`));
  console.log('='.repeat(64));

  // Save
  const result = {
    timestamp: new Date().toISOString(),
    network: 'mezoTestnet',
    chainId: 31611,
    deployer: wallet.address,
    contracts: deployed
  };
  fs.writeFileSync('./deployed-ideafi.json', JSON.stringify(result, null, 2));
  console.log('\nSaved to deployed-ideafi.json');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
