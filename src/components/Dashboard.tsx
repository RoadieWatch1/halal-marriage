import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  UserPlus,
  MessageSquare,
  CheckCircle2,
  Settings2,
  Search,
  Edit3,
  ArrowRight,
} from "lucide-react";

type Section = "dashboard" | "search" | "messages" | "profile";

interface DashboardProps {
  user: any;
  onNavigate: (section: Section) => void;
}

/** Naive completion %: count a few meaningful fields */
function estimateCompletion(u: any): number {
  if (!u) return 0;
  const fields = [
    u.firstName,
    u.age,
    u.city,
    u.state,
    u.gender,
    u.occupation,
    u.education,
    u.prayerStatus,
    u.maritalStatus,
    u.bio,
  ];
  const photosCount = Array.isArray(u.photos) ? Math.min(u.photos.length, 3) : 0; // up to 3 credit
  const base = fields.filter(Boolean).length + photosCount;
  const total = fields.length + 3;
  const pct = Math.round((base / total) * 100);
  return Math.max(0, Math.min(100, pct));
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const firstName = user?.firstName || "Friend";
  const completion = useMemo(() => estimateCompletion(user), [user]);

  // TODO: replace with real counts from Supabase
  const profileViews = 12;
  const pendingRequests = 3;
  const activeConvos = 1;

  // Click handlers
  const openProfileViews = () => {
    const el = document.getElementById("profile-views");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openRequests = () => {
    const el = document.getElementById("connections-panel");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else onNavigate("dashboard");
  };

  const openMessages = () => onNavigate("messages");
  const openProfile = () => onNavigate("profile");

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Assalamu Alaikum, {firstName}!
          </h1>
          <p className="theme-text-muted mt-1">
            May Allah guide you to your righteous spouse. This platform is for halal marriage only.
          </p>
        </div>

        <div className="hidden md:flex gap-2">
          <Button
            className="btn-secondary"
            onClick={() => onNavigate("profile")}
            title="Edit Profile"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button
            className="btn-secondary"
            onClick={() => onNavigate("search")}
            title="Find Matches"
          >
            <Search className="h-4 w-4 mr-2" />
            Find Matches
          </Button>
          <Button
            className="btn-secondary"
            onClick={() => onNavigate("messages")}
            title="View Messages"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </Button>
        </div>
      </header>

      {/* Stats row (all clickable) */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Profile Views"
          value={profileViews}
          hint="This week"
          onClick={openProfileViews}
          ariaLabel="Open Profile Views section"
        />
        <StatCard
          icon={<UserPlus className="h-4 w-4" />}
          label="Connection Requests"
          value={pendingRequests}
          hint="Pending review"
          onClick={openRequests}
          ariaLabel="Open Connection Requests"
        />
        <StatCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Active Conversations"
          value={activeConvos}
          hint="Ongoing"
          onClick={openMessages}
          ariaLabel="Open Messages"
        />

        {/* Profile completion (click to edit profile) */}
        <button
          type="button"
          onClick={openProfile}
          aria-label="Open Edit Profile"
          className="w-full text-left group"
        >
          <Card className="theme-card p-4 transition hover:shadow-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[rgba(212,175,55,.35)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm theme-text-muted">Profile Complete</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{completion}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[rgba(255,255,255,.08)]">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${completion}%`,
                  background: "linear-gradient(180deg, var(--teal-600), var(--teal-700))",
                }}
              />
            </div>
            <p className="mt-2 text-xs theme-text-muted flex items-center">
              Complete your profile for better matches.
              <ArrowRight className="h-4 w-4 ml-1 opacity-80" />
            </p>
          </Card>
        </button>
      </section>

      {/* Quick Actions */}
      <section className="theme-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <Settings2 className="h-4 w-4 theme-text-muted" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button className="theme-button w-full" onClick={() => onNavigate("profile")}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button className="theme-button w-full" onClick={() => onNavigate("search")}>
            <Search className="h-4 w-4 mr-2" />
            Find Matches
          </Button>
          <Button className="theme-button w-full" onClick={() => onNavigate("messages")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            View Messages
          </Button>
        </div>
      </section>

      {/* Guidance blocks (optional, calm & simple) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="theme-card p-4 md:p-5">
          <h3 className="text-base font-semibold text-foreground mb-1">Potential Matches</h3>
          <p className="text-sm theme-text-muted mb-4">
            Browse opposite-gender profiles aligned with your values.
          </p>
          <Button className="btn-secondary" onClick={() => onNavigate("search")}>
            Explore matches
          </Button>
        </Card>

        <Card className="theme-card p-4 md:p-5">
          <h3 className="text-base font-semibold text-foreground mb-1">Messages</h3>
          <p className="text-sm theme-text-muted mb-4">
            Continue conversations respectfully. Involve family or wali as needed.
          </p>
          <Button className="btn-secondary" onClick={() => onNavigate("messages")}>
            Open inbox
          </Button>
        </Card>
      </section>

      {/* Optional anchor section for Profile Views (so the tile scroll works) */}
      <section id="profile-views" className="theme-card p-4 md:p-5">
        <h3 className="text-base font-semibold text-foreground mb-1">Profile Views</h3>
        <p className="text-sm theme-text-muted">
          Views in the last 7 days: <span className="text-foreground font-semibold">{profileViews}</span>
        </p>
        <p className="text-xs theme-text-muted mt-2">
          We’ll soon list who viewed your profile (respecting privacy settings).
        </p>
      </section>
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
  hint,
  onClick,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const Wrapper: React.ElementType = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-full text-left ${onClick ? "group" : ""}`}
    >
      <Card className="theme-card p-4 transition hover:shadow-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[rgba(212,175,55,.35)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.08)]">
              {icon}
            </span>
            <span className="text-sm theme-text-muted">{label}</span>
          </div>
          <span className="text-lg font-semibold text-foreground">{value}</span>
        </div>
        {hint ? (
          <p className="mt-2 text-xs theme-text-muted flex items-center">
            {hint}
            {onClick ? <ArrowRight className="h-4 w-4 ml-1 opacity-80" /> : null}
          </p>
        ) : null}
      </Card>
    </Wrapper>
  );
}

export default Dashboard;
