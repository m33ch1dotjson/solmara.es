import { Eyebrow, Mono, StatusPill } from "@/components/ui";
import { brand } from "@/lib/brand";
import { nieTemplate } from "@/lib/mock";
import shell from "../../staff.module.css";
import s from "./services.module.css";

export const metadata = { title: "Services & workflows" };

/*
 * Service templates.
 *
 * This screen is the whole reason the workflow is data rather than code: a new
 * service is a row here, not a ticket for a developer. A template is never edited in
 * place — it is superseded, and running cases keep the version they started on.
 */
export default function ServicesAdminPage() {
  const locale = brand.defaultLocale;

  const services = [
    { template: nieTemplate, cases: 5, active: true },
    {
      template: {
        ...nieTemplate,
        slug: "mortgage-assistance",
        internalName: "Mortgage Assistance",
        category: "REAL_ESTATE" as const,
        version: 2,
        expectedDurationDays: 60,
      },
      cases: 4,
      active: true,
    },
    {
      template: {
        ...nieTemplate,
        slug: "property-purchase",
        internalName: "Property Purchase",
        category: "REAL_ESTATE" as const,
        version: 1,
        expectedDurationDays: 90,
      },
      cases: 4,
      active: true,
    },
  ];

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Services &amp; workflows</h1>
      </div>
      <p className={shell.pageLead}>
        Each service is a versioned template: its intake questions, required documents, stages,
        standard tasks, SLA rules and automations. Editing one creates a new version; cases already
        running keep the version they started on.
      </p>

      <div className={s.list}>
        {services.map(({ template, cases, active }) => (
          <div key={template.slug} className={s.row}>
            <div className={s.text}>
              <Eyebrow audience="staff">
                {template.category === "REAL_ESTATE" ? "Real estate" : "Services"}
              </Eyebrow>
              <div className={s.name}>{template.internalName}</div>
              <div className={s.meta}>
                <Mono size={12}>{template.slug}</Mono> · {template.stages.length} stages · normally{" "}
                {template.expectedDurationDays} days
              </div>
            </div>
            <div className={s.right}>
              <span className={s.count}>
                <Mono size={12.5}>{cases}</Mono> open
              </span>
              <Mono size={12} color="var(--ink-3)">
                v{template.version}
              </Mono>
              <StatusPill
                status={active ? "approved" : "required"}
                audience="staff"
                locale={locale}
                labelOverride={active ? "Live" : "Draft"}
              />
            </div>
          </div>
        ))}
      </div>

      <p className={s.note}>
        Only an admin may change a template. The stage list, document checklist and automation rules
        for each service are specified in the service workflow specification.
      </p>
    </div>
  );
}
