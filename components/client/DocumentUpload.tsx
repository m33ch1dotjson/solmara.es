"use client";

import { useActionState, useRef } from "react";
import { uploadDocumentAction, type ActionResult } from "@/app/(client)/actions";
import s from "./client-forms.module.css";

type Status = "REQUIRED" | "RECEIVED" | "APPROVED" | "REJECTED";

/*
 * One upload slot.
 *
 * A rejected document leads with what is needed, not with what went wrong: the
 * heading stays the same and the reason sits underneath in plain words. There is no
 * red banner and no warning triangle — the person reading this did nothing careless,
 * they took a photo that an authority will not accept.
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
}: {
  kind: "PASSPORT" | "PHOTO";
  title: string;
  help: string;
  status: Status;
  rejectionNote: string | null;
  uploadedAt: string | null;
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

      <p className={s.help}>{help}</p>

      {status === "REJECTED" && rejectionNote && (
        <p className={s.reason}>{rejectionNote}</p>
      )}

      {status === "RECEIVED" && uploadedAt && (
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
            {pending ? "Bezig met versturen…" : status === "REJECTED" ? "Nieuwe foto sturen" : "Versturen"}
          </button>
        </>
      )}

      {state?.ok === false && <p className={s.error}>{state.error}</p>}
      {state?.ok === true && state.message && <p className={s.success}>{state.message}</p>}
    </form>
  );
}
