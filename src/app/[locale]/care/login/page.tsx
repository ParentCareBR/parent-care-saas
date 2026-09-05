'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ElderlyLoginPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;
    
    setLoading(true);
    setError('');

    // In a full implementation, we'd look up the PIN in a `care_access_codes` table
    // For now, if pin is '1234' we go to the demo mode, else we simulate a fake login
    
    if (pin === '1234') {
      // Demo access
      localStorage.setItem('parentcare_trusted_device', 'true');
      router.push('/care/demo-id?demo=true');
      return;
    }

    // Example of real check (pseudo-code)
    /*
    const { data } = await supabase.from('care_access_codes').select('cared_person_id').eq('pin', pin).single();
    if (data) {
      localStorage.setItem('parentcare_trusted_device', 'true');
      router.push(`/care/${data.cared_person_id}`);
    } else {
      setError('Código inválido. Peça ajuda a um familiar.');
    }
    */

    setError('Código não encontrado. Tente 1234 para demonstração.');
    setLoading(false);
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
            <div>
              <label htmlFor="pin" className="block text-xl font-bold text-stone-900 mb-4">
                Digite seu Código de Acesso
              </label>
              <div className="relative max-w-[240px] mx-auto">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 text-stone-400" />
                <Input 
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="h-20 text-4xl text-center pl-16 pr-4 tracking-[0.2em] rounded-2xl border-2 border-stone-300 focus-visible:ring-brand-green focus-visible:border-brand-green font-mono"
                  placeholder="••••"
                  aria-label="Código numérico de acesso"
                />
              </div>
              <p className="text-stone-500 mt-4 text-base">
                O código foi enviado pela sua família.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl font-medium border border-red-200">
                {error}
              </div>
            )}

            <Button 
              type="submit"
              className="w-full h-20 text-2xl rounded-2xl bg-brand-green hover:bg-emerald-800 shadow-md"
              disabled={loading || pin.length < 4}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
