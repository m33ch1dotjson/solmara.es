"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireClient } from "@/lib/auth/session";
import { asActor } from "@/lib/db/act";
import { clientDocument, event } from "@/lib/db/schema";
import { copy, fill, type Copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { updateClientSelf } from "@/lib/queries";
import {
  ALLOWED_DOCUMENT_TYPES,
  BUCKET_CLIENT_DOCUMENTS,
  storageKey,
  upload,
  validateUpload,
  type UploadRefusal,
} from "@/lib/storage";

/*
 * What a client may change about their own file: their details, and the two files we
 * ask for. Nothing else — a client cannot approve their own passport, and the status
 * column is not reachable from here.
 *
 * Each action calls requireClient() itself. A server action is its own endpoint, so
 * the layout guarding the page guards nothing here.
 *
 * Messages are resolved per call rather than passed in from the browser: what
 * language somebody reads is the cookie's business, and a caller who could name the
 * wording could also name a sentence we never wrote.
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(form: FormData, key: string): string | null {
  return text(form, key) || null;
}

/** Turns a storage layer refusal into something the client can read. */
function refusal(reason: UploadRefusal, t: Copy): string {
  if (reason === "empty") return t.errors.fileEmpty;
  if (reason === "tooLarge") return t.errors.fileTooLarge;
  return t.errors.fileType;
}

export async function saveDetailsAction(form: FormData): Promise<ActionResult> {
  const actor = await requireClient();
  const t = copy(await currentLocale());

  const name = text(form, "name");
  if (!name) return { ok: false, error: t.errors.nameRequired };

  const dateOfBirth = optional(form, "dateOfBirth");
  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    return { ok: false, error: t.errors.dateOfBirthInvalid };
  }

  const passportExpiry = optional(form, "passportExpiry");
  if (passportExpiry && Number.isNaN(Date.parse(passportExpiry))) {
    return { ok: false, error: t.errors.passportExpiryInvalid };
  }

  await updateClientSelf(actor, {
    name,
    phone: optional(form, "phone"),
    dateOfBirth,
    nationality: optional(form, "nationality"),
    passportNumber: optional(form, "passportNumber"),
    passportExpiry,
    addressHomeCountry: optional(form, "addressHomeCountry"),
    addressSpain: optional(form, "addressSpain"),
  });

  revalidatePath("/");
  return { ok: true, message: t.saved.details };
}

export async function uploadDocumentAction(form: FormData): Promise<ActionResult> {
  const actor = await requireClient();
  const t = copy(await currentLocale());

  const kind = text(form, "kind");
  if (kind !== "PASSPORT" && kind !== "PHOTO") {
    return { ok: false, error: t.errors.documentKindUnknown };
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: t.errors.chooseFile };
  }

  const check = validateUpload(file, ALLOWED_DOCUMENT_TYPES);
  if (!check.ok) return { ok: false, error: refusal(check.reason, t) };

  try {
    // The path starts with the client id and is otherwise random, so one client's
    // key tells you nothing about another's.
    const key = storageKey(actor.clientId, file.name);
    const result = await upload(BUCKET_CLIENT_DOCUMENTS, key, file);

    await asActor(actor, async (tx) => {
      await tx
        .update(clientDocument)
        .set({
          storageKey: result.key,
          mimeType: result.mimeType,
          sizeBytes: result.size,
          status: "RECEIVED",
          uploadedAt: new Date(),
          rejectionNote: null,
        })
        // Both filters matter: without the kind, uploading a photo would overwrite
        // the passport row as well.
        .where(
          and(eq(clientDocument.clientId, actor.clientId), eq(clientDocument.kind, kind)),
        );

      await tx.insert(event).values({
        actorContactId: actor.id,
        clientId: actor.clientId,
        action: "document.uploaded",
        payload: { kind },
      });
    });

    revalidatePath("/");
    return { ok: true, message: t.saved.documentReceived };
  } catch (error) {
    const reason = error instanceof Error ? error.message : t.errors.unknownReason;
    return { ok: false, error: fill(t.errors.uploadFailed, { reason }) };
  }
}
