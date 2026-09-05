'use client';

import React from 'react';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function CaredPersonSelector() {
  const { caredPeople, selectedPersonId, setSelectedPersonId, loading } = useCaredPerson();

  if (loading) {
    return <div className="h-10 w-48 bg-stone-200 animate-pulse rounded-md" />;
  }

  if (caredPeople.length === 0) {
    return <div className="text-sm text-stone-500">Nenhuma pessoa cuidada</div>;
  }

  return (
    <Select value={selectedPersonId || undefined} onValueChange={setSelectedPersonId}>
      <SelectTrigger className="w-[240px] bg-white border-stone-200 focus:ring-brand-green">
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>
      <SelectContent>
        {caredPeople.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={person.photo_url || undefined} alt={person.full_name} />
                <AvatarFallback className="text-xs bg-brand-soft text-brand-green">
                  {person.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-stone-900">{person.full_name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
