"use client";

import { useActionState } from "react";
import { saveDetailsAction, type ActionResult } from "@/app/(client)/actions";
import s from "./client-forms.module.css";

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

export function DetailsForm({ initial }: { initial: Details }) {
  const [state, action, pending] = useActionState(
    async (_prev: ActionResult | null, form: FormData) => saveDetailsAction(form),
    null,
  );

  return (
    <form action={action} className={s.form}>
      {FIELDS.map((field) => (
        <label key={field.name} className={s.field}>
          <span className={s.label}>{field.label}</span>
          <input
            name={field.name}
            type={field.type ?? "text"}
            className={s.input}
            defaultValue={initial[field.name] ?? ""}
            required={field.required}
            autoComplete="off"
          />
          {field.hint && <span className={s.hint}>{field.hint}</span>}
        </label>
      ))}

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? "Bezig…" : "Gegevens opslaan"}
      </button>

      {state?.ok === false && <p className={s.error}>{state.error}</p>}
      {state?.ok === true && state.message && <p className={s.success}>{state.message}</p>}
    </form>
  );
}
