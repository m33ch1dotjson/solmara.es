import Link from "next/link";
import { Mono, StatusPill } from "@/components/ui";
import { brand } from "@/lib/brand";
import { DOCUMENT_STATUS_KEY, documents, featuredCaseCode, featuredClient } from "@/lib/mock";
import shell from "../staff.module.css";
import s from "./queue.module.css";

export const metadata = { title: "Document review" };

/*
 * The review queue. Only documents that actually wait on a decision appear here —
 * the checklist on the case screen is where everything else lives.
 */
export default function ReviewQueuePage() {
  const locale = brand.defaultLocale;
  const waiting = documents.filter((d) => d.owes === "staff");

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Document review</h1>
      </div>
      <p className={shell.pageLead}>
        Documents a client has sent that nobody has checked yet. Oldest upload first, because a
        client who is waiting does not know the queue exists.
      </p>

      <div className={s.rows}>
        {waiting.map((document) => (
          <Link key={document.id} href={`/admin/review/${document.id}`} className={s.row}>
            <Mono size={12.5} color="var(--ink-3)">
              {featuredCaseCode}
            </Mono>
            <span className={s.client}>{featuredClient.name}</span>
            <span className={s.name}>{document.name}</span>
            <span className={s.meta}>{document.meta}</span>
            <StatusPill
              status={DOCUMENT_STATUS_KEY[document.status]}
              audience="staff"
              locale={locale}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
