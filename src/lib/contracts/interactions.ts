'use client';

import { useMemo } from 'react';
import { encodeFunctionData, type Address } from 'viem';
import { useAccount, useChainId, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import {
  BUILDER_AGREEMENT_ABI,
  ERC20_ABI,
  FUNDING_POOL_ABI,
  IDEA_DAO_ABI,
  IDEA_REGISTRY_ABI,
  MILESTONE_ABI,
  PROTOCOL_MARKET_ABI,
  REVENUE_REPORT_ABI,
} from './abis';
import { DEFAULT_CHAIN_ID, getContractAddress } from './addresses';
import { toBytes32Metadata } from './utils';

export interface IdeaContracts {
  fundingPool?: Address;
  ideaToken?: Address;
  builderAgreement?: Address;
  milestoneContract?: Address;
  revenueReport?: Address;
  ideaDAO?: Address;
}

export interface IdeaRegistryRecord extends IdeaContracts {
  ideaId: bigint;
  creator: Address;
  metadataHash: `0x${string}`;
  ideaType: number;
  status: number;
  createdAt: bigint;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const isUsableAddress = (address?: Address) => Boolean(address && address !== ZERO_ADDRESS);

function normalizeIdea(data: unknown): IdeaRegistryRecord | undefined {
  const row = data as readonly unknown[] | undefined;
  if (!row || row.length < 12) return undefined;
  return {
    ideaId: row[0] as bigint,
    creator: row[1] as Address,
    metadataHash: row[2] as `0x${string}`,
    ideaType: Number(row[3]),
    status: Number(row[4]),
    fundingPool: row[5] as Address,
    ideaToken: row[6] as Address,
    builderAgreement: row[7] as Address,
    milestoneContract: row[8] as Address,
    revenueReport: row[9] as Address,
    ideaDAO: row[10] as Address,
    createdAt: row[11] as bigint,
  };
}

export function useIdeaFiAddresses() {
  const connectedChainId = useChainId();
  const chainId = connectedChainId || DEFAULT_CHAIN_ID;
  return useMemo(() => ({
    chainId,
    ideaRegistry: getContractAddress(chainId, 'ideaRegistry'),
    ideaFactory: getContractAddress(chainId, 'ideaFactory'),
    protocolMarket: getContractAddress(chainId, 'protocolMarket'),
    protocolTreasury: getContractAddress(chainId, 'protocolTreasury'),
    musd: getContractAddress(chainId, 'musd'),
  }), [chainId]);
}

export function useIdeaCount() {
  const { ideaRegistry } = useIdeaFiAddresses();
  return useReadContract({
    address: ideaRegistry,
    abi: IDEA_REGISTRY_ABI,
    functionName: 'ideaCount',
    query: { enabled: isUsableAddress(ideaRegistry) },
  });
}

export function useIdeaRegistryRecord(ideaId?: string | number | bigint) {
  const { ideaRegistry } = useIdeaFiAddresses();
  const id = ideaId ? BigInt(ideaId) : undefined;
  const query = useReadContract({
    address: ideaRegistry,
    abi: IDEA_REGISTRY_ABI,
    functionName: 'getIdea',
    args: id ? [id] : undefined,
    query: { enabled: isUsableAddress(ideaRegistry) && Boolean(id && id > BigInt(0)) },
  });

  return { ...query, idea: normalizeIdea(query.data) };
}

export function useFundingPoolStats(poolAddress?: Address, investor?: Address) {
  const enabled = isUsableAddress(poolAddress);
  const contracts = [
    { address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'totalDeposited' },
    { address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'softCap' },
    { address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'hardCap' },
    { address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'fundingDeadline' },
    { address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'isLocked' },
    { address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'refundMode' },
    { address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'musd' },
    ...(investor ? [{ address: poolAddress, abi: FUNDING_POOL_ABI, functionName: 'deposits', args: [investor] }] : []),
  ] as const;

  const query = useReadContracts({ contracts, query: { enabled } });
  const data = query.data || [];

  return {
    ...query,
    totalDeposited: data[0]?.result as bigint | undefined,
    softCap: data[1]?.result as bigint | undefined,
    hardCap: data[2]?.result as bigint | undefined,
    fundingDeadline: data[3]?.result as bigint | undefined,
    isLocked: data[4]?.result as boolean | undefined,
    refundMode: data[5]?.result as boolean | undefined,
    musd: data[6]?.result as Address | undefined,
    investorDeposit: data[7]?.result as bigint | undefined,
  };
}

export function useIdeaTokenStats(tokenAddress?: Address, holder?: Address) {
  const enabled = isUsableAddress(tokenAddress);
  const contracts = [
    { address: tokenAddress, abi: ERC20_ABI, functionName: 'name' },
    { address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' },
    { address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' },
    { address: tokenAddress, abi: ERC20_ABI, functionName: 'totalSupply' },
    ...(holder ? [{ address: tokenAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [holder] }] : []),
  ] as const;
  const query = useReadContracts({ contracts, query: { enabled } });
  const data = query.data || [];
  return {
    ...query,
    name: data[0]?.result as string | undefined,
    symbol: data[1]?.result as string | undefined,
    decimals: data[2]?.result as number | undefined,
    totalSupply: data[3]?.result as bigint | undefined,
    holderBalance: data[4]?.result as bigint | undefined,
  };
}

export function useMusdBalanceAndAllowance(spender?: Address) {
  const { address } = useAccount();
  const { musd } = useIdeaFiAddresses();
  const enabled = isUsableAddress(musd) && Boolean(address);
  const contracts = [
    { address: musd, abi: ERC20_ABI, functionName: 'decimals' },
    { address: musd, abi: ERC20_ABI, functionName: 'balanceOf', args: address ? [address] : undefined },
    ...(spender && address ? [{ address: musd, abi: ERC20_ABI, functionName: 'allowance', args: [address, spender] }] : []),
  ] as const;
  const query = useReadContracts({ contracts, query: { enabled } });
  const data = query.data || [];
  return {
    ...query,
    musd,
    decimals: (data[0]?.result as number | undefined) ?? 18,
    balance: data[1]?.result as bigint | undefined,
    allowance: data[2]?.result as bigint | undefined,
  };
}

export function useBuilderAgreement(address?: Address) {
  const query = useReadContracts({
    contracts: [
      { address, abi: BUILDER_AGREEMENT_ABI, functionName: 'getBuilder' },
      { address, abi: BUILDER_AGREEMENT_ABI, functionName: 'getMusdPayout' },
      { address, abi: BUILDER_AGREEMENT_ABI, functionName: 'getAgreementStatus' },
    ] as const,
    query: { enabled: isUsableAddress(address) },
  });
  const data = query.data || [];
  return {
    ...query,
    builder: data[0]?.result as Address | undefined,
    musdPayout: data[1]?.result as bigint | undefined,
    status: data[2]?.result as number | undefined,
  };
}

export function useMilestoneSummary(address?: Address) {
  return useReadContract({
    address,
    abi: MILESTONE_ABI,
    functionName: 'milestoneCount',
    query: { enabled: isUsableAddress(address) },
  });
}

export function useRevenueReportSummary(address?: Address) {
  return useReadContract({
    address,
    abi: REVENUE_REPORT_ABI,
    functionName: 'reportCount',
    query: { enabled: isUsableAddress(address) },
  });
}

export function useProposal(daoAddress?: Address, proposalId?: string | number | bigint) {
  const id = proposalId !== undefined && proposalId !== '' ? BigInt(proposalId) : undefined;
  const query = useReadContracts({
    contracts: [
      { address: daoAddress, abi: IDEA_DAO_ABI, functionName: 'proposals', args: id !== undefined ? [id] : undefined },
      { address: daoAddress, abi: IDEA_DAO_ABI, functionName: 'proposalEta', args: id !== undefined ? [id] : undefined },
    ] as const,
    query: { enabled: isUsableAddress(daoAddress) && id !== undefined },
  });
  const proposal = query.data?.[0]?.result as readonly unknown[] | undefined;
  return {
    ...query,
    proposal: proposal ? {
      proposalId: proposal[0] as bigint,
      pType: Number(proposal[1]),
      descriptionHash: proposal[2] as `0x${string}`,
      target: proposal[4] as Address,
      proposer: proposal[5] as Address,
      forVotes: proposal[6] as bigint,
      againstVotes: proposal[7] as bigint,
      deadline: proposal[8] as bigint,
      executed: proposal[9] as boolean,
      cancelled: proposal[10] as boolean,
      eta: query.data?.[1]?.result as bigint | undefined,
    } : undefined,
  };
}

export function useContractTransaction() {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  return { ...write, receipt };
}

export function useIdeaFiWrites() {
  const tx = useContractTransaction();
  const { ideaRegistry, musd, protocolMarket } = useIdeaFiAddresses();

  const writeContract = tx.writeContract as (variables: any) => void;

  return {
    ...tx,
    createIdea: (metadata: string, ideaType: 0 | 1 = 0) => writeContract({
      address: ideaRegistry,
      abi: IDEA_REGISTRY_ABI,
      functionName: 'createIdea',
      args: [toBytes32Metadata(metadata), ideaType],
    }),
    approveMusd: (spender: Address, amount: bigint) => writeContract({
      address: musd,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    }),
    deposit: (pool: Address, amount: bigint) => writeContract({
      address: pool,
      abi: FUNDING_POOL_ABI,
      functionName: 'deposit',
      args: [amount],
    }),
    withdraw: (pool: Address, amount: bigint) => writeContract({
      address: pool,
      abi: FUNDING_POOL_ABI,
      functionName: 'withdraw',
      args: [amount],
    }),
    claimRefund: (pool: Address) => writeContract({
      address: pool,
      abi: FUNDING_POOL_ABI,
      functionName: 'claimRefund',
    }),
    createProposal: (dao: Address, pType: number, description: string, target: Address, callData: `0x${string}`, votingPeriodSeconds = 7 * 24 * 60 * 60) => writeContract({
      address: dao,
      abi: IDEA_DAO_ABI,
      functionName: 'createProposal',
      args: [pType, toBytes32Metadata(description), target, callData, BigInt(votingPeriodSeconds)],
    }),
    vote: (dao: Address, proposalId: bigint, support: boolean) => writeContract({
      address: dao,
      abi: IDEA_DAO_ABI,
      functionName: 'castVote',
      args: [proposalId, support],
    }),
    queueProposal: (dao: Address, proposalId: bigint) => writeContract({
      address: dao,
      abi: IDEA_DAO_ABI,
      functionName: 'queueProposal',
      args: [proposalId],
    }),
    executeProposal: (dao: Address, proposalId: bigint) => writeContract({
      address: dao,
      abi: IDEA_DAO_ABI,
      functionName: 'executeProposal',
      args: [proposalId],
    }),
    submitMilestone: (milestone: Address, milestoneId: bigint, submission: string) => writeContract({
      address: milestone,
      abi: MILESTONE_ABI,
      functionName: 'submit',
      args: [milestoneId, toBytes32Metadata(submission)],
    }),
    submitRevenueReport: (report: Address, periodStart: bigint, periodEnd: bigint, hash: string, tokens: Address[], amounts: bigint[]) => writeContract({
      address: report,
      abi: REVENUE_REPORT_ABI,
      functionName: 'submitReport',
      args: [periodStart, periodEnd, toBytes32Metadata(hash), tokens, amounts],
    }),
    acknowledgeReport: (report: Address, reportId: bigint) => writeContract({
      address: report,
      abi: REVENUE_REPORT_ABI,
      functionName: 'acknowledgeDistribution',
      args: [reportId],
    }),
    createMarketOffer: (ideaToken: Address, amount: bigint, askPrice: bigint, duration: bigint) => writeContract({
      address: protocolMarket,
      abi: PROTOCOL_MARKET_ABI,
      functionName: 'createOffer',
      args: [ideaToken, amount, askPrice, duration],
    }),
  };
}

export function encodeLockPoolCall() {
  return encodeFunctionData({ abi: IDEA_DAO_ABI, functionName: 'lockPool' });
}

export function encodeSelectBuilderCall(builder: Address, musdPayout: bigint, tokenSharePct: bigint, agreementHash: string, stakeBps: bigint) {
  return encodeFunctionData({
    abi: IDEA_DAO_ABI,
    functionName: 'selectBuilder',
    args: [builder, musdPayout, tokenSharePct, toBytes32Metadata(agreementHash), stakeBps],
  });
}

export function encodeApproveMilestoneCall(milestoneId: bigint) {
  return encodeFunctionData({ abi: IDEA_DAO_ABI, functionName: 'approveMilestone', args: [milestoneId] });
}

export function encodeNullifyIdeaCall() {
  return encodeFunctionData({ abi: IDEA_DAO_ABI, functionName: 'nullifyIdea' });
}
