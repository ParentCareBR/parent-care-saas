'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Sparkles, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Calendar,
  Heart
} from 'lucide-react';

function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

function formatExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}

function formatCpf(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  } else if (digits.length > 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  } else if (digits.length > 3) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  return digits;
}

function detectBrand(number: string): string {
  const clean = number.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^(4011|4389|4514|4576|5041|5067|5090|6277|6362|6363)/.test(clean)) return 'Elo';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^(606282|3841)/.test(clean)) return 'Hipercard';
  return '';
}

export default function SignupPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const supabase = createClient();

  const seatsParam = searchParams.get('seats') || '1';
  const intervalParam = (searchParams.get('interval') as 'month' | 'year') || 'month';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Credit Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const detectedBrand = detectBrand(cardNumber);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          card: {
            number: cardNumber,
            holder: cardHolder,
            expiry: cardExpiry,
            cvv: cardCvv,
            cpf: cardCpf,
          },
          seats: Number(seatsParam) || 1,
          billingInterval: intervalParam,
          locale,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar cadastro com cartão.');
      }

      if (data.organizationId) {
        localStorage.setItem('parentcare_org', data.organizationId);
      }

      // Try automatic login
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInErr && signInData?.session) {
        router.push(`/${locale}/dashboard`);
        return;
      }

      // If user needs email confirmation before login
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao registrar.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 p-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-md shadow-xl border-emerald-200 dark:border-emerald-800 rounded-3xl overflow-hidden">
          <div className="bg-emerald-500/10 p-6 text-center border-b border-emerald-200 dark:border-emerald-800">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-emerald-950 dark:text-emerald-100">
              Cartão Validado & Teste de 30 Dias Ativo!
            </h2>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 font-medium">
              R$ 0,00 debitado hoje. Cobrança somente após os 30 dias.
            </p>
          </div>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-left space-y-2">
              <p className="text-amber-900 dark:text-amber-200 font-bold text-sm">
                📧 Quase lá! Confirme seu e-mail
              </p>
              <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar seu login e acessar imediatamente seu painel.
              </p>
            </div>
            <div className="text-center pt-2">
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold">
                <Link href={`/${locale}/auth/login`}>
                  Ir para a Página de Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 p-4 sm:p-6 relative text-stone-900 dark:text-stone-100">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-xl space-y-5 my-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            30 Dias de Teste Grátis · Cancele quando quiser
          </div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            Comece seu Teste Grátis
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Cadastre seu cartão para ativar o período de testes. <strong className="text-emerald-700 dark:text-emerald-400">R$ 0,00 cobrado hoje.</strong>
          </p>
        </div>

        {/* Highlighted Guarantee & Transparency Notice */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-stone-900 dark:to-teal-950/20 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Compromisso de Cobrança Zero nos Primeiros 30 Dias:</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white/80 dark:bg-stone-800/80 p-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/60 flex items-start gap-2.5">
              <span className="text-lg">💳</span>
              <div>
                <p className="font-bold text-stone-900 dark:text-stone-100">R$ 0,00 cobrado hoje</p>
                <p className="text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                  Seu cartão é registrado apenas para validação e início do período de testes.
                </p>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-stone-800/80 p-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/60 flex items-start gap-2.5">
              <span className="text-lg">📅</span>
              <div>
                <p className="font-bold text-stone-900 dark:text-stone-100">Cobrança só no 31º dia</p>
                <p className="text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                  Caso queira continuar, o plano será de {intervalParam === 'year' ? 'R$ 287,00/ano' : 'R$ 29,90/mês'}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1 border-t border-emerald-200/50 dark:border-emerald-900/50">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Você pode cancelar a qualquer momento antes dos 30 dias com 1 clique, sem burocracia nem cobrança.</span>
          </div>
        </div>

        {/* Signup Card */}
        <Card className="rounded-3xl shadow-lg border-stone-200 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900">
          <form onSubmit={handleSignup}>
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* SECTION 1: ACCOUNT DATA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  <h3 className="font-extrabold text-sm text-stone-800 dark:text-stone-200">
                    Seus Dados de Acesso
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="mt-1 rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="mt-1 rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Senha
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          minLength={6}
                          className="rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CREDIT CARD DATA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    <h3 className="font-extrabold text-sm text-stone-800 dark:text-stone-200">
                      Dados do Cartão de Crédito
                    </h3>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold">
                    Cobrança: R$ 0,00 hoje
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cardNumber" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Número do Cartão
                      </Label>
                      {detectedBrand && (
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          {detectedBrand}
                        </span>
                      )}
                    </div>
                    <div className="relative mt-1">
                      <Input
                        id="cardNumber"
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm pl-10 tracking-widest font-mono"
                      />
                      <CreditCard className="h-4 w-4 text-stone-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cardHolder" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Nome Impresso no Cartão
                    </Label>
                    <Input
                      id="cardHolder"
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="COMO NO CARTÃO"
                      className="mt-1 rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <Label htmlFor="cardExpiry" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Validade
                      </Label>
                      <Input
                        id="cardExpiry"
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="mt-1 rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm text-center font-mono"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cardCvv" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        CVV
                      </Label>
                      <Input
                        id="cardCvv"
                        type="text"
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="mt-1 rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm text-center font-mono"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cardCpf" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        CPF do Titular
                      </Label>
                      <Input
                        id="cardCpf"
                        type="text"
                        value={cardCpf}
                        onChange={(e) => setCardCpf(formatCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="mt-1 rounded-xl h-11 border-stone-200 dark:border-stone-700 text-sm text-center font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary & Zero Charge Guarantee */}
              <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                <div className="flex justify-between font-medium text-stone-600 dark:text-stone-300">
                  <span>Período de Testes:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">30 dias grátis</span>
                </div>
                <div className="flex justify-between font-medium text-stone-600 dark:text-stone-300">
                  <span>Cobrança imediata hoje:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">R$ 0,00</span>
                </div>
                <div className="flex justify-between font-semibold text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-700">
                  <span>Primeira mensalidade (no 31º dia):</span>
                  <span>{intervalParam === 'year' ? 'R$ 287,00/ano' : 'R$ 29,90/mês'}</span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Security badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-stone-400 pt-1">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-600" />
                  Criptografia 256-bit SSL
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  Padrão PCI-DSS
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  R$ 0,00 cobrado agora
                </span>
              </div>

              {/* Action Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl h-13 shadow-md active:scale-[0.99] transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Validando cartão e ativando teste...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Cadastrar Cartão & Iniciar 30 Dias Grátis (R$ 0,00)
                  </span>
                )}
              </Button>

              <p className="text-[11px] text-center text-stone-400 leading-normal">
                Ao clicar, você concorda com os 30 dias de avaliação gratuita. A cobrança do plano só será realizada após os 30 dias caso você decida continuar. Você pode cancelar quando quiser nas configurações da sua conta.
              </p>
            </CardContent>

            <CardFooter className="bg-stone-50/50 dark:bg-stone-900/50 border-t border-stone-100 dark:border-stone-800 p-4 flex justify-center">
              <div className="text-xs text-stone-500">
                Já possui uma conta cadastrada?{' '}
                <Link href={`/${locale}/auth/login`} className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">
                  Fazer login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}