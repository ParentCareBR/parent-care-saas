'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

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
}

const WEEK_DAYS = [
  { label: 'D', full: 'Dom', value: 0 },
  { label: 'S', full: 'Seg', value: 1 },
  { label: 'T', full: 'Ter', value: 2 },
  { label: 'Q', full: 'Qua', value: 3 },
  { label: 'Q', full: 'Qui', value: 4 },
  { label: 'S', full: 'Sex', value: 5 },
  { label: 'S', full: 'Sáb', value: 6 },
];

export function recurrenceLabel(cfg: RecurrenceConfig): string {
  switch (cfg.type) {
    case 'none': return 'Sem repetição';
    case 'daily': return 'Todos os dias';
    case 'weekly': {
      if (!cfg.weekDays || cfg.weekDays.length === 0) return 'Semanalmente';
      const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return `Semanalmente: ${cfg.weekDays.sort().map(d => names[d]).join(', ')}`;
    }
    case 'biweekly': return 'A cada 15 dias';
    case 'monthly': return 'Mensalmente';
    case 'custom': return `A cada ${cfg.customDays || 2} dias`;
    default: return '';
  }
}

export default function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const toggleDay = (day: number) => {
    const current = value.weekDays || [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    onChange({ ...value, weekDays: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-stone-400" />
        <Label className="text-sm font-medium">Repetição</Label>
        {value.type !== 'none' && (
          <Badge className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">
            {recurrenceLabel(value)}
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
          <SelectValue placeholder="Sem repetição" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">🚫 Sem repetição</SelectItem>
          <SelectItem value="daily">📅 Todos os dias</SelectItem>
          <SelectItem value="weekly">📆 Semanalmente (escolher dias)</SelectItem>
          <SelectItem value="biweekly">🔁 A cada 15 dias</SelectItem>
          <SelectItem value="monthly">📅 Mensalmente</SelectItem>
          <SelectItem value="custom">⚙️ Personalizado (intervalo em dias)</SelectItem>
        </SelectContent>
      </Select>

      {/* Weekly day picker */}
      {value.type === 'weekly' && (
        <div className="space-y-1.5">
          <p className="text-xs text-stone-500 dark:text-stone-400">Repetir nos dias:</p>
          <div className="flex gap-1.5">
            {WEEK_DAYS.map((d) => {
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
          <p className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">Repetir a cada</p>
          <Input
            type="number"
            min={1}
            max={365}
            className="w-20 h-8 text-sm"
            value={value.customDays ?? 2}
            onChange={(e) => onChange({ ...value, customDays: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">dias</p>
        </div>
      )}

      {/* End date (optional, shown whenever there's recurrence) */}
      {value.type !== 'none' && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">Termina em (opcional):</p>
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
