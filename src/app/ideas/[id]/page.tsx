'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button, Card, Badge, ProgressBar, Avatar } from '@/components/ui';
import { BuilderDeliveryPanel, GovernanceActionPanel, IdeaOnChainPanel, InvestorActionPanel } from '@/components/contracts/IdeaFiPanels';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  target_funding: string;
  soft_cap: string;
  status: string;
  creator_address: string;
}

interface Application {
  id: string;
  builder_name: string;
  builder_email: string;
  pitch_message: string;
  proposed_timeline: string;
  budget_estimate: string;
  status: string;
  created_at: string;
}

export default function IdeaDetailPage() {
  const params = useParams();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invest' | 'govern' | 'build' | 'applications' | 'milestones'>('overview');

  useEffect(() => {
    // Mock data - in production, fetch from Supabase
    const mockIdea: Idea = {
      id: params.id as string,
      title: 'DeFi Lending Protocol',
      description: 'A decentralized lending platform enabling peer-to-peer borrowing with variable interest rates and collateral management. Features automatic liquidation and governance-controlled risk parameters.\n\nThis protocol will enable users to:\n- Lock collateral and borrow against it\n- Set custom interest rates\n- Participate in liquidity mining programs\n- Vote on protocol upgrades via IdeaDAO',
      category: 'defi',
      target_funding: '50000',
      soft_cap: '25000',
      status: 'open_for_applications',
      creator_address: '0x1234...5678',
    };

    const mockApplications: Application[] = [
      {
        id: '1',
        builder_name: 'Alex Chen',
        builder_email: 'alex@example.com',
        pitch_message: 'I have 5+ years of experience building DeFi protocols. Previously worked at Aave and Compound. I will implement a robust liquidation engine with oracle fallback mechanisms.',
        proposed_timeline: '2-3 months',
        budget_estimate: '$35,000',
        status: 'shortlisted',
        created_at: '2024-01-15',
      },
      {
        id: '2',
        builder_name: 'Sarah Kim',
        builder_email: 'sarah@example.com',
        pitch_message: 'Full-stack developer with expertise in Solidity and React. Built three DeFi integrations and have a strong understanding of financial primitives.',
        proposed_timeline: '1-2 months',
        budget_estimate: '$28,000',
        status: 'pending',
        created_at: '2024-01-14',
      },
      {
        id: '3',
        builder_name: 'Marcus Johnson',
        builder_email: 'marcus@example.com',
        pitch_message: 'DeFi native with experience building lending protocols. Created a Yield Optimizer that managed $2M TVL. Strong focus on security and gas optimization.',
        proposed_timeline: '2-4 weeks',
        budget_estimate: '$40,000',
        status: 'pending',
        created_at: '2024-01-13',
      },
    ];

    setIdea(mockIdea);
    setApplications(mockApplications);
    setLoading(false);
  }, [params.id]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const statusColors: Record<string, string> = {
    pending: 'default',
    shortlisted: 'yellow',
    selected: 'green',
    rejected: 'default',
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-stone-surface)] border-t-[var(--color-ember-orange)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-ash)]">Loading idea details...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--color-charcoal-primary)] mb-2">Idea not found</h2>
          <p className="text-[var(--color-ash)] mb-6">The idea you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/ideas">
            <Button variant="primary">Browse Ideas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className={`
          h-64 md:h-80
          bg-gradient-to-br from-[var(--color-sky-blue)] to-[var(--color-ocean-blue)]
        `}>
          <div className="absolute inset-0 bg-black/10" />
        </div>
        
        <div className="max-w-[1200px] mx-auto px-8 -mt-32 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="blue" className="mb-4">
              {idea.status === 'open_for_applications' ? 'Open for Applications' : idea.status}
            </Badge>
            
            <h1 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-white mb-4">
              {idea.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {idea.category.toUpperCase()}
              </span>
              <span className="text-sm">Creator: {formatAddress(idea.creator_address)}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-[var(--color-stone-surface)]">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'invest', label: 'Invest' },
                  { key: 'govern', label: 'Govern' },
                  { key: 'build', label: 'Build' },
                  { key: 'applications', label: `Applications (${applications.length})` },
                  { key: 'milestones', label: 'Milestones' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`
                      px-6 py-3 text-sm font-medium transition-colors
                      ${activeTab === tab.key
                        ? 'text-[var(--color-ember-orange)] border-b-2 border-[var(--color-ember-orange)]'
                        : 'text-[var(--color-ash)] hover:text-[var(--color-graphite)]'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  {/* Description */}
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--color-charcoal-primary)] mb-4">About This Project</h2>
                    <div className="prose prose-sm max-w-none">
                      {idea.description.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="text-[var(--color-graphite)] mb-4">{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* Hackathon Section */}
                  <Card className="bg-gradient-to-br from-[var(--color-ember-orange)]/5 to-transparent border border-[var(--color-ember-orange)]/20">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[var(--color-ember-orange)] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-charcoal-primary)] mb-2">
                          Hackathon-Style Builder Selection
                        </h3>
                        <p className="text-[var(--color-graphite)] mb-4">
                          This idea is currently accepting builder applications. The selection process follows a hackathon model:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--color-graphite)]">
                          <li>Builders submit applications with their pitch and proposed approach</li>
                          <li>Community votes to shortlist top builders</li>
                          <li>Selected builders receive upfront compensation and build prototypes</li>
                          <li>Winner is selected and on-chain deployment begins</li>
                          <li>Non-winners receive fair participation compensation</li>
                        </ol>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}


              {activeTab === 'invest' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <IdeaOnChainPanel ideaId={params.id as string} />
                  <InvestorActionPanel ideaId={params.id as string} />
                </motion.div>
              )}

              {activeTab === 'govern' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <IdeaOnChainPanel ideaId={params.id as string} />
                  <GovernanceActionPanel ideaId={params.id as string} />
                </motion.div>
              )}

              {activeTab === 'build' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <IdeaOnChainPanel ideaId={params.id as string} />
                  <BuilderDeliveryPanel ideaId={params.id as string} />
                </motion.div>
              )}

              {activeTab === 'applications' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--color-charcoal-primary)]">
                      Builder Applications
                    </h2>
                    {idea.status === 'open_for_applications' && (
                      <Link href="/apply">
                        <Button variant="primary" size="sm">
                          Apply Now
                        </Button>
                      </Link>
                    )}
                  </div>

                  {applications.map((app, i) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar name={app.builder_name} size="lg" />
                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-[var(--color-charcoal-primary)]">
                                {app.builder_name}
                              </h3>
                              <Badge variant={statusColors[app.status] as any}>
                                {app.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-[var(--color-graphite)] mb-4">
                              {app.pitch_message}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1 text-[var(--color-ash)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {app.proposed_timeline}
                              </div>
                              <div className="flex items-center gap-1 text-[var(--color-ash)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {app.budget_estimate}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'milestones' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-[var(--color-fog)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-[var(--color-charcoal-primary)] mb-2">
                      Milestones Will Appear Here
                    </h3>
                    <p className="text-[var(--color-ash)]">
                      Once a builder is selected and the project begins, milestones will be tracked here.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-6">
              {/* Funding Card */}
              <Card className="p-6">
                <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-4">Funding Details</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--color-ash)]">Target</span>
                      <span className="font-semibold text-[var(--color-charcoal-primary)]">
                        ${parseInt(idea.target_funding).toLocaleString()}
                      </span>
                    </div>
                    <ProgressBar value={0} max={100} showPercentage />
                  </div>
                  <div className="pt-4 border-t border-[var(--color-stone-surface)]">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-semibold text-[var(--color-charcoal-primary)]">
                          ${parseInt(idea.soft_cap).toLocaleString()}
                        </div>
                        <div className="text-xs text-[var(--color-ash)]">Soft Cap</div>
                      </div>
                      <div>
                        <div className="text-2xl font-semibold text-[var(--color-charcoal-primary)]">
                          $0
                        </div>
                        <div className="text-xs text-[var(--color-ash)]">Raised</div>
                      </div>
                    </div>
                  </div>
                  {idea.status === 'open_for_applications' ? (
                    <Link href="/apply" className="block">
                      <Button variant="primary" className="w-full">
                        Apply as Builder
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="secondary" className="w-full" disabled>
                      Applications Closed
                    </Button>
                  )}
                </div>
              </Card>

              {/* Info Card */}
              <Card className="p-6">
                <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-4">Project Info</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ash)]">Category</dt>
                    <dd className="font-medium text-[var(--color-charcoal-primary)] uppercase">
                      {idea.category}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ash)]">Status</dt>
                    <dd className="font-medium text-[var(--color-charcoal-primary)]">
                      {idea.status.replace(/_/g, ' ')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ash)]">Created</dt>
                    <dd className="font-medium text-[var(--color-charcoal-primary)]">
                      Jan 15, 2024
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}