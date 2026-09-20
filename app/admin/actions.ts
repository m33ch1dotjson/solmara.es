"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
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
} from "@/lib/storage";

/*
 * Server actions for the admin screens.
 *
 * Each one starts with requireStaff(). That is not belt and braces on top of the
 * layout check: a server action is its own endpoint and can be called directly,
 * so the layout guarding the page guards nothing here.
 */

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function createClientAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();

  const name = text(form, "name");
  const email = text(form, "email");
  const locale = text(form, "locale") || "nl";

  if (!name) return { ok: false, error: "Vul een naam in." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }
  if (!["en", "nl", "es"].includes(locale)) {
    return { ok: false, error: "Onbekende taal." };
  }

  try {
    const created = await createClient(actor, {
      name,
      email,
      locale: locale as "en" | "nl" | "es",
      internalNotes: text(form, "internalNotes") || undefined,
    });
    revalidatePath("/admin");
    return { ok: true, message: `${created.name} aangemaakt als ${created.code}.` };
  } catch (error) {
    // A duplicate email is the one failure worth naming; the rest stays generic so
    // a database message never reaches the browser.
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate key")) {
      return { ok: false, error: "Er bestaat al een klant met dit e-mailadres." };
    }
    return { ok: false, error: "Aanmaken mislukt. Probeer het opnieuw." };
  }
}

export async function createInviteAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const clientId = text(form, "clientId");
  if (!clientId) return { ok: false, error: "Geen klant opgegeven." };

  try {
    const invite = await createInvite(actor, clientId);
    revalidatePath("/admin");
    return { ok: true, message: invite.url };
  } catch {
    return { ok: false, error: "Link genereren mislukt." };
  }
}

export async function createSopAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const title = text(form, "title");
  const description = text(form, "description");

  if (!title) return { ok: false, error: "Vul een titel in." };
  if (!description) return { ok: false, error: "Vul een beschrijving in." };

  await createSop(actor, { title, description });
  revalidatePath("/admin/sop");
  return { ok: true, message: "SOP opgeslagen." };
}

export async function deleteSopAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return { ok: false, error: "Geen SOP opgegeven." };
  await deleteSop(actor, id);
  revalidatePath("/admin/sop");
  return { ok: true };
}

export async function createPropertyAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const title = text(form, "title");
  const address = text(form, "address");

  if (!title) return { ok: false, error: "Vul een titel in." };
  if (!address) return { ok: false, error: "Vul een adres in." };

  // Validate every photo before writing anything, so a rejected third file does not
  // leave a half-made property behind with two photos on it.
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const photo of photos) {
    const check = validateUpload(photo, ALLOWED_IMAGE_TYPES);
    if (!check.ok) return { ok: false, error: `${photo.name}: ${check.error}` };
  }

  const created = await createProperty(actor, {
    title,
    address,
    notes: text(form, "notes") || undefined,
  });
  if (!created) return { ok: false, error: "Aanmaken mislukt." };

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
      const reason = error instanceof Error ? error.message : "onbekende fout";
      revalidatePath("/admin/properties");
      return { ok: false, error: `Property opgeslagen, maar foto's uploaden mislukte: ${reason}` };
    }
  }

  revalidatePath("/admin/properties");
  return {
    ok: true,
    message: uploaded === 0 ? "Property opgeslagen." : `Property opgeslagen met ${uploaded} foto's.`,
  };
}

export async function deletePropertyAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return { ok: false, error: "Geen property opgegeven." };
  await deleteProperty(actor, id);
  revalidatePath("/admin/properties");
  return { ok: true };
}
