'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ElderlyLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError('Acesso negado. Verifique os dados e tente novamente.');
      setLoading(false);
      return;
    }

    const { data: caredPerson, error: caredError } = await supabase
      .from('cared_people')
      .select('id')
      .eq('user_id', data.user.id)
      .single();

    if (caredError || !caredPerson) {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', data.user.id)
        .limit(1)
        .single();
      
      if (orgMember) {
         const { data: firstPerson } = await supabase
          .from('cared_people')
          .select('id')
          .eq('organization_id', orgMember.organization_id)
          .limit(1)
          .single();
         if (firstPerson) {
            router.push(`/${params.locale}/care/${firstPerson.id}`);
            return;
         }
      }
      
      setError('Nenhum perfil de cuidado encontrado para esta conta.');
      setLoading(false);
      return;
    }

    router.push(`/${params.locale}/care/${caredPerson.id}`);
  };

  return (
    <div className="min-h-screen bg-brand-soft flex flex-col items-center justify-center p-6 elderly-mode">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-brand-green/20">
        <div className="bg-brand-green p-8 text-center text-white">
          <Heart className="h-12 w-12 mx-auto mb-4 fill-white" />
          <h1 className="text-3xl font-bold mb-2">Acesso Familiar</h1>
          <p className="text-lg opacity-90">Parent Care</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6 text-center">
            
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl font-medium border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xl font-bold text-stone-900 mb-4">
                E-mail e Senha
              </label>
              <div className="relative mb-4">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 text-stone-400" />
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-20 text-2xl pl-16 rounded-2xl border-2 border-stone-300 focus-visible:ring-brand-green"
                  placeholder="Seu e-mail"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 text-stone-400" />
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-20 text-3xl pl-16 rounded-2xl border-2 border-stone-300 focus-visible:ring-brand-green tracking-widest"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full h-20 text-2xl rounded-2xl bg-brand-green hover:bg-emerald-800 shadow-md font-bold"
              disabled={loading || !email || !password}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
