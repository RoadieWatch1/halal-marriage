// C:\Users\vizir\halal-marriage\src\pages\Index.tsx
import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';
import ProfileForm from '@/components/ProfileForm';
import SearchMatches from '@/components/SearchMatches';
import Messages from '@/components/Messages';
import IslamicReminder from '@/components/IslamicReminder';
import HeroSection from '@/components/HeroSection';
import OnboardingBanner from '@/components/OnboardingBanner';
import ConnectionsPanel from '@/components/ConnectionsPanel';
import ProfileView from '@/components/ProfileView';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Section = 'dashboard' | 'search' | 'messages' | 'profileView';

type ProfileRow = {
  id: string;
  first_name?: string | null;
  age?: number | null;

  // split location fields
  city?: string | null;
  state?: string | null;
  // legacy combined (kept for fallback/compat)
  location?: string | null;

  // gender
  gender?: string | null;

  ethnicity?: string | null;
  occupation?: string | null;
  education?: string | null;

  // marital status (supports polygyny-friendly values stored as text)
  marital_status?: string | null;

  // muslim status (stored as revert_status for compatibility)
  revert_status?: string | null;

  // ✅ NEW: Shahada Age (text)
  shahada_age?: string | null;

  prayer_status?: string | null;
  sect?: string | null;
  hide_sect?: boolean | null;
  hijab_preference?: string | null;
  family_involvement?: boolean | null;
  wali_info?: string | null;
  bio?: string | null;
  photos?: string[] | null;
  video?: string | null;
  is_public?: boolean | null;
  updated_at?: string | null;
};

const Index: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showHero, setShowHero] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [initialConnId, setInitialConnId] = useState<string | null>(null); // deep-link to a chat

  function toProfileData(row: ProfileRow | null) {
    if (!row) return null;
    const city = row.city || '';
    const state = row.state || '';
    const combinedLocation = row.location || [city, state].filter(Boolean).join(', ');

    return {
      firstName: row.first_name || '',
      age: row.age ?? '',

      // expose both styles to downstream components
      city,
      state,
      location: combinedLocation,

      // gender
      gender: row.gender || '',

      ethnicity: row.ethnicity || '',
      occupation: row.occupation || '',
      education: row.education || '',
      maritalStatus: row.marital_status || '',

      // “Muslim Status” in UI; remains revert_status in DB
      revertStatus: row.revert_status || '',

      // ✅ map to form initialData
      shahadaAge: row.shahada_age || '',

      prayerStatus: row.prayer_status || '',
      sect: row.sect || '',
      hideSect: Boolean(row.hide_sect),
      hijabPreference: row.hijab_preference || '',
      familyInvolvement: Boolean(row.family_involvement),
      waliInfo: row.wali_info || '',
      bio: row.bio || '',
      photos: row.photos || [],
      video: row.video || '',
      isPublic: typeof row.is_public === 'boolean' ? row.is_public : true,
    };
  }

  async function loadSessionAndProfile() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const sessionUser = sess?.session?.user || null;

      if (!sessionUser) {
        setUser(null);
        setProfileExists(null);
        setShowProfileForm(false);
        setShowHero(true); // show hero when logged out
        setShowWelcome(false);
        return;
      }

      const { data: row, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.warn('profiles fetch error:', error);
        setUser({ ...sessionUser, firstName: 'User', profileComplete: false });
        setProfileExists(false);
        setShowProfileForm(false);
        setShowHero(false); // hide hero for logged-in users even if profile missing
        setShowWelcome(false);
        return;
      }

      if (row) {
        const profileData = toProfileData(row)!;
        setUser({ ...sessionUser, ...profileData, profileComplete: true });
        setProfileExists(true);
        setShowProfileForm(false);
        setShowHero(false); // hide hero when logged in
        setShowWelcome(false);
      } else {
        setUser({ ...sessionUser, firstName: 'User', profileComplete: false });
        setProfileExists(false);
        setShowProfileForm(false);
        setShowHero(false); // hide hero when logged in
        setShowWelcome(false);
      }
    } finally {
      setLoading(false);
    }
  }

  // Read deep-link hash on mount (kept for internal nav)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const s = p.get('s') as Section | null;
    const uid = p.get('uid');
    const cid = p.get('cid');
    if (s) setCurrentSection(s);
    if (uid) setViewProfileUserId(uid);
    if (cid) setInitialConnId(cid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state to URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('s', currentSection);
    if (viewProfileUserId) params.set('uid', viewProfileUserId);
    if (initialConnId) params.set('cid', initialConnId);
    window.history.replaceState(null, '', `#${params.toString()}`);
  }, [currentSection, viewProfileUserId, initialConnId]);

  useEffect(() => {
    loadSessionAndProfile();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setProfileExists(null);
        setShowProfileForm(false);
        setCurrentSection('dashboard');
        setShowHero(true); // show hero when logged out
        setShowWelcome(false);
        setViewProfileUserId(null);
        setInitialConnId(null);
      } else {
        loadSessionAndProfile();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    await loadSessionAndProfile();
  };

  const handleGetStarted = () => {
    setShowHero(false);
    if (!user) return; // Hero "Get Started" does nothing if not signed in
    if (profileExists) {
      setShowWelcome(true);
      setShowProfileForm(false);
    } else {
      setShowProfileForm(true);
    }
  };

  const handleProfileSave = async (profileData: any) => {
    if (!user?.id) {
      toast.error('You must be logged in to save a profile.');
      return;
    }

    // Build combined location string for backward-compat UI if needed
    const combinedLocation =
      profileData.location ||
      [profileData.city, profileData.state].filter(Boolean).join(', ') ||
      null;

    const payload: ProfileRow = {
      id: user.id,
      first_name: profileData.firstName || null,
      age: profileData.age ? Number(profileData.age) : null,

      // write split fields
      city: profileData.city || null,
      state: profileData.state || null,
      // keep legacy combined
      location: combinedLocation,

      // persist gender
      gender: profileData.gender || null,

      ethnicity: profileData.ethnicity || null,
      occupation: profileData.occupation || null,
      education: profileData.education || null,
      marital_status: profileData.maritalStatus || null,

      // muslim status (stored as revert_status)
      revert_status: profileData.revertStatus || null,

      // ✅ NEW: persist Shahada Age
      shahada_age: profileData.shahadaAge || null,

      prayer_status: profileData.prayerStatus || null,
      sect: profileData.sect || null,
      hide_sect: !!profileData.hideSect,
      hijab_preference: profileData.hijabPreference || null,
      family_involvement: !!profileData.familyInvolvement,
      wali_info: profileData.waliInfo || null,
      bio: profileData.bio || null,
      photos: profileData.photos || [],
      video: profileData.video || null,
      is_public: !!profileData.isPublic,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert error:', error);
        const msg = (error as any)?.message || (typeof error === 'string' ? error : 'Unknown error');
        toast.error('Saving profile failed: ' + msg);
        return;
      }

      const updated = toProfileData(data);
      setUser({ ...user, ...(updated || {}), profileComplete: true });
      setProfileExists(true);
      setShowProfileForm(false);
      setShowWelcome(true);
      setCurrentSection('dashboard');
      toast.success('Profile saved successfully.');
    } catch (err: any) {
      console.error('Unexpected save error:', err);
      toast.error('Saving profile failed: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleNavigate = (section: string) => {
    if (section === 'profile') {
      setShowProfileForm(true);
      setShowHero(false);
      setShowWelcome(false);
    } else if (section === 'search' || section === 'messages' || section === 'dashboard') {
      setCurrentSection(section as Section);
      setShowHero(false);
      setShowWelcome(false);
    }
  };

  // REAL connect request → inserts into public.connections
  const handleConnect = async (otherUserId: string) => {
    const { data } = await supabase.auth.getUser();
    const me = data.user?.id;
    if (!me) {
      toast.error('Please sign in to send a request.');
      return;
    }
    if (me === otherUserId) {
      toast.error('You cannot connect with yourself.');
      return;
    }

    const { error } = await supabase
      .from('connections')
      .insert({ requester_id: me, receiver_id: otherUserId, status: 'pending' });

    if (error) {
      const msg = (error as any)?.message || String(error);
      if (msg.toLowerCase().includes('duplicate') || msg.includes('unique')) {
        toast.info('Request already sent or you are already connected.');
      } else {
        console.error('connect error:', error);
        toast.error('Could not send request: ' + msg);
      }
      return;
    }

    toast.success('Request sent. The user will be notified.');
  };

  function renderContent() {
    if (loading) return null;

    if (showHero) {
      return <HeroSection onGetStarted={handleGetStarted} />;
    }

    if (!user) {
      return <AuthForm onAuth={handleAuth} />;
    }

    if (showProfileForm) {
      return (
        <ProfileForm
          onSave={handleProfileSave}
          initialData={user}
          onBack={() => {
            setShowProfileForm(false);
            setCurrentSection('dashboard');
            setShowHero(false);
            setShowWelcome(false);
          }}
        />
      );
    }

    if (showWelcome) {
      return (
        <OnboardingBanner
          name={user.firstName || 'Friend'}
          completion={85}
          onStartMatching={() => {
            setShowWelcome(false);
            setCurrentSection('search');
          }}
          onEditProfile={() => {
            setShowWelcome(false);
            setShowProfileForm(true);
          }}
          onInviteFamily={() => toast('Family/Wali invite coming soon')}
          onDismiss={() => setShowWelcome(false)}
        />
      );
    }

    switch (currentSection) {
      case 'search':
        return (
          <SearchMatches
            onConnect={handleConnect}
            onBack={() => {
              setCurrentSection('dashboard');
              setShowWelcome(false);
            }}
            onViewProfile={(id: string) => {
              setViewProfileUserId(id);
              setCurrentSection('profileView');
            }}
          />
        );
      case 'profileView':
        return (
          <ProfileView
            userId={viewProfileUserId!}
            onBack={() => setCurrentSection('search')}
            onConnect={handleConnect}
          />
        );
      case 'messages':
        return (
          <Messages
            user={user}
            initialConnectionId={initialConnId ?? undefined}
            onBack={() => setCurrentSection('dashboard')}
          />
        );
      case 'dashboard':
      default:
        return (
          <>
            <Dashboard user={user} onNavigate={handleNavigate} />
            <ConnectionsPanel
              onViewProfile={(id) => {
                setViewProfileUserId(id);
                setCurrentSection('profileView');
              }}
              onOpenMessages={(connId) => {
                setInitialConnId(connId);
                setCurrentSection('messages');
              }}
            />
          </>
        );
    }
  }

  return (
    <AppProvider>
      <AppLayout>
        {renderContent()}
        <IslamicReminder />
      </AppLayout>
    </AppProvider>
  );
};

export default Index;
