// C:\Users\vizir\halal-marriage\src\components\AuthForm.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthFormProps {
  onAuth: (userData: any) => void; // Will be called only when a real session exists
}

type FormState = {
  email: string;
  password: string;
  gender: 'male' | 'female' | '' ;
  profileType: 'self' | 'behalf' | '';
  religionLevel: 'practicing' | 'moderate' | 'cultural' | '';
};

const AuthForm: React.FC<AuthFormProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>({
    email: '',
    password: '',
    gender: '',
    profileType: '',
    religionLevel: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Log in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });
        if (error) throw error;

        // Only treat as logged-in if we actually have a session
        if (!data.session) {
          setError('Login failed: no active session returned.');
          return;
        }
        onAuth(data.session.user);
      } else {
        // Sign up with Supabase and store metadata
        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              gender: formData.gender || null,
              profileType: formData.profileType || null,
              religionLevel: formData.religionLevel || null,
            },
            emailRedirectTo: window.location.origin, // after confirm email
          },
        });
        if (error) throw error;

        // If email confirmation is ON, Supabase won't return a session yet
        if (!data.session) {
          setInfo('Check your email to confirm your account, then come back and sign in.');
          return;
        }

        // If confirmation is OFF, you’re logged in right away
        onAuth(data.session.user);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto theme-card shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            {isLogin ? 'Welcome Back' : 'Join AM4M'}
          </CardTitle>
          <CardDescription className="theme-text-body">
            {isLogin
              ? 'Continue your halal marriage journey'
              : 'Begin your journey to find your righteous spouse'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Extra fields only on Sign Up */}
            {!isLogin && (
              <>
                {/* Gender */}
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: 'male' | 'female') =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Profile Type */}
                <div>
                  <Label>Profile Type</Label>
                  <Select
                    value={formData.profileType}
                    onValueChange={(value: 'self' | 'behalf') =>
                      setFormData({ ...formData, profileType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Creating profile for" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Myself</SelectItem>
                      <SelectItem value="behalf">On behalf of someone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Religious Commitment */}
                <div>
                  <Label>Religious Commitment</Label>
                  <Select
                    value={formData.religionLevel}
                    onValueChange={(value: 'practicing' | 'moderate' | 'cultural') =>
                      setFormData({ ...formData, religionLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select commitment level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practicing">Practicing</SelectItem>
                      <SelectItem value="moderate">Moderately Practicing</SelectItem>
                      <SelectItem value="cultural">Culturally Muslim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Error / Info messages */}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {info && <p className="text-sm text-emerald-400">{info}</p>}

            {/* Submit */}
            <Button type="submit" className="w-full theme-button" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                </>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Toggle */}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setError(null);
                setInfo(null);
                setIsLogin(!isLogin);
              }}
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
