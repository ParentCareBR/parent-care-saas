'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export default function SignupPage() {
  const t = useTranslations('Auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Build the callback URL with locale so the confirmation redirects correctly
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parentcare-pink.vercel.app';
    const redirectTo = `${siteUrl}/${locale}/auth/callback?locale=${locale}`;
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: redirectTo,
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      // Don't redirect - user needs to confirm email first
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-5xl">📧</div>
            <p className="text-brand-green font-semibold text-xl">{t('signup_title')}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left space-y-2">
              <p className="text-amber-800 font-medium text-sm">{t('email_confirm_notice_title')}</p>
              <p className="text-amber-700 text-sm">
                {t('email_confirm_notice_desc')} <strong>{email}</strong>.
              </p>
              <p className="text-amber-700 text-sm">
                {t('email_confirm_notice_action')}
              </p>
            </div>
            <p className="text-stone-400 text-xs">
              {t('email_confirm_notice_spam')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-brand-green">{t('signup_title')}</CardTitle>
          <CardDescription>{t('signup_subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name_label')}</Label>
              <Input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name_placeholder')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email_label')}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email_placeholder')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password_label')}</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
            {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
            <Button type="submit" className="w-full bg-brand-green hover:bg-emerald-800" disabled={loading}>
              {loading ? t('signup_loading') : t('signup_btn')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-stone-500">
            {t('has_account')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-brand-green font-medium hover:underline">
              {t('login_btn')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}