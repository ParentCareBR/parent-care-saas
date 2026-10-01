export interface MedicationReminderParams {
  elderName: string;
  medName: string;
  dosage?: string;
  time: string;
  instructions?: string;
}

export interface AppointmentReminderParams {
  elderName: string;
  title: string;
  time: string;
  doctorName?: string;
  location?: string;
}

export interface MealReminderParams {
  elderName: string;
  mealType: string;
  mealName?: string;
  time: string;
}

export interface EmergencyAlertParams {
  elderName: string;
  time: string;
  description?: string;
  dashboardUrl?: string;
}

export interface HelpAlertParams {
  elderName: string;
  time: string;
  dashboardUrl?: string;
}

export const WhatsAppTemplates = {
  // Lembrete de Medicamento para o Idoso
  medicationReminder: ({ elderName, medName, dosage, time, instructions }: MedicationReminderParams): string => {
    const doseText = dosage ? ` (${dosage})` : '';
    const instText = instructions ? `\n📝 _Dica: ${instructions}_` : '';
    return (
      `Olá, ${elderName}! 🌸\n\n` +
      `Passando com carinho para lembrar do seu remédio das *${time}*:\n` +
      `💊 *${medName}*${doseText}\n` +
      `${instText}\n\n` +
      `💧 Lembre-se de tomar com um copo de água fresca.\n` +
      `Tenha um dia muito abençoado! ❤️\n` +
      `_Parent Care — Cuidando com amor_`
    );
  },

  // Lembrete de Consulta para o Idoso
  appointmentReminder: ({ elderName, title, time, doctorName, location }: AppointmentReminderParams): string => {
    const docText = doctorName ? `\n🩺 *Médico(a):* ${doctorName}` : '';
    const locText = location ? `\n📍 *Local:* ${location}` : '';
    return (
      `Olá, ${elderName}! 🩺\n\n` +
      `Lembrete do seu compromisso hoje:\n` +
      `📅 *${title}*\n` +
      `⏰ Horário: *${time}*` +
      `${docText}` +
      `${locText}\n\n` +
      `Já deixe seus documentos e exames separados com calma! ✨\n` +
      `_Parent Care — Cuidando com amor_`
    );
  },

  // Lembrete de Refeição para o Idoso
  mealReminder: ({ elderName, mealType, mealName, time }: MealReminderParams): string => {
    const desc = mealName ? `: *${mealName}*` : '';
    return (
      `Olá, ${elderName}! 🥣\n\n` +
      `Hora da sua refeição das *${time}* (${mealType})${desc}!\n\n` +
      `Alimentar-se bem e no horário certo mantém sua energia e saúde 100%! 🥗\n` +
      `Bom apetite! ❤️\n` +
      `_Parent Care — Cuidando com amor_`
    );
  },

  // Mensagem de Boas-Vindas / Teste para o Idoso
  testGreeting: (elderName: string): string => {
    return (
      `Olá, ${elderName}! 🌸\n\n` +
      `Este é um teste do seu assistente de cuidados *Parent Care*!\n\n` +
      `A partir de agora, você receberá seus lembretes de remédios e consultas aqui com todo o carinho e no horário certo. ✨\n\n` +
      `Você não precisa fazer nada, apenas cuidar da sua saúde! Tenha um lindo dia! ❤️`
    );
  },

  // Alerta de Emergência SOS para os Cuidadores / Família
  emergencyAlert: ({ elderName, time, description, dashboardUrl }: EmergencyAlertParams): string => {
    const descText = description ? `\nDetalhe: ${description}` : '';
    const link = dashboardUrl || 'https://parentcare-pink.vercel.app/pt-BR/dashboard';
    return (
      `🚨 *ALERTA DE EMERGÊNCIA — PARENT CARE* 🚨\n\n` +
      `*${elderName}* acionou o botão de socorro/SOS às *${time}*!` +
      `${descText}\n\n` +
      `Por favor, entre em contato ou verifique a situação imediatamente:\n` +
      `🔗 Acesse o painel: ${link}`
    );
  },

  // Pedido de Ajuda / Quero Conversar para a Família
  helpAlert: ({ elderName, time, dashboardUrl }: HelpAlertParams): string => {
    const link = dashboardUrl || 'https://parentcare-pink.vercel.app/pt-BR/dashboard';
    return (
      `📞 *PEDIDO DE CONTATO — PARENT CARE*\n\n` +
      `*${elderName}* tocou em *"Quero Conversar / Ajuda"* às *${time}*.\n\n` +
      `Dê uma ligadinha para ele(a) assim que puder para bater um papo carinhoso! ❤️\n` +
      `🔗 Acompanhe: ${link}`
    );
  },
};
