import { GuideList } from "@/components/staff/GuideList";
import { NewGuideButton } from "@/components/staff/NewGuideButton";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { listGuides } from "@/lib/queries";
import { guidePreview } from "@/lib/sanitize";
import shell from "../staff.module.css";

/*
 * The handbook's front page: every guide as a card, with search and category
 * filters above them.
 *
 * The filtering happens in the browser over the whole list. There are tens of these,
 * not thousands, and a search that answers while you type beats one that is correct
 * about a round trip. When this list grows past a few hundred, move the filter into
 * the query and nothing above the component changes.
 */

export async function generateMetadata() {
  return { title: copy(await currentLocale()).guides.title };
}

export default async function ProcessGuidePage() {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const guides = await listGuides(actor);
  const t = copy(locale);

  // The preview and the date are computed here: the list component stays a filter
  // and a grid, with no opinion about how a guide is summarised or a date is written.
  const cards = guides.map((guide) => ({
    id: guide.id,
    title: guide.title,
    category: guide.category,
    preview: guidePreview(guide.content),
    updated: formatDateFor(guide.updatedAt, locale, dates),
    // What search reads. Built server-side so the browser never holds the full text
    // of every guide just to search it.
    haystack: `${guide.title} ${guidePreview(guide.content, 2000)}`.toLowerCase(),
  }));

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>{t.guides.title}</h1>
        <NewGuideButton />
      </div>
      <p className={shell.pageLead}>{t.guides.lead}</p>

      <GuideList cards={cards} />
    </div>
  );
}
