'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Plus, HeadphonesIcon } from 'lucide-react';
import Link from 'next/link';

const PRIORITY_COLORS: Record<string, string> = { low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
const STATUS_COLORS: Record<string, string> = { open: 'bg-blue-100 text-blue-700', in_progress: 'bg-purple-100 text-purple-700', waiting_customer: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600' };
const STATUS_LABELS: Record<string, string> = { open: 'Aberto', in_progress: 'Em andamento', waiting_customer: 'Aguardando cliente', resolved: 'Resolvido', closed: 'Fechado' };

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'medium' });
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data } = await query;
    setTickets(data || []); setLoading(false);
  };
  useEffect(() => { fetchTickets(); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const sla = new Date();
    sla.setHours(sla.getHours() + (form.priority === 'critical' ? 4 : form.priority === 'high' ? 8 : 24));
    await supabase.from('support_tickets').insert({ ...form, sla_due_at: sla.toISOString() });
    setForm({ subject: '', category: 'general', priority: 'medium' });
    setShowForm(false); fetchTickets();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suporte — Tickets</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"><Plus className="h-4 w-4" /> Novo Ticket</button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-3 gap-4">
          <div className="col-span-3"><label className="text-xs text-gray-500 block mb-1">Assunto</label>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['billing', 'technical', 'account', 'feature_request', 'general'].map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500 block mb-1">Prioridade</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option>
            </select></div>
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-emerald-700">Criar</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-6 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}
      <div className="mb-4 flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="flex items-center text-sm text-gray-500">{tickets.length} tickets</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Carregando...</div> : tickets.length === 0 ? (
          <div className="p-12 text-center"><HeadphonesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum ticket encontrado.</p></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>{['Assunto', 'Categoria', 'Prioridade', 'Status', 'SLA', 'Criado'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Link href={`/admin/support/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-emerald-600">{t.subject}</Link></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.category}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{t.sla_due_at ? new Date(t.sla_due_at).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
