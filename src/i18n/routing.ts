import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt-BR', 'en', 'es', 'fr', 'de'],
  defaultLocale: 'pt-BR',
  localeDetection: true,
});
