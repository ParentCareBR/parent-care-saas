'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

export interface CaredPerson {
  id: string;
  organization_id: string;
  full_name: string;
  nickname?: string | null;
  preferred_name?: string | null;
  relationship?: string | null;
  birth_date: string | null;
  gender?: string | null;
  blood_type: string | null;
  photo_url?: string | null;
  photo_path?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  archived_at?: string | null;
  notes: string | null;
}

interface CaredPersonContextValue {
  caredPeople: CaredPerson[];
  allCaredPeople: CaredPerson[];
  selectedPersonId: string | null;
  selectedPerson: CaredPerson | null;
  setSelectedPersonId: (id: string) => void;
  loading: boolean;
  refreshCaredPeople: () => Promise<void>;
  archivePerson: (id: string) => Promise<boolean>;
  restorePerson: (id: string) => Promise<boolean>;
}

const CaredPersonContext = createContext<CaredPersonContextValue | undefined>(undefined);

export function CaredPersonProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { currentOrganizationId } = useAuth();
  const [allCaredPeople, setAllCaredPeople] = useState<CaredPerson[]>([]);
  const [selectedPersonIdState, setSelectedPersonIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCaredPeople = useCallback(async () => {
    if (!currentOrganizationId) {
      setAllCaredPeople([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('cared_people')
      .select('*')
      .eq('organization_id', currentOrganizationId);

    if (data) {
      const typed = data as unknown as CaredPerson[];
      setAllCaredPeople(typed);
      
      const activePeople = typed.filter(p => !p.archived_at && p.status !== 'archived');
      const savedId = localStorage.getItem(`parentcare_person_${currentOrganizationId}`);
      
      if (savedId && activePeople.some(p => p.id === savedId)) {
        setSelectedPersonIdState(savedId);
      } else if (activePeople.length > 0) {
        setSelectedPersonIdState(activePeople[0].id);
      } else if (typed.length > 0) {
        setSelectedPersonIdState(typed[0].id);
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

  const archivePerson = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/cared-people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      if (res.ok) {
        await fetchCaredPeople();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchCaredPeople]);

  const restorePerson = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/cared-people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      if (res.ok) {
        await fetchCaredPeople();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchCaredPeople]);

  const caredPeople = allCaredPeople.filter(p => !p.archived_at && p.status !== 'archived');
  const selectedPerson = allCaredPeople.find(p => p.id === selectedPersonIdState) || null;

  return (
    <CaredPersonContext.Provider
      value={{
        caredPeople,
        allCaredPeople,
        selectedPersonId: selectedPersonIdState,
        selectedPerson,
        setSelectedPersonId,
        loading,
        refreshCaredPeople: fetchCaredPeople,
        archivePerson,
        restorePerson,
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
