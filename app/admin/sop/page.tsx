import { DeleteButton } from "@/components/staff/DeleteButton";
import { SopForm } from "@/components/staff/SopForm";
import { STAFF_TERMS } from "@/lib/staff-terms";
import { staffOrRedirect } from "@/lib/auth/session";
import { listSops } from "@/lib/queries";
import { deleteSopAction } from "../actions";
import shell from "../staff.module.css";
import s from "../admin.module.css";

export const metadata = { title: STAFF_TERMS.procedures };

export default async function SopPage() {
  const actor = await staffOrRedirect();
  const sops = await listSops(actor);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{STAFF_TERMS.procedures}</h1>
      </div>
      <p className={shell.pageLead}>
Werkinstructies voor het team. Klanten zien deze nooit — er is geen enkele route
        waarlangs ze erbij kunnen.
      </p>

      <SopForm />

      <h2 className={s.sectionTitle}>
        {sops.length} {sops.length === 1 ? STAFF_TERMS.procedure : STAFF_TERMS.procedures}
      </h2>

      {sops.length === 0 ? (
        <p className={s.empty}>Nog niets. Voeg hierboven de eerste toe.</p>
      ) : (
        <div className={s.cardList}>
          {sops.map((item) => (
            <div key={item.id} className={s.card}>
              <div className={s.cardBody}>
                <div className={s.cardTitle}>{item.title}</div>
                <p className={s.cardText}>{item.description}</p>
                <div className={s.cardMeta}>
                  {new Date(item.createdAt).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className={s.cardActions}>
                <DeleteButton id={item.id} action={deleteSopAction} label="Verwijderen" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
