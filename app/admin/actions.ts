"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { copy, fill, isLocale, type Copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import {
  addPropertyPhoto,
  createClient,
  createInvite,
  createProperty,
  createSop,
  deleteProperty,
  deleteSop,
} from "@/lib/queries";
import {
  ALLOWED_IMAGE_TYPES,
  BUCKET_PROPERTY_PHOTOS,
  storageKey,
  upload,
  validateUpload,
  type UploadRefusal,
} from "@/lib/storage";

/*
 * Server actions for the admin screens.
 *
 * Each one starts with requireStaff(). That is not belt and braces on top of the
 * layout check: a server action is its own endpoint and can be called directly,
 * so the layout guarding the page guards nothing here.
 *
 * Messages come from the dictionary in the caller's own language, resolved here
 * rather than passed in from the browser.
 */

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Turns a storage layer refusal into something a colleague can read. */
function refusal(reason: UploadRefusal, t: Copy): string {
  if (reason === "empty") return t.errors.fileEmpty;
  if (reason === "tooLarge") return t.errors.fileTooLarge;
  return t.errors.fileType;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function createClientAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const name = text(form, "name");
  const email = text(form, "email");
  const locale = text(form, "locale") || "nl";

  if (!name) return { ok: false, error: t.errors.nameRequiredStaff };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: t.errors.emailInvalid };
  }
  if (!isLocale(locale)) return { ok: false, error: t.errors.localeUnknown };

  try {
    const created = await createClient(actor, {
      name,
      email,
      locale,
      internalNotes: text(form, "internalNotes") || undefined,
    });
    // The list moved to /admin/clients and the overview counts it too, so both.
    revalidatePath("/admin", "layout");
    return {
      ok: true,
      message: fill(t.saved.clientCreated, { name: created.name, code: created.code }),
    };
  } catch (error) {
    // A duplicate email is the one failure worth naming; the rest stays generic so
    // a database message never reaches the browser.
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate key")) {
      return { ok: false, error: t.errors.duplicateEmail };
    }
    return { ok: false, error: t.errors.createFailed };
  }
}

export async function createInviteAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const clientId = text(form, "clientId");
  if (!clientId) return { ok: false, error: t.errors.noClient };

  try {
    const invite = await createInvite(actor, clientId);
    revalidatePath("/admin/clients");
    return { ok: true, message: invite.url };
  } catch {
    return { ok: false, error: t.errors.inviteFailed };
  }
}

export async function createSopAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const title = text(form, "title");
  const description = text(form, "description");

  if (!title) return { ok: false, error: t.errors.titleRequired };
  if (!description) return { ok: false, error: t.errors.descriptionRequired };

  await createSop(actor, { title, description });
  revalidatePath("/admin/sop");
  return { ok: true, message: t.saved.procedure };
}

export async function deleteSopAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return { ok: false, error: t.errors.nothingToDelete };
  await deleteSop(actor, id);
  revalidatePath("/admin/sop");
  return { ok: true };
}

export async function createPropertyAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const title = text(form, "title");
  const address = text(form, "address");

  if (!title) return { ok: false, error: t.errors.titleRequired };
  if (!address) return { ok: false, error: t.errors.addressRequired };

  // Validate every photo before writing anything, so a rejected third file does not
  // leave a half-made property behind with two photos on it.
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const photo of photos) {
    const check = validateUpload(photo, ALLOWED_IMAGE_TYPES);
    if (!check.ok) return { ok: false, error: `${photo.name}: ${refusal(check.reason, t)}` };
  }

  const created = await createProperty(actor, {
    title,
    address,
    notes: text(form, "notes") || undefined,
  });
  if (!created) return { ok: false, error: t.errors.createFailed };

  let uploaded = 0;
  for (const photo of photos) {
    try {
      const key = storageKey(created.id, photo.name);
      const result = await upload(BUCKET_PROPERTY_PHOTOS, key, photo);
      await addPropertyPhoto(actor, {
        propertyId: created.id,
        storageKey: result.key,
        mimeType: result.mimeType,
        sizeBytes: result.size,
      });
      uploaded += 1;
    } catch (error) {
      // The property itself is saved; say which part failed rather than pretending.
      const reason = error instanceof Error ? error.message : t.errors.unknownReason;
      revalidatePath("/admin/properties");
      return { ok: false, error: fill(t.errors.photosFailed, { reason }) };
    }
  }

  revalidatePath("/admin/properties");
  return {
    ok: true,
    message:
      uploaded === 0 ? t.saved.property : fill(t.saved.propertyWithPhotos, { n: uploaded }),
  };
}

export async function deletePropertyAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return { ok: false, error: t.errors.noProperty };
  await deleteProperty(actor, id);
  revalidatePath("/admin/properties");
  return { ok: true };
}
