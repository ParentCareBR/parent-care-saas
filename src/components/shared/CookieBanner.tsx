'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const t = useTranslations('CookieBanner');

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-gray-200 dark:border-stone-800 shadow-lg p-4 z-50 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-gray-700 dark:text-stone-300 flex-1">
        {t('text')}{' '}
        <Link href={`/${locale}/legal/privacy`} className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
          {t('privacy')}
        </Link>
        {t('and')}
        <Link href={`/${locale}/legal/terms`} className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
          {t('terms')}
        </Link>.
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          onClick={handleDecline}
          className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-stone-700 rounded-md text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors text-sm font-medium"
        >
          {t('decline')}
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          {t('accept')}
        </button>
      </div>
    </div>
  );
}
