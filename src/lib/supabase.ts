// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================

import { createClient } from '@supabase/supabase-js';

// Environment variables (would be set via .env.local in production)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Database Types (for Supabase TypeScript) ──

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          wallet_address: string;
          role: 'investor' | 'builder' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          role?: 'investor' | 'builder' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          role?: 'investor' | 'builder' | 'admin';
          updated_at?: string;
        };
      };
      ideas: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          target_funding: string;
          soft_cap: string;
          status: string;
          creator_address: string;
          token_address: string | null;
          dao_address: string | null;
          funding_pool_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          target_funding: string;
          soft_cap: string;
          status?: string;
          creator_address: string;
          token_address?: string | null;
          dao_address?: string | null;
          funding_pool_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          category?: string;
          target_funding?: string;
          soft_cap?: string;
          status?: string;
          token_address?: string | null;
          dao_address?: string | null;
          funding_pool_address?: string | null;
          updated_at?: string;
        };
      };
      builder_applications: {
        Row: {
          id: string;
          idea_id: string;
          builder_address: string;
          builder_name: string;
          builder_email: string;
          builder_github: string | null;
          portfolio_url: string | null;
          pitch_message: string;
          proposed_timeline: string;
          budget_estimate: string;
          status: 'pending' | 'shortlisted' | 'selected' | 'rejected' | 'compensated';
          selected_at: string | null;
          compensation_amount: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          builder_address: string;
          builder_name: string;
          builder_email: string;
          builder_github?: string | null;
          portfolio_url?: string | null;
          pitch_message: string;
          proposed_timeline: string;
          budget_estimate: string;
          status?: 'pending' | 'shortlisted' | 'selected' | 'rejected' | 'compensated';
          selected_at?: string | null;
          compensation_amount?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          builder_name?: string;
          builder_email?: string;
          builder_github?: string | null;
          portfolio_url?: string | null;
          pitch_message?: string;
          proposed_timeline?: string;
          budget_estimate?: string;
          status?: 'pending' | 'shortlisted' | 'selected' | 'rejected' | 'compensated';
          selected_at?: string | null;
          compensation_amount?: string | null;
          updated_at?: string;
        };
      };
      investments: {
        Row: {
          id: string;
          idea_id: string;
          investor_address: string;
          amount: string;
          token_amount: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          investor_address: string;
          amount: string;
          token_amount: string;
          created_at?: string;
        };
        Update: {
          amount?: string;
          token_amount?: string;
        };
      };
      milestones: {
        Row: {
          id: string;
          idea_id: string;
          title: string;
          description: string;
          funds_percentage: number;
          target_date: string | null;
          status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
          deliverable_criteria: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          payout_amount: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          title: string;
          description: string;
          funds_percentage: number;
          target_date?: string | null;
          status?: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
          deliverable_criteria?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          payout_amount?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          funds_percentage?: number;
          target_date?: string | null;
          status?: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
          deliverable_criteria?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          payout_amount?: string | null;
          updated_at?: string;
        };
      };
      proposals: {
        Row: {
          id: string;
          idea_id: string;
          proposal_type: 'select_builder' | 'lock_pool' | 'unlock_pool' | 'emergency_refund' | 'general';
          title: string;
          description: string;
          status: 'pending' | 'active' | 'passed' | 'rejected' | 'executed';
          votes_for: string;
          votes_against: string;
          start_time: string;
          end_time: string;
          created_at: string;
          executed_at: string | null;
        };
        Insert: {
          id?: string;
          idea_id: string;
          proposal_type: 'select_builder' | 'lock_pool' | 'unlock_pool' | 'emergency_refund' | 'general';
          title: string;
          description: string;
          status?: 'pending' | 'active' | 'passed' | 'rejected' | 'executed';
          votes_for?: string;
          votes_against?: string;
          start_time: string;
          end_time: string;
          created_at?: string;
          executed_at?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          status?: 'pending' | 'active' | 'passed' | 'rejected' | 'executed';
          votes_for?: string;
          votes_against?: string;
          executed_at?: string | null;
        };
      };
      revenue_reports: {
        Row: {
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
        };
        Insert: {
          id?: string;
          idea_id: string;
          period_start: string;
          period_end: string;
          revenue_amount: string;
          description: string;
          acknowledgment_count?: number;
          required_acknowledgments?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          revenue_amount?: string;
          description?: string;
          acknowledgment_count?: number;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          read?: boolean;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
}

// ── Helper Functions ──

/**
 * Get the current user's wallet address from localStorage
 * In production, this would connect to MetaMask or other wallet
 */
export const getCurrentWalletAddress = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wallet_address');
};

/**
 * Set the current user's wallet address
 */
export const setCurrentWalletAddress = (address: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('wallet_address', address);
  }
};

/**
 * Clear the current user's wallet address (disconnect)
 */
export const clearCurrentWalletAddress = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wallet_address');
  }
};

// ── API Helper Functions ──

/**
 * Fetch ideas with optional filters
 */
export const fetchIdeas = async (filters?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) => {
  let query = supabase.from('ideas').select('*', { count: 'exact' });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query.order('created_at', { ascending: false });
  
  return { data, error, count };
};

/**
 * Fetch a single idea by ID
 */
export const fetchIdeaById = async (id: string) => {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
};

/**
 * Fetch builder applications for an idea
 */
export const fetchApplications = async (ideaId: string, filters?: {
  status?: string;
}) => {
  let query = supabase
    .from('builder_applications')
    .select('*')
    .eq('idea_id', ideaId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  return { data, error };
};

/**
 * Submit a builder application
 */
export const submitApplication = async (application: {
  idea_id: string;
  builder_address: string;
  builder_name: string;
  builder_email: string;
  builder_github?: string;
  portfolio_url?: string;
  pitch_message: string;
  proposed_timeline: string;
  budget_estimate: string;
}) => {
  const { data, error } = await supabase
    .from('builder_applications')
    .insert([{
      ...application,
      status: 'pending',
    }])
    .select()
    .single();
  
  return { data, error };
};

/**
 * Update application status (admin only)
 */
export const updateApplicationStatus = async (
  applicationId: string,
  status: 'shortlisted' | 'selected' | 'rejected' | 'compensated',
  compensationAmount?: string
) => {
  const updateData: Record<string, unknown> = { status };
  
  if (status === 'selected') {
    updateData.selected_at = new Date().toISOString();
  }
  
  if (compensationAmount) {
    updateData.compensation_amount = compensationAmount;
  }

  const { data, error } = await supabase
    .from('builder_applications')
    .update(updateData)
    .eq('id', applicationId)
    .select()
    .single();
  
  return { data, error };
};

/**
 * Fetch user's investments
 */
export const fetchInvestments = async (investorAddress: string) => {
  const { data, error } = await supabase
    .from('investments')
    .select(`
      *,
      ideas (
        id,
        title,
        status,
        token_address
      )
    `)
    .eq('investor_address', investorAddress)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

/**
 * Fetch milestones for an idea
 */
export const fetchMilestones = async (ideaId: string) => {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

/**
 * Fetch notifications for a user
 */
export const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  
  return { data, error };
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single();
  
  return { data, error };
};