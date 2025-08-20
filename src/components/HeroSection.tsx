import React from 'react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <div className="relative min-h-screen theme-bg">
      <div className="absolute inset-0">
        <img
          src="https://d64gsuwffb70l.cloudfront.net/687ff332c691ebefc6160e57_1754254356214_c0b9a025.jpg"
          alt="Muslim women in hijab"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg">
            AM4M
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            American Muslims for Marriage
          </h2>
          <p className="text-xl md:text-2xl theme-text-body mb-8 leading-relaxed">
            A halal matrimonial platform connecting serious Muslims seeking marriage with Islamic values
          </p>
          
          <div className="space-y-4 text-lg theme-text-body mb-10">
            <p>✨ Islamic values-centered matching</p>
            <p>🤝 Family involvement welcomed</p>
            <p>🔒 Privacy and verification focused</p>
            <p>💝 Serious marriage intentions only</p>
          </div>

          <Button 
            onClick={onGetStarted}
            size="lg"
            className="theme-button px-8 py-4 text-lg font-semibold rounded-lg shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Begin Your Journey
          </Button>
          
          <p className="text-sm theme-text-muted mt-6">
            "And among His signs is that He created for you mates from among yourselves" - Quran 30:21
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;