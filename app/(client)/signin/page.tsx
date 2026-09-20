"use client";

import { useState } from "react";
import { browserClient } from "@/lib/auth/supabase-browser";
import shell from "../portal.module.css";
import s from "./signin.module.css";

/*
 * One sign-in for both audiences.
 *
 * Which portal you land in is decided afterwards, by whether the address sits in
 * staff_user or client_contact — never by a choice made on this screen. That keeps
 * "am I staff?" answerable only by the database.
 *
 * A password is the main route while outbound mail is still being set up. The link
 * stays available as a second option, and once mail works it can become the default
 * again by swapping which half of this screen is shown first.
 *
 * Neither route reveals whether an address is known to us. Same wording, same
 * behaviour, known or not: otherwise this form is a way to enumerate the client list.
 */
export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  async function signIn(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: failure } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (failure) {
      setPending(false);
      setError("Die combinatie klopt niet.");
      return;
    }

    // A full navigation: the session cookie has just been set and the server needs
    // to see it before it can decide which portal to render.
    window.location.href = "/";
  }

  async function sendLink() {
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: failure } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin + "/auth/callback" },
    });

    setPending(false);

    if (failure) {
      // 429 is the mailer's hourly cap, not a transient hiccup. Telling someone to
      // try again in a minute sends them into a loop that cannot succeed.
      setError(
        failure.status === 429
          ? "Er zijn te veel mails verstuurd. Probeer het over een uur opnieuw, of log in met uw wachtwoord."
          : "Versturen lukte niet. Log in met uw wachtwoord of probeer het zo opnieuw.",
      );
      return;
    }

    setLinkSent(true);
  }

  if (linkSent) {
    return (
      <div className={s.block}>
        <div className={s.tile} aria-hidden="true">
          ✉
        </div>
        <h1 className={shell.h1}>Kijk in uw e-mail</h1>
        <p className={shell.body}>
          Als wij een account hebben voor dat adres, is er een inloglink onderweg. Open die op dit
          apparaat en u bent binnen.
        </p>
        <button type="button" className={s.textLink} onClick={() => setLinkSent(false)}>
          Terug naar inloggen
        </button>
      </div>
    );
  }

  return (
    <form className={s.block} onSubmit={signIn}>
      <h1 className={shell.h1}>Inloggen</h1>
      <p className={shell.body}>
        Vul het e-mailadres in dat u aan ons hebt doorgegeven, met het wachtwoord dat u zelf hebt
        gekozen.
      </p>

      <label className={s.field}>
        <span className={s.label}>E-mailadres</span>
        <input
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          className={s.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className={s.field}>
        <span className={s.label}>Wachtwoord</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          className={s.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <button type="submit" className={s.primary} disabled={pending}>
        {pending ? "Bezig…" : "Inloggen"}
      </button>

      {error && <p className={s.error}>{error}</p>}

      <div className={s.divider}>
        <span>of</span>
      </div>

      <button type="button" className={s.secondary} onClick={sendLink} disabled={pending || !email}>
        Stuur mij een inloglink
      </button>
      <p className={shell.note}>
        Vul eerst uw e-mailadres in. De link werkt één keer en vervalt na 30 minuten.
      </p>
    </form>
  );
}
