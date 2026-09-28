'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, MessageSquare, CheckSquare, Square, Plus, Globe, Phone, Tag, TrendingUp } from 'lucide-react';

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

const FUNNEL_LABELS: Record<string, string> = {
  visitor: 'Visitante', lead: 'Lead', signup_started: 'Cadastro Iniciado',
  trial: 'Trial', subscriber: 'Assinante', past_due: 'Inadimplente',
  canceled: 'Cancelado', reactivated: 'Reativado',
};

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-white mt-0.5">{value || '—'}</p>
    </div>
  );
}

export default function CRMDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = async () => {
    const [{ data: l }, { data: n }, { data: t }] = await Promise.all([
      supabase.from('crm_leads').select('*').eq('id', id).single(),
      supabase.from('crm_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_tasks').select('*').eq('lead_id', id).order('due_date'),
    ]);
    setLead(l);
    setNotes(n || []);
    setTasks(t || []);
    setLoading(false);
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: adminUser } = await supabase.from('admin_users' as any).select('id').eq('user_id', user!.id).single();
    await supabase.from('crm_notes').insert({ lead_id: id, content: newNote, author_id: (adminUser as any)?.id });
    setNewNote('');
    setSavingNote(false);
    fetchData();
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    setSavingTask(true);
    await supabase.from('crm_tasks').insert({ lead_id: id, title: newTask });
    setNewTask('');
    setSavingTask(false);
    fetchData();
  };

  const toggleTask = async (taskId: string, status: string) => {
    await supabase.from('crm_tasks').update({ status: status === 'done' ? 'pending' : 'done' }).eq('id', taskId);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500 text-sm">Carregando...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500 text-sm">Lead não encontrado.</p>
      </div>
    );
  }

  const stageStyle = FUNNEL_STYLES[lead.funnel_stage] || 'bg-slate-500/15 text-slate-400 border-slate-500/25';
  const stageLabel = FUNNEL_LABELS[lead.funnel_stage] || lead.funnel_stage;

  return (
    <div className="space-y-5">
      <Link href="/admin/crm" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao CRM
      </Link>

      <div className="grid grid-cols-3 gap-5">
        {/* Left column */}
        <div className="col-span-2 space-y-5">
          {/* Profile card */}
          <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-black flex-shrink-0 border border-emerald-500/20">
                {(lead.full_name || lead.email || 'F').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-black text-white">{lead.full_name || 'Sem nome'}</h1>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${stageStyle}`}>
                    {stageLabel}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">{lead.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <InfoField label="País" value={lead.country} />
              <InfoField label="Idioma" value={lead.language} />
              <InfoField label="Telefone" value={lead.phone} />
              <InfoField label="Origem" value={lead.source} />
              <InfoField label="Campanha" value={lead.campaign} />
              <InfoField label="UTM Source" value={lead.utm_source} />
              <InfoField label="UTM Medium" value={lead.utm_medium} />
              <InfoField label="UTM Campaign" value={lead.utm_campaign} />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Notas ({notes.length})</h2>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addNote()}
                placeholder="Adicionar nota..."
                className="flex-1 bg-[#060d1a] border border-[#1a2744] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">Nenhuma nota ainda.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note: any) => (
                  <div key={note.id} className="bg-[#060d1a] border border-[#1a2744] rounded-xl p-3">
                    <p className="text-sm text-white">{note.content}</p>
                    <p className="text-[10px] text-slate-600 mt-1.5">
                      {new Date(note.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Financial metrics */}
          <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Métricas</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">MRR</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">
                  {lead.mrr ? `R$ ${Number(lead.mrr).toFixed(2)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">LTV</p>
                <p className="text-xl font-black text-white mt-0.5">
                  {lead.ltv ? `R$ ${Number(lead.ltv).toFixed(2)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Cadastro</p>
                <p className="text-sm font-semibold text-slate-300 mt-0.5">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Tarefas ({tasks.length})</h2>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Nova tarefa..."
                className="flex-1 bg-[#060d1a] border border-[#1a2744] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={addTask}
                disabled={savingTask || !newTask.trim()}
                className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/25 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-4">Nenhuma tarefa.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task: any) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id, task.status)}
                    className="flex items-start gap-2.5 w-full text-left group"
                  >
                    {task.status === 'done'
                      ? <CheckSquare className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      : <Square className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0 group-hover:text-slate-400" />
                    }
                    <span className={`text-sm ${task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                      {task.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
