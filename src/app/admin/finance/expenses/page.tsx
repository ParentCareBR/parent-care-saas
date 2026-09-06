'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Plus } from 'lucide-react';

const CATEGORIES = ['infrastructure', 'marketing', 'staff', 'legal', 'tools', 'taxes', 'other'];
const CAT_LABELS: Record<string, string> = { infrastructure: 'Infraestrutura', marketing: 'Marketing', staff: 'Equipe', legal: 'Jurídico', tools: 'Ferramentas', taxes: 'Impostos', other: 'Outros' };

export default function ExpensesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'infrastructure', vendor: '', description: '', amount: '', currency: 'BRL' });
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchEntries = async () => {
    const { data } = await supabase.from('erp_expenses').select('*').order('created_at', { ascending: false }).limit(100);
    setEntries(data || []); setLoading(false);
  };
  useEffect(() => { fetchEntries(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('erp_expenses').insert({ ...form, amount: parseFloat(form.amount) });
    setForm({ category: 'infrastructure', vendor: '', description: '', amount: '', currency: 'BRL' });
    setShowForm(false); fetchEntries();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Despesas & Fornecedores</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"><Plus className="h-4 w-4" /> Adicionar</button>
      </div>
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-3 gap-4">
          <div><label className="text-xs text-gray-500 block mb-1">Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500 block mb-1">Fornecedor</label>
            <input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Valor</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Descrição</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Moeda</label>
            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['BRL', 'USD', 'EUR'].map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-emerald-700">Salvar</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-6 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Carregando...</div> : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhuma despesa registrada ainda.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Categoria', 'Fornecedor', 'Descrição', 'Valor', 'Moeda', 'Data'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{CAT_LABELS[e.category]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.vendor || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.description}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600">-{Number(e.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.currency}</td>
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
