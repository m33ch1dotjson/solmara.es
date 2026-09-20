"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { reviewDocument } from "@/lib/queries";
import type { ActionResult } from "./actions";

/*
 * Reviewing a client's documents.
 *
 * A rejection carries a note, because the client sees it and "not accepted" on its
 * own tells them nothing they can act on.
 */
export async function reviewDocumentAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const documentId = String(form.get("documentId") ?? "");
  const approve = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim();

  if (!documentId) return { ok: false, error: t.errors.noDocument };
  if (!approve && !note) return { ok: false, error: t.errors.reasonRequired };

  await reviewDocument(actor, { documentId, approve, note });
  // "layout" rather than the single path: one decision shows up on the client's own
  // page, on the documents screen and in the overview's waiting count at once.
  revalidatePath("/admin", "layout");
  return { ok: true, message: approve ? t.saved.approved : t.saved.rejected };
}
