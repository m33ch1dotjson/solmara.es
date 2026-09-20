"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLocale } from "@/lib/i18n";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/locale";

/*
 * Switching language.
 *
 * Its own action file rather than a route handler, so the switcher can be a plain
 * form: three submit buttons, no JavaScript needed. A client on a slow phone whose
 * scripts have not arrived can still read the page in their own language.
 *
 * No authorisation check, on purpose. This writes one cookie holding one of three
 * fixed values and touches nothing else — the sign-in screens need it precisely
 * because nobody is signed in there yet.
 */
export async function setLocaleAction(form: FormData): Promise<void> {
  const next = form.get("locale");
  if (!isLocale(next)) return;

  (await cookies()).set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  // Every screen carries copy, so the whole tree is stale — including the layouts
  // holding the header the switcher itself lives in.
  revalidatePath("/", "layout");
}
