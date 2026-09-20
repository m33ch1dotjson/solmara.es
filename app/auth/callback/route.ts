import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { currentActor } from "@/lib/auth/session";
import { serverClient } from "@/lib/auth/supabase";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/public-url";

/*
 * Where the sign-in link lands.
 *
 * Supabase verifies the code; only then is any pending invite redeemed, because that
 * is the first moment we know the person controls the mailbox.
 *
 * Where they go next is decided by who they turn out to be, not by where they
 * started: staff to /admin, clients to their own page. A link forwarded to the wrong
 * person cannot drop them somewhere they do not belong.
 */
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get("code");
  const to = (path: string) => NextResponse.redirect(publicUrl(request.headers, path));

  if (!code) return to("/signin?error=missing_code");

  const supabase = await serverClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) return to("/signin?error=invalid_link");

  // Harmless when there is no pending invite: the function returns null.
  await db.execute(
    sql`select app.invite_redeem(${data.user.email.toLowerCase()}, ${data.user.id}::uuid)`,
  );

  const actor = await currentActor();
  if (actor?.kind === "staff") return to("/admin");
  if (actor?.kind === "client") return to("/");

  // Signed in, but the address is in neither table: nothing to show them.
  return to("/signin?error=no_account");
}
