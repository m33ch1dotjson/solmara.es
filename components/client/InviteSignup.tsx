"use client";

import { useState } from "react";
import { browserClient } from "@/lib/auth/supabase-browser";
import s from "./client-forms.module.css";

/*
 * Sends the sign-in link to the address the invite was made for.
 *
 * The address is fixed, not typed: the link was issued for one person, and letting a
 * visitor change it would turn a valid invite into a way to attach somebody else's
 * account to this file. It is shown read-only so they can check it is theirs.
 *
 * The invite is only redeemed in the auth callback, once Supabase has proved they
 * control that mailbox — never on this click.
 */
export function InviteSignup({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setPending(false);
    if (sendError) setError("Versturen lukte niet. Probeer het over een minuut opnieuw.");
    else setSent(true);
  }

  if (sent) {
    return (
      <div className={s.card}>
        <span className={s.cardTitle}>Kijk in uw e-mail</span>
        <p className={s.help}>
          Wij hebben een inloglink gestuurd naar {email}. Open die op dit apparaat en u bent binnen.
        </p>
        <p className={s.meta}>Niets ontvangen? Kijk eerst in uw map met ongewenste e-mail.</p>
      </div>
    );
  }

  return (
    <div className={s.form}>
      <label className={s.field}>
        <span className={s.label}>Uw e-mailadres</span>
        <input className={s.input} value={email} readOnly aria-readonly="true" />
        <span className={s.hint}>
          Klopt dit adres niet? Laat het uw contactpersoon weten, dan maken zij een nieuwe link.
        </span>
      </label>

      <button type="button" className={s.primary} onClick={send} disabled={pending}>
        {pending ? "Bezig…" : "Stuur mij een inloglink"}
      </button>

      {error && <p className={s.error}>{error}</p>}
    </div>
  );
}
