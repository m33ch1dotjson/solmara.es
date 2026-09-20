import { Eyebrow, Mono } from "@/components/ui";
import { brand } from "@/lib/brand";
import shell from "../../staff.module.css";
import s from "./settings.module.css";

export const metadata = { title: "Branding" };

/*
 * Branding and identity, as values.
 *
 * "Solmara" is the working name; the production brand becomes "Solmavera". Every
 * value below is read from lib/brand.ts and overridable by environment variable, so
 * the rename is a configuration change rather than a migration.
 *
 * One value is deliberately not retroactive: the case-code prefix applies to new
 * codes only. A case already communicated as SM-CASE-0042 keeps it — renaming
 * historic codes would break every email, invoice and folder that cites one.
 */
export default function SettingsAdminPage() {
  const rows: Array<{ k: string; v: string; note?: string }> = [
    { k: "Company name (staff)", v: brand.staffName },
    { k: "Company name (client)", v: brand.clientName, note: "Shown in client headers and emails" },
    { k: "Legal name", v: brand.legalName },
    { k: "Portal domain", v: brand.portalDomain, note: "Every link in every email is built from this" },
    { k: "Public website", v: brand.publicWebsite },
    { k: "Sender address", v: brand.emailFrom },
    { k: "Reply-to", v: brand.emailReplyTo, note: "A human mailbox, not a queue" },
    { k: "Case code prefix", v: brand.caseCodePrefix, note: "New cases only — existing codes never change" },
    { k: "Accent hue", v: String(brand.accentHue), note: "One number; every accent surface derives from it" },
    { k: "Interface language", v: brand.defaultLocale },
    { k: "Support phone", v: brand.supportPhone },
  ];

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Settings</h1>
      </div>
      <p className={shell.pageLead}>
        Brand and contact details are configuration, not code. Changing them here — or by environment
        variable — is all a rebrand takes.
      </p>

      <dl className={s.table}>
        {rows.map((row) => (
          <div key={row.k} className={s.row}>
            <dt className={s.key}>{row.k}</dt>
            <dd className={s.value}>
              <Mono size={13}>{row.v}</Mono>
              {row.note && <span className={s.note}>{row.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className={s.callout}>
        <Eyebrow audience="staff">When the brand changes</Eyebrow>
        <p className={s.calloutText}>
          These values cover the application. Still manual: DNS, email domain verification with SPF
          and DKIM, the name on the Stripe account, the Slack app and the processor agreements. Half a
          day, not a migration.
        </p>
      </div>
    </div>
  );
}
