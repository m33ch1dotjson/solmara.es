"use client";

import { useActionState, useState } from "react";
import { saveDetailsAction, type ActionResult } from "@/app/(client)/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { formatDate, type Copy } from "@/lib/i18n";
import s from "./client-forms.module.css";

/*
 * Your details, in two modes.
 *
 * Once they are filled in the page shows them back as a summary rather than leaving
 * an open form. Saving something and being left staring at the same inputs gives no
 * sign that anything happened — you cannot tell the saved state from the unsaved one.
 *
 * Editing is one button away, and after a save it returns to the summary so the
 * confirmation is the content itself.
 */

interface Details {
  name: string;
  phone: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  addressHomeCountry: string | null;
  addressSpain: string | null;
}

interface Field {
  name: keyof Details;
  label: string;
  type?: string;
  hint?: string;
  required?: boolean;
}

/*
 * Built from the dictionary rather than declared at module scope: a label is copy,
 * and a list of labels fixed at import time cannot follow the switcher.
 */
function fieldsFor(t: Copy): Field[] {
  return [
    { name: "name", label: t.fields.name, required: true, hint: t.fields.nameHint },
    { name: "phone", label: t.fields.phone, type: "tel" },
    { name: "dateOfBirth", label: t.fields.dateOfBirth, type: "date" },
    { name: "nationality", label: t.fields.nationality },
    { name: "passportNumber", label: t.fields.passportNumber },
    { name: "passportExpiry", label: t.fields.passportExpiry, type: "date" },
    { name: "addressHomeCountry", label: t.fields.addressHomeCountry },
    { name: "addressSpain", label: t.fields.addressSpain, hint: t.fields.addressSpainHint },
  ];
}

export function DetailsForm({ initial, completed }: { initial: Details; completed: boolean }) {
  const { t, locale } = useCopy();
  const [editing, setEditing] = useState(!completed);
  const [values, setValues] = useState(initial);

  const fields = fieldsFor(t);

  function show(value: string | null, type?: string): string {
    if (!value) return t.common.blank;
    return type === "date" ? formatDate(value, locale) : value;
  }

  const [state, action, pending] = useActionState(
    async (_prev: ActionResult | null, form: FormData) => {
      const result = await saveDetailsAction(form);
      if (result.ok) {
        // Read back what was sent, so the summary shows the new values without
        // waiting for a round trip. Name is required and therefore never null.
        const read = (key: keyof Details): string | null => {
          const raw = form.get(key);
          return typeof raw === "string" && raw !== "" ? raw : null;
        };

        setValues({
          name: read("name") ?? values.name,
          phone: read("phone"),
          dateOfBirth: read("dateOfBirth"),
          nationality: read("nationality"),
          passportNumber: read("passportNumber"),
          passportExpiry: read("passportExpiry"),
          addressHomeCountry: read("addressHomeCountry"),
          addressSpain: read("addressSpain"),
        });
        setEditing(false);
      }
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <div className={s.summary}>
        <dl className={s.summaryGrid}>
          {fields.map((field) => (
            <div key={field.name} className={s.summaryRow}>
              <dt className={s.summaryLabel}>{field.label}</dt>
              <dd className={s.summaryValue}>{show(values[field.name], field.type)}</dd>
            </div>
          ))}
        </dl>

        <div className={s.summaryFoot}>
          <button type="button" className={s.secondaryWide} onClick={() => setEditing(true)}>
            {t.home.editDetails}
          </button>
          {state?.ok === true && state.message && <p className={s.success}>{state.message}</p>}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className={s.form}>
      {fields.map((field) => (
        <label key={field.name} className={s.field}>
          <span className={s.label}>{field.label}</span>
          <input
            name={field.name}
            type={field.type ?? "text"}
            className={s.input}
            defaultValue={values[field.name] ?? ""}
            required={field.required}
            autoComplete="off"
          />
          {field.hint && <span className={s.hint}>{field.hint}</span>}
        </label>
      ))}

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? t.common.busy : t.home.saveDetails}
      </button>

      {completed && (
        <button type="button" className={s.textLink} onClick={() => setEditing(false)}>
          {t.common.cancel}
        </button>
      )}

      {state?.ok === false && <p className={s.error}>{state.error}</p>}
    </form>
  );
}
