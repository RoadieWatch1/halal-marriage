// C:\Users\vizir\halal-marriage\src\lib\supabase.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Strip any stray whitespace (CR, LF, tabs, spaces) that can sneak in
 * when copying keys into .env files and cause `%0A` in WebSocket URLs.
 */
const clean = (v?: string) => String(v ?? '').replace(/[\r\n\t ]+/g, '').trim();

// Vite-style env (preferred for this project)
const VITE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
const VITE_PUB = (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const VITE_ANON = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

// Next.js-style fallbacks (harmless if unused)
const NEXT_URL = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined) as
  | string
  | undefined;
const NEXT_PUB = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : undefined) as
  | string
  | undefined;
const NEXT_ANON = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) as
  | string
  | undefined;

// Prefer new Publishable key; fall back to legacy anon if needed
const RAW_URL = VITE_URL ?? NEXT_URL ?? '';
const RAW_KEY = VITE_PUB ?? NEXT_PUB ?? VITE_ANON ?? NEXT_ANON ?? '';

const SUPABASE_URL = clean(RAW_URL);
const SUPABASE_KEY = clean(RAW_KEY);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Visible in dev console to catch misconfig quickly (don’t throw)
  console.warn('[supabase] Missing URL or key. Check your .env values.');
}

// Optional: tiny dev diagnostic (helps verify newline issues are gone)
if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
  const hasNl = /\r|\n/.test(SUPABASE_KEY);
  // eslint-disable-next-line no-console
  console.log(
    `[supabase] url=${SUPABASE_URL} keyLen=${SUPABASE_KEY.length} hasNewline?`,
    hasNl
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    // Optional, but keeps things tidy if you burst messages
    params: { eventsPerSecond: 10 },
  },
  global: {
    // Be explicit; avoids rare proxy/header issues
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  },
});

// (Optional) named exports if you want to inspect in app code
export const SUPABASE_ENV = { url: SUPABASE_URL, keyLength: SUPABASE_KEY.length };
