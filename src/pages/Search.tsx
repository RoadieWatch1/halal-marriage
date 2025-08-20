// C:\Users\vizir\halal-marriage\src\pages\Search.tsx
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import SearchMatches from "@/components/SearchMatches";

export default function SearchPage() {
  const navigate = useNavigate();

  const onConnect = useCallback(async (otherUserId: string) => {
    const { data } = await supabase.auth.getUser();
    const me = data.user?.id;
    if (!me) return toast.error("Please sign in to send a request.");
    if (me === otherUserId) return toast.error("You cannot connect with yourself.");

    const { error } = await supabase
      .from("connections")
      .insert({ requester_id: me, receiver_id: otherUserId, status: "pending" });

    if (error) {
      const msg = (error as any)?.message || String(error);
      if (msg.toLowerCase().includes("duplicate") || msg.includes("unique")) {
        toast.info("Request already sent or you are already connected.");
      } else {
        console.error("connect error:", error);
        toast.error("Could not send request: " + msg);
      }
      return;
    }

    toast.success("Request sent. The user will be notified.");
  }, []);

  return (
    <SearchMatches
      onConnect={onConnect}
      onBack={() => navigate("/")}
      onViewProfile={(id) => navigate(`/profile/${id}`)}
    />
  );
}
