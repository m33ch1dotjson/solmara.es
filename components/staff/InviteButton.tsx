"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "@/app/admin/actions";
import s from "./forms.module.css";

/*
 * Generating a link invalidates any earlier unused one for this client, so the
 * button says so. Someone who clicks it twice should not be left wondering which of
 * two links in their sent mail still works.
 */
export function InviteButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    start(async () => {
      const form = new FormData();
      form.set("clientId", clientId);
      const result = await createInviteAction(form);
      if (result.ok && result.message) setUrl(result.message);
      else if (!result.ok) setError(result.error);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link stays selectable on screen.
      setCopied(false);
    }
  }

  if (url) {
    return (
      <div className={s.inviteResult}>
        <input className={s.inviteUrl} value={url} readOnly aria-label={`Link voor ${clientName}`} />
        <button type="button" className={s.secondary} onClick={copy}>
          {copied ? "Gekopieerd" : "Kopieer"}
        </button>
      </div>
    );
  }

  return (
    <div className={s.inviteResult}>
      <button type="button" className={s.secondary} onClick={generate} disabled={pending}>
        {pending ? "Bezig…" : "Link genereren"}
      </button>
      {error && <span className={s.error}>{error}</span>}
    </div>
  );
}
