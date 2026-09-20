"use client";

import { createBrowserClient } from "@supabase/ssr";

/*
 * The browser client. Separate file from the server one on purpose: a client
 * component importing the server client would drag next/headers into the bundle,
 * which does not build.
 *
 * Only the publishable key appears here. It is meant to be public — it ships to the
 * browser and is constrained by row level security.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
