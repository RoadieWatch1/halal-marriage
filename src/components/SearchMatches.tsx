// C:\Users\vizir\halal-marriage\src\components\SearchMatches.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MapPin, GraduationCap, Briefcase, ArrowLeft, Loader2, ShieldCheck, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SearchMatchesProps {
  onConnect: (userId: string) => void;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

type ProfileCard = {
  id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  location: string | null; // legacy fallback
  occupation: string | null;
  education: string | null;
  marital_status: string | null;
  prayer_status: string | null;
  sect: string | null;
  hide_sect?: boolean | null;
  photos: string[] | null;
  is_public: boolean | null;
  updated_at?: string | null;
  gender?: string | null; // 👈 needed for display/debug
};

type Filters = {
  ageMin: string;
  ageMax: string;
  city: string;
  state: string;
  prayerStatus: 'any' | '5times' | 'sometimes' | 'inconsistent';
};

const PAGE_SIZE = 24;

const SearchMatches: React.FC<SearchMatchesProps> = ({ onConnect, onBack, onViewProfile }) => {
  const [filters, setFilters] = useState<Filters>({
    ageMin: '',
    ageMax: '',
    city: '',
    state: '',
    prayerStatus: 'any',
  });

  const [results, setResults] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [viewerGender, setViewerGender] = useState<'' | 'male' | 'female'>('');
  const [error, setError] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Load auth user + viewer gender
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const me = data.user?.id ?? null;
      setUid(me);
      if (me) {
        const { data: p } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', me)
          .maybeSingle<{ gender: string | null }>();
        const g = (p?.gender || '').toLowerCase();
        setViewerGender(g === 'male' ? 'male' : g === 'female' ? 'female' : '');
      }
    })();
  }, []);

  const targetGender: 'male' | 'female' | null =
    viewerGender === 'male' ? 'female' : viewerGender === 'female' ? 'male' : null;

  const hasAnyFilter = useMemo(
    () =>
      !!filters.ageMin ||
      !!filters.ageMax ||
      !!filters.city ||
      !!filters.state ||
      (filters.prayerStatus && filters.prayerStatus !== 'any'),
    [filters]
  );

  async function fetchMatches(opts?: { append?: boolean; pageOverride?: number }) {
    if (!uid) return;
    setLoading(true);
    setError(null);
    if (!opts?.append) setResults([]);

    try {
      const effectivePage = typeof opts?.pageOverride === 'number' ? opts.pageOverride : page;
      const from = effectivePage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const columns = [
        'id',
        'first_name',
        'age',
        'city',
        'state',
        'location',
        'occupation',
        'education',
        'marital_status',
        'prayer_status',
        'sect',
        'hide_sect',
        'photos',
        'is_public',
        'updated_at',
        'gender', // 👈 bring gender for context
      ].join(', ');

      let query = supabase
        .from('profiles')
        .select<string, ProfileCard>(columns)
        .neq('id', uid)
        .order('updated_at', { ascending: false })
        .range(from, to);

      // Treat null as public (legacy rows)
      query = query.or('is_public.is.true,is_public.is.null');

      // Gender filter (case-insensitive, tolerant)
      if (targetGender) {
        // Use ilike with % to match 'Female', 'female ', etc.
        query = query.ilike('gender', `${targetGender}%`);
      }

      // Safe number parsing
      const min = filters.ageMin.trim() === '' ? undefined : Number(filters.ageMin);
      const max = filters.ageMax.trim() === '' ? undefined : Number(filters.ageMax);
      if (min !== undefined && !Number.isNaN(min)) query = query.gte('age', min);
      if (max !== undefined && !Number.isNaN(max)) query = query.lte('age', max);

      // City/State filters (case-insensitive LIKE)
      if (filters.city.trim()) query = query.ilike('city', `%${filters.city.trim()}%`);
      if (filters.state.trim()) query = query.ilike('state', `%${filters.state.trim()}%`);

      if (filters.prayerStatus !== 'any') query = query.eq('prayer_status', filters.prayerStatus);

      const { data, error } = await query;
      if (error) {
        setError(error.message || 'Failed to load matches');
        setHasMore(false);
        return;
      }

      const batch: ProfileCard[] = data ?? [];
      setResults((prev) => (opts?.append ? [...prev, ...batch] : batch));
      setHasMore(batch.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e?.message || 'Failed to load matches');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    if (!uid) return;
    setPage(0);
    fetchMatches({ append: false, pageOverride: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, viewerGender]); // rerun if gender is detected later

  const applyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(0);
    fetchMatches({ append: false, pageOverride: 0 });
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchMatches({ append: true, pageOverride: next });
  };

  return (
    <div className="min-h-screen theme-bg p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top back button */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Viewer gender banner */}
        <Card className="theme-card">
          <CardContent className="py-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-ivory mt-1" />
            <div className="text-sm">
              {targetGender ? (
                <span className="theme-text-body">
                  Showing <span className="font-semibold">{targetGender === 'female' ? 'women' : 'men'}</span> only
                  (based on your gender).
                </span>
              ) : (
                <span className="theme-text-body">
                  Your profile doesn’t have a <span className="font-semibold">Gender</span> set yet. You’ll see everyone
                  until you set it in your profile.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="theme-card">
          <CardHeader>
            <CardTitle className="text-white">Search Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={applyFilters}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Label className="text-white">Age Range</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Min"
                      type="number"
                      value={filters.ageMin}
                      onChange={(e) => setFilters({ ...filters, ageMin: e.target.value })}
                    />
                    <Input
                      placeholder="Max"
                      type="number"
                      value={filters.ageMax}
                      onChange={(e) => setFilters({ ...filters, ageMax: e.target.value })}
                    />
                  </div>
                </div>

                {/* City / State filters */}
                <div className="md:col-span-1">
                  <Label className="text-white">City</Label>
                  <Input
                    placeholder="e.g., Dallas"
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  />
                </div>

                <div className="md:col-span-1">
                  <Label className="text-white">State</Label>
                  <Input
                    placeholder="e.g., TX"
                    value={filters.state}
                    onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  />
                </div>

                <div className="md:col-span-1">
                  <Label className="text-white">Prayer Status</Label>
                  <Select
                    value={filters.prayerStatus}
                    onValueChange={(value) =>
                      setFilters({ ...filters, prayerStatus: value as Filters['prayerStatus'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="5times">5 times daily</SelectItem>
                      <SelectItem value="sometimes">Sometimes</SelectItem>
                      <SelectItem value="inconsistent">Not consistent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <Button type="submit" className="theme-button" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Apply Filters
                </Button>
                {(hasAnyFilter || !!targetGender) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFilters({ ageMin: '', ageMax: '', city: '', state: '', prayerStatus: 'any' });
                      setPage(0);
                      setTimeout(() => fetchMatches({ append: false, pageOverride: 0 }), 0);
                    }}
                    disabled={loading}
                    className="text-white hover:bg-white/10"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error / Empty / Results */}
        {error && (
          <Card className="theme-card">
            <CardContent className="text-red-300 py-6">{error}</CardContent>
          </Card>
        )}

        {/* Loading skeletons */}
        {loading && results.length === 0 && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="theme-card p-4">
                <Skeleton className="h-6 w-1/3 mb-3" />
                <Skeleton className="h-48 w-full rounded-lg mb-3" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        )}

        {!error && !loading && results.length === 0 && (
          <Card className="theme-card">
            <CardContent className="text-center py-12">
              <p className="theme-text-body mb-2">No matches found.</p>
              <p className="text-sm theme-text-muted">Try adjusting your filters.</p>
              {targetGender && (
                <p className="text-xs theme-text-muted mt-2">
                  Tip: If profiles have no gender set yet, they won’t appear under the opposite-gender filter.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!error && results.length > 0 && (
          <div className="text-sm theme-text-muted -mt-2">
            Showing {results.length} profile{results.length !== 1 ? 's' : ''}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((m) => {
            const photo = m.photos?.[0] || '';
            const locationDisplay =
              m.city || m.state ? [m.city, m.state].filter(Boolean).join(', ') : m.location || '—';

            return (
              <Card key={m.id} className="theme-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-white">
                        {m.first_name || 'User'}, {m.age ?? '—'}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-sm theme-text-muted mt-1">
                        <MapPin className="h-4 w-4" />
                        {locationDisplay}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!m.hide_sect && m.sect ? (
                        <Badge variant="outline" className="border-primary text-primary">
                          {m.sect}
                        </Badge>
                      ) : null}
                      {m.is_public ?? true ? (
                        <div className="flex items-center gap-1 text-emerald-300 text-xs">
                          <ShieldCheck className="h-3 w-3" /> Public
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {photo ? (
                    <img
                      src={photo}
                      alt={`${m.first_name || 'User'} photo`}
                      className="w-full h-48 object-cover rounded-lg"
                      loading="lazy"
                    />
                  ) : null}

                  <div className="flex items-center gap-2 text-sm theme-text-body">
                    <Briefcase className="h-4 w-4 theme-text-muted" />
                    <span>{m.occupation || '—'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm theme-text-body">
                    <GraduationCap className="h-4 w-4 theme-text-muted" />
                    <span>{m.education || '—'}</span>
                  </div>

                  <div className="text-sm theme-text-body">
                    <strong className="text-white">Prayer Status:</strong> {m.prayer_status || '—'}
                  </div>

                  <div className="text-sm theme-text-body">
                    <strong className="text-white">Marital Status:</strong> {m.marital_status || '—'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button onClick={() => onConnect(m.id)} className="w-full theme-button">
                      <Heart className="h-4 w-4 mr-2" />
                      Request to Connect
                    </Button>
                    <Button variant="secondary" onClick={() => onViewProfile(m.id)} className="w-full">
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Load more */}
        {!loading && !error && hasMore && results.length > 0 && (
          <div className="flex justify-center">
            <Button onClick={loadMore} className="theme-button" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Load more
            </Button>
          </div>
        )}
      </div>

      {/* Sticky bottom back button (mobile-friendly) */}
      <div className="fixed bottom-4 left-0 right-0 px-4">
        <div className="max-w-6xl mx-auto">
          <Button onClick={onBack} variant="secondary" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchMatches;
