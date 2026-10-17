'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CognitiveGamesHub } from '@/components/games/CognitiveGamesHub';

export default function DashboardGamesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  return <CognitiveGamesHub backHref={`/${locale}/dashboard`} showBackHeader={true} />;
}