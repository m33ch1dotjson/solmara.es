import Link from "next/link";
import { Mono } from "@/components/ui";
import { cases, featuredClient } from "@/lib/mock";
import shell from "../staff.module.css";
import s from "./clients.module.css";

export const metadata = { title: "Clients" };

/*
 * One row per person, not per case. A client with three cases is one row with a
 * count — the point of the client screen is that contact details exist once.
 */
export default function ClientsPage() {
  // Grouped from the case list until the client table is real.
  const byName = new Map<string, { cases: number; services: Set<string> }>();
  for (const record of cases) {
    const entry = byName.get(record.clientName) ?? { cases: 0, services: new Set<string>() };
    entry.cases += 1;
    entry.services.add(record.serviceName);
    byName.set(record.clientName, entry);
  }

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Clients</h1>
      </div>
      <p className={shell.pageLead}>
        Contact details live here once. A case never keeps its own copy of an email address, so
        correcting a phone number corrects it everywhere.
      </p>

      <div className={s.rows}>
        {[...byName.entries()].map(([name, entry]) => (
          <Link
            key={name}
            href={`/admin/clients/${name === featuredClient.name ? featuredClient.id : "SM-C-0021"}`}
            className={s.row}
          >
            <span className={s.avatar} aria-hidden="true">
              {name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span className={s.name}>{name}</span>
            <span className={s.services}>{[...entry.services].join(" · ")}</span>
            <Mono size={12.5} color="var(--ink-3)">
              {entry.cases} {entry.cases === 1 ? "case" : "cases"}
            </Mono>
          </Link>
        ))}
      </div>
    </div>
  );
}
