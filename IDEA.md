Build me Onchain venture creation protocol, Flow-- 1. Idea Created
2. Investors Fund  → IdeaTokens minted as shares (buys shares , can only auction shares p2p and not sell)
3. Builders Apply
4. DAO selects Top N builders (e.g. 3–4)

5. Pool is split:
   - builderAllocation (locked)
   - investorPool

6. Builders build MVPs in parallel

7. Builders submit MVPs

8. DAO votes:
   - ranks submissions (1st, 2nd, 3rd)

9. Funds distributed:
   - payouts based on ranking
   - winner continues as main builder
10. Winner goes into milestone base funding  
12. Product goes live
13. Revenue flows → distributed
Product Operates
  Revenue → RevenueDistributor
  Token holders claim proportional revenue
        ↓
  If REJECTED (pre-lock): DAO votes → full refund
  If REJECTED (post-lock): Idea Fork or DisputeLet me think through this properly first, then build the spec.

Your core insight is solid — **idea discovery onchain** where capital signals conviction, not likes. But the previous spec had some structural weaknesses. Here's my full critique and upgraded spec:

---

# IdeaFi Protocol — Full Spec v2

## What the previous spec got wrong

The old `ProtocolMarket.sol` was doing too many jobs — auctioning shares, tracking funding, and managing refunds simultaneously. That's a design smell. The governance contract was also overloaded. I've decomposed these properly below.

Your new addition (user-requested ideas + community funding) actually *strengthens* the positioning. The key insight that makes this **distinct** from Gitcoin, Juicebox, or Mirror:

> **The idea itself becomes a tradeable asset before anything is built. Capital flow IS the discovery mechanism.**

---

## Unique positioning angles I'd add

1. **Idea Futures** — token price before a builder is selected is purely speculative/conviction-based. After a builder commits, it becomes a revenue-claim. Two distinct phases, one token.
2. **Builder Reputation Staking** — builders stake their own tokens on delivery. Fail the DAO validation? Lose stake. This solves the "ghost builder" problem.
3. **Request Board** — anyone can post a request with a bounty pool. If no builder picks it up in X days, funds return. This is the "what users want built" layer.
4. **Idea Forking** — if an idea stalls, DAO can fork it and reassign to a new builder, preserving token holders.

---

## Revised Lifecycle

```
[Request Posted] OR [Idea Created]
        ↓
  Funding Window Opens
  (IdeaToken minted per MUSD deposited)
        ↓
  Builder Marketplace Opens
  (Builders bid on the idea — stake required)
        ↓
  DAO Selects Builder + Approves Terms
  (BuilderAgreement signed onchain + IPFS)
        ↓
  FundingPool Locks
  (builderAlloc reserved, investorPool reserved)
        ↓
  Milestone Criteria Set by DAO
        ↓
  Builder Submits Milestones → DAO Validates Each
        ↓
  Final MVP Submitted → DAO Full Vote
        ↓
  If APPROVED:
    - Builder receives MUSD payout
    - Builder receives 10–30% IdeaToken allocation
    - Product transferred to InvestorDAO control
        ↓
  Product Operates
  Revenue → RevenueDistributor
  Token holders claim proportional revenue
        ↓
  If REJECTED (pre-lock): DAO votes → full refund
  If REJECTED (post-lock): Idea Fork or Dispute
```

---

## Contract Architecture

### 1. `IdeaRegistry.sol`

Single source of truth. Every idea, every request lives here.

```solidity
struct Idea {
    uint256 ideaId;
    address creator;
    bytes32 metadataHash;      // IPFS: title, desc, category
    IdeaType ideaType;          // ORIGINAL | REQUESTED
    IdeaStatus status;
    address fundingPool;
    address ideaToken;
    address builderAgreement;
    address milestoneContract;
    address revenueDistributor;
    uint256 createdAt;
}

enum IdeaType { ORIGINAL, REQUESTED }
enum IdeaStatus {
    OPEN,           // accepting funding
    BUILDER_SELECTION,
    ACTIVE,         // builder working
    MVP_SUBMITTED,
    LIVE,
    CANCELLED
}

function createIdea(bytes32 metadataHash, IdeaType ideaType) external returns (uint256 ideaId);
function linkContracts(uint256 ideaId, address pool, address token, ...) external;
function updateStatus(uint256 ideaId, IdeaStatus status) external;
```

---

### 2. `FundingPool.sol` *(replaces ProtocolMarket funding side)*

Handles all capital. Separated from governance and auctions.

```solidity
struct PoolConfig {
    uint256 softCap;
    uint256 hardCap;
    uint256 fundingDeadline;
    uint256 builderAllocationPct;   // e.g. 20%
    uint256 protocolFeePct;         // e.g. 2%
    bool isLocked;
}

// Deposit MUSD → receive IdeaTokens
function deposit(uint256 amount) external;

// Only before lock — requires governance approval to unlock
function withdraw(uint256 amount) external;

// Called by governance after builder selected
function lockPool() external onlyGovernance;

// Called after MVP approved — releases builder payout
function releaseBuilderFunds(address builder) external onlyGovernance;

// Emergency: DAO nullifies → return pro-rata to investors
function emergencyRefund() external onlyGovernance;
```

**Key design rule:** Once locked, investors cannot withdraw. This is the trust guarantee to builders. No builder will commit if investors can pull mid-build.

---

### 3. `IdeaToken.sol`

```solidity
// Standard ERC20 with restrictions

// Minting: only FundingPool during deposit window
function mint(address to, uint256 amount) external onlyFundingPool;

// P2P transfers: allowed
// DEX/AMM listing: BLOCKED (no approval to known router addresses)
// Sell-back to protocol: BLOCKED

// After MVP: builder allocation minted to BuilderAgreement contract
function mintBuilderAllocation(address builderAgreement) external onlyGovernance;

// Revenue claim tracked per token balance snapshot
function snapshot() external returns (uint256 snapshotId);
```

**Why P2P only?** Prevents pump/dump before a product exists. Price discovery is organic, person-to-person. This is the mechanism that makes it *feel* like early venture shares, not a meme coin.

---

### 4. `BuilderAgreement.sol`

```solidity
struct Agreement {
    address builder;
    uint256 musdPayout;           // from FundingPool
    uint256 tokenSharePct;        // 10–30%, negotiated
    bytes32 agreementHash;        // IPFS: full legal doc
    uint256 builderStake;         // builder's own tokens staked
    AgreementStatus status;
}

enum AgreementStatus { PROPOSED, ACCEPTED, ACTIVE, COMPLETED, SLASHED }

// Builder proposes terms
function propose(uint256 ideaId, uint256 tokenSharePct, bytes32 agreementHash) external;

// DAO accepts (governance vote)
function accept(uint256 ideaId) external onlyGovernance;

// If builder fails MVP validation — stake slashed, redistributed to token holders
function slash(uint256 ideaId) external onlyGovernance;
```

---

### 5. `IdeaDAO.sol`

Per-idea governance. Token-gated.

```solidity
enum ProposalType {
    SELECT_BUILDER,
    APPROVE_MVP,
    APPROVE_MILESTONE,
    SET_MILESTONE_CRITERIA,   // ← your requirement
    NULLIFY_IDEA,
    FORK_IDEA,                // ← new: reassign to new builder
    RELEASE_FUNDS
}

struct Proposal {
    uint256 proposalId;
    ProposalType pType;
    bytes calldata;           // encoded function call
    uint256 forVotes;
    uint256 againstVotes;
    uint256 deadline;
    bool executed;
}

// Quorum = 10% of circulating supply
// Passing = simple majority
// Time-lock = 48h after vote closes before execution
```

**Rules enforced in contract:**
- No refund proposals after pool lock (except NULLIFY — which requires 66% supermajority)
- NULLIFY only valid before builder submits any milestone
- FORK requires MVP rejection + 51% vote

---

### 6. `Milestone.sol`

```solidity
struct Milestone {
    uint256 milestoneId;
    bytes32 criteriaHash;      // IPFS: what "done" looks like (set by DAO)
    bytes32 submissionHash;    // IPFS: builder's submission
    MilestoneStatus status;
    uint256 fundsPct;          // % of builder payout released on approval
}

enum MilestoneStatus { CRITERIA_PENDING, OPEN, SUBMITTED, APPROVED, REJECTED }

// DAO sets criteria (ProposalType.SET_MILESTONE_CRITERIA)
function setCriteria(uint256 milestoneId, bytes32 criteriaHash) external onlyGovernance;

// Builder submits
function submit(uint256 milestoneId, bytes32 submissionHash) external onlyBuilder;

// Triggers DAO vote (ProposalType.APPROVE_MILESTONE)
// On approval → partial fund release from FundingPool
function requestApproval(uint256 milestoneId) external onlyBuilder;
```

---

### 7. `RevenueDistributor.sol`

```solidity
// Protocol/product sends revenue here
function depositRevenue(uint256 ideaId, uint256 amount) external;

// Uses ERC20Snapshot to calculate entitlement at snapshot time
function claimRevenue(uint256 ideaId, uint256 snapshotId) external;

// Distribution split (set at launch, immutable):
// - tokenHolders: based on % of supply held at snapshot
// - protocol: flat fee (e.g. 2%)
// Builder receives revenue through their token stake, not separately
```

---

### 8. `ProtocolMarket.sol` *(your original concept — refined)*

This is now only the **P2P share exchange layer**. Not auction, not fund management.

```solidity
// Facilitates P2P IdeaToken trades
// Both parties sign → tokens escrowed → MUSD released

struct TradeOffer {
    address seller;
    uint256 ideaId;
    uint256 tokenAmount;
    uint256 musdAskPrice;
    uint256 expiry;
    bool active;
}

function createOffer(uint256 ideaId, uint256 amount, uint256 price) external;
function acceptOffer(uint256 offerId) external;
function cancelOffer(uint256 offerId) external;

// No AMM. No orderbook. Simple bilateral trades.
// This is the "P2P only" enforcement layer.
```

---

## What makes this genuinely unique vs. existing protocols

| Feature | Gitcoin | Juicebox | Mirror | **IdeaFi** |
|---|---|---|---|---|
| Idea-first investing | ❌ | ❌ | partial | ✅ |
| Builder selection by DAO | ❌ | ❌ | ❌ | ✅ |
| Revenue-share token | ❌ | partial | ❌ | ✅ |
| P2P-only secondary market | ❌ | ❌ | ❌ | ✅ |
| Builder stake/slashing | ❌ | ❌ | ❌ | ✅ |
| Request board | ❌ | ❌ | ❌ | ✅ |
| Idea forking | ❌ | ❌ | ❌ | ✅ |

---

## MVP Build Order (hackathon sequencing)

1. `IdeaRegistry.sol` — 2h
2. `IdeaToken.sol` — 1h
3. `FundingPool.sol` — 3h
4. `BuilderAgreement.sol` — 2h
5. `Milestone.sol` — 2h
6. `IdeaDAO.sol` — 3h (hardest — get quorum + timelock right)
7. `RevenueDistributor.sol` — 2h
8. `ProtocolMarket.sol` — 1h (simplest — just escrow)

Total: ~16h core contracts. Frontend is a separate sprint.

---

## The one sentence pitch

> **"IdeaFi is the protocol where ideas become investable assets — capital funds them, builders execute them, and token holders own the revenue forever."**

---

Good catch — pushing revenue distribution onchain when fees come in multiple tokens and from an external product is overengineering a trust problem that doesn't need a smart contract to solve.

Here's how I'd think through it:

---

## The Real Problem

The protocol can't *own* the product's revenue stream — that product lives outside IdeaFi. So trying to route revenue through `RevenueDistributor.sol` means you're either:

- **Trusting** the builder/investors to send revenue to the contract (same trust problem, just moved onchain), or
- **Controlling** the product's fee wallet (now you're custodying someone else's business — regulatory nightmare)

Neither works cleanly. Your instinct is right.

---

## The Actual Solution: Legal-Binding Signed Agreement + Audit Trail

The blockchain's job here is **not** to distribute revenue. It's to:

1. Make the agreement **tamper-proof and timestamped**
2. Give LPs **verifiable proof** of what they're owed
3. Create an **on-chain audit trail** that makes cheating expensive/visible

---

## How It Works

### The Agreement Layer

When builder and DAO finalize terms, `BuilderAgreement.sol` stores:

```solidity
struct RevenueTerms {
    bytes32 agreementHash;        // IPFS: full signed legal doc
    address[] lpAddresses;        // wallet list of LPs at lock time
    uint256[] lpShareBps;         // basis points per LP (must sum to remaining after builder cut)
    uint256 builderShareBps;      // e.g. 1500 = 15%
    address[] acceptedTokens;     // USDC, ETH, USDT, NGN stablecoin — whatever they agree
    uint256 reportingIntervalDays; // e.g. quarterly
    bytes32 auditClauseHash;      // IPFS: audit rights agreement
}
```

The LP wallet list + their percentage split is **locked onchain at builder selection time**. This is the source of truth. Nobody can later claim they didn't know the split.

---

### The Signed Agreement on IPFS Contains

- Full revenue split table (builder %, each LP %, protocol fee %)
- List of accepted revenue tokens (multi-token explicitly named)
- Reporting obligations — builder must submit revenue report every X days
- Audit rights — any LP holding >N% can trigger an audit
- Dispute resolution path (arbitration clause or onchain dispute via DAO)
- Clawback clause — if builder is found misreporting, slashing activates

The hash of this document goes into `BuilderAgreement.sol`. Immutable.

---

### The Audit Trail Mechanism

Instead of `RevenueDistributor.sol`, you have `RevenueReport.sol` — much simpler:

```solidity
struct RevenueReport {
    uint256 reportId;
    uint256 ideaId;
    uint256 periodStart;
    uint256 periodEnd;
    bytes32 reportHash;          // IPFS: actual revenue breakdown doc
    address[] tokensReported;    // e.g. [USDC, ETH, USDT]
    uint256[] amountsReported;   // gross revenue per token
    bool lpAcknowledged;         // did majority of LPs sign off?
    bool disputed;
}

// Builder submits this quarterly/monthly
function submitReport(uint256 ideaId, bytes32 reportHash, ...) external onlyBuilder;

// LPs acknowledge receipt of their share (offchain payment, onchain acknowledgement)
function acknowledgeDistribution(uint256 reportId) external onlyLP;

// Any LP can raise dispute
function raiseDispute(uint256 reportId, bytes32 evidenceHash) external onlyLP;
```

**The flow:**
1. Builder distributes revenue **directly to LP wallets** (offchain, whatever token)
2. Builder submits `RevenueReport` onchain — declares what was sent, to whom, in what token
3. LPs call `acknowledgeDistribution` — confirms they received it
4. If LP doesn't acknowledge → automatic dispute flag after X days
5. DAO votes to resolve dispute → if builder is found misreporting → builder stake slashed

---

### What the Protocol Fee Looks Like

The one place you *can* capture onchain fees is at the **funding deposit moment** — when investors put MUSD into `FundingPool.sol`. That's a clean, single-token, protocol-controlled event.

```solidity
uint256 protocolFeeBps = 200; // 2%
// On deposit: fee split off → protocol treasury
// Everything else → LP allocation
```

For ongoing product revenue — the fee is defined in the signed agreement as a percentage that the builder sends to a **protocol treasury wallet** alongside LP distributions. It appears in the `RevenueReport`. If it's missing, LPs can dispute.

---

### Why This Is Actually Better

| Approach | Trust Required | Multi-token Support | Complexity | Auditability |
|---|---|---|---|---|
| `RevenueDistributor.sol` | Medium (builder must send to contract) | Hard (need oracle per token) | Very High | Medium |
| Signed Agreement + `RevenueReport.sol` | Low (onchain evidence trail) | Native (any token named in agreement) | Low | Very High |

The signed agreement does the legal enforcement. The onchain report does the transparency. The builder stake does the economic enforcement. You don't need a smart contract to move money you can't control anyway.

---

## Revised Contract List

| Contract | Keeps? | Role |
|---|---|---|
| `IdeaRegistry.sol` | ✅ | All ideas |
| `FundingPool.sol` | ✅ | Capital + protocol fee at deposit |
| `IdeaToken.sol` | ✅ | LP ownership representation |
| `BuilderAgreement.sol` | ✅ + expanded | Revenue terms locked onchain |
| `Milestone.sol` | ✅ | Build validation |
| `IdeaDAO.sol` | ✅ | Governance |
| `ProtocolMarket.sol` | ✅ | P2P token trades |
| `RevenueReport.sol` | 🆕 replaces distributor | Audit trail, dispute trigger |
| ~~`RevenueDistributor.sol`~~ | ❌ | Removed |

---

The builder is legally and economically bound. The LPs have verifiable onchain proof of what they're owed. The protocol captures its fee at the one moment it controls — deposit. Everything else is enforced by stake, signed agreement, and DAO dispute power.

Want me to now write the full `BuilderAgreement.sol` and `RevenueReport.sol` interfaces in detail, or move to the complete spec document?