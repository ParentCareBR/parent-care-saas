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
import { AlertCircle } from 'lucide-react';

export default function NewCaredPersonPage() {
  const router = useRouter();
  const { user, currentOrganizationId, setCurrentOrganizationId } = useAuth();
  const { refreshCaredPeople, setSelectedPersonId } = useCaredPerson();
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    // 1. Check if user is already a member of an organization
    const { data: existingMemberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);
    
    if (existingMemberships && existingMemberships.length > 0) {
      const orgId = existingMemberships[0].organization_id;
      setCurrentOrganizationId(orgId);
      return orgId;
    }

    // 2. Check if user already owns an organization
    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1);

    if (ownedOrgs && ownedOrgs.length > 0) {
      const orgId = ownedOrgs[0].id;
      setCurrentOrganizationId(orgId);
      return orgId;
    }

    // 3. Create a new organization
    const newOrgId = crypto.randomUUID();
    const uniqueSlug = `familia-${user.id.slice(0, 5)}-${Date.now()}`;
    const orgName = formData.full_name
      ? `Família de ${formData.full_name.split(' ')[0]}`
      : 'Minha Família';

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
      setErrorMessage(`Erro ao criar família: ${orgError.message}`);
      return null;
    }

    // 4. Link user as admin/owner
    await supabase
      .from('organization_members')
      .insert({
        organization_id: newOrgId,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    setCurrentOrganizationId(newOrgId);
    return newOrgId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage('Você precisa estar autenticado para continuar.');
      return;
    }

    if (!formData.full_name.trim()) {
      setErrorMessage('Por favor, informe o nome completo.');
      return;
    }

    setLoading(true);

    try {
      // Get or create organization
      const orgId = await getOrCreateOrganization();
      if (!orgId) {
        setLoading(false);
        return;
      }

      // Prepare payload
      const payload: Record<string, any> = {
        organization_id: orgId,
        full_name: formData.full_name.trim(),
        birth_date: formData.birth_date || null,
        blood_type: formData.blood_type || null,
        created_by: user.id,
      };

      if (formData.nickname?.trim()) {
        payload.nickname = formData.nickname.trim();
      }
      if (formData.gender) {
        payload.gender = formData.gender;
      }

      const { data, error } = await supabase
        .from('cared_people')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao cadastrar pessoa cuidada:', error);
        // Fallback: If error mentions column nickname or gender, try inserting without them
        if (error.message?.includes('nickname') || error.message?.includes('gender')) {
          delete payload.nickname;
          delete payload.gender;
          const { data: retryData, error: retryError } = await supabase
            .from('cared_people')
            .insert(payload)
            .select('id')
            .single();

          if (retryError) {
            setErrorMessage(`Erro no cadastro: ${retryError.message}`);
            setLoading(false);
            return;
          }

          toast({ title: 'Sucesso!', description: 'Pessoa cadastrada com sucesso.' });
          await refreshCaredPeople();
          if (retryData?.id) setSelectedPersonId(retryData.id);
          router.push('/pt-BR/dashboard');
          return;
        }

        setErrorMessage(`Erro ao cadastrar: ${error.message}`);
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
      console.error('Exceção ao salvar:', err);
      setErrorMessage(err.message || 'Ocorreu um erro inesperado ao salvar.');
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
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

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
