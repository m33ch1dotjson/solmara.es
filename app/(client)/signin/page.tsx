"use client";

import { useState } from "react";
import { browserClient } from "@/lib/auth/supabase-browser";
import shell from "../portal.module.css";
import s from "./signin.module.css";

/*
 * One sign-in for both audiences.
 *
 * Which portal you land in is decided afterwards, by whether the address is in
 * staff_user or client_contact — never by a choice made on this screen. That keeps
 * the question "am I staff?" answerable only by the database.
 *
 * The response never reveals whether an address is known to us. Same wording, same
 * behaviour, known or not: this form is otherwise a way to enumerate the client list.
 */
export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setPending(false);

    if (sendError) {
      // 429 is the built-in mailer's hourly cap, not a transient hiccup. Saying
      // "try again in a minute" there sends someone into a loop that cannot succeed.
      setError(
        sendError.status === 429
          ? "Er zijn te veel mails verstuurd vanaf dit project. Probeer het over een uur opnieuw, of laat ons eigen mailadres instellen."
          : "Versturen lukte niet. Probeer het zo opnieuw.",
      );
    } else setSent(true);
  }

  if (sent) {
    return (
      <div className={s.block}>
        <div className={s.tile} aria-hidden="true">
          ✉
        </div>
        <h1 className={shell.h1}>Kijk in uw e-mail</h1>
        <p className={shell.body}>
          Als wij een account hebben voor dat adres, is er een inloglink onderweg. Open die link op
          dit apparaat en u bent binnen.
        </p>
        <p className={shell.note}>
          Niets ontvangen? Kijk eerst in uw map met ongewenste e-mail.
        </p>
        <button type="button" className={s.textLink} onClick={() => setSent(false)}>
          Ander e-mailadres gebruiken
        </button>
      </div>
    );
  }

  return (
    <form className={s.block} onSubmit={submit}>
      <h1 className={shell.h1}>Inloggen</h1>
      <p className={shell.body}>
        Vul het e-mailadres in dat u aan ons hebt doorgegeven. U ontvangt een link waarmee u meteen
        bent ingelogd. Geen wachtwoord om te onthouden.
      </p>

      <label className={s.field}>
        <span className={s.label}>E-mailadres</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className={s.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? "Bezig…" : "Stuur mij een inloglink"}
      </button>

      {error && <p className={s.error}>{error}</p>}

      <p className={shell.note}>
        Als wij een account hebben voor dit adres, komt de link binnen een minuut binnen. De link
        werkt één keer en vervalt na 30 minuten.
      </p>
    </form>
  );
}
