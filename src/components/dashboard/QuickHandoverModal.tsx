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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuickHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  caredPersonId: string;
  caredPersonName: string;
  organizationId: string;
  onSaved?: () => void;
}

export function QuickHandoverModal({
  isOpen,
  onClose,
  caredPersonId,
  caredPersonName,
  organizationId,
  onSaved,
}: QuickHandoverModalProps) {
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [category, setCategory] = useState<'observation' | 'incident' | 'handover'>('handover');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !caredPersonId || !organizationId) return;

    setSaving(true);
    try {
      const typeLabel = category === 'handover' ? '[Passagem de Plantão]' : category === 'incident' ? '[Alerta]' : '[Observação]';
      const formattedContent = `${typeLabel} ${content.trim()}`;

      const { error } = await supabase.from('care_notes').insert({
        organization_id: organizationId,
        cared_person_id: caredPersonId,
        content: formattedContent,
        type: category === 'incident' ? 'incident' : 'observation',
      });

      if (error) throw error;

      toast({
        title: 'Anotação Registrada!',
        description: 'Registro gravado no histórico de cuidados e compartilhado com a equipe.',
      });

      setContent('');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar passagem de plantão:', err);
      toast({
        title: 'Erro ao registrar',
        description: err.message || 'Falha ao salvar. Verifique sua conexão.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ClipboardList className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-stone-900 dark:text-white leading-tight">
                Passagem de Plantão / Anotação
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
                Compartilhe o status e ocorrências de {caredPersonName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Tipo de Registro
            </Label>
            <Select value={category} onValueChange={(val: any) => setCategory(val)}>
              <SelectTrigger className="rounded-xl h-10 text-xs font-bold bg-stone-50 dark:bg-[#16253C]">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="handover">Passagem de Plantão (Troca de turno)</SelectItem>
                <SelectItem value="observation">Observação Geral de Rotina</SelectItem>
                <SelectItem value="incident">Intercorrência / Alerta Clínico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Mensagem / Relatório do Cuidado
            </Label>
            <Textarea
              rows={4}
              placeholder="Descreva como foi o turno, apetite, medicamentos administrados, humor e recados para o próximo cuidador..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-xl text-xs bg-stone-50 dark:bg-[#16253C] resize-none"
              required
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl h-10 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !content.trim()}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl h-10 text-xs font-bold px-5"
            >
              {saving ? 'Publicando...' : 'Publicar Registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
