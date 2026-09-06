import { getRequestConfig } from 'next-intl/server';
import { routing } from './src/i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  let messages;
  switch (locale) {
    case 'en':
      messages = (await import('./messages/en.json')).default;
      break;
    case 'es':
      messages = (await import('./messages/es.json')).default;
      break;
    case 'fr':
      messages = (await import('./messages/fr.json')).default;
      break;
    case 'de':
      messages = (await import('./messages/de.json')).default;
      break;
    case 'pt-BR':
    default:
      messages = (await import('./messages/pt-BR.json')).default;
      break;
  }

  return {
    locale,
    messages
  };
});
