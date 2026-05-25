import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ethers";
import { configVariable, defineConfig } from "hardhat/config";
import "./scripts/test-deploy";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    version: "0.8.28",
    settings: { viaIR: true, optimizer: { enabled: true, runs: 200 } },
  },
  forking: {
    jsonRpcUrl: configVariable("MEZO_FORK_RPC") ?? "https://rpc.test.mezo.org",
    blockNumber: (() => {
      const envVal = process.env.MEZO_FORK_BLOCK;
      return envVal ? BigInt(envVal) : undefined;
    })(),
  },
  networks: {
    hardhatMainnet: { type: "edr-simulated", chainType: "l1" },
    hardhatOp: { type: "edr-simulated", chainType: "op" },
    sepolia: {
      type: "http", chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    mezoTestnet: {
      type: "http", chainId: 31611,
      url: "https://rpc.test.mezo.org",
      accounts: process.env.MEZO_TESTNET_KEY ? [process.env.MEZO_TESTNET_KEY] : [],
    },
  },
});
