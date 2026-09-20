"use client";

import { useState } from "react";
import Link from "next/link";
import { IconHelp } from "@/components/ui/Icons";
import { useCopy } from "@/components/ui/LocaleProvider";
import { Modal } from "@/components/ui/Modal";
import { fill } from "@/lib/i18n";
import s from "./SidebarFooter.module.css";

/*
 * The foot of the rail: help, a copyright line and two legal links.
 *
 * Quieter than the navigation above it on purpose — smaller type, muted colour, no
 * icon weight competing with the rows that people actually click all day.
 *
 * Help is a dialog rather than a page because there is one address behind it today.
 * When there is a support centre to point at, this button becomes a link and
 * nothing else about the rail changes.
 */
export function SidebarFooter({ supportEmail, year }: { supportEmail: string; year: number }) {
  const { t } = useCopy();
  const [helping, setHelping] = useState(false);

  return (
    <div className={s.foot}>
      <button type="button" className={s.help} onClick={() => setHelping(true)}>
        <IconHelp size={16} />
        {t.nav.help}
      </button>

      <p className={s.copyright}>{fill(t.footer.copyright, { year })}</p>

      <p className={s.legal}>
        <Link href="/privacy" className={s.legalLink}>
          {t.footer.privacy}
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/terms" className={s.legalLink}>
          {t.footer.terms}
        </Link>
      </p>

      {helping && (
        <Modal title={t.nav.help} onClose={() => setHelping(false)}>
          <p className={s.helpLead}>{t.footer.helpLead}</p>

          <p className={s.helpLabel}>{t.footer.helpEmail}</p>
          <a className={s.helpMail} href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>

          <p className={s.helpHint}>{t.footer.helpHint}</p>
        </Modal>
      )}
    </div>
  );
}
