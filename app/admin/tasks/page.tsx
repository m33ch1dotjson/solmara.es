import { TaskList } from "@/components/staff/TaskList";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { listClients, listTeam } from "@/lib/queries";
import { listTasks } from "@/lib/tasks";
import shell from "../staff.module.css";

/*
 * The to-do list.
 *
 * One line per task with the detail folded up behind it — shorter than a Process
 * Guide on purpose, because most tasks are a sentence and a deadline. Ticked tasks
 * stay in the list; see lib/tasks.ts for why.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).tasksPage.title };
}

export default async function TasksPage() {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const t = copy(locale);

  const [tasks, team, clients] = await Promise.all([
    listTasks(actor),
    listTeam(actor),
    listClients(actor),
  ]);

  // "Overdue" is a question about today, not a stored fact — the same rule as an
  // unpaid invoice, so the two screens cannot disagree about what late means.
  const today = new Date().toISOString().slice(0, 10);

  const rows = tasks.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    done: row.done,
    dueDate: row.dueDate ?? "",
    due: row.dueDate ? formatDateFor(row.dueDate, locale, dates) : "",
    overdue: Boolean(row.dueDate && row.dueDate < today),
    assignedTo: row.assignedTo ?? "",
    assigneeName: row.assigneeName ?? "",
    clientId: row.clientId ?? "",
    clientName: row.clientName ?? "",
    doneOn: row.doneAt ? formatDateFor(row.doneAt, locale, dates) : "",
  }));

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.tasksPage.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.tasksPage.lead}</p>

      <TaskList
        rows={rows}
        staff={team
          .filter((member) => member.active)
          .map((member) => ({ id: member.id, name: member.name }))}
        clients={clients.map((row) => ({ id: row.id, name: row.name }))}
      />
    </div>
  );
}
