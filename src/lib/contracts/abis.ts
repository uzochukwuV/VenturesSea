// Frontend ABIs for the IdeaFi contract suite.
// These fragments mirror contracts/ideafi and intentionally include every
// read/write/event used by the app flows.

export const ERC20_ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

export const IDEA_REGISTRY_ABI = [
  { type: 'function', name: 'factory', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'ideaCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'createIdea', stateMutability: 'nonpayable', inputs: [{ name: 'metadataHash', type: 'bytes32' }, { name: 'ideaType', type: 'uint8' }], outputs: [] },
  { type: 'function', name: 'setFactory', stateMutability: 'nonpayable', inputs: [{ name: '_factory', type: 'address' }], outputs: [] },
  {
    type: 'function',
    name: 'ideas',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'ideaId', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'ideaType', type: 'uint8' },
      { name: 'status', type: 'uint8' },
      { name: 'fundingPool', type: 'address' },
      { name: 'ideaToken', type: 'address' },
      { name: 'builderAgreement', type: 'address' },
      { name: 'milestoneContract', type: 'address' },
      { name: 'revenueReport', type: 'address' },
      { name: 'ideaDAO', type: 'address' },
      { name: 'createdAt', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getIdea',
    stateMutability: 'view',
    inputs: [{ name: 'ideaId', type: 'uint256' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'ideaId', type: 'uint256' },
        { name: 'creator', type: 'address' },
        { name: 'metadataHash', type: 'bytes32' },
        { name: 'ideaType', type: 'uint8' },
        { name: 'status', type: 'uint8' },
        { name: 'fundingPool', type: 'address' },
        { name: 'ideaToken', type: 'address' },
        { name: 'builderAgreement', type: 'address' },
        { name: 'milestoneContract', type: 'address' },
        { name: 'revenueReport', type: 'address' },
        { name: 'ideaDAO', type: 'address' },
        { name: 'createdAt', type: 'uint256' },
      ],
    }],
  },
  { type: 'function', name: 'getIdeaDAO', stateMutability: 'view', inputs: [{ name: 'ideaId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'getFundingPool', stateMutability: 'view', inputs: [{ name: 'ideaId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'getBuilderAgreement', stateMutability: 'view', inputs: [{ name: 'ideaId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'getMilestone', stateMutability: 'view', inputs: [{ name: 'ideaId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'getRevenueReport', stateMutability: 'view', inputs: [{ name: 'ideaId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'event', name: 'IdeaCreated', inputs: [{ name: 'ideaId', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'ideaType', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'ContractsLinked', inputs: [{ name: 'ideaId', type: 'uint256', indexed: true }] },
] as const;

export const IDEA_FACTORY_ABI = [
  { type: 'function', name: 'registry', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'protocolTreasury', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'protocolMarket', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'deployIdeaContracts', stateMutability: 'nonpayable', inputs: [{ name: 'ideaId', type: 'uint256' }, { name: 'creator', type: 'address' }, { name: 'musd', type: 'address' }], outputs: [] },
  { type: 'event', name: 'IdeaDeployed', inputs: [{ name: 'ideaId', type: 'uint256', indexed: true }, { name: 'token', type: 'address', indexed: false }, { name: 'pool', type: 'address', indexed: false }, { name: 'builderAgreement', type: 'address', indexed: false }, { name: 'milestone', type: 'address', indexed: false }, { name: 'revenueReport', type: 'address', indexed: false }, { name: 'ideaDAO', type: 'address', indexed: false }] },
] as const;

export const IDEA_TOKEN_ABI = [
  ...ERC20_ABI,
  { type: 'function', name: 'fundingPool', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'protocolMarket', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'transferWhitelist', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'mintBuilderAllocation', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'snapshot', stateMutability: 'nonpayable', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'balanceOfAt', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'snapshotId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const FUNDING_POOL_ABI = [
  { type: 'function', name: 'ideaId', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'musd', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'ideaToken', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'softCap', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'hardCap', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'fundingDeadline', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'builderAllocationPct', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'totalDeposited', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'isLocked', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'refundMode', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'deposits', stateMutability: 'view', inputs: [{ name: 'lp', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'lockPool', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'claimRefund', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'event', name: 'Deposited', inputs: [{ name: 'investor', type: 'address', indexed: true }, { name: 'grossAmount', type: 'uint256', indexed: false }, { name: 'fee', type: 'uint256', indexed: false }, { name: 'netAmount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Withdrawn', inputs: [{ name: 'investor', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
] as const;

export const IDEA_DAO_ABI = [
  { type: 'function', name: 'ideaId', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'ideaToken', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'proposalCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'proposalEta', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'hasVoted', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'createProposal', stateMutability: 'nonpayable', inputs: [{ name: 'pType', type: 'uint8' }, { name: 'descriptionHash', type: 'bytes32' }, { name: 'target', type: 'address' }, { name: 'callData', type: 'bytes' }, { name: 'votingPeriod', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'castVote', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'support', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'queueProposal', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'executeProposal', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'cancelProposal', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'lockPool', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'selectBuilder', stateMutability: 'nonpayable', inputs: [{ name: 'builder', type: 'address' }, { name: 'musdPayout', type: 'uint256' }, { name: 'tokenSharePct', type: 'uint256' }, { name: 'agreementHash', type: 'bytes32' }, { name: 'stakeBps', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approveMilestone', stateMutability: 'nonpayable', inputs: [{ name: 'milestoneId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'nullifyIdea', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    type: 'function', name: 'proposals', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [
      { name: 'proposalId', type: 'uint256' }, { name: 'pType', type: 'uint8' }, { name: 'descriptionHash', type: 'bytes32' }, { name: 'callData', type: 'bytes' }, { name: 'target', type: 'address' }, { name: 'proposer', type: 'address' }, { name: 'forVotes', type: 'uint256' }, { name: 'againstVotes', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'executed', type: 'bool' }, { name: 'cancelled', type: 'bool' },
    ],
  },
  { type: 'event', name: 'ProposalCreated', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'pType', type: 'uint8', indexed: false }, { name: 'proposer', type: 'address', indexed: true }, { name: 'deadline', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'VoteCast', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'voter', type: 'address', indexed: true }, { name: 'support', type: 'bool', indexed: false }, { name: 'weight', type: 'uint256', indexed: false }] },
] as const;

export const BUILDER_AGREEMENT_ABI = [
  { type: 'function', name: 'getAgreementStatus', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'getBuilder', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'getMusdPayout', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'propose', stateMutability: 'nonpayable', inputs: [{ name: 'builder', type: 'address' }, { name: 'musdPayout', type: 'uint256' }, { name: 'tokenSharePct', type: 'uint256' }, { name: 'agreementHash', type: 'bytes32' }, { name: 'stakeBps', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'accept', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'slash', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'complete', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;

export const MILESTONE_ABI = [
  { type: 'function', name: 'milestoneCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'createMilestone', stateMutability: 'nonpayable', inputs: [{ name: 'fundsPct', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'setCriteria', stateMutability: 'nonpayable', inputs: [{ name: 'milestoneId', type: 'uint256' }, { name: 'criteriaHash', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'submit', stateMutability: 'nonpayable', inputs: [{ name: 'milestoneId', type: 'uint256' }, { name: 'submissionHash', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'approveMilestone', stateMutability: 'nonpayable', inputs: [{ name: 'milestoneId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'rejectMilestone', stateMutability: 'nonpayable', inputs: [{ name: 'milestoneId', type: 'uint256' }], outputs: [] },
  {
    type: 'function', name: 'milestones', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [
      { name: 'milestoneId', type: 'uint256' }, { name: 'fundsPct', type: 'uint256' }, { name: 'criteriaHash', type: 'bytes32' }, { name: 'submissionHash', type: 'bytes32' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'submittedAt', type: 'uint256' }, { name: 'approvedAt', type: 'uint256' },
    ],
  },
] as const;

export const REVENUE_REPORT_ABI = [
  { type: 'function', name: 'reportCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'submitReport', stateMutability: 'nonpayable', inputs: [{ name: 'periodStart', type: 'uint256' }, { name: 'periodEnd', type: 'uint256' }, { name: 'reportHash', type: 'bytes32' }, { name: 'tokens', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' }], outputs: [] },
  { type: 'function', name: 'acknowledgeDistribution', stateMutability: 'nonpayable', inputs: [{ name: 'reportId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'raiseDispute', stateMutability: 'nonpayable', inputs: [{ name: 'reportId', type: 'uint256' }, { name: 'evidenceHash', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'resolveDispute', stateMutability: 'nonpayable', inputs: [{ name: 'reportId', type: 'uint256' }, { name: 'builderGuilty', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'isDisputeWindowOpen', stateMutability: 'view', inputs: [{ name: 'reportId', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

export const PROTOCOL_MARKET_ABI = [
  { type: 'function', name: 'offerCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'createOffer', stateMutability: 'nonpayable', inputs: [{ name: 'ideaToken', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'musdAskPrice', type: 'uint256' }, { name: 'duration', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'cancelOffer', stateMutability: 'nonpayable', inputs: [{ name: 'offerId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'acceptOffer', stateMutability: 'nonpayable', inputs: [{ name: 'offerId', type: 'uint256' }], outputs: [] },
  {
    type: 'function', name: 'offers', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [
      { name: 'offerId', type: 'uint256' }, { name: 'seller', type: 'address' }, { name: 'ideaToken', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'musdAskPrice', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'active', type: 'bool' },
    ],
  },
] as const;
