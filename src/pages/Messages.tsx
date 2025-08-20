// C:\Users\vizir\halal-marriage\src\pages\Messages.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Messages from "@/components/Messages";

type MinimalUser = { id: string; firstName?: string };

export default function MessagesPage() {
  const { cid } = useParams<{ cid?: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<MinimalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const u = sess?.session?.user || null;
      if (!u) {
        toast.error("Please sign in to view messages.");
        setLoading(false);
        return;
      }

      // Try to fetch first_name for UX nicety; safe to ignore errors
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", u.id)
        .maybeSingle();

      setUser({ id: u.id, firstName: prof?.first_name ?? "User" });
      setLoading(false);
    })();
  }, []);

  if (loading || !user) return null;

  return (
    <Messages
      user={user}
      initialConnectionId={cid}
      onBack={() => navigate("/")}
    />
  );
}
