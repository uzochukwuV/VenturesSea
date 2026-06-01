'use client';

import React, { useMemo, useState } from 'react';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';
import { Button, Card, Badge, Input, ProgressBar, Textarea } from '@/components/ui';
import {
  encodeApproveMilestoneCall,
  encodeLockPoolCall,
  encodeNullifyIdeaCall,
  encodeSelectBuilderCall,
  useBuilderAgreement,
  useFundingPoolStats,
  useIdeaCount,
  useIdeaFiAddresses,
  useIdeaFiWrites,
  useIdeaRegistryRecord,
  useIdeaTokenStats,
  useMilestoneSummary,
  useMusdBalanceAndAllowance,
  useProposal,
  useRevenueReportSummary,
} from '@/lib/contracts';
import { IDEA_STATUS_LABELS, IDEA_TYPE_LABELS, PROPOSAL_TYPE_LABELS, formatTokenAmount, parseTokenAmount, safeAddress, toBytes32Metadata } from '@/lib/contracts/utils';

const cardTitle = 'text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-ash)]';
const statValue = 'mt-2 text-2xl font-semibold text-[var(--color-charcoal-primary)]';

function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not configured';
}

function TxState({ hash, isPending, isConfirming, isSuccess, error }: { hash?: string; isPending?: boolean; isConfirming?: boolean; isSuccess?: boolean; error?: Error | null }) {
  if (!hash && !isPending && !error) return null;
  return (
    <div className="mt-4 rounded-[10px] bg-[var(--color-parchment-card)] p-4 text-sm text-[var(--color-graphite)]">
      {isPending && <p>Wallet confirmation pending…</p>}
      {hash && <p>Transaction submitted: <span className="font-mono">{shortAddress(hash)}</span></p>}
      {isConfirming && <p>Waiting for block confirmation…</p>}
      {isSuccess && <p className="text-[var(--color-meadow-green)]">Confirmed on-chain.</p>}
      {error && <p className="text-[var(--color-coral-red)]">{error.message}</p>}
    </div>
  );
}

export function DeploymentStatusPanel() {
  const { chainId, ideaRegistry, ideaFactory, protocolMarket, musd } = useIdeaFiAddresses();
  const ideaCount = useIdeaCount();

  return (
    <Card className="border border-[var(--color-stone-surface)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge variant={ideaRegistry && ideaFactory ? 'green' : 'yellow'} size="md">
            {ideaRegistry && ideaFactory ? 'Contracts configured' : 'Add deployment env vars'}
          </Badge>
          <h2 className="font-family mt-4 text-3xl text-[var(--color-midnight)]">IdeaFi protocol integration</h2>
          <p className="mt-3 max-w-2xl text-[var(--color-graphite)]">
            The frontend now reads the registry, funding pools, idea tokens, DAO proposals, builder agreements, milestones, revenue reports, and secondary market contracts through wagmi hooks.
          </p>
        </div>
        <div className="grid min-w-[260px] gap-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-[var(--color-ash)]">Chain</span><span className="font-medium">{chainId}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--color-ash)]">Registry</span><span className="font-mono">{shortAddress(ideaRegistry)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--color-ash)]">Factory</span><span className="font-mono">{shortAddress(ideaFactory)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--color-ash)]">mUSD</span><span className="font-mono">{shortAddress(musd)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--color-ash)]">Market</span><span className="font-mono">{shortAddress(protocolMarket)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[var(--color-ash)]">Ideas on-chain</span><span className="font-medium">{ideaCount.data?.toString() || '—'}</span></div>
        </div>
      </div>
    </Card>
  );
}

export function CreateIdeaPanel() {
  const [metadata, setMetadata] = useState('');
  const [ideaType, setIdeaType] = useState<0 | 1>(0);
  const { createIdea, data, isPending, receipt, error } = useIdeaFiWrites();
  const { ideaRegistry } = useIdeaFiAddresses();

  return (
    <Card>
      <p className={cardTitle}>Developer step 1</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--color-charcoal-primary)]">Register an idea on-chain</h3>
      <p className="mt-2 text-sm text-[var(--color-graphite)]">
        This calls <span className="font-mono">IdeaRegistry.createIdea(bytes32,uint8)</span>. The registry stores a metadata hash and triggers the factory to deploy the per-idea pool, token, DAO, builder agreement, milestones, and revenue report contracts.
      </p>
      <div className="mt-6 grid gap-4">
        <Textarea label="Metadata URI or hash" value={metadata} onChange={(event) => setMetadata(event.target.value)} placeholder="ipfs://... or a proposal summary to hash" />
        <label className="text-sm font-medium text-[var(--color-charcoal-primary)]">
          Idea type
          <select value={ideaType} onChange={(event) => setIdeaType(Number(event.target.value) as 0 | 1)} className="mt-2 w-full rounded-[10px] border border-[var(--color-stone-surface)] bg-white px-4 py-3">
            <option value={0}>Original founder idea</option>
            <option value={1}>Requested community idea</option>
          </select>
        </label>
        <div className="rounded-[10px] bg-[var(--color-parchment-card)] p-3 text-xs text-[var(--color-ash)]">
          bytes32 preview: <span className="font-mono text-[var(--color-graphite)]">{toBytes32Metadata(metadata || 'preview')}</span>
        </div>
        <Button disabled={!ideaRegistry || !metadata.trim()} isLoading={isPending || receipt.isLoading} onClick={() => createIdea(metadata, ideaType)}>
          Create idea contracts
        </Button>
      </div>
      <TxState hash={data} isPending={isPending} isConfirming={receipt.isLoading} isSuccess={receipt.isSuccess} error={error} />
    </Card>
  );
}

export function IdeaOnChainPanel({ ideaId }: { ideaId: string }) {
  const { address } = useAccount();
  const record = useIdeaRegistryRecord(ideaId);
  const idea = record.idea;
  const pool = useFundingPoolStats(idea?.fundingPool, address);
  const token = useIdeaTokenStats(idea?.ideaToken, address);
  const agreement = useBuilderAgreement(idea?.builderAgreement);
  const milestones = useMilestoneSummary(idea?.milestoneContract);
  const reports = useRevenueReportSummary(idea?.revenueReport);
  const progress = pool.hardCap && pool.totalDeposited ? Number((pool.totalDeposited * BigInt(100)) / pool.hardCap) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={cardTitle}>On-chain state</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--color-charcoal-primary)]">Registry #{ideaId}</h3>
          </div>
          <Badge variant={idea ? 'green' : 'yellow'}>{idea ? IDEA_STATUS_LABELS[idea.status] || 'Unknown' : 'Not found'}</Badge>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div><p className="text-xs text-[var(--color-ash)]">Creator</p><p className="font-mono text-sm">{shortAddress(idea?.creator)}</p></div>
          <div><p className="text-xs text-[var(--color-ash)]">Type</p><p className="text-sm">{idea ? IDEA_TYPE_LABELS[idea.ideaType] : '—'}</p></div>
          <div><p className="text-xs text-[var(--color-ash)]">Funding pool</p><p className="font-mono text-sm">{shortAddress(idea?.fundingPool)}</p></div>
          <div><p className="text-xs text-[var(--color-ash)]">Idea token</p><p className="font-mono text-sm">{shortAddress(idea?.ideaToken)}</p></div>
          <div><p className="text-xs text-[var(--color-ash)]">DAO</p><p className="font-mono text-sm">{shortAddress(idea?.ideaDAO)}</p></div>
          <div><p className="text-xs text-[var(--color-ash)]">Metadata hash</p><p className="break-all font-mono text-xs">{idea?.metadataHash || '—'}</p></div>
        </div>
        <div className="mt-8">
          <ProgressBar value={progress} max={100} showPercentage label="Funding progress" />
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-[var(--color-ash)]">Raised</p><p className="font-semibold">{formatTokenAmount(pool.totalDeposited)}</p></div>
            <div><p className="text-[var(--color-ash)]">Soft cap</p><p className="font-semibold">{formatTokenAmount(pool.softCap)}</p></div>
            <div><p className="text-[var(--color-ash)]">Hard cap</p><p className="font-semibold">{formatTokenAmount(pool.hardCap)}</p></div>
          </div>
        </div>
      </Card>
      <Card>
        <p className={cardTitle}>Project contracts</p>
        <div className="mt-5 space-y-4 text-sm">
          <div className="flex justify-between"><span>Token</span><span className="font-medium">{token.symbol || '—'}</span></div>
          <div className="flex justify-between"><span>Your tokens</span><span className="font-medium">{formatTokenAmount(token.holderBalance, token.decimals)}</span></div>
          <div className="flex justify-between"><span>Your net deposit</span><span className="font-medium">{formatTokenAmount(pool.investorDeposit)}</span></div>
          <div className="flex justify-between"><span>Pool locked</span><span className="font-medium">{pool.isLocked ? 'Yes' : 'No'}</span></div>
          <div className="flex justify-between"><span>Milestones</span><span className="font-medium">{milestones.data?.toString() || '0'}</span></div>
          <div className="flex justify-between"><span>Revenue reports</span><span className="font-medium">{reports.data?.toString() || '0'}</span></div>
          <div className="flex justify-between"><span>Selected builder</span><span className="font-mono">{shortAddress(agreement.builder)}</span></div>
        </div>
      </Card>
    </div>
  );
}

export function InvestorActionPanel({ ideaId }: { ideaId: string }) {
  const { address } = useAccount();
  const { idea } = useIdeaRegistryRecord(ideaId);
  const pool = useFundingPoolStats(idea?.fundingPool, address);
  const musd = useMusdBalanceAndAllowance(idea?.fundingPool);
  const [amount, setAmount] = useState('100');
  const parsedAmount = useMemo(() => parseTokenAmount(amount, musd.decimals), [amount, musd.decimals]);
  const { approveMusd, deposit, withdraw, claimRefund, data, isPending, receipt, error } = useIdeaFiWrites();
  const needsApproval = parsedAmount > BigInt(0) && ((musd.allowance || BigInt(0)) < parsedAmount);

  return (
    <Card>
      <p className={cardTitle}>Investor flow</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--color-charcoal-primary)]">Fund, receive tokens, govern</h3>
      <p className="mt-2 text-sm text-[var(--color-graphite)]">
        Investors approve mUSD, deposit into the funding pool, receive IdeaTokens net of protocol fee, then vote on DAO proposals and revenue reports.
      </p>
      <div className="mt-6 grid gap-4">
        <Input label="mUSD amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[10px] bg-[var(--color-parchment-card)] p-3"><p className="text-[var(--color-ash)]">mUSD balance</p><p className="font-semibold">{formatTokenAmount(musd.balance, musd.decimals)}</p></div>
          <div className="rounded-[10px] bg-[var(--color-parchment-card)] p-3"><p className="text-[var(--color-ash)]">Allowance</p><p className="font-semibold">{formatTokenAmount(musd.allowance, musd.decimals)}</p></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!idea?.fundingPool || !parsedAmount || !musd.musd} isLoading={isPending || receipt.isLoading} onClick={() => idea?.fundingPool && approveMusd(idea.fundingPool, parsedAmount)}>
            Approve mUSD
          </Button>
          <Button variant="secondary" disabled={!idea?.fundingPool || !parsedAmount || needsApproval} onClick={() => idea?.fundingPool && deposit(idea.fundingPool, parsedAmount)}>
            Deposit
          </Button>
          <Button variant="outline" disabled={!idea?.fundingPool || !parsedAmount || pool.isLocked} onClick={() => idea?.fundingPool && withdraw(idea.fundingPool, parsedAmount)}>
            Withdraw
          </Button>
          <Button variant="ghost" disabled={!idea?.fundingPool || !pool.refundMode} onClick={() => idea?.fundingPool && claimRefund(idea.fundingPool)}>
            Claim refund
          </Button>
        </div>
      </div>
      <TxState hash={data} isPending={isPending} isConfirming={receipt.isLoading} isSuccess={receipt.isSuccess} error={error} />
    </Card>
  );
}

export function GovernanceActionPanel({ ideaId }: { ideaId: string }) {
  const { idea } = useIdeaRegistryRecord(ideaId);
  const [proposalId, setProposalId] = useState('0');
  const [builder, setBuilder] = useState('');
  const [payout, setPayout] = useState('1000');
  const proposal = useProposal(idea?.ideaDAO, proposalId);
  const { createProposal, vote, queueProposal, executeProposal, data, isPending, receipt, error } = useIdeaFiWrites();
  const selectedBuilder = safeAddress(builder);

  const createLockProposal = () => {
    if (!idea?.ideaDAO) return;
    createProposal(idea.ideaDAO, 6, 'Lock the funding pool after soft cap', idea.ideaDAO, encodeLockPoolCall());
  };

  const createBuilderProposal = () => {
    if (!idea?.ideaDAO || !selectedBuilder) return;
    createProposal(
      idea.ideaDAO,
      0,
      `Select builder ${selectedBuilder}`,
      idea.ideaDAO,
      encodeSelectBuilderCall(selectedBuilder, parseTokenAmount(payout), BigInt(1000), `builder-${selectedBuilder}-${payout}`, BigInt(500)),
    );
  };

  return (
    <Card>
      <p className={cardTitle}>DAO flow</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--color-charcoal-primary)]">Create proposals, vote, queue, execute</h3>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Button disabled={!idea?.ideaDAO} onClick={createLockProposal}>Propose lock pool</Button>
          <Input label="Builder wallet" value={builder} onChange={(event) => setBuilder(event.target.value)} placeholder="0x…" />
          <Input label="Builder payout mUSD" value={payout} onChange={(event) => setPayout(event.target.value)} />
          <Button variant="secondary" disabled={!idea?.ideaDAO || !selectedBuilder} onClick={createBuilderProposal}>Propose builder selection</Button>
          <Button variant="outline" disabled={!idea?.ideaDAO} onClick={() => idea?.ideaDAO && createProposal(idea.ideaDAO, 4, 'Emergency nullify idea', idea.ideaDAO, encodeNullifyIdeaCall())}>Propose emergency refund</Button>
          <Button variant="ghost" disabled={!idea?.ideaDAO} onClick={() => idea?.ideaDAO && createProposal(idea.ideaDAO, 2, 'Approve milestone 0', idea.ideaDAO, encodeApproveMilestoneCall(BigInt(0)))}>Propose milestone 0 approval</Button>
        </div>
        <div className="space-y-3">
          <Input label="Proposal id" value={proposalId} onChange={(event) => setProposalId(event.target.value)} />
          <div className="rounded-[10px] bg-[var(--color-parchment-card)] p-4 text-sm">
            <p>Type: <span className="font-medium">{proposal.proposal ? PROPOSAL_TYPE_LABELS[proposal.proposal.pType] : '—'}</span></p>
            <p>For: <span className="font-medium">{formatTokenAmount(proposal.proposal?.forVotes)}</span></p>
            <p>Against: <span className="font-medium">{formatTokenAmount(proposal.proposal?.againstVotes)}</span></p>
            <p>Executed: <span className="font-medium">{proposal.proposal?.executed ? 'Yes' : 'No'}</span></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!idea?.ideaDAO} onClick={() => idea?.ideaDAO && vote(idea.ideaDAO, BigInt(proposalId || 0), true)}>Vote for</Button>
            <Button variant="outline" disabled={!idea?.ideaDAO} onClick={() => idea?.ideaDAO && vote(idea.ideaDAO, BigInt(proposalId || 0), false)}>Vote against</Button>
            <Button variant="secondary" disabled={!idea?.ideaDAO} onClick={() => idea?.ideaDAO && queueProposal(idea.ideaDAO, BigInt(proposalId || 0))}>Queue</Button>
            <Button variant="ghost" disabled={!idea?.ideaDAO} onClick={() => idea?.ideaDAO && executeProposal(idea.ideaDAO, BigInt(proposalId || 0))}>Execute</Button>
          </div>
        </div>
      </div>
      <TxState hash={data} isPending={isPending} isConfirming={receipt.isLoading} isSuccess={receipt.isSuccess} error={error} />
    </Card>
  );
}

export function BuilderDeliveryPanel({ ideaId }: { ideaId: string }) {
  const { idea } = useIdeaRegistryRecord(ideaId);
  const [milestoneId, setMilestoneId] = useState('0');
  const [submissionHash, setSubmissionHash] = useState('ipfs://milestone-deliverable');
  const [reportHash, setReportHash] = useState('ipfs://revenue-report');
  const { submitMilestone, submitRevenueReport, acknowledgeReport, data, isPending, receipt, error } = useIdeaFiWrites();

  return (
    <Card>
      <p className={cardTitle}>Developer step 3</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--color-charcoal-primary)]">Ship milestones and report revenue</h3>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Input label="Milestone id" value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)} />
          <Textarea label="Submission URI/hash" value={submissionHash} onChange={(event) => setSubmissionHash(event.target.value)} />
          <Button disabled={!idea?.milestoneContract} onClick={() => idea?.milestoneContract && submitMilestone(idea.milestoneContract, BigInt(milestoneId || 0), submissionHash)}>
            Submit milestone
          </Button>
        </div>
        <div className="space-y-3">
          <Textarea label="Revenue report URI/hash" value={reportHash} onChange={(event) => setReportHash(event.target.value)} />
          <Button disabled={!idea?.revenueReport} onClick={() => idea?.revenueReport && submitRevenueReport(idea.revenueReport, BigInt(Math.floor(Date.now() / 1000) - 2592000), BigInt(Math.floor(Date.now() / 1000)), reportHash, [], [])}>
            Submit revenue report
          </Button>
          <Button variant="outline" disabled={!idea?.revenueReport} onClick={() => idea?.revenueReport && acknowledgeReport(idea.revenueReport, BigInt(0))}>
            Investor acknowledge report #0
          </Button>
        </div>
      </div>
      <TxState hash={data} isPending={isPending} isConfirming={receipt.isLoading} isSuccess={receipt.isSuccess} error={error} />
    </Card>
  );
}

export function UserFlowCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card hoverable>
        <Badge variant="orange">Developer perspective</Badge>
        <h3 className="mt-4 text-2xl font-semibold text-[var(--color-charcoal-primary)]">Submit → get selected → ship → report</h3>
        <ol className="mt-5 space-y-3 text-sm text-[var(--color-graphite)]">
          <li>1. Register metadata in IdeaRegistry, which deploys the project contract suite.</li>
          <li>2. Apply as a builder off-chain, then get selected through an IdeaDAO proposal.</li>
          <li>3. Submit milestone deliverables to the Milestone contract.</li>
          <li>4. Submit revenue reports for LP acknowledgement and dispute windows.</li>
        </ol>
      </Card>
      <Card hoverable>
        <Badge variant="blue">Investor perspective</Badge>
        <h3 className="mt-4 text-2xl font-semibold text-[var(--color-charcoal-primary)]">Discover → fund → govern → trade</h3>
        <ol className="mt-5 space-y-3 text-sm text-[var(--color-graphite)]">
          <li>1. Review registry metadata, pool caps, token supply, and builder terms.</li>
          <li>2. Approve and deposit mUSD to mint IdeaTokens.</li>
          <li>3. Vote on lock-pool, builder-selection, milestone, and emergency proposals.</li>
          <li>4. Acknowledge revenue reports or trade IdeaTokens through ProtocolMarket.</li>
        </ol>
      </Card>
    </div>
  );
}
