import Link from "next/link";
import { DocumentReview } from "@/components/staff/DocumentReview";
import { Mono } from "@/components/ui";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, fill } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { listSentDocuments } from "@/lib/queries";
import { BUCKET_CLIENT_DOCUMENTS, signedUrl } from "@/lib/storage";
import shell from "../staff.module.css";
import s from "./documents.module.css";

/*
 * Every document anybody has sent, across all clients, with the ones still waiting
 * for a decision at the top.
 *
 * The same card as on a client's own page, so approving from here and approving from
 * there are the same act with the same wording. What this screen adds is the client's
 * name above each card — without it a wall of passport pages is unattributable.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).documentsPage.title };
}

export default async function DocumentsPage() {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const documents = await listSentDocuments(actor);
  const t = copy(locale);

  // Waiting first, then the rest in the order the query gave them (newest first).
  const ordered = [...documents].sort((a, b) => {
    const rank = (status: string) => (status === "RECEIVED" ? 0 : 1);
    return rank(a.status) - rank(b.status);
  });

  // Signed per render, ten minutes, exactly as on a client's own page.
  const withUrls = await Promise.all(
    ordered.map(async (doc) => ({
      ...doc,
      url: doc.storageKey ? await signedUrl(BUCKET_CLIENT_DOCUMENTS, doc.storageKey) : null,
    })),
  );

  const docTitle = { PASSPORT: t.documents.passportTitle, PHOTO: t.documents.photoTitle };
  const waiting = documents.filter((doc) => doc.status === "RECEIVED").length;

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.documentsPage.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.documentsPage.lead}</p>

      <h2 className={s.sectionTitle}>
        {fill(waiting === 1 ? t.documentsPage.waitingOne : t.documentsPage.waitingMany, {
          n: waiting,
        })}
      </h2>

      {withUrls.length === 0 ? (
        <p className={s.empty}>{t.documentsPage.empty}</p>
      ) : (
        <div className={s.list}>
          {withUrls.map((doc) => (
            <div key={doc.id} className={s.item}>
              <div className={s.who}>
                <Link href={`/admin/clients/${doc.clientId}`} className={s.whoName}>
                  {doc.clientName}
                </Link>
                <Mono size={12} color="var(--ink-3)">
                  {doc.clientCode}
                </Mono>
              </div>
              <DocumentReview
                documentId={doc.id}
                title={docTitle[doc.kind]}
                status={doc.status}
                url={doc.url}
                mimeType={doc.mimeType}
                uploadedAt={doc.uploadedAt?.toISOString() ?? null}
                rejectionNote={doc.rejectionNote}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
