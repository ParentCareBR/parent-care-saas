'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, Shield, ArrowLeft, RefreshCw, Filter,
  Clock, User, AlertTriangle, Eye, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function AuditLogsPage() {
  const { currentOrganizationId } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);

    try {
      let url = `/api/audit-logs?organizationId=${currentOrganizationId}&limit=50`;
      if (criticalOnly) url += '&isCritical=true';
      if (moduleFilter !== 'all') url += `&moduleCode=${moduleFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, criticalOnly, moduleFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
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
            <FileText className="h-7 w-7 text-indigo-600" />
            Central de Auditoria Imutável
          </h1>
          <p className="text-sm text-stone-500 font-medium mt-0.5">
            Histórico completo e permanente de todas as ações realizadas na família, em conformidade com a LGPD.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={criticalOnly ? 'default' : 'outline'}
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`rounded-xl text-xs font-bold h-10 gap-1.5 ${
              criticalOnly ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Apenas Ações Críticas
          </Button>

          <Button
            variant="outline"
            onClick={fetchLogs}
            className="rounded-xl text-xs font-bold h-10 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-4 sm:p-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
              Registros de Auditoria ({total})
            </CardTitle>
            <CardDescription className="text-xs">
              Registros imutáveis com usuário, papel, pessoa cuidada e valores antes/depois.
            </CardDescription>
          </div>
        </CardHeader>

        {loading ? (
          <div className="py-20 flex justify-center">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            Nenhum registro de auditoria encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60 font-black text-stone-600 dark:text-stone-400">
                  <th className="p-3 sm:p-4">Data & Horário</th>
                  <th className="p-3">Usuário & Papel</th>
                  <th className="p-3">Pessoa Cuidada</th>
                  <th className="p-3">Ação Realizada</th>
                  <th className="p-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="p-3 sm:p-4 whitespace-nowrap text-stone-500 font-semibold text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-stone-900 dark:text-stone-100 block">
                        {log.user_display_name || 'Sistema'}
                      </span>
                      <span className="text-[11px] text-stone-400 uppercase font-semibold">
                        {log.user_role || 'membro'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {log.cared_people?.preferred_name || log.cared_people?.full_name || 'Geral da Família'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {log.is_critical && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 font-extrabold text-[10px]">
                            CRÍTICA
                          </Badge>
                        )}
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {log.description || log.action}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 block mt-0.5">
                        Módulo: {log.module_code || 'Geral'} {log.table_name ? `• Tabela: ${log.table_name}` : ''}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="rounded-xl h-9 px-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver Dados
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="rounded-3xl max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Detalhes da Ação Auditada
            </DialogTitle>
            <DialogDescription className="text-xs">
              ID do registro: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl">
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase block">Usuário</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {selectedLog?.user_display_name} ({selectedLog?.user_role})
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase block">Data/Hora</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {selectedLog && new Date(selectedLog.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {selectedLog?.old_data && (
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-red-600 block">
                  Informação Anterior:
                </span>
                <pre className="bg-red-50 dark:bg-red-950/40 p-3 rounded-xl text-xs font-mono overflow-x-auto text-red-950 dark:text-red-200">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog?.new_data && (
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 block">
                  Nova Informação Aplicada:
                </span>
                <pre className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl text-xs font-mono overflow-x-auto text-emerald-950 dark:text-emerald-200">
                  {JSON.stringify(selectedLog.new_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
