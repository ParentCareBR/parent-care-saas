'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SignupPage() {
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
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => { router.push('/' + locale + '/auth/login'); }, 2000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-brand-green font-semibold text-lg">Conta criada com sucesso!</p>
            <p className="text-stone-500 text-sm">Redirecionando para o login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-brand-green">Criar Conta</CardTitle>
          <CardDescription>Cadastre-se no Parent Care para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" minLength={6} />
            </div>
            {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
            <Button type="submit" className="w-full bg-brand-green hover:bg-emerald-800" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-stone-500">
            Ja tem uma conta?{' '}
            <Link href={'/' + locale + '/auth/login'} className="text-brand-green font-medium hover:underline">Entrar</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}