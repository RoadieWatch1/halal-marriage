// C:\Users\vizir\halal-marriage\src\components\ProfileView.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Profile = {
  id: string;
  first_name: string | null;
  age: number | null;
  // split location fields
  city: string | null;
  state: string | null;
  // legacy combined (fallback only)
  location: string | null;
  occupation: string | null;
  education: string | null;
  marital_status: string | null;
  prayer_status: string | null;
  sect: string | null;
  hide_sect: boolean | null;
  bio: string | null;
  photos: string[] | null;
  video: string | null;
  is_public: boolean | null;
  updated_at?: string | null;
  // 🚦 needed for gender-based visibility
  gender?: 'male' | 'female' | null;
};

interface Props {
  userId: string;
  onBack: () => void;
  onConnect?: (userId: string) => void;
}

const ProfileView: React.FC<Props> = ({ userId, onBack, onConnect }) => {
  const [me, setMe] = useState<string | null>(null);
  const [myGender, setMyGender] = useState<'' | 'male' | 'female'>('');
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load viewer id + viewer gender
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const myId = data.user?.id ?? null;
      setMe(myId);
      if (myId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', myId)
          .maybeSingle<{ gender: 'male' | 'female' | null }>();
        const g = (prof?.gender ?? '') as 'male' | 'female' | '';
        setMyGender(g || '');
      }
    })();
  }, []);

  // Load target profile
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            [
              'id',
              'first_name',
              'age',
              'city',
              'state',
              'location', // legacy fallback
              'occupation',
              'education',
              'marital_status',
              'prayer_status',
              'sect',
              'hide_sect',
              'bio',
              'photos',
              'video',
              'is_public',
              'updated_at',
              'gender', // ✅ needed for gating
            ].join(', ')
          )
          .eq('id', userId)
          .maybeSingle<Profile>();

        if (error) throw error;
        if (!active) return;

        if (!data) {
          setP(null);
          setError('Profile not found');
        } else {
          setP(data);
        }
      } catch (e: any) {
        const msg = e?.message || 'Failed to load profile';
        setError(msg);
        toast.error(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const canConnect = Boolean(onConnect && me && me !== userId);

  const handleConnect = async () => {
    if (!onConnect || !p) return;
    try {
      setConnecting(true);
      await onConnect(p.id);
      toast.success('Connection request sent.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send request');
    } finally {
      setConnecting(false);
    }
  };

  const hero = p?.photos?.[0] ?? '';

  // Prefer City, State; fall back to legacy "location"
  const locationDisplay =
    (p?.city || p?.state) ? [p?.city, p?.state].filter(Boolean).join(', ') : (p?.location || '—');

  // 🚦 Gender gating
  const sameGenderBlocked =
    myGender && (myGender === 'male' || myGender === 'female') && p?.gender && myGender === p.gender;

  return (
    <div className="min-h-screen theme-bg p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top back button */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>

        <Card className="theme-card">
          {loading ? (
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-40 w-40 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </CardContent>
          ) : error ? (
            <CardContent className="p-6 text-red-300">{error}</CardContent>
          ) : !p ? (
            <CardContent className="p-6 theme-text-muted">Profile not found.</CardContent>
          ) : myGender !== 'male' && myGender !== 'female' ? (
            <CardContent className="p-6">
              <h3 className="text-white font-semibold mb-2">Set your gender to view profiles</h3>
              <p className="text-sm theme-text-muted mb-4">
                Please edit your profile and set your <strong>Gender</strong> to continue.
              </p>
              <Button variant="secondary" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          ) : sameGenderBlocked ? (
            <CardContent className="p-6">
              <h3 className="text-white font-semibold mb-2">This profile isn’t visible</h3>
              <p className="text-sm theme-text-muted mb-4">
                For privacy reasons, users only see profiles of the opposite gender.
              </p>
              <Button variant="secondary" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-0">
                <div className="flex items-start gap-4">
                  {hero ? (
                    <img
                      src={hero}
                      alt={`${p.first_name || 'User'} profile`}
                      className="h-40 w-40 object-cover rounded-xl border border-border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-40 w-40 rounded-xl border border-border flex items-center justify-center theme-text-muted">
                      No Photo
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-2xl text-white">
                      {p.first_name || 'User'}
                      {p.age ? `, ${p.age}` : ''}
                    </CardTitle>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm theme-text-body">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 theme-text-muted" />
                        {locationDisplay}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-4 w-4 theme-text-muted" />
                        {p.occupation || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-4 w-4 theme-text-muted" />
                        {p.education || '—'}
                      </span>

                      {/* Sect (respect hide_sect) */}
                      {!p.hide_sect && p.sect ? (
                        <Badge variant="outline" className="border-primary text-primary">
                          {p.sect}
                        </Badge>
                      ) : null}

                      {p.is_public ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <ShieldCheck className="h-4 w-4" /> Public
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Bio */}
                <div>
                  <h3 className="text-white font-medium mb-1">About</h3>
                  <p className="text-sm theme-text-body whitespace-pre-wrap">
                    {p.bio || '—'}
                  </p>
                </div>

                {/* Faith & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-sm theme-text-body">
                    <strong className="text-white">Prayer Status:</strong>{' '}
                    {p.prayer_status || '—'}
                  </div>
                  <div className="text-sm theme-text-body">
                    <strong className="text-white">Marital Status:</strong>{' '}
                    {p.marital_status || '—'}
                  </div>
                </div>

                {/* More photos */}
                {p.photos && p.photos.length > 1 ? (
                  <div>
                    <h3 className="text-white font-medium mb-2">Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {p.photos.slice(1).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Photo ${i + 2}`}
                          className="h-32 w-full object-cover rounded-lg border border-border"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Video */}
                {p.video ? (
                  <div>
                    <h3 className="text-white font-medium mb-2">Intro Video</h3>
                    <video
                      src={p.video}
                      controls
                      className="w-full rounded-lg border border-border"
                    />
                  </div>
                ) : null}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  {canConnect ? (
                    <Button className="theme-button" onClick={handleConnect} disabled={connecting}>
                      {connecting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Heart className="h-4 w-4 mr-2" />
                      )}
                      Request to Connect
                    </Button>
                  ) : (
                    <div />
                  )}
                  <Button variant="secondary" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Search
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Sticky bottom back button (mobile-friendly) */}
      <div className="fixed bottom-4 left-0 right-0 px-4">
        <div className="max-w-4xl mx-auto">
          <Button onClick={onBack} variant="secondary" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
