import Link from "next/link";
import { NewClientForm } from "@/components/staff/NewClientForm";
import { InviteButton } from "@/components/staff/InviteButton";
import { Mono, StatusPill } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { copy, fill } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { listClients } from "@/lib/queries";
import shell from "../staff.module.css";
import s from "../admin.module.css";

export async function generateMetadata() {
  return { title: copy(await currentLocale()).clients.title };
}

/** The pill's tone comes from the status vocabulary; the word comes from the dictionary. */
const PILL_STATUS = {
  INVITED: "required",
  ACTIVE: "approved",
  CLOSED: "waived",
} as const;

export default async function ClientsPage() {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const clients = await listClients(actor);
  const t = copy(locale);

  const pillLabel = {
    INVITED: t.clients.statusInvited,
    ACTIVE: t.clients.statusActive,
    CLOSED: t.clients.statusClosed,
  };

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.clients.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.clients.lead}</p>

      <NewClientForm defaultLocale={brand.defaultLocale} />

      <h2 className={s.sectionTitle}>
        {fill(clients.length === 1 ? t.clients.countOne : t.clients.countMany, {
          n: clients.length,
        })}
      </h2>

      {clients.length === 0 ? (
        <p className={s.empty}>{t.clients.empty}</p>
      ) : (
        <div className={s.rows}>
          {clients.map((row) => (
            <div key={row.id} className={s.row}>
              <Mono size={12.5} color="var(--ink-3)">
                {row.code}
              </Mono>
              <Link href={`/admin/clients/${row.id}`} className={s.rowText}>
                <div className={s.rowName}>{row.name}</div>
                <div className={s.rowMeta}>{row.email}</div>
              </Link>
              <StatusPill
                status={PILL_STATUS[row.status]}
                audience="staff"
                locale={locale}
                labelOverride={pillLabel[row.status]}
              />
              {row.hasAccount ? (
                <span className={s.rowQuiet}>{t.clients.hasAccount}</span>
              ) : (
                <InviteButton clientId={row.id} clientName={row.name} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
