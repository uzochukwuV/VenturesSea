import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { ethers } from "ethers";

describe("hre deeper check", { concurrency: false }, () => {
  before(async () => {
    // Try direct access - not optional chaining
    try {
      const p = hre.ethers.provider;
      console.log("  hre.ethers.provider (direct):", p ? "defined" : "undefined");
    } catch(e: any) {
      console.log("  hre.ethers.provider error:", e.message);
    }
    
    // Check what keys exist on hre
    console.log("  hre keys:", Object.keys(hre).join(", "));
    
    // Check hre.default 
    console.log("  hre.default:", hre.default ? "defined" : "undefined");
    if (hre.default) {
      console.log("  hre.default.ethers:", (hre.default as any).ethers ? "defined" : "undefined");
      console.log("  hre.default.network:", (hre.default as any).network ? "defined" : "undefined");
      const np = (hre.default as any).network?.provider;
      if (np) {
        try { const r = await np.send?.("eth_chainId"); console.log("  chainId:", r); } 
        catch(e: any) { console.log("  chainId err:", e.message); }
      }
    }
    
    // Check if ethers v6 has a static Provider that can be used without new
    console.log("  ethers.Provider:", typeof ethers.Provider);
    console.log("  ethers.JsonRpcProvider:", typeof ethers.JsonRpcProvider);
  });
  it("deep check", () => {
    console.log("  DONE");
    assert.ok(true);
  });
});
