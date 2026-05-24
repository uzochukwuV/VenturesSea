'use client';

import { useContractRead } from 'wagmi';
import { IDEA_TOKEN_ABI, FUNDING_POOL_ABI, IDEA_DAO_ABI, IDEA_FACTORY_ABI } from './abis';
import { getContractAddress, DEFAULT_CHAIN_ID } from './addresses';

// =============================================================================
// IDEA TOKEN READ OPERATIONS
// =============================================================================

export function useTokenBalance(address?: `0x${string}`, ideaId?: string) {
  const tokenAddress = ideaId ? getContractAddress(DEFAULT_CHAIN_ID, 'ideaToken') : undefined;
  
  return useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: IDEA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
}

export function useTokenTotalSupply(ideaId?: string) {
  const tokenAddress = ideaId ? getContractAddress(DEFAULT_CHAIN_ID, 'ideaToken') : undefined;
  
  return useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: IDEA_TOKEN_ABI,
    functionName: 'totalSupply',
  });
}

export function useTokenName(ideaId?: string) {
  const tokenAddress = ideaId ? getContractAddress(DEFAULT_CHAIN_ID, 'ideaToken') : undefined;
  
  return useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: IDEA_TOKEN_ABI,
    functionName: 'name',
  });
}

export function useTokenSymbol(ideaId?: string) {
  const tokenAddress = ideaId ? getContractAddress(DEFAULT_CHAIN_ID, 'ideaToken') : undefined;
  
  return useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: IDEA_TOKEN_ABI,
    functionName: 'symbol',
  });
}

// =============================================================================
// FUNDING POOL READ OPERATIONS
// =============================================================================

export function useRaisedAmount(ideaId?: string) {
  const poolAddress = ideaId ? getContractAddress(DEFAULT_CHAIN_ID, 'fundingPool') : undefined;
  
  return useContractRead({
    address: poolAddress as `0x${string}`,
    abi: FUNDING_POOL_ABI,
    functionName: 'raisedAmount',
  });
}

export function useFundingGoal(ideaId?: string) {
  const poolAddress = ideaId ? getContractAddress(DEFAULT_CHAIN_ID, 'fundingPool') : undefined;
  
  return useContractRead({
    address: poolAddress as `0x${string}`,
    abi: FUNDING_POOL_ABI,
    functionName: 'fundingGoal',
  });
}

export function useIsFunded(ideaId?: string) {
  const poolAddress = ideaId ? getContractAddress(DEFAULT_CHAIN_ID, 'fundingPool') : undefined;
  
  return useContractRead({
    address: poolAddress as `0x${string}`,
    abi: FUNDING_POOL_ABI,
    functionName: 'isFunded',
  });
}

// =============================================================================
// IDEA DAO READ OPERATIONS
// =============================================================================

export function useProposalVotes(daoAddress: `0x${string}`, proposalId: bigint) {
  return useContractRead({
    address: daoAddress,
    abi: IDEA_DAO_ABI,
    functionName: 'proposalVotes',
    args: [proposalId],
  });
}

export function useProposalState(daoAddress: `0x${string}`, proposalId: bigint) {
  return useContractRead({
    address: daoAddress,
    abi: IDEA_DAO_ABI,
    functionName: 'state',
    args: [proposalId],
  });
}

// =============================================================================
// FACTORY READ OPERATIONS
// =============================================================================

export function useIdeasCount() {
  const factoryAddress = getContractAddress(DEFAULT_CHAIN_ID, 'ideaFactory');
  
  return useContractRead({
    address: factoryAddress as `0x${string}`,
    abi: IDEA_FACTORY_ABI,
    functionName: 'ideasCount',
  });
}

export function useGetIdea(ideaId: number) {
  const factoryAddress = getContractAddress(DEFAULT_CHAIN_ID, 'ideaFactory');
  
  return useContractRead({
    address: factoryAddress as `0x${string}`,
    abi: IDEA_FACTORY_ABI,
    functionName: 'getIdea',
    args: [BigInt(ideaId)],
  });
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface IdeaContracts {
  ideaToken: `0x${string}`;
  fundingPool: `0x${string}`;
  ideaDAO: `0x${string}`;
}

export interface ProposalVotes {
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
}

export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7,
}

// Contract write helpers (to be used with wagmi useWriteContract + prepare)
// These return the parameters needed - actual write is triggered by the UI

export interface InvestParams {
  poolAddress: `0x${string}`;
  beneficiary: `0x${string}`;
}

export interface CastVoteParams {
  daoAddress: `0x${string}`;
  proposalId: bigint;
  support: boolean;
}

export interface CreateProposalParams {
  daoAddress: `0x${string}`;
  targets: `0x${string}`[];
  values: bigint[];
  calldatas: `0x${string}`[];
  description: string;
}
