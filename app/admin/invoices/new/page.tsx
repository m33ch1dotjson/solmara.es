import Link from "next/link";
import { InvoiceEditor } from "@/components/staff/InvoiceEditor";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { listClientsForPicker } from "@/lib/invoices";
import { currentLocale } from "@/lib/locale";
import { getWorkspace } from "@/lib/queries";
import { BUCKET_WORKSPACE, signedUrl } from "@/lib/storage";
import shell from "../../staff.module.css";

/*
 * A new invoice gets its own screen, not a dialog: it has four sections and a line
 * table, and cramming that into a modal is how a form becomes unusable on a phone.
 *
 * Nothing is written until Save. The draft row appears on the first save, and the
 * address bar moves to /admin/invoices/<id> so a reload finds it again.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).invoices.newInvoice };
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const [actor, locale, query] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    searchParams,
  ]);
  const t = copy(locale);

  const [clients, workspace] = await Promise.all([
    listClientsForPicker(actor),
    getWorkspace(actor),
  ]);

  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + (workspace?.paymentTermsDays ?? 14));
  const asDate = (date: Date) => date.toISOString().slice(0, 10);

  // Arriving from a client's page with "+ Create invoice": that client is already
  // chosen, and its details are copied in the same way picking one by hand does.
  const preselected = query.client ? clients.find((row) => row.id === query.client) : undefined;

  const logoKey = workspace?.invoiceLogoKey ?? workspace?.logoKey ?? null;
  const logoUrl = logoKey ? await signedUrl(BUCKET_WORKSPACE, logoKey) : null;

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.invoices.newInvoice}</h1>
        <Link href="/admin/invoices" className={shell.pageLead}>
          {t.invoices.backToList}
        </Link>
      </div>

      <InvoiceEditor
        draft={{
          id: null,
          clientId: preselected?.id ?? null,
          issueDate: asDate(today),
          dueDate: asDate(due),
          language: preselected?.preferredLocale ?? workspace?.invoiceLanguage ?? "nl",
          currency: workspace?.defaultCurrency ?? "EUR",
          notes: workspace?.invoiceNotes ?? "",
          paymentInstructions: workspace?.paymentInstructions ?? "",
          customerName: preselected?.name ?? "",
          customerCompanyName: "",
          customerEmail: preselected?.email ?? "",
          customerTaxId: "",
          customerVatNumber: "",
          customerAddress: preselected?.addressSpain ?? preselected?.addressHomeCountry ?? "",
          customerPostalCode: "",
          customerCity: "",
          customerProvince: "",
          customerCountry: workspace?.defaultCountry ?? "ES",
          // Spelled out here: see the note on emptyLine in InvoiceEditor.
          lines: [{ description: "", quantity: "1", unitPrice: "", vatRate: "21" }],
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
