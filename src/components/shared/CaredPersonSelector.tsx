'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User } from 'lucide-react';

export function CaredPersonSelector() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] || 'pt-BR';

  const { caredPeople, selectedPersonId, setSelectedPersonId, loading, selectedPerson } = useCaredPerson();

  if (loading) {
    return <div className="h-10 w-full bg-stone-200 dark:bg-stone-800 animate-pulse rounded-xl" />;
  }

  if (caredPeople.length === 0) {
    return (
      <Link
        href={`/${locale}/dashboard/cared-people/new`}
        className="inline-flex items-center gap-1.5 text-xs text-brand-green font-semibold hover:underline"
      >
        + Cadastrar pessoa
      </Link>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      <Select value={selectedPersonId || undefined} onValueChange={setSelectedPersonId}>
        <SelectTrigger className="w-full bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 focus:ring-brand-green truncate text-xs sm:text-sm rounded-xl h-10 shadow-xs">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent className="max-w-[320px]">
          {caredPeople.map((person) => {
            const displayName = person.preferred_name || person.nickname || person.full_name;
            const photo = person.photo_url || person.avatar_url;
            return (
              <SelectItem key={person.id} value={person.id} className="py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7 ring-1 ring-stone-200 dark:ring-stone-700">
                    <AvatarImage src={photo || undefined} alt={displayName} />
                    <AvatarFallback className="text-xs bg-brand-soft dark:bg-emerald-950/60 text-brand-green dark:text-emerald-300 font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs sm:text-sm leading-tight">
                        {displayName}
                      </span>
                      {person.relationship && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                          {person.relationship}
                        </Badge>
                      )}
                    </div>
                    {displayName !== person.full_name && (
                      <span className="text-[10px] text-stone-400 truncate max-w-[170px]">
                        {person.full_name}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {selectedPerson && (
        <div className="flex items-center justify-between px-1 text-[11px]">
          <Link
            href={`/${locale}/dashboard/cared-people/${selectedPerson.id}`}
            className="text-stone-500 hover:text-brand-green dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <User className="h-3 w-3" /> Ver perfil completo
          </Link>
          <Link
            href={`/${locale}/care/${selectedPerson.id}`}
            target="_blank"
            className="text-brand-green dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
            title="Abrir tela simplificada para o idoso"
          >
            Tela Idoso <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
