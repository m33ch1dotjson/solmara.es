"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "./forms.module.css";

/**
 * Two clicks, never one. Deleting is the only irreversible thing on these screens,
 * and a misplaced click on a dense row is easy.
 *
 * The label is no longer a prop: every caller passed the same word, and a label
 * handed down from a server component is how a Dutch button survives a switch to
 * Spanish.
 */
export function DeleteButton({
  id,
  action,
}: {
  id: string;
  action: (form: FormData) => Promise<ActionResult>;
}) {
  const { t } = useCopy();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className={s.dangerGhost} onClick={() => setConfirming(true)}>
        {t.common.delete}
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
        {pending ? t.common.busy : t.common.confirmDelete}
      </button>
      <button type="button" className={s.secondary} onClick={() => setConfirming(false)}>
        {t.common.cancel}
      </button>
    </span>
  );
}
