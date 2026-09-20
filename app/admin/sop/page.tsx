import { DeleteButton } from "@/components/staff/DeleteButton";
import { SopForm } from "@/components/staff/SopForm";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, fill, formatDate } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { listSops } from "@/lib/queries";
import { deleteSopAction } from "../actions";
import shell from "../staff.module.css";
import s from "../admin.module.css";

export async function generateMetadata() {
  return { title: copy(await currentLocale()).procedures.title };
}

export default async function SopPage() {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const sops = await listSops(actor);
  const t = copy(locale);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.procedures.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.procedures.lead}</p>

      <SopForm />

      <h2 className={s.sectionTitle}>
        {fill(sops.length === 1 ? t.procedures.countOne : t.procedures.countMany, {
          n: sops.length,
        })}
      </h2>

      {sops.length === 0 ? (
        <p className={s.empty}>{t.procedures.empty}</p>
      ) : (
        <div className={s.cardList}>
          {sops.map((item) => (
            <div key={item.id} className={s.card}>
              <div className={s.cardBody}>
                <div className={s.cardTitle}>{item.title}</div>
                <p className={s.cardText}>{item.description}</p>
                <div className={s.cardMeta}>{formatDate(item.createdAt, locale)}</div>
              </div>
              <div className={s.cardActions}>
                <DeleteButton id={item.id} action={deleteSopAction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
