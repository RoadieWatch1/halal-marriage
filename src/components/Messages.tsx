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
  content?: string | null; // some schemas
  body?: string | null;    // alternative column
  created_at: string;
  connection_id?: string | null;
  conversation_id?: string | null; // alternative FK
};

type ConversationItem = {
  conn: ConnectionRow;
  other: ProfileBrief | null;
  lastMessage?: { text: string; created_at: string } | null;
};

interface MessagesProps {
  user: any;
  initialConnectionId?: string; // open a specific thread
  onBack?: () => void;          // navigate back (e.g., to dashboard)
}

const Messages: React.FC<MessagesProps> = ({ user, initialConnectionId, onBack }) => {
  const [uid, setUid] = useState<string | null>(user?.id ?? null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(initialConnectionId ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Two channels: one for connection_id, one for conversation_id (support either schema)
  const channelConnRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelConvRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setUid(user?.id ?? null);
  }, [user?.id]);

  const handleBack = () => {
    if (onBack) return onBack();
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      p.set('s', 'dashboard');
      p.delete('cid');
      p.delete('uid');
      window.location.hash = `#${p.toString()}`;
    }
  };

  useEffect(() => {
    if (initialConnectionId) setSelectedConnId(initialConnectionId);
  }, [initialConnectionId]);

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
        const otherIds = Array.from(
          new Set(list.map((c) => (c.requester_id === uid ? c.receiver_id : c.requester_id)))
        );

        const { data: profiles, error: pErr } = otherIds.length
          ? await supabase
              .from('profiles')
              .select('id, first_name, age, location, photos')
              .in('id', otherIds)
          : ({ data: [] } as any);
        if (pErr) throw pErr;

        const pMap = new Map<string, ProfileBrief>();
        (profiles ?? []).forEach((p: any) => pMap.set(p.id, p));

        // Last messages — select * then pick first per connection
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

    return () => {
      active = false;
    };
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
        // Support either schema: connection_id or conversation_id
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`connection_id.eq.${selectedConnId},conversation_id.eq.${selectedConnId}`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!active) return;
        setMessages((data ?? []) as MessageRow[]);
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

    // --- realtime subscriptions (both possible FK columns)
    // clear existing
    if (channelConnRef.current) {
      supabase.removeChannel(channelConnRef.current);
      channelConnRef.current = null;
    }
    if (channelConvRef.current) {
      supabase.removeChannel(channelConvRef.current);
      channelConvRef.current = null;
    }

    const onInsert = (payload: any) => {
      const m = payload.new as any;
      // Only append if it belongs to this thread by either FK
      if (m.connection_id !== selectedConnId && m.conversation_id !== selectedConnId) return;

      setMessages((prev) => [
        ...prev,
        {
          id: m.id,
          sender_id: m.sender_id,
          content: m.content,
          body: m.body,
          created_at: m.created_at,
          connection_id: m.connection_id,
          conversation_id: m.conversation_id,
        },
      ]);
    };

    const chConn = supabase
      .channel(`messages:conn:${selectedConnId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_id=eq.${selectedConnId}` },
        onInsert
      )
      .subscribe();

    const chConv = supabase
      .channel(`messages:conv:${selectedConnId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConnId}` },
        onInsert
      )
      .subscribe();

    channelConnRef.current = chConn;
    channelConvRef.current = chConv;

    return () => {
      if (channelConnRef.current) {
        supabase.removeChannel(channelConnRef.current);
        channelConnRef.current = null;
      }
      if (channelConvRef.current) {
        supabase.removeChannel(channelConvRef.current);
        channelConvRef.current = null;
      }
      active = false;
    };
  }, [selectedConnId]);

  // scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMsgs]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConnId || !uid || sending) return;
    const text = newMessage.trim();

    setSending(true);
    setNewMessage(''); // optimistic clear

    const base = { sender_id: uid };
    let inserted: any = null;
    let err: any = null;

    const nowIso = new Date().toISOString();

    // Helper: optimistic append if we can't select the row due to RLS returning
    const optimisticAppend = (fkKey: 'connection_id' | 'conversation_id') => {
      const temp: MessageRow = {
        id: `local-${Date.now()}`,
        sender_id: uid,
        content: text,
        created_at: nowIso,
        connection_id: fkKey === 'connection_id' ? selectedConnId : null,
        conversation_id: fkKey === 'conversation_id' ? selectedConnId : null,
      };
      setMessages((prev) => [...prev, temp]);
    };

    // Try 1: connection_id + content with returning
    let res = await supabase.from('messages').insert({ ...base, connection_id: selectedConnId, content: text }).select().single();

    if (res.error) {
      // If column doesn't exist OR returning blocked, try fallback paths

      // Try 1b: connection_id + body with returning
      const res2 = await supabase.from('messages').insert({ ...base, connection_id: selectedConnId, body: text }).select().single();

      if (res2.error) {
        // Try 2: conversation_id path (some schemas)
        const r3 = await supabase.from('messages').insert({ ...base, conversation_id: selectedConnId, content: text }).select().single();

        if (r3.error) {
          const r4 = await supabase.from('messages').insert({ ...base, conversation_id: selectedConnId, body: text }).select().single();

          if (r4.error) {
            // Last resort: insert without returning (RLS may block returning but allow insert)
            // We'll do it for both FK possibilities and append optimistically on success

            // 2a no-returning (connection_id)
            const r5 = await supabase.from('messages').insert({ ...base, connection_id: selectedConnId, content: text });
            if (!r5.error) {
              optimisticAppend('connection_id');
              setSending(false);
              return;
            }

            // 2b no-returning (conversation_id)
            const r6 = await supabase.from('messages').insert({ ...base, conversation_id: selectedConnId, content: text });
            if (!r6.error) {
              optimisticAppend('conversation_id');
              setSending(false);
              return;
            }

            // Still failed — show last error
            err = r4.error ?? r3.error ?? res2.error ?? res.error;
          } else {
            inserted = r4.data;
          }
        } else {
          inserted = r3.data;
        }
      } else {
        inserted = res2.data;
      }
    } else {
      inserted = res.data;
    }

    if (inserted) {
      setMessages((prev) => [
        ...prev,
        {
          id: inserted.id,
          sender_id: inserted.sender_id,
          content: inserted.content,
          body: inserted.body,
          created_at: inserted.created_at,
          connection_id: inserted.connection_id,
          conversation_id: inserted.conversation_id,
        },
      ]);
    } else {
      setNewMessage(text); // restore so they can retry
      toast.error(err?.message || 'Could not send message');
      console.error('send message error:', err);
    }

    setSending(false);
  };

  const convList = useMemo(() => conversations, [conversations]);
  const activeOther = useMemo(
    () => convList.find((c) => c.conn.id === selectedConnId)?.other ?? null,
    [convList, selectedConnId]
  );

  // Avatar helpers
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
                              <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'theme-text-muted'}`}>
                                {new Date(message.created_at).toLocaleString()}
                              </p>
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
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message…"
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
