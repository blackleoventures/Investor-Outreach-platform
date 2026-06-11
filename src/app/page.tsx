"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNavigation = (type: 'founder' | 'investor') => {
    setLoading(true);
    router.push(`/login?role=${type}`);
  };

  return (
    <div className="min-h-screen bg-blv-bg text-white font-sans selection:bg-blv-accent selection:text-black">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-blv-border" data-testid="nav-header">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <button
              type="button"
              onClick={() => router.push('/')}
              aria-label="Black Leo Ventures home"
              className="flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blv-accent"
              data-testid="text-logo"
            >
              <span className="w-10 h-10 bg-white rounded-md flex items-center justify-center flex-none">
                <Image src="/logo.png" alt="Black Leo Ventures" width={32} height={32} className="w-8 h-8 object-contain" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                Black Leo Ventures
              </span>
            </button>
            <div className="flex items-center gap-6">
              <a
                href="https://www.blackleoventures.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:block text-xs font-bold uppercase tracking-wider text-blv-muted hover:text-blv-accent transition-colors"
              >
                Main Site
              </a>
              <a href="/login" className="text-xs font-bold uppercase tracking-wider text-blv-muted hover:text-blv-accent transition-colors">
                Sign In
              </a>
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2.5 bg-blv-accent text-black font-bold uppercase tracking-wide text-xs hover:bg-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative min-h-[100svh] flex items-center pt-28 pb-16 px-6 lg:px-12 overflow-hidden">
          <div aria-hidden="true" className="absolute top-1/4 -left-1/4 w-[700px] h-[700px] bg-blv-accent/15 blur-[150px] rounded-full pointer-events-none"></div>

          <div className="relative w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
            <div className="lg:col-span-7">
              <p className="text-blv-accent text-xs font-bold uppercase tracking-[0.25em] mb-6">
                The Black Leo Ventures Platform
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold uppercase leading-[1.02] tracking-tight mb-8" data-testid="text-hero-title">
                Your startup,<br />
                in front of <span className="text-blv-accent">real investors.</span>
              </h1>
              <p className="text-lg sm:text-xl text-blv-muted max-w-xl leading-relaxed mb-10" data-testid="text-hero-subtitle">
                You build the company. We handle the fundraise — one profile, your pitch deck,
                and outreach to investors who actually invest in your sector and stage.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  className="group flex items-center justify-center gap-3 px-8 py-4 bg-blv-accent text-black font-bold uppercase tracking-wide text-sm hover:bg-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleNavigation('founder')}
                  disabled={loading}
                  aria-busy={loading}
                >
                  I&apos;m a Founder
                  <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <button
                  className="group flex items-center justify-center gap-3 px-8 py-4 border border-blv-border text-white font-bold uppercase tracking-wide text-sm hover:border-blv-accent hover:text-blv-accent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blv-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleNavigation('investor')}
                  disabled={loading}
                  aria-busy={loading}
                >
                  I&apos;m an Investor
                  <ArrowUpRight size={18} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </button>
              </div>
            </div>

            {/* How it works panel */}
            <div className="lg:col-span-5">
              <div className="border border-blv-border bg-blv-surface p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blv-muted mb-8">How it works</p>
                <ol className="space-y-8">
                  <li className="flex gap-5">
                    <span className="text-blv-accent font-extrabold text-2xl leading-none" aria-hidden="true">01</span>
                    <div>
                      <p className="font-bold mb-1">Tell us about your startup</p>
                      <p className="text-sm text-blv-muted leading-relaxed">One form. Company details, what you&apos;re raising, and your pitch deck.</p>
                    </div>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-blv-accent font-extrabold text-2xl leading-none" aria-hidden="true">02</span>
                    <div>
                      <p className="font-bold mb-1">We match and reach out</p>
                      <p className="text-sm text-blv-muted leading-relaxed">We match you with investors by sector, stage, city and ticket size — then email them from your own inbox.</p>
                    </div>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-blv-accent font-extrabold text-2xl leading-none" aria-hidden="true">03</span>
                    <div>
                      <p className="font-bold mb-1">Investors see your deal</p>
                      <p className="text-sm text-blv-muted leading-relaxed">Interested investors get a private deal room with your profile and deck. They contact you directly.</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* For Founders / For Investors */}
        <section className="py-24 px-6 lg:px-12 border-t border-blv-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight mb-4">
              Two sides. <span className="text-blv-accent">One table.</span>
            </h2>
            <p className="text-blv-muted text-lg max-w-2xl mb-16">
              Founders raise. Investors find deals. We sit in the middle and make the introduction.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-blv-border border border-blv-border">
              <div className="bg-blv-surface p-10 lg:p-14">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blv-accent mb-6">For Founders</p>
                <h3 className="text-2xl font-extrabold uppercase mb-6">Raise without chasing</h3>
                <ul className="space-y-4 text-blv-muted mb-10">
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Outreach goes from your own email address, not a cold-mail server. Investors see you, not a tool.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Every open and every reply is tracked. You always know who is interested.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Your deck gets a clean, private profile page that investors can study properly.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Backed by the Black Leo Ventures team — mentorship, execution and investor network included.
                  </li>
                </ul>
                <button
                  className="group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-blv-accent hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blv-accent disabled:opacity-50"
                  onClick={() => handleNavigation('founder')}
                  disabled={loading}
                >
                  Submit your pitch deck
                  <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>

              <div className="bg-blv-surface p-10 lg:p-14">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blv-accent mb-6">For Investors</p>
                <h3 className="text-2xl font-extrabold uppercase mb-6">Deal flow, not spam</h3>
                <ul className="space-y-4 text-blv-muted mb-10">
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Invite-only deal room. Every startup inside has been reviewed by our team first.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Filter by sector, stage and city. Read the deck right on the page.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Get a structured analysis of each deck — scorecard, market, traction, risks — before you spend a minute on a call.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blv-accent mt-0.5" aria-hidden="true">—</span>
                    Founder contact details on every profile. No middleman when you&apos;re ready to talk.
                  </li>
                </ul>
                <button
                  className="group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-blv-accent hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blv-accent disabled:opacity-50"
                  onClick={() => handleNavigation('investor')}
                  disabled={loading}
                >
                  Request deal room access
                  <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Plain-words section */}
        <section className="py-24 px-6 lg:px-12 border-t border-blv-border">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight leading-tight">
                No jargon.<br />Here&apos;s what we <span className="text-blv-accent">actually do.</span>
              </h2>
            </div>
            <div className="lg:col-span-7 space-y-8 text-lg text-blv-muted leading-relaxed">
              <p>
                Most founders waste months sending cold emails to the wrong investors.
                Most investors drown in decks that were never meant for them.
              </p>
              <p>
                We fix both. Your startup&apos;s profile is matched against our investor network —
                who invests in your sector, at your stage, in your region, at your ticket size.
                Only the right people hear from you, and they hear from <span className="text-white font-semibold">your</span> email address.
              </p>
              <p>
                When an investor is interested, they don&apos;t get a forwarded PDF. They get access to our
                deal room — your full profile, your deck, and a straight answer on whether this deal fits them.
              </p>
              <p className="text-white font-semibold">
                That&apos;s it. No magic. Just the boring work of fundraising, done properly, by a team in India that does this every day.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-blv-border">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            <div>
              <h2 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight mb-4">
                Ready to raise?
              </h2>
              <p className="text-blv-muted text-lg max-w-xl">
                Submit your pitch deck today. If it&apos;s a fit, our team will reach out and put it to work.
              </p>
            </div>
            <button
              className="group flex items-center gap-3 px-10 py-5 bg-blv-accent text-black font-bold uppercase tracking-wide text-sm hover:bg-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:cursor-not-allowed flex-none"
              onClick={() => router.push('/login')}
              disabled={loading}
              aria-busy={loading}
            >
              Get Started
              <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-blv-border py-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-white rounded-md flex items-center justify-center flex-none">
                <Image src="/logo.png" alt="Black Leo Ventures" width={24} height={24} className="w-6 h-6 object-contain" />
              </span>
              <span className="font-bold">Black Leo Ventures</span>
            </div>
            <p className="text-sm text-blv-muted max-w-xs">
              We build, fund &amp; scale companies. Proudly built in India.
            </p>
          </div>
          <div className="text-sm text-blv-muted space-y-2 md:text-right">
            <p>
              <a href="https://www.blackleoventures.com" target="_blank" rel="noopener noreferrer" className="hover:text-blv-accent transition-colors">
                blackleoventures.com
              </a>
            </p>
            <p>
              <a href="tel:+917837059633" className="hover:text-blv-accent transition-colors">+91 78370 59633</a>
            </p>
            <p>CIN: U85300MP2020PTC053751</p>
            <p>&copy; {new Date().getFullYear()} Black Leo Ventures. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
