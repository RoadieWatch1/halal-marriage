// C:\Users\vizir\halal-marriage\src\components\HeroSection.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HERO_IMG =
  'https://d64gsuwffb70l.cloudfront.net/687ff332c691ebefc6160e57_1754254356214_c0b9a025.jpg';
const FALLBACK_IMG = '/placeholder.svg';

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const [bgSrc, setBgSrc] = useState<string>(HERO_IMG);

  return (
    <section className="relative min-h-screen theme-bg flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={bgSrc}
          alt="American Muslims seeking marriage — respectful, values-first community"
          className="w-full h-full object-cover opacity-30"
          onError={() => setBgSrc(FALLBACK_IMG)}
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 drop-shadow-lg">
            AM4M
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            American Muslims for Marriage
          </h2>

          <p id="hero-lede" className="text-xl md:text-2xl theme-text-body mb-8 leading-relaxed">
            A halal matrimonial platform connecting serious Muslims seeking marriage with Islamic values.
          </p>

          <div className="space-y-2 text-lg theme-text-body mb-10">
            <p>✨ Islamic values-centered matching</p>
            <p>🤝 Family involvement welcomed</p>
            <p>🔒 Privacy and verification focused</p>
            <p>💝 Serious marriage intentions only</p>
          </div>

          {/* Clear, accessible CTA button */}
          <Button
            onClick={onGetStarted}
            size="lg"
            className="theme-button px-8 py-6 text-lg font-semibold rounded-xl shadow-xl transform hover:scale-[1.03] focus-visible:scale-[1.03] transition-transform duration-200"
            aria-label="Begin your journey"
            aria-describedby="hero-lede"
            data-testid="cta-begin"
          >
            Begin Your Journey
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-sm theme-text-muted mt-6">
            “And among His signs is that He created for you mates from among yourselves” — Quran 30:21
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
