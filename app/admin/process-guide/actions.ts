"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import {
  addGuideFile,
  createGuide,
  deleteGuide,
  duplicateGuide,
  removeGuideFile,
  updateGuide,
  type GuideCategory,
} from "@/lib/queries";
import { sanitizeGuideHtml } from "@/lib/sanitize";
import {
  ALLOWED_GUIDE_FILE_TYPES,
  ALLOWED_IMAGE_TYPES,
  BUCKET_GUIDE_FILES,
  remove,
  storageKey,
  upload,
  validateUpload,
} from "@/lib/storage";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const CATEGORIES = [
  "RESIDENCY",
  "REAL_ESTATE",
  "ADMINISTRATION",
  "TAX_BUSINESS",
  "VEHICLES",
  "INSURANCE",
  "OTHER",
] as const;

function isCategory(value: unknown): value is GuideCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/** One call: the guide, its files and the overview that counts them. */
function refresh() {
  revalidatePath("/admin", "layout");
}

/*
 * A new guide is created empty and opened straight in edit mode, rather than asking
 * for a title in a dialog first. You name a document by writing it.
 */
export async function newGuideAction(): Promise<void> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const created = await createGuide(actor, { title: t.guides.untitled });
  refresh();
  redirect(`/admin/process-guide/${created.id}?edit=1`);
}

export async function saveGuideAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  const title = text(form, "title");
  const category = form.get("category");

  if (!id) return { ok: false, error: t.errors.createFailed };
  if (!title) return { ok: false, error: t.guides.titleRequired };
  if (!isCategory(category)) return { ok: false, error: t.errors.createFailed };

  // The only place guide HTML is trusted is after this line.
  const content = sanitizeGuideHtml(String(form.get("content") ?? ""));

  const updated = await updateGuide(actor, id, { title, category, content });
  if (!updated) return { ok: false, error: t.errors.createFailed };

  refresh();
  return { ok: true, message: t.guides.saved };
}

export async function duplicateGuideAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return;

  const copyOf = await duplicateGuide(actor, id, t.guides.copyPrefix);
  refresh();
  if (copyOf) redirect(`/admin/process-guide/${copyOf.id}`);
}

export async function deleteGuideAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return;

  const orphaned = await deleteGuide(actor, id);
  // Only objects no other guide still points at — a duplicate shares its files.
  await remove(BUCKET_GUIDE_FILES, orphaned);

  refresh();
  redirect("/admin/process-guide");
}

/*
 * Uploading returns the file id, because that is what goes into the document: the
 * body holds /admin/process-guide/file/<id>, never a storage key and never a signed
 * URL — a signed URL saved into HTML is dead ten minutes later.
 */
export async function uploadGuideFileAction(
  form: FormData,
): Promise<{ ok: true; id: string; filename: string } | { ok: false; error: string }> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const guideId = text(form, "guideId");
  const kind = form.get("kind") === "IMAGE" ? "IMAGE" : "ATTACHMENT";
  const file = form.get("file");

  if (!guideId || !(file instanceof File)) return { ok: false, error: t.errors.uploadFailed };

  const allowed = kind === "IMAGE" ? ALLOWED_IMAGE_TYPES : ALLOWED_GUIDE_FILE_TYPES;
  const check = validateUpload(file, allowed);
  if (!check.ok) {
    const reason = {
      empty: t.errors.fileEmpty,
      tooLarge: t.errors.fileTooLarge,
      type: t.errors.fileType,
    };
    return { ok: false, error: reason[check.reason] };
  }

  try {
    const key = storageKey(`guide/${guideId}`, file.name);
    await upload(BUCKET_GUIDE_FILES, key, file);
    const row = await addGuideFile(actor, {
      guideId,
      kind,
      filename: file.name,
      storageKey: key,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    refresh();
    return { ok: true, id: row.id, filename: row.filename };
  } catch {
    return { ok: false, error: t.errors.uploadFailed };
  }
}

export async function removeGuideFileAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = text(form, "fileId");
  if (!id) return;

  const removed = await removeGuideFile(actor, id);
  if (removed?.orphaned) await remove(BUCKET_GUIDE_FILES, [removed.storageKey]);
  refresh();
}
