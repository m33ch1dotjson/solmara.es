import Link from "next/link";
import { InvoiceList } from "@/components/staff/InvoiceList";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { displayStatus, listInvoices } from "@/lib/invoices";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import shell from "../staff.module.css";
import s from "@/components/staff/GuideList.module.css";

/*
 * Browsing comes first here too: the list is the page, and creating an invoice is a
 * button that opens its own screen. An invoice editor does not belong in a modal.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).invoices.title };
}

export default async function InvoicesPage() {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const t = copy(locale);
  const invoices = await listInvoices(actor);

  const rows = invoices.map((row) => ({
    id: row.id,
    number: row.number,
    customerName: row.customerName,
    customerEmail: row.customerEmail ?? "",
    issueDate: formatDateFor(row.issueDate, locale, dates),
    dueDate: formatDateFor(row.dueDate, locale, dates),
    // Sorting and searching happen in the browser, so the raw values travel too.
    issueRaw: row.issueDate,
    totalCents: row.totalCents,
    amount: formatMoney(row.totalCents, locale, row.currency),
    status: displayStatus(row.status, row.dueDate),
  }));

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.invoices.title}</h1>
        <Link href="/admin/invoices/new" className={s.newButton}>
          <span aria-hidden="true">+</span> {t.invoices.newInvoice}
        </Link>
      </div>
      <p className={shell.pageLead}>{t.invoices.lead}</p>

      <InvoiceList rows={rows} />
    </div>
  );
}
