'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Plus } from 'lucide-react';

type RevenueEntry = { id: string; type: string; amount: number; currency: string; gateway: string; description: string; created_at: string; };

export default function RevenuePage() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'subscription', amount: '', currency: 'BRL', gateway: 'stripe', description: '' });
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchEntries = async () => {
    const { data } = await supabase.from('erp_revenue').select('*').order('created_at', { ascending: false }).limit(100);
    setEntries((data || []) as RevenueEntry[]); setLoading(false);
  };
  useEffect(() => { fetchEntries(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('erp_revenue').insert({ ...form, amount: parseFloat(form.amount) });
    setForm({ type: 'subscription', amount: '', currency: 'BRL', gateway: 'stripe', description: '' });
    setShowForm(false); fetchEntries();
  };

  const TYPE_LABELS: Record<string, string> = { subscription: 'Assinatura', one_time: 'Avulso', refund: 'Reembolso', chargeback: 'Chargeback' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Receitas & Assinaturas</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-3 gap-4">
          <div><label className="text-xs text-gray-500 block mb-1">Tipo</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="subscription">Assinatura</option><option value="one_time">Avulso</option>
              <option value="refund">Reembolso</option><option value="chargeback">Chargeback</option>
            </select></div>
          <div><label className="text-xs text-gray-500 block mb-1">Valor</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Moeda</label>
            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['BRL', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500 block mb-1">Gateway</label>
            <select value={form.gateway} onChange={e => setForm({ ...form, gateway: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="stripe">Stripe</option><option value="mercado_pago">Mercado Pago</option><option value="paddle">Paddle</option>
            </select></div>
          <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Descrição</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-emerald-700">Salvar</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Carregando...</div> : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhuma receita registrada ainda.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Tipo', 'Valor', 'Moeda', 'Gateway', 'Descrição', 'Data'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{TYPE_LABELS[e.type] || e.type}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${e.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>{e.type === 'refund' ? '-' : '+'}{Number(e.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.currency}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.gateway}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.description || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
