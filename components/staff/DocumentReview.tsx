"use client";

import { useState, useTransition } from "react";
import { reviewDocumentAction } from "@/app/admin/client-actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill, formatDateFor, type Copy } from "@/lib/i18n";
import { Lightbox } from "./Lightbox";
import s from "./forms.module.css";
import d from "./DocumentReview.module.css";

type Status = "REQUIRED" | "RECEIVED" | "APPROVED" | "REJECTED";

/*
 * There is one document per card, so the overlay has nowhere to step to. Defined once
 * at module level rather than inline: a fresh function on every render would make the
 * overlay's key handler unsubscribe and resubscribe each time.
 */
const STAY = () => {};

const TONE: Record<Status, string> = {
  REQUIRED: "mute",
  RECEIVED: "info",
  APPROVED: "ok",
  REJECTED: "danger",
};

/*
 * The staff wording for a status, which is not the client wording: a colleague reads
 * "waiting for review" where the client reads "we are checking it". Same row in the
 * database, two different sentences on purpose.
 */
function statusLabel(status: Status, t: Copy): string {
  switch (status) {
    case "REQUIRED":
      return t.review.statusRequired;
    case "RECEIVED":
      return t.review.statusReceived;
    case "APPROVED":
      return t.review.statusApproved;
    case "REJECTED":
      return t.review.statusRejected;
  }
}

/*
 * One document, with the decision attached.
 *
 * Rejecting needs a reason and the button stays disabled without one: the client
 * reads that note, and "not accepted" on its own tells them nothing they can act on.
 *
 * The note itself is typed by a colleague and stored as typed — it is not translated
 * on the way to the client, who may well be reading the rest of the page in Spanish.
 */
export function DocumentReview({
  documentId,
  title,
  status,
  url,
  mimeType,
  uploadedAt,
  rejectionNote,
}: {
  documentId: string;
  title: string;
  status: Status;
  url: string | null;
  mimeType: string | null;
  uploadedAt: string | null;
  rejectionNote: string | null;
}) {
  const { t, locale, dates } = useCopy();
  const [zoomed, setZoomed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isImage = mimeType?.startsWith("image/") ?? false;

  function decide(approve: boolean) {
    setError(null);
    start(async () => {
      const form = new FormData();
      form.set("documentId", documentId);
      form.set("decision", approve ? "approve" : "reject");
      form.set("note", note);
      const result = await reviewDocumentAction(form);
      if (!result.ok) setError(result.error);
      else {
        setRejecting(false);
        setNote("");
      }
    });
  }

  return (
    <div className={d.card} style={{ ["--tone" as string]: `var(--${TONE[status]})` }}>
      <div className={d.head}>
        <span className={d.title}>{title}</span>
        <span className={d.pill}>{statusLabel(status, t)}</span>
      </div>

      {url ? (
        <div className={d.preview}>
          {isImage ? (
            // A passport page is exactly the thing you need to read rather than
            // glance at, and the preview caps out at 320px tall.
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={d.zoom}
              title={t.common.enlarge}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                setZoomed(true);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={title} className={d.image} />
            </a>
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className={d.fileLink}>
              {t.review.openFile}
            </a>
          )}
        </div>
      ) : (
        <p className={d.empty}>{t.review.notSentYet}</p>
      )}

      {uploadedAt && (
        <p className={d.meta}>
          {fill(t.review.receivedOn, { date: formatDateFor(uploadedAt, locale, dates) })}
        </p>
      )}

      {status === "REJECTED" && rejectionNote && <p className={d.reason}>{rejectionNote}</p>}

      {url && status !== "APPROVED" && !rejecting && (
        <div className={d.actions}>
          <button
            type="button"
            className={d.approve}
            disabled={pending}
            onClick={() => decide(true)}
          >
            {t.review.approve}
          </button>
          <button type="button" className={s.dangerGhost} onClick={() => setRejecting(true)}>
            {t.review.reject}
          </button>
        </div>
      )}

      {rejecting && (
        <div className={d.rejectPanel}>
          <label className={s.field}>
            <span className={s.label}>{t.review.whyNot}</span>
            <textarea
              className={s.textarea}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.review.whyNotPlaceholder}
            />
            <span className={s.hint}>{t.review.clientReads}</span>
          </label>
          <div className={d.actions}>
            <button
              type="button"
              className={s.dangerSolid}
              disabled={pending || note.trim() === ""}
              onClick={() => decide(false)}
            >
              {t.review.rejectAndSend}
            </button>
            <button type="button" className={s.secondary} onClick={() => setRejecting(false)}>
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {error && <p className={s.error}>{error}</p>}

      {zoomed && url && (
        <Lightbox
          urls={[url]}
          alts={[title]}
          at={0}
          onMove={STAY}
          onClose={() => setZoomed(false)}
        />
      )}
    </div>
  );
}
