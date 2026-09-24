"use server";

import { linkOrCreateClient } from "@/lib/accounts";
import { serverClient } from "@/lib/auth/supabase";
import { currentLocale } from "@/lib/locale";

/*
 * Finishing a registration.
 *
 * Called after Supabase has created the session, never before: until then nobody
 * has proved anything about the address, and a client file created on an unverified
 * claim is a file somebody else can ask us to delete.
 *
 * It takes no email. The address comes from the session, so a signed-in visitor
 * cannot register "as" somebody else.
 */
export async function completeRegistrationAction(
  name: string,
): Promise<{ ok: boolean; newFile?: boolean }> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { ok: false };

  const result = await linkOrCreateClient({
    email: user.email,
    authUserId: user.id,
    name: name.trim() || (user.user_metadata?.name as string | undefined) || null,
    locale: await currentLocale(),
  });

  if (!result) return { ok: false };
  return { ok: true, newFile: result.createdClient };
}
