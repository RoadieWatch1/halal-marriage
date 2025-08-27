import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthFormProps {
  onAuth: () => void; // called after successful sign-in or sign-up
}

type Mode = 'signin' | 'signup' | 'forgot';

const AuthForm: React.FC<AuthFormProps> = ({ onAuth }) => {
  const [mode, setMode] = useState<Mode>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    // keep email when switching modes; clear passwords for safety
    setPassword('');
    setConfirm('');
    setShowPwd(false);
    setShowConfirm(false);
  };

  const doSignIn = async () => {
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Sign in failed');
      return;
    }
    toast.success('Signed in successfully.');
    onAuth();
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim() }, // stored as user metadata; your profile table will be created later
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Sign up failed');
      return;
    }

    toast.success('Account created. Please check your email to verify (if required).');
    onAuth();
  };

  const doReset = async () => {
    if (!email) {
      toast.error('Enter your email to receive a reset link.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset` : undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Could not send reset email');
      return;
    }
    toast.success('Reset link sent. Please check your email.');
    switchMode('signin');
  };

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

          {/* Password (Sign in & Sign up) */}
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

          {/* Confirm password (Sign up only) */}
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
