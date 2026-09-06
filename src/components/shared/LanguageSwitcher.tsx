'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en', label: 'English (US)', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from pathname
  const segments = pathname.split('/').filter(Boolean);
  const currentLocale = segments[0] || 'pt-BR';
  const currentLang = LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0];

  const handleSelectLanguage = (newLocale: string) => {
    if (newLocale === currentLocale) return;
    const remainingPath = segments.slice(1).join('/');
    const newPath = `/${newLocale}${remainingPath ? `/${remainingPath}` : ''}`;
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`rounded-xl px-2 sm:px-2.5 h-8 sm:h-9 gap-1 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-2xs ${className || ''}`}
          title="Alterar Idioma / Switch Language"
        >
          <span className="text-sm sm:text-base leading-none">{currentLang.flag}</span>
          <span className="uppercase text-[11px] font-bold tracking-tight">{currentLang.code.split('-')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border-stone-200 dark:border-stone-800 dark:bg-stone-900 shadow-lg min-w-[170px] z-50">
        <div className="px-2.5 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800 mb-1">
          Selecionar Idioma
        </div>
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelectLanguage(lang.code)}
            className={`flex items-center justify-between text-xs py-2 px-2.5 cursor-pointer rounded-lg my-0.5 ${
              currentLocale === lang.code 
                ? 'font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' 
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </div>
            {currentLocale === lang.code && (
              <span className="text-[10px] text-emerald-600 font-bold">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
