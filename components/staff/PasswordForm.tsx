"use client";

import { useState } from "react";
import { browserClient } from "@/lib/auth/supabase-browser";
import s from "./forms.module.css";

/*
 * Setting your own password, after signing in with a magic link.
 *
 * This runs as the signed-in user rather than through the admin API, so it needs no
 * secret key and no trip to the Supabase dashboard — a colleague can do it without
 * anyone handing them credentials.
 *
 * The minimum is eight rather than Supabase's six. Six is short enough that it
 * invites a word someone already uses elsewhere.
 */
const MINIMUM = 8;

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (password.length < MINIMUM) {
      setError(`Gebruik minstens ${MINIMUM} tekens.`);
      return;
    }
    if (password !== repeat) {
      setError("De twee wachtwoorden zijn niet gelijk.");
      return;
    }

    setPending(true);
    const supabase = browserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setRepeat("");
    setDone(true);
  }

  return (
    <form onSubmit={submit} className={s.form}>
      <div className={s.grid}>
        <label className={s.field}>
          <span className={s.label}>Nieuw wachtwoord</span>
          <input
            type="password"
            className={s.input}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label className={s.field}>
          <span className={s.label}>Nog een keer</span>
          <input
            type="password"
            className={s.input}
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            required
          />
        </label>
      </div>

      <div className={s.actions}>
        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? "Bezig…" : "Wachtwoord instellen"}
        </button>
        {error && <span className={s.error}>{error}</span>}
        {done && <span className={s.success}>Gelukt. Je kunt nu met dit wachtwoord inloggen.</span>}
      </div>
    </form>
  );
}
