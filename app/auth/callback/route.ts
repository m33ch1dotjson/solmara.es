import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { linkOrCreateClient } from "@/lib/accounts";
import { currentActor } from "@/lib/auth/session";
import { serverClient } from "@/lib/auth/supabase";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/public-url";

/*
 * Where every link from an email lands: sign-in links, invitations, confirmations
 * and password resets.
 *
 * Supabase verifies the code; only then does anything happen, because that is the
 * first moment we know the person controls the mailbox. Then, in order:
 *
 *   1. redeem a pending invite, if there is one;
 *   2. otherwise attach the login to a client file — matching an existing one by
 *      address, creating one if we have never seen it. That is what makes the
 *      confirmation mail of a self-registration finish the job;
 *   3. send them where they belong, which is decided by who they turn out to be and
 *      not by where they started. A link forwarded to the wrong person cannot drop
 *      them somewhere they do not belong.
 *
 * `next` is honoured only as a path on this site, and only for the one screen that
 * needs it: an open redirect in an email link is how people lose their accounts.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const to = (path: string) => NextResponse.redirect(publicUrl(request.headers, path));

  if (!code) return to("/signin?error=missing_code");

  const supabase = await serverClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) return to("/signin?error=invalid_link");

  // Harmless when there is no pending invite: the function returns null.
  await db.execute(
    sql`select app.invite_redeem(${data.user.email.toLowerCase()}, ${data.user.id}::uuid)`,
  );

  let actor = await currentActor();

  if (!actor) {
    // Nobody yet: a confirmed self-registration, or somebody we have never seen.
    // Staff addresses come back null and fall through to the message below.
    const linked = await linkOrCreateClient({
      email: data.user.email,
      authUserId: data.user.id,
      name: (data.user.user_metadata?.name as string | undefined) ?? null,
    });
    if (linked) actor = await currentActor();
  }

  // A password reset lands here too, and then the destination is the one screen
  // where the new password is chosen.
  if (next === "/reset" && actor) return to("/reset");

  if (actor?.kind === "staff") return to("/admin");
  if (actor?.kind === "client") return to("/");

  // Signed in, but the address is in neither table: nothing to show them.
  return to("/signin?error=no_account");
}
