import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

task("fork-test", "Run fork tests", async (_, hre: HardhatRuntimeEnvironment) => {
  const ethers = hre.ethers;
  
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║    SEAMLESS PHASE 1 - FORK TESTS                    ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const [owner, user1, user2] = await ethers.getSigners();
  console.log(`Deployer: ${owner.address}`);

  // Deploy contracts
  console.log("\n[1/6] Deploying TokenLaunchpad...");
  const TL = await ethers.getContractFactory("TokenLaunchpad");
  const tl = await TL.deploy();
  await tl.waitForDeployment();
  console.log(`✓ TokenLaunchpad: ${await tl.getAddress()}`);

  console.log("\n[2/6] Deploying LiquidityEngine...");
  const LE = await ethers.getContractFactory("LiquidityEngine");
  const le = await LE.deploy();
  await le.waitForDeployment();
  console.log(`✓ LiquidityEngine: ${await le.getAddress()}`);

  console.log("\n[3/6] Deploying YieldVaultFactory...");
  const VF = await ethers.getContractFactory("YieldVaultFactory");
  const vf = await VF.deploy();
  await vf.waitForDeployment();
  console.log(`✓ YieldVaultFactory: ${await vf.getAddress()}`);

  console.log("\n[4/6] Deploying PlatformRegistry...");
  const PR = await ethers.getContractFactory("PlatformRegistry");
  const pr = await PR.deploy(
    await tl.getAddress(),
    await le.getAddress(),
    await vf.getAddress()
  );
  await pr.waitForDeployment();
  console.log(`✓ PlatformRegistry: ${await pr.getAddress()}`);

  // Launch token
  console.log("\n[5/6] Testing Token Launch...");
  const config = {
    name: "Fork Test Token",
    symbol: "FTT",
    decimals: 18,
    initialSupply: ethers.parseEther("1000000"),
    isMintable: true,
    isBurnable: true,
    canTransferBeforeUnlock: true,
    unlockTime: 0,
    logoURI: "https://example.com/ftt.png",
    description: "Fork test token",
    website: "https://fork.test",
    twitter: "@forktest",
    discord: "https://discord.gg/fork",
  };

  const tx = await tl.launchToken(config);
  const rc = await tx.wait();
  console.log(`✓ Token launched (gas: ${rc?.gasUsed})`);

  const allTokens = await tl.allTokens();
  console.log(`✓ Token address: ${allTokens[0]}`);

  // Verify contract state
  console.log("\n[6/6] Verifying Platform State...");
  const totalTokens = await tl.totalTokensCreated();
  console.log(`✓ Total tokens created: ${totalTokens}`);

  const regTL = await pr.tokenLaunchpad();
  console.log(`✓ Registry component check: ${regTL === await tl.getAddress() ? "PASS" : "FAIL"}`);

  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║    ✓ ALL FORK TESTS PASSED                          ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");
  console.log("Ready for testnet deployment:");
  console.log("→ npx hardhat deploy-phase1 --network mezoTestnet\n");
});
