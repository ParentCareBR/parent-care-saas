'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Users, Search, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const FUNNEL_LABELS: Record<string, string> = {
  visitor: 'Visitante', lead: 'Lead', signup_started: 'Cadastro Iniciado',
  trial: 'Trial', subscriber: 'Assinante', past_due: 'Inadimplente',
  canceled: 'Cancelado', reactivated: 'Reativado',
};

const FUNNEL_STYLES: Record<string, string> = {
  visitor:        'bg-slate-500/15 text-slate-400 border-slate-500/25',
  lead:           'bg-blue-500/15 text-blue-400 border-blue-500/25',
  signup_started: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  trial:          'bg-purple-500/15 text-purple-400 border-purple-500/25',
  subscriber:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  past_due:       'bg-amber-500/15 text-amber-400 border-amber-500/25',
  canceled:       'bg-rose-500/15 text-rose-400 border-rose-500/25',
  reactivated:    'bg-teal-500/15 text-teal-400 border-teal-500/25',
};

const PAGE_SIZE = 20;

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchLeads = async () => {
    setLoading(true);
    let query = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
    if (stageFilter) query = query.eq('funnel_stage', stageFilter);
    const { data } = await query;
    setLeads(data || []);
    setPage(0);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [stageFilter]);

  const filtered = leads.filter(l =>
    !search ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stageCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.funnel_stage] = (acc[l.funnel_stage] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Top summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: leads.length, color: 'text-white' },
          { label: 'Trials', value: stageCounts['trial'] || 0, color: 'text-purple-400' },
          { label: 'Assinantes', value: stageCounts['subscriber'] || 0, color: 'text-emerald-400' },
          { label: 'Cancelados', value: stageCounts['canceled'] || 0, color: 'text-rose-400' },
        ].map(c => (
          <div key={c.label} className="bg-[#0d1829] border border-[#1a2744] rounded-xl p-4">
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{c.label}</p>
            <p className={`text-2xl font-black mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="bg-[#0d1829] border border-[#1a2744] rounded-xl p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9 w-full bg-[#060d1a] border border-[#1a2744] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="bg-[#060d1a] border border-[#1a2744] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">Todas as etapas</option>
          {Object.entries(FUNNEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Link
          href="/admin/crm/funnel"
          className="px-4 py-2 rounded-lg border border-[#1a2744] bg-white/5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          Ver Funil
        </Link>
        <button
          onClick={fetchLeads}
          className="px-3 py-2 rounded-lg border border-[#1a2744] bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Carregando clientes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Nenhum lead encontrado.</p>
            <p className="text-slate-600 text-sm mt-1">Os registros aparecem conforme os usuários interagem com o sistema.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a2744]">
                    {['Cliente', 'Etapa', 'País', 'Origem', 'MRR', 'LTV', 'Cadastro', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111d30]">
                  {paginated.map(lead => (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">
                            {(lead.full_name || lead.email || 'F').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white leading-none">{lead.full_name || '—'}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold ${FUNNEL_STYLES[lead.funnel_stage] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                          {FUNNEL_LABELS[lead.funnel_stage] || lead.funnel_stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{lead.country || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{lead.source || '—'}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400 font-semibold">
                        {lead.mrr ? `R$ ${Number(lead.mrr).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-semibold">
                        {lead.ltv ? `R$ ${Number(lead.ltv).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/crm/${lead.id}`}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a2744]">
                <p className="text-xs text-slate-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-[#1a2744] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-400 px-2">Pág. {page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-[#1a2744] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
