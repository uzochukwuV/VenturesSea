import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { ethers } from "ethers";

describe("hre ethers check", { concurrency: false }, () => {
  let provider: any;
  let signer: any;
  before(async () => {
    console.log("  hre.ethers:", typeof hre.ethers);
    console.log("  hre.ethers?.provider:", typeof hre.ethers?.provider);
    console.log("  hre.ethers?.getSigners:", typeof hre.ethers?.getSigners);
    
    // Try hre.ethers directly
    if (hre.ethers?.provider) {
      provider = hre.ethers.provider;
      signer = await provider.getSigner?.();
      console.log("  hre.ethers.provider signer:", typeof signer, signer?.address);
    }
    
    // Also check hre.network.provider
    console.log("  hre.network?.provider:", typeof (hre as any).network?.provider);
    const np = (hre as any).network?.provider;
    if (np) {
      try {
        const chainId = await np.send?.("eth_chainId");
        console.log("  hre.network.provider chainId:", chainId);
      } catch(e: any) {
        console.log("  hre.network.provider send error:", e.message);
      }
    }
  });
  it("hre ethers is available", () => {
    assert.ok(hre.ethers, "hre.ethers exists");
  });
  it("signer via hre.ethers", () => {
    console.log("  signer:", signer?.address ?? "none");
    assert.ok(signer?.address, "signer address available");
  });
});
