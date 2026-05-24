/**
 * IdeaFi — Full Lifecycle Simulation
 *
 * Runner : node:test (Hardhat v3 native)
 * Network: local hardhat node on :8545 (run: npx hardhat node)
 *
 * Steps covered:
 *  1.  Deploy + wire all contracts
 *  2.  Investors fund → IdeaTokens minted 1:1 net of 2% fee
 *  3.  Direct wallet transfer blocked (whitelist)
 *  4.  DAO governance: SELECT_BUILDER proposal → vote → queue → execute
 *  5.  Pool locked via DAO proposal
 *  6.  DAO creates milestone → sets criteria
 *  7.  Builder submits MVP
 *  8.  DAO approves milestone → builder paid net, treasury gets 2%
 *  9.  Builder submits revenue report; LPs acknowledge
 * 10.  P2P trade via ProtocolMarket
 * 11.  Emergency path (idea #2): nullify → refund → investor claims
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ─── helpers ─────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");

function artifact(contractPath: string) {
  return JSON.parse(readFileSync(join(ROOT, "artifacts/contracts", contractPath), "utf8"));
}

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

async function getSigner(index: number): Promise<ethers.JsonRpcSigner> {
  const accounts = await provider.listAccounts();
  return provider.getSigner(accounts[index].address);
}

async function deploy(
  signer: ethers.Signer,
  art: { abi: any; bytecode: string },
  args: unknown[] = []
): Promise<ethers.Contract> {
  const factory  = new ethers.ContractFactory(art.abi, art.bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

async function mineBlock() {
  await provider.send("evm_mine", []);
}

async function increaseTime(seconds: number) {
  await provider.send("evm_increaseTime", [seconds]);
  await mineBlock();
}

/** Wrap ethers error so assert.rejects(fn, /pattern/) works on .message */
async function expectRevert(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
    assert.fail(`Expected revert matching ${pattern} but call succeeded`);
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    assert.match(msg, pattern);
  }
}

const E18     = 10n ** 18n;
const DAY     = 86_400;
const FEE_BPS = 200n;

function netOf(gross: bigint) {
  return gross - (gross * FEE_BPS) / 10_000n;
}

// ─── Artifacts ───────────────────────────────────────────────────────────────

const A = {
  MockMUSD:         artifact("ideafi/mocks/MockMUSD.sol/MockMUSD.json"),
  MockRegistry:     artifact("ideafi/mocks/MockRegistry.sol/MockRegistry.json"),
  IdeaToken:        artifact("ideafi/IdeaToken.sol/IdeaToken.json"),
  FundingPool:      artifact("ideafi/FundingPool.sol/FundingPool.json"),
  IdeaDAO:          artifact("ideafi/IdeaDAO.sol/IdeaDAO.json"),
  BuilderAgreement: artifact("ideafi/BuilderAgreement.sol/BuilderAgreement.json"),
  Milestone:        artifact("ideafi/Milestone.sol/Milestone.json"),
  RevenueReport:    artifact("ideafi/RevenueReport.sol/RevenueReport.json"),
  ProtocolMarket:   artifact("ideafi/ProtocolMarket.sol/ProtocolMarket.json"),
  ProtocolTreasury: artifact("ideafi/ProtocolTreasury.sol/ProtocolTreasury.json"),
};

// ProposalType enum (matches IdeaDAO.sol)
const PT = {
  SELECT_BUILDER:       0n,
  APPROVE_MVP:          1n,
  APPROVE_MILESTONE:    2n,
  SET_MILESTONE_CRITERIA: 3n,
  NULLIFY_IDEA:         4n,
  FORK_IDEA:            5n,
  RELEASE_FUNDS:        6n,
  SET_REVENUE_TERMS:    7n,
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("IdeaFi — Full Lifecycle Simulation", { concurrency: false }, async () => {

  // contracts (idea #1)
  let musd:             ethers.Contract;
  let registry:         ethers.Contract;
  let ideaToken:        ethers.Contract;
  let fundingPool:      ethers.Contract;
  let ideaDAO:          ethers.Contract;
  let builderAgreement: ethers.Contract;
  let milestone:        ethers.Contract;
  let revenueReport:    ethers.Contract;
  let protocolMarket:   ethers.Contract;
  let protocolTreasury: ethers.Contract;

  // actors
  let deployer:    ethers.JsonRpcSigner;
  let investor1:   ethers.JsonRpcSigner;
  let investor2:   ethers.JsonRpcSigner;
  let investor3:   ethers.JsonRpcSigner;
  let builder1:    ethers.JsonRpcSigner;
  let treasuryKey: ethers.JsonRpcSigner;
  let buyer:       ethers.JsonRpcSigner;

  // DAO proposal state
  let selectProposalId: bigint;
  let proposalCounter   = 0n; // track manually since each test run may accumulate

  const IDEA_ID             = 1n;
  const SOFT_CAP            = 1_000n * E18;
  const HARD_CAP            = 10_000n * E18;
  const BUILDER_ALLOC_PCT   = 20n;
  const BUILDER_MUSD_PAYOUT = 200n * E18;

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  before(async () => {
    [deployer, investor1, investor2, investor3, builder1, treasuryKey, buyer] =
      await Promise.all([0,1,2,3,4,5,6].map(getSigner));

    const block    = await provider.getBlock("latest");
    const deadline = BigInt((block?.timestamp ?? 0) + DAY * 30);

    // 1. Infra
    musd     = await deploy(deployer, A.MockMUSD);
    registry = await deploy(deployer, A.MockRegistry);

    protocolTreasury = await deploy(deployer, A.ProtocolTreasury, [
      [await treasuryKey.getAddress()], 1n,
    ]);

    protocolMarket = await deploy(deployer, A.ProtocolMarket, [
      await protocolTreasury.getAddress(),
      await musd.getAddress(),
    ]);

    // 2. IdeaToken FIRST (4-arg constructor with owner), then FundingPool, then wire
    // Deploy with deployer as initial owner, then transfer to IdeaDAO
    ideaToken = await deploy(deployer, A.IdeaToken, [
      "IdeaFi Idea #1", "IDEA1",
      await protocolMarket.getAddress(),
      await deployer.getAddress(), // initial owner for deployment
    ]);

    fundingPool = await deploy(deployer, A.FundingPool, [
      IDEA_ID,
      await musd.getAddress(),
      await ideaToken.getAddress(),
      await protocolTreasury.getAddress(),
      await registry.getAddress(),
      SOFT_CAP,
      HARD_CAP,
      deadline,
      BUILDER_ALLOC_PCT,
    ]);

    // 3. Wire IdeaToken → FundingPool (one-time), then DAO + support contracts
    await (ideaToken.connect(deployer) as ethers.Contract).initFundingPool(
      await fundingPool.getAddress()
    );

    ideaDAO = await deploy(deployer, A.IdeaDAO, [
      IDEA_ID,
      await registry.getAddress(),
      await ideaToken.getAddress(),
    ]);

    builderAgreement = await deploy(deployer, A.BuilderAgreement, [
      IDEA_ID,
      await registry.getAddress(),
      await fundingPool.getAddress(),
      await protocolTreasury.getAddress(),
    ]);

    milestone = await deploy(deployer, A.Milestone, [
      IDEA_ID,
      await registry.getAddress(),
      await fundingPool.getAddress(),
    ]);

    revenueReport = await deploy(deployer, A.RevenueReport, [
      IDEA_ID,
      await registry.getAddress(),
      await fundingPool.getAddress(),
    ]);

    // 4. Transfer IdeaToken ownership → IdeaDAO
    await (ideaToken.connect(deployer) as ethers.Contract).transferOwnership(
      await ideaDAO.getAddress()
    );

    // 5. Wire MockRegistry (must happen before any onlyDAO call)
    await (registry.connect(deployer) as ethers.Contract).setIdeaAddresses(
      IDEA_ID,
      await ideaDAO.getAddress(),
      await fundingPool.getAddress(),
      await builderAgreement.getAddress(),
      await milestone.getAddress(),
      await revenueReport.getAddress(),
      await ideaToken.getAddress(),
    );

    // 6. Fund investors with MUSD
    for (const inv of [investor1, investor2, investor3, buyer]) {
      await (musd.connect(deployer) as ethers.Contract).mint(
        await inv.getAddress(), 5_000n * E18
      );
    }
  });

  // ─── Helper: full DAO proposal lifecycle ────────────────────────────────────

  async function daoPropose(
    proposer: ethers.Signer,
    pType: bigint,
    desc: string,
    target: ethers.Contract,
    callData: string,
    voters: ethers.Signer[] = [investor1, investor2, investor3]
  ): Promise<bigint> {
    const tx = await (ideaDAO.connect(proposer) as ethers.Contract).createProposal(
      pType,
      ethers.keccak256(ethers.toUtf8Bytes(desc)),
      await target.getAddress(),
      callData,
      BigInt(DAY * 2)
    );
    const receipt = await tx.wait();

    const iface = new ethers.Interface(A.IdeaDAO.abi);
    const ev    = receipt.logs
      .map((l: any) => { try { return iface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "ProposalCreated");
    const pid: bigint = ev!.args.proposalId;

    for (const v of voters) {
      await (ideaDAO.connect(v) as ethers.Contract).castVote(pid, true);
    }

    await increaseTime(DAY * 3); // past voting deadline
    await (ideaDAO.connect(proposer) as ethers.Contract).queueProposal(pid);
    await increaseTime(DAY * 3); // past 48h timelock
    await (ideaDAO.connect(proposer) as ethers.Contract).executeProposal(pid);

    return pid;
  }

  // ─── Step 2: Investors fund ─────────────────────────────────────────────────

  describe("Step 2 — Investors fund → IdeaTokens minted", { concurrency: false }, async () => {

    it("investor1 deposits 500 MUSD → receives net IdeaTokens", async () => {
      const gross = 500n * E18;
      await (musd.connect(investor1) as ethers.Contract).approve(
        await fundingPool.getAddress(), gross
      );
      await (fundingPool.connect(investor1) as ethers.Contract).deposit(gross);

      const net = netOf(gross);
      assert.equal(
        await ideaToken.balanceOf(await investor1.getAddress()), net,
        "token balance"
      );
      assert.equal(
        await fundingPool.deposits(await investor1.getAddress()), net,
        "deposit record"
      );
    });

    it("investor2 deposits 600 MUSD", async () => {
      const gross = 600n * E18;
      await (musd.connect(investor2) as ethers.Contract).approve(
        await fundingPool.getAddress(), gross
      );
      await (fundingPool.connect(investor2) as ethers.Contract).deposit(gross);
      assert.equal(
        await ideaToken.balanceOf(await investor2.getAddress()), netOf(gross)
      );
    });

    it("investor3 deposits 400 MUSD", async () => {
      const gross = 400n * E18;
      await (musd.connect(investor3) as ethers.Contract).approve(
        await fundingPool.getAddress(), gross
      );
      await (fundingPool.connect(investor3) as ethers.Contract).deposit(gross);
      assert.equal(
        await ideaToken.balanceOf(await investor3.getAddress()), netOf(gross)
      );
    });

    it("totalDeposited >= softCap", async () => {
      const total = await fundingPool.totalDeposited();
      assert.ok(total >= SOFT_CAP, `total ${total} < softCap ${SOFT_CAP}`);
    });

    it("treasury received 2% fee from all deposits", async () => {
      const grossTotal  = (500n + 600n + 400n) * E18;
      const expectedFee = (grossTotal * FEE_BPS) / 10_000n;
      assert.equal(
        await musd.balanceOf(await protocolTreasury.getAddress()),
        expectedFee,
        "treasury fee"
      );
    });

    it("direct wallet-to-wallet IdeaToken transfer is blocked", async () => {
      await expectRevert(
        async () => (ideaToken.connect(investor1) as ethers.Contract).transfer(
          await investor2.getAddress(), 1n
        ),
        /transfer not whitelisted/
      );
    });
  });

  // ─── Steps 3-4: DAO selects builder ─────────────────────────────────────────

  describe("Steps 3-4 — DAO selects builder via governance", { concurrency: false }, async () => {

    it("full SELECT_BUILDER proposal lifecycle → BuilderAgreement ACTIVE", async () => {
      const agreementHash = ethers.keccak256(ethers.toUtf8Bytes("builder1-terms-v1"));
      const iface         = new ethers.Interface(A.IdeaDAO.abi);
      const callData      = iface.encodeFunctionData("selectBuilder", [
        await builder1.getAddress(),
        BUILDER_MUSD_PAYOUT,
        15n,           // tokenSharePct
        agreementHash,
        500n,          // stakeBps
      ]);

      selectProposalId = await daoPropose(
        investor1, PT.SELECT_BUILDER, "Select builder1", ideaDAO, callData
      );

      // AgreementStatus.ACTIVE = 3
      assert.equal(
        await builderAgreement.getAgreementStatus(), 3n, "agreement not ACTIVE"
      );
      assert.equal(
        (await builderAgreement.getBuilder()).toLowerCase(),
        (await builder1.getAddress()).toLowerCase(),
        "wrong builder"
      );
    });
  });

  // ─── Step 5: Pool locked ─────────────────────────────────────────────────────

  describe("Step 5 — DAO locks funding pool", { concurrency: false }, async () => {

    it("lockPool proposal executes → pool is locked", async () => {
      const iface    = new ethers.Interface(A.IdeaDAO.abi);
      const callData = iface.encodeFunctionData("lockPool", []);

      await daoPropose(investor1, PT.RELEASE_FUNDS, "Lock pool", ideaDAO, callData);

      assert.ok(await fundingPool.isLocked(), "pool should be locked");
    });

    it("deposit reverts when pool is locked", async () => {
      const gross = 100n * E18;
      await (musd.connect(investor1) as ethers.Contract).approve(
        await fundingPool.getAddress(), gross
      );
      await expectRevert(
        async () => (fundingPool.connect(investor1) as ethers.Contract).deposit(gross),
        /pool is locked/
      );
    });

    it("withdraw reverts when pool is locked", async () => {
      // investor1 has no balance anyway, but lock check comes first
      await expectRevert(
        async () => (fundingPool.connect(investor1) as ethers.Contract).withdraw(1n),
        /pool is locked/
      );
    });
  });

  // ─── Steps 6-8: MVP milestone lifecycle ──────────────────────────────────────

  describe("Steps 6-8 — MVP milestone: create → criteria → submit → approve → payout",
    { concurrency: false }, async () => {

    const MILESTONE_ID = 0n;

    it("DAO creates milestone (100% fundsPct)", async () => {
      const iface    = new ethers.Interface(A.Milestone.abi);
      const callData = iface.encodeFunctionData("createMilestone", [10_000n]);
      await daoPropose(investor1, PT.APPROVE_MILESTONE, "Create milestone", milestone, callData);
      assert.equal(await milestone.milestoneCount(), 1n);
    });

    it("DAO sets criteria → status OPEN (1)", async () => {
      const criteriaHash = ethers.keccak256(ethers.toUtf8Bytes("auth+dashboard+api"));
      const iface        = new ethers.Interface(A.Milestone.abi);
      const callData     = iface.encodeFunctionData("setCriteria", [MILESTONE_ID, criteriaHash]);
      await daoPropose(investor1, PT.SET_MILESTONE_CRITERIA, "Set criteria", milestone, callData);

      const m = await milestone.milestones(MILESTONE_ID);
      assert.equal(m.status, 1n, "expected OPEN");
    });

    it("builder1 submits MVP → status SUBMITTED (2)", async () => {
      const subHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://builder1-mvp-v1"));
      await (milestone.connect(builder1) as ethers.Contract).submit(MILESTONE_ID, subHash);
      const m = await milestone.milestones(MILESTONE_ID);
      assert.equal(m.status, 2n, "expected SUBMITTED");
    });

    it("DAO approves milestone → builder1 paid net, treasury gets 2%", async () => {
      const builderBefore  = await musd.balanceOf(await builder1.getAddress());
      const treasuryBefore = await musd.balanceOf(await protocolTreasury.getAddress());

      const iface    = new ethers.Interface(A.Milestone.abi);
      const callData = iface.encodeFunctionData("approveMilestone", [MILESTONE_ID]);
      await daoPropose(investor1, PT.APPROVE_MILESTONE, "Approve milestone", milestone, callData);

      const m = await milestone.milestones(MILESTONE_ID);
      assert.equal(m.status, 3n, "expected APPROVED");

      const fee = (BUILDER_MUSD_PAYOUT * FEE_BPS) / 10_000n;
      const net = BUILDER_MUSD_PAYOUT - fee;

      assert.equal(
        await musd.balanceOf(await builder1.getAddress()),
        builderBefore + net, "builder payout net"
      );
      assert.equal(
        await musd.balanceOf(await protocolTreasury.getAddress()),
        treasuryBefore + fee, "treasury 2% fee"
      );
    });
  });

  // ─── Step 9: Revenue report ───────────────────────────────────────────────────

  describe("Step 9 — Revenue report + LP acknowledgement", { concurrency: false }, async () => {

    it("builder1 submits a revenue report", async () => {
      const block = await provider.getBlock("latest");
      const now   = BigInt(block!.timestamp);
      const hash  = ethers.keccak256(ethers.toUtf8Bytes("ipfs://q1-revenue-report"));

      await (revenueReport.connect(builder1) as ethers.Contract).submitReport(
        now - BigInt(DAY * 30),
        now,
        hash,
        [await musd.getAddress()],
        [50n * E18]
      );
      assert.equal(await revenueReport.reportCount(), 1n);
    });

    it("investor1 acknowledges", async () => {
      await (revenueReport.connect(investor1) as ethers.Contract).acknowledgeDistribution(0n);
      const r = await revenueReport.reports(0n);
      assert.equal(r.acknowledgementCount, 1n);
    });

    it("investor2 acknowledges → majority reached", async () => {
      await (revenueReport.connect(investor2) as ethers.Contract).acknowledgeDistribution(0n);
      const r = await revenueReport.reports(0n);
      assert.ok(r.lpAcknowledged, "lpAcknowledged should be true");
    });

    it("double acknowledge reverts", async () => {
      await expectRevert(
        async () => (revenueReport.connect(investor1) as ethers.Contract).acknowledgeDistribution(0n),
        /already acknowledged/
      );
    });
  });

  // ─── Step 10: P2P trade ───────────────────────────────────────────────────────

  describe("Step 10 — P2P IdeaToken trade via ProtocolMarket", { concurrency: false }, async () => {

    const TRADE_TOKENS = 100n * E18;
    const ASK_PRICE    = 120n * E18;
    let offerId: bigint;

    it("investor1 creates sell offer → tokens escrowed", async () => {
      await (ideaToken.connect(investor1) as ethers.Contract).approve(
        await protocolMarket.getAddress(), TRADE_TOKENS
      );

      const block  = await provider.getBlock("latest");
      const expiry = BigInt((block?.timestamp ?? 0) + DAY * 7);

      const tx = await (protocolMarket.connect(investor1) as ethers.Contract).createOffer(
        IDEA_ID,
        await ideaToken.getAddress(),
        TRADE_TOKENS,
        ASK_PRICE,
        expiry
      );
      const receipt = await tx.wait();
      const iface   = new ethers.Interface(A.ProtocolMarket.abi);
      const ev      = receipt.logs
        .map((l: any) => { try { return iface.parseLog(l); } catch { return null; } })
        .find((e: any) => e?.name === "OfferCreated");
      offerId = ev!.args.offerId;

      const offer = await protocolMarket.offers(offerId);
      assert.ok(offer.active);
      assert.equal(offer.tokenAmount, TRADE_TOKENS);
      assert.equal(
        await ideaToken.balanceOf(await protocolMarket.getAddress()),
        TRADE_TOKENS, "tokens in escrow"
      );
    });

    it("buyer accepts offer → tokens to buyer, MUSD net to seller, 2% to treasury", async () => {
      const buyerTokensBefore  = await ideaToken.balanceOf(await buyer.getAddress());
      const sellerMUSDBefore   = await musd.balanceOf(await investor1.getAddress());
      const treasuryMUSDBefore = await musd.balanceOf(await protocolTreasury.getAddress());

      await (musd.connect(buyer) as ethers.Contract).approve(
        await protocolMarket.getAddress(), ASK_PRICE
      );
      await (protocolMarket.connect(buyer) as ethers.Contract).acceptOffer(offerId);

      const fee = (ASK_PRICE * FEE_BPS) / 10_000n;
      const net = ASK_PRICE - fee;

      assert.equal(
        await ideaToken.balanceOf(await buyer.getAddress()),
        buyerTokensBefore + TRADE_TOKENS, "buyer tokens"
      );
      assert.equal(
        await musd.balanceOf(await investor1.getAddress()),
        sellerMUSDBefore + net, "seller MUSD net"
      );
      assert.equal(
        await musd.balanceOf(await protocolTreasury.getAddress()),
        treasuryMUSDBefore + fee, "treasury fee"
      );

      const offer = await protocolMarket.offers(offerId);
      assert.ok(!offer.active, "offer should be inactive");
    });

    it("buyer cannot send tokens directly (whitelist)", async () => {
      await expectRevert(
        async () => (ideaToken.connect(buyer) as ethers.Contract).transfer(
          await investor3.getAddress(), 1n
        ),
        /transfer not whitelisted/
      );
    });

    it("escrow fully cleared after trade", async () => {
      assert.equal(
        await ideaToken.balanceOf(await protocolMarket.getAddress()), 0n
      );
    });
  });

  // ─── Step 11: Emergency path (idea #2) ──────────────────────────────────────

  describe("Step 11 — Emergency: DAO nullifies idea #2, investor claims refund",
    { concurrency: false }, async () => {

    let musd2:        ethers.Contract;
    let registry2:    ethers.Contract;
    let ideaToken2:   ethers.Contract;
    let fundingPool2: ethers.Contract;
    let ideaDAO2:     ethers.Contract;

    before(async () => {
      const block    = await provider.getBlock("latest");
      const deadline = BigInt((block?.timestamp ?? 0) + DAY * 30);
      const IDEA2    = 2n;

      musd2     = await deploy(deployer, A.MockMUSD);
      registry2 = await deploy(deployer, A.MockRegistry);

      // 4-arg constructor with owner
      ideaToken2 = await deploy(deployer, A.IdeaToken, [
        "IdeaFi Idea #2", "IDEA2",
        await protocolMarket.getAddress(),
        await deployer.getAddress(), // initial owner for deployment
      ]);

      fundingPool2 = await deploy(deployer, A.FundingPool, [
        IDEA2,
        await musd2.getAddress(),
        await ideaToken2.getAddress(),
        await protocolTreasury.getAddress(),
        await registry2.getAddress(),
        500n * E18, 5_000n * E18,
        deadline, 20n,
      ]);

      // Wire
      await (ideaToken2.connect(deployer) as ethers.Contract).initFundingPool(
        await fundingPool2.getAddress()
      );

      ideaDAO2 = await deploy(deployer, A.IdeaDAO, [
        IDEA2,
        await registry2.getAddress(),
        await ideaToken2.getAddress(),
      ]);

      // Stub the remaining contracts (only addresses needed for registry)
      const ba2 = await deploy(deployer, A.BuilderAgreement, [
        IDEA2, await registry2.getAddress(),
        await fundingPool2.getAddress(), await protocolTreasury.getAddress(),
      ]);
      const ms2 = await deploy(deployer, A.Milestone, [
        IDEA2, await registry2.getAddress(), await fundingPool2.getAddress(),
      ]);
      const rr2 = await deploy(deployer, A.RevenueReport, [
        IDEA2, await registry2.getAddress(), await fundingPool2.getAddress(),
      ]);

      await (ideaToken2.connect(deployer) as ethers.Contract).transferOwnership(
        await ideaDAO2.getAddress()
      );

      await (registry2.connect(deployer) as ethers.Contract).setIdeaAddresses(
        IDEA2,
        await ideaDAO2.getAddress(),
        await fundingPool2.getAddress(),
        await ba2.getAddress(),
        await ms2.getAddress(),
        await rr2.getAddress(),
        await ideaToken2.getAddress(),
      );

      // Fund investor3 with musd2
      await (musd2.connect(deployer) as ethers.Contract).mint(
        await investor3.getAddress(), 2_000n * E18
      );
    });

    it("investor3 deposits 1000 MUSD into idea #2", async () => {
      const gross = 1_000n * E18;
      await (musd2.connect(investor3) as ethers.Contract).approve(
        await fundingPool2.getAddress(), gross
      );
      await (fundingPool2.connect(investor3) as ethers.Contract).deposit(gross);
      assert.equal(
        await fundingPool2.deposits(await investor3.getAddress()), netOf(gross)
      );
    });

    it("DAO impersonation: lockPool then emergencyRefund", async () => {
      const dao2Addr = await ideaDAO2.getAddress();

      // Fund the impersonated address with ETH for gas
      await provider.send("hardhat_setBalance", [
        dao2Addr,
        "0x" + (1n * E18).toString(16),
      ]);
      await provider.send("hardhat_impersonateAccount", [dao2Addr]);

      // Use an unlocked signer directly — ethers v6 requires the node to have
      // the account unlocked, which hardhat_impersonateAccount achieves.
      const daoSigner = new ethers.JsonRpcSigner(provider, dao2Addr);

      await (fundingPool2.connect(daoSigner) as ethers.Contract).lockPool();
      await (fundingPool2.connect(daoSigner) as ethers.Contract).emergencyRefund();

      await provider.send("hardhat_stopImpersonatingAccount", [dao2Addr]);

      assert.ok(await fundingPool2.refundMode(), "refundMode should be true");
    });

    it("investor3 claims full refund", async () => {
      const deposited  = await fundingPool2.deposits(await investor3.getAddress());
      const musdBefore = await musd2.balanceOf(await investor3.getAddress());

      await (fundingPool2.connect(investor3) as ethers.Contract).claimRefund();

      assert.equal(
        await musd2.balanceOf(await investor3.getAddress()),
        musdBefore + deposited, "refund amount"
      );
      assert.equal(
        await fundingPool2.deposits(await investor3.getAddress()), 0n, "deposit cleared"
      );
    });
  });

  // ─── Final state ──────────────────────────────────────────────────────────────

  describe("Final state", { concurrency: false }, async () => {

    it("builder1 is the registered builder", async () => {
      assert.equal(
        (await builderAgreement.getBuilder()).toLowerCase(),
        (await builder1.getAddress()).toLowerCase()
      );
    });

    it("IdeaDAO owns IdeaToken", async () => {
      assert.equal(
        (await ideaToken.owner()).toLowerCase(),
        (await ideaDAO.getAddress()).toLowerCase()
      );
    });

    it("no IdeaTokens stranded in ProtocolMarket", async () => {
      assert.equal(
        await ideaToken.balanceOf(await protocolMarket.getAddress()), 0n
      );
    });
  });
});
