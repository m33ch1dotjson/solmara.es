/*
 * Everything an invoice does, in one place.
 *
 * The rules that matter live here rather than in a server action or a component,
 * so that "what may be changed after finalisation" has one answer and not three.
 *
 * Boundaries, on purpose:
 *   - calculation is lib/money.ts, shared with the editor and the PDF;
 *   - rendering is lib/invoice-pdf.ts, which takes a finalised invoice and gives
 *     back bytes;
 *   - a future fiscal registration (VeriFactu and friends) has an obvious seam in
 *     finalizeInvoice, between assigning the number and generating the document.
 *     None of that exists today and nothing here pretends it does.
 */

import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/session";
import { asActor } from "@/lib/db/act";
import { client, invoice, invoiceCounter, invoiceItem, workspaceSetting } from "@/lib/db/schema";
import { invoiceTotals, type LineInput } from "@/lib/money";

export type InvoiceStatus = "DRAFT" | "FINALIZED" | "SENT" | "PAID" | "CANCELLED";

/** What the screen shows. Overdue is a question about today, not a stored fact. */
export type DisplayStatus = InvoiceStatus | "OVERDUE";

export function displayStatus(
  status: InvoiceStatus,
  dueDate: string,
  today = new Date(),
): DisplayStatus {
  if (status !== "FINALIZED" && status !== "SENT") return status;
  const due = new Date(`${dueDate}T23:59:59`);
  return due.getTime() < today.getTime() ? "OVERDUE" : status;
}

export interface CustomerSnapshot {
  customerName: string;
  customerCompanyName: string | null;
  customerEmail: string | null;
  customerTaxId: string | null;
  customerVatNumber: string | null;
  customerAddress: string | null;
  customerPostalCode: string | null;
  customerCity: string | null;
  customerProvince: string | null;
  customerCountry: string | null;
}

export interface DraftInput extends CustomerSnapshot {
  clientId: string | null;
  issueDate: string;
  dueDate: string;
  language: "nl" | "en" | "es";
  currency: string;
  notes: string | null;
  paymentInstructions: string | null;
  lines: LineInput[];
}

/* ------------------------------------------------------------------ reading */

export async function listInvoices(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .select({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        clientId: invoice.clientId,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalCents: invoice.totalCents,
        currency: invoice.currency,
        pdfStorageKey: invoice.pdfStorageKey,
        createdAt: invoice.createdAt,
      })
      .from(invoice)
      .orderBy(desc(invoice.createdAt)),
  );
}

export async function listClientInvoices(actor: Actor, clientId: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .select({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalCents: invoice.totalCents,
        currency: invoice.currency,
      })
      .from(invoice)
      .where(eq(invoice.clientId, clientId))
      .orderBy(desc(invoice.issueDate), desc(invoice.createdAt)),
  );
}

export async function getInvoice(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.select().from(invoice).where(eq(invoice.id, id)).limit(1);
    const record = rows[0];
    if (!record) return null;

    const items = await tx
      .select()
      .from(invoiceItem)
      .where(eq(invoiceItem.invoiceId, id))
      .orderBy(asc(invoiceItem.position));

    return { record, items };
  });
}

/** The short list the invoice editor's client picker needs. */
export async function listClientsForPicker(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx
      .select({
        id: client.id,
        code: client.code,
        name: client.name,
        email: client.email,
        preferredLocale: client.preferredLocale,
        addressSpain: client.addressSpain,
        addressHomeCountry: client.addressHomeCountry,
        // Everything the office already knows, so nobody retypes a NIF per invoice.
        companyName: client.companyName,
        postalCode: client.postalCode,
        city: client.city,
        province: client.province,
        country: client.country,
        taxId: client.taxId,
        vatNumber: client.vatNumber,
      })
      .from(client)
      .orderBy(asc(client.name)),
  );
}

/* ------------------------------------------------------------------ writing */

/**
 * Creates or updates a draft.
 *
 * The totals are recalculated here from the lines, every time. Whatever the browser
 * worked out is read as a suggestion and thrown away — the server is the one that
 * decides what this invoice costs.
 */
export async function saveDraft(actor: Actor, id: string | null, input: DraftInput) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  const totals = invoiceTotals(input.lines);

  return asActor(actor, async (tx) => {
    let invoiceId = id;

    const shared = {
      clientId: input.clientId,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      language: input.language,
      currency: input.currency,
      notes: input.notes,
      paymentInstructions: input.paymentInstructions,
      customerName: input.customerName,
      customerCompanyName: input.customerCompanyName,
      customerEmail: input.customerEmail,
      customerTaxId: input.customerTaxId,
      customerVatNumber: input.customerVatNumber,
      customerAddress: input.customerAddress,
      customerPostalCode: input.customerPostalCode,
      customerCity: input.customerCity,
      customerProvince: input.customerProvince,
      customerCountry: input.customerCountry,
      subtotalCents: totals.subtotalCents,
      taxTotalCents: totals.taxTotalCents,
      totalCents: totals.totalCents,
      updatedAt: new Date(),
    };

    if (invoiceId) {
      // A draft is the only thing that may be rewritten. The WHERE clause is the
      // guard: a finalised invoice matches nothing and nothing changes.
      const [updated] = await tx
        .update(invoice)
        .set(shared)
        .where(and(eq(invoice.id, invoiceId), eq(invoice.status, "DRAFT")))
        .returning({ id: invoice.id });
      if (!updated) return null;
      await tx.delete(invoiceItem).where(eq(invoiceItem.invoiceId, invoiceId));
    } else {
      const [created] = await tx
        .insert(invoice)
        .values({ ...shared, createdBy: actor.id })
        .returning({ id: invoice.id });
      if (!created) throw new Error("INVOICE_NOT_CREATED");
      invoiceId = created.id;
    }

    if (input.lines.length > 0) {
      await tx.insert(invoiceItem).values(
        input.lines.map((line, index) => ({
          invoiceId: invoiceId as string,
          position: index,
          description: line.description,
          quantity: String(line.quantity),
          unitPriceCents: line.unitPriceCents,
          vatRate: String(line.vatRate),
          subtotalCents: totals.lines[index]?.subtotalCents ?? 0,
          taxCents: totals.lines[index]?.taxCents ?? 0,
          totalCents: totals.lines[index]?.totalCents ?? 0,
        })),
      );
    }

    return invoiceId;
  });
}

export async function deleteDraft(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    // Only a draft. A finalised invoice is a historical document; if it turns out to
    // be wrong, that is a credit note, not a delete.
    const [deleted] = await tx
      .delete(invoice)
      .where(and(eq(invoice.id, id), eq(invoice.status, "DRAFT")))
      .returning({ id: invoice.id });
    return Boolean(deleted);
  });
}

export type FinalizeFailure =
  | "NOT_FOUND"
  | "NO_CUSTOMER"
  | "NO_LINES"
  | "NO_ISSUER"
  | "BAD_AMOUNT";

/**
 * Turns a draft into an invoice.
 *
 * All of it in one transaction: the number is taken, the issuer is copied onto the
 * row, the totals are recomputed from the stored lines, and the status moves. If
 * anything throws, none of it happened and no number was consumed.
 *
 * Calling it twice is safe. The second call finds a row that is no longer DRAFT and
 * returns it unchanged rather than taking a second number — which is what a double
 * click, or a retried request, actually looks like.
 *
 * The PDF is deliberately NOT made here. Generating it needs storage and can fail
 * on a network the database knows nothing about; doing it inside this transaction
 * would mean a failed upload rolls back a finalisation that legally happened. It is
 * generated straight after, and can be generated again later from this same row.
 */
export async function finalizeInvoice(
  actor: Actor,
  id: string,
): Promise<{ ok: true; alreadyFinal: boolean; number: string } | { ok: false; reason: FinalizeFailure }> {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");

  return asActor(actor, async (tx) => {
    // FOR UPDATE: two colleagues pressing Finalize on the same invoice queue up
    // here instead of both walking through the checks.
    const locked = await tx.execute<{ id: string; status: string; number: string | null }>(
      sql`select id, status, number from app.invoice where id = ${id} for update`,
    );
    const current = locked[0];
    if (!current) return { ok: false as const, reason: "NOT_FOUND" as const };

    if (current.status !== "DRAFT") {
      return current.number
        ? { ok: true as const, alreadyFinal: true, number: current.number }
        : { ok: false as const, reason: "NOT_FOUND" as const };
    }

    const rows = await tx.select().from(invoice).where(eq(invoice.id, id)).limit(1);
    const record = rows[0];
    if (!record) return { ok: false as const, reason: "NOT_FOUND" as const };
    if (!record.customerName.trim()) return { ok: false as const, reason: "NO_CUSTOMER" as const };

    const items = await tx
      .select()
      .from(invoiceItem)
      .where(eq(invoiceItem.invoiceId, id))
      .orderBy(asc(invoiceItem.position));

    if (items.length === 0) return { ok: false as const, reason: "NO_LINES" as const };

    const lines: LineInput[] = items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPriceCents: item.unitPriceCents,
      vatRate: Number(item.vatRate),
    }));

    if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      return { ok: false as const, reason: "BAD_AMOUNT" as const };
    }

    const totals = invoiceTotals(lines);

    const settingsRows = await tx.select().from(workspaceSetting).limit(1);
    const settings = settingsRows[0];
    // The template prints a sender. Without a legal name there is nothing to print,
    // and an invoice without an issuer is not an invoice.
    if (!settings?.legalName?.trim()) return { ok: false as const, reason: "NO_ISSUER" as const };

    const year = Number(record.issueDate.slice(0, 4));

    // One statement, atomic: the row lock inside the upsert is what stops two
    // finalisations from taking the same number.
    const counter = await tx.execute<{ taken: number }>(sql`
      insert into app.invoice_counter (year, next_number) values (${year}, 2)
      on conflict (year) do update set next_number = app.invoice_counter.next_number + 1
      returning app.invoice_counter.next_number - 1 as taken
    `);
    const sequence = Number(counter[0]?.taken ?? 1);
    const prefix = settings.invoicePrefix || "SOL";
    const number = `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;

    await tx
      .update(invoice)
      .set({
        number,
        numberYear: year,
        numberSequence: sequence,
        status: "FINALIZED",
        finalizedBy: actor.id,
        finalizedAt: new Date(),
        updatedAt: new Date(),

        subtotalCents: totals.subtotalCents,
        taxTotalCents: totals.taxTotalCents,
        totalCents: totals.totalCents,

        // The sender, as of today. From here on this invoice quotes itself.
        issuerLegalName: settings.legalName,
        issuerDisplayName: settings.displayName ?? settings.companyName,
        issuerTaxId: settings.taxId,
        issuerEmail: settings.companyEmail,
        issuerPhone: settings.phone,
        issuerWebsite: settings.website,
        issuerAddress: settings.address,
        issuerPostalCode: settings.postalCode,
        issuerCity: settings.city,
        issuerProvince: settings.province,
        issuerCountry: settings.country,
        issuerIban: settings.iban,
        issuerBic: settings.bic,
        issuerBankName: settings.bankName,
        issuerAccountHolder: settings.accountHolder,
        issuerLogoKey: settings.invoiceLogoKey ?? settings.logoKey,

        notes: record.notes ?? settings.invoiceNotes,
        paymentInstructions: record.paymentInstructions ?? settings.paymentInstructions,
      })
      .where(eq(invoice.id, id));

    return { ok: true as const, alreadyFinal: false, number };
  });
}

export async function recordPdfKey(actor: Actor, id: string, key: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, (tx) =>
    tx.update(invoice).set({ pdfStorageKey: key }).where(eq(invoice.id, id)),
  );
}

export async function markSent(actor: Actor, id: string) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(invoice)
      .set({ status: "SENT", sentBy: actor.id, sentAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invoice.id, id), eq(invoice.status, "FINALIZED")))
      .returning({ id: invoice.id });
    return Boolean(updated);
  });
}

export async function markPaid(
  actor: Actor,
  id: string,
  input: { method: "TRANSFER" | "CASH" | "CARD" | "OTHER"; reference: string | null },
) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const [updated] = await tx
      .update(invoice)
      .set({
        status: "PAID",
        paidBy: actor.id,
        paidAt: new Date(),
        paymentMethod: input.method,
        paymentReference: input.reference,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoice.id, id),
          // Paid only follows an invoice that exists as a document. A draft cannot
          // be paid, because nobody has been asked for anything yet.
          isNotNull(invoice.number),
        ),
      )
      .returning({ id: invoice.id });
    return Boolean(updated);
  });
}

/** What the overview counts: everything issued and not yet paid. */
export async function outstandingTotal(actor: Actor) {
  if (actor.kind !== "staff") throw new Error("UNAUTHORISED");
  return asActor(actor, async (tx) => {
    const rows = await tx.execute<{ n: number; cents: number }>(sql`
      select count(*)::int as n, coalesce(sum(total_cents), 0)::bigint as cents
      from app.invoice
      where status in ('FINALIZED', 'SENT')
    `);
    return { count: Number(rows[0]?.n ?? 0), cents: Number(rows[0]?.cents ?? 0) };
  });
}
