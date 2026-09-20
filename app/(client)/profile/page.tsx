"use client";

import { LanguageSwitcher, useLocale } from "@/components/client/LocaleProvider";
import { Card, Eyebrow, Mono } from "@/components/ui";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { formatFullDate } from "@/lib/format";
import { featuredClient } from "@/lib/mock";
import shell from "../portal.module.css";
import s from "./profile.module.css";

/*
 * What we hold about this person, shown back to them.
 *
 * Not in the design handoff; Solmara asked for it. Two reasons it is worth a screen:
 * a client can catch our typo in their passport number before it reaches a Spanish
 * form, and it answers "what is my NIE again" without a phone call.
 *
 * Read-only on purpose. Letting a client edit their own passport number in a system
 * that submits official applications would mean re-verifying everything after every
 * edit; a correction goes through a person instead.
 */
export default function MyProfilePage() {
  const { locale } = useLocale();
  const terms = CLIENT_TERMS[locale];
  const client = featuredClient;

  return (
    <>
      <div>
        <h1 className={shell.h1}>{terms.profile}</h1>
        <p className={s.lead}>{terms.profileLead}</p>
      </div>

      <Card audience="client" className={s.card}>
        <Eyebrow audience="client">{terms.profilePersonal}</Eyebrow>
        <Field label="Name" value={client.name} terms={terms} />
        <Field
          label="Date of birth"
          value={client.identity.dateOfBirth ? formatFullDate(client.identity.dateOfBirth, locale) : null}
          terms={terms}
        />
        <Field label="Nationality" value={client.identity.nationality} terms={terms} />
      </Card>

      <Card audience="client" className={s.card}>
        <Eyebrow audience="client">{terms.profileIdentification}</Eyebrow>
        <Field label="Passport" value={client.identity.passportNumber} terms={terms} mono />
        <Field
          label="Passport valid until"
          value={
            client.identity.passportExpiry ? formatFullDate(client.identity.passportExpiry, locale) : null
          }
          terms={terms}
        />
        <Field label="NIE" value={client.identity.nieNumber} terms={terms} mono />
      </Card>

      <Card audience="client" className={s.card}>
        <Eyebrow audience="client">{terms.profileContact}</Eyebrow>
        <Field label="Email" value={client.email} terms={terms} />
        <Field label="Phone" value={client.phone} terms={terms} />
      </Card>

      <Card audience="client" className={s.card}>
        <Eyebrow audience="client">{terms.profileAddress}</Eyebrow>
        <Field label="Spain" value={client.addresses.spain} terms={terms} />
        <Field label="Home country" value={client.addresses.homeCountry} terms={terms} />
      </Card>

      <p className={shell.note}>{terms.profileCorrect}</p>

      <div className={shell.footer}>
        <LanguageSwitcher />
      </div>
    </>
  );
}

function Field({
  label,
  value,
  terms,
  mono,
}: {
  label: string;
  value: string | null;
  terms: { notKnownYet: string };
  mono?: boolean;
}) {
  return (
    <div className={s.field}>
      <div className={s.label}>{label}</div>
      <div className={s.value}>
        {value ? (
          mono ? (
            <Mono size={16}>{value}</Mono>
          ) : (
            value
          )
        ) : (
          <span className={s.empty}>{terms.notKnownYet}</span>
        )}
      </div>
    </div>
  );
}
