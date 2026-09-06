import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MealsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Alimentação</h1>
        <p className="text-stone-500">Página em desenvolvimento...</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-stone-600">Esta funcionalidade será lançada em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
}
