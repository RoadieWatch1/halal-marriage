import React from 'react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <img
        src="/hero.jpg"
        alt="Muslim woman in hijab"
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="async"
        onError={(e) => {
          // graceful fallback if the image path is wrong
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />

      {/* Faded overlay (charcoal + subtle teal glow) */}
      <div className="absolute inset-0 hero-overlay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-1 text-xs font-medium tracking-wide text-ivory/90 ring-1 ring-white/10 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gold/80" />
            AM4M • American Muslims for Marriage
          </div>

          <h1 className="mt-5 text-5xl font-bold leading-tight text-ivory md:text-7xl">
            Find the one—<span className="text-gold">with ihsān</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ivory/85 md:text-xl">
            A halal matrimonial platform for American Muslims—privacy-first, wali-friendly, and focused on nikāh.
          </p>

          <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-2 text-left text-ivory/85 sm:grid-cols-2">
            <li className="bullet">Islamic values–centered matching</li>
            <li className="bullet">Family involvement welcome</li>
            <li className="bullet">Privacy & verification focused</li>
            <li className="bullet">For serious marriage intentions</li>
          </ul>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="btn-cta"
              aria-label="Begin your journey"
            >
              Begin Your Journey
            </Button>

            <a
              href="#s=search"
              className="btn-secondary"
              aria-label="Browse matches"
            >
              Browse Matches
            </a>
          </div>

          <p className="mt-8 text-sm text-ivory/75">
            “And among His signs is that He created for you mates from among yourselves…” — Qur’an 30:21
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
