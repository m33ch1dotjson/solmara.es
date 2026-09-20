import { Eyebrow, Mono, StatusPill } from "@/components/ui";
import { brand } from "@/lib/brand";
import { signedInUser } from "@/lib/mock";
import shell from "../../staff.module.css";
import s from "./team.module.css";

export const metadata = { title: "Team" };

/*
 * Who can get in, and what they can see.
 *
 * Access is invite-only: there is no public sign-up endpoint, because that is the
 * most commonly made mistake in a system like this. Two-factor is required for
 * everyone, and a case manager sees the documents of cases assigned to them.
 */
export default function TeamAdminPage() {
  const locale = brand.defaultLocale;

  const members = [
    { name: signedInUser.name, initials: signedInUser.initials, role: "Case manager", place: "Málaga", mfa: true, cases: 14 },
    { name: "Pau Ribó", initials: "PR", role: "Case manager", place: "Estepona", mfa: true, cases: 12 },
    { name: "Lucía Márquez", initials: "LM", role: "Case manager", place: "Marbella", mfa: true, cases: 12 },
    { name: "Romara Solmara", initials: "RS", role: "Admin", place: "Marbella", mfa: false, cases: 0 },
  ];

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Team</h1>
      </div>
      <p className={shell.pageLead}>
        Invite-only: there is no public sign-up. Everyone needs two-factor authentication, and a case
        manager sees the documents of the cases assigned to them.
      </p>

      <div className={s.list}>
        {members.map((member) => (
          <div key={member.name} className={s.row}>
            <div className={s.avatar} aria-hidden="true">
              {member.initials}
            </div>
            <div className={s.text}>
              <div className={s.name}>{member.name}</div>
              <div className={s.meta}>
                {member.role} · {member.place}
              </div>
            </div>
            <div className={s.right}>
              <span className={s.count}>
                <Mono size={12.5}>{member.cases}</Mono> cases
              </span>
              <StatusPill
                status={member.mfa ? "approved" : "rejected"}
                audience="staff"
                locale={locale}
                labelOverride={member.mfa ? "2FA on" : "2FA missing"}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={s.warning}>
        <Eyebrow audience="staff">Needs attention</Eyebrow>
        <p className={s.warningText}>
          One account has no second factor. Dashboard access is full data access, so this is the one
          gap on this screen worth fixing today.
        </p>
      </div>
    </div>
  );
}
