import { task } from "hardhat/config";

task("test-deploy", "Test deployment task")
  .setAction(async (_, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    console.log("Deployer: " + deployer.address);
    console.log("Balance: " + ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  });
