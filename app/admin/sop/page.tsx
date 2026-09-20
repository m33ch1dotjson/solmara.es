import { DeleteButton } from "@/components/staff/DeleteButton";
import { SopForm } from "@/components/staff/SopForm";
import { StatusPill } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { listSops } from "@/lib/queries";
import { deleteSopAction } from "../actions";
import shell from "../staff.module.css";
import s from "../admin.module.css";

export const metadata = { title: "SOP" };

export default async function SopPage() {
  const actor = await requireStaff();
  const sops = await listSops(actor);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>SOP</h1>
      </div>
      <p className={shell.pageLead}>
        Uitleg die klanten lezen zodra ze inloggen. Een concept blijft intern tot je hem
        publiceert.
      </p>

      <SopForm />

      <h2 className={s.sectionTitle}>
        {sops.length} {sops.length === 1 ? "SOP" : "SOPs"}
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
                <StatusPill
                  status={item.published ? "approved" : "required"}
                  audience="staff"
                  locale={brand.defaultLocale}
                  labelOverride={item.published ? "Zichtbaar" : "Concept"}
                />
                <DeleteButton id={item.id} action={deleteSopAction} label="Verwijderen" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
