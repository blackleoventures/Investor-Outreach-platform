"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Zap, Target, BarChart3, Users, Briefcase, Rocket, CheckCircle, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNavigation = (type: 'founder' | 'investor') => {
    setLoading(true);
    router.push(`/login?role=${type}`);
  };

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 font-sans selection:bg-brand-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/70 backdrop-blur-xl border-b border-surface-200/50 transition-all duration-300" data-testid="nav-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <button
              type="button"
              onClick={() => router.push('/')}
              aria-label="Black Leo Venture home"
              className="flex items-center gap-3 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              data-testid="text-logo"
            >
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-2 rounded-xl shadow-lg shadow-brand-500/20">
                <TrendingUp size={22} strokeWidth={2.5} aria-hidden="true" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-surface-900 to-surface-700">
                Black Leo Venture
              </span>
            </button>
            <div className="hidden md:flex items-center space-x-8">
              <a href="/login" className="text-sm font-semibold text-surface-600 hover:text-brand-600 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">Sign In</a>
              <button
                onClick={() => router.push('/login')}
                className="bg-surface-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-600 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
            <div aria-hidden="true" className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob motion-reduce:animate-none"></div>
            <div aria-hidden="true" className="absolute top-[20%] right-[-10%] w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob motion-reduce:animate-none" style={{ animationDelay: '2s' }}></div>
          </div>

          <div className="relative max-w-5xl mx-auto text-center z-10 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-sm font-semibold mb-8 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600"></span>
              </span>
              Now analyzing 500+ premium deals
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-surface-950 mb-8 leading-[1.1]" data-testid="text-hero-title">
              Smarter Deal Flow.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-500 to-violet-600">Powered by AI.</span>
            </h1>

            <p className="text-xl sm:text-2xl text-surface-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light" data-testid="text-hero-subtitle">
              Streamline your investment process with instant pitch deck analysis, predictive scoring, and deep diligence insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-20">
              <button
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 text-white rounded-2xl font-semibold text-lg hover:bg-brand-700 transition-all duration-300 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-1 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleNavigation('investor')}
                disabled={loading}
                aria-busy={loading}
              >
                <Briefcase size={22} aria-hidden="true" />
                <span>Join as Investor</span>
                <ArrowRight size={18} aria-hidden="true" className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </button>
              <button
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-surface-900 border border-surface-200 rounded-2xl font-semibold text-lg hover:border-brand-300 hover:bg-brand-50 transition-all duration-300 shadow-sm hover:shadow-md w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleNavigation('founder')}
                disabled={loading}
                aria-busy={loading}
              >
                <Rocket size={22} className="text-surface-500" aria-hidden="true" />
                Submit Pitch Deck
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-3xl mx-auto p-8 bg-white/60 backdrop-blur-md rounded-3xl border border-white/80 shadow-xl shadow-surface-200/20">
              <div className="flex flex-col items-center">
                <div className="text-4xl font-extrabold text-surface-900 mb-1">500+</div>
                <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Deals Analyzed</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl font-extrabold text-brand-600 mb-1">98%</div>
                <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Data Accuracy</div>
              </div>
              <div className="flex flex-col items-center col-span-2 md:col-span-1">
                <div className="text-4xl font-extrabold text-surface-900 mb-1"><span className="text-2xl text-surface-400">&lt;</span>60s</div>
                <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Analysis Time</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-surface-900 mb-6 tracking-tight">
                Enterprise Intelligence
              </h2>
              <p className="text-xl text-surface-600 max-w-2xl mx-auto font-light">
                Uncover hidden risks and opportunities with our proprietary evaluation engine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <BarChart3 className="text-brand-600" size={28} aria-hidden="true" />,
                  bg: "bg-brand-50",
                  title: "Deep Tech Analysis",
                  description: "Comprehensive evaluation across market size, technical defensibility, and competitive moats."
                },
                {
                  icon: <Zap className="text-amber-500" size={28} aria-hidden="true" />,
                  bg: "bg-amber-50",
                  title: "Instant Diligence",
                  description: "Generate structured summaries and targeted Q&A prompts instantly from raw pitch decks."
                },
                {
                  icon: <Target className="text-emerald-500" size={28} aria-hidden="true" />,
                  bg: "bg-emerald-50",
                  title: "Smart Scoring",
                  description: "Objective 0-100 venture scoring with detailed criterion breakdowns for rapid filtering."
                },
                {
                  icon: <TrendingUp className="text-brand-500" size={28} aria-hidden="true" />,
                  bg: "bg-brand-50",
                  title: "Pipeline Management",
                  description: "Track founder engagement, team sentiment, and manage your entire deal flow in one place."
                },
                {
                  icon: <Users className="text-violet-500" size={28} aria-hidden="true" />,
                  bg: "bg-violet-50",
                  title: "Syndicate Sync",
                  description: "Share structured deal memos and co-invest effortlessly without endless email threads."
                },
                {
                  icon: <CheckCircle className="text-rose-500" size={28} aria-hidden="true" />,
                  bg: "bg-rose-50",
                  title: "Bank-Grade Security",
                  description: "End-to-end encryption ensures highly confidential IP and financials remain protected."
                }
              ].map((feature, i) => (
                <div key={i} className="group bg-surface-50 p-8 rounded-3xl border border-surface-200/60 hover:bg-white hover:shadow-2xl hover:shadow-brand-900/5 hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-surface-900 mb-3">{feature.title}</h3>
                  <p className="text-surface-600 leading-relaxed font-light">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto bg-surface-950 rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
            {/* Ambient glows */}
            <div aria-hidden="true" className="absolute top-0 right-0 w-96 h-96 bg-brand-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse-slow motion-reduce:animate-none"></div>
            <div aria-hidden="true" className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>

            <div className="relative z-10">
              <h2 className="text-4xl sm:text-6xl font-extrabold mb-8 tracking-tight">
                Upgrade Your Deal Flow
              </h2>
              <p className="text-xl text-surface-300 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                Join top-tier venture funds and angel networks making smarter, faster investment decisions with Black Leo.
              </p>
              <button
                className="bg-white text-surface-950 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-brand-50 hover:scale-105 transition-all duration-300 shadow-xl shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => router.push('/login')}
                disabled={loading}
                aria-busy={loading}
              >
                Start Analyzing Deals
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white py-12 border-t border-surface-100">
        <div className="max-w-7xl mx-auto px-4 text-center text-surface-400 font-medium">
          <p>&copy; {new Date().getFullYear()} Black Leo Venture. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
