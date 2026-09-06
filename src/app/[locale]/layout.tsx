import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Parent Care — Cuidar de quem sempre cuidou de você',
  description: 'Plataforma para famílias organizarem o cuidado de pais idosos',
};

export const viewport: Viewport = {
  themeColor: '#1e7a5f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Fallback to empty messages if not found, avoiding build errors
  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    messages = {};
  }

  return (
    <html lang={locale} className="h-full">
      <body className={`${inter.className} h-full bg-stone-50 text-stone-900 antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
