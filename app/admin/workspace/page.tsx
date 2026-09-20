import { WorkspaceForm } from "@/components/staff/WorkspaceForm";
import { adminOrRedirect } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { getWorkspace } from "@/lib/queries";
import { BUCKET_WORKSPACE, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";

/*
 * Admin only, and the check is here as well as in the rail: hiding a link is a
 * courtesy, not a permission. The database agrees — app.workspace_setting only
 * accepts writes from app.is_admin().
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).workspace.title };
}

export default async function WorkspacePage() {
  const [actor, locale] = await Promise.all([adminOrRedirect(), currentLocale()]);
  const t = copy(locale);
  const workspace = await getWorkspace(actor);
  const logoUrl = workspace?.logoKey ? await signedUrl(BUCKET_WORKSPACE, workspace.logoKey) : null;

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.workspace.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.workspace.lead}</p>

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
    </div>
  );
}
