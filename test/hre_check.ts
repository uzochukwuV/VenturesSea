import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

describe("hre check", { concurrency: false }, () => {
  let val: string;
  before(async () => {
    val = typeof hre + " / network=" + typeof hre.network + " / provider=" + typeof (hre as any).network?.provider;
    console.log("HRE check:", val);
  });
  it("hre inside test fn", () => {
    console.log("  in it: " + val);
    assert.ok(hre.network, "network is available inside test fn");
  });
});
