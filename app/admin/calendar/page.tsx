import { Eyebrow, Mono } from "@/components/ui";
import { brand } from "@/lib/brand";
import { dayOfMonth, monthAbbrev } from "@/lib/format";
import { appointment, cases, featuredClient } from "@/lib/mock";
import shell from "../staff.module.css";
import s from "./calendar.module.css";

export const metadata = { title: "Calendar" };

/*
 * Appointments across the team.
 *
 * The portal writes here and Google Calendar reads: one direction only. A two-way
 * sync between a workflow tool and a personal calendar is a fight nobody wins, and
 * an appointment that exists in two places with different times is worse than one
 * that exists in one.
 */
export default function CalendarPage() {
  const locale = brand.defaultLocale;
  const upcoming = [
    {
      date: appointment.date,
      time: "09:40",
      what: "Cita previa · NIE",
      who: featuredClient.name,
      where: appointment.place[locale],
      caseCode: "ES-2481",
      owner: "Núria",
    },
    {
      date: "2026-09-25T11:00:00+02:00",
      time: "11:00",
      what: "Notary · purchase deed",
      who: "Karim Haddad",
      where: "Notaría Estepona, Calle Real 8",
      caseCode: "ES-2452",
      owner: "Núria",
    },
    {
      date: "2026-09-29T15:30:00+02:00",
      time: "15:30",
      what: "Bank appointment · mortgage",
      who: "Ana Ruiz Delgado",
      where: "Sabadell, Avenida Ricardo Soriano 21",
      caseCode: "ES-2465",
      owner: "Lucía",
    },
  ];

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Calendar</h1>
        <div className={shell.pageStamp}>{cases.length} open cases</div>
      </div>
      <p className={shell.pageLead}>
        Everything the team has booked on a client&apos;s behalf. Created here, mirrored to Google
        Calendar, never edited in both places.
      </p>

      <div className={s.list}>
        {upcoming.map((entry) => (
          <div key={entry.caseCode} className={s.row}>
            <div className={s.date}>
              <Mono size={20} weight={600}>
                {dayOfMonth(entry.date)}
              </Mono>
              <Mono size={11} color="var(--ink-3)">
                {monthAbbrev(entry.date, locale)}
              </Mono>
            </div>
            <div className={s.text}>
              <Eyebrow audience="staff">
                <Mono size={11}>{entry.time}</Mono> · {entry.caseCode} · {entry.owner}
              </Eyebrow>
              <div className={s.what}>{entry.what}</div>
              <div className={s.meta}>
                {entry.who} · {entry.where}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
