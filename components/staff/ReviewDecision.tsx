"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import s from "./ReviewDecision.module.css";

/*
 * Approve or reject one document.
 *
 * A rejection cannot be sent without a reason: the confirm button stays disabled
 * and grey until one is picked, and the helper line says so. The client receives
 * the reason and the note translated, so an empty rejection would reach them as an
 * unexplained refusal — which is exactly the phone call this portal exists to avoid.
 */
export function ReviewDecision({ reasons }: { reasons: string[] }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const canReject = reason !== null;

  function cancel() {
    setRejecting(false);
    setReason(null);
    setNote("");
  }

  return (
    <div className={s.wrap}>
      <div className={s.buttons}>
        <Button variant="affirm" size="staffTall" className={s.grow} onClick={cancel}>
          Approve
        </Button>
        <Button
          variant={rejecting ? "destructive" : "secondary"}
          size="staffTall"
          className={s.grow}
          onClick={() => setRejecting(true)}
        >
          Reject
        </Button>
      </div>

      {rejecting && (
        <div className={s.panel}>
          <div className={s.panelTitle}>Why is it being rejected?</div>

          <div className={s.reasons}>
            {reasons.map((option) => (
              <button
                key={option}
                type="button"
                className={reason === option ? `${s.reason} ${s.reasonOn}` : s.reason}
                aria-pressed={reason === option}
                onClick={() => setReason(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <textarea
            className={s.note}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note. This text is sent to the client, so write it for them."
            aria-label="Note to the client"
          />

          <p className={s.hint}>
            {canReject
              ? "The client sees the reason and the note, translated into Dutch, and can re-upload from the same link."
              : "Pick a reason to continue. Rejections are never sent without one."}
          </p>

          <div className={s.confirmRow}>
            <Button variant="secondary" size="staffTall" onClick={cancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="staffTall"
              disabled={!canReject}
              className={canReject ? s.confirmOn : undefined}
              onClick={cancel}
            >
              Send rejection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
