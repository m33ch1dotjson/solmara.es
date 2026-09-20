import { notFound } from "next/navigation";
import { GuideDocument } from "@/components/staff/GuideDocument";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { getGuide } from "@/lib/queries";

/*
 * One guide, as a document.
 *
 * Read-only unless ?edit=1, so that opening something to look up a step cannot
 * become editing it by accident. ?print=1 opens the browser's print dialog on
 * arrival, which is what the ••• menu's Print / PDF points at.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const { id } = await params;
  const found = await getGuide(actor, id);
  return { title: found?.record.title ?? copy(locale).guides.title };
}

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; print?: string }>;
}) {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const { id } = await params;
  const query = await searchParams;

  const found = await getGuide(actor, id);
  if (!found) notFound();

  const { record, files } = found;

  return (
    <GuideDocument
      id={record.id}
      title={record.title}
      category={record.category}
      content={record.content}
      updated={formatDateFor(record.updatedAt, locale, dates)}
      attachments={files
        .filter((file) => file.kind === "ATTACHMENT")
        .map((file) => ({
          id: file.id,
          filename: file.filename,
          sizeBytes: file.sizeBytes,
        }))}
      startInEdit={query.edit === "1"}
      printOnOpen={query.print === "1"}
    />
  );
}
