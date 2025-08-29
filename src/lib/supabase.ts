// C:\Users\vizir\halal-marriage\src\lib\supabase.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Clean env strings so we never send `%0A` (newline) in the WebSocket URL.
 * - trims leading/trailing whitespace
 * - removes CR/LF/TAB and stray spaces inside (common paste artifact)
 */
const clean = (v?: string) => String(v ?? '').replace(/[\r\n\t ]+/g, '').trim();

/** Prefer Vite envs; gracefully fall back to Next-style if present */
const VITE = (import.meta as any)?.env ?? {};
const rawUrl =
  (VITE.VITE_SUPABASE_URL as string | undefined) ??
  (VITE.PUBLIC_SUPABASE_URL as string | undefined) ??
  (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) : undefined) ??
  '';

/** Prefer new Publishable key; fall back to legacy anon if needed */
const rawKey =
  (VITE.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (VITE.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (VITE.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (VITE.PUBLIC_SUPABASE_ANON_KEY as string | undefined) ??
  (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) : undefined) ??
  (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) : undefined) ??
  '';

/** Final sanitized values */
const SUPABASE_URL = clean(rawUrl).replace(/\/+$/, ''); // strip trailing slashes
const SUPABASE_KEY = clean(rawKey);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Visible in dev console to catch misconfig quickly (don’t throw in prod)
  console.warn('[supabase] Missing URL or key. Check your .env values.');
}

// Tiny dev diagnostic (helps verify newline issues are gone)
if (typeof window !== 'undefined' && VITE?.DEV) {
  const hasNl = /\r|\n/.test(rawKey || '');
  // eslint-disable-next-line no-console
  console.log('[supabase] url:', SUPABASE_URL, 'keyLen:', SUPABASE_KEY.length, 'hasNewline?', hasNl);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    // Smooths out bursts (optional)
    params: { eventsPerSecond: 10 },
  },
  // Being explicit helps with some proxy/CDN setups
  global: {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  },
});

// Optional: easy visibility elsewhere without leaking the key
export const SUPABASE_ENV = { url: SUPABASE_URL, keyLength: SUPABASE_KEY.length };
