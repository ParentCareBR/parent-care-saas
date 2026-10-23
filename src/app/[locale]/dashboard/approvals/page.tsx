'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, ArrowLeft,
  RefreshCw, Check, X, User, Calendar, Pill, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function ApprovalsPage() {
  const { currentOrganizationId } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [activeModalRequest, setActiveModalRequest] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<'approved' | 'rejected'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/approval-requests?organizationId=${currentOrganizationId}&status=${statusFilter}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDecision = async () => {
    if (!activeModalRequest) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/approval-requests/${activeModalRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: modalAction,
          decisionNotes,
          locale,
        }),
      });

      if (res.ok) {
        toast({
          title: modalAction === 'approved' ? '✓ Solicitação aprovada' : '✗ Solicitação rejeitada',
          description: 'A decisão foi registrada e o solicitante foi notificado.',
        });
        setActiveModalRequest(null);
        setDecisionNotes('');
        await fetchRequests();
      } else {
        const err = await res.json();
        toast({ title: 'Erro ao processar', description: err.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Falha na comunicação', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const openDecisionModal = (req: any, action: 'approved' | 'rejected') => {
    setActiveModalRequest(req);
    setModalAction(action);
    setDecisionNotes('');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/${locale}/dashboard`}
              className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-bold flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Painel
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-amber-500" />
            Central de Aprovações da Família
          </h1>
          <p className="text-sm text-stone-500 font-medium mt-0.5">
            Revise solicitações críticas de cuidadores e familiares antes que entrem em vigor.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl">
          {[
            { key: 'pending', label: 'Pendentes' },
            { key: 'approved', label: 'Aprovadas' },
            { key: 'rejected', label: 'Rejeitadas' },
            { key: 'all', label: 'Todas' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                statusFilter === tab.key
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-bold text-stone-500">Carregando solicitações...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800 p-12 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-black text-stone-800 dark:text-stone-200">
            Nenhuma solicitação {statusFilter === 'pending' ? 'pendente' : 'nesta categoria'}
          </h3>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            Quando um cuidador ou familiar solicitar uma alteração de medicamento, rotina ou agenda com aprovação obrigatória, ela aparecerá aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';

            return (
              <Card
                key={req.id}
                className={`rounded-3xl border-2 transition-all overflow-hidden ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-800 shadow-sm'
                    : isApproved
                    ? 'border-emerald-200 dark:border-emerald-900 opacity-90'
                    : 'border-stone-200 dark:border-stone-800 opacity-80'
                }`}
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {req.module_code}
                      </span>
                      {isPending && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 font-bold">
                          ⏳ Aguardando Aprovação
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-bold">
                          ✓ Aprovada
                        </Badge>
                      )}
                      {req.status === 'rejected' && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 font-bold">
                          ✗ Rejeitada
                        </Badge>
                      )}
                      <span className="text-xs text-stone-400 font-medium">
                        {new Date(req.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                      {req.description}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 font-medium">
                      <span>👤 Solicitante: <strong>{req.requester?.full_name || 'Usuário'}</strong></span>
                      {req.cared_people && (
                        <span>👴 Pessoa Cuidada: <strong>{req.cared_people.preferred_name || req.cared_people.full_name}</strong></span>
                      )}
                    </div>

                    {req.decision_notes && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-800/60 p-2 rounded-xl mt-2">
                        Observação da decisão: &ldquo;{req.decision_notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions for pending requests */}
                  {isPending && (
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        onClick={() => openDecisionModal(req, 'approved')}
                        className="flex-1 sm:flex-none h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5"
                      >
                        <Check className="h-4 w-4" /> Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openDecisionModal(req, 'rejected')}
                        className="flex-1 sm:flex-none h-11 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 font-bold rounded-xl gap-1.5"
                      >
                        <X className="h-4 w-4" /> Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Decision Confirmation Modal */}
      <Dialog open={!!activeModalRequest} onOpenChange={(open) => !open && setActiveModalRequest(null)}>
        <DialogContent className="rounded-3xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              {modalAction === 'approved' ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  Confirmar Aprovação
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  Confirmar Rejeição
                </>
              )}
            </DialogTitle>
            <DialogDescription className="font-semibold text-stone-600 dark:text-stone-400">
              {modalAction === 'approved'
                ? 'Esta alteração entrará em vigor imediatamente para toda a família.'
                : 'A alteração será descartada e o solicitante será informado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
              {activeModalRequest?.description}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500">
                Justificativa ou Observação (Opcional)
              </label>
              <Textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Ex: Aprovado conforme orientação do Dr. Roberto na última consulta."
                className="rounded-xl min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveModalRequest(null)}
              className="rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={processing}
              onClick={handleDecision}
              className={`rounded-xl font-bold ${
                modalAction === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {processing ? 'Processando...' : modalAction === 'approved' ? '✓ Aprovar Alteração' : '✗ Rejeitar Alteração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
