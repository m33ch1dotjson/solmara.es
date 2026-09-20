"use client";

import { useState } from "react";
import { Button, Mono } from "@/components/ui";
import type { ClientDocument } from "@/lib/domain";
import s from "./RequestDocuments.module.css";

/*
 * Request documents from a client.
 *
 * This is the flow that used to be a menu item. Tick what is needed, generate a link,
 * send it over WhatsApp or email. The client uploads without an account: a tokenised
 * link is the difference between "please upload your passport" and "first create an
 * account, verify your email, choose a password".
 *
 * Only documents the client still owes are offered. Asking again for something
 * already approved is how a client learns that nobody is reading what they send.
 */
export function RequestDocuments({
  documents,
  caseCode,
  buildUrl,
}: {
  documents: ClientDocument[];
  caseCode: string;
  /** Tokenised URL, built from the configured domain so a rebrand keeps links valid. */
  buildUrl: (token: string) => string;
}) {
  const outstanding = documents.filter((d) => d.owes === "client");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(() => outstanding.map((d) => d.id));
  const [link, setLink] = useState<string | null>(null);

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setLink(null);
  }

  return (
    <>
      <Button size="staffTall" variant="secondary" onClick={() => setOpen(!open)}>
        Request documents
      </Button>

      {open && (
        <div className={s.panel}>
          <div className={s.head}>
            <div className={s.title}>What do you need from the client?</div>
            <Mono size={11.5} color="var(--ink-3)">
              {caseCode}
            </Mono>
          </div>

          <div className={s.list}>
            {outstanding.map((document) => (
              <label key={document.id} className={s.row}>
                <input
                  type="checkbox"
                  className={s.check}
                  checked={picked.includes(document.id)}
                  onChange={() => toggle(document.id)}
                />
                <span className={s.rowText}>
                  <span className={s.rowName}>{document.name}</span>
                  <span className={s.rowMeta}>{document.meta}</span>
                </span>
              </label>
            ))}

            {outstanding.length === 0 && (
              <p className={s.empty}>
                Nothing is outstanding on this case. Everything has been received or settled.
              </p>
            )}
          </div>

          <div className={s.actions}>
            <span className={s.expiry}>The link expires after fourteen days or first use.</span>
            <Button
              size="staffTall"
              variant="primary"
              disabled={picked.length === 0}
              onClick={() => setLink(buildUrl("8f3a-2c19-4b70"))}
            >
              Generate link
            </Button>
          </div>

          {link && (
            <div className={s.result}>
              <Mono size={12.5} color="var(--ink-2)">
                {link}
              </Mono>
              <p className={s.resultNote}>
                Send this over WhatsApp or email. The client sees only the {picked.length}{" "}
                {picked.length === 1 ? "document" : "documents"} you ticked, in their own language.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
