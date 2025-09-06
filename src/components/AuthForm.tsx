// C:\Users\vizir\halal-marriage\src\components\AuthForm.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthFormProps {
  onAuth: () => void; // called after a session exists
}

type Mode = 'signin' | 'signup' | 'forgot' | 'verify';

const AuthForm: React.FC<AuthFormProps> = ({ onAuth }) => {
  const [mode, setMode] = useState<Mode>('signin');

  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState(''); // used on the verify screen
  const [unconfirmedFlow, setUnconfirmedFlow] = useState(false); // sign-in tried before confirming

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  // If the user arrives from the email link, Supabase creates a session.
  // Detect that and advance the app.
  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        onAuth();
        return;
      }
      unsub = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) onAuth();
      });
    })();

    return () => {
      unsub?.data.subscription.unsubscribe();
    };
  }, [onAuth]);

  const switchMode = (next: Mode) => {
    setMode(next);
    // keep email when switching modes; clear sensitive fields for safety
    setPassword('');
    setConfirm('');
    setShowPwd(false);
    setShowConfirm(false);
    if (next !== 'verify') {
      setUnconfirmedFlow(false);
    }
  };

  const doSignIn = async () => {
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      // Common message: "Email not confirmed"
      const msg = error.message || '';
      if (/confirm|verified|not.*confirm/i.test(msg)) {
        setPendingEmail(email);
        setUnconfirmedFlow(true);
        setMode('verify');
        toast.message('Please confirm your email to continue.');
        return;
      }
      toast.error(msg || 'Sign in failed');
      return;
    }

    if (data.session) {
      toast.success('Welcome back!');
      onAuth();
    }
  };

  const doSignUp = async () => {
    if (!firstName.trim()) {
      toast.error('Please enter your first name.');
      return;
    }
    if (!email || !password) {
      toast.error('Please enter email and password.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim() }, // saved in auth.user.user_metadata
        emailRedirectTo,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Sign up failed');
      return;
    }

    // If email confirmation is ON, there will be no session yet.
    if (data.user && !data.session) {
      setPendingEmail(email);
      setMode('verify');
      toast.success('Account created. Check your email to verify.');
      return;
    }

    // If your project auto-confirms emails (dev), proceed immediately.
    if (data.session) {
      toast.success('Signed up successfully.');
      onAuth();
    }
  };

  const doReset = async () => {
    if (!email) {
      toast.error('Enter your email to receive a reset link.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset`
          : undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Could not send reset email');
      return;
    }
    toast.success('Reset link sent. Please check your email.');
    switchMode('signin');
  };

  const doResend = async () => {
    if (!pendingEmail || resendCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Could not resend verification email.');
      return;
    }
    toast.success('Verification email sent again.');
    setResendCooldown(30);
    const t = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // --- VERIFY SCREEN ---
  if (mode === 'verify') {
    return (
      <div className="min-h-[70vh] theme-bg p-4">
        <Card className="w-full max-w-md mx-auto theme-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-foreground">
              {unconfirmedFlow ? 'Confirm your email to continue' : 'Check your email'}
            </CardTitle>
            <p className="text-sm theme-text-muted">
              We sent a verification link to{' '}
              <span className="text-foreground font-semibold">{pendingEmail}</span>.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside text-sm theme-text-muted space-y-1">
              <li>Open your inbox (and your spam folder just in case).</li>
              <li>Find the email from <span className="text-foreground">Supabase Auth</span>.</li>
              <li>Click <span className="text-foreground font-medium">“Confirm your email”</span>.</li>
              <li>You’ll return here automatically and be signed in.</li>
            </ol>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={doResend}
                className="btn-primary"
                disabled={loading || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown})` : 'Resend email'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMode('signin');
                  setEmail(pendingEmail);
                }}
              >
                Use this email
              </Button>
            </div>

            <div className="text-xs theme-text-muted pt-2">
              Wrong email?{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => {
                  setMode('signup');
                  setEmail('');
                  setPendingEmail('');
                  setUnconfirmedFlow(false);
                }}
              >
                Start over
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- MAIN AUTH SCREENS ---
  return (
    <div className="min-h-[70vh] theme-bg p-4">
      <Card className="w-full max-w-md mx-auto theme-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-foreground">
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset password'}
          </CardTitle>
          <p className="text-sm theme-text-muted">
            {mode === 'signin' && 'Welcome back. Please enter your credentials.'}
            {mode === 'signup' && 'Join AM4M to begin your marriage-focused journey.'}
            {mode === 'forgot' && 'We’ll email you a secure password reset link.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="firstName"
                  placeholder="e.g., Aisha"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-9"
                  autoComplete="given-name"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                autoComplete={mode === 'signup' ? 'email' : 'username'}
              />
            </div>
          </div>

          {(mode === 'signin' || mode === 'signup') && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-white/10"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  aria-pressed={showPwd}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-white/10"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirm}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {mode === 'signin' && (
            <>
              <Button onClick={doSignIn} className="btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Sign in
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-[var(--teal-600)] hover:underline"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="text-[var(--teal-600)] hover:underline"
                  onClick={() => switchMode('signup')}
                >
                  Create an account
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <Button onClick={doSignUp} className="btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create account
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-[var(--teal-600)] hover:underline inline-flex items-center"
                  onClick={() => switchMode('signin')}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back to sign in
                </button>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <Button onClick={doReset} className="btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Send reset link
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-[var(--teal-600)] hover:underline inline-flex items-center"
                  onClick={() => switchMode('signin')}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back to sign in
                </button>
                <button
                  type="button"
                  className="text-[var(--teal-600)] hover:underline"
                  onClick={() => switchMode('signup')}
                >
                  Create an account
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
