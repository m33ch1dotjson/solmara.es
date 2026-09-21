"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { copy, fill } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { parseAmountToCents } from "@/lib/money";
import {
  addPropertyPhoto,
  deleteProperty,
  deletePropertyPhoto,
  updateProperty,
} from "@/lib/queries";
import { sanitizeGuideHtml } from "@/lib/sanitize";
import {
  ALLOWED_IMAGE_TYPES,
  BUCKET_PROPERTY_PHOTOS,
  remove,
  storageKey,
  upload,
  validateUpload,
} from "@/lib/storage";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function updatePropertyAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  const title = text(form, "title");
  const address = text(form, "address");

  if (!id) return { ok: false, error: t.errors.noProperty };
  if (!title) return { ok: false, error: t.errors.titleRequired };
  if (!address) return { ok: false, error: t.errors.addressRequired };

  /** A whole number or nothing: "three and a half bedrooms" is a typo. */
  const count = (key: string): number | null => {
    const raw = text(form, key);
    if (raw === "") return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value >= 0 && value < 1000 ? value : null;
  };

  const updated = await updateProperty(actor, id, {
    title,
    address,
    // The same sanitiser as a Process Guide: this text is written in a
    // contentEditable and rendered back with dangerouslySetInnerHTML.
    description: sanitizeGuideHtml(String(form.get("description") ?? "")),
    priceCents: parseAmountToCents(text(form, "price")),
    bedrooms: count("bedrooms"),
    bathrooms: count("bathrooms"),
    areaM2: count("areaM2"),
  });
  if (!updated) return { ok: false, error: t.errors.noProperty };

  revalidatePath("/admin/properties", "layout");
  return { ok: true, message: t.properties.saved };
}

export async function addPropertyPhotosAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return { ok: false, error: t.errors.noProperty };

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length === 0) return { ok: false, error: t.errors.fileEmpty };

  // Every file is checked before anything is written, so a bad third file does not
  // leave two uploaded and no message about the third.
  for (const photo of photos) {
    const check = validateUpload(photo, ALLOWED_IMAGE_TYPES);
    if (!check.ok) {
      const reason = {
        empty: t.errors.fileEmpty,
        tooLarge: t.errors.fileTooLarge,
        type: t.errors.fileType,
      };
      return { ok: false, error: `${photo.name}: ${reason[check.reason]}` };
    }
  }

  let uploaded = 0;
  for (const photo of photos) {
    try {
      const key = storageKey(id, photo.name);
      const result = await upload(BUCKET_PROPERTY_PHOTOS, key, photo);
      await addPropertyPhoto(actor, {
        propertyId: id,
        storageKey: result.key,
        mimeType: result.mimeType,
        sizeBytes: result.size,
      });
      uploaded += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : t.errors.unknownReason;
      revalidatePath("/admin/properties", "layout");
      return { ok: false, error: fill(t.errors.photosFailed, { reason }) };
    }
  }

  revalidatePath("/admin/properties", "layout");
  return { ok: true, message: fill(t.saved.propertyWithPhotos, { n: uploaded }) };
}

export async function deletePropertyPhotoAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const photoId = text(form, "photoId");
  if (!photoId) return { ok: false, error: t.errors.nothingToDelete };

  const removed = await deletePropertyPhoto(actor, photoId);
  // The row is gone either way; the object goes with it rather than lingering in a
  // bucket nobody lists.
  if (removed) await remove(BUCKET_PROPERTY_PHOTOS, [removed.storageKey]);

  revalidatePath("/admin/properties", "layout");
  return { ok: true };
}

export async function deletePropertyAndPhotosAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return;

  const keys = await deleteProperty(actor, id);
  await remove(BUCKET_PROPERTY_PHOTOS, keys);

  revalidatePath("/admin/properties", "layout");
  redirect("/admin/properties");
}
