import { staffOrRedirect } from "@/lib/auth/session";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import shell from "../staff.module.css";
import s from "./tasks.module.css";

/*
 * A placeholder, and it says so on the screen.
 *
 * The tab was asked for; the feature behind it was not built, and there is no task
 * table in the database yet. A tab that 404s is worse than a tab that explains
 * itself, and a screen faking empty state would have people waiting for tasks that
 * can never arrive.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).tasksPage.title };
}

export default async function TasksPage() {
  const [, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const t = copy(locale);

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.tasksPage.title}</h1>
      </div>
      <p className={shell.pageLead}>{t.tasksPage.lead}</p>

      <div className={s.soon}>
        <p className={s.soonTitle}>{t.tasksPage.notYet}</p>
        <p className={s.soonBody}>{t.tasksPage.notYetBody}</p>
      </div>
    </div>
  );
}
