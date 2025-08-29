// C:\Users\vizir\halal-marriage\src\pages\Messages.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Messages from "@/components/Messages";

type MinimalUser = { id: string; firstName?: string };

export default function MessagesPage() {
  const { cid: rawCid } = useParams<{ cid?: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<MinimalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCid, setInitialCid] = useState<string | undefined>(undefined);

  // Load session + small profile nicety
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const u = sess?.session?.user || null;

      if (!u) {
        toast.error("Please sign in to view messages.");
        setLoading(false);
        navigate("/"); // kick back to home
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", u.id)
        .maybeSingle();

      setUser({ id: u.id, firstName: prof?.first_name ?? "User" });
      setLoading(false);
    })();
  }, [navigate]);

  // Validate the :cid route param against DB; if invalid, clear it so Messages picks the first thread
  useEffect(() => {
    (async () => {
      if (!user?.id) return;

      // No cid provided → let Messages pick the first accepted conversation
      if (!rawCid) {
        setInitialCid(undefined);
        return;
      }

      // Check that cid exists, is accepted, and belongs to this user
      const { data: conn, error } = await supabase
        .from("connections")
        .select("id, requester_id, receiver_id, status")
        .eq("id", rawCid)
        .maybeSingle();

      if (error) {
        console.warn("[messages:cid.validate] fetch error:", error);
        setInitialCid(undefined);
        return;
      }

      const isMine =
        conn &&
        (conn.requester_id === user.id || conn.receiver_id === user.id);
      const isAccepted = conn && String(conn.status).toLowerCase() === "accepted";

      if (!conn || !isMine || !isAccepted) {
        // Invalid/foreign/not-accepted ID → clear it and optionally tidy the URL
        setInitialCid(undefined);
        // Optional: strip cid from the URL so refresh doesn't re-trigger bad state
        try {
          const p = new URLSearchParams(window.location.search);
          p.delete("cid");
          // If you're using path params (/messages/:cid), you can navigate("/messages") instead:
          // navigate("/messages");
        } catch {}
      } else {
        setInitialCid(conn.id);
      }
    })();
  }, [rawCid, user?.id]);

  if (loading || !user) return null;

  return (
    <Messages
      user={user}
      initialConnectionId={initialCid}
      onBack={() => navigate("/")}
    />
  );
}
