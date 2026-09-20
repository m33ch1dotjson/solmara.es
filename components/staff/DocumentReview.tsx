"use client";

import { useState, useTransition } from "react";
import { reviewDocumentAction } from "@/app/admin/client-actions";
import s from "./forms.module.css";
import d from "./DocumentReview.module.css";

type Status = "REQUIRED" | "RECEIVED" | "APPROVED" | "REJECTED";

const PRESENTATION: Record<Status, { tone: string; label: string }> = {
  REQUIRED: { tone: "mute", label: "Nog niet ontvangen" },
  RECEIVED: { tone: "info", label: "Wacht op beoordeling" },
  APPROVED: { tone: "ok", label: "Goedgekeurd" },
  REJECTED: { tone: "danger", label: "Afgekeurd" },
};

/*
 * One document, with the decision attached.
 *
 * Rejecting needs a reason and the button stays disabled without one: the client
 * reads that note, and "not accepted" on its own tells them nothing they can act on.
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
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const presentation = PRESENTATION[status];
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
    <div className={d.card} style={{ ["--tone" as string]: `var(--${presentation.tone})` }}>
      <div className={d.head}>
        <span className={d.title}>{title}</span>
        <span className={d.pill}>{presentation.label}</span>
      </div>

      {url ? (
        <div className={d.preview}>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={title} className={d.image} />
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className={d.fileLink}>
              Bestand openen
            </a>
          )}
        </div>
      ) : (
        <p className={d.empty}>De klant heeft dit nog niet gestuurd.</p>
      )}

      {uploadedAt && (
        <p className={d.meta}>
          Ontvangen op{" "}
          {new Date(uploadedAt).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
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
            Goedkeuren
          </button>
          <button type="button" className={s.dangerGhost} onClick={() => setRejecting(true)}>
            Afkeuren
          </button>
        </div>
      )}

      {rejecting && (
        <div className={d.rejectPanel}>
          <label className={s.field}>
            <span className={s.label}>Waarom niet?</span>
            <textarea
              className={s.textarea}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="De onderrand staat er niet op, waardoor de machineleesbare regel niet te lezen is."
            />
            <span className={s.hint}>De klant leest deze tekst letterlijk.</span>
          </label>
          <div className={d.actions}>
            <button
              type="button"
              className={s.dangerSolid}
              disabled={pending || note.trim() === ""}
              onClick={() => decide(false)}
            >
              Afkeuren en versturen
            </button>
            <button type="button" className={s.secondary} onClick={() => setRejecting(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {error && <p className={s.error}>{error}</p>}
    </div>
  );
}
