"use server";

import { sql } from "drizzle-orm";
import { serverClient } from "@/lib/auth/supabase";
import { db } from "@/lib/db";

/*
 * Finishing an invite.
 *
 * Normally the auth callback redeems the invite, because a magic link proves the
 * person controls the mailbox. With a password there is no link and no callback, so
 * this runs instead — after Supabase has created the session, never before.
 *
 * It takes no token. The email comes from the session, and app.invite_redeem only
 * matches an invite that was issued for that exact address, so a signed-in stranger
 * cannot claim somebody else's file by calling this.
 */
export async function redeemInviteAction(): Promise<{ ok: boolean }> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { ok: false };

  const rows = await db.execute<{ invite_redeem: string | null }>(
    sql`select app.invite_redeem(${user.email.toLowerCase()}, ${user.id}::uuid)`,
  );

  return { ok: rows[0]?.invite_redeem != null };
}
