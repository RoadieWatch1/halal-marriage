// C:\Users\vizir\halal-marriage\src\components\Messages.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type ConnectionRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'rejected' | 'blocked';
  created_at: string;
};

type ProfileBrief = {
  id: string;
  first_name: string | null;
  age: number | null;
  location: string | null;
  photos: string[] | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  content?: string | null;
  body?: string | null;     // if your schema uses "body"
  created_at: string;
  connection_id: string;
};

type UiMessageStatus = 'sending' | 'sent' | 'error';
type UiMessage = MessageRow & { _client_id?: string; _status?: UiMessageStatus };

type ConversationItem = {
  conn: ConnectionRow;
  other: ProfileBrief | null;
  lastMessage?: { text: string; created_at: string } | null;
};

interface MessagesProps {
  user: any;
  initialConnectionId?: string;
  onBack?: () => void;
}

const friendly = (raw?: string) => {
  const m = (raw || '').toLowerCase();
  if (m.includes('permission denied') || m.includes('violates row-level security')) {
    return 'You are not allowed to send messages to this user yet (connection must be accepted).';
  }
  if (m.includes('foreign key') || m.includes('connection_id')) {
    return 'This conversation is not available. Try opening it again from Connections.';
  }
  return raw || 'Could not send message';
};

const Messages: React.FC<MessagesProps> = ({ user, initialConnectionId, onBack }) => {
  const [uid, setUid] = useState<string | null>(user?.id ?? null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(initialConnectionId ?? null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setUid(user?.id ?? null); }, [user?.id]);
  useEffect(() => {
    // Fallback: fetch auth user if parent didn't pass one yet
    if (!uid) supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, [uid]);

  const handleBack = () => {
    if (onBack) return onBack();
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      p.set('s', 'dashboard'); p.delete('cid'); p.delete('uid');
      window.location.hash = `#${p.toString()}`;
    }
  };

  useEffect(() => { if (initialConnectionId) setSelectedConnId(initialConnectionId); }, [initialConnectionId]);

  // Load conversations (accepted only)
  useEffect(() => {
    if (!uid) return;
    let active = true;

    (async () => {
      setLoadingConvs(true);
      setError(null);
      try {
        const { data: rows, error } = await supabase
          .from('connections')
          .select('id, requester_id, receiver_id, status, created_at')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const list = (rows ?? []) as ConnectionRow[];
        const otherIds = Array.from(new Set(list.map((c) => (c.requester_id === uid ? c.receiver_id : c.requester_id))));

        const { data: profiles, error: pErr } = otherIds.length
          ? await supabase.from('profiles').select('id, first_name, age, location, photos').in('id', otherIds)
          : ({ data: [] } as any);
        if (pErr) throw pErr;

        const pMap = new Map<string, ProfileBrief>();
        (profiles ?? []).forEach((p: any) => pMap.set(p.id, p));

        // Last messages (per connection)
        const { data: lastMsgs, error: lErr } = list.length
          ? await supabase
              .from('messages')
              .select('*')
              .in('connection_id', list.map((c) => c.id))
              .order('created_at', { ascending: false })
          : ({ data: [] } as any);
        if (lErr) throw lErr;

        const firstByConn = new Map<string, { text: string; created_at: string }>();
        (lastMsgs ?? []).forEach((m: any) => {
          if (!firstByConn.has(m.connection_id)) {
            const text = (m.content ?? m.body ?? '') as string;
            firstByConn.set(m.connection_id, { text, created_at: m.created_at as string });
          }
        });

        const convs: ConversationItem[] = list.map((c) => ({
          conn: c,
          other: pMap.get(c.requester_id === uid ? c.receiver_id : c.requester_id) ?? null,
          lastMessage: firstByConn.get(c.id) ?? null,
        }));

        if (!active) return;
        setConversations(convs);
        if (!selectedConnId && convs.length > 0) setSelectedConnId(convs[0].conn.id);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.message || 'Failed to load conversations';
        setError(msg);
        toast.error(msg);
      } finally {
        if (active) setLoadingConvs(false);
      }
    })();

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Load messages for selected conversation + subscribe realtime
  useEffect(() => {
    if (!selectedConnId) return;
    let active = true;

    const load = async () => {
      setLoadingMsgs(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('connection_id', selectedConnId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (!active) return;
        setMessages((data ?? []) as UiMessage[]);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.message || 'Failed to load messages';
        setError(msg);
        toast.error(msg);
      } finally {
        if (active) setLoadingMsgs(false);
      }
    };

    load();

    // realtime (connection_id only)
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    const ch = supabase
      .channel(`messages:conn:${selectedConnId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_id=eq.${selectedConnId}` },
        (payload) => {
          const m = payload.new as any;
          const serverText = (m.content ?? m.body ?? '') as string;

          setMessages((prev) => {
            // match optimistic bubble (same sender, text, and connection)
            const idx = prev.findIndex(
              (x) =>
                x._status === 'sending' &&
                x.sender_id === m.sender_id &&
                x.connection_id === m.connection_id &&
                (x.content ?? x.body ?? '') === serverText
            );
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = {
                id: m.id,
                sender_id: m.sender_id,
                content: m.content,
                body: m.body,
                created_at: m.created_at,
                connection_id: m.connection_id,
                _status: 'sent',
              };
              return clone;
            }
            return [
              ...prev,
              {
                id: m.id,
                sender_id: m.sender_id,
                content: m.content,
                body: m.body,
                created_at: m.created_at,
                connection_id: m.connection_id,
                _status: 'sent',
              },
            ];
          });
        }
      )
      .subscribe();
    channelRef.current = ch;

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      active = false;
    };
  }, [selectedConnId]);

  // Polling fallback (8s)
  useEffect(() => {
    if (!selectedConnId) return;
    const id = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', selectedConnId)
        .order('created_at', { ascending: true });
      if (data) {
        // keep any local "sending/error" bubbles
        setMessages((prev) => {
          const locals = prev.filter((m) => m._status && String(m.id).startsWith('local-'));
          return [...(data as UiMessage[]), ...locals];
        });
      }
    }, 8000);
    return () => clearInterval(id);
  }, [selectedConnId]);

  // scroll + focus
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loadingMsgs]);
  useEffect(() => {
    inputRef.current?.focus();
    if (selectedConnId) setNewMessage(drafts[selectedConnId] ?? '');
  }, [selectedConnId]);

  const onChangeDraft = (v: string) => {
    setNewMessage(v);
    if (selectedConnId) setDrafts((d) => ({ ...d, [selectedConnId]: v }));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConnId || !uid || sending) return;
    const text = newMessage.trim();
    const clientId = `local-${Date.now()}`;
    const nowIso = new Date().toISOString();

    setSending(true);
    setNewMessage('');
    if (selectedConnId) setDrafts((d) => ({ ...d, [selectedConnId]: '' }));

    // optimistic bubble
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        _client_id: clientId,
        _status: 'sending',
        sender_id: uid!,
        content: text,
        created_at: nowIso,
        connection_id: selectedConnId!,
      },
    ]);

    const base = { sender_id: uid!, connection_id: selectedConnId! };
    let inserted: any = null;
    let lastErr: any = null;

    const tryInsert = async (payload: Record<string, any>) => {
      const { data, error } = await supabase.from('messages').insert(payload).select().single();
      if (!error && data) return { data };
      // Try without returning (RLS may block returning)
      const r2 = await supabase.from('messages').insert(payload);
      if (!r2.error) return { data: { ...payload, created_at: nowIso } };
      return { error: r2.error ?? error };
    };

    // Try content then body
    for (const payload of [{ ...base, content: text }, { ...base, body: text }]) {
      const { data, error } = await tryInsert(payload);
      if (data) { inserted = data; break; }
      lastErr = error;
    }

    if (inserted) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === clientId
            ? {
                ...m,
                _status: 'sent',
                id: inserted.id ?? m.id,
                created_at: inserted.created_at ?? m.created_at,
                content: inserted.content ?? m.content,
                body: inserted.body ?? m.body,
              }
            : m
        )
      );
    } else {
      setMessages((prev) => prev.map((m) => (m.id === clientId ? { ...m, _status: 'error' } : m)));
      setNewMessage(text);
      if (selectedConnId) setDrafts((d) => ({ ...d, [selectedConnId]: text }));
      toast.error(friendly(lastErr?.message));
      console.error('send message error:', lastErr);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const convList = useMemo(() => conversations, [conversations]);
  const activeOther = useMemo(
    () => convList.find((c) => c.conn.id === selectedConnId)?.other ?? null,
    [convList, selectedConnId]
  );

  const nameOfOther = activeOther?.first_name || 'User';
  const avatarOfOther = activeOther?.photos?.[0] || '';
  const initialOfOther = (nameOfOther || 'U').trim().charAt(0).toUpperCase();

  const Avatar: React.FC<{ url?: string; fallback: string; size: number; alt: string }> = ({
    url,
    fallback,
    size,
    alt,
  }) => {
    if (url) {
      return (
        <img
          src={url}
          alt={alt}
          style={{ width: size, height: size }}
          className="rounded-full object-cover border border-border"
          loading="lazy"
        />
      );
    }
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] border border-border text-ivory"
        aria-label={alt}
        title={alt}
      >
        <span className="text-sm">{fallback}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen theme-bg p-4 pb-28 md:pb-10">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Top back button */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[70vh]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 theme-card">
            <CardHeader>
              <CardTitle className="text-white">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingConvs ? (
                <div className="flex items-center gap-2 p-4 theme-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : error ? (
                <div className="p-4 text-red-300">{error}</div>
              ) : convList.length === 0 ? (
                <div className="p-4 theme-text-muted">No accepted connections yet.</div>
              ) : (
                <div className="space-y-1">
                  {convList.map((item) => {
                    const isActive = selectedConnId === item.conn.id;
                    const name = item.other?.first_name || 'User';
                    const last = item.lastMessage?.text ?? 'Say salam to start the conversation';
                    const avatar = item.other?.photos?.[0] || '';
                    const initial = (name || 'U').trim().charAt(0).toUpperCase();

                    return (
                      <div
                        key={item.conn.id}
                        onClick={() => setSelectedConnId(item.conn.id)}
                        className={`p-4 cursor-pointer hover:bg-card/50 border-b border-border ${
                          isActive ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar url={avatar} fallback={initial} size={40} alt={`${name} avatar`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white truncate">{name}</h4>
                              <Badge variant="outline" className="text-xs border-primary text-primary shrink-0">
                                Accepted
                              </Badge>
                            </div>
                            <p className="text-sm theme-text-body truncate mt-1">{last}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 theme-card flex flex-col">
            {selectedConnId ? (
              <>
                {/* Header */}
                <CardHeader className="border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar url={avatarOfOther} fallback={initialOfOther} size={48} alt={`${nameOfOther} avatar large`} />
                    <div className="min-w-0">
                      <CardTitle className="text-lg text-white truncate">
                        {activeOther?.first_name ? `Conversation with ${activeOther.first_name}` : 'Conversation'}
                      </CardTitle>
                      <p className="text-sm theme-text-muted">
                        Maintain Islamic etiquette and keep intentions for nikah.
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages + Composer */}
                <CardContent className="p-0 flex-1 flex flex-col min-h-[60vh]">
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {loadingMsgs ? (
                      <div className="flex items-center gap-2 theme-text-muted">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="theme-text-muted">No messages yet. Say salam to begin.</div>
                    ) : (
                      messages.map((message) => {
                        const isMine = message.sender_id === uid;
                        const text = (message.content ?? message.body ?? '').trim();

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}
                          >
                            {!isMine && (
                              <Avatar
                                url={avatarOfOther}
                                fallback={initialOfOther}
                                size={32}
                                alt={`${nameOfOther} avatar small`}
                              />
                            )}

                            <div
                              className={`max-w-[72%] p-3 rounded-lg break-words whitespace-pre-wrap ${
                                isMine ? 'theme-button text-white' : 'bg-card text-white border border-border'
                              }`}
                            >
                              <p className="text-sm">{text || '…'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className={`text-xs ${isMine ? 'text-white/70' : 'theme-text-muted'}`}>
                                  {new Date(message.created_at).toLocaleString()}
                                </p>
                                {isMine && message._status === 'sending' && (
                                  <span className="text-[11px] opacity-80">sending…</span>
                                )}
                                {isMine && message._status === 'error' && (
                                  <button
                                    type="button"
                                    className="text-[11px] underline"
                                    onClick={() => {
                                      const retryText = (message.content ?? message.body ?? '').trim();
                                      setNewMessage(retryText);
                                      if (selectedConnId) {
                                        setDrafts((d) => ({ ...d, [selectedConnId]: retryText }));
                                      }
                                      setMessages((prev) => prev.filter((m) => m.id !== message.id));
                                      inputRef.current?.focus();
                                    }}
                                  >
                                    retry
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="sticky bottom-3 mx-3 mb-3 rounded-xl bg-[rgba(31,41,55,0.95)] border border-border shadow-lg backdrop-blur p-3 z-10">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => onChangeDraft(e.target.value)}
                        placeholder="Type your message…  •  Enter to send  •  Shift+Enter for new line"
                        aria-label="Message"
                        className="h-12 text-base bg-[rgba(255,255,255,0.08)] text-foreground placeholder-[rgba(248,247,242,.70)] border-border"
                        disabled={sending}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        className="theme-button h-12 px-5"
                        aria-label="Send message"
                        disabled={sending || !newMessage.trim()}
                      >
                        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 theme-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
                  <p className="text-sm theme-text-muted">
                    Choose an accepted connection from the left to start messaging
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Sticky bottom back button (mobile-friendly) */}
      <div className="fixed bottom-4 left-0 right-0 px-4">
        <div className="max-w-6xl mx-auto">
          <Button onClick={handleBack} variant="secondary" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
