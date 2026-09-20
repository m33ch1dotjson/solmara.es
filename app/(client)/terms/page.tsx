import { LegalPage } from "@/components/client/LegalPage";
import { copy } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";

export async function generateMetadata() {
  return { title: copy(await currentLocale()).legal.termsTitle };
}

export default async function TermsPage() {
  const t = copy(await currentLocale());
  return <LegalPage title={t.legal.termsTitle} body={t.legal.comingSoon} back={t.legal.back} />;
}
