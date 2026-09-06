'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const LANGUAGES = [
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
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
          variant="ghost" 
          size="sm" 
          className={`rounded-xl px-2.5 h-9 gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 ${className || ''}`}
        >
          <span className="text-base">{currentLang.flag}</span>
          <span className="hidden sm:inline uppercase">{currentLang.code.split('-')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border-stone-200 dark:border-stone-800 dark:bg-stone-900">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelectLanguage(lang.code)}
            className={`flex items-center gap-2.5 text-xs py-2 px-3 cursor-pointer rounded-lg ${
              currentLocale === lang.code ? 'font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : ''
            }`}
          >
            <span className="text-base">{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
