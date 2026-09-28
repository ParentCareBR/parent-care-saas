'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';

const STATUS_OPTIONS = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
const STATUS_LABELS: Record<string, string> = { open: 'Aberto', in_progress: 'Em andamento', waiting_customer: 'Aguardando', resolved: 'Resolvido', closed: 'Fechado' };

export default function TicketDetailPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchData = async () => {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', id).single(),
      supabase.from('support_messages').select('*').eq('ticket_id', id).order('created_at'),
    ]);
    setTicket(t); setMessages(m || []); setLoading(false);
  };
  useEffect(() => { if (id) fetchData(); }, [id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('support_messages').insert({ ticket_id: id, author_id: user!.id, content: reply, is_admin: true });
    setReply(''); fetchData();
  };

  const updateStatus = async (status: string) => {
    await supabase.from('support_tickets').update({
      status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
    }).eq('id', id);
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  if (!ticket) return <div className="text-center py-12 text-gray-500">Ticket não encontrado.</div>;

  return (
    <div>
      <Link href="/admin/support" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{ticket.subject}</h1>
            <p className="text-gray-400 text-sm">Categoria: {ticket.category} · Prioridade: {ticket.priority}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Histórico</h2>
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {messages.length === 0 ? <p className="text-gray-400 text-sm">Nenhuma mensagem ainda.</p> : messages.map(m => (
                <div key={m.id} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md rounded-lg px-4 py-3 ${m.is_admin ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <p className="text-sm">{m.content}</p>
                    <p className={`text-xs mt-1 ${m.is_admin ? 'text-emerald-100' : 'text-gray-400'}`}>{new Date(m.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()}
                placeholder="Responder cliente..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              <button onClick={sendReply} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Alterar Status</h2>
            <div className="space-y-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => updateStatus(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${ticket.status === s ? 'bg-emerald-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
              <p className="text-xs text-gray-400">SLA: {ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString('pt-BR') : '—'}</p>
              <p className="text-xs text-gray-400">Criado: {new Date(ticket.created_at).toLocaleString('pt-BR')}</p>
              {ticket.resolved_at && <p className="text-xs text-emerald-600">✓ Resolvido: {new Date(ticket.resolved_at).toLocaleString('pt-BR')}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
