"use client";

import { useState } from "react";
import { browserClient } from "@/lib/auth/supabase-browser";
import s from "./StaffLogin.module.css";

/*
 * Signing in to the admin side.
 *
 * Deliberately its own screen, in the staff theme, rather than sending a colleague
 * to the client portal's door. The two audiences never meet: staff sign in at
 * /admin, clients on the root.
 *
 * The response does not say whether an address is known. Anyone can open /admin, and
 * a form that answers "no such user" turns that into a way to find out who works here.
 */
export function StaffLogin({ brandName }: { brandName: string }) {
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
    if (sendError) setError("Versturen lukte niet. Probeer het over een minuut opnieuw.");
    else setSent(true);
  }

  return (
    <div className={s.screen}>
      <div className={s.card}>
        <div className={s.brand}>
          <span className={s.logo} aria-hidden="true" />
          <span className={s.brandName}>{brandName}</span>
        </div>

        {sent ? (
          <>
            <h1 className={s.title}>Kijk in je mail</h1>
            <p className={s.body}>
              Als dit adres bij het team hoort, is er een inloglink onderweg. Open die op dit
              apparaat en je bent binnen.
            </p>
            <button type="button" className={s.link} onClick={() => setSent(false)}>
              Ander adres gebruiken
            </button>
          </>
        ) : (
          <form onSubmit={submit} className={s.form}>
            <h1 className={s.title}>Inloggen</h1>
            <p className={s.body}>
              Je krijgt een link per mail waarmee je meteen bent ingelogd. Geen wachtwoord.
            </p>

            <label className={s.field}>
              <span className={s.label}>E-mailadres</span>
              <input
                type="email"
                required
                autoComplete="email"
                className={s.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button type="submit" className={s.primary} disabled={pending}>
              {pending ? "Bezig…" : "Stuur mij een inloglink"}
            </button>

            {error && <p className={s.error}>{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
