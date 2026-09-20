import Link from "next/link";
import { NewClientForm } from "@/components/staff/NewClientForm";
import { InviteButton } from "@/components/staff/InviteButton";
import { Mono, StatusPill } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { listClients } from "@/lib/queries";
import shell from "./staff.module.css";
import s from "./admin.module.css";

export const metadata = { title: "Klanten" };

const STATUS_PILL = {
  INVITED: { status: "required" as const, label: "Uitgenodigd" },
  ACTIVE: { status: "approved" as const, label: "Actief" },
  CLOSED: { status: "waived" as const, label: "Afgesloten" },
};

export default async function ClientsPage() {
  const actor = await staffOrRedirect();
  const clients = await listClients(actor);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Klanten</h1>
      </div>
      <p className={shell.pageLead}>
        Maak een klant aan en stuur de link. De klant vult daarna zelf zijn gegevens in en uploadt
        paspoort en pasfoto — zonder dat iemand hier iets hoeft over te typen.
      </p>

      <NewClientForm defaultLocale={brand.defaultLocale} />

      <h2 className={s.sectionTitle}>
        {clients.length} {clients.length === 1 ? "klant" : "klanten"}
      </h2>

      {clients.length === 0 ? (
        <p className={s.empty}>Nog geen klanten. Maak er hierboven een aan.</p>
      ) : (
        <div className={s.rows}>
          {clients.map((row) => {
            const pill = STATUS_PILL[row.status];
            return (
              <div key={row.id} className={s.row}>
                <Mono size={12.5} color="var(--ink-3)">
                  {row.code}
                </Mono>
                <Link href={`/admin/clients/${row.id}`} className={s.rowText}>
                  <div className={s.rowName}>{row.name}</div>
                  <div className={s.rowMeta}>{row.email}</div>
                </Link>
                <StatusPill
                  status={pill.status}
                  audience="staff"
                  locale={brand.defaultLocale}
                  labelOverride={pill.label}
                />
                <InviteButton clientId={row.id} clientName={row.name} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
