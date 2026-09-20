"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { copy, isLocale } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { updateWorkspace } from "@/lib/queries";
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

/** Empty means empty, not the string "". A blank field is an absent value. */
function orNull(value: string): string | null {
  return value === "" ? null : value;
}

export async function saveWorkspaceAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  // The query layer checks this too. Here it decides which message comes back.
  if (actor.role !== "ADMIN") return { ok: false, error: t.errors.adminOnly };

  const defaultLocale = text(form, "defaultClientLocale");
  if (!isLocale(defaultLocale)) return { ok: false, error: t.errors.localeUnknown };

  let logoKey: string | null | undefined;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const check = validateUpload(logo, ALLOWED_IMAGE_TYPES);
    if (!check.ok) {
      const reason = {
        empty: t.errors.fileEmpty,
        tooLarge: t.errors.fileTooLarge,
        type: t.errors.fileType,
      };
      return { ok: false, error: reason[check.reason] };
    }
    try {
      const key = storageKey("workspace", logo.name);
      await upload(BUCKET_WORKSPACE, key, logo);
      logoKey = key;
    } catch {
      return { ok: false, error: t.errors.uploadFailed };
    }
  }
  if (form.get("removeLogo") === "1") logoKey = null;

  await updateWorkspace(actor, {
    companyName: orNull(text(form, "companyName")),
    companyEmail: orNull(text(form, "companyEmail")),
    phone: orNull(text(form, "phone")),
    website: orNull(text(form, "website")),
    displayName: orNull(text(form, "displayName")),
    defaultClientLocale: defaultLocale,
    defaultCountry: text(form, "defaultCountry") || "ES",
    defaultCurrency: text(form, "defaultCurrency") || "EUR",
    ...(logoKey === undefined ? {} : { logoKey }),
  });

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.workspace.saved };
}
