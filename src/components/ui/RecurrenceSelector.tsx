'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { normalizeLocale, SupportedLocale } from '@/lib/i18n/care-translations';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface RecurrenceConfig {
  type: RecurrenceType;
  /** Days of week for weekly (0=Sun..6=Sat) */
  weekDays?: number[];
  /** Interval in days when type === 'custom' */
  customDays?: number;
  /** End date (ISO date string), optional */
  endDate?: string;
}

interface RecurrenceSelectorProps {
  value: RecurrenceConfig;
  onChange: (value: RecurrenceConfig) => void;
  locale?: string;
}

interface RecurrenceI18n {
  label: string;
  none: string;
  daily: string;
  weekly: string;
  biweekly: string;
  monthly: string;
  custom: string;
  repeatDays: string;
  repeatEvery: string;
  days: string;
  endsOn: string;
  weekDays: { label: string; full: string; value: number }[];
  weeklyPrefix: string;
  everyXDays: (days: number) => string;
}

const DICTIONARY: Record<SupportedLocale, RecurrenceI18n> = {
  'pt-BR': {
    label: 'Repetição',
    none: '🚫 Sem repetição',
    daily: '📅 Todos os dias',
    weekly: '📆 Semanalmente (escolher dias)',
    biweekly: '🔁 A cada 15 dias',
    monthly: '📅 Mensalmente',
    custom: '⚙️ Personalizado (intervalo em dias)',
    repeatDays: 'Repetir nos dias:',
    repeatEvery: 'Repetir a cada',
    days: 'dias',
    endsOn: 'Termina em (opcional):',
    weekDays: [
      { label: 'D', full: 'Dom', value: 0 },
      { label: 'S', full: 'Seg', value: 1 },
      { label: 'T', full: 'Ter', value: 2 },
      { label: 'Q', full: 'Qua', value: 3 },
      { label: 'Q', full: 'Qui', value: 4 },
      { label: 'S', full: 'Sex', value: 5 },
      { label: 'S', full: 'Sáb', value: 6 },
    ],
    weeklyPrefix: 'Semanalmente',
    everyXDays: (d) => `A cada ${d} dias`,
  },
  en: {
    label: 'Recurrence',
    none: '🚫 Do not repeat',
    daily: '📅 Every day',
    weekly: '📆 Weekly (select days)',
    biweekly: '🔁 Every 15 days',
    monthly: '📅 Monthly',
    custom: '⚙️ Custom (interval in days)',
    repeatDays: 'Repeat on days:',
    repeatEvery: 'Repeat every',
    days: 'days',
    endsOn: 'Ends on (optional):',
    weekDays: [
      { label: 'S', full: 'Sun', value: 0 },
      { label: 'M', full: 'Mon', value: 1 },
      { label: 'T', full: 'Tue', value: 2 },
      { label: 'W', full: 'Wed', value: 3 },
      { label: 'T', full: 'Thu', value: 4 },
      { label: 'F', full: 'Fri', value: 5 },
      { label: 'S', full: 'Sat', value: 6 },
    ],
    weeklyPrefix: 'Weekly',
    everyXDays: (d) => `Every ${d} days`,
  },
  es: {
    label: 'Repetición',
    none: '🚫 Sin repetición',
    daily: '📅 Todos los días',
    weekly: '📆 Semanalmente (elegir días)',
    biweekly: '🔁 Cada 15 días',
    monthly: '📅 Mensualmente',
    custom: '⚙️ Personalizado (intervalo en días)',
    repeatDays: 'Repetir los días:',
    repeatEvery: 'Repetir cada',
    days: 'días',
    endsOn: 'Termina el (opcional):',
    weekDays: [
      { label: 'D', full: 'Dom', value: 0 },
      { label: 'L', full: 'Lun', value: 1 },
      { label: 'M', full: 'Mar', value: 2 },
      { label: 'M', full: 'Mié', value: 3 },
      { label: 'J', full: 'Jue', value: 4 },
      { label: 'V', full: 'Vie', value: 5 },
      { label: 'S', full: 'Sáb', value: 6 },
    ],
    weeklyPrefix: 'Semanalmente',
    everyXDays: (d) => `Cada ${d} días`,
  },
  fr: {
    label: 'Répétition',
    none: '🚫 Ne pas répéter',
    daily: '📅 Tous les jours',
    weekly: '📆 Chaque semaine (choisir les jours)',
    biweekly: '🔁 Tous les 15 jours',
    monthly: '📅 Tous les mois',
    custom: '⚙️ Personnalisé (intervalle en jours)',
    repeatDays: 'Répéter les jours :',
    repeatEvery: 'Répéter tous les',
    days: 'jours',
    endsOn: 'Se termine le (optionnel) :',
    weekDays: [
      { label: 'D', full: 'Dim', value: 0 },
      { label: 'L', full: 'Lun', value: 1 },
      { label: 'M', full: 'Mar', value: 2 },
      { label: 'M', full: 'Mer', value: 3 },
      { label: 'J', full: 'Jeu', value: 4 },
      { label: 'V', full: 'Ven', value: 5 },
      { label: 'S', full: 'Sam', value: 6 },
    ],
    weeklyPrefix: 'Chaque semaine',
    everyXDays: (d) => `Tous les ${d} jours`,
  },
  de: {
    label: 'Wiederholung',
    none: '🚫 Nicht wiederholen',
    daily: '📅 Jeden Tag',
    weekly: '📆 Wöchentlich (Tage auswählen)',
    biweekly: '🔁 Alle 15 Tage',
    monthly: '📅 Monatlich',
    custom: '⚙️ Benutzerdefiniert (Intervall in Tagen)',
    repeatDays: 'Wiederholen an Tagen:',
    repeatEvery: 'Wiederholen alle',
    days: 'Tage',
    endsOn: 'Endet am (optional):',
    weekDays: [
      { label: 'S', full: 'So', value: 0 },
      { label: 'M', full: 'Mo', value: 1 },
      { label: 'D', full: 'Di', value: 2 },
      { label: 'M', full: 'Mi', value: 3 },
      { label: 'D', full: 'Do', value: 4 },
      { label: 'F', full: 'Fr', value: 5 },
      { label: 'S', full: 'Sa', value: 6 },
    ],
    weeklyPrefix: 'Wöchentlich',
    everyXDays: (d) => `Alle ${d} Tage`,
  },
};

export function recurrenceLabel(cfg: RecurrenceConfig, rawLocale?: string): string {
  const loc = normalizeLocale(rawLocale);
  const dict = DICTIONARY[loc] || DICTIONARY['pt-BR'];

  switch (cfg.type) {
    case 'none': return dict.none.replace(/^[^\w]+/, '');
    case 'daily': return dict.daily.replace(/^[^\w]+/, '');
    case 'weekly': {
      if (!cfg.weekDays || cfg.weekDays.length === 0) return dict.weeklyPrefix;
      const names = dict.weekDays.map(d => d.full);
      return `${dict.weeklyPrefix}: ${cfg.weekDays.sort().map(d => names[d]).join(', ')}`;
    }
    case 'biweekly': return dict.biweekly.replace(/^[^\w]+/, '');
    case 'monthly': return dict.monthly.replace(/^[^\w]+/, '');
    case 'custom': return dict.everyXDays(cfg.customDays || 2);
    default: return '';
  }
}

export default function RecurrenceSelector({ value, onChange, locale }: RecurrenceSelectorProps) {
  const params = useParams();
  const activeLocale = normalizeLocale(locale || (params?.locale as string));
  const dict = DICTIONARY[activeLocale] || DICTIONARY['pt-BR'];

  const toggleDay = (day: number) => {
    const current = value.weekDays || [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    onChange({ ...value, weekDays: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-stone-400" />
        <Label className="text-sm font-medium">{dict.label}</Label>
        {value.type !== 'none' && (
          <Badge className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">
            {recurrenceLabel(value, activeLocale)}
          </Badge>
        )}
      </div>

      {/* Frequency selector */}
      <Select
        value={value.type}
        onValueChange={(val) =>
          onChange({
            type: val as RecurrenceType,
            weekDays: val === 'weekly' ? [1, 2, 3, 4, 5] : undefined,
            customDays: val === 'custom' ? 2 : undefined,
            endDate: value.endDate,
          })
        }
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder={dict.none} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{dict.none}</SelectItem>
          <SelectItem value="daily">{dict.daily}</SelectItem>
          <SelectItem value="weekly">{dict.weekly}</SelectItem>
          <SelectItem value="biweekly">{dict.biweekly}</SelectItem>
          <SelectItem value="monthly">{dict.monthly}</SelectItem>
          <SelectItem value="custom">{dict.custom}</SelectItem>
        </SelectContent>
      </Select>

      {/* Weekly day picker */}
      {value.type === 'weekly' && (
        <div className="space-y-1.5">
          <p className="text-xs text-stone-500 dark:text-stone-400">{dict.repeatDays}</p>
          <div className="flex gap-1.5">
            {dict.weekDays.map((d) => {
              const active = (value.weekDays || []).includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  title={d.full}
                  onClick={() => toggleDay(d.value)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${
                    active
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-teal-400'
                  }`}
                >
                  {d.full.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom interval */}
      {value.type === 'custom' && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{dict.repeatEvery}</p>
          <Input
            type="number"
            min={1}
            max={365}
            className="w-20 h-8 text-sm"
            value={value.customDays ?? 2}
            onChange={(e) => onChange({ ...value, customDays: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">{dict.days}</p>
        </div>
      )}

      {/* End date (optional, shown whenever there's recurrence) */}
      {value.type !== 'none' && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{dict.endsOn}</p>
          <Input
            type="date"
            className="h-8 text-sm flex-1"
            value={value.endDate || ''}
            onChange={(e) => onChange({ ...value, endDate: e.target.value || undefined })}
          />
        </div>
      )}
    </div>
  );
}
