"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";
import s from "./forms.module.css";

/**
 * Two clicks, never one. Deleting is the only irreversible thing on these screens,
 * and a misplaced click on a dense row is easy.
 */
export function DeleteButton({
  id,
  action,
  label,
}: {
  id: string;
  action: (form: FormData) => Promise<ActionResult>;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className={s.dangerGhost} onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }

  return (
    <span className={s.confirmRow}>
      <button
        type="button"
        className={s.dangerSolid}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const form = new FormData();
            form.set("id", id);
            await action(form);
          })
        }
      >
        {pending ? "Bezig…" : "Zeker weten"}
      </button>
      <button type="button" className={s.secondary} onClick={() => setConfirming(false)}>
        Annuleren
      </button>
    </span>
  );
}
