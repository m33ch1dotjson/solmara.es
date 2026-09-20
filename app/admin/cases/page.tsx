import { CaseTable } from "@/components/staff/CaseTable";
import { brand } from "@/lib/brand";
import { cases } from "@/lib/mock";
import { STAFF_TERMS } from "@/lib/staff-terms";
import shell from "../staff.module.css";

export const metadata = { title: STAFF_TERMS.cases };

export default function CasesPage() {
  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{STAFF_TERMS.cases}</h1>
      </div>
      <p className={shell.pageLead}>
        Every open case across the team. Filters combine, so narrowing by service and by owner shows
        the overlap.
      </p>

      <CaseTable records={cases} locale={brand.defaultLocale} />
    </div>
  );
}
