// C:\Users\vizir\halal-marriage\src\pages\Profile.tsx
import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ProfileView from "@/components/ProfileView";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
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

  if (!id) return null;

  return (
    <ProfileView
      userId={id}
      onBack={() => navigate("/search")}
      onConnect={onConnect}
    />
  );
}
