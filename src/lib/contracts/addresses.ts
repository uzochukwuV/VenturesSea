import type { Address } from 'viem';

export type ContractName =
  | 'ideaRegistry'
  | 'ideaFactory'
  | 'protocolTreasury'
  | 'protocolMarket'
  | 'musd';

export type ContractAddressMap = Partial<Record<ContractName, Address>>;

const envAddress = (value?: string): Address | undefined => {
  if (value && /^0x[a-fA-F0-9]{40}$/.test(value)) {
    return value as Address;
  }
  return undefined;
};

export const MEZO_TESTNET_CHAIN_ID = 31611;
export const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || MEZO_TESTNET_CHAIN_ID);

const defaultAddresses: ContractAddressMap = {
  ideaRegistry: envAddress(process.env.NEXT_PUBLIC_IDEAFI_REGISTRY_ADDRESS),
  ideaFactory: envAddress(process.env.NEXT_PUBLIC_IDEAFI_FACTORY_ADDRESS),
  protocolTreasury: envAddress(process.env.NEXT_PUBLIC_IDEAFI_TREASURY_ADDRESS),
  protocolMarket: envAddress(process.env.NEXT_PUBLIC_IDEAFI_MARKET_ADDRESS),
  musd: envAddress(process.env.NEXT_PUBLIC_MUSD_ADDRESS) || '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
};

export const CONTRACT_ADDRESSES: Record<number, ContractAddressMap> = {
  [MEZO_TESTNET_CHAIN_ID]: defaultAddresses,
  [DEFAULT_CHAIN_ID]: defaultAddresses,
};

export function getContractAddress(chainId: number | undefined, contractName: ContractName): Address | undefined {
  if (!chainId) return CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID]?.[contractName];
  return CONTRACT_ADDRESSES[chainId]?.[contractName] || CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID]?.[contractName];
}

export function hasCoreDeployment(chainId?: number) {
  const addresses = CONTRACT_ADDRESSES[chainId || DEFAULT_CHAIN_ID];
  return Boolean(addresses?.ideaRegistry && addresses?.ideaFactory && addresses?.musd);
}
