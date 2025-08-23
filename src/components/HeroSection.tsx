import React from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, ShieldCheck, MessagesSquare, Heart } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

/**
 * Clean hero + "How it works" row (no color glows; calm palette).
 * Uses /public/hero.jpg — add your hero image as public/hero.jpg.
 */
const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <div className="theme-bg">
      {/* HERO */}
      <section className="relative min-h-[72vh] w-full">
        {/* Background image (replace /hero.jpg with your file if needed) */}
        <img
          src="/hero.jpg"
          alt="American Muslims for Marriage"
          className="hero-image"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          decoding="async"
        />
        <div className="hero-overlay" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 md:py-28 flex items-center">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-wider theme-text-muted mb-3">
              AM4M • Halal • Secure • Family-Oriented
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-foreground mb-4">
              American Muslims for Marriage
            </h1>
            <p className="text-lg md:text-xl theme-text-muted mb-8">
              A modern matrimonial platform for serious Muslims seeking marriage —
              private, values-aligned, and welcoming family involvement.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* shadcn Button gets our look via extra classes */}
              <Button
                onClick={onGetStarted}
                className="btn-primary"
                size="lg"
              >
                Begin Your Journey
              </Button>

              <a href="#how-it-works" className="btn-secondary">
                How it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          <HowCard
            icon={<UserPlus className="h-5 w-5" />}
            title="Create your profile"
            desc="Share essentials, values, and goals. Your data stays private."
          />
          <HowCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Private & respectful"
            desc="Opposite-gender visibility, modest media, and admin oversight."
          />
          <HowCard
            icon={<MessagesSquare className="h-5 w-5" />}
            title="Connect mindfully"
            desc="Request to connect, chat, and optionally involve your wali/family."
          />
          <HowCard
            icon={<Heart className="h-5 w-5" />}
            title="Nikah-focused"
            desc="Designed for marriage-minded Muslims with serious intentions."
          />
        </div>
      </section>
    </div>
  );
};

function HowCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="theme-card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.08)]">
          {icon}
        </span>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm theme-text-muted">{desc}</p>
    </div>
  );
}

export default HeroSection;
