'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button, Card, Badge, ProgressBar } from '@/components/ui';

interface DashboardData {
  ideas_invested: { id: string; title: string; amount: string; status: string }[];
  total_invested: string;
  pending_reports: { id: string; idea_title: string; period: string }[];
}

export default function DashboardPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for wallet connection
    const address = localStorage.getItem('wallet_address');
    setWalletAddress(address);

    // Mock dashboard data
    const mockData: DashboardData = {
      ideas_invested: [
        { id: '1', title: 'DeFi Lending Protocol', amount: '5000', status: 'building_phase' },
        { id: '2', title: 'NFT Marketplace V2', amount: '2500', status: 'builders_selected' },
      ],
      total_invested: '7500',
      pending_reports: [
        { id: '1', idea_title: 'DeFi Lending Protocol', period: 'Q1 2024' },
      ],
    };

    setDashboardData(mockData);
    setLoading(false);
  }, []);

  const handleConnect = () => {
    // Mock wallet connection - in production, connect to MetaMask
    const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2b123';
    localStorage.setItem('wallet_address', mockAddress);
    setWalletAddress(mockAddress);
    window.location.reload();
  };

  const handleDisconnect = () => {
    localStorage.removeItem('wallet_address');
    setWalletAddress(null);
    window.location.reload();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)] flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="w-24 h-24 bg-[var(--color-stone-surface)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-[var(--color-ash)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-family font-medium text-[var(--color-charcoal-primary)] mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-[var(--color-graphite)] mb-8">
            Connect your wallet to view your investments, track project progress, and manage your portfolio.
          </p>
          <Button variant="primary" size="lg" onClick={handleConnect}>
            Connect Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)]">
      <div className="max-w-[1200px] mx-auto px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div>
            <h1 className="font-family text-4xl font-medium text-[var(--color-charcoal-primary)] mb-2">
              Dashboard
            </h1>
            <p className="text-[var(--color-graphite)]">
              Welcome back, {formatAddress(walletAddress)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-stone-surface)] rounded-full">
              <div className="w-2 h-2 bg-[var(--color-meadow-green)] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[var(--color-graphite)]">
                Connected
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--color-sky-blue)]/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-sky-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[var(--color-charcoal-primary)]">
                  ${dashboardData?.total_invested || '0'}
                </div>
                <div className="text-sm text-[var(--color-ash)]">Total Invested</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--color-meadow-green)]/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-meadow-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[var(--color-charcoal-primary)]">
                  {dashboardData?.ideas_invested.length || 0}
                </div>
                <div className="text-sm text-[var(--color-ash)]">Ideas Funded</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--color-ember-orange)]/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--color-ember-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[var(--color-charcoal-primary)]">
                  {dashboardData?.pending_reports.length || 0}
                </div>
                <div className="text-sm text-[var(--color-ash)]">Pending Reports</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Investments List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-charcoal-primary)]">
                Your Investments
              </h2>
              <Link href="/ideas">
                <Button variant="ghost" size="sm">
                  Browse More →
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {dashboardData?.ideas_invested.map((idea, i) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <Link href={`/ideas/${idea.id}`}>
                    <Card hoverable className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-1">
                            {idea.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-[var(--color-ash)]">
                            <span>Invested: ${parseInt(idea.amount).toLocaleString()}</span>
                            <Badge variant="blue" size="sm">
                              {idea.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-[var(--color-ash)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Reports */}
            <Card className="p-6">
              <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-4">
                Revenue Reports to Acknowledge
              </h3>
              {dashboardData?.pending_reports.length === 0 ? (
                <p className="text-sm text-[var(--color-ash)]">No pending reports</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData?.pending_reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-[var(--color-stone-surface)] rounded-[var(--radius-lg)]"
                    >
                      <div className="font-medium text-[var(--color-charcoal-primary)] text-sm mb-1">
                        {report.idea_title}
                      </div>
                      <div className="text-xs text-[var(--color-ash)] mb-2">{report.period}</div>
                      <Button variant="outline" size="sm" className="w-full">
                        Acknowledge
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link href="/ideas" className="block">
                  <Button variant="secondary" className="w-full justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Explore Ideas
                  </Button>
                </Link>
                <Link href="/apply" className="block">
                  <Button variant="secondary" className="w-full justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Apply as Builder
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}