import { formatUnits, isAddress, keccak256, parseUnits, toBytes } from 'viem';

export const IDEA_STATUS_LABELS = ['Open', 'Builder selection', 'Active', 'MVP submitted', 'Live', 'Cancelled'] as const;
export const IDEA_TYPE_LABELS = ['Original', 'Requested'] as const;
export const PROPOSAL_TYPE_LABELS = [
  'Select builder',
  'Approve MVP',
  'Approve milestone',
  'Set milestone criteria',
  'Nullify idea',
  'Fork idea',
  'Release funds',
  'Set revenue terms',
] as const;

export function formatTokenAmount(value?: bigint, decimals = 18, precision = 2) {
  if (value === undefined || value === null) return '—';
  const formatted = formatUnits(value, decimals);
  const [whole, fraction = ''] = formatted.split('.');
  const trimmed = fraction.slice(0, precision).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function parseTokenAmount(value: string, decimals = 18) {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return BigInt(0);
  return parseUnits(normalized, decimals);
}

export function toBytes32Metadata(value: string): `0x${string}` {
  const trimmed = value.trim();
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return trimmed as `0x${string}`;
  return keccak256(toBytes(trimmed || `venturessea-${Date.now()}`));
}

export function safeAddress(value?: string): `0x${string}` | undefined {
  return value && isAddress(value) ? value : undefined;
}

export function explorerAddress(chainId: number | undefined, address?: string) {
  if (!address) return undefined;
  if (chainId === 31611) return `https://testnet.explorer.mezo.org/address/${address}`;
  return undefined;
}
