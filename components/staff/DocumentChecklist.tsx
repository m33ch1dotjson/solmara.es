import Link from "next/link";
import { Button, DocumentSegments, Mono, StatusPill } from "@/components/ui";
import type { Locale } from "@/lib/brand";
import type { ClientDocument } from "@/lib/domain";
import { approvedOfTotal } from "@/lib/format";
import { DOCUMENT_STATUS_KEY } from "@/lib/mock";
import type { Tone } from "@/lib/status";
import s from "./DocumentChecklist.module.css";

/*
 * The document checklist — the most-used component in the product.
 *
 * Two decisions carry it:
 *
 * - Rows are grouped by who owes the next move, not by document type. A case
 *   manager opening a case wants "what is mine" first, and "settled" last.
 * - The progress strip is one segment per document coloured by that document's
 *   status. It shows composition, not a percentage, so nothing is implied about how
 *   far along the case is.
 */

const GROUPS: Array<{ owes: ClientDocument["owes"]; title: string }> = [
  { owes: "staff", title: "Needs your review" },
  { owes: "client", title: "Waiting on the client" },
  { owes: "nobody", title: "Settled" },
];

export function DocumentChecklist({
  documents,
  tones,
  locale,
}: {
  documents: ClientDocument[];
  tones: Tone[];
  locale: Locale;
}) {
  const approved = documents.filter((d) => d.status === "APPROVED").length;

  return (
    <section className={s.card}>
      <div className={s.head}>
        <div className={s.headRow}>
          <h2 className={s.title}>Documents</h2>
          <Mono size={12.5} color="var(--ink-3)">
            {approvedOfTotal(approved, documents.length, locale)}
          </Mono>
          <Button size="staff" variant="secondary" className={s.remind}>
            Send reminder
          </Button>
        </div>
        <DocumentSegments tones={tones} />
      </div>

      {GROUPS.map((group) => {
        const rows = documents.filter((d) => d.owes === group.owes);
        if (rows.length === 0) return null;

        return (
          <div key={group.owes}>
            <div className={s.groupHead}>
              <span>{group.title}</span>
              <Mono size={11.5} color="var(--ink-3)">
                {rows.length}
              </Mono>
            </div>

            {rows.map((document) => {
              // At most two primary buttons per checklist: the ones actually waiting
              // on a decision from this person.
              const primary = group.owes === "staff";
              return (
                <div key={document.id} className={s.row}>
                  <div className={s.text}>
                    <div className={s.name}>{document.name}</div>
                    <div className={s.meta}>{document.meta}</div>
                  </div>
                  <div className={s.right}>
                    <StatusPill
                      status={DOCUMENT_STATUS_KEY[document.status]}
                      audience="staff"
                      locale={locale}
                    />
                    {document.staffAction === "Review" ? (
                      <Link href={`/admin/review/${document.id}`} className={s.reviewLink}>
                        <Button size="staff" variant="primary">
                          Review
                        </Button>
                      </Link>
                    ) : (
                      <Button size="staff" variant={primary ? "primary" : "secondary"}>
                        {document.staffAction}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
