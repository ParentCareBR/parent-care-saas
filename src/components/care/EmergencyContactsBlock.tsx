'use client';

import React from 'react';
import { Phone, AlertTriangle, ShieldAlert, User } from 'lucide-react';
import { formatContactNameWithRelationship } from '@/lib/i18n/relationship-translations';

interface PersonalContact {
  id?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  is_primary?: boolean;
}

interface EmergencyContactsBlockProps {
  locale?: string;
  personalContacts?: PersonalContact[];
}

interface PublicService {
  name: string;
  number: string;
  description: string;
  icon: string;
}

function getPublicServices(locale: string): PublicService[] {
  const norm = locale.startsWith('pt') ? 'pt-BR' : locale.split('-')[0];

  switch (norm) {
    case 'en':
      return [
        { name: 'Emergency', number: '911', description: 'Ambulance, Fire & Police', icon: '🚨' },
      ];
    case 'es':
      return [
        { name: 'Emergencias', number: '112', description: 'Ambulancia, Bomberos y Policía', icon: '🚨' },
      ];
    case 'fr':
      return [
        { name: 'Urgences', number: '112', description: 'Ambulance, Pompiers et Police', icon: '🚨' },
      ];
    case 'de':
      return [
        { name: 'Notruf', number: '112', description: 'Krankenwagen, Feuerwehr & Polizei', icon: '🚨' },
      ];
    case 'pt-BR':
    default:
      return [
        { name: 'SAMU', number: '192', description: 'Ambulância / Emergência Médica', icon: '🚑' },
        { name: 'Bombeiros', number: '193', description: 'Resgate e Salvamento', icon: '🚒' },
        { name: 'Polícia', number: '190', description: 'Emergência Policial', icon: '🚓' },
      ];
  }
}

const TITLES_BY_LOCALE: Record<string, { title: string; subtitle: string; callLabel: string; personalLabel: string }> = {
  'pt-BR': {
    title: 'Contatos de Emergência',
    subtitle: 'Toque para ligar imediatamente',
    callLabel: 'Ligar',
    personalLabel: 'Contatos da Família',
  },
  'en': {
    title: 'Emergency Contacts',
    subtitle: 'Tap to call immediately',
    callLabel: 'Call',
    personalLabel: 'Family Contacts',
  },
  'es': {
    title: 'Contactos de Emergencia',
    subtitle: 'Toque para llamar inmediatamente',
    callLabel: 'Llamar',
    personalLabel: 'Contactos de la Familia',
  },
  'fr': {
    title: 'Contacts d’Urgence',
    subtitle: 'Touchez pour appeler immédiatement',
    callLabel: 'Appeler',
    personalLabel: 'Contacts de la Famille',
  },
  'de': {
    title: 'Notfallkontakte',
    subtitle: 'Tippen für sofortigen Anruf',
    callLabel: 'Anrufen',
    personalLabel: 'Familienkontakte',
  },
};

export function EmergencyContactsBlock({ locale = 'pt-BR', personalContacts = [] }: EmergencyContactsBlockProps) {
  const norm = locale.startsWith('pt') ? 'pt-BR' : locale.split('-')[0];
  const t = TITLES_BY_LOCALE[norm] || TITLES_BY_LOCALE['pt-BR'];
  const services = getPublicServices(norm);

  const validPersonal = personalContacts.filter((c) => Boolean(c.phone));

  return (
    <div className="bg-red-50/90 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900/60 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center text-lg shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-red-900 dark:text-red-200">
            {t.title}
          </h3>
        </div>
        <span className="text-[11px] font-bold text-red-700 dark:text-red-300 bg-red-100/80 dark:bg-red-900/40 px-2 py-0.5 rounded-full">
          {t.subtitle}
        </span>
      </div>

      {/* Public Emergency Numbers */}
      <div className={`grid gap-2 ${services.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {services.map((srv) => (
          <a
            key={srv.number}
            href={`tel:${srv.number}`}
            className="bg-white dark:bg-stone-900 border-2 border-red-200 dark:border-red-800/60 hover:border-red-500 p-3 rounded-2xl flex flex-col items-center text-center gap-1 active:scale-95 transition-all shadow-2xs group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{srv.icon}</span>
            <span className="text-xs font-black text-red-700 dark:text-red-400 leading-tight">
              {srv.name}
            </span>
            <span className="text-xl font-black text-stone-900 dark:text-stone-100 leading-none">
              {srv.number}
            </span>
            <span className="text-[10px] font-semibold text-stone-500 leading-tight truncate max-w-full">
              {srv.description}
            </span>
          </a>
        ))}
      </div>

      {/* Personal Family Contacts if configured */}
      {validPersonal.length > 0 && (
        <div className="pt-2 border-t border-red-200 dark:border-red-900/60 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-800 dark:text-red-300 block">
            {t.personalLabel}
          </span>
          <div className="space-y-1.5">
            {validPersonal.map((contact, idx) => (
              <a
                key={contact.id || idx}
                href={`tel:${contact.phone?.replace(/\D/g, '')}`}
                className="bg-white dark:bg-stone-900 border border-red-200 dark:border-red-800/60 hover:border-red-400 p-2.5 rounded-2xl flex items-center justify-between gap-3 active:scale-98 transition shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-stone-900 dark:text-stone-100 truncate">
                      {formatContactNameWithRelationship(contact.name, contact.relationship, norm)}
                    </p>
                    <p className="text-[11px] font-bold text-red-700 dark:text-red-400 truncate">
                      {contact.phone}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1 shadow-2xs">
                  <Phone className="h-3 w-3" />
                  {t.callLabel}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
