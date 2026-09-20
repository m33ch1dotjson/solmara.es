"use client";

import { useState } from "react";
import { browserClient } from "@/lib/auth/supabase-browser";
import s from "./StaffLogin.module.css";

/*
 * Signing in to the admin side, with a password.
 *
 * Deliberately its own screen in the staff theme rather than sending a colleague to
 * the client portal's door. The two audiences never meet: staff sign in at /admin,
 * clients on the root with a magic link.
 *
 * The password is a stopgap until outbound mail is configured — a magic link needs
 * SMTP and the built-in sender is rate-limited to a handful of messages. Swapping it
 * back is a change to this component and nothing else, because what makes somebody
 * staff is their row in staff_user, not how they proved who they are.
 *
 * A failed attempt says "combination is wrong", never which half. Anyone can open
 * /admin, and a form that distinguishes the two turns it into a way to find out who
 * works here.
 */
export function StaffLogin({ brandName }: { brandName: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);

    const supabase = browserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setPending(false);
      setError("Die combinatie klopt niet.");
      return;
    }

    // A full navigation rather than a router refresh: the session cookie has just
    // been set and the server needs to see it before rendering the admin screens.
    window.location.href = "/admin";
  }

  return (
    <div className={s.screen}>
      <div className={s.card}>
        <div className={s.brand}>
          <span className={s.logo} aria-hidden="true" />
          <span className={s.brandName}>{brandName}</span>
        </div>

        <form onSubmit={submit} className={s.form}>
          <h1 className={s.title}>Inloggen</h1>

          <label className={s.field}>
            <span className={s.label}>E-mailadres</span>
            <input
              type="email"
              required
              autoComplete="username"
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
        </form>
      </div>
    </div>
  );
}
