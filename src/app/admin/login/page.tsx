'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError('Credenciais inválidas'); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Erro ao obter usuário'); setLoading(false); return; }
    const { data: adminUser } = await supabase.from('admin_users').select('id').eq('user_id', user.id).eq('is_active', true).single();
    if (!adminUser) { await supabase.auth.signOut(); setError('Acesso não autorizado. Este painel é exclusivo para a equipe Parent Care.'); setLoading(false); return; }
    router.push('/admin/analytics');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Parent Care — Acesso restrito à equipe</p>
          </div>
        </div>
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Verificando...</> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
