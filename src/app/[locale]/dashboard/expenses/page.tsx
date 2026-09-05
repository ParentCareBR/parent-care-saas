'use client';

import React from 'react';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { Button } from '@/components/ui/button';
import { Plus, Receipt } from 'lucide-react';

export default function ExpensesPage() {
  const { selectedPerson, loading } = useCaredPerson();

  if (loading) return <div>Carregando...</div>;
  if (!selectedPerson) return <div>Selecione uma pessoa cuidada.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Despesas</h1>
          <p className="text-stone-500">Gestão financeira de {selectedPerson.full_name}</p>
        </div>
        <Button className="bg-brand-green hover:bg-emerald-800">
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-12 text-center shadow-sm">
        <div className="mx-auto w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
          <Receipt className="h-8 w-8 text-stone-400" />
        </div>
        <h3 className="text-lg font-medium text-stone-900">Nenhuma despesa registrada</h3>
        <p className="text-stone-500 mt-1 max-w-sm mx-auto mb-6">
          Registre gastos com medicamentos, consultas, cuidadores e alimentação.
        </p>
      </div>
    </div>
  );
}
