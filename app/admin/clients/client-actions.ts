"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { setClientsView, updateClientBilling } from "@/lib/queries";
import {
  ALLOWED_IMAGE_TYPES,
  BUCKET_CLIENT_DOCUMENTS,
  storageKey,
  upload,
  validateUpload,
} from "@/lib/storage";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

/**
 * Grid or list. Fire and forget from the toggle: the view has already changed on
 * screen, and this only decides what the *next* visit opens with.
 */
export async function setClientsViewAction(view: string): Promise<void> {
  const actor = await requireStaff();
  if (view !== "GRID" && view !== "LIST") return;
  await setClientsView(actor, view);
  // No revalidate: nothing on the current page depends on it, and refreshing the
  // tree under somebody who just clicked a toggle is a flicker for nothing.
}

/**
 * The office's own details about a client: who to invoice, where, and under which
 * tax number. Editable by staff; the client's own profile screen never shows it.
 */
export async function saveClientBillingAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return { ok: false, error: t.errors.noClient };

  let avatarKey: string | null | undefined;

  const photo = form.get("avatar");
  if (photo instanceof File && photo.size > 0) {
    const check = validateUpload(photo, ALLOWED_IMAGE_TYPES);
    if (!check.ok) {
      const reason = {
        empty: t.errors.fileEmpty,
        tooLarge: t.errors.fileTooLarge,
        type: t.errors.fileType,
      };
      return { ok: false, error: reason[check.reason] };
    }
    try {
      // Same private bucket as their documents: a photograph of a person is the
      // same kind of thing as a scan of their passport, and belongs behind the same
      // door rather than in a second one with its own rules.
      const key = storageKey(`avatar/${id}`, photo.name);
      await upload(BUCKET_CLIENT_DOCUMENTS, key, photo);
      avatarKey = key;
    } catch {
      return { ok: false, error: t.errors.uploadFailed };
    }
  }
  if (form.get("removeAvatar") === "1") avatarKey = null;

  const done = await updateClientBilling(actor, id, {
    companyName: orNull(text(form, "companyName")),
    phone: orNull(text(form, "phone")),
    postalCode: orNull(text(form, "postalCode")),
    city: orNull(text(form, "city")),
    province: orNull(text(form, "province")),
    country: orNull(text(form, "country")),
    taxId: orNull(text(form, "taxId")),
    vatNumber: orNull(text(form, "vatNumber")),
    ...(avatarKey === undefined ? {} : { avatarKey }),
  });

  if (!done) return { ok: false, error: t.errors.noClient };

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.clients.billingSaved };
}
