// ABI definitions for IdeaFi smart contracts

export const IDEA_TOKEN_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "from", "type": "address" },
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      { "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      { "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
] as const;

export const FUNDING_POOL_ABI = [
  {
    "inputs": [
      { "name": "_ideaToken", "type": "address" },
      { "name": "_initialFundingGoal", "type": "uint256" }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "investor", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ],
    "name": "Invested",
    "type": "event"
  },
  {
    "inputs": [
      { "name": "beneficiary", "type": "address" }
    ],
    "name": "invest",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawTo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "raisedAmount",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "fundingGoal",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ideaTokenAddress",
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isFunded",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
] as const;

export const IDEA_DAO_ABI = [
  {
    "inputs": [
      { "name": "_ideaToken", "type": "address" },
      { "name": "_fundingPool", "type": "address" },
      { "name": "_proposalThreshold", "type": "uint256" }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256", "indexed": false }
    ],
    "name": "ProposalCreated",
    "type": "event"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256", "indexed": false }
    ],
    "name": "ProposalExecuted",
    "type": "event"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256", "indexed": false }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "inputs": [
      { "name": "targets", "type": "address[]" },
      { "name": "values", "type": "uint256[]" },
      { "name": "calldatas", "type": "bytes[]" },
      { "name": "description", "type": "string" }
    ],
    "name": "propose",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256" },
      { "name": "support", "type": "bool" }
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256" }
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256" }
    ],
    "name": "cancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256" }
    ],
    "name": "proposalVotes",
    "outputs": [
      { "name": "forVotes", "type": "uint256" },
      { "name": "againstVotes", "type": "uint256" },
      { "name": "abstainVotes", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "proposalId", "type": "uint256" }
    ],
    "name": "state",
    "outputs": [
      { "name": "", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
] as const;

export const IDEA_FACTORY_ABI = [
  {
    "inputs": [
      { "name": "_ideaToken", "type": "address" },
      { "name": "_ideaDAO", "type": "address" },
      { "name": "_fundingPool", "type": "address" }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "title", "type": "string" },
      { "name": "description", "type": "string" },
      { "name": "targetFunding", "type": "uint256" },
      { "name": "softCap", "type": "uint256" }
    ],
    "name": "createIdea",
    "outputs": [
      { "name": "ideaId", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "ideaId", "type": "uint256" }
    ],
    "name": "getIdea",
    "outputs": [
      { "name": "", "type": "address" },
      { "name": "", "type": "address" },
      { "name": "", "type": "address" },
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ideasCount",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
] as const;
