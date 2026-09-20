"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireStaff } from "@/lib/auth/session";
import { copy, isDateStyle, isLocale } from "@/lib/i18n";
import {
  currentLocale,
  DATE_STYLE_COOKIE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  TIME_ZONE_COOKIE,
} from "@/lib/locale";
import {
  NOTIFY_DEFAULTS,
  updateMyNotifications,
  updateMyPreferences,
  updateMyProfile,
} from "@/lib/queries";
import {
  ALLOWED_IMAGE_TYPES,
  BUCKET_WORKSPACE,
  storageKey,
  upload,
  validateUpload,
} from "@/lib/storage";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function saveProfileAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const name = text(form, "name");
  if (!name) return { ok: false, error: t.errors.nameRequiredStaff };

  let avatarKey: string | null | undefined;

  const picture = form.get("avatar");
  if (picture instanceof File && picture.size > 0) {
    const check = validateUpload(picture, ALLOWED_IMAGE_TYPES);
    if (!check.ok) {
      const reason = {
        empty: t.errors.fileEmpty,
        tooLarge: t.errors.fileTooLarge,
        type: t.errors.fileType,
      };
      return { ok: false, error: reason[check.reason] };
    }
    try {
      const key = storageKey(`avatar/${actor.id}`, picture.name);
      await upload(BUCKET_WORKSPACE, key, picture);
      avatarKey = key;
    } catch {
      return { ok: false, error: t.errors.uploadFailed };
    }
  }

  // An explicit "remove", as opposed to "leave it alone", which is what undefined is.
  if (form.get("removeAvatar") === "1") avatarKey = null;

  await updateMyProfile(actor, { name, avatarKey });
  revalidatePath("/admin", "layout");
  return { ok: true, message: t.account.savedProfile };
}

export async function savePreferencesAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const locale = text(form, "locale");
  const theme = text(form, "theme");
  const timeZone = text(form, "timeZone") || "Europe/Madrid";
  const dateStyle = text(form, "dateStyle");

  if (!isLocale(locale)) return { ok: false, error: t.errors.localeUnknown };
  if (!isDateStyle(dateStyle)) return { ok: false, error: t.errors.createFailed };
  if (!["light", "dark", "system"].includes(theme)) {
    return { ok: false, error: t.errors.createFailed };
  }

  await updateMyPreferences(actor, {
    preferredLocale: locale,
    theme,
    timeZone,
    dateStyle,
  });

  /*
   * The row is the record; the cookies are what every render actually reads. They
   * are written together so that saving takes effect on this machine immediately
   * instead of on the next sign-in.
   *
   * The theme is not a cookie: it is read before first paint by the inline script
   * in the root layout, which can only see localStorage. The form writes it there.
   */
  const jar = await cookies();
  const options = { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" as const };
  jar.set(LOCALE_COOKIE, locale, options);
  jar.set(DATE_STYLE_COOKIE, dateStyle, options);
  jar.set(TIME_ZONE_COOKIE, timeZone, options);

  revalidatePath("/", "layout");
  return { ok: true, message: t.account.savedPreferences };
}

export async function saveNotificationsAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  // Only the switches we know about, so a crafted form cannot write arbitrary keys
  // into the column.
  const notify: Record<string, boolean> = {};
  for (const key of Object.keys(NOTIFY_DEFAULTS)) {
    notify[key] = form.get(key) === "on";
  }

  await updateMyNotifications(actor, notify);
  revalidatePath("/admin/account");
  return { ok: true, message: t.account.savedNotifications };
}
