'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';

export default function PersonMonitoringRedirect() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const personId = params?.id as string;
  const { setSelectedPersonId } = useCaredPerson();

  useEffect(() => {
    if (personId) {
      setSelectedPersonId(personId);
    }
    router.replace(`/${locale}/dashboard/settings/monitoring`);
  }, [personId, locale, router, setSelectedPersonId]);

  return (
    <div className="p-8 text-center text-stone-500">
      Redirecionando para acompanhamentos...
    </div>
  );
}
