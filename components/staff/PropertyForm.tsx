"use client";

import { useActionState, useRef } from "react";
import { createPropertyAction, type ActionResult } from "@/app/admin/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import s from "./forms.module.css";

export function PropertyForm() {
  const { t } = useCopy();
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
          <span className={s.label}>{t.properties.formTitle}</span>
          <input name="title" className={s.input} required autoComplete="off" />
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.properties.formAddress}</span>
          <input name="address" className={s.input} required autoComplete="off" />
        </label>
      </div>

      <label className={s.field}>
        <span className={s.label}>{t.properties.formNotes}</span>
        <textarea name="notes" className={s.textarea} rows={2} />
      </label>

      <label className={s.field}>
        <span className={s.label}>{t.properties.formPhotos}</span>
        <input
          type="file"
          name="photos"
          className={s.fileInput}
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
        />
        <span className={s.hint}>{t.properties.formPhotosHint}</span>
      </label>

      <div className={s.actions}>
        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? t.properties.uploading : t.properties.submit}
        </button>
        {state?.ok === false && <span className={s.error}>{state.error}</span>}
        {state?.ok === true && state.message && <span className={s.success}>{state.message}</span>}
      </div>
    </form>
  );
}
