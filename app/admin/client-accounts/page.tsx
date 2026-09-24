import { ClientAccounts } from "@/components/staff/ClientAccounts";
import { adminOrRedirect } from "@/lib/auth/session";
import { listClientAccounts, loginLink } from "@/lib/accounts";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { initialsFor } from "@/lib/queries";
import { BUCKET_CLIENT_DOCUMENTS, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";

/*
 * Client Accounts.
 *
 * Admin only, and separate from Team & Permissions on purpose: those are colleagues
 * with a role in the office, these are customers with a login to their own file. The
 * two lists never overlap — app.client_register() refuses an address that belongs to
 * a staff member, and resolve_actor() checks staff first.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).accounts.title };
}

export default async function ClientAccountsPage() {
  const [actor, locale, dates] = await Promise.all([
    adminOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const t = copy(locale);
  const accounts = await listClientAccounts(actor);

  const rows = await Promise.all(
    accounts.map(async (row) => ({
      clientId: row.clientId,
      contactId: row.contactId,
      code: row.code,
      name: row.name,
      initials: initialsFor(row.name),
      avatarUrl: row.avatarKey ? await signedUrl(BUCKET_CLIENT_DOCUMENTS, row.avatarKey) : null,
      email: row.email,
      loginEmail: row.loginEmail ?? "",
      status: row.status,
      hasPassword: row.hasPassword,
      emailVerified: row.emailVerified,
      selfRegistered: row.selfRegistered,
      created: row.accountCreatedAt ? formatDateFor(row.accountCreatedAt, locale, dates) : "",
      lastLogin: row.lastSignInAt ? formatDateFor(row.lastSignInAt, locale, dates) : "",
    })),
  );

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.accounts.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.accounts.lead}</p>

      <ClientAccounts rows={rows} loginUrl={loginLink()} canManage={actor.role === "ADMIN"} />
    </div>
  );
}
