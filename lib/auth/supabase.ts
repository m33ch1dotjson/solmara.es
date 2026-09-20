import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
 * The server client. Reads the session cookies so a server component knows who is
 * asking. The browser half lives in supabase-browser.ts.
 */
export async function serverClient() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list) {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Server components have read-only cookies; the middleware refreshes
            // the session instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}
