'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import type { Tables } from '@/types';

type CaredPerson = Tables<'cared_people'>;

interface CaredPersonContextValue {
  caredPeople: CaredPerson[];
  selectedPersonId: string | null;
  selectedPerson: CaredPerson | null;
  setSelectedPersonId: (id: string) => void;
  loading: boolean;
  refreshCaredPeople: () => Promise<void>;
}

const CaredPersonContext = createContext<CaredPersonContextValue | undefined>(undefined);

export function CaredPersonProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { currentOrganizationId } = useAuth();
  const [caredPeople, setCaredPeople] = useState<CaredPerson[]>([]);
  const [selectedPersonIdState, setSelectedPersonIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCaredPeople = useCallback(async () => {
    if (!currentOrganizationId) {
      setCaredPeople([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('cared_people')
      .select('*')
      .eq('organization_id', currentOrganizationId);

    if (data) {
      setCaredPeople(data as CaredPerson[]);
      
      const savedId = localStorage.getItem(`parentcare_person_${currentOrganizationId}`);
      if (savedId && data.some(p => p.id === savedId)) {
        setSelectedPersonIdState(savedId);
      } else if (data.length > 0) {
        setSelectedPersonIdState(data[0].id);
      } else {
        setSelectedPersonIdState(null);
      }
    }
    setLoading(false);
  }, [currentOrganizationId, supabase]);

  useEffect(() => {
    fetchCaredPeople();
  }, [fetchCaredPeople]);

  const setSelectedPersonId = useCallback((id: string) => {
    setSelectedPersonIdState(id);
    if (currentOrganizationId) {
      localStorage.setItem(`parentcare_person_${currentOrganizationId}`, id);
    }
  }, [currentOrganizationId]);

  const selectedPerson = caredPeople.find(p => p.id === selectedPersonIdState) || null;

  return (
    <CaredPersonContext.Provider
      value={{
        caredPeople,
        selectedPersonId: selectedPersonIdState,
        selectedPerson,
        setSelectedPersonId,
        loading,
        refreshCaredPeople: fetchCaredPeople,
      }}
    >
      {children}
    </CaredPersonContext.Provider>
  );
}

export function useCaredPerson(): CaredPersonContextValue {
  const ctx = useContext(CaredPersonContext);
  if (!ctx) throw new Error('useCaredPerson must be used within CaredPersonProvider');
  return ctx;
}
