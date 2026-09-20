import Link from "next/link";
import {
  IconClients,
  IconDocuments,
  IconProcedures,
  IconProperties,
} from "@/components/ui/Icons";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, fill } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { listClients, listGuides, listProperties, listSentDocuments } from "@/lib/queries";
import shell from "./staff.module.css";
import s from "./overview.module.css";

/*
 * The landing screen: how much of everything there is, and the one number that is
 * actually a to-do — documents waiting to be reviewed.
 *
 * It counts by reading the lists rather than by asking the database for counts. At
 * this size that is a handful of rows and one round trip each; when a list grows
 * past a few hundred, swap these for select count(*) and nothing above changes.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).overview.title };
}

export default async function OverviewPage() {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const t = copy(locale);

  const [clients, properties, guides, documents] = await Promise.all([
    listClients(actor),
    listProperties(actor),
    listGuides(actor),
    listSentDocuments(actor),
  ]);

  const waiting = documents.filter((doc) => doc.status === "RECEIVED");
  const withoutAccount = clients.filter((row) => !row.hasAccount);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.overview.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.overview.lead}</p>

      {/* The only tile that is a job rather than a number, so it leads and it is the
          one that turns accent when it is not zero. */}
      <Link
        href="/admin/documents"
        className={waiting.length > 0 ? `${s.todo} ${s.todoOn}` : s.todo}
      >
        <span className={s.todoIcon}>
          <IconDocuments />
        </span>
        <span>
          <span className={s.todoCount}>{waiting.length}</span>
          <span className={s.todoLabel}>
            {waiting.length === 1 ? t.overview.waitingOne : t.overview.waitingMany}
          </span>
        </span>
      </Link>

      <div className={s.tiles}>
        <Link href="/admin/clients" className={s.tile}>
          <span className={s.tileIcon}>
            <IconClients />
          </span>
          <span className={s.tileCount}>{clients.length}</span>
          <span className={s.tileLabel}>{t.nav.clients}</span>
          <span className={s.tileNote}>
            {fill(t.overview.withoutAccount, { n: withoutAccount.length })}
          </span>
        </Link>

        <Link href="/admin/properties" className={s.tile}>
          <span className={s.tileIcon}>
            <IconProperties />
          </span>
          <span className={s.tileCount}>{properties.length}</span>
          <span className={s.tileLabel}>{t.nav.properties}</span>
          <span className={s.tileNote}>
            {fill(t.overview.photoCount, {
              n: properties.reduce((total, item) => total + item.photos.length, 0),
            })}
          </span>
        </Link>

        <Link href="/admin/process-guide" className={s.tile}>
          <span className={s.tileIcon}>
            <IconProcedures />
          </span>
          <span className={s.tileCount}>{guides.length}</span>
          <span className={s.tileLabel}>{t.nav.guides}</span>
          <span className={s.tileNote}>{t.overview.guidesNote}</span>
        </Link>

        <Link href="/admin/documents" className={s.tile}>
          <span className={s.tileIcon}>
            <IconDocuments />
          </span>
          <span className={s.tileCount}>{documents.length}</span>
          <span className={s.tileLabel}>{t.nav.documents}</span>
          <span className={s.tileNote}>{t.overview.documentsNote}</span>
        </Link>
      </div>
    </div>
  );
}
