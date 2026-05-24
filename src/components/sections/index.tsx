'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

// ============================================
// DECORATIVE ILLUSTRATION CHARACTERS
// ============================================

interface CharacterProps {
  className?: string;
}

const CharacterOrange: React.FC<CharacterProps> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="55" rx="35" ry="30" fill="var(--color-ember-orange)" />
    <circle cx="38" cy="48" r="5" fill="white" />
    <circle cx="62" cy="48" r="5" fill="white" />
    <circle cx="38" cy="48" r="2" fill="var(--color-pepper)" />
    <circle cx="62" cy="48" r="2" fill="var(--color-pepper)" />
    <path d="M40 65 Q50 75 60 65" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    <line x1="35" y1="85" x2="30" y2="95" stroke="var(--color-ember-orange)" strokeWidth="4" strokeLinecap="round" />
    <line x1="65" y1="85" x2="70" y2="95" stroke="var(--color-ember-orange)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const CharacterGreen: React.FC<CharacterProps> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="50" rx="30" ry="35" fill="var(--color-meadow-green)" />
    <circle cx="40" cy="42" r="4" fill="white" />
    <circle cx="60" cy="42" r="4" fill="white" />
    <circle cx="40" cy="42" r="1.5" fill="var(--color-pepper)" />
    <circle cx="60" cy="42" r="1.5" fill="var(--color-pepper)" />
    <path d="M45 58 Q50 62 55 58" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="70" cy="30" r="12" fill="var(--color-sky-blue)" />
    <line x1="40" y1="85" x2="35" y2="95" stroke="var(--color-meadow-green)" strokeWidth="4" strokeLinecap="round" />
    <line x1="60" y1="85" x2="65" y2="95" stroke="var(--color-meadow-green)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const CharacterBlue: React.FC<CharacterProps> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="55" rx="32" ry="28" fill="var(--color-sky-blue)" />
    <circle cx="40" cy="50" r="4" fill="white" />
    <circle cx="60" cy="50" r="4" fill="white" />
    <circle cx="40" cy="50" r="1.5" fill="var(--color-pepper)" />
    <circle cx="60" cy="50" r="1.5" fill="var(--color-pepper)" />
    <path d="M42 62 Q50 68 58 62" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    <line x1="35" y1="83" x2="30" y2="95" stroke="var(--color-sky-blue)" strokeWidth="4" strokeLinecap="round" />
    <line x1="65" y1="83" x2="70" y2="95" stroke="var(--color-sky-blue)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const CharacterYellow: React.FC<CharacterProps> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="50" rx="28" ry="32" fill="var(--color-sunburst-yellow)" />
    <circle cx="42" cy="45" r="3" fill="white" />
    <circle cx="58" cy="45" r="3" fill="white" />
    <circle cx="42" cy="45" r="1" fill="var(--color-pepper)" />
    <circle cx="58" cy="45" r="1" fill="var(--color-pepper)" />
    <path d="M46 58 Q50 62 54 58" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    <line x1="40" y1="82" x2="35" y2="95" stroke="var(--color-sunburst-yellow)" strokeWidth="4" strokeLinecap="round" />
    <line x1="60" y1="82" x2="65" y2="95" stroke="var(--color-sunburst-yellow)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const Coin: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 60 60" fill="none">
    <circle cx="30" cy="30" r="28" fill="var(--color-sunburst-yellow)" stroke="var(--color-deep-amber)" strokeWidth="2" />
    <circle cx="30" cy="30" r="20" stroke="var(--color-deep-amber)" strokeWidth="2" fill="none" />
    <text x="30" y="38" textAnchor="middle" fill="var(--color-deep-amber)" fontSize="24" fontWeight="bold">$</text>
  </svg>
);

// ============================================
// FEATURE CARD COMPONENT
// ============================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.19, 1, 0.22, 1] }}
    className="group p-8 bg-white rounded-[var(--radius-cards)] shadow-[inset_0_0_0_1px_rgba(242,240,237,0.9)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-1 transition-all duration-300"
  >
    <div className="w-14 h-14 bg-[var(--color-stone-surface)] rounded-[var(--radius-icons)] flex items-center justify-center mb-6 group-hover:bg-[var(--color-ember-orange)] group-hover:text-white transition-colors duration-300">
      {icon}
    </div>
    <h3 className="text-[var(--text-heading-sm)] font-semibold text-[var(--color-charcoal-primary)] mb-3">
      {title}
    </h3>
    <p className="text-[var(--color-graphite)] leading-relaxed">
      {description}
    </p>
  </motion.div>
);

// ============================================
// HERO SECTION
// ============================================

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-[var(--color-ember-orange)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-[var(--color-sky-blue)]/5 rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[5%] w-48 h-48 bg-[var(--color-meadow-green)]/5 rounded-full blur-2xl" />
      </div>

      {/* Characters floating around */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] left-[8%] hidden lg:block"
      >
        <CharacterOrange className="w-20 h-20" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-[25%] right-[12%] hidden lg:block"
      >
        <CharacterGreen className="w-16 h-16" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -25, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[30%] left-[5%] hidden lg:block"
      >
        <Coin className="w-14 h-14" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -18, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        className="absolute top-[60%] right-[8%] hidden lg:block"
      >
        <CharacterYellow className="w-14 h-14" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -22, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute bottom-[15%] right-[20%] hidden lg:block"
      >
        <CharacterBlue className="w-18 h-18" />
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
        >
          {/* Eyebrow */}
          <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-ember-orange)] mb-6">
            Hackathon-style Builder Selection
          </span>

          {/* Main headline */}
          <h1 className="font-family text-6xl md:text-7xl lg:text-[68px] font-medium leading-[1.09] tracking-[-2.11px] text-[var(--color-charcoal-primary)] mb-6">
            Where Great Ideas
            <br />
            <span className="text-[var(--color-ember-orange)]">Meet Builders</span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[var(--color-graphite)] leading-relaxed mb-10">
            Avax Ventures connects visionary founders with talented builders through 
            community-driven funding and transparent governance. Your idea, their skills, 
            everyone&apos;s reward.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/ideas">
              <Button variant="primary" size="lg" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              }>
                Explore Ideas
              </Button>
            </Link>
            <Link href="/apply">
              <Button variant="secondary" size="lg" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              }>
                Apply as Builder
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto"
          >
            {[
              { value: '$2.4M+', label: 'Total Funded' },
              { value: '48', label: 'Ideas Launched' },
              { value: '156', label: 'Builders Connected' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-semibold text-[var(--color-charcoal-primary)]">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--color-ash)] mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <svg className="w-6 h-6 text-[var(--color-ash)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </section>
  );
};

// ============================================
// HOW IT WORKS SECTION
// ============================================

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Submit Your Idea',
      description: 'Founders submit project proposals with clear scope, timeline, and budget. Community reviews and discusses potential.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Builder Applications',
      description: 'Talented builders apply off-chain through our platform. They submit portfolios, pitch ideas, and propose timelines.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Hackathon Selection',
      description: 'Community votes to shortlist builders. Selected builders get a small upfront compensation and build their prototypes.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      number: '04',
      title: 'Winner & On-Chain',
      description: 'Community selects the winning builder. On-chain contracts deploy, funding unlocks, and milestone-based development begins.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-[140px] bg-[var(--color-parchment-card)]">
      <div className="max-w-[1200px] mx-auto px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-sky-blue)] mb-4">
            How It Works
          </span>
          <h2 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-[var(--color-midnight)]">
            From Idea to Reality
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-[var(--color-graphite)]">
            A transparent, community-driven process that ensures the best builders get selected and compensated fairly.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.19, 1, 0.22, 1] }}
              className="relative p-6 bg-white rounded-[var(--radius-cards)] shadow-[inset_0_0_0_1px_rgba(242,240,237,0.9)]"
            >
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-[var(--color-ember-orange)] rounded-full flex items-center justify-center text-white font-bold text-lg">
                {step.number}
              </div>
              <div className="w-12 h-12 bg-[var(--color-stone-surface)] rounded-[var(--radius-icons)] flex items-center justify-center mb-4 mt-4">
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-charcoal-primary)] mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[var(--color-graphite)] leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// FEATURES SECTION
// ============================================

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      title: 'Community-Driven Selection',
      description: 'Token holders vote on builder applications, ensuring merit-based selection with transparent governance.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Milestone-Based Funding',
      description: 'Funds release gradually as builders hit agreed milestones, protecting investor capital and incentivizing delivery.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      title: 'Fair Compensation',
      description: 'All builders receive fair compensation, whether selected as winner or compensated for participation in the hackathon.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Secondary Market Trading',
      description: 'Idea tokens can be traded on the secondary market, allowing early investors to exit and new investors to join.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      title: 'Decentralized Governance',
      description: 'The IdeaDAO manages the project through on-chain voting, ensuring no single point of control.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Revenue Sharing',
      description: 'Investors receive a share of project revenue through periodic revenue reports and acknowledgments.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-[140px]">
      <div className="max-w-[1200px] mx-auto px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-meadow-green)] mb-4">
            Platform Features
          </span>
          <h2 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-[var(--color-midnight)]">
            Built for Creators
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-[var(--color-graphite)]">
            Everything you need to launch, fund, and govern your next big idea.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// CTA SECTION
// ============================================

export const CTASection: React.FC = () => {
  return (
    <section className="py-[140px] bg-[var(--color-midnight)] relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      <div className="max-w-[1200px] mx-auto px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-white mb-6">
            Ready to Launch Your Idea?
          </h2>
          <p className="max-w-xl mx-auto text-lg text-[var(--color-fog)] mb-10">
            Join the community of founders and builders creating the next generation of decentralized applications.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/ideas">
              <Button 
                variant="primary" 
                size="lg"
                className="bg-[var(--color-ember-orange)] hover:bg-[var(--color-ember-orange)]/90"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
              >
                Submit Your Idea
              </Button>
            </Link>
            <Link href="/apply">
              <Button variant="secondary" size="lg" className="bg-[var(--color-stone-surface)] hover:bg-[var(--color-parchment-card)]">
                Apply as Builder
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// EXPORT ALL
// ============================================

export {
  HeroSection,
  HowItWorksSection,
  FeaturesSection,
  CTASection,
};