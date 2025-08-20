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
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

type ProfileBrief = {
  id: string;
  first_name: string | null;
  age: number | null;
  location: string | null;
  photos: string[] | null;
};

type ConversationItem = {
  conn: ConnectionRow;
  other: ProfileBrief | null;
  lastMessage?: { content: string; created_at: string } | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

interface MessagesProps {
  user: any;
  initialConnectionId?: string; // optional: open a specific thread
  onBack?: () => void;          // navigate back (e.g., to dashboard)
}

const Messages: React.FC<MessagesProps> = ({ user, initialConnectionId, onBack }) => {
  const [uid, setUid] = useState<string | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(initialConnectionId ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // --- Back handler: prefer prop; otherwise force hash route to dashboard (stays in app)
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

  // keep selected thread in sync if parent changes the initialConnectionId
  useEffect(() => {
    if (initialConnectionId) setSelectedConnId(initialConnectionId);
  }, [initialConnectionId]);

  // get uid
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // load conversations (accepted connections only)
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
          ? await supabase.from('profiles').select('id, first_name, age, location, photos').in('id', otherIds)
          : ({ data: [] } as any);
        if (pErr) throw pErr;

        const pMap = new Map<string, ProfileBrief>();
        (profiles ?? []).forEach((p: any) => pMap.set(p.id, p));

        // last messages (one query, then map)
        const { data: lastMsgs, error: lErr } = list.length
          ? await supabase
              .from('messages')
              .select('connection_id, content, created_at')
              .in('connection_id', list.map((c) => c.id))
              .order('created_at', { ascending: false })
          : ({ data: [] } as any);
        if (lErr) throw lErr;

        const firstByConn = new Map<string, { content: string; created_at: string }>();
        (lastMsgs ?? []).forEach((m: any) => {
          if (!firstByConn.has(m.connection_id)) {
            firstByConn.set(m.connection_id, { content: m.content, created_at: m.created_at });
          }
        });

        const convs: ConversationItem[] = list.map((c) => ({
          conn: c,
          other: pMap.get(c.requester_id === uid ? c.receiver_id : c.requester_id) ?? null,
          lastMessage: firstByConn.get(c.id) ?? null,
        }));

        if (!active) return;
        setConversations(convs);

        // auto-select a thread if none selected
        if (!selectedConnId && convs.length > 0) {
          setSelectedConnId(convs[0].conn.id);
        }
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

  // load messages for selected conversation + subscribe realtime
  useEffect(() => {
    if (!selectedConnId) return;
    let active = true;

    const load = async () => {
      setLoadingMsgs(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, sender_id, content, created_at')
          .eq('connection_id', selectedConnId)
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

    // initial load
    load();

    // realtime subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const ch = supabase
      .channel(`messages:${selectedConnId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_id=eq.${selectedConnId}` },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) => [
            ...prev,
            { id: m.id, sender_id: m.sender_id, content: m.content, created_at: m.created_at },
          ]);
        }
      )
      .subscribe();
    channelRef.current = ch;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      active = false;
    };
  }, [selectedConnId]);

  // scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMsgs]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConnId || !uid) return;
    const content = newMessage.trim();
    setNewMessage('');
    const { error } = await supabase
      .from('messages')
      .insert({ connection_id: selectedConnId, sender_id: uid, content });
    if (error) {
      setNewMessage(content); // restore so they can retry
      toast.error(error.message || 'Could not send message');
    }
  };

  const convList = useMemo(() => conversations, [conversations]);

  const activeOther = useMemo(
    () => convList.find((c) => c.conn.id === selectedConnId)?.other ?? null,
    [convList, selectedConnId]
  );

  return (
    <div className="min-h-screen theme-bg p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Top back button */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
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
                    const last = item.lastMessage?.content ?? 'Say salam to start the conversation';
                    return (
                      <div
                        key={item.conn.id}
                        onClick={() => setSelectedConnId(item.conn.id)}
                        className={`p-4 cursor-pointer hover:bg-card/50 border-b border-border ${
                          isActive ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white">{name}</h4>
                              <Badge variant="outline" className="text-xs border-primary text-primary">
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
          <Card className="lg:col-span-2 theme-card">
            {selectedConnId ? (
              <>
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-lg text-white">
                    {activeOther?.first_name ? `Conversation with ${activeOther.first_name}` : 'Conversation'}
                  </CardTitle>
                  <p className="text-sm text-primary">Maintain Islamic etiquette and keep intentions for nikah.</p>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[450px]">
                  {/* Messages */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {loadingMsgs ? (
                      <div className="flex items-center gap-2 theme-text-muted">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="theme-text-muted">No messages yet. Say salam to begin.</div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.sender_id === uid
                                ? 'theme-button text-white'
                                : 'bg-card text-white border border-border'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender_id === uid ? 'text-white/70' : 'theme-text-muted'
                              }`}
                            >
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-border p-4">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message… (Keep it respectful and marriage-focused)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        className="theme-button"
                        aria-label="Send message"
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-[500px]">
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
