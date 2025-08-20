import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, HeartHandshake, UserCog, Users } from 'lucide-react';

type Props = {
  name?: string;
  completion?: number; // 0..100
  onStartMatching: () => void;
  onEditProfile: () => void;
  onInviteFamily?: () => void;
  onDismiss?: () => void;
};

const OnboardingBanner: React.FC<Props> = ({
  name = 'Friend',
  completion = 85,
  onStartMatching,
  onEditProfile,
  onInviteFamily,
  onDismiss,
}) => {
  return (
    <Card className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 border-emerald-300/30 shadow-xl">
      <CardContent className="p-6 text-white">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-10 h-10 shrink-0 text-white/90" />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">
              Bismillah, {name}. Your profile is saved!
            </h2>
            <p className="text-white/90 mt-1">
              Next step: start finding compatible matches. You can edit your profile anytime.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Profile completeness</span>
                <span className="text-white">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2 bg-white/20" />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="theme-button" onClick={onStartMatching}>
                <Users className="w-4 h-4 mr-2" />
                Find Matches
              </Button>
              <Button variant="secondary" onClick={onEditProfile}>
                <UserCog className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" onClick={onInviteFamily} className="border-white/40 text-white hover:bg-white/10">
                <HeartHandshake className="w-4 h-4 mr-2" />
                Invite Family/Wali
              </Button>
              {onDismiss && (
                <Button variant="ghost" onClick={onDismiss} className="text-white/80 hover:bg-white/10">
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingBanner;
