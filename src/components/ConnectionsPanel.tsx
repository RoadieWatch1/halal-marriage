// C:\Users\vizir\halal-marriage\src\components\ConnectionsPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { Check, X, Users, Loader2, MapPin, Eye, RefreshCcw, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

type ConnectionRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

type ProfileBrief = {
  id: string;
  first_name: string | null;
  age: number | null;
  // Prefer split fields; keep legacy fallback
  city: string | null;
  state: string | null;
  location: string | null;
  photos: string[] | null;
};

type PendingItem = {
  conn: ConnectionRow;
  requester: ProfileBrief | null;
};

type AcceptedItem = {
  conn: ConnectionRow;
  other: ProfileBrief | null;
};

interface Props {
  /** Optional: if provided, show "View profile" buttons */
  onViewProfile?: (userId: string) => void;
  /** Optional: open Messages with a specific connection thread */
  onOpenMessages?: (connectionId: string) => void;
}

const ConnectionsPanel: React.FC<Props> = ({ onViewProfile, onOpenMessages }) => {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [accepted, setAccepted] = useState<AcceptedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const formatLocation = (p?: ProfileBrief | null) => {
    const city = (p?.city || '').trim();
    const state = (p?.state || '').trim();
    const split = [city, state].filter(Boolean).join(', ');
    return split || p?.location || '—';
  };

  useEffect(() => {
    if (!uid) return;
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Incoming pending requests (I'm the receiver)
        const { data: incoming, error: inErr } = await supabase
          .from('connections')
          .select('id, requester_id, receiver_id, status, created_at')
          .eq('receiver_id', uid)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (inErr) throw inErr;

        const requesterIds = Array.from(new Set((incoming ?? []).map((c) => c.requester_id)));
        const { data: reqProfiles, error: rpErr } = requesterIds.length
          ? await supabase
              .from('profiles')
              .select('id, first_name, age, city, state, location, photos')
              .in('id', requesterIds)
          : ({ data: [] } as any);

        if (rpErr) throw rpErr;

        const reqMap = new Map<string, ProfileBrief>();
        (reqProfiles ?? []).forEach((p: any) => reqMap.set(p.id, p));
        const pendingItems: PendingItem[] = (incoming ?? []).map((c) => ({
          conn: c as ConnectionRow,
          requester: reqMap.get(c.requester_id) ?? null,
        }));

        // 2) My accepted connections (either side)
        const { data: acceptedRows, error: acErr } = await supabase
          .from('connections')
          .select('id, requester_id, receiver_id, status, created_at')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
          .order('created_at', { ascending: false });

        if (acErr) throw acErr;

        const otherIds = Array.from(
          new Set((acceptedRows ?? []).map((c) => (c.requester_id === uid ? c.receiver_id : c.requester_id))),
        );
        const { data: otherProfiles, error: opErr } = otherIds.length
          ? await supabase
              .from('profiles')
              .select('id, first_name, age, city, state, location, photos')
              .in('id', otherIds)
          : ({ data: [] } as any);

        if (opErr) throw opErr;

        const otherMap = new Map<string, ProfileBrief>();
        (otherProfiles ?? []).forEach((p: any) => otherMap.set(p.id, p));
        const acceptedItems: AcceptedItem[] = (acceptedRows ?? []).map((c) => {
          const otherId = c.requester_id === uid ? c.receiver_id : c.requester_id;
          return { conn: c as ConnectionRow, other: otherMap.get(otherId) ?? null };
        });

        if (!active) return;
        setPending(pendingItems);
        setAccepted(acceptedItems);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.message || 'Failed to load connections';
        setError(msg);
        toast.error(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [uid, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Optimistic accept: remove from pending immediately; add to accepted list
  const accept = async (id: string) => {
    const idx = pending.findIndex((p) => p.conn.id === id);
    const pendItem = idx >= 0 ? pending[idx] : null;

    // optimistic update
    if (pendItem) {
      setPending((list) => list.filter((p) => p.conn.id !== id));
      setAccepted((list) => [
        { conn: { ...pendItem.conn, status: 'accepted' }, other: pendItem.requester },
        ...list,
      ]);
    }

    const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', id);
    if (error) {
      // revert if needed
      if (pendItem) {
        setAccepted((list) => list.filter((a) => a.conn.id !== id));
        setPending((list) => [pendItem, ...list]);
      }
      toast.error(error.message || 'Could not accept the request');
      return;
    }
    toast.success('Request accepted');
    if (onOpenMessages) onOpenMessages(id);
  };

  // Optimistic decline: remove from pending immediately
  const decline = async (id: string) => {
    const idx = pending.findIndex((p) => p.conn.id === id);
    const pendItem = idx >= 0 ? pending[idx] : null;

    if (pendItem) setPending((list) => list.filter((p) => p.conn.id !== id));

    const { error } = await supabase.from('connections').update({ status: 'declined' }).eq('id', id);
    if (error) {
      if (pendItem) setPending((list) => [pendItem, ...list]);
      toast.error(error.message || 'Could not decline the request');
      return;
    }
    toast.success('Request declined');
  };

  const total = useMemo(() => ({ pending: pending.length, accepted: accepted.length }), [pending, accepted]);

  return (
    <div className="max-w-6xl mx-auto mt-6 space-y-6">
      {/* Pending requests (anchor target for Dashboard tile) */}
      <Card className="theme-card" id="connections-panel">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-white">Connection Requests</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary text-primary">
              {total.pending} pending
            </Badge>
            <Button variant="ghost" size="icon" aria-label="Refresh" onClick={refresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 theme-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="flex items-center justify-between">
              <div className="text-red-300">{error}</div>
              <Button variant="secondary" onClick={refresh}>Retry</Button>
            </div>
          ) : pending.length === 0 ? (
            <div className="theme-text-muted">No pending requests.</div>
          ) : (
            <div className="space-y-3">
              {pending.map(({ conn, requester }) => {
                const img = requester?.photos?.[0] || '';
                const loc = formatLocation(requester);
                return (
                  <div key={conn.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={img} alt={requester?.first_name || 'User'} />
                        <AvatarFallback>{(requester?.first_name || 'U').slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-white font-medium">
                          {requester?.first_name || 'User'}
                          {requester?.age ? `, ${requester.age}` : ''}
                        </div>
                        <div className="text-xs theme-text-muted flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {loc}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onViewProfile && requester?.id && (
                        <Button variant="secondary" onClick={() => onViewProfile(requester.id)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      )}
                      <Button className="theme-button" onClick={() => accept(conn.id)}>
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                      <Button variant="ghost" onClick={() => decline(conn.id)}>
                        <X className="h-4 w-4 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accepted connections */}
      <Card className="theme-card" id="your-connections">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-white">Your Connections</CardTitle>
          <Badge variant="outline" className="border-primary text-primary">
            {total.accepted} total
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 theme-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : accepted.length === 0 ? (
            <div className="theme-text-muted">No accepted connections yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accepted.map(({ conn, other }) => {
                const img = other?.photos?.[0] || '';
                const loc = formatLocation(other);
                return (
                  <div key={conn.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={img} alt={other?.first_name || 'User'} />
                        <AvatarFallback>{(other?.first_name || 'U').slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-white font-medium">
                          {other?.first_name || 'User'}
                          {other?.age ? `, ${other.age}` : ''}
                        </div>
                        <div className="text-xs theme-text-muted flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {loc}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onViewProfile && other?.id && (
                        <Button variant="secondary" onClick={() => onViewProfile(other.id)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() =>
                          onOpenMessages
                            ? onOpenMessages(conn.id)
                            : toast('Open the Messages section to chat.')
                        }
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionsPanel;
