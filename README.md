# VenturesSea

A community-driven funding and governance platform for decentralized application development.

## Features

- **Hackathon-Style Builder Selection**: Off-chain application process with fair compensation for all participants
- **Community-Driven Funding**: Investors fund projects and receive IdeaTokens
- **Milestone-Based Development**: Builders deliver through transparent milestone-based progress
- **Decentralized Governance**: IdeaDAO manages projects through on-chain voting
- **P2P Trading**: Secondary market for IdeaToken trading
- **Revenue Sharing**: Investors receive share of project revenue

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Solidity smart contracts
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Ethereum/Polygon/Avalanche

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Update with your Supabase credentials

# Run development server
npm run dev
```

### Smart Contracts

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Start local node
npm run node
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── ideas/        # Ideas listing and detail pages
│   ├── apply/         # Builder application page
│   ├── dashboard/    # User dashboard
│   └── admin/        # Admin selection panel
├── components/        # React components
│   ├── ui/          # Base UI components
│   ├── layout/      # Layout components (Nav, Footer)
│   └── sections/    # Page sections (Hero, Features)
├── lib/             # Utilities (Supabase client)
├── styles/          # Global styles (Family theme)
└── types/           # TypeScript definitions
```

## Design System

The project uses a warm, playful "Family" design theme:
- **Colors**: Warm cream canvas (#fbfaf9) with ember orange (#ff3e00) accents
- **Typography**: Fraunces (display), Inter (UI)
- **Style**: Children's book illustration aesthetic with flat characters

## License

MIT
