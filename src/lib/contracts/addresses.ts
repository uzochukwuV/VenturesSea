// Contract addresses by network
export const CONTRACT_ADDRESSES = {
  // Mainnet
  1: {
    ideaToken: '0x...', // Deployed contract addresses
    ideaFactory: '0x...',
    fundingPool: '0x...',
    ideaDAO: '0x...',
  },
  // Polygon
  137: {
    ideaToken: '0x...',
    ideaFactory: '0x...',
    fundingPool: '0x...',
    ideaDAO: '0x...',
  },
  // Arbitrum
  42161: {
    ideaToken: '0x...',
    ideaFactory: '0x...',
    fundingPool: '0x...',
    ideaDAO: '0x...',
  },
} as const;

// Default network
export const DEFAULT_CHAIN_ID = 137; // Polygon

export function getContractAddress(chainId: number, contractName: keyof typeof CONTRACT_ADDRESSES[1]): string {
  return CONTRACT_ADDRESSES[chainId]?.[contractName] || '';
}
