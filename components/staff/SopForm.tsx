"use client";

import { useActionState, useRef } from "react";
import { STAFF_TERMS } from "@/lib/staff-terms";
import { createSopAction, type ActionResult } from "@/app/admin/actions";
import s from "./forms.module.css";

export function SopForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState(
    async (_prev: ActionResult | null, form: FormData) => {
      const result = await createSopAction(form);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={action} className={s.form}>
      <label className={s.field}>
        <span className={s.label}>Titel</span>
        <input name="title" className={s.input} required autoComplete="off" />
      </label>

      <label className={s.field}>
        <span className={s.label}>Beschrijving</span>
        <textarea name="description" className={s.textarea} rows={5} required />
        <span className={s.hint}>
          Voor intern gebruik. Regelafbrekingen blijven staan.
        </span>
      </label>

      <div className={s.actions}>
        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? "Bezig…" : `${STAFF_TERMS.procedure} opslaan`}
        </button>
        {state?.ok === false && <span className={s.error}>{state.error}</span>}
        {state?.ok === true && state.message && <span className={s.success}>{state.message}</span>}
      </div>
    </form>
  );
}
