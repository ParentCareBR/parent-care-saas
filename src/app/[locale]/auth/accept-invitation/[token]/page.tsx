'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, CheckCircle2, ShieldCheck, Lock, Eye, EyeOff, Globe, Sparkles, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { ElderlyLanguageSwitcher, SENIOR_LANGUAGES } from '@/components/shared/ElderlyLanguageSwitcher';
import { getAcceptInviteTranslations } from '@/lib/i18n/accept-invitation-translations';

export default function AcceptInvitationPage() {
  const params = useParams();
  const token = params?.token as string;
  const urlLocale = (params?.locale as string) || 'pt-BR';
  const router = useRouter();
  const supabase = createClient();

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Persistent language preference
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred_language');
      if (saved && SENIOR_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    }
    return SENIOR_LANGUAGES.some(l => l.code === urlLocale) ? urlLocale : 'pt-BR';
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  // Active translations
  const t = getAcceptInviteTranslations(selectedLanguage);

  const handleLanguageChange = (newLocale: string) => {
    setSelectedLanguage(newLocale);
    try {
      localStorage.setItem('preferred_language', newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      if (typeof window !== 'undefined' && token) {
        window.history.replaceState(null, '', `/${newLocale}/auth/accept-invitation/${token}`);
      }
    } catch {}
  };

  useEffect(() => {
    // Check if WebAuthn / Biometrics is available
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then(setBiometricsAvailable)
        .catch(() => setBiometricsAvailable(false));
    }

    async function loadInvitation() {
      try {
        setLoading(true);
        const res = await fetch(`/api/invitations/accept/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || t.errLoadInvite);
          return;
        }

        setInvitation(data.invitation);
        
        // If user hasn't chosen manually in localStorage, respect invite's preferredLanguage
        const hasSaved = typeof window !== 'undefined' && localStorage.getItem('preferred_language');
        if (!hasSaved && data.invitation.preferredLanguage) {
          handleLanguageChange(data.invitation.preferredLanguage);
        }

        if (data.invitation.caredPersonName) {
          setFullName(data.invitation.caredPersonName);
        }
      } catch (err: any) {
        setError(err.message || t.errLoadInvite);
      } finally {
        setLoading(false);
      }
    }

    if (token) loadInvitation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t.errPasswordLength);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.errPasswordMismatch);
      return;
    }
    if (!termsAccepted) {
      setError(t.errTermsRequired);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          password,
          language: selectedLanguage,
          termsAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.errActivate);
        setSubmitting(false);
        return;
      }

      // Log in automatically with credentials
      const email = invitation?.invitedEmail;
      if (email) {
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      // Set cookie and localStorage for locale
      localStorage.setItem('preferred_language', selectedLanguage);
      document.cookie = `NEXT_LOCALE=${selectedLanguage};path=/;max-age=31536000;SameSite=Lax`;

      // Redirect to target
      router.push(data.redirectTo || `/${selectedLanguage}/dashboard`);
    } catch (err: any) {
      setError(err.message || t.errActivateFail);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mb-4" />
        <p className="font-bold text-stone-600 dark:text-stone-300">{t.checkingInvitation}</p>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-red-200 dark:border-red-900 shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2 text-2xl font-black">
              !
            </div>
            <CardTitle className="text-xl font-black text-red-700">{t.invitationUnavailable}</CardTitle>
            <CardDescription className="text-stone-600 dark:text-stone-300 font-medium">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-stone-500 mb-4">
              {t.askAdminNewInvite}
            </p>
            <Button asChild className="w-full bg-stone-800 text-white font-bold h-12 rounded-xl">
              <Link href={`/${selectedLanguage}/care/login`}>{t.goToLogin}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isElderlyRole = invitation?.role === 'cared_person';

  // Check if invitation message is the default one to provide localized greeting
  const isDefaultMessage = !invitation?.message || 
    invitation.message.includes('Criei seu acesso pessoal') || 
    invitation.message.includes('personal access') ||
    invitation.message.includes('acceso personal');

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center p-4 py-8 relative">
      <div className="absolute top-4 right-4 z-10">
        <ElderlyLanguageSwitcher 
          compact 
          currentLocaleOverride={selectedLanguage}
          onSelectLanguage={handleLanguageChange}
        />
      </div>

      <Card className="max-w-lg w-full border-3 border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden bg-white dark:bg-stone-900">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 sm:p-8 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3">
            <Heart className="h-8 w-8 fill-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            {isElderlyRole ? t.welcomeTitleElderly : t.welcomeTitleFamily}
          </h1>
          <p className="text-emerald-100 font-semibold text-sm mt-1">
            {t.familyPrefix} <strong>{invitation?.organizationName}</strong>
          </p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-800 p-3.5 rounded-2xl text-red-800 dark:text-red-300 text-sm font-bold text-center">
              {error}
            </div>
          )}

          <div className="bg-emerald-50 dark:bg-emerald-950/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-stone-700 dark:text-stone-300 text-sm italic">
            &ldquo;{isDefaultMessage ? t.defaultWelcomeMessage : invitation?.message}&rdquo;
          </div>

          {invitation?.invitedEmail && (
            <div className="bg-stone-50 dark:bg-stone-800/80 p-3 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">{t.accountLoginEmail}</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{invitation.invitedEmail}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Confirm identity */}
            <div className="space-y-1.5">
              <Label className="text-sm font-black text-stone-800 dark:text-stone-200">
                {t.yourFullName}
              </Label>
              <Input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="h-12 text-base rounded-xl font-bold"
              />
            </div>

            {/* 2. Choose language */}
            <div className="space-y-1.5">
              <Label className="text-sm font-black text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-indigo-600" />
                {t.preferredLanguage}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SENIOR_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2 transition-all font-bold text-xs ${
                      selectedLanguage === lang.code
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shadow-xs ring-2 ring-emerald-500/30'
                        : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="truncate">{lang.nativeLabel.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Create private password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-black text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  {t.createPersonalPassword}
                </Label>
                <span className="text-[11px] text-stone-500 font-semibold">{t.onlyYouWillKnow}</span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="h-12 text-base pr-10 rounded-xl font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-black text-stone-800 dark:text-stone-200">
                {t.confirmYourPassword}
              </Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.confirmPasswordPlaceholder}
                className="h-12 text-base rounded-xl font-bold"
              />
            </div>

            {/* 4. Terms and Privacy Policy (LGPD) */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-stone-300"
                />
                <span className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-semibold">
                  {t.termsReadAndAgree}{' '}
                  <Link href={`/${selectedLanguage}/legal/terms`} target="_blank" className="text-emerald-700 underline font-bold">
                    {t.termsOfUse}
                  </Link>{' '}
                  {t.termsAnd}{' '}
                  <Link href={`/${selectedLanguage}/legal/privacy`} target="_blank" className="text-emerald-700 underline font-bold">
                    {t.privacyPolicy}
                  </Link>
                  {t.privacyProtected}
                </span>
              </label>
            </div>

            {biometricsAvailable && (
              <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                <Fingerprint className="h-5 w-5 text-indigo-600 shrink-0" />
                <span>{t.biometricsSupported}</span>
              </div>
            )}

            {/* 5. Submit button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base sm:text-lg rounded-2xl shadow-lg active:scale-95 transition-all mt-4"
            >
              {submitting ? t.submittingButton : t.submitButton}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
