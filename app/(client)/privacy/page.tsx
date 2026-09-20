import { LegalPage } from "@/components/client/LegalPage";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";

export async function generateMetadata() {
  return { title: copy(await currentLocale()).legal.privacyTitle };
}

export default async function PrivacyPage() {
  const t = copy(await currentLocale());
  return <LegalPage title={t.legal.privacyTitle} body={t.legal.comingSoon} back={t.legal.back} />;
}
