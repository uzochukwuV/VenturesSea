import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen pt-16 bg-[var(--color-warm-canvas)]">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center px-8 py-20">
        <div className="max-w-[1200px] mx-auto text-center">
          <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-ember-orange)] mb-6">
            Bitcoin-Native Venture Capital
          </span>
          <h1 className="font-family text-5xl md:text-6xl lg:text-[68px] font-medium leading-[1.09] tracking-[-2.11px] text-[var(--color-charcoal-primary)] mb-6">
            Earn Yield on Bitcoin.<br />
            <span className="text-[var(--color-ember-orange)]">Fund the Future.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[var(--color-graphite)] leading-relaxed mb-10">
            VenturesSea is a Bitcoin-native venture fund on Mezo testnet. Collateralize your BTC to mint MUSD, 
            earn yield through StabilityPool deposits, and invest in on-chain ventures via DAO governance — 
            all without selling your Bitcoin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <button className="px-8 py-4 bg-[var(--color-midnight)] text-white rounded-[32px] font-inter font-medium text-sm hover:bg-[var(--color-charcoal-primary)] transition-all">
                Open Your Trove
              </button>
            </Link>
            <Link href="/ideas">
              <button className="px-8 py-4 bg-[var(--color-stone-surface)] text-[var(--color-midnight)] rounded-[32px] font-inter font-medium text-sm hover:bg-[var(--color-parchment-card)] transition-all">
                Browse Ventures
              </button>
            </Link>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-[var(--color-charcoal-primary)]">37,527+</div>
              <div className="text-sm text-[var(--color-ash)] mt-1">BTC Locked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-[var(--color-charcoal-primary)]">$77K+</div>
              <div className="text-sm text-[var(--color-ash)] mt-1">BTC/USD Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-[var(--color-charcoal-primary)]">200%+</div>
              <div className="text-sm text-[var(--color-ash)] mt-1">System Health (TCR)</div>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-[var(--color-ash)]">
            MezoBorrowConnector: 0xb06EeC6848B864716824e9fd8Bc1a7914EF84bc3
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-[140px] bg-[var(--color-parchment-card)]">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-sky-blue)] mb-4">
              How It Works
            </span>
            <h2 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-[var(--color-midnight)]">
              BTC-Backed Lending Meets Venture Capital
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Collateralize BTC', desc: 'Lock your Bitcoin as collateral in the Mezo protocol to mint MUSD stablecoin.' },
              { num: '02', title: 'Earn Yield on MUSD', desc: 'Deposit your MUSD into StabilityPool to earn yields from liquidation surpluses.' },
              { num: '03', title: 'Invest in Ventures', desc: 'Use DAO governance to allocate capital to vetted builders and projects.' },
              { num: '04', title: 'Milestone Funding', desc: 'Builders receive funds as they hit milestones, with transparent on-chain tracking.' },
            ].map((step, i) => (
              <div key={i} className="relative p-6 bg-white rounded-[10px] shadow-[inset_0_0_0_1px_rgba(242,240,237,0.9)]">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-[var(--color-ember-orange)] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-charcoal-primary)] mb-2 mt-4">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--color-graphite)] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-[140px]">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-meadow-green)] mb-4">
              Platform Features
            </span>
            <h2 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-[var(--color-midnight)]">
              Built on Bitcoin-native Infrastructure
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Bitcoin-Backed Loans', desc: 'Use your BTC as collateral without selling. Mint MUSD up to 110% collateralization.' },
              { title: 'StabilityPool Yields', desc: 'Earn yields by depositing MUSD. Returns come from liquidation surpluses.' },
              { title: 'DAO Governance', desc: 'Token holders vote on venture funding allocation and project selection.' },
              { title: 'Milestone-Based Funding', desc: 'Funds release as builders hit milestones with on-chain verification.' },
              { title: 'Mezo Testnet Integration', desc: 'Built natively on Mezo chain for Bitcoin-native lending and yield.' },
              { title: 'Transparent On-Chain', desc: 'All operations tracked on-chain for full transparency and auditability.' },
            ].map((feature, i) => (
              <div key={i} className="group p-8 bg-white rounded-[10px] shadow-[inset_0_0_0_1px_rgba(242,240,237,0.9)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-[19px] font-semibold text-[var(--color-charcoal-primary)] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[var(--color-graphite)] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BTC → MUSD → Earn Flow */}
      <section className="py-[140px] bg-[var(--color-midnight)]">
        <div className="max-w-[1200px] mx-auto px-8 text-center">
          <span className="inline-block px-4 py-1.5 bg-[var(--color-stone-surface)] rounded-full text-sm font-medium text-[var(--color-ember-orange)] mb-4">
            Live on Mezo Testnet
          </span>
          <h2 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-white mb-6">
            The SatoshiVentures Flow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            {[
              { title: 'BTC → MUSD', subtitle: 'Collateralize & Borrow', desc: 'Lock BTC as collateral and mint MUSD stablecoin against it.' },
              { title: 'Invest Capital', subtitle: 'DAO Ventures', desc: 'Use minted MUSD to invest in on-chain ventures via DAO governance.' },
              { title: 'MUSD → Earn', subtitle: 'Yield Generation', desc: 'Deposit idle MUSD in StabilityPool to earn liquidation yields.' },
            ].map((flow, i) => (
              <div key={i} className="p-8 bg-[var(--color-charcoal-primary)] rounded-[10px]">
                <div className="text-2xl font-bold text-[var(--color-ember-orange)] mb-2">{flow.title}</div>
                <div className="text-sm font-medium text-[var(--color-fog)] mb-4">{flow.subtitle}</div>
                <p className="text-[var(--color-fog)] text-sm">{flow.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="p-4 bg-[var(--color-charcoal-primary)] rounded-[10px]">
              <div className="text-xl font-bold text-white">$1.27T</div>
              <div className="text-xs text-[var(--color-fog)]">Total MUSD</div>
            </div>
            <div className="p-4 bg-[var(--color-charcoal-primary)] rounded-[10px]">
              <div className="text-xl font-bold text-white">176+ BTC</div>
              <div className="text-xs text-[var(--color-fog)]">SP Yields</div>
            </div>
            <div className="p-4 bg-[var(--color-charcoal-primary)] rounded-[10px]">
              <div className="text-xl font-bold text-white">204</div>
              <div className="text-xs text-[var(--color-fog)]">Active Troves</div>
            </div>
            <div className="p-4 bg-[var(--color-charcoal-primary)] rounded-[10px]">
              <div className="text-xl font-bold text-white">6.75%</div>
              <div className="text-xs text-[var(--color-fog)]">SP Coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-[140px] bg-[var(--color-parchment-card)]">
        <div className="max-w-[1200px] mx-auto px-8 text-center">
          <h2 className="font-family text-4xl md:text-[44px] font-medium leading-[1.09] tracking-[-1.14px] text-[var(--color-midnight)] mb-6">
            Start Earning on Your Bitcoin Today
          </h2>
          <p className="max-w-xl mx-auto text-lg text-[var(--color-graphite)] mb-10">
            Join the Bitcoin-native venture capital ecosystem. Collateralize, earn, and invest — 
            all from your BTC holdings.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <button className="px-8 py-4 bg-[var(--color-ember-orange)] text-white rounded-[32px] font-inter font-medium text-sm hover:opacity-90 transition-all">
                Open Your Trove
              </button>
            </Link>
            <Link href="/ideas">
              <button className="px-8 py-4 bg-[var(--color-stone-surface)] text-[var(--color-midnight)] rounded-[32px] font-inter font-medium text-sm hover:bg-white transition-all">
                Browse Ventures
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
