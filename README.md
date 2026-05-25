# VenturesSea

**Bitcoin-Native Venture Capital on Mezo**

VenturesSea is a Bitcoin-native venture fund built on Mezo testnet (chain 31611). BTC holders can collateralize their Bitcoin to mint MUSD stablecoin, earn yield through StabilityPool deposits, and invest in on-chain ventures via DAO governance — all without selling their Bitcoin.

## How It Works

### 1. BTC → MUSD (Collateralize & Borrow)
Lock your Bitcoin as collateral in the Mezo protocol to mint MUSD stablecoin. Maintain 110%+ collateralization ratio.

### 2. Invest in Ventures  
Use minted MUSD to invest in on-chain ventures through DAO governance. Token holders vote on funding allocation and project selection.

### 3. MUSD → Earn (Yield Generation)
Deposit idle MUSD into StabilityPool to earn yields from liquidation surpluses. The SP currently holds 176+ BTC in collateral gains.

## Key Metrics (Live on Mezo Testnet)

| Metric | Value |
|--------|-------|
| Total BTC Collateral Locked | 37,527+ BTC |
| Total MUSD Minted | ~$1.27T |
| System Health (TCR) | 227%+ |
| Active Troves | 204 |
| StabilityPool Deposits | 86.2B MUSD |
| SP Collateral Yields | 176+ BTC |

## Features

- **Bitcoin-Backed Lending**: Use BTC as collateral without selling. Mint MUSD up to 110% collateralization.
- **StabilityPool Yields**: Earn yields by depositing MUSD. Returns come from liquidation surpluses.
- **DAO Governance**: Token holders vote on venture funding allocation and project selection.
- **Milestone-Based Funding**: Builders receive funds as they hit milestones, with transparent on-chain tracking.
- **Mezo Testnet Integration**: Built natively on Mezo chain for Bitcoin-native lending and yield.
- **Transparent On-Chain**: All operations tracked on-chain for full transparency and auditability.

## Running Fork Tests

```bash
# Run Mezo testnet fork tests (27 passing)
npx hardhat test test/SatoshiVentures.fork.ts

# Results validate:
# - Protocol health checks (TCR, price, trove counts)
# - BTC→MUSD borrow flow
# - MUSD→Earn StabilityPool yield flow
# - Fork impersonation for whale accounts
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Smart Contracts**: Solidity 0.8.28
- **Blockchain**: Mezo testnet (chain 31611)
- **Protocol**: MUSD (Mezo USD stablecoin)

## Project Structure

```
contracts/
├── satoshi/           # SatoshiVentures contracts
│   ├── MezoBorrowConnector.sol   # BTC collateral read layer
│   ├── YieldOptimizer.sol        # MUSD yield routing
│   ├── CollateralTracker.sol    # Collateral accounting
│   └── mezo/IMezo.sol           # Mezo protocol interfaces
└── ideafi/            # Idea funding contracts
test/
├── SatoshiVentures.fork.ts      # Mezo fork tests (27 tests)
└── ...
src/
├── app/               # Next.js App Router pages
├── components/        # React components
└── lib/               # Utilities
```

## Getting Started

```bash
# Install dependencies
npm install

# Run tests against Mezo testnet
npx hardhat test test/SatoshiVentures.fork.ts

# Start frontend
npm run dev
```

## Live Protocol

- **RPC**: https://rpc.test.mezo.org
- **Chain ID**: 31611
- **Block**: 13,271,049+
- **BTC/USD Price Oracle**: ~$77,300

## License

MIT
