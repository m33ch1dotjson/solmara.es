"use client";

import { useActionState, useRef } from "react";
import { createClientAction, type ActionResult } from "@/app/admin/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import type { Locale } from "@/lib/brand";
import { LOCALES, LOCALE_NAME } from "@/lib/i18n";
import s from "./forms.module.css";

/*
 * Creating a client asks for three things and no more: a name, an address to send
 * the link to, and the language to write to them in. Everything else — passport,
 * date of birth, address in Spain — the client fills in themselves, which is the
 * whole point of the link.
 *
 * The language options are endonyms rather than translations of each other. A
 * colleague picking Spanish for a client is picking "Español", and the list reads
 * the same whichever language the admin screens happen to be in.
 */
export function NewClientForm({
  defaultLocale,
  onSaved,
}: {
  defaultLocale: Locale;
  /** Lets the dialog it now lives in know it may close. */
  onSaved?: () => void;
}) {
  const { t } = useCopy();
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState(
    async (_prev: ActionResult | null, form: FormData) => {
      const result = await createClientAction(form);
      if (result.ok) {
        formRef.current?.reset();
        onSaved?.();
      }
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={action} className={s.form}>
      <div className={s.grid}>
        <label className={s.field}>
          <span className={s.label}>{t.newClient.name}</span>
          <input name="name" className={s.input} required autoComplete="off" />
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.common.email}</span>
          <input name="email" type="email" className={s.input} required autoComplete="off" />
        </label>

        <label className={s.field}>
          <span className={s.label}>{t.newClient.language}</span>
          <select name="locale" className={s.input} defaultValue={defaultLocale}>
            {LOCALES.map((option) => (
              <option key={option} value={option}>
                {LOCALE_NAME[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={s.field}>
        <span className={s.label}>{t.newClient.internalNote}</span>
        <textarea name="internalNotes" className={s.textarea} rows={2} />
        <span className={s.hint}>{t.newClient.internalNoteHint}</span>
      </label>

      <div className={s.actions}>
        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? t.common.busy : t.newClient.submit}
        </button>
        {state?.ok === false && <span className={s.error}>{state.error}</span>}
        {state?.ok === true && state.message && <span className={s.success}>{state.message}</span>}
      </div>
    </form>
  );
}
