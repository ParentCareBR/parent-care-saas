'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ 
  className,
  showLabel = false 
}: { 
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`touch-manipulation flex items-center justify-center gap-2 rounded-xl min-w-[40px] min-h-[40px] h-10 w-10 sm:h-9 sm:w-9 bg-stone-100 hover:bg-stone-200 dark:bg-[#16253C] dark:hover:bg-[#1E3555] border border-stone-200/90 dark:border-[#243B5C] text-stone-700 dark:text-stone-200 shadow-2xs active:scale-95 transition-all ${className || ''}`}
      title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      aria-label="Alternar entre modo claro e escuro"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 fill-amber-400/20 shrink-0" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 fill-indigo-500/10 shrink-0" />
      )}
      {showLabel && (
        <span className="text-xs font-bold leading-none">
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      )}
      <span className="sr-only">Alternar tema</span>
    </button>
  );
}
