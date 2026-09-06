'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export default function LoginPage() {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const isConfirmed = searchParams?.get('confirmed') === 'true';
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(`/${locale}/dashboard`);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-brand-green">{t('login_title')}</CardTitle>
          <CardDescription>
            {t('login_subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConfirmed && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm font-medium mb-4 text-center">
              {t('email_confirmed_success')}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email_label')}</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                placeholder={t('email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password_label')}</Label>
              <Input 
                id="password" 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 font-medium">{error}</div>
            )}
            <Button type="submit" className="w-full bg-brand-green hover:bg-emerald-800" disabled={loading}>
              {loading ? t('login_loading') : t('login_btn')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-stone-500">
            {t('no_account')}{' '}
            <Link href={`/${locale}/auth/signup`} className="text-brand-green font-medium hover:underline">
              {t('signup_btn')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
