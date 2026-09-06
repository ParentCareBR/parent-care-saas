'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

export default function ConfirmPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const confirmed = searchParams.get('confirmed');

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/' + locale + '/auth/login?confirmed=true');
    }, 3000);
    return () => clearTimeout(timer);
  }, [locale, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p className="text-brand-green font-semibold text-lg">E-mail confirmado!</p>
          <p className="text-stone-500 text-sm">Redirecionando para o login...</p>
        </CardContent>
      </Card>
    </div>
  );
}