import { notFound } from "next/navigation";
import { InvoiceDetail } from "@/components/staff/InvoiceDetail";
import { InvoiceEditor } from "@/components/staff/InvoiceEditor";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { displayStatus, getInvoice, listClientsForPicker } from "@/lib/invoices";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { getWorkspace, listTeam } from "@/lib/queries";
import { BUCKET_WORKSPACE, signedUrl } from "@/lib/storage";
import shell from "../../staff.module.css";

/*
 * One invoice.
 *
 * A draft opens in the editor; anything finalised opens as a document with the
 * actions its status allows. The same route either way, so a link to an invoice
 * keeps working after it is finalised.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const { id } = await params;
  const found = await getInvoice(actor, id);
  return { title: found?.record.number ?? copy(locale).invoices.draftTitle };
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const { id } = await params;

  const found = await getInvoice(actor, id);
  if (!found) notFound();

  const { record, items } = found;
  const t = copy(locale);
  const workspace = await getWorkspace(actor);

  const logoKey = workspace?.invoiceLogoKey ?? workspace?.logoKey ?? null;
  const logoUrl = logoKey ? await signedUrl(BUCKET_WORKSPACE, logoKey) : null;

  if (record.status === "DRAFT") {
    const clients = await listClientsForPicker(actor);

    return (
      <div className={shell.screen}>
        <div className={shell.pageHead}>
          <h1 className={shell.pageTitle}>{t.invoices.draftTitle}</h1>
        </div>
        <p className={shell.pageLead}>{t.invoices.draftLead}</p>

        <InvoiceEditor
          draft={{
            id: record.id,
            clientId: record.clientId,
            issueDate: record.issueDate,
            dueDate: record.dueDate,
            language: record.language,
            currency: record.currency,
            notes: record.notes ?? "",
            paymentInstructions: record.paymentInstructions ?? "",
            customerName: record.customerName,
            customerCompanyName: record.customerCompanyName ?? "",
            customerEmail: record.customerEmail ?? "",
            customerTaxId: record.customerTaxId ?? "",
            customerVatNumber: record.customerVatNumber ?? "",
            customerAddress: record.customerAddress ?? "",
            customerPostalCode: record.customerPostalCode ?? "",
            customerCity: record.customerCity ?? "",
            customerProvince: record.customerProvince ?? "",
            customerCountry: record.customerCountry ?? "",
            lines: items.map((item) => ({
              description: item.description,
              quantity: String(Number(item.quantity)),
              unitPrice: (item.unitPriceCents / 100).toFixed(2),
              vatRate: String(Number(item.vatRate)),
            })),
          }}
          clients={clients.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            email: row.email,
            preferredLocale: row.preferredLocale,
            address: row.addressSpain ?? row.addressHomeCountry,
            country: null,
          }))}
          issuer={{
            legalName: workspace?.legalName ?? null,
            displayName: workspace?.displayName ?? workspace?.companyName ?? null,
            taxId: workspace?.taxId ?? null,
            address: workspace?.address ?? null,
            postalCode: workspace?.postalCode ?? null,
            city: workspace?.city ?? null,
            province: workspace?.province ?? null,
            country: workspace?.country ?? null,
            email: workspace?.companyEmail ?? null,
            phone: workspace?.phone ?? null,
            website: workspace?.website ?? null,
            iban: workspace?.iban ?? null,
            bic: workspace?.bic ?? null,
            bankName: workspace?.bankName ?? null,
            accountHolder: workspace?.accountHolder ?? null,
            logoUrl,
          }}
        />
      </div>
    );
  }

  /*
   * The timeline. Who did what comes off the invoice's own columns — there is no
   * second log to keep in step, and the row already has to carry these names for
   * the sake of the document itself.
   */
  const team = await listTeam(actor);
  const nameOf = (staffId: string | null) =>
    team.find((member) => member.id === staffId)?.name ?? null;

  const when = (value: Date | null) =>
    value ? `${formatDateFor(value, locale, dates)} · ${value.toLocaleTimeString(locale === "en" ? "en-GB" : locale === "es" ? "es-ES" : "nl-NL", { hour: "2-digit", minute: "2-digit" })}` : "";

  const timeline = [
    { at: record.createdAt, what: t.invoices.eventCreated, who: nameOf(record.createdBy) },
    { at: record.finalizedAt, what: t.invoices.eventFinalized, who: nameOf(record.finalizedBy) },
    { at: record.sentAt, what: t.invoices.eventSent, who: nameOf(record.sentBy) },
    { at: record.paidAt, what: t.invoices.eventPaid, who: nameOf(record.paidBy) },
  ]
    .filter((entry): entry is { at: Date; what: string; who: string | null } => entry.at !== null)
    .map((entry) => ({ when: when(entry.at), what: entry.what, who: entry.who }));

  return (
    <InvoiceDetail
      id={record.id}
      number={record.number ?? ""}
      status={displayStatus(record.status, record.dueDate)}
      clientId={record.clientId}
      issueDate={formatDateFor(record.issueDate, locale, dates)}
      dueDate={formatDateFor(record.dueDate, locale, dates)}
      subtotal={formatMoney(record.subtotalCents, locale, record.currency)}
      taxTotal={formatMoney(record.taxTotalCents, locale, record.currency)}
      total={formatMoney(record.totalCents, locale, record.currency)}
      hasPdf={Boolean(record.pdfStorageKey)}
      timeline={timeline}
      preview={{
        number: record.number,
        language: record.language,
        currency: record.currency,
        issueDate: record.issueDate,
        dueDate: record.dueDate,
        customer: {
          name: record.customerName,
          companyName: record.customerCompanyName ?? "",
          email: record.customerEmail ?? "",
          taxId: record.customerTaxId ?? "",
          vatNumber: record.customerVatNumber ?? "",
          address: record.customerAddress ?? "",
          postalCode: record.customerPostalCode ?? "",
          city: record.customerCity ?? "",
          province: record.customerProvince ?? "",
          country: record.customerCountry ?? "",
        },
        // The snapshot, not today's settings: this is what the PDF says, so it is
        // what the screen must say too.
        issuer: {
          legalName: record.issuerLegalName,
          displayName: record.issuerDisplayName,
          taxId: record.issuerTaxId,
          address: record.issuerAddress,
          postalCode: record.issuerPostalCode,
          city: record.issuerCity,
          province: record.issuerProvince,
          country: record.issuerCountry,
          email: record.issuerEmail,
          phone: record.issuerPhone,
          website: record.issuerWebsite,
          iban: record.issuerIban,
          bic: record.issuerBic,
          bankName: record.issuerBankName,
          accountHolder: record.issuerAccountHolder,
          logoUrl: record.issuerLogoKey
            ? await signedUrl(BUCKET_WORKSPACE, record.issuerLogoKey)
            : null,
        },
        lines: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPriceCents: item.unitPriceCents,
          vatRate: Number(item.vatRate),
        })),
        notes: record.notes ?? "",
        paymentInstructions: record.paymentInstructions ?? "",
      }}
    />
  );
}
