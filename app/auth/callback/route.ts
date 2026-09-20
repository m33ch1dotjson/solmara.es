import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { serverClient } from "@/lib/auth/supabase";

/*
 * Where the magic link lands.
 *
 * Supabase verifies the code and gives us a session. Only then do we redeem any
 * pending invite: the invite is burned once the person has actually proved they
 * control that address, never on the click that requested the link.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) return NextResponse.redirect(`${origin}/signin?error=missing_code`);

  const supabase = await serverClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/signin?error=invalid_link`);
  }

  // Harmless when there is no pending invite: the function returns null.
  await db.execute(
    sql`select app.invite_redeem(${data.user.email.toLowerCase()}, ${data.user.id}::uuid)`,
  );

  return NextResponse.redirect(`${origin}${next}`);
}
