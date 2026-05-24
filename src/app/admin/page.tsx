'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, Badge, Avatar, Modal } from '@/components/ui';
import { supabase, updateApplicationStatus } from '@/lib/supabase';

interface Application {
  id: string;
  idea_id: string;
  idea_title: string;
  builder_name: string;
  builder_email: string;
  builder_github?: string;
  portfolio_url?: string;
  pitch_message: string;
  proposed_timeline: string;
  budget_estimate: string;
  status: 'pending' | 'shortlisted' | 'selected' | 'rejected' | 'compensated';
  created_at: string;
}

export default function AdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'shortlist' | 'select' | 'reject' | 'compensate' | null>(null);
  const [compensationAmount, setCompensationAmount] = useState('');

  useEffect(() => {
    // Mock data - in production, fetch from Supabase
    const mockApplications: Application[] = [
      {
        id: '1',
        idea_id: '1',
        idea_title: 'DeFi Lending Protocol',
        builder_name: 'Alex Chen',
        builder_email: 'alex@example.com',
        builder_github: 'https://github.com/alexchen',
        portfolio_url: 'https://alexchen.dev',
        pitch_message: 'I have 5+ years of experience building DeFi protocols. Previously worked at Aave and Compound. I will implement a robust liquidation engine with oracle fallback mechanisms.',
        proposed_timeline: '2-3 months',
        budget_estimate: '$35,000',
        status: 'pending',
        created_at: '2024-01-15',
      },
      {
        id: '2',
        idea_id: '1',
        idea_title: 'DeFi Lending Protocol',
        builder_name: 'Sarah Kim',
        builder_email: 'sarah@example.com',
        builder_github: 'https://github.com/sarahkim',
        pitch_message: 'Full-stack developer with expertise in Solidity and React. Built three DeFi integrations and have a strong understanding of financial primitives.',
        proposed_timeline: '1-2 months',
        budget_estimate: '$28,000',
        status: 'pending',
        created_at: '2024-01-14',
      },
      {
        id: '3',
        idea_id: '1',
        idea_title: 'DeFi Lending Protocol',
        builder_name: 'Marcus Johnson',
        builder_email: 'marcus@example.com',
        pitch_message: 'DeFi native with experience building lending protocols. Created a Yield Optimizer that managed $2M TVL. Strong focus on security and gas optimization.',
        proposed_timeline: '2-4 weeks',
        budget_estimate: '$40,000',
        status: 'shortlisted',
        created_at: '2024-01-13',
      },
      {
        id: '4',
        idea_id: '2',
        idea_title: 'NFT Marketplace V2',
        builder_name: 'Emily Davis',
        builder_email: 'emily@example.com',
        builder_github: 'https://github.com/emilydavis',
        pitch_message: 'NFT specialist with experience building two successful marketplaces. Expert in ERC-721 and ERC-1155 standards with deep knowledge of gas optimization.',
        proposed_timeline: '2-3 months',
        budget_estimate: '$45,000',
        status: 'selected',
        created_at: '2024-01-12',
      },
      {
        id: '5',
        idea_id: '3',
        idea_title: 'DAO Governance Toolkit',
        builder_name: 'James Wilson',
        builder_email: 'james@example.com',
        pitch_message: 'DAO governance researcher and developer. Created multiple governance frameworks for established DAOs.',
        proposed_timeline: '3-4 months',
        budget_estimate: '$50,000',
        status: 'pending',
        created_at: '2024-01-11',
      },
    ];

    setApplications(mockApplications);
    setLoading(false);
  }, []);

  const handleAction = async (app: Application, action: 'shortlist' | 'select' | 'reject' | 'compensate') => {
    setSelectedApp(app);
    setActionType(action);
    if (action === 'compensate') {
      setShowModal(true);
    } else {
      // Simulate action
      const newStatus = action === 'select' ? 'selected' : action === 'reject' ? 'rejected' : 'shortlisted';
      setApplications(prev =>
        prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a)
      );
    }
  };

  const handleCompensate = () => {
    if (!selectedApp || !compensationAmount) return;
    
    setApplications(prev =>
      prev.map(a => a.id === selectedApp.id ? { ...a, status: 'compensated' } : a)
    );
    setShowModal(false);
    setSelectedApp(null);
    setCompensationAmount('');
  };

  const statusColors: Record<string, string> = {
    pending: 'default',
    shortlisted: 'yellow',
    selected: 'green',
    rejected: 'default',
    compensated: 'blue',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    shortlisted: 'Shortlisted',
    selected: 'Selected',
    rejected: 'Rejected',
    compensated: 'Compensated',
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-stone-surface)] border-t-[var(--color-ember-orange)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-ash)]">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)]">
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-ember-orange)] mb-4">
            Admin Panel
          </span>
          <h1 className="font-family text-4xl font-medium text-[var(--color-charcoal-primary)] mb-2">
            Builder Selection
          </h1>
          <p className="text-[var(--color-graphite)]">
            Review applications, shortlist builders, and select winners.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: 'Total', value: applications.length, color: 'sky-blue' },
            { label: 'Pending', value: applications.filter(a => a.status === 'pending').length, color: 'default' },
            { label: 'Shortlisted', value: applications.filter(a => a.status === 'shortlisted').length, color: 'yellow' },
            { label: 'Selected', value: applications.filter(a => a.status === 'selected').length, color: 'green' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 text-center">
              <div className="text-2xl font-semibold text-[var(--color-charcoal-primary)]">
                {stat.value}
              </div>
              <div className="text-sm text-[var(--color-ash)]">{stat.label}</div>
            </Card>
          ))}
        </motion.div>

        {/* Applications Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden" padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-stone-surface)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-charcoal-primary)] uppercase tracking-wider">
                      Builder
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-charcoal-primary)] uppercase tracking-wider">
                      Idea
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-charcoal-primary)] uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-charcoal-primary)] uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-charcoal-primary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-charcoal-primary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-stone-surface)]">
                  {applications.map((app, i) => (
                    <motion.tr
                      key={app.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 * i }}
                      className="hover:bg-[var(--color-parchment-card)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={app.builder_name} size="md" />
                          <div>
                            <div className="font-medium text-[var(--color-charcoal-primary)]">
                              {app.builder_name}
                            </div>
                            <div className="text-sm text-[var(--color-ash)]">
                              {app.builder_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--color-graphite)]">
                          {app.idea_title}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--color-graphite)]">
                          {app.proposed_timeline}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[var(--color-charcoal-primary)]">
                          {app.budget_estimate}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusColors[app.status] as any}>
                          {statusLabels[app.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {app.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(app, 'shortlist')}
                              >
                                Shortlist
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(app, 'reject')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {app.status === 'shortlisted' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAction(app, 'select')}
                              >
                                Select Winner
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(app, 'compensate')}
                              >
                                Compensate
                              </Button>
                            </>
                          )}
                          {(app.status === 'selected' || app.status === 'compensated') && (
                            <span className="text-sm text-[var(--color-ash)]">
                              Completed
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              // Could open a detail modal
                            }}
                            className="p-1 text-[var(--color-ash)] hover:text-[var(--color-charcoal-primary)]"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="p-6">
            <div className="w-12 h-12 bg-[var(--color-sky-blue)]/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[var(--color-sky-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-2">Review Process</h3>
            <p className="text-sm text-[var(--color-graphite)]">
              Review builder applications carefully. Check their portfolios, GitHub profiles, and proposed approaches before making decisions.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 bg-[var(--color-meadow-green)]/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[var(--color-meadow-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-2">Fair Compensation</h3>
            <p className="text-sm text-[var(--color-graphite)]">
              All builders who participate in the hackathon phase receive fair compensation, regardless of whether they win.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 bg-[var(--color-ember-orange)]/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[var(--color-ember-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-2">On-Chain Selection</h3>
            <p className="text-sm text-[var(--color-graphite)]">
              Once a winner is selected, the on-chain contract deployment begins, and milestone-based funding releases.
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Compensation Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[var(--radius-cards)] p-8 max-w-md w-full"
          >
            <h2 className="text-xl font-semibold text-[var(--color-charcoal-primary)] mb-4">
              Compensate Builder
            </h2>
            <p className="text-[var(--color-graphite)] mb-6">
              Enter the compensation amount for {selectedApp.builder_name}. This will be transferred to their wallet.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--color-charcoal-primary)] mb-2">
                Compensation Amount (USD)
              </label>
              <input
                type="text"
                value={compensationAmount}
                onChange={(e) => setCompensationAmount(e.target.value)}
                placeholder="$5,000"
                className="w-full px-4 py-3 bg-white border border-[var(--color-stone-surface)] rounded-[var(--radius-inputs)] font-inter text-[15px] text-[var(--color-charcoal-primary)] focus:outline-none focus:border-[var(--color-ember-orange)]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCompensate}>
                Confirm Compensation
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}