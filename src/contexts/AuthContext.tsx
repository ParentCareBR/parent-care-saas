'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile, OrganizationMembership } from '@/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  memberships: OrganizationMembership[];
  currentOrganizationId: string | null;
  setCurrentOrganizationId: (id: string) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    const { data: membershipData } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        organizations (
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (membershipData) {
      const mapped: OrganizationMembership[] = membershipData.map((m: any) => ({
        organization_id: m.organization_id,
        organization_name: m.organizations?.name ?? '',
        organization_slug: m.organizations?.slug ?? '',
        role: m.role,
        status: m.status,
      }));
      setMemberships(mapped);

      // Set first org as current if none selected
      if (!currentOrganizationId && mapped.length > 0) {
        const saved = localStorage.getItem('parentcare_org');
        const found = mapped.find((m) => m.organization_id === saved);
        setCurrentOrganizationIdState(found?.organization_id ?? mapped[0].organization_id);
      }
    }
  }, [supabase, currentOrganizationId]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const setCurrentOrganizationId = useCallback((id: string) => {
    setCurrentOrganizationIdState(id);
    localStorage.setItem('parentcare_org', id);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setMemberships([]);
          setCurrentOrganizationIdState(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('parentcare_org');
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        memberships,
        currentOrganizationId,
        setCurrentOrganizationId,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
