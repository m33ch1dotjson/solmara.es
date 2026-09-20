"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "@/app/admin/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { fill } from "@/lib/i18n";
import s from "./forms.module.css";

/*
 * Generating a link invalidates any earlier unused one for this client, so the
 * button says so. Someone who clicks it twice should not be left wondering which of
 * two links in their sent mail still works.
 */
export function InviteButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { t } = useCopy();
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

  async function copyLink() {
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
        <input
          className={s.inviteUrl}
          value={url}
          readOnly
          aria-label={fill(t.clients.linkFor, { name: clientName })}
        />
        <button type="button" className={s.secondary} onClick={copyLink}>
          {copied ? t.common.copied : t.common.copy}
        </button>
      </div>
    );
  }

  return (
    <div className={s.inviteResult}>
      <button type="button" className={s.secondary} onClick={generate} disabled={pending}>
        {pending ? t.common.busy : t.clients.generateLink}
      </button>
      {error && <span className={s.error}>{error}</span>}
    </div>
  );
}
