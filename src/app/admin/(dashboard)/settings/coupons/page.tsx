'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Plus, Tag } from 'lucide-react';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' });
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchCoupons = async () => {
    const { data } = await supabase.from('admin_coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data || []); setLoading(false);
  };
  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('admin_coupons').insert({
      code: form.code.toUpperCase(), description: form.description,
      discount_type: form.discount_type, discount_value: parseFloat(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null
    });
    setForm({ code: '', description: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' });
    setShowForm(false); fetchCoupons();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from('admin_coupons').update({ is_active: !is_active }).eq('id', id);
    fetchCoupons();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cupons de Desconto</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"><Plus className="h-4 w-4" /> Criar Cupom</button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-3 gap-4">
          <div><label className="text-xs text-gray-500 block mb-1">Código</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="EX: PROMO20" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Tipo</label><select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="percent">Porcentagem (%)</option><option value="fixed">Valor fixo (R$)</option></select></div>
          <div><label className="text-xs text-gray-500 block mb-1">Valor do Desconto</label><input type="number" step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Uso máximo</label><input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="Ilimitado" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Expira em</label><input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Descrição</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-emerald-700">Criar</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-6 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Carregando...</div> : coupons.length === 0 ? (
          <div className="p-12 text-center"><Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum cupom criado ainda.</p></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Código', 'Desconto', 'Usos', 'Expira', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-bold text-gray-900">{c.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.discount_value}{c.discount_type === 'percent' ? '%' : ' R$'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.used_count}/{c.max_uses || '∞'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : 'Sem expiração'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="px-4 py-3"><button onClick={() => toggleActive(c.id, c.is_active)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">{c.is_active ? 'Desativar' : 'Ativar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
