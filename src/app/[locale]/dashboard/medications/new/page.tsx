'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewMedicationPage() {
  const router = useRouter();
  const { selectedPerson } = useCaredPerson();
  const { user, currentOrganizationId } = useAuth();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    unit: 'mg',
    instructions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !user || !currentOrganizationId) return;
    
    setLoading(true);
    
    const { error } = await supabase.from('medications').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId!,
      name: formData.name,
      dosage: formData.dosage,
      unit: formData.unit,
      instructions: formData.instructions,
      created_by: user.id,
      is_active: true
    });

    setLoading(false);
    
    if (!error) {
      router.push('/dashboard/medications');
    } else {
      alert('Erro ao salvar medicamento');
    }
  };

  if (!selectedPerson) return <div>Selecione uma pessoa cuidada primeiro.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/medications"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Novo Medicamento</h1>
          <p className="text-stone-500">Para {selectedPerson.full_name}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do medicamento</Label>
                <Input 
                  id="name" 
                  required 
                  placeholder="Ex: Losartana" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dosage">Dosagem</Label>
                  <Input 
                    id="dosage" 
                    required 
                    placeholder="Ex: 50" 
                    value={formData.dosage}
                    onChange={e => setFormData({...formData, dosage: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <select 
                    id="unit"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="gotas">gotas</option>
                    <option value="cp">comprimido(s)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="instructions">Instruções de uso (Opcional)</Label>
                <textarea 
                  id="instructions" 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Ex: Tomar após as refeições" 
                  value={formData.instructions}
                  onChange={e => setFormData({...formData, instructions: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/medications">Cancelar</Link>
              </Button>
              <Button type="submit" className="bg-brand-green hover:bg-emerald-800" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Medicamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
