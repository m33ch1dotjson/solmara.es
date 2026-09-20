"use client";

import { useActionState, useRef } from "react";
import { createClientAction, type ActionResult } from "@/app/admin/actions";
import type { Locale } from "@/lib/brand";
import s from "./forms.module.css";

/*
 * Creating a client asks for three things and no more: a name, an address to send
 * the link to, and the language to write to them in. Everything else — passport,
 * date of birth, address in Spain — the client fills in themselves, which is the
 * whole point of the link.
 */
export function NewClientForm({ defaultLocale }: { defaultLocale: Locale }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState(
    async (_prev: ActionResult | null, form: FormData) => {
      const result = await createClientAction(form);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={action} className={s.form}>
      <div className={s.grid}>
        <label className={s.field}>
          <span className={s.label}>Naam</span>
          <input name="name" className={s.input} required autoComplete="off" />
        </label>

        <label className={s.field}>
          <span className={s.label}>E-mailadres</span>
          <input name="email" type="email" className={s.input} required autoComplete="off" />
        </label>

        <label className={s.field}>
          <span className={s.label}>Taal</span>
          <select name="locale" className={s.input} defaultValue={defaultLocale}>
            <option value="nl">Nederlands</option>
            <option value="en">Engels</option>
            <option value="es">Spaans</option>
          </select>
        </label>
      </div>

      <label className={s.field}>
        <span className={s.label}>Interne notitie</span>
        <textarea name="internalNotes" className={s.textarea} rows={2} />
        <span className={s.hint}>Alleen voor het team. De klant ziet dit nooit.</span>
      </label>

      <div className={s.actions}>
        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? "Bezig…" : "Klant aanmaken"}
        </button>
        {state?.ok === false && <span className={s.error}>{state.error}</span>}
        {state?.ok === true && state.message && <span className={s.success}>{state.message}</span>}
      </div>
    </form>
  );
}
