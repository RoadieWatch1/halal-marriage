// C:\Users\vizir\halal-marriage\src\lib\supabase.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Remove stray CR/LF/tabs/spaces that can sneak into .env
 * and produce `%0A` in websocket URLs or bad headers.
 */
const clean = (v?: string) => String(v ?? '').replace(/[\r\n\t ]+/g, '').trim();

/* ---------- Env resolution (Vite-first, with Next fallbacks) ---------- */
const VITE_URL  = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
const VITE_PUB  = (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const VITE_ANON = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

const NEXT_URL  = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const NEXT_PUB  = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : undefined;
const NEXT_ANON = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined;

/** Prefer the new Publishable key; fall back to legacy anon if needed. */
const SUPABASE_URL = clean(VITE_URL ?? NEXT_URL ?? '');
const SUPABASE_KEY = clean(VITE_PUB ?? NEXT_PUB ?? VITE_ANON ?? NEXT_ANON ?? '');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[supabase] Missing URL or key. Check your .env values.');
}

/* ---------- Client ---------- */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  global: {
    // IMPORTANT: do NOT set Authorization here.
    // @supabase/supabase-js will attach the *user* JWT after login.
    headers: { apikey: SUPABASE_KEY },
  },
});

/* ---------- Optional small debug to verify no newlines ---------- */
if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
  const hasNl = /\r|\n/.test(SUPABASE_KEY);
  console.log(`[supabase] url=${SUPABASE_URL} keyLen=${SUPABASE_KEY.length} hasNewline?`, hasNl);
}

/** Handy export for quick inspection in app code */
export const SUPABASE_ENV = { url: SUPABASE_URL, keyLength: SUPABASE_KEY.length };
