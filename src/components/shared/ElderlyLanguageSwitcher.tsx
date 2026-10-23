'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';

export const SENIOR_LANGUAGES = [
  { code: 'pt-BR', nativeLabel: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'es', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'fr', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'de', nativeLabel: 'Deutsch', flag: '🇩🇪' },
];

interface ElderlyLanguageSwitcherProps {
  caredPersonId?: string;
  className?: string;
  compact?: boolean;
}

export function ElderlyLanguageSwitcher({
  caredPersonId,
  className = '',
  compact = false,
}: ElderlyLanguageSwitcherProps) {
  const pathname = usePathname() || '/';
  const [saving, setSaving] = useState(false);

  // Extract current locale from pathname
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] || '';
  const isFirstSegmentLocale = SENIOR_LANGUAGES.some((l) => l.code === firstSegment);
  const currentLocale = isFirstSegmentLocale ? firstSegment : 'pt-BR';
  const currentLang = SENIOR_LANGUAGES.find((l) => l.code === currentLocale) || SENIOR_LANGUAGES[0];

  const handleSelectLanguage = async (newLocale: string) => {
    if (newLocale === currentLocale || saving) return;
    setSaving(true);

    try {
      // 1. Persist to database for this user / cared person
      await fetch('/api/users/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: newLocale,
          cared_person_id: caredPersonId,
        }),
      }).catch(() => {});

      // 2. Set NEXT_LOCALE cookie for next-intl SSR & middleware
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

      // 3. Compute destination URL keeping current path segments
      const remainingSegments = isFirstSegmentLocale ? segments.slice(1) : segments;
      const targetPath = `/${newLocale}${remainingSegments.length > 0 ? `/${remainingSegments.join('/')}` : ''}`;

      // 4. Navigate with window.location to force fresh SSR and translation reload
      window.location.href = targetPath;
    } catch {
      setSaving(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={saving}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs transition-all active:scale-95 text-stone-800 dark:text-stone-100 font-bold ${
            compact ? 'h-10 text-xs' : 'h-11 sm:h-12 text-sm'
          } ${className}`}
          title="Alterar Idioma / Change Language"
          aria-label="Selecionar Idioma"
        >
          <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-sm sm:text-base leading-none">{currentLang.flag}</span>
          <span className="hidden sm:inline font-bold truncate max-w-[110px]">{currentLang.nativeLabel}</span>
          <span className="sm:hidden font-extrabold uppercase text-xs">{currentLang.code.split('-')[0]}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 p-2 rounded-3xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 shadow-2xl z-50 animate-in fade-in zoom-in-95"
      >
        <div className="px-3 py-2 text-xs font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          Escolha seu idioma
        </div>

        <div className="py-1 space-y-1">
          {SENIOR_LANGUAGES.map((lang) => {
            const isSelected = currentLocale === lang.code;
            return (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{lang.flag}</span>
                  <span className="text-sm font-extrabold">{lang.nativeLabel}</span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
