"use client";

import { useActionState, useState } from "react";
import { saveDetailsAction, type ActionResult } from "@/app/(client)/actions";
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

const FIELDS: Array<{
  name: keyof Details;
  label: string;
  type?: string;
  hint?: string;
  required?: boolean;
}> = [
  { name: "name", label: "Volledige naam", required: true, hint: "Zoals in uw paspoort staat." },
  { name: "phone", label: "Telefoonnummer", type: "tel" },
  { name: "dateOfBirth", label: "Geboortedatum", type: "date" },
  { name: "nationality", label: "Nationaliteit" },
  { name: "passportNumber", label: "Paspoortnummer" },
  { name: "passportExpiry", label: "Paspoort geldig tot", type: "date" },
  { name: "addressHomeCountry", label: "Adres in uw eigen land" },
  {
    name: "addressSpain",
    label: "Adres in Spanje",
    hint: "Hebt u er nog geen, vul dan de plaats in waar u zoekt.",
  },
];

function show(value: string | null, type?: string): string {
  if (!value) return "—";
  if (type !== "date") return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export function DetailsForm({ initial, completed }: { initial: Details; completed: boolean }) {
  const [editing, setEditing] = useState(!completed);
  const [values, setValues] = useState(initial);

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
          {FIELDS.map((field) => (
            <div key={field.name} className={s.summaryRow}>
              <dt className={s.summaryLabel}>{field.label}</dt>
              <dd className={s.summaryValue}>{show(values[field.name], field.type)}</dd>
            </div>
          ))}
        </dl>

        <div className={s.summaryFoot}>
          <button type="button" className={s.secondaryWide} onClick={() => setEditing(true)}>
            Gegevens aanpassen
          </button>
          {state?.ok === true && state.message && <p className={s.success}>{state.message}</p>}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className={s.form}>
      {FIELDS.map((field) => (
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
        {pending ? "Bezig…" : "Gegevens opslaan"}
      </button>

      {completed && (
        <button type="button" className={s.textLink} onClick={() => setEditing(false)}>
          Annuleren
        </button>
      )}

      {state?.ok === false && <p className={s.error}>{state.error}</p>}
    </form>
  );
}
