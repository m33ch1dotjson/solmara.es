import { notFound } from "next/navigation";
import { PropertyDetail } from "@/components/staff/PropertyDetail";
import { staffOrRedirect } from "@/lib/auth/session";
import { copy, formatDateFor } from "@/lib/i18n";
import { currentDatePrefs, currentLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { getProperty } from "@/lib/queries";
import { BUCKET_PROPERTY_PHOTOS, signedUrl } from "@/lib/storage";

/*
 * One property, as a listing rather than a form: photographs, the asking price, the
 * facts, and the text somebody wrote about it. Read-only until Edit is pressed —
 * the same shape as a Process Guide, which is what was asked for.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [actor, locale] = await Promise.all([staffOrRedirect(), currentLocale()]);
  const { id } = await params;
  const found = await getProperty(actor, id);
  return { title: found?.record.title ?? copy(locale).properties.title };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const [actor, locale, dates] = await Promise.all([
    staffOrRedirect(),
    currentLocale(),
    currentDatePrefs(),
  ]);
  const { id } = await params;

  const found = await getProperty(actor, id);
  if (!found) notFound();

  const { record, photos } = found;

  const withUrls = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      url: await signedUrl(BUCKET_PROPERTY_PHOTOS, photo.storageKey),
    })),
  );

  return (
    <PropertyDetail
      id={record.id}
      title={record.title}
      address={record.address}
      description={record.description}
      price={record.priceCents === null ? "" : formatMoney(record.priceCents, locale)}
      // The field wants the number, not the formatted string: typing into a box that
      // already says "€ 320.000,00" is how a price gains a stray character.
      priceInput={record.priceCents === null ? "" : (record.priceCents / 100).toFixed(0)}
      bedrooms={record.bedrooms === null ? "" : String(record.bedrooms)}
      bathrooms={record.bathrooms === null ? "" : String(record.bathrooms)}
      areaM2={record.areaM2 === null ? "" : String(record.areaM2)}
      added={formatDateFor(record.createdAt, locale, dates)}
      photos={withUrls.filter((photo): photo is { id: string; url: string } => photo.url !== null)}
    />
  );
}
