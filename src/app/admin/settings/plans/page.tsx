'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Package } from 'lucide-react';

export default function PlansSettingsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchPlans = async () => {
    const { data } = await supabase.from('plans').select('*').order('price_monthly');
    setPlans(data || []); setLoading(false);
  };
  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('plans').update({
      name: editing.name, description: editing.description,
      price_monthly: parseFloat(editing.price_monthly),
      price_yearly: parseFloat(editing.price_yearly),
      max_cared_people: parseInt(editing.max_cared_people),
      max_members: parseInt(editing.max_members),
      is_active: editing.is_active
    }).eq('id', editing.id);
    setEditing(null); fetchPlans();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Planos & Preços</h1>
      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6">
              {editing?.id === plan.id ? (
                <form onSubmit={handleSave} className="grid grid-cols-3 gap-4">
                  <div><label className="text-xs text-gray-500">Nome</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Preço Mensal (BRL)</label><input type="number" step="0.01" value={editing.price_monthly} onChange={e => setEditing({ ...editing, price_monthly: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Preço Anual (BRL)</label><input type="number" step="0.01" value={editing.price_yearly} onChange={e => setEditing({ ...editing, price_yearly: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Máx. Pessoas Cuidadas</label><input type="number" value={editing.max_cared_people} onChange={e => setEditing({ ...editing, max_cared_people: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Máx. Membros</label><input type="number" value={editing.max_members} onChange={e => setEditing({ ...editing, max_members: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" /></div>
                  <div className="flex items-end gap-2"><label className="text-xs text-gray-500">Ativo</label><input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} className="h-4 w-4" /></div>
                  <div className="col-span-3"><label className="text-xs text-gray-500">Descrição</label><textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} /></div>
                  <div className="col-span-3 flex gap-2">
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-emerald-700">Salvar</button>
                    <button type="button" onClick={() => setEditing(null)} className="border border-gray-200 px-6 py-2 rounded-lg text-sm">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Package className="h-5 w-5 text-emerald-600" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{plan.is_active ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <p className="text-gray-500 text-sm">{plan.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right"><p className="text-xs text-gray-400">Mensal</p><p className="font-bold text-gray-900">R$ {Number(plan.price_monthly).toFixed(2)}</p></div>
                    <div className="text-right"><p className="text-xs text-gray-400">Anual</p><p className="font-bold text-gray-900">R$ {Number(plan.price_yearly).toFixed(2)}</p></div>
                    <div className="text-right"><p className="text-xs text-gray-400">Pessoas</p><p className="font-bold text-gray-900">{plan.max_cared_people}</p></div>
                    <div className="text-right"><p className="text-xs text-gray-400">Membros</p><p className="font-bold text-gray-900">{plan.max_members}</p></div>
                    <button onClick={() => setEditing(plan)} className="border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Editar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
