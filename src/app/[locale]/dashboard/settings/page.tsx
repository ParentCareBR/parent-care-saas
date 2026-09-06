'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, User, Lock, Bell, CreditCard, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export default function SettingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    timezone: 'America/Sao_Paulo',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    medicationAlerts: true,
    emergencyAlerts: true,
    dailySummary: false,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        timezone: profile.timezone || 'America/Sao_Paulo',
      });
    } else if (user) {
      setProfileForm({
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        phone: '',
        timezone: 'America/Sao_Paulo',
      });
    }
  }, [profile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        timezone: profileForm.timezone,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil atualizado!', description: 'Suas informações foram salvas com sucesso.' });
      await refreshProfile();
    }
    setSavingProfile(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Senhas não coincidem', description: 'Por favor, confirme a mesma senha.', variant: 'destructive' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (error) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha alterada!', description: 'Sua senha foi atualizada com sucesso.' });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
    setSavingPassword(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-emerald-600" />
          Configurações da Conta
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Gerencie suas informações pessoais, segurança, alertas e assinatura.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-stone-100 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg gap-2">
            <User className="h-4 w-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2">
            <Lock className="h-4 w-4" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg gap-2">
            <Bell className="h-4 w-4" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg gap-2">
            <Sun className="h-4 w-4" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg gap-2">
            <CreditCard className="h-4 w-4" /> Assinatura
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PERFIL */}
        <TabsContent value="profile">
          <Card className="rounded-2xl border-stone-200">
            <form onSubmit={handleUpdateProfile}>
              <CardHeader>
                <CardTitle className="text-lg">Dados Pessoais</CardTitle>
                <CardDescription>Atualize como os outros membros da família vêem você.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={user?.email || ''} disabled className="bg-stone-50 text-stone-500" />
                  <span className="text-xs text-stone-400">O e-mail é utilizado para login e notificações essenciais.</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input 
                    id="full_name" 
                    value={profileForm.full_name} 
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Seu nome"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input 
                      id="phone" 
                      placeholder="(11) 99999-9999"
                      value={profileForm.phone} 
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Input 
                      id="timezone" 
                      value={profileForm.timezone} 
                      onChange={(e) => setProfileForm(prev => ({ ...prev, timezone: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 border-stone-100 flex justify-end">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" disabled={savingProfile}>
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 2: SEGURANÇA */}
        <TabsContent value="security">
          <Card className="rounded-2xl border-stone-200">
            <form onSubmit={handleUpdatePassword}>
              <CardHeader>
                <CardTitle className="text-lg">Alterar Senha</CardTitle>
                <CardDescription>Escolha uma nova senha forte para sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    required
                    placeholder="Mínimo de 6 caracteres"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required
                    placeholder="Repita a nova senha"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 border-stone-100 flex justify-end">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" disabled={savingPassword}>
                  {savingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 3: NOTIFICAÇÕES */}
        <TabsContent value="notifications">
          <Card className="rounded-2xl border-stone-200">
            <CardHeader>
              <CardTitle className="text-lg">Preferências de Alertas</CardTitle>
              <CardDescription>Defina quais alertas automáticos você deseja receber no seu WhatsApp ou E-mail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Lembretes de Medicamentos</Label>
                  <p className="text-sm text-stone-500">Receba notificações quando chegar a hora da dose dos idosos.</p>
                </div>
                <Switch 
                  checked={notifications.medicationAlerts} 
                  onCheckedChange={(c) => setNotifications(prev => ({ ...prev, medicationAlerts: c }))} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Botão de Emergência da Família</Label>
                  <p className="text-sm text-stone-500">Disparo urgente caso alguém acione o botão SOS no app.</p>
                </div>
                <Switch 
                  checked={notifications.emergencyAlerts} 
                  onCheckedChange={(c) => setNotifications(prev => ({ ...prev, emergencyAlerts: c }))} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Resumo Diário de Cuidados</Label>
                  <p className="text-sm text-stone-500">Um relatório com as tarefas concluídas e hidratação no fim do dia.</p>
                </div>
                <Switch 
                  checked={notifications.dailySummary} 
                  onCheckedChange={(c) => setNotifications(prev => ({ ...prev, dailySummary: c }))} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: APARÊNCIA */}
        <TabsContent value="appearance">
          <Card className="rounded-2xl border-stone-200">
            <CardHeader>
              <CardTitle className="text-lg">Aparência do Aplicativo</CardTitle>
              <CardDescription>Escolha entre o Modo Claro ou Modo Escuro para a interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Option */}
                <div 
                  onClick={() => setTheme('light')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'light' 
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20' 
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 font-bold text-stone-900">
                      <Sun className="h-5 w-5 text-amber-500" />
                      <span>Modo Claro</span>
                    </div>
                    {theme === 'light' && (
                      <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Ativo</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    Fundo claro com tons suaves e máxima legibilidade para o dia a dia.
                  </p>
                </div>

                {/* Dark Mode Option */}
                <div 
                  onClick={() => setTheme('dark')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'dark' 
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20' 
                      : 'border-stone-200 hover:border-stone-300 bg-white dark:bg-stone-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 font-bold text-stone-900 dark:text-stone-100">
                      <Moon className="h-5 w-5 text-indigo-400" />
                      <span>Modo Escuro</span>
                    </div>
                    {theme === 'dark' && (
                      <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Ativo</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Tons escuros para reduzir o cansaço visual em ambientes de pouca luz.
                  </p>
                </div>
              </div>

              {/* Language Selection */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Idioma da Plataforma</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Alterne o idioma entre Português, Inglês, Espanhol, Francês e Alemão.
                  </p>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: ASSINATURA */}
        <TabsContent value="billing">
          <Card className="rounded-2xl border-stone-200">
            <CardHeader>
              <CardTitle className="text-lg">Plano e Pagamento</CardTitle>
              <CardDescription>Gerencie a assinatura da sua família e recursos contratados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Plano Atual</span>
                  <h4 className="text-lg font-bold text-emerald-950 mt-0.5">Plano Familiar — 30 Dias de Teste Grátis</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Cartão cadastrado com segurança na Paddle. Cobrança segura e transparente.
                  </p>
                </div>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                  <Link href={`/${locale}/dashboard/settings/subscription`}>
                    Gerenciar Plano e Cartão
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
