'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Copy, ExternalLink, Link2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  events?: Array<{
    title: string;
    date: Date;
    time?: string;
    subtitle?: string;
  }>;
}

export function GoogleCalendarSyncModal({
  isOpen,
  onClose,
  personName,
  events = [],
}: GoogleCalendarSyncModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Direct link to create event or open Google Calendar
  const openGoogleCalendar = (event?: { title: string; date: Date; time?: string; subtitle?: string }) => {
    if (!event) {
      window.open('https://calendar.google.com/calendar/u/0/r', '_blank');
      return;
    }

    const start = new Date(event.date);
    if (event.time) {
      const [h, m] = event.time.split(':').map(Number);
      start.setHours(h || 9, m || 0, 0, 0);
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Parent Care: ${event.title} (${personName})`
    )}&dates=${formatGDate(start)}/${formatGDate(end)}&details=${encodeURIComponent(
      `Compromisso de cuidados acompanhado via Parent Care.\nPaciente: ${personName}\nDetalhes: ${event.subtitle || 'Acompanhamento de rotina'}`
    )}&location=${encodeURIComponent(event.subtitle || 'Em casa')}`;

    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const calendarUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://parentcare-pink.vercel.app'}/api/calendar/feed?name=${encodeURIComponent(personName)}`;
    navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    toast({
      title: 'Link do Calendário Copiado!',
      description: 'Cole no Google Agenda em "Outras agendas" > "Do URL" para sincronização automática.',
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1A73E8] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              G
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-stone-900 dark:text-white leading-tight">
                Sincronizar com Google Agenda
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
                Rotina e consultas de {personName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Conecte os compromissos, exames e horários médicos de {personName} com a sua conta do Google para receber notificações no celular e smartwatch:
          </p>

          {/* Opção 1: Abrir no Google Agenda com 1 clique */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1A73E8] text-white text-xs font-black flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-black text-blue-950 dark:text-blue-200">
                Abrir o Google Agenda Direto
              </h4>
            </div>
            <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-normal">
              Acesse sua conta Google para visualizar ou criar alertas sincronizados com o Parent Care.
            </p>
            <Button
              type="button"
              onClick={() => openGoogleCalendar(events[0])}
              className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-xl text-xs font-bold h-9 flex items-center justify-center gap-2 shadow-xs"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir Google Agenda Agora
            </Button>
          </div>

          {/* Opção 2: Link de Assinatura iCal/WebCal */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#16253C] border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-700 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                Assinar Agenda Automática (Feed WebCal)
              </h4>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
              Copie o link abaixo e adicione no Google Agenda em: <strong>Adicionar Agenda ➔ Do URL</strong>.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="w-full border-stone-300 dark:border-stone-600 rounded-xl text-xs font-bold h-9 flex items-center justify-center gap-2"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Link Copiado!' : 'Copiar Link de Sincronização'}
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white rounded-xl text-xs font-bold h-9"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
