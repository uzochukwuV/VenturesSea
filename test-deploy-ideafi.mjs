import { ethers } from "ethers";
import fs from 'fs';

const PRIVATE_KEY = process.env.MEZO_TESTNET_KEY;
const RPC_URL = "https://rpc.test.mezo.org";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Testing deployment...");
  console.log("Deployer: " + wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance: " + ethers.formatEther(balance) + " BTC");

  // Load ProtocolTreasury artifact
  const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ideafi/ProtocolTreasury.sol/ProtocolTreasury.json', 'utf8'));
  console.log("ABI loaded, bytecode length: " + artifact.bytecode.length);
  
  // Try to deploy with explicit gas settings
  const Factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  try {
    console.log("Deploying ProtocolTreasury...");
    const signers = [wallet.address];
    const tx = await Factory.deploy(signers, 1, { gasLimit: 5000000 });
    console.log("TX sent: " + tx.hash);
    const receipt = await tx.wait();
    const address = await Factory.getAddress(tx);
    console.log("Deployed to: " + address);
    console.log("Gas used: " + receipt.gasUsed);
  } catch (e) {
    console.error("Deployment failed:", e.message);
    if (e.data) console.error("Error data:", e.data);
  }
}

main().catch(console.error);
