# VenturesSea

**Bitcoin-Native Venture Capital on Mezo**

VenturesSea is a Bitcoin-native venture fund built on Mezo testnet (chain 31611). BTC holders can collateralize their Bitcoin to mint MUSD stablecoin, earn yield through StabilityPool deposits, and invest in on-chain ventures via DAO governance — all without selling their Bitcoin.

## Deployed Contracts

### SatoshiVentures Contracts (BTC Yield Layer)

| Contract | Address |
|----------|---------|
| **MezoBorrowConnector** | `0xb06EeC6848B864716824e9fd8Bc1a7914EF84bc3` |
| **CollateralTracker** | `0x0043D1c50dfc975dc4F2610345Db3700F837FA2e` |

### IdeaFi Contracts (Venture Funding)

| Contract | Address |
|----------|---------|
| **IdeaFactory** | `0x59d147AfE65872Af90fE2281f9E3b182088F0D37` |
| **IdeaRegistry** | `0x4E752BAb69b52c99721Afb3cAe4922C4298a7F9E` |
| **ProtocolTreasury** | `0x43Ca91C82dB992F36b9843a0c36d23FaA942F86f` |
| **ProtocolMarket** | `0x9890760F3e87F0BeD4110F2729224e69A4Df797d` |

### Implementation Contracts (Proxy Pattern)

| Contract | Address |
|----------|---------|
| **IdeaDAO** | `0x5F1e5b50667C92233F5dD4b446D14713561EFed2` |
| **FundingPool** | `0xB4E40F40460BC234837973e02c1A21d0747E5828` |
| **IdeaToken** | `0x90C3Aa2Bf8A54078B522CDDf4092328F879f2dd7` |
| **BuilderAgreement** | `0xC8bdc8Afaf5f7482F2b9Ebb62ef1f1a1792F50dd` |
| **Milestone** | `0x7adB35D053ef2636bf79A0af2E751592fA6D93C4` |
| **RevenueReport** | `0x9E5176E8477D5f350939d32430B0DbeeCe981897` |

### Mezo Protocol Addresses

| Contract | Address |
|----------|---------|
| **MUSD** | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| **BorrowerOperations** | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` |
| **TroveManager** | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` |
| **PriceFeed** | `0x86bCF0841622a5dAC14A313a15f96A95421b9366` |
| **SortedTroves** | `0x722E4D24FD6Ff8b0AC679450F3D91294607268fA` |
| **HintHelpers** | `0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6` |
| **StabilityPool** | `0x1CCA7E410eE41739792eA0A24e00349Dd247680e` |

**Deployer**: `0x0CFAb2d9C9F132389b3aA05FC019Ca4F2E19D021`
**Network**: Mezo testnet (chainId: 31611)

## How It Works

### 1. BTC → MUSD (Collateralize & Borrow)
Lock your Bitcoin as collateral in the Mezo protocol to mint MUSD stablecoin. Maintain 110%+ collateralization ratio.

### 2. Invest in Ventures  
Use minted MUSD to invest in on-chain ventures through DAO governance. Token holders vote on funding allocation and project selection.

### 3. MUSD → Earn (Yield Generation)
Deposit idle MUSD into StabilityPool to earn yields from liquidation surpluses.

## Project Structure

```
contracts/
├── satoshi/               # BTC yield contracts
│   ├── MezoBorrowConnector.sol   # BTC collateral read layer
│   ├── YieldOptimizer.sol        # MUSD yield routing
│   ├── CollateralTracker.sol     # Collateral accounting
│   └── mezo/IMezo.sol           # Mezo protocol interfaces
└── ideafi/                # Venture funding contracts
    ├── IdeaFactory.sol           # Factory for creating ventures
    ├── IdeaRegistry.sol          # Registry of all ideas
    ├── FundingPool.sol           # Funding pools for ventures
    └── *.sol                     # Supporting contracts

test/
└── SatoshiVentures.fork.ts      # Mezo fork tests
```

## Running Fork Tests

```bash
# Run Mezo testnet fork tests
npx hardhat test test/SatoshiVentures.fork.ts
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Smart Contracts**: Solidity 0.8.28
- **Blockchain**: Mezo testnet (chain 31611)
- **Protocol**: MUSD (Mezo USD stablecoin)

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
- **BTC/USD Price Oracle**: ~$77,300

## License

MIT
