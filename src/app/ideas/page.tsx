'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button, Card, Badge } from '@/components/ui';
import { CreateIdeaPanel, DeploymentStatusPanel } from '@/components/contracts/IdeaFiPanels';
import { supabase, fetchIdeas } from '@/lib/supabase';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  target_funding: string;
  status: string;
  created_at: string;
}

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'defi', label: 'DeFi' },
  { value: 'nft', label: 'NFT' },
  { value: 'dao', label: 'DAO & Governance' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'social', label: 'Social & Identity' },
];

const statusColors: Record<string, string> = {
  draft: 'default',
  open_for_applications: 'blue',
  builders_selected: 'yellow',
  building_phase: 'green',
  voting_open: 'orange',
  winner_selected: 'green',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'default',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  open_for_applications: 'Open for Applications',
  builders_selected: 'Builders Selected',
  building_phase: 'Building Phase',
  voting_open: 'Voting Open',
  winner_selected: 'Winner Selected',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    async function loadIdeas() {
      setLoading(true);
      try {
        const { data, error } = await fetchIdeas({
          status: 'open_for_applications',
          ...(selectedCategory && { category: selectedCategory }),
        });
        
        if (error) throw error;
        
        // For demo purposes, use mock data if Supabase returns empty
        const mockIdeas: Idea[] = [
          {
            id: '1',
            title: 'DeFi Lending Protocol',
            description: 'A decentralized lending platform enabling peer-to-peer borrowing with variable interest rates and collateral management. Features automatic liquidation and governance-controlled risk parameters.',
            category: 'defi',
            target_funding: '50000',
            status: 'open_for_applications',
            created_at: '2024-01-15',
          },
          {
            id: '2',
            title: 'NFT Marketplace V2',
            description: 'Next-generation NFT marketplace with lazy minting, batch auctions, and creator royalty enforcement. Built for mainstream adoption with fiat on-ramps.',
            category: 'nft',
            target_funding: '35000',
            status: 'builders_selected',
            created_at: '2024-01-10',
          },
          {
            id: '3',
            title: 'DAO Governance Toolkit',
            description: 'A comprehensive toolkit for DAOs to manage proposals, voting, delegation, and treasury management. Includes quadratic voting and conviction voting modules.',
            category: 'dao',
            target_funding: '40000',
            status: 'open_for_applications',
            created_at: '2024-01-08',
          },
          {
            id: '4',
            title: 'GameFi Asset Marketplace',
            description: 'Cross-chain marketplace for gaming assets, enabling players to trade, lease, and fractionalize in-game items across multiple game ecosystems.',
            category: 'gaming',
            target_funding: '45000',
            status: 'building_phase',
            created_at: '2024-01-05',
          },
          {
            id: '5',
            title: 'ZK-Proof Infrastructure',
            description: 'Zero-knowledge proof verification layer for privacy-preserving transactions. Provides SDK for developers to integrate ZK proofs into any application.',
            category: 'infrastructure',
            target_funding: '60000',
            status: 'open_for_applications',
            created_at: '2024-01-03',
          },
          {
            id: '6',
            title: 'Decentralized Identity Hub',
            description: 'Self-sovereign identity platform enabling users to control their digital credentials across web3. Includes reputation system and verifiable credentials.',
            category: 'social',
            target_funding: '55000',
            status: 'winner_selected',
            created_at: '2023-12-28',
          },
        ];
        
        setIdeas(data?.length ? data as unknown as Idea[] : mockIdeas);
      } catch (err) {
        console.error('Error loading ideas:', err);
      } finally {
        setLoading(false);
      }
    }

    loadIdeas();
  }, [selectedCategory]);

  const formatFunding = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num}`;
  };

  return (
    <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)]">
      {/* Header */}
      <section className="py-16 border-b border-[var(--color-stone-surface)]">
        <div className="max-w-[1200px] mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-sky-blue)] mb-4">
              Explore Opportunities
            </span>
            <h1 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-[var(--color-midnight)] mb-4">
              Discover & Fund Ideas
            </h1>
            <p className="text-[var(--color-graphite)] max-w-xl mx-auto">
              Browse through innovative project ideas seeking builders and funding. 
              Your investment helps turn concepts into reality.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter & Ideas */}
      <section className="py-12">
        <div className="max-w-[1200px] mx-auto px-8">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center gap-4 mb-10"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-ash)]">Filter by:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${selectedCategory === cat.value
                      ? 'bg-[var(--color-ember-orange)] text-white'
                      : 'bg-[var(--color-stone-surface)] text-[var(--color-graphite)] hover:bg-[var(--color-parchment-card)]'
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </motion.div>

    
      <section className="py-12">
        <div className="max-w-[1200px] mx-auto px-8 space-y-6">
          <DeploymentStatusPanel />
          <CreateIdeaPanel />
        </div>
      </section>

      {/* Ideas Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-0 overflow-hidden">
                  <div className="h-48 bg-[var(--color-stone-surface)] animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-[var(--color-stone-surface)] rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-[var(--color-stone-surface)] rounded animate-pulse w-full" />
                    <div className="h-4 bg-[var(--color-stone-surface)] rounded animate-pulse w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-[var(--color-fog)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-lg font-semibold text-[var(--color-charcoal-primary)] mb-2">
                No ideas found
              </h3>
              <p className="text-[var(--color-ash)]">
                Try adjusting your filters or check back later for new opportunities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ideas.map((idea, i) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  <Link href={`/ideas/${idea.id}`} className="block h-full">
                    <Card 
                      hoverable 
                      className="h-full flex flex-col"
                      padding="none"
                    >
                      {/* Card Image/Color Block */}
                      <div className={`
                        h-48 relative
                        ${idea.category === 'defi' ? 'bg-gradient-to-br from-[var(--color-sky-blue)] to-[var(--color-ocean-blue)]' :
                          idea.category === 'nft' ? 'bg-gradient-to-br from-[var(--color-flamingo)] to-[var(--color-violet-pop)]' :
                          idea.category === 'dao' ? 'bg-gradient-to-br from-[var(--color-ember-orange)] to-[var(--color-coral-red)]' :
                          idea.category === 'gaming' ? 'bg-gradient-to-br from-[var(--color-meadow-green)] to-[var(--color-spearmint)]' :
                          idea.category === 'infrastructure' ? 'bg-gradient-to-br from-[var(--color-sunburst-yellow)] to-[var(--color-deep-amber)]' :
                          'bg-gradient-to-br from-[var(--color-sky-blue)] to-[var(--color-ice-blue)]'}
                      `}>
                        <div className="absolute top-4 left-4">
                          <Badge variant={statusColors[idea.status] as any}>
                            {statusLabels[idea.status]}
                          </Badge>
                        </div>
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                          <span className="font-semibold text-[var(--color-charcoal-primary)]">
                            {formatFunding(idea.target_funding)}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-[var(--color-stone-surface)] rounded-full text-xs font-medium text-[var(--color-graphite)] uppercase">
                            {idea.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-charcoal-primary)] mb-2 line-clamp-1">
                          {idea.title}
                        </h3>
                        <p className="text-sm text-[var(--color-graphite)] line-clamp-3 flex-grow">
                          {idea.description}
                        </p>
                        <div className="mt-4 pt-4 border-t border-[var(--color-stone-surface)]">
                          <Button variant="ghost" size="sm" className="w-full justify-center">
                            View Details →
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[var(--color-parchment-card)]">
        <div className="max-w-[1200px] mx-auto px-8 text-center">
          <h2 className="font-family text-3xl font-medium text-[var(--color-charcoal-primary)] mb-4">
            Have an idea you want to build?
          </h2>
          <p className="text-[var(--color-graphite)] mb-6 max-w-lg mx-auto">
            Submit your project idea and connect with talented builders from our community.
          </p>
          <Link href="/ideas">
            <Button variant="primary" size="lg">
              Submit Your Idea
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}