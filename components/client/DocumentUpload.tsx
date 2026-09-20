"use client";

import { useActionState, useRef } from "react";
import { uploadDocumentAction, type ActionResult } from "@/app/(client)/actions";
import s from "./client-forms.module.css";

type Status = "REQUIRED" | "RECEIVED" | "APPROVED" | "REJECTED";

/*
 * One upload slot.
 *
 * What was sent is shown back. Uploading a passport photo and then seeing only the
 * word "received" leaves you unable to check whether the right file went up, or
 * whether it was readable — and the whole point of doing this in a portal instead of
 * WhatsApp is that you can see the file you sent.
 *
 * A rejected document leads with what is needed, not with what went wrong. No red
 * banner, no warning triangle: the person reading this took a photo an authority
 * will not accept, which is not carelessness.
 */
const PRESENTATION: Record<Status, { tone: string; label: string }> = {
  REQUIRED: { tone: "mute", label: "Nog nodig" },
  RECEIVED: { tone: "info", label: "Wij controleren hem" },
  APPROVED: { tone: "ok", label: "Gecontroleerd en akkoord" },
  REJECTED: { tone: "danger", label: "Niet geaccepteerd" },
};

export function DocumentUpload({
  kind,
  title,
  help,
  status,
  rejectionNote,
  uploadedAt,
  previewUrl,
  mimeType,
}: {
  kind: "PASSPORT" | "PHOTO";
  title: string;
  help: string;
  status: Status;
  rejectionNote: string | null;
  uploadedAt: string | null;
  previewUrl: string | null;
  mimeType: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, action, pending] = useActionState(
    async (_prev: ActionResult | null, form: FormData) => {
      const result = await uploadDocumentAction(form);
      if (result.ok && inputRef.current) inputRef.current.value = "";
      return result;
    },
    null,
  );

  const presentation = PRESENTATION[status];
  const needsAction = status === "REQUIRED" || status === "REJECTED";
  const isImage = mimeType?.startsWith("image/") ?? false;

  return (
    <form
      action={action}
      className={needsAction ? `${s.card} ${s.cardActive}` : s.card}
      style={{ ["--tone" as string]: `var(--${presentation.tone})` }}
    >
      <input type="hidden" name="kind" value={kind} />

      <div className={s.cardHead}>
        <span className={s.cardTitle}>{title}</span>
        <span className={s.pill}>{presentation.label}</span>
      </div>

      {previewUrl && (
        <div className={s.preview}>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`Wat u stuurde voor ${title.toLowerCase()}`} className={s.previewImage} />
          ) : (
            <a href={previewUrl} target="_blank" rel="noreferrer" className={s.previewFile}>
              Het bestand openen dat u stuurde
            </a>
          )}
        </div>
      )}

      <p className={s.help}>{help}</p>

      {status === "REJECTED" && rejectionNote && <p className={s.reason}>{rejectionNote}</p>}

      {uploadedAt && status !== "REQUIRED" && (
        <p className={s.meta}>
          Ontvangen op{" "}
          {new Date(uploadedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
        </p>
      )}

      {status !== "APPROVED" && (
        <>
          <input
            ref={inputRef}
            type="file"
            name="file"
            className={s.file}
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            capture="environment"
            required
          />
          <button type="submit" className={s.primary} disabled={pending}>
            {pending
              ? "Bezig met versturen…"
              : status === "REQUIRED"
                ? "Versturen"
                : "Vervangen door een nieuwe"}
          </button>
        </>
      )}

      {state?.ok === false && <p className={s.error}>{state.error}</p>}
      {state?.ok === true && state.message && <p className={s.success}>{state.message}</p>}
    </form>
  );
}
