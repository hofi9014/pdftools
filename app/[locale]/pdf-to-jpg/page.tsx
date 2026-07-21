import { redirect } from 'next/navigation';
import { locales } from '@/lib/i18n';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/i18n-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata(locale, '/pdf-to-jpg');
}

export default async function LocalePdfToJpgRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = (locales as readonly string[]).includes(locale) ? locale : 'en';
  redirect(`/${l}/pdf-to-images`);
}

