"use client";

import { useActionState, useRef } from "react";
import { createPropertyAction, type ActionResult } from "@/app/admin/actions";
import s from "./forms.module.css";

export function PropertyForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState(
    async (_prev: ActionResult | null, form: FormData) => {
      const result = await createPropertyAction(form);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={action} className={s.form}>
      <div className={s.grid}>
        <label className={s.field}>
          <span className={s.label}>Titel</span>
          <input name="title" className={s.input} required autoComplete="off" />
        </label>

        <label className={s.field}>
          <span className={s.label}>Adres</span>
          <input name="address" className={s.input} required autoComplete="off" />
        </label>
      </div>

      <label className={s.field}>
        <span className={s.label}>Notitie</span>
        <textarea name="notes" className={s.textarea} rows={2} />
      </label>

      <label className={s.field}>
        <span className={s.label}>Foto&apos;s</span>
        <input
          type="file"
          name="photos"
          className={s.fileInput}
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
        />
        <span className={s.hint}>JPEG, PNG, WebP of HEIC. Maximaal 10 MB per foto.</span>
      </label>

      <div className={s.actions}>
        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? "Bezig met uploaden…" : "Property opslaan"}
        </button>
        {state?.ok === false && <span className={s.error}>{state.error}</span>}
        {state?.ok === true && state.message && <span className={s.success}>{state.message}</span>}
      </div>
    </form>
  );
}
