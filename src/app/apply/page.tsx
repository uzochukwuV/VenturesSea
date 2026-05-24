'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Textarea, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface FormData {
  builder_name: string;
  builder_email: string;
  builder_github: string;
  portfolio_url: string;
  pitch_message: string;
  proposed_timeline: string;
  budget_estimate: string;
  idea_id: string;
}

export default function ApplyPage() {
  const [formData, setFormData] = useState<FormData>({
    builder_name: '',
    builder_email: '',
    builder_github: '',
    portfolio_url: '',
    pitch_message: '',
    proposed_timeline: '',
    budget_estimate: '',
    idea_id: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Get wallet address from localStorage (mock for now)
      const walletAddress = localStorage.getItem('wallet_address') || '0x0000000000000000000000000000000000000000';

      const { data, error } = await supabase
        .from('builder_applications')
        .insert([{
          idea_id: formData.idea_id,
          builder_address: walletAddress,
          builder_name: formData.builder_name,
          builder_email: formData.builder_email,
          builder_github: formData.builder_github || null,
          portfolio_url: formData.portfolio_url || null,
          pitch_message: formData.pitch_message,
          proposed_timeline: formData.proposed_timeline,
          budget_estimate: formData.budget_estimate,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)] flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg text-center"
        >
          <div className="w-20 h-20 bg-[var(--color-meadow-green)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-family font-medium text-[var(--color-charcoal-primary)] mb-4">
            Application Submitted!
          </h1>
          <p className="text-[var(--color-graphite)] mb-8">
            Thank you for applying to become a builder. Our team will review your application 
            and get back to you within 3-5 business days. Good luck!
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/ideas'}>
            Browse More Ideas
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)]">
      <div className="max-w-[800px] mx-auto px-8 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-ember-orange)] mb-4">
            Join as Builder
          </span>
          <h1 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-[var(--color-midnight)] mb-4">
            Apply to Build
          </h1>
          <p className="text-[var(--color-graphite)] max-w-lg mx-auto">
            Showcase your skills and get selected to build the next generation of decentralized applications.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Idea Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-charcoal-primary)] mb-2">
                  Select Idea <span className="text-[var(--color-coral-red)]">*</span>
                </label>
                <select
                  name="idea_id"
                  value={formData.idea_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border border-[var(--color-stone-surface)] rounded-[var(--radius-inputs)] font-inter text-[15px] text-[var(--color-charcoal-primary)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                >
                  <option value="">Select an idea to build for...</option>
                  <option value="demo-idea-1">DeFi Lending Protocol - $50K budget</option>
                  <option value="demo-idea-2">NFT Marketplace - $35K budget</option>
                  <option value="demo-idea-3">DAO Governance Tool - $40K budget</option>
                </select>
                <p className="mt-2 text-xs text-[var(--color-ash)]">
                  Browse ideas on the Explore page to find projects that match your skills.
                </p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Your Name"
                  name="builder_name"
                  value={formData.builder_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
                <Input
                  label="Email Address"
                  name="builder_email"
                  type="email"
                  value={formData.builder_email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                />
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="GitHub Profile"
                  name="builder_github"
                  value={formData.builder_github}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />
                <Input
                  label="Portfolio / Website"
                  name="portfolio_url"
                  value={formData.portfolio_url}
                  onChange={handleChange}
                  placeholder="https://yourportfolio.com"
                />
              </div>

              {/* Pitch Message */}
              <Textarea
                label="Why should you be selected?"
                name="pitch_message"
                value={formData.pitch_message}
                onChange={handleChange}
                placeholder="Tell us about your relevant experience, what makes you the best fit for this project, and how you plan to approach the build..."
                required
              />

              {/* Timeline & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-charcoal-primary)] mb-2">
                    Proposed Timeline <span className="text-[var(--color-coral-red)]">*</span>
                  </label>
                  <select
                    name="proposed_timeline"
                    value={formData.proposed_timeline}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-[var(--color-stone-surface)] rounded-[var(--radius-inputs)] font-inter text-[15px] text-[var(--color-charcoal-primary)] focus:outline-none focus:border-[var(--color-ember-orange)]"
                  >
                    <option value="">Select timeline...</option>
                    <option value="2-4 weeks">2-4 weeks</option>
                    <option value="1-2 months">1-2 months</option>
                    <option value="2-3 months">2-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                  </select>
                </div>
                <Input
                  label="Budget Estimate (USD)"
                  name="budget_estimate"
                  value={formData.budget_estimate}
                  onChange={handleChange}
                  placeholder="$25,000"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-[var(--color-coral-red)]/10 border border-[var(--color-coral-red)]/20 rounded-[var(--radius-lg)] text-[var(--color-coral-red)] text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-[var(--color-ash)]">
                  By submitting, you agree to our Terms of Service and Privacy Policy.
                </p>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: 'Fair Compensation',
              description: 'All builders receive compensation, whether selected as winner or compensated for participation.',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'Transparent Selection',
              description: 'Community voting ensures merit-based selection with full transparency.',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              title: 'Milestone Payments',
              description: 'Get paid incrementally as you hit agreed milestones in the project.',
            },
          ].map((item, i) => (
            <Card key={i} className="p-6 text-center">
              <div className="w-12 h-12 bg-[var(--color-stone-surface)] rounded-[var(--radius-icons)] flex items-center justify-center mx-auto mb-4 text-[var(--color-ember-orange)]">
                {item.icon}
              </div>
              <h3 className="font-semibold text-[var(--color-charcoal-primary)] mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--color-graphite)]">{item.description}</p>
            </Card>
          ))}
        </motion.div>
      </div>
    </div>
  );
}