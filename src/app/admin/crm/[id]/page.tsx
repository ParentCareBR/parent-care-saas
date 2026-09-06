'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, MessageSquare } from 'lucide-react';

export default function CRMDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchData = async () => {
    const [{ data: l }, { data: n }, { data: t }] = await Promise.all([
      supabase.from('crm_leads').select('*').eq('id', id).single(),
      supabase.from('crm_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_tasks').select('*').eq('lead_id', id).order('due_date'),
    ]);
    setLead(l); setNotes(n || []); setTasks(t || []);
    setLoading(false);
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: adminUser } = await supabase.from('admin_users').select('id').eq('user_id', user!.id).single();
    await supabase.from('crm_notes').insert({ lead_id: id, content: newNote, author_id: adminUser?.id });
    setNewNote('');
    fetchData();
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    await supabase.from('crm_tasks').insert({ lead_id: id, title: newTask });
    setNewTask('');
    fetchData();
  };

  const toggleTask = async (taskId: string, status: string) => {
    await supabase.from('crm_tasks').update({ status: status === 'done' ? 'pending' : 'done' }).eq('id', taskId);
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  if (!lead) return <div className="text-center py-12 text-gray-500">Lead não encontrado.</div>;

  const infoFields = [
    ['País', lead.country], ['Idioma', lead.language], ['Origem', lead.source],
    ['Campanha', lead.campaign], ['UTM Source', lead.utm_source], ['UTM Medium', lead.utm_medium],
    ['UTM Campaign', lead.utm_campaign], ['Telefone', lead.phone]
  ];

  return (
    <div>
      <Link href="/admin/crm" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar ao CRM
      </Link>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{lead.full_name || 'Sem nome'}</h1>
                <p className="text-gray-500">{lead.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {infoFields.map(([k, v]) => (
                <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="font-medium text-gray-900">{v || '—'}</p></div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Notas Internas</h2>
            <div className="flex gap-2 mb-4">
              <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Adicionar nota..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              <button onClick={addNote} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">Salvar</button>
            </div>
            {notes.length === 0 ? <p className="text-gray-400 text-sm">Nenhuma nota ainda.</p> : (
              <div className="space-y-3">
                {notes.map(n => (
                  <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-800">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Tarefas de Acompanhamento</h2>
            <div className="flex gap-2 mb-4">
              <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Nova tarefa..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              <button onClick={addTask} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">Adicionar</button>
            </div>
            {tasks.length === 0 ? <p className="text-gray-400 text-sm">Nenhuma tarefa.</p> : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" checked={t.status === 'done'} onChange={() => toggleTask(t.id, t.status)} className="h-4 w-4 text-emerald-600 rounded" />
                    <span className={`text-sm ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</span>
                    {t.due_date && <span className="text-xs text-gray-400 ml-auto">{new Date(t.due_date).toLocaleDateString('pt-BR')}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Métricas do Cliente</h2>
            <div className="space-y-3">
              {[
                ['Etapa', lead.funnel_stage],
                ['MRR', lead.mrr ? `R$ ${Number(lead.mrr).toFixed(2)}` : '—'],
                ['LTV', lead.ltv ? `R$ ${Number(lead.ltv).toFixed(2)}` : '—'],
                ['Risco Churn', lead.churn_risk || '—'],
                ['Motivo Canc.', lead.churn_reason || '—'],
                ['Cadastro', new Date(lead.created_at).toLocaleDateString('pt-BR')],
                ['Último acesso', lead.last_seen_at ? new Date(lead.last_seen_at).toLocaleDateString('pt-BR') : '—'],
              ].map(([k, v]) => (
                <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-semibold text-gray-900 text-sm capitalize">{v}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
