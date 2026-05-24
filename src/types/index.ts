// ============================================
// IDEA FI — TYPE DEFINITIONS
// ============================================

// ── User Types ──

export type UserRole = 'investor' | 'builder' | 'admin';

export interface User {
  id: string;
  wallet_address: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ── Idea / Project Types ──

export type IdeaStatus = 
  | 'draft' 
  | 'open_for_applications' 
  | 'builders_selected' 
  | 'building_phase' 
  | 'voting_open' 
  | 'winner_selected' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  target_funding: string;
  soft_cap: string;
  status: IdeaStatus;
  creator_address: string;
  created_at: string;
  updated_at: string;
  
  // Optional relations
  token_address?: string;
  dao_address?: string;
  funding_pool_address?: string;
}

export interface IdeaWithRelations extends Idea {
  applications?: BuilderApplication[];
  milestones?: Milestone[];
  total_funding?: string;
  investor_count?: number;
}

// ── Builder Application Types ──

export type ApplicationStatus = 
  | 'pending' 
  | 'shortlisted' 
  | 'selected' 
  | 'rejected' 
  | 'compensated';

export interface BuilderApplication {
  id: string;
  idea_id: string;
  builder_address: string;
  builder_name: string;
  builder_email: string;
  builder_github?: string;
  portfolio_url?: string;
  pitch_message: string;
  proposed_timeline: string;
  budget_estimate: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  
  // Selection info (for winners)
  selected_at?: string;
  compensation_amount?: string;
}

// ── Milestone Types ──

export type MilestoneStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'submitted' 
  | 'approved' 
  | 'rejected';

export interface Milestone {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  funds_percentage: number;
  target_date?: string;
  status: MilestoneStatus;
  deliverable_criteria?: string;
  created_at: string;
  updated_at: string;
  
  // Approval info
  submitted_at?: string;
  approved_at?: string;
  payout_amount?: string;
}

// ── Investment Types ──

export interface Investment {
  id: string;
  idea_id: string;
  investor_address: string;
  amount: string;
  token_amount: string;
  created_at: string;
}

// ── Revenue Report Types ──

export interface RevenueReport {
  id: string;
  idea_id: string;
  period_start: string;
  period_end: string;
  revenue_amount: string;
  description: string;
  acknowledgment_count: number;
  required_acknowledgments: number;
  created_at: string;
  updated_at: string;
}

// ── Proposal Types ──

export type ProposalType = 
  | 'select_builder' 
  | 'lock_pool' 
  | 'unlock_pool' 
  | 'emergency_refund' 
  | 'general';

export type ProposalStatus = 
  | 'pending' 
  | 'active' 
  | 'passed' 
  | 'rejected' 
  | 'executed';

export interface Proposal {
  id: string;
  idea_id: string;
  proposal_type: ProposalType;
  title: string;
  description: string;
  status: ProposalStatus;
  votes_for: string;
  votes_against: string;
  start_time: string;
  end_time: string;
  created_at: string;
  executed_at?: string;
}

// ── API Response Types ──

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ── Form Types ──

export interface IdeaFormData {
  title: string;
  description: string;
  category: string;
  target_funding: string;
  soft_cap: string;
}

export interface BuilderApplicationFormData {
  builder_name: string;
  builder_email: string;
  builder_github?: string;
  portfolio_url?: string;
  pitch_message: string;
  proposed_timeline: string;
  budget_estimate: string;
}

export interface InvestmentFormData {
  amount: string;
}

// ── Dashboard Types ──

export interface InvestorDashboard {
  total_invested: string;
  total_ideas: number;
  ideas_invested: { idea: Idea; amount: string; token_amount: string }[];
  pending_revenue_reports: RevenueReport[];
}

export interface BuilderDashboard {
  total_earnings: string;
  active_projects: { idea: Idea; application: BuilderApplication }[];
  completed_milestones: Milestone[];
  pending_milestones: Milestone[];
}

export interface AdminDashboard {
  total_ideas: number;
  pending_applications: BuilderApplication[];
  active_proposals: Proposal[];
  total_invested: string;
}

// ── Notification Types ──

export type NotificationType = 
  | 'application_received'
  | 'application_selected'
  | 'application_rejected'
  | 'milestone_created'
  | 'milestone_approved'
  | 'proposal_passed'
  | 'proposal_failed'
  | 'investment_received';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}