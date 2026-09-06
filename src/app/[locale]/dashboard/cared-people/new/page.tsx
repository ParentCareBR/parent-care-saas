'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  ChevronRight, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  HeartHandshake, 
  FileText, 
  Clock, 
  Activity, 
  Smartphone, 
  Lock, 
  Plus, 
  Trash2,
  AlertTriangle,
  UploadCloud,
  Sparkles
} from 'lucide-react';
import { MONITORING_CATALOG, validateDependencies } from '@/lib/monitoring/catalog';
import type { OnboardingWizardState } from '@/types/cared-person';

const INITIAL_STATE: OnboardingWizardState = {
  // Step 1: Identification
  full_name: '',
  preferred_name: '',
  relationship: 'mother',
  birth_date: '',
  gender_identity: 'female',
  pronouns: 'ela/dela',
  marital_status: 'widowed',
  preferred_language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  profile_type: 'family_member',
  notes: '',

  // Step 2: Contact & Location
  phone: '',
  whatsapp: '',
  email: '',
  address_type: 'primary',
  street: '',
  number: '',
  complement: '',
  city: '',
  region: '',
  postal_code: '',
  country_code: 'BR',
  housing_type: 'house',
  lives_alone: false,
  lives_with_family: true,
  has_caregiver: false,
  receives_scheduled_visits: false,
  access_notes: '',

  // Step 3: Emergency Contacts
  contacts: [
    {
      name: '',
      relationship: 'Filho(a)',
      phone: '',
      whatsapp: '',
      email: '',
      priority_order: 1,
      is_primary: true,
      is_emergency: true,
      can_receive_notifications: true,
      can_view_profile: true,
      can_edit_records: true,
    },
  ],

  // Step 4: Important Information
  blood_type: 'O+',
  allergies: [],
  chronic_conditions: [],
  mobility_status: 'independent',
  hearing_vision_impairment: 'none',
  medical_devices: [],
  health_insurance: {
    plan_name: '',
    policy_number: '',
    hospital_preference: '',
  },

  // Step 5: Routine & Preferences
  wake_time: '07:00',
  sleep_time: '21:30',
  meal_preferences: '',
  activity_preferences: '',
  communication_style: 'tranquila e paciente',
  comfort_actions: 'música clássica, passeios curtos',
  dislikes_or_triggers: 'ambientes muito barulhentos',

  // Step 6: Monitoring Settings (codes)
  enabled_monitoring_codes: ['medications', 'meals', 'hydration_logs', 'appointments'],

  // Step 7: Simplified Screen Config
  simplified_screen_enabled: true,
  simplified_buttons: ['confirmMedication', 'helpButton'],
  emergency_button_enabled: true,

  // Step 8: Consents
  consents: {
    data_processing: true,
    emergency_sharing: true,
    health_records: true,
    professional_care: false,
  },
};

const STEPS = [
  { id: 1, label: 'Identificação', icon: UserPlus },
  { id: 2, label: 'Contato & Localização', icon: MapPin },
  { id: 3, label: 'Responsáveis & Emergência', icon: Phone },
  { id: 4, label: 'Saúde & Cuidados', icon: Activity },
  { id: 5, label: 'Rotina & Gostos', icon: Clock },
  { id: 6, label: 'Acompanhamentos', icon: HeartHandshake },
  { id: 7, label: 'Tela Simplificada', icon: Smartphone },
  { id: 8, label: 'Consentimentos', icon: Lock },
  { id: 9, label: 'Revisão', icon: Check },
];

export default function NewCaredPersonPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId } = useAuth();
  const { refreshCaredPeople, setSelectedPersonId } = useCaredPerson();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingWizardState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && currentOrganizationId) {
      const draft = localStorage.getItem(`pc_wizard_draft_${currentOrganizationId}`);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm(prev => ({ ...prev, ...parsed }));
        } catch {}
      }
    }
  }, [currentOrganizationId]);

  // Auto-save draft
  const saveDraft = (updated: OnboardingWizardState) => {
    if (typeof window !== 'undefined' && currentOrganizationId) {
      localStorage.setItem(`pc_wizard_draft_${currentOrganizationId}`, JSON.stringify(updated));
    }
  };

  const updateField = (field: keyof OnboardingWizardState, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      saveDraft(next);
      return next;
    });
  };

  // Contacts helper
  const addContact = () => {
    setForm(prev => {
      const next = {
        ...prev,
        contacts: [
          ...prev.contacts,
          {
            name: '',
            relationship: 'Familiar',
            phone: '',
            whatsapp: '',
            email: '',
            priority_order: prev.contacts.length + 1,
            is_primary: false,
            is_emergency: false,
            can_receive_notifications: true,
            can_view_profile: true,
            can_edit_records: false,
          },
        ],
      };
      saveDraft(next);
      return next;
    });
  };

  const removeContact = (index: number) => {
    setForm(prev => {
      const next = {
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index),
      };
      saveDraft(next);
      return next;
    });
  };

  const updateContact = (index: number, key: string, val: any) => {
    setForm(prev => {
      const updatedContacts = [...prev.contacts];
      updatedContacts[index] = { ...updatedContacts[index], [key]: val };
      const next = { ...prev, contacts: updatedContacts };
      saveDraft(next);
      return next;
    });
  };

  // Monitoring toggle helper
  const handleToggleMonitoring = (code: string) => {
    setForm(prev => {
      const current = new Set(prev.enabled_monitoring_codes);
      if (current.has(code)) {
        current.delete(code);
      } else {
        current.add(code);
      }
      const next = { ...prev, enabled_monitoring_codes: Array.from(current) };
      saveDraft(next);
      return next;
    });
  };

  // Photo change
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Validation per step
  const validateCurrentStep = (): boolean => {
    setErrorMessage(null);
    if (step === 1) {
      if (!form.full_name.trim()) {
        setErrorMessage('O Nome Completo é obrigatório para continuar.');
        return false;
      }
    }
    if (step === 3) {
      const validContacts = form.contacts.filter(c => c.name.trim() && (c.phone.trim() || c.whatsapp.trim()));
      if (validContacts.length === 0) {
        setErrorMessage('Cadastre pelo menos 1 contato com nome e telefone para segurança do idoso.');
        return false;
      }
    }
    if (step === 8) {
      if (!form.consents.data_processing) {
        setErrorMessage('O consentimento para tratamento de dados operacionais do cuidado é obrigatório.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep(prev => Math.min(prev + 1, 9));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrorMessage(null);
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Send to server-side API with plan limit check
      const res = await fetch('/api/cared-people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          full_name: form.full_name,
          preferred_name: form.preferred_name,
          relationship: form.relationship,
          birth_date: form.birth_date || null,
          gender_identity: form.gender_identity,
          pronouns: form.pronouns,
          marital_status: form.marital_status,
          preferred_language: form.preferred_language,
          timezone: form.timezone,
          country_code: form.country_code,
          profile_type: form.profile_type,
          notes: form.notes,
          blood_type: form.blood_type,
          contacts: form.contacts.filter(c => c.name.trim()),
          addresses: [
            {
              address_type: form.address_type,
              street: form.street,
              number: form.number,
              complement: form.complement,
              city: form.city,
              region: form.region,
              postal_code: form.postal_code,
              country_code: form.country_code,
              housing_type: form.housing_type,
              lives_alone: form.lives_alone,
              lives_with_family: form.lives_with_family,
              has_caregiver: form.has_caregiver,
              receives_scheduled_visits: form.receives_scheduled_visits,
              access_notes: form.access_notes,
            },
          ],
          important_information: [
            { information_type: 'allergies', value_json: form.allergies },
            { information_type: 'chronic_conditions', value_json: form.chronic_conditions },
            { information_type: 'mobility', value_json: { status: form.mobility_status } },
            { information_type: 'sensory', value_json: { impairment: form.hearing_vision_impairment } },
            { information_type: 'health_insurance', value_json: form.health_insurance },
          ],
          preferences: [
            { preference_type: 'sleep_schedule', value_json: { wake: form.wake_time, sleep: form.sleep_time } },
            { preference_type: 'communication', value_json: { style: form.communication_style } },
            { preference_type: 'comforts', value_json: { actions: form.comfort_actions } },
            { preference_type: 'triggers', value_json: { dislikes: form.dislikes_or_triggers } },
          ],
          consents: form.consents,
          enabled_monitoring_codes: form.enabled_monitoring_codes,
          simplified_screen: {
            enabled: form.simplified_screen_enabled,
            buttons: form.simplified_buttons,
            emergency_button: form.emergency_button_enabled,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.code === 'PLAN_LIMIT_REACHED') {
          setLimitReached(true);
          setErrorMessage(data.error);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Erro ao realizar cadastro.');
      }

      const createdId = data.caredPersonId || data.person?.id;

      // 2. Upload photo if selected
      if (photoFile && createdId) {
        try {
          const photoData = new FormData();
          photoData.append('photo', photoFile);
          await fetch(`/api/cared-people/${createdId}/photo`, {
            method: 'POST',
            body: photoData,
          });
        } catch (photoErr) {
          console.warn('Foto não pôde ser enviada agora:', photoErr);
        }
      }

      // 3. Clear draft
      if (typeof window !== 'undefined' && currentOrganizationId) {
        localStorage.removeItem(`pc_wizard_draft_${currentOrganizationId}`);
      }

      toast({
        title: 'Pessoa cuidada cadastrada com sucesso!',
        description: `${form.full_name} agora possui um perfil completo e exclusivo.`,
      });

      await refreshCaredPeople();
      if (createdId) setSelectedPersonId(createdId);
      router.push(`/${locale}/dashboard/cared-people/${createdId}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    if (!searchFilter.trim()) return MONITORING_CATALOG;
    const term = searchFilter.toLowerCase();
    return MONITORING_CATALOG.map((cat) => ({
      ...cat,
      definitions: cat.definitions.filter(
        (d) => d.name.toLowerCase().includes(term) || d.description.toLowerCase().includes(term)
      ),
    })).filter((cat) => cat.definitions.length > 0);
  }, [searchFilter]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <Link href={`/${locale}/dashboard`} className="hover:underline">Painel</Link>
              <span>/</span>
              <span className="text-stone-800 dark:text-stone-300 font-medium">Cadastro Individual</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-brand-green" /> Perfil Completo da Pessoa Cuidada
            </h1>
            <p className="text-sm text-stone-500">
              Cada familiar possui seu próprio histórico, rotina, contatos e tela simplificada sem compartilhar registros com terceiros.
            </p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto bg-emerald-50 text-emerald-800 border-emerald-300">
            Etapa {step} de 9
          </Badge>
        </div>

        {/* Step Progress Pills (Horizontal scrollable) */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 min-w-max">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isCurrent = step === s.id;
              const isDone = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-brand-green text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 cursor-pointer hover:bg-emerald-200'
                      : 'bg-stone-200/70 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                    isDone ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-white/20 text-white' : 'bg-stone-300 dark:bg-stone-700 text-stone-500'
                  }`}>
                    {isDone ? <Check className="h-3 w-3" /> : s.id}
                  </div>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error / Plan Limit Alert */}
        {errorMessage && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            limitReached
              ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
              : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
          }`}>
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">{limitReached ? 'Limite de Pessoas Cuidadas' : 'Atenção'}</p>
              <p className="mt-0.5">{errorMessage}</p>
              {limitReached && (
                <div className="mt-3">
                  <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Link href={`/${locale}/dashboard/settings/subscription`}>
                      Ver Planos & Fazer Upgrade
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: IDENTIFICATION                                                    */}
        {/* ========================================================================= */}
        {step === 1 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">1. Identificação Básica</CardTitle>
              <CardDescription>
                Informações civis e de identificação pessoal de quem receberá o cuidado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-stone-100 dark:border-stone-800">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-full border-2 border-dashed border-stone-300 dark:border-stone-700 flex flex-col items-center justify-center overflow-hidden bg-stone-100 dark:bg-stone-800 text-stone-400">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Foto" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UploadCloud className="h-6 w-6" />
                        <span className="text-[10px] mt-1">Foto</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Adicionar foto"
                  />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Foto do Familiar (Opcional)</p>
                  <p className="text-xs text-stone-500">
                    Ajuda familiares e cuidadores a identificarem a pessoa no painel. JPG ou PNG de até 5MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="Ex: Helena Antônia Silveira"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_name">Como prefere ser chamado(a)?</Label>
                  <Input
                    id="preferred_name"
                    value={form.preferred_name}
                    onChange={(e) => updateField('preferred_name', e.target.value)}
                    placeholder="Ex: Dona Helena, Vovó, Mãe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship">Grau de Parentesco / Relação</Label>
                  <Select value={form.relationship} onValueChange={(val) => updateField('relationship', val)}>
                    <SelectTrigger id="relationship">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mother">Mãe</SelectItem>
                      <SelectItem value="father">Pai</SelectItem>
                      <SelectItem value="grandmother">Avó</SelectItem>
                      <SelectItem value="grandfather">Avô</SelectItem>
                      <SelectItem value="uncle_aunt">Tio(a)</SelectItem>
                      <SelectItem value="spouse">Cônjuge</SelectItem>
                      <SelectItem value="other_family">Outro Familiar</SelectItem>
                      <SelectItem value="client">Cliente / Paciente</SelectItem>
                      <SelectItem value="resident">Residente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => updateField('birth_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender_identity">Gênero</Label>
                  <Select value={form.gender_identity} onValueChange={(val) => updateField('gender_identity', val)}>
                    <SelectTrigger id="gender_identity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="non_binary">Não-binário</SelectItem>
                      <SelectItem value="other">Outro / Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_language">Idioma de Preferência</Label>
                  <Select value={form.preferred_language} onValueChange={(val) => updateField('preferred_language', val)}>
                    <SelectTrigger id="preferred_language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select value={form.timezone} onValueChange={(val) => updateField('timezone', val)}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                      <SelectItem value="America/New_York">New York (EST)</SelectItem>
                      <SelectItem value="Europe/Lisbon">Lisboa (WET)</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid / Paris (CET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile_type">Tipo de Perfil</Label>
                  <Select value={form.profile_type} onValueChange={(val: any) => updateField('profile_type', val)}>
                    <SelectTrigger id="profile_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family_member">Familiar sob Cuidado</SelectItem>
                      <SelectItem value="professional_care">Atendido por Cuidador Profissional</SelectItem>
                      <SelectItem value="nursing_home_resident">Residente de ILPI / Casa Repouso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Anotações Importantes de Identificação (Opcional)</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Ex: Chamar sempre com calma; usa aparelho auditivo no ouvido esquerdo."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CONTACT & LOCATION                                                */}
        {/* ========================================================================= */}
        {step === 2 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">2. Contato & Localização da Residência</CardTitle>
              <CardDescription>
                Onde a pessoa cuidada reside e como contatá-la diretamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone Fixo / Residencial</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="Ex: (11) 3456-7890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Celular / WhatsApp do Idoso</Label>
                  <Input
                    id="whatsapp"
                    value={form.whatsapp}
                    onChange={(e) => updateField('whatsapp', e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail (se tiver)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="idoso@email.com"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">Endereço de Moradia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3 space-y-2">
                    <Label htmlFor="street">Logradouro (Rua, Avenida)</Label>
                    <Input
                      id="street"
                      value={form.street}
                      onChange={(e) => updateField('street', e.target.value)}
                      placeholder="Rua das Flores"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={form.number}
                      onChange={(e) => updateField('number', e.target.value)}
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento (Apto, Bloco)</Label>
                    <Input
                      id="complement"
                      value={form.complement}
                      onChange={(e) => updateField('complement', e.target.value)}
                      placeholder="Apto 42"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="São Paulo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal / CEP</Label>
                    <Input
                      id="postal_code"
                      value={form.postal_code}
                      onChange={(e) => updateField('postal_code', e.target.value)}
                      placeholder="01234-567"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Dinâmica da Residência</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                    <Switch
                      checked={form.lives_alone}
                      onCheckedChange={(val) => updateField('lives_alone', val)}
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-stone-800 dark:text-stone-200">Mora sozinho(a)</p>
                      <p className="text-stone-500">Requer maior atenção e checagens frequentes</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                    <Switch
                      checked={form.has_caregiver}
                      onCheckedChange={(val) => updateField('has_caregiver', val)}
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-stone-800 dark:text-stone-200">Possui cuidador formal/escala</p>
                      <p className="text-stone-500">Presença de profissional contratado no local</p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: EMERGENCY & GUARDIANS                                             */}
        {/* ========================================================================= */}
        {step === 3 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">3. Responsáveis & Linha de Emergência</CardTitle>
                  <CardDescription>
                    Pessoas que devem ser avisadas imediatamente em qualquer imprevisto ou acionamento de SOS.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1.5 text-xs">
                  <Plus className="h-4 w-4" /> Adicionar Contato
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Regra de Segurança:</strong> O botão de emergência (SOS) no celular do idoso somente é habilitado após existir pelo menos 1 contato com telefone válido.
                </span>
              </div>

              {form.contacts.map((contact, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-bold">
                        Contato #{idx + 1}
                      </Badge>
                      {contact.is_primary && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Principal Responsável
                        </Badge>
                      )}
                      {contact.is_emergency && (
                        <Badge variant="destructive" className="text-[10px]">
                          Alerta SOS
                        </Badge>
                      )}
                    </div>
                    {form.contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(idx)}
                        className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => updateContact(idx, 'name', e.target.value)}
                        placeholder="Ex: Carlos Eduardo (Filho)"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Grau de Parentesco</Label>
                      <Input
                        value={contact.relationship}
                        onChange={(e) => updateContact(idx, 'relationship', e.target.value)}
                        placeholder="Ex: Filho mais velho, Vizinha"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone / Celular *</Label>
                      <Input
                        value={contact.phone}
                        onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                        placeholder="(11) 99999-8888"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={contact.is_primary}
                        onCheckedChange={(val) => updateContact(idx, 'is_primary', val)}
                      />
                      <span>Contato Principal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={contact.is_emergency}
                        onCheckedChange={(val) => updateContact(idx, 'is_emergency', val)}
                      />
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Receber Alerta de Emergência SOS</span>
                    </label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: HEALTH & IMPORTANT INFO                                           */}
        {/* ========================================================================= */}
        {step === 4 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">4. Informações Médicas & Cuidados Importantes</CardTitle>
              <CardDescription>
                Dados críticos para socorristas, médicos e cuidadores em caso de atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blood_type">Tipo Sanguíneo</Label>
                  <Select value={form.blood_type} onValueChange={(val) => updateField('blood_type', val)}>
                    <SelectTrigger id="blood_type">
                      <SelectValue />
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
                      <SelectItem value="unknown">Não sabe / Não informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobility_status">Mobilidade</Label>
                  <Select value={form.mobility_status} onValueChange={(val) => updateField('mobility_status', val)}>
                    <SelectTrigger id="mobility_status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">Caminha sem apoio</SelectItem>
                      <SelectItem value="cane">Usa bengala</SelectItem>
                      <SelectItem value="walker">Usa andador</SelectItem>
                      <SelectItem value="wheelchair">Cadeira de rodas</SelectItem>
                      <SelectItem value="bedridden">Acamado(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hearing_vision">Visão & Audição</Label>
                  <Select value={form.hearing_vision_impairment} onValueChange={(val) => updateField('hearing_vision_impairment', val)}>
                    <SelectTrigger id="hearing_vision">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Preservadas</SelectItem>
                      <SelectItem value="glasses">Usa óculos de grau</SelectItem>
                      <SelectItem value="hearing_aid">Usa aparelho auditivo</SelectItem>
                      <SelectItem value="both">Usa óculos e aparelho auditivo</SelectItem>
                      <SelectItem value="severe">Dificuldade acentuada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Allergies tag manager */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Label>Alergias Medicamentosas ou Alimentares</Label>
                <div className="flex gap-2">
                  <Input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Ex: Dipirona, Penicilina, Frutos do mar..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newAllergy.trim()) {
                        e.preventDefault();
                        updateField('allergies', [...form.allergies, newAllergy.trim()]);
                        setNewAllergy('');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newAllergy.trim()) {
                        updateField('allergies', [...form.allergies, newAllergy.trim()]);
                        setNewAllergy('');
                      }
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.allergies.map((a, i) => (
                    <Badge key={i} variant="destructive" className="gap-1.5 text-xs py-1">
                      {a}
                      <button
                        type="button"
                        onClick={() => updateField('allergies', form.allergies.filter((_, idx) => idx !== i))}
                        className="hover:opacity-75"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {form.allergies.length === 0 && (
                    <span className="text-xs text-stone-400">Nenhuma alergia cadastrada.</span>
                  )}
                </div>
              </div>

              {/* Health insurance */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">Plano de Saúde / Convênio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do Convênio</Label>
                    <Input
                      value={form.health_insurance.plan_name}
                      onChange={(e) => updateField('health_insurance', { ...form.health_insurance, plan_name: e.target.value })}
                      placeholder="Ex: Unimed, Bradesco, SUS"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Número da Carteirinha</Label>
                    <Input
                      value={form.health_insurance.policy_number}
                      onChange={(e) => updateField('health_insurance', { ...form.health_insurance, policy_number: e.target.value })}
                      placeholder="000.12345.678"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hospital de Preferência</Label>
                    <Input
                      value={form.health_insurance.hospital_preference}
                      onChange={(e) => updateField('health_insurance', { ...form.health_insurance, hospital_preference: e.target.value })}
                      placeholder="Ex: Hospital Santa Catarina"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: ROUTINE & PREFERENCES                                             */}
        {/* ========================================================================= */}
        {step === 5 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">5. Rotina, Hábitos & Preferências Pessoais</CardTitle>
              <CardDescription>
                Detalhes que preservam o conforto, a dignidade e o bem-estar psicológico do idoso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wake_time">Horário habitual de acordar</Label>
                  <Input
                    id="wake_time"
                    type="time"
                    value={form.wake_time}
                    onChange={(e) => updateField('wake_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sleep_time">Horário habitual de dormir</Label>
                  <Input
                    id="sleep_time"
                    type="time"
                    value={form.sleep_time}
                    onChange={(e) => updateField('sleep_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comfort_actions">O que acalma ou conforta nos momentos difíceis?</Label>
                <Input
                  id="comfort_actions"
                  value={form.comfort_actions}
                  onChange={(e) => updateField('comfort_actions', e.target.value)}
                  placeholder="Ex: Ouvir rádio de manhã, café morno, fotos de família na sala..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dislikes">O que causa irritação ou desconforto (Gatilhos)?</Label>
                <Input
                  id="dislikes"
                  value={form.dislikes_or_triggers}
                  onChange={(e) => updateField('dislikes_or_triggers', e.target.value)}
                  placeholder="Ex: Pessoas falando muito alto ao mesmo tempo, banho frio..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comm_style">Estilo de comunicação recomendado aos cuidadores</Label>
                <Input
                  id="comm_style"
                  value={form.communication_style}
                  onChange={(e) => updateField('communication_style', e.target.value)}
                  placeholder="Ex: Falar de frente olhando nos olhos, frases curtas, tom calmo."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: MONITORING SETTINGS                                               */}
        {/* ========================================================================= */}
        {step === 6 && (
          <div className="space-y-4">
            <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">6. Seleção de Acompanhamentos Ativos</CardTitle>
                    <CardDescription>
                      Marque apenas o que faz sentido acompanhar na rotina de {form.preferred_name || form.full_name.split(' ')[0]}.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold px-3 py-1">
                    {form.enabled_monitoring_codes.length} selecionado(s)
                  </Badge>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Filtrar acompanhamentos (medicamentos, água, sono, humor...)"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              {filteredCatalog.map((category) => (
                <Card key={category.id} className="border-stone-200 dark:border-stone-800 overflow-hidden">
                  <div className="bg-stone-100/60 dark:bg-stone-900/60 px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 font-bold text-sm text-stone-800 dark:text-stone-200">
                    {category.name}
                  </div>
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.definitions.map((def) => {
                      const isChecked = form.enabled_monitoring_codes.includes(def.code);
                      return (
                        <label
                          key={def.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                          }`}
                        >
                          <Switch
                            checked={isChecked}
                            onCheckedChange={() => handleToggleMonitoring(def.code)}
                            className="mt-0.5"
                          />
                          <div className="text-xs space-y-0.5">
                            <span className={`font-semibold ${isChecked ? 'text-emerald-950 dark:text-emerald-200' : 'text-stone-900 dark:text-stone-100'}`}>
                              {def.name}
                            </span>
                            <p className="text-stone-500 line-clamp-2 leading-relaxed">{def.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: SIMPLIFIED SCREEN                                                 */}
        {/* ========================================================================= */}
        {step === 7 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">7. Tela Simplificada para o Idoso</CardTitle>
              <CardDescription>
                Configure a interface acessível de botões grandes que o idoso acessará no próprio celular ou tablet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="space-y-0.5">
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">Habilitar Tela Simplificada</p>
                  <p className="text-xs text-stone-500">
                    A pessoa cuidada terá um link direto com letras grandes e botões de um toque.
                  </p>
                </div>
                <Switch
                  checked={form.simplified_screen_enabled}
                  onCheckedChange={(val) => updateField('simplified_screen_enabled', val)}
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-rose-900 dark:text-rose-200 text-sm">Botão de Emergência SOS Gigante</p>
                    <Badge variant="destructive" className="text-[10px]">Alerta</Badge>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-400">
                    Ao tocar, envia alerta imediato para os contatos prioritários configurados na Etapa 3.
                  </p>
                </div>
                <Switch
                  checked={form.emergency_button_enabled}
                  onCheckedChange={(val) => updateField('emergency_button_enabled', val)}
                />
              </label>

              <div className="p-4 bg-stone-100 dark:bg-stone-900 rounded-xl text-xs text-stone-600 dark:text-stone-400 space-y-1">
                <p className="font-semibold text-stone-800 dark:text-stone-200">ℹ️ Regra de Assento Grátis:</p>
                <p>
                  O idoso que acessa somente a tela simplificada <strong>não consome assento pago</strong> de membro familiar ou cuidador profissional.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 8: CONSENTS & PRIVACY                                                */}
        {/* ========================================================================= */}
        {step === 8 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">8. Privacidade & Termos de Consentimento</CardTitle>
              <CardDescription>
                Consentimentos explícitos e granulares conforme normas de proteção de dados de saúde.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                <Switch
                  checked={form.consents.data_processing}
                  onCheckedChange={(val) =>
                    updateField('consents', { ...form.consents, data_processing: val })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    Tratamento de Dados para Organização do Cuidado *
                  </p>
                  <p className="text-stone-500">
                    Autorizo o armazenamento dos dados de rotina, medicamentos e alimentação para uso exclusivo da família e cuidadores autorizados.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                <Switch
                  checked={form.consents.emergency_sharing}
                  onCheckedChange={(val) =>
                    updateField('consents', { ...form.consents, emergency_sharing: val })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    Compartilhamento Rápido em Caso de Emergência
                  </p>
                  <p className="text-stone-500">
                    Permite exibir alergias e tipo sanguíneo em tela de emergência acessível para paramédicos ou socorristas.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer">
                <Switch
                  checked={form.consents.professional_care}
                  onCheckedChange={(val) =>
                    updateField('consents', { ...form.consents, professional_care: val })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    Acesso para Cuidadores Profissionais
                  </p>
                  <p className="text-stone-500">
                    Autorizo cuidadores com login ativo na organização a registrarem passagens de turno, refeições e medicações.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 9: REVIEW & CONFIRMATION                                             */}
        {/* ========================================================================= */}
        {step === 9 && (
          <div className="space-y-4">
            <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-green/10 text-brand-green rounded-xl">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">9. Revisão & Confirmação Final</CardTitle>
                    <CardDescription>
                      Confira os dados antes de ativar o perfil exclusivo de {form.preferred_name || form.full_name}.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs divide-y divide-stone-100 dark:divide-stone-800">
                <div className="pt-2 flex justify-between items-start">
                  <div>
                    <span className="text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Identificação</span>
                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-0.5">{form.full_name}</p>
                    <p className="text-stone-500">
                      Chamado(a) carinhosamente de &quot;{form.preferred_name || form.full_name.split(' ')[0]}&quot; • {form.relationship}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-brand-green h-7 text-xs">
                    Editar
                  </Button>
                </div>

                <div className="pt-3 flex justify-between items-start">
                  <div>
                    <span className="text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Contatos de Emergência</span>
                    <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                      {form.contacts.filter(c => c.name.trim()).length} contato(s) cadastrado(s)
                    </p>
                    <p className="text-stone-500">
                      Principal: {form.contacts[0]?.name || 'Nenhum'} ({form.contacts[0]?.phone || 'Sem telefone'})
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-brand-green h-7 text-xs">
                    Editar
                  </Button>
                </div>

                <div className="pt-3 flex justify-between items-start">
                  <div>
                    <span className="text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Saúde & Alergias</span>
                    <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                      Tipo Sanguíneo: {form.blood_type}
                    </p>
                    <p className="text-stone-500">
                      {form.allergies.length > 0 ? `Alergias: ${form.allergies.join(', ')}` : 'Nenhuma alergia relatada'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(4)} className="text-brand-green h-7 text-xs">
                    Editar
                  </Button>
                </div>

                <div className="pt-3 flex justify-between items-start">
                  <div>
                    <span className="text-stone-400 font-semibold uppercase tracking-wider text-[10px]">Acompanhamentos Ativos</span>
                    <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                      {form.enabled_monitoring_codes.length} rotinas ativadas
                    </p>
                    <p className="text-stone-500">
                      Tela simplificada para o idoso: {form.simplified_screen_enabled ? 'Habilitada' : 'Desabilitada'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(6)} className="text-brand-green h-7 text-xs">
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FOOTER ACTIONS                                                            */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? () => router.back() : handleBack}
            disabled={loading}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step < 9 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-brand-green hover:bg-brand-green/90 text-white gap-1.5 text-xs sm:text-sm px-5"
            >
              Avançar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-brand-green hover:bg-brand-green/90 text-white gap-2 text-sm px-6 font-bold shadow-md"
            >
              {loading ? 'Criando Perfil...' : 'Concluir e Criar Perfil'} <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
