'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Users, Search } from 'lucide-react';
import Link from 'next/link';

const FUNNEL_LABELS: Record<string, string> = {
  visitor: 'Visitante', lead: 'Lead', signup_started: 'Cadastro Iniciado',
  trial: 'Teste', subscriber: 'Assinante', past_due: 'Inadimplente',
  canceled: 'Cancelado', reactivated: 'Reativado'
};
const FUNNEL_COLORS: Record<string, string> = {
  visitor: 'bg-gray-100 text-gray-700', lead: 'bg-blue-100 text-blue-700',
  signup_started: 'bg-yellow-100 text-yellow-700', trial: 'bg-purple-100 text-purple-700',
  subscriber: 'bg-green-100 text-green-700', past_due: 'bg-orange-100 text-orange-700',
  canceled: 'bg-red-100 text-red-700', reactivated: 'bg-emerald-100 text-emerald-700'
};

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      let query = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
      if (stageFilter) query = query.eq('funnel_stage', stageFilter);
      const { data } = await query;
      setLeads(data || []);
      setLoading(false);
    };
    fetchLeads();
  }, [stageFilter]);

  const filtered = leads.filter(l =>
    !search || l.email?.toLowerCase().includes(search.toLowerCase()) || l.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM — Clientes & Leads</h1>
          <p className="text-gray-500 text-sm mt-1">{leads.length} registros</p>
        </div>
        <Link href="/admin/crm/funnel" className="border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Ver Funil</Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome..."
            className="pl-9 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
          <option value="">Todas as etapas</option>
          {Object.entries(FUNNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum lead encontrado.</p>
            <p className="text-gray-400 text-sm mt-1">Os registros aparecerão conforme os usuários interagem com o sistema.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Cliente', 'Etapa', 'País', 'Origem', 'MRR', 'LTV', 'Cadastro', 'Ação'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{lead.full_name || '—'}</p>
                    <p className="text-gray-400 text-xs">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FUNNEL_COLORS[lead.funnel_stage] || 'bg-gray-100 text-gray-600'}`}>
                      {FUNNEL_LABELS[lead.funnel_stage] || lead.funnel_stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.country || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{lead.source || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{lead.mrr ? `R$ ${Number(lead.mrr).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{lead.ltv ? `R$ ${Number(lead.ltv).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/crm/${lead.id}`} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
