import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Heart } from 'lucide-react';

const IslamicReminder: React.FC = () => {
  const [showReminder, setShowReminder] = useState(false);

  const reminders = [
    "This platform is for halal marriage only - Allah is watching.",
    "Remember to involve your family and seek Allah's guidance in your choice.",
    "Seek a spouse who will strengthen your relationship with Allah and your deen.",
    "Make du'a for a righteous spouse who will help you in this life and the hereafter.",
    "Marriage is half of your deen - approach it with sincerity and taqwa."
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowReminder(true);
    }, 30000); // Show after 30 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!showReminder) return null;

  const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md theme-card border-primary bg-gray-700">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <Heart className="h-6 w-6 text-primary mt-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReminder(false)}
              className="h-6 w-6 p-0 text-white hover:bg-card"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-white mb-3">Islamic Reminder</h3>
            <p className="theme-text-body text-sm leading-relaxed mb-4">
              {randomReminder}
            </p>
            <p className="text-xs text-primary italic">
              "And among His signs is that He created for you mates from among yourselves, 
              that you may dwell in tranquility with them" - Quran 30:21
            </p>
          </div>
          
          <Button
            onClick={() => setShowReminder(false)}
            className="w-full mt-4 theme-button"
          >
            Ameen - Continue with Taqwa
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default IslamicReminder;