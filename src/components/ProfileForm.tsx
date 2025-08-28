// C:\Users\vizir\halal-marriage\src\components\ProfileForm.tsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { MediaUpload } from '@/components/MediaUpload';
import { ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileFormProps {
  onSave: (profileData: any) => void | Promise<void>;
  initialData?: any;
  onBack?: () => void; // optional back handler from parent
}

type Gender = '' | 'male' | 'female';

type ProfileState = {
  firstName: string;
  gender: Gender;
  age: string | number;
  city: string;
  state: string;
  ethnicity: string;
  occupation: string;
  education: string;
  maritalStatus: string;
  revertStatus: string;
  shahadaAge: string;
  prayerStatus: string;
  sect: string;
  hideSect: boolean;
  hijabPreference: string;
  familyInvolvement: boolean;
  waliInfo: string;
  bio: string;
  photos: string[];
  video: string;
  isPublic: boolean;
};

const MAX_PHOTOS = 10;

const normalizeGender = (val?: string | null): Gender => {
  const g = (val || '').trim().toLowerCase();
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return '';
};

const ProfileForm: React.FC<ProfileFormProps> = ({ onSave, initialData = {}, onBack }) => {
  const [profile, setProfile] = useState<ProfileState>({
    firstName: initialData.firstName || '',
    gender: normalizeGender(initialData.gender),
    age: initialData.age || '',
    // split location into city/state (fallback: parse initialData.location if provided)
    city:
      initialData.city ||
      (typeof initialData.location === 'string' ? (initialData.location.split(',')[0] || '').trim() : ''),
    state:
      initialData.state ||
      (typeof initialData.location === 'string' ? (initialData.location.split(',')[1] || '').trim() : ''),
    ethnicity: initialData.ethnicity || '',
    occupation: initialData.occupation || '',
    education: initialData.education || '',
    // includes polygyny statuses
    maritalStatus: initialData.maritalStatus || '',
    // keep the same data key for compatibility; label shown to users is "Muslim Status"
    revertStatus: initialData.revertStatus || '',
    // NEW: Shahada Age (free text)
    shahadaAge: initialData.shahadaAge || '',
    prayerStatus: initialData.prayerStatus || '',
    sect: initialData.sect || '',
    hideSect: Boolean(initialData.hideSect) || false,
    hijabPreference: initialData.hijabPreference || '',
    familyInvolvement: Boolean(initialData.familyInvolvement) || false,
    waliInfo: initialData.waliInfo || '',
    bio: initialData.bio || '',
    photos: Array.isArray(initialData.photos) ? initialData.photos : [],
    video: initialData.video || '',
    isPublic: typeof initialData.isPublic === 'boolean' ? initialData.isPublic : true,
  });

  // Re-hydrate when initialData changes (e.g., after save or session restore)
  useEffect(() => {
    setProfile((p) => ({
      ...p,
      firstName: initialData.firstName ?? p.firstName,
      gender: normalizeGender(initialData.gender ?? p.gender),
      age: initialData.age ?? p.age,
      city:
        initialData.city ??
        (typeof initialData.location === 'string' ? (initialData.location.split(',')[0] || '').trim() : p.city),
      state:
        initialData.state ??
        (typeof initialData.location === 'string' ? (initialData.location.split(',')[1] || '').trim() : p.state),
      ethnicity: initialData.ethnicity ?? p.ethnicity,
      occupation: initialData.occupation ?? p.occupation,
      education: initialData.education ?? p.education,
      maritalStatus: initialData.maritalStatus ?? p.maritalStatus,
      revertStatus: initialData.revertStatus ?? p.revertStatus,
      shahadaAge: initialData.shahadaAge ?? p.shahadaAge,
      prayerStatus: initialData.prayerStatus ?? p.prayerStatus,
      sect: initialData.sect ?? p.sect,
      hideSect: typeof initialData.hideSect === 'boolean' ? initialData.hideSect : p.hideSect,
      hijabPreference: initialData.hijabPreference ?? p.hijabPreference,
      familyInvolvement:
        typeof initialData.familyInvolvement === 'boolean' ? initialData.familyInvolvement : p.familyInvolvement,
      waliInfo: initialData.waliInfo ?? p.waliInfo,
      bio: initialData.bio ?? p.bio,
      photos: Array.isArray(initialData.photos) ? initialData.photos : p.photos,
      video: initialData.video ?? p.video,
      isPublic: typeof initialData.isPublic === 'boolean' ? initialData.isPublic : p.isPublic,
    }));
  }, [initialData]);

  // Safer in-app back: avoid browser back (which might leave the app after file picker)
  const handleBack = () => {
    if (onBack) return onBack();
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      p.set('s', 'dashboard');
      p.delete('uid');
      p.delete('cid');
      window.location.hash = `#${p.toString()}`;
    }
  };

  /**
   * Robust media updater:
   * - Accepts string | string[] | undefined for photos, and optional video
   * - Appends new photos to existing (no overwrites), caps at MAX_PHOTOS
   * - Avoids duplicates via Set
   * - Updates video only if explicitly provided
   */
  const handleMediaUpdate = (incomingPhotos: string | string[] | undefined, incomingVideo?: string | null) => {
    setProfile((prev) => {
      const prevPhotos = Array.isArray(prev.photos) ? prev.photos : [];
      const nextVideo = incomingVideo === undefined ? prev.video : incomingVideo || '';

      const newItems = Array.isArray(incomingPhotos)
        ? incomingPhotos
        : incomingPhotos
        ? [incomingPhotos]
        : [];

      const merged = Array.from(new Set([...prevPhotos, ...newItems].filter(Boolean))).slice(0, MAX_PHOTOS);
      return { ...prev, photos: merged, video: nextVideo };
    });
  };

  const removePhotoAt = (idx: number) => {
    setProfile((prev) => {
      const clone = [...(prev.photos || [])];
      clone.splice(idx, 1);
      return { ...prev, photos: clone };
    });
  };

  const clearVideo = () => {
    setProfile((prev) => ({ ...prev, video: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Quick client validation for required fields
    if (!profile.firstName.trim()) {
      toast.error('Please enter your first name.');
      return;
    }
    if (!profile.gender) {
      toast.error('Please select your gender.');
      return;
    }
    if (profile.age === '' || Number(profile.age) < 18) {
      toast.error('Age must be 18 or older.');
      return;
    }
    if (!profile.city.trim() || !profile.state.trim()) {
      toast.error('Please provide both city and state.');
      return;
    }
    if (!profile.occupation.trim()) {
      toast.error('Please provide your occupation.');
      return;
    }

    // Build a combined 'location' string for any legacy UI paths
    const location = [profile.city, profile.state].filter(Boolean).join(', ').trim();

    const finalData = {
      ...profile,
      age: profile.age === '' ? '' : Number(profile.age),
      gender: normalizeGender(profile.gender),
      location, // legacy/combined
      city: profile.city,
      state: profile.state,
      // ensure we pass through the new field to be saved upstream
      shahadaAge: profile.shahadaAge,
    };

    await onSave(finalData);
  };

  const discoverableText = profile.isPublic ? 'Discoverable' : 'Hidden';

  // Unified gallery items: video (if any) + up to 10 photos
  const photosToShow = (profile.photos || []).slice(0, MAX_PHOTOS);
  const extraCount = (profile.photos?.length || 0) - MAX_PHOTOS;
  const mediaItems: Array<{ type: 'video' | 'photo'; url: string; key: string; index?: number }> = [
    ...(profile.video ? [{ type: 'video' as const, url: profile.video, key: 'video' }] : []),
    ...photosToShow.map((url, idx) => ({ type: 'photo' as const, url, key: `p-${idx}`, index: idx })),
  ];

  return (
    <div className="min-h-screen theme-bg p-4">
      <Card className="w-full max-w-4xl mx-auto theme-card">
        <CardHeader className="flex flex-col gap-3">
          {/* Back button */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <CardTitle className="text-white text-2xl">Complete Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Discoverability */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label htmlFor="isPublic" className="text-white">Make my profile discoverable</Label>
                  <p className="text-sm theme-text-muted mt-1">
                    When on, your profile can appear in search results for other members.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs theme-text-muted">Off</span>
                  <Switch
                    id="isPublic"
                    checked={profile.isPublic}
                    onCheckedChange={(v) => setProfile({ ...profile, isPublic: Boolean(v) })}
                    className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted"
                    aria-label="Profile discoverable"
                  />
                  <span className="text-xs theme-text-muted">On</span>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className={profile.isPublic ? 'text-emerald-300' : 'theme-text-muted'} aria-live="polite">
                  {discoverableText}
                </span>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-white">First Name</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <Label htmlFor="gender" className="text-white">Gender</Label>
                {/* Hidden input helps browser-level required semantics if needed */}
                <input type="hidden" name="gender" value={profile.gender} required />
                <Select
                  value={profile.gender}
                  onValueChange={(value) => setProfile({ ...profile, gender: value as Gender })}
                >
                  <SelectTrigger id="gender" aria-required="true">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="age" className="text-white">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={18}
                  max={80}
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  required
                />
              </div>

              {/* City / State split */}
              <div className="md:col-span-1">
                <Label htmlFor="city" className="text-white">City</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="e.g., Dallas"
                  required
                />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="state" className="text-white">State</Label>
                <Input
                  id="state"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  placeholder="e.g., TX"
                  required
                />
              </div>

              <div>
                <Label htmlFor="ethnicity" className="text-white">Ethnicity</Label>
                <Input
                  id="ethnicity"
                  value={profile.ethnicity}
                  onChange={(e) => setProfile({ ...profile, ethnicity: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="occupation" className="text-white">Occupation</Label>
                <Input
                  id="occupation"
                  value={profile.occupation}
                  onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="education" className="text-white">Education</Label>
                <Input
                  id="education"
                  value={profile.education}
                  onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                  placeholder="Highest level / field"
                />
              </div>
            </div>

            {/* Faith & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white">Marital Status</Label>
                <Select
                  value={profile.maritalStatus || undefined}
                  onValueChange={(value) => setProfile({ ...profile, maritalStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    {/* Polygyny-friendly statuses */}
                    <SelectItem value="married_1_wife">Married — 1 wife</SelectItem>
                    <SelectItem value="married_2_wives">Married — 2 wives</SelectItem>
                    <SelectItem value="married_3_wives">Married — 3 wives</SelectItem>
                    {/* Existing statuses */}
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Prayer Status</Label>
                <Select
                  value={profile.prayerStatus || undefined}
                  onValueChange={(value) => setProfile({ ...profile, prayerStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prayer frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5times">5 times daily</SelectItem>
                    <SelectItem value="sometimes">Sometimes</SelectItem>
                    <SelectItem value="inconsistent">Not consistent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Muslim Status (keeps values for compatibility) */}
              <div>
                <Label className="text-white">Muslim Status</Label>
                <Select
                  value={profile.revertStatus || undefined}
                  onValueChange={(value) => setProfile({ ...profile, revertStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="born">Born into Islam</SelectItem>
                    <SelectItem value="revert">Embraced Islam</SelectItem>
                    <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* NEW: Shahada Age */}
              <div className="md:col-span-3">
                <Label htmlFor="shahadaAge" className="text-white">Shahada Age</Label>
                <Input
                  id="shahadaAge"
                  value={profile.shahadaAge}
                  onChange={(e) => setProfile({ ...profile, shahadaAge: e.target.value })}
                  placeholder={`e.g., "2 years", "since 2021", or "planning"`}
                />
                <p className="text-xs theme-text-muted mt-1">
                  Share how long it’s been since you took the Shahada — or write “planning” if you intend to take it.
                </p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="sect" className="text-white">Sect (optional)</Label>
                <Input
                  id="sect"
                  value={profile.sect}
                  onChange={(e) => setProfile({ ...profile, sect: e.target.value })}
                  placeholder="e.g., Sunni, etc."
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="hideSect" className="text-white">Hide sect on public profile</Label>
                </div>
                <Switch
                  id="hideSect"
                  checked={profile.hideSect}
                  onCheckedChange={(checked) => setProfile({ ...profile, hideSect: Boolean(checked) })}
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="hijabPreference" className="text-white">Hijab Preference (optional)</Label>
                <Input
                  id="hijabPreference"
                  value={profile.hijabPreference}
                  onChange={(e) => setProfile({ ...profile, hijabPreference: e.target.value })}
                  placeholder="e.g., Wears hijab, Niqab, No preference"
                />
              </div>
            </div>

            {/* Family / Wali */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 rounded-lg border border-border p-3">
                <Checkbox
                  id="familyInvolvement"
                  checked={profile.familyInvolvement}
                  onCheckedChange={(checked) => setProfile({ ...profile, familyInvolvement: Boolean(checked) })}
                />
                <Label htmlFor="familyInvolvement" className="text-white">
                  I would like family / wali involved in communication
                </Label>
              </div>

              <div>
                <Label htmlFor="waliInfo" className="text-white">Wali / family contact (optional)</Label>
                <Input
                  id="waliInfo"
                  value={profile.waliInfo}
                  onChange={(e) => setProfile({ ...profile, waliInfo: e.target.value })}
                  placeholder="Name / relationship / contact"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="text-white">About Me</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Share your values, goals, and what you're looking for in a spouse..."
                className="min-h-[120px]"
              />
            </div>

            {/* Unified Media Gallery (video + up to 10 photos at once) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">Profile Media</h4>
                {profile.photos?.length ? (
                  <span className="text-xs theme-text-muted">
                    Showing {Math.min(profile.photos.length, MAX_PHOTOS)} of {profile.photos.length} photo
                    {profile.photos.length === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>

              {mediaItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {mediaItems.map((item, idx) =>
                    item.type === 'video' ? (
                      <div key={item.key} className="relative w-full overflow-hidden rounded-lg border border-border">
                        <video src={item.url} controls className="w-full h-28 sm:h-32 md:h-36 object-cover" />
                        <button
                          type="button"
                          onClick={clearVideo}
                          aria-label="Remove video"
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div key={item.key} className="relative">
                        <img
                          src={item.url}
                          alt={`photo ${idx + 1}`}
                          className="w-full h-28 sm:h-32 md:h-36 object-cover rounded-lg border border-border"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          aria-label="Remove photo"
                          onClick={() => removePhotoAt(item.index!)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                        {item.index === mediaItems.length - 1 && extraCount > 0 && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <span className="text-white font-medium text-sm">+{extraCount} more</span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm theme-text-muted">No media yet — add photos and/or a short intro video.</p>
              )}

              {/* IMPORTANT: Preload existing media and append new media */}
              <MediaUpload
                onMediaUpdate={handleMediaUpdate}
                initialPhotos={profile.photos}
                initialVideo={profile.video}
              />
              <p className="text-xs theme-text-muted">
                All media will be reviewed for Islamic compliance before being visible to other users.
              </p>
            </div>

            {/* Save */}
            <Button type="submit" className="w-full theme-button">
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileForm;
