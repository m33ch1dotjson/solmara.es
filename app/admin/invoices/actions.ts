"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { copy, isLocale } from "@/lib/i18n";
import {
  deleteDraft,
  finalizeInvoice,
  getInvoice,
  markPaid,
  markSent,
  recordPdfKey,
  saveDraft,
  type DraftInput,
} from "@/lib/invoices";
import { invoiceFilename, renderInvoicePdf } from "@/lib/invoice-pdf";
import { currentLocale } from "@/lib/locale";
import type { LineInput } from "@/lib/money";
import { BUCKET_INVOICES, BUCKET_WORKSPACE, download, uploadBytes } from "@/lib/storage";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

/*
 * The editor posts its lines as JSON. They are parsed and clamped here; the amounts
 * the browser calculated are ignored entirely — saveDraft recomputes everything from
 * these four fields.
 */
function parseLines(raw: string): LineInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.slice(0, 200).map((entry) => {
    const line = entry as Record<string, unknown>;
    const quantity = Number(line.quantity);
    const unitPriceCents = Number(line.unitPriceCents);
    const vatRate = Number(line.vatRate);
    return {
      description: String(line.description ?? "").slice(0, 1000),
      quantity: Number.isFinite(quantity) ? Math.min(Math.max(quantity, 0), 1_000_000) : 0,
      unitPriceCents: Number.isFinite(unitPriceCents) ? Math.round(unitPriceCents) : 0,
      // A rate outside this range is a typo, not a tax regime.
      vatRate: Number.isFinite(vatRate) ? Math.min(Math.max(vatRate, 0), 100) : 0,
    };
  });
}

function draftFrom(form: FormData): DraftInput {
  const language = text(form, "language");
  return {
    clientId: orNull(text(form, "clientId")),
    issueDate: text(form, "issueDate"),
    dueDate: text(form, "dueDate"),
    language: isLocale(language) ? language : "nl",
    currency: text(form, "currency") || "EUR",
    notes: orNull(text(form, "notes")),
    paymentInstructions: orNull(text(form, "paymentInstructions")),
    customerName: text(form, "customerName"),
    customerCompanyName: orNull(text(form, "customerCompanyName")),
    customerEmail: orNull(text(form, "customerEmail")),
    customerTaxId: orNull(text(form, "customerTaxId")),
    customerVatNumber: orNull(text(form, "customerVatNumber")),
    customerAddress: orNull(text(form, "customerAddress")),
    customerPostalCode: orNull(text(form, "customerPostalCode")),
    customerCity: orNull(text(form, "customerCity")),
    customerProvince: orNull(text(form, "customerProvince")),
    customerCountry: orNull(text(form, "customerCountry")),
    lines: parseLines(String(form.get("lines") ?? "[]")),
  };
}

export async function saveInvoiceAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = orNull(text(form, "id"));
  const draft = draftFrom(form);

  if (!draft.issueDate || !draft.dueDate) return { ok: false, error: t.invoices.datesRequired };

  const saved = await saveDraft(actor, id, draft);
  if (!saved) return { ok: false, error: t.invoices.notADraft };

  revalidatePath("/admin", "layout");
  return { ok: true, id: saved, message: t.invoices.saved };
}

export async function deleteInvoiceAction(form: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = text(form, "id");
  if (!id) return;

  await deleteDraft(actor, id);
  revalidatePath("/admin", "layout");
  redirect("/admin/invoices");
}

/**
 * Finalise, then make the document.
 *
 * In that order, and not in one transaction. Assigning the number is a database fact
 * and must be atomic; generating and storing a PDF talks to storage over a network
 * and can fail for reasons that have nothing to do with the invoice. If it does, the
 * invoice is still finalised and correct — the PDF is simply missing, the detail page
 * says so, and the button to make it again is right there.
 */
export async function finalizeInvoiceAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return { ok: false, error: t.invoices.notFound };

  const result = await finalizeInvoice(actor, id);
  if (!result.ok) {
    const reason: Record<string, string> = {
      NOT_FOUND: t.invoices.notFound,
      NO_CUSTOMER: t.invoices.needCustomer,
      NO_LINES: t.invoices.needLines,
      NO_ISSUER: t.invoices.needIssuer,
      BAD_AMOUNT: t.invoices.badAmount,
    };
    return { ok: false, error: reason[result.reason] ?? t.invoices.notFound };
  }

  const pdf = await generatePdf(actor, id);
  revalidatePath("/admin", "layout");

  if (!pdf.ok) return { ok: true, message: t.invoices.finalizedNoPdf };
  return { ok: true, message: t.invoices.finalized };
}

/**
 * Renders the PDF from the stored invoice and puts it in the private bucket.
 *
 * Everything it prints comes off the invoice row. It never reads the client record
 * or the workspace settings, which is what makes regenerating an old invoice produce
 * the old invoice rather than today's company details.
 */
async function generatePdf(
  actor: Awaited<ReturnType<typeof requireStaff>>,
  id: string,
): Promise<{ ok: boolean }> {
  const found = await getInvoice(actor, id);
  if (!found?.record.number) return { ok: false };

  const { record, items } = found;
  // Narrowed here rather than relying on the check above: destructuring loses it,
  // and an invoice without a number has no business being rendered anyway.
  const number = record.number;
  if (!number) return { ok: false };

  try {
    const logo = record.issuerLogoKey
      ? await download(BUCKET_WORKSPACE, record.issuerLogoKey)
      : null;

    const bytes = await renderInvoicePdf({
      number,
      issueDate: record.issueDate,
      dueDate: record.dueDate,
      language: record.language,
      currency: record.currency,

      customerName: record.customerName,
      customerCompanyName: record.customerCompanyName,
      customerEmail: record.customerEmail,
      customerTaxId: record.customerTaxId,
      customerVatNumber: record.customerVatNumber,
      customerAddress: record.customerAddress,
      customerPostalCode: record.customerPostalCode,
      customerCity: record.customerCity,
      customerProvince: record.customerProvince,
      customerCountry: record.customerCountry,

      issuerLegalName: record.issuerLegalName,
      issuerDisplayName: record.issuerDisplayName,
      issuerTaxId: record.issuerTaxId,
      issuerEmail: record.issuerEmail,
      issuerPhone: record.issuerPhone,
      issuerWebsite: record.issuerWebsite,
      issuerAddress: record.issuerAddress,
      issuerPostalCode: record.issuerPostalCode,
      issuerCity: record.issuerCity,
      issuerProvince: record.issuerProvince,
      issuerCountry: record.issuerCountry,
      issuerIban: record.issuerIban,
      issuerBic: record.issuerBic,
      issuerBankName: record.issuerBankName,
      issuerAccountHolder: record.issuerAccountHolder,

      notes: record.notes,
      paymentInstructions: record.paymentInstructions,

      lines: items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPriceCents: item.unitPriceCents,
        vatRate: Number(item.vatRate),
      })),
      logo,
    });

    // Keyed by invoice id, not by number: the same invoice always writes the same
    // object, so regenerating replaces rather than accumulates.
    const key = `${record.id}/${invoiceFilename(number)}`;
    await uploadBytes(BUCKET_INVOICES, key, bytes, "application/pdf");
    await recordPdfKey(actor, id, key);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** The retry behind "PDF generation failed". Same row, same result, no new number. */
export async function regeneratePdfAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return { ok: false, error: t.invoices.notFound };

  const result = await generatePdf(actor, id);
  revalidatePath("/admin", "layout");
  return result.ok
    ? { ok: true, message: t.invoices.pdfMade }
    : { ok: false, error: t.invoices.pdfFailed };
}

export async function markSentAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  if (!id) return { ok: false, error: t.invoices.notFound };

  const done = await markSent(actor, id);
  revalidatePath("/admin", "layout");
  return done ? { ok: true, message: t.invoices.markedSent } : { ok: false, error: t.invoices.notFound };
}

export async function markPaidAction(form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const t = copy(await currentLocale());

  const id = text(form, "id");
  const method = text(form, "method");
  if (!id) return { ok: false, error: t.invoices.notFound };

  const allowed = ["TRANSFER", "CASH", "CARD", "OTHER"] as const;
  const chosen = (allowed as readonly string[]).includes(method)
    ? (method as (typeof allowed)[number])
    : "TRANSFER";

  const done = await markPaid(actor, id, { method: chosen, reference: orNull(text(form, "reference")) });
  revalidatePath("/admin", "layout");
  return done ? { ok: true, message: t.invoices.markedPaid } : { ok: false, error: t.invoices.notFound };
}
