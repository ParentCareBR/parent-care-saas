import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt-BR', 'en', 'en-GB', 'es', 'fr', 'de'],
  defaultLocale: 'pt-BR',
  localeDetection: false,
});
