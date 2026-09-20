import Link from "next/link";
import { InvoicingForm } from "@/components/staff/InvoicingForm";
import { WorkspaceForm } from "@/components/staff/WorkspaceForm";
import { adminOrRedirect } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { getWorkspace } from "@/lib/queries";
import { BUCKET_WORKSPACE, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";
import tabs from "../account/account.module.css";

/*
 * Admin only, and the check is here as well as in the rail: hiding a link is a
 * courtesy, not a permission. The database agrees — app.workspace_setting only
 * accepts writes from app.is_admin().
 *
 * Two tabs rather than one very long page: the general settings are about the
 * portal, the invoicing ones about a document that leaves the building.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).workspace.title };
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [actor, locale, query] = await Promise.all([
    adminOrRedirect(),
    currentLocale(),
    searchParams,
  ]);
  const t = copy(locale);
  const workspace = await getWorkspace(actor);

  const tab = query.tab === "invoicing" ? "invoicing" : "general";

  const [logoUrl, invoiceLogoUrl] = await Promise.all([
    workspace?.logoKey ? signedUrl(BUCKET_WORKSPACE, workspace.logoKey) : null,
    workspace?.invoiceLogoKey ? signedUrl(BUCKET_WORKSPACE, workspace.invoiceLogoKey) : null,
  ]);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.workspace.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.workspace.lead}</p>

      <nav className={tabs.tabs} aria-label={t.workspace.title}>
        <Link
          href="/admin/workspace"
          className={tab === "general" ? `${tabs.tab} ${tabs.tabOn}` : tabs.tab}
          aria-current={tab === "general" ? "page" : undefined}
        >
          {t.workspace.tabGeneral}
        </Link>
        <Link
          href="/admin/workspace?tab=invoicing"
          className={tab === "invoicing" ? `${tabs.tab} ${tabs.tabOn}` : tabs.tab}
          aria-current={tab === "invoicing" ? "page" : undefined}
        >
          {t.workspace.tabInvoicing}
        </Link>
      </nav>

      {tab === "general" ? (
        <WorkspaceForm
          companyName={workspace?.companyName ?? ""}
          companyEmail={workspace?.companyEmail ?? ""}
          phone={workspace?.phone ?? ""}
          website={workspace?.website ?? ""}
          displayName={workspace?.displayName ?? ""}
          defaultClientLocale={workspace?.defaultClientLocale ?? "en"}
          defaultCountry={workspace?.defaultCountry ?? "ES"}
          defaultCurrency={workspace?.defaultCurrency ?? "EUR"}
          logoUrl={logoUrl}
        />
      ) : (
        <InvoicingForm
          legalName={workspace?.legalName ?? ""}
          taxId={workspace?.taxId ?? ""}
          address={workspace?.address ?? ""}
          postalCode={workspace?.postalCode ?? ""}
          city={workspace?.city ?? ""}
          province={workspace?.province ?? ""}
          country={workspace?.country ?? "ES"}
          accountHolder={workspace?.accountHolder ?? ""}
          iban={workspace?.iban ?? ""}
          bic={workspace?.bic ?? ""}
          bankName={workspace?.bankName ?? ""}
          paymentInstructions={workspace?.paymentInstructions ?? ""}
          invoicePrefix={workspace?.invoicePrefix ?? "SOL"}
          paymentTermsDays={String(workspace?.paymentTermsDays ?? 14)}
          invoiceLanguage={workspace?.invoiceLanguage ?? "nl"}
          invoiceNotes={workspace?.invoiceNotes ?? ""}
          logoUrl={invoiceLogoUrl}
        />
      )}
    </div>
  );
}
