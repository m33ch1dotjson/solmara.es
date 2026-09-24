import { ClientsBrowser } from "@/components/staff/ClientsBrowser";
import { clientAccess } from "@/lib/access";
import { staffOrRedirect } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { initialsFor, listClients, myStaffProfile } from "@/lib/queries";
import { BUCKET_CLIENT_DOCUMENTS, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";

/*
 * The client directory.
 *
 * One query, one list, two ways of looking at it. Search, filter, sort and paging
 * all happen in the browser over that one array — at this size that answers while
 * you type, and when the office has a thousand clients the filter moves into the
 * query and the two renderers do not change at all.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).clients.title };
}

export default async function ClientsPage() {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const t = copy(locale);

  const [clients, me] = await Promise.all([listClients(actor), myStaffProfile(actor)]);

  const rows = await Promise.all(
    clients.map(async (row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      initials: initialsFor(row.name),
      email: row.email,
      phone: row.phone ?? "",
      companyName: row.companyName ?? "",
      place: [row.city, row.country].filter(Boolean).join(", "),
      status: row.status,
      // Two different questions, answered separately: the status above is about the
      // file, this is about whether they can get in at all.
      access: clientAccess(row),
      inviteUntil: row.inviteExpiresAt
        ? formatDateFor(new Date(row.inviteExpiresAt), locale, dates)
        : "",
      // Signed per render like every other private file; ten minutes is plenty for
      // a list somebody is looking at now.
      avatarUrl: row.avatarKey ? await signedUrl(BUCKET_CLIENT_DOCUMENTS, row.avatarKey) : null,
      created: formatDateFor(row.createdAt, locale, dates),
      createdRaw: row.createdAt.toISOString(),
    })),
  );

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.clients.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.clients.lead}</p>

      <ClientsBrowser
        rows={rows}
        view={me?.clientsView === "LIST" ? "LIST" : "GRID"}
        defaultLocale={brand.defaultLocale}
      />
    </div>
  );
}
