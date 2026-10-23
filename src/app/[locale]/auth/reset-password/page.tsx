'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Mail, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/auth/callback?type=recovery`,
    });

    setLoading(false);

    if (resetErr) {
      setError(resetErr.message || 'Falha ao solicitar recuperação.');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-xl border-2 border-stone-200 dark:border-stone-800">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            Recuperação de Senha
          </CardTitle>
          <CardDescription>
            Informe seu e-mail cadastrado para receber o link de redefinição de senha.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="font-bold text-stone-800 dark:text-stone-200 text-base">
                E-mail de recuperação enviado!
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Verifique sua caixa de entrada no endereço <strong>{email}</strong> e siga as instruções para criar uma nova senha.
              </p>
              <Button asChild variant="outline" className="w-full h-11 rounded-xl font-bold">
                <Link href={`/${locale}/auth/login`}>Voltar ao Início de Sessão</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 p-3 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">Seu E-mail</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 pl-10 rounded-xl"
                  />
                  <Mail className="h-5 w-5 absolute left-3 top-3.5 text-stone-400" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                {loading ? 'Enviando link...' : 'Enviar Link de Redefinição'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 font-semibold"
                >
                  ← Voltar para a tela de login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
