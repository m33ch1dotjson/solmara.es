"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
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

  const documentId = String(form.get("documentId") ?? "");
  const approve = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim();

  if (!documentId) return { ok: false, error: "Geen document opgegeven." };
  if (!approve && !note) {
    return { ok: false, error: "Geef een reden op. De klant leest die en moet weten wat er mis is." };
  }

  await reviewDocument(actor, { documentId, approve, note });
  revalidatePath("/admin");
  return { ok: true, message: approve ? "Goedgekeurd." : "Afgekeurd, de klant ziet de reden." };
}
