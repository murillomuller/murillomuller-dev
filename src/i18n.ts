import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['pt-BR', 'en'];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as string)) notFound();

  return {
    locale: locale as string,
    messages: {}
  };
});
