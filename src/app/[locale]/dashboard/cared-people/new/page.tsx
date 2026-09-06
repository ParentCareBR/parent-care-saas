'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewCaredPersonPage() {
  const router = useRouter();
  const { user, currentOrganizationId, setCurrentOrganizationId } = useAuth();
  const { refreshCaredPeople, setSelectedPersonId } = useCaredPerson();
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    nickname: '',
    birth_date: '',
    gender: '',
    blood_type: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getOrCreateOrganization = async (): Promise<string | null> => {
    if (currentOrganizationId) return currentOrganizationId;
    if (!user) return null;

    // Check if the user already has an active organization they are a member of
    const { data: existingMemberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    if (existingMemberships && existingMemberships.length > 0) {
      setCurrentOrganizationId(existingMemberships[0].organization_id);
      return existingMemberships[0].organization_id;
    }

    // Generate a unique ID and slug for the new org
    const newOrgId = crypto.randomUUID();
    const uniqueSlug = `familia-${user.id.slice(0, 5)}-${Date.now()}`;
    
    const orgName = formData.full_name
      ? `Família de ${formData.full_name.split(' ')[0]}`
      : 'Minha Família';

    // 1. Insert organization (without selecting, to bypass RLS select policies)
    const { error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: newOrgId,
        name: orgName,
        slug: uniqueSlug,
        owner_id: user.id,
      });

    if (orgError) {
      console.error('Erro ao criar organização:', orgError);
      return null;
    }

    // 2. Insert member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: newOrgId,
        user_id: user.id,
        role: 'admin',
        status: 'active',
      });
      
    if (memberError) {
      console.error('Erro ao vincular membro:', memberError);
      return null;
    }

    setCurrentOrganizationId(newOrgId);
    return newOrgId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Get or create an organization for the user
      const orgId = await getOrCreateOrganization();
      if (!orgId) {
        toast({ title: 'Erro', description: 'Não foi possível criar sua família. Tente novamente.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cared_people')
        .insert({
          organization_id: orgId,
          full_name: formData.full_name,
          birth_date: formData.birth_date || null,
          blood_type: formData.blood_type || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      toast({ title: 'Sucesso!', description: 'Pessoa cuidada cadastrada com sucesso.' });
      await refreshCaredPeople();
      if (data?.id) {
        setSelectedPersonId(data.id);
      }
      router.push('/pt-BR/dashboard');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro inesperado', description: err.message || 'Ocorreu um erro no servidor', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Cadastrar Nova Pessoa</h1>
        <p className="text-stone-500">Adicione as informações básicas da pessoa que receberá os cuidados.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Estes dados ajudarão a personalizar o painel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input 
                id="full_name" 
                name="full_name" 
                placeholder="Ex: Maria da Silva" 
                required 
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Como devemos chamar? (Apelido)</Label>
                <Input 
                  id="nickname" 
                  name="nickname" 
                  placeholder="Ex: Dona Maria" 
                  value={formData.nickname}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input 
                  id="birth_date" 
                  name="birth_date" 
                  type="date" 
                  value={formData.birth_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero</Label>
                <Select onValueChange={(v) => handleSelectChange('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="outro">Outro / Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood_type">Tipo Sanguíneo</Label>
                <Select onValueChange={(v) => handleSelectChange('blood_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não sei" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t pt-6 border-stone-100">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" className="bg-brand-green hover:bg-emerald-800" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Cadastro'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
