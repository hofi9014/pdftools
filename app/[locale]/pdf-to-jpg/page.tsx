import { redirect } from 'next/navigation';
import { locales } from '@/lib/i18n';
export default async function LocalePdfToJpgRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = (locales as readonly string[]).includes(locale) ? locale : 'en';
  redirect(`/${l}/pdf-to-images`);
}
