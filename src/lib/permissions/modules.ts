export interface ModuleMetadata {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'clinical' | 'daily_care' | 'administrative' | 'social_wellbeing';
}

export const MODULE_CATALOG: ModuleMetadata[] = [
  // Rotina & Cuidado Diário
  { code: 'agenda', name: 'Agenda & Compromissos', description: 'Consultas, visitas e eventos programados', icon: 'Calendar', category: 'daily_care' },
  { code: 'medicamentos', name: 'Medicamentos & Prescrições', description: 'Remédios, dosagens, horários e alertas', icon: 'Pill', category: 'clinical' },
  { code: 'alimentacao', name: 'Alimentação & Refeições', description: 'Cardápios, aceitação e registros de refeições', icon: 'Utensils', category: 'daily_care' },
  { code: 'hidratacao', name: 'Hidratação', description: 'Metas e copos de água consumidos ao longo do dia', icon: 'Droplet', category: 'daily_care' },
  { code: 'rotina', name: 'Rotina Diária & Tarefas', description: 'Horários de acordar, dormir, banho e tarefas da casa', icon: 'CheckSquare', category: 'daily_care' },
  { code: 'humor', name: 'Humor & Disposição', description: 'Registro de estado de ânimo e bem-estar emocional', icon: 'Smile', category: 'social_wellbeing' },
  { code: 'atividades', name: 'Atividades Físicas & Lazer', description: 'Caminhadas, fisioterapia e exercícios', icon: 'Activity', category: 'daily_care' },
  { code: 'autonomia', name: 'Autonomia & Independência', description: 'Grau de independência nas tarefas diárias', icon: 'User', category: 'daily_care' },
  
  // Saúde & Sinais
  { code: 'sinais', name: 'Sinais Vitais', description: 'Pressão arterial, glicose, temperatura e oxigenação', icon: 'Heart', category: 'clinical' },
  { code: 'peso', name: 'Peso & Medidas', description: 'Evolução corporal e acompanhamento nutricional', icon: 'Scale', category: 'clinical' },
  { code: 'quedas', name: 'Quedas & Incidentes', description: 'Registro de quedas, quase-quedas e causas', icon: 'AlertTriangle', category: 'clinical' },
  { code: 'feridas', name: 'Feridas & Lesões (Pele)', description: 'Acompanhamento de escaras, cortes e curativos', icon: 'Bandage', category: 'clinical' },
  { code: 'fraldas', name: 'Uso de Fraldas & Higiene', description: 'Trocas de fraldas e eliminações fisiológicas', icon: 'Baby', category: 'daily_care' },
  { code: 'dispositivos', name: 'Dispositivos & Próteses', description: 'Bengalas, óculos, aparelho auditivo e andadores', icon: 'Tool', category: 'clinical' },
  
  // Gestão & Suporte
  { code: 'documentos', name: 'Documentos & Exames', description: 'Receitas, laudos e prontuários médicos', icon: 'FileText', category: 'administrative' },
  { code: 'despesas', name: 'Despesas & Finanças', description: 'Gastos com farmácia, consultas e pensão', icon: 'DollarSign', category: 'administrative' },
  { code: 'transporte', name: 'Transporte & Mobilidade', description: 'Agendamento de deslocamento para consultas', icon: 'Car', category: 'administrative' },
  { code: 'contatos_emergencia', name: 'Contatos de Emergência', description: 'Lista prioritária de socorro e plano de saúde', icon: 'Phone', category: 'administrative' },
  
  // Comunicação & Equipe
  { code: 'checkin', name: 'Check-ins do Idoso', description: 'Confirmações de rotina ("Estou bem", "Já comi")', icon: 'CheckCircle', category: 'social_wellbeing' },
  { code: 'diario', name: 'Diário de Ocorrências', description: 'Notas diárias e observações dos cuidadores', icon: 'BookOpen', category: 'daily_care' },
  { code: 'passagem_turno', name: 'Passagem de Turno', description: 'Relatório entre cuidadores na troca de plantão', icon: 'RefreshCw', category: 'daily_care' },
  { code: 'relatorios', name: 'Relatórios & Evolução', description: 'Gráficos consolidados para médicos e família', icon: 'BarChart2', category: 'administrative' },
  
  // Jogos & Afeto
  { code: 'jogos', name: 'Jogos e Momentos', description: 'Acesso aos 21 jogos cognitivos e desafios diários', icon: 'Gamepad2', category: 'social_wellbeing' },
  { code: 'historico_jogos', name: 'Histórico & Evolução nos Jogos', description: 'Acompanhamento de estrelas, etapas e memória', icon: 'Trophy', category: 'social_wellbeing' },
  { code: 'fotos', name: 'Fotografias & Memórias da Família', description: 'Álbum familiar com nomes e histórias', icon: 'Image', category: 'social_wellbeing' },
  { code: 'localizacao', name: 'Localização Autorizada', description: 'Localização geográfica e zonas seguras', icon: 'MapPin', category: 'administrative' },
];

export const ACTION_COLUMNS = [
  { key: 'can_view', label: 'Visualizar', desc: 'Consultar dados do módulo' },
  { key: 'can_create', label: 'Criar', desc: 'Inserir novos registros' },
  { key: 'can_edit_own', label: 'Editar Próprios', desc: 'Alterar registros criados por si' },
  { key: 'can_edit_others', label: 'Editar Outros', desc: 'Alterar registros de outros membros' },
  { key: 'can_delete', label: 'Excluir', desc: 'Remover registros' },
  { key: 'can_request_change', label: 'Solicitar', desc: 'Enviar proposta pendente de aprovação' },
  { key: 'can_approve', label: 'Aprovar', desc: 'Aprovar ou rejeitar alterações críticas' },
  { key: 'can_export', label: 'Exportar', desc: 'Baixar dados em PDF/Excel' },
  { key: 'can_share', label: 'Compartilhar', desc: 'Enviar para profissionais externos' },
  { key: 'can_receive_notifications', label: 'Notificações', desc: 'Receber alertas sobre o módulo' },
  { key: 'can_administer', label: 'Administrar', desc: 'Configurar regras do módulo' },
] as const;
