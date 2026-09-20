import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewDecision } from "@/components/staff/ReviewDecision";
import { AssetPlaceholder, Dot, Eyebrow, Mono, StatusPill } from "@/components/ui";
import { brand } from "@/lib/brand";
import {
  DOCUMENT_STATUS_KEY,
  documentById,
  documentHistory,
  documentReviewMeta,
  documents,
  featuredCaseCode,
  rejectionReasons,
} from "@/lib/mock";
import s from "./review.module.css";

export default async function DocumentReviewPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const document = documentById(docId);
  if (!document) notFound();

  const locale = brand.defaultLocale;
  const index = documents.findIndex((d) => d.id === document.id);
  const previous = documents[index - 1];
  const next = documents[index + 1];

  return (
    <div className={s.panes}>
      <div className={s.preview}>
        <div className={s.previewTop}>
          <Link href={`/admin/cases/${featuredCaseCode}`} className={s.back}>
            ← Back to case
          </Link>
          <Mono size={12} color="var(--ink-3)">
            {featuredCaseCode} · document {index + 1} of {documents.length}
          </Mono>
          <div className={s.pager}>
            {previous ? (
              <Link href={`/admin/review/${previous.id}`} className={s.pagerButton} aria-label="Previous document">
                ‹
              </Link>
            ) : (
              <span className={`${s.pagerButton} ${s.pagerOff}`} aria-hidden="true">
                ‹
              </span>
            )}
            {next ? (
              <Link href={`/admin/review/${next.id}`} className={s.pagerButton} aria-label="Next document">
                ›
              </Link>
            ) : (
              <span className={`${s.pagerButton} ${s.pagerOff}`} aria-hidden="true">
                ›
              </span>
            )}
          </div>
        </div>

        {/* Real previews replace this. The caption names what belongs here. */}
        <AssetPlaceholder
          minHeight={520}
          caption={`[ ${document.name.toLowerCase().replace(/\s+/g, "-")}.pdf\n1 page · 840 KB ]`}
        />
      </div>

      <aside className={s.rail}>
        <Eyebrow audience="staff">Document review</Eyebrow>
        <h1 className={s.name}>{document.name}</h1>
        <StatusPill
          status={DOCUMENT_STATUS_KEY[document.status]}
          audience="staff"
          locale={locale}
          labelOverride="Received · awaiting review"
        />

        <dl className={s.meta}>
          {documentReviewMeta.map((entry) => (
            <div key={entry.k} className={s.metaRow}>
              <dt className={s.metaKey}>{entry.k}</dt>
              <dd className={s.metaValue}>{entry.v}</dd>
            </div>
          ))}
        </dl>

        <ReviewDecision reasons={rejectionReasons} />

        <div className={s.history}>
          <Eyebrow audience="staff">History</Eyebrow>
          <ol className={s.historyList}>
            {documentHistory.map((entry) => (
              <li key={entry.text} className={s.historyItem}>
                <span className={s.historyDot}>
                  <Dot tone={entry.tone} />
                </span>
                <div>
                  <div className={s.historyText}>{entry.text}</div>
                  <Mono size={11.5} color="var(--ink-3)">
                    {entry.when}
                  </Mono>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
