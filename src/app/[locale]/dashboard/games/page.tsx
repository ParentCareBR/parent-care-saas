'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { GamesAndMomentsHub } from '@/components/games/GamesAndMomentsHub';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardGamesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { selectedPerson } = useCaredPerson();
  const { currentOrganizationId } = useAuth();

  const personId = selectedPerson?.id || 'demo-cared-person';
  const personName = selectedPerson?.preferred_name || selectedPerson?.full_name || 'Pessoa Querida';
  const orgId = selectedPerson?.organization_id || currentOrganizationId || undefined;

  return (
    <GamesAndMomentsHub
      caredPersonId={personId}
      caredPersonName={personName}
      organizationId={orgId}
      locale={locale}
      backHref={`/${locale}/dashboard`}
      showBackHeader={true}
    />
  );
}
