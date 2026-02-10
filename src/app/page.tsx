"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Zap, Target, BarChart3, Users, Briefcase, Rocket, CheckCircle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNavigation = (type: 'founder' | 'investor') => {
    setLoading(true);
    // Redirect to login page - the login page should handle role selection or logic
    // Currently aiming for a simple redirect flow
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100" data-testid="nav-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2" data-testid="text-logo">
              <div className="bg-black text-white p-1.5 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">Black Leo Venture</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</a>
              <button
                onClick={() => router.push('/login')}
                className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Now supporting 500+ deals
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6" data-testid="text-hero-title">
            Connect Founders with Investors <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Through AI Intelligence</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
            Streamline your investment process with automated pitch deck analysis, intelligent scoring, and actionable insights powered by cutting-edge AI technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              className="flex items-center justify-center gap-2 px-8 py-4 bg-black text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto"
              onClick={() => handleNavigation('founder')}
              disabled={loading}
              data-testid="button-login-founder"
            >
              <Rocket size={20} />
              Get Started as Founder
            </button>
            <button
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 rounded-xl font-semibold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all w-full sm:w-auto"
              onClick={() => handleNavigation('investor')}
              disabled={loading}
              data-testid="button-login-investor"
            >
              <Briefcase size={20} />
              Join as Investor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto border-t border-gray-100 pt-12">
            <div className="flex flex-col items-center p-4" data-testid="badge-deals">
              <div className="text-3xl font-bold text-gray-900 mb-1">500+</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wide">Deals Analyzed</div>
            </div>
            <div className="flex flex-col items-center p-4 border-l-0 md:border-l border-gray-100" data-testid="badge-accuracy">
              <div className="text-3xl font-bold text-gray-900 mb-1">98%</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wide">Analysis Accuracy</div>
            </div>
            <div className="flex flex-col items-center p-4 border-l-0 md:border-l border-gray-100" data-testid="badge-time">
              <div className="text-3xl font-bold text-gray-900 mb-1">60s</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wide">Avg. Analysis Time</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4" data-testid="text-features-title">
                Powerful Features for Modern Investors
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Everything you need to make data-driven investment decisions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <BarChart3 className="text-blue-600" size={24} />,
                  title: "AI-Powered Analysis",
                  description: "Comprehensive evaluation across 10 critical investment criteria including market size, traction, team strength, and competitive advantage."
                },
                {
                  icon: <Zap className="text-amber-500" size={24} />,
                  title: "Instant Insights",
                  description: "Get AI-generated summaries, recommended investment actions, and intelligent questions to ask founders in seconds."
                },
                {
                  icon: <Target className="text-red-500" size={24} />,
                  title: "Smart Scoring System",
                  description: "Objective 0-100 scoring with detailed breakdowns helping you make data-driven investment decisions with confidence."
                },
                {
                  icon: <TrendingUp className="text-green-600" size={24} />,
                  title: "Deal Flow Management",
                  description: "Track investor interest, monitor engagement metrics, and manage your entire pipeline in one centralized platform."
                },
                {
                  icon: <Users className="text-purple-600" size={24} />,
                  title: "Seamless Collaboration",
                  description: "Connect founders and investors efficiently with structured data, eliminating endless email threads and missed opportunities."
                },
                {
                  icon: <CheckCircle className="text-indigo-600" size={24} />,
                  title: "Enterprise Security",
                  description: "Bank-level encryption and secure file storage ensure your sensitive pitch decks and investment data remain protected."
                }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-16 text-center" data-testid="text-how-it-works-title">
              How It Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-gray-200 via-gray-200 to-transparent -z-10"></div>

              {[
                { number: "1", title: "Upload Deck", desc: "Founders upload their PDF pitch decks in seconds securely." },
                { number: "2", title: "AI Analysis", desc: "Our engine analyzes your deck across 10 criteria in <60s." },
                { number: "3", title: "Get Insights", desc: "Receive scores, summaries, and suggested user questions." },
                { number: "4", title: "Connect", desc: "Make informed decisions and connect with the right opportunities." }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-xl group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto bg-black rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-bold mb-6" data-testid="text-cta-title">
                Ready to Transform Your Deal Flow?
              </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto" data-testid="text-cta-subtitle">
                Join hundreds of investors and founders making smarter decisions with AI
              </p>
              <button
                className="bg-white text-black px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl"
                onClick={() => router.push('/login')}
                disabled={loading}
                data-testid="button-cta-main"
              >
                Start Analyzing Deals Today
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} Black Leo Venture. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
