import { ptBR, enUS, es, fr, de } from 'date-fns/locale';

export type SupportedLocale = 'pt-BR' | 'en' | 'es' | 'fr' | 'de';

export function normalizeLocale(raw?: string): SupportedLocale {
  if (!raw) return 'pt-BR';
  const lower = raw.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('en')) return 'en';
  return 'pt-BR';
}

export function getDateFnsLocale(raw?: string) {
  const loc = normalizeLocale(raw);
  switch (loc) {
    case 'en': return enUS;
    case 'es': return es;
    case 'fr': return fr;
    case 'de': return de;
    default: return ptBR;
  }
}

export function getSpeechSynthesisLang(raw?: string): string {
  const loc = normalizeLocale(raw);
  switch (loc) {
    case 'en': return 'en-US';
    case 'es': return 'es-ES';
    case 'fr': return 'fr-FR';
    case 'de': return 'de-DE';
    default: return 'pt-BR';
  }
}

export interface CareTexts {
  appointmentAlarmTitle: string;
  scheduledFor: string;
  doctorLabel: string;
  locationLabel: string;
  listenAgain: string;
  confirmSeen: string;
  snooze10m: string;
  alarmActive: string;
  listenAlarmBtn: string;
  testAlarmBtn: string;
  nextAppointment: string;
  noPending: string;
  demoTitle: string;
  demoText: string;
  demoSpeech: (name: string) => string;
  alarmSpeech: (params: { name: string; title: string; time: string; doctor?: string | null; location?: string | null }) => string;
}

export const CARE_TRANSLATIONS: Record<SupportedLocale, CareTexts> = {
  'pt-BR': {
    appointmentAlarmTitle: '⏰ Despertador de Compromisso',
    scheduledFor: 'Marcado para',
    doctorLabel: 'Médico(a)',
    locationLabel: 'Local',
    listenAgain: 'Ouvir em Voz Alta Novamente',
    confirmSeen: '✓ OK, Já Vi / Já Estou Ciente!',
    snooze10m: '💤 Lembrar em 10 minutos (Soneca)',
    alarmActive: 'Despertador Ativo',
    listenAlarmBtn: '🔔 Ouvir Despertador',
    testAlarmBtn: '🔔 Testar Despertador',
    nextAppointment: 'Próximo Compromisso',
    noPending: 'Nenhum agendamento pendente',
    demoTitle: 'Teste do Despertador',
    demoText: 'O som e a voz em português estão funcionando perfeitamente!',
    demoSpeech: (name) => `Olá, ${name}! Este é um teste do despertador de consultas do Parent Care. O som e a voz estão funcionando perfeitamente!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Atenção, ${name}! Lembrete do seu compromisso: ${title}, hoje às ${time}.${doctor ? ` Com ${doctor}.` : ''}${location ? ` No local: ${location}.` : ''}`,
  },
  en: {
    appointmentAlarmTitle: '⏰ Appointment Alarm',
    scheduledFor: 'Scheduled for',
    doctorLabel: 'Doctor / Specialist',
    locationLabel: 'Location',
    listenAgain: 'Listen Out Loud Again',
    confirmSeen: "✓ OK, I'm Ready / I Got It!",
    snooze10m: '💤 Remind in 10 minutes (Snooze)',
    alarmActive: 'Alarm Active',
    listenAlarmBtn: '🔔 Listen Alarm',
    testAlarmBtn: '🔔 Test Alarm',
    nextAppointment: 'Next Appointment',
    noPending: 'No pending appointments',
    demoTitle: 'Alarm Clock Test',
    demoText: 'Sound and voice are working perfectly!',
    demoSpeech: (name) => `Hello, ${name}! This is a test of the Parent Care appointment alarm. The sound and voice are working perfectly!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Attention, ${name}! Reminder for your appointment: ${title}, today at ${time}.${doctor ? ` With ${doctor}.` : ''}${location ? ` At: ${location}.` : ''}`,
  },
  es: {
    appointmentAlarmTitle: '⏰ Alarma de Cita Médica',
    scheduledFor: 'Programada para',
    doctorLabel: 'Médico(a)',
    locationLabel: 'Ubicación / Lugar',
    listenAgain: 'Escuchar en Voz Alta de Nuevo',
    confirmSeen: '✓ ¡OK, Entendido / Ya lo vi!',
    snooze10m: '💤 Recordar en 10 minutos (Posponer)',
    alarmActive: 'Alarma Activa',
    listenAlarmBtn: '🔔 Escuchar Alarma',
    testAlarmBtn: '🔔 Probar Alarma',
    nextAppointment: 'Próxima Cita',
    noPending: 'Sin citas pendientes',
    demoTitle: 'Prueba de Alarma',
    demoText: '¡El sonido y la voz en español funcionan perfectamente!',
    demoSpeech: (name) => `¡Hola, ${name}! Esta es una prueba de la alarma de citas de Parent Care. ¡El sonido y la voz funcionan perfectamente!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `¡Atención, ${name}! Recordatorio de su cita: ${title}, hoy a las ${time}.${doctor ? ` Con ${doctor}.` : ''}${location ? ` En: ${location}.` : ''}`,
  },
  fr: {
    appointmentAlarmTitle: '⏰ Alarme de Rendez-vous',
    scheduledFor: 'Prévu pour',
    doctorLabel: 'Médecin / Spécialiste',
    locationLabel: 'Lieu / Adresse',
    listenAgain: 'Réécouter à Voix Haute',
    confirmSeen: "✓ OK, C'est Compris!",
    snooze10m: '💤 Rappeler dans 10 minutes (Répéter)',
    alarmActive: 'Alarme Active',
    listenAlarmBtn: "🔔 Écouter l'alarme",
    testAlarmBtn: "🔔 Tester l'alarme",
    nextAppointment: 'Prochain Rendez-vous',
    noPending: 'Aucun rendez-vous prévu',
    demoTitle: "Test de l'Alarme",
    demoText: 'Le son et la voix en français fonctionnent parfaitement!',
    demoSpeech: (name) => `Bonjour, ${name}! Ceci est un test de l'alarme de rendez-vous Parent Care. Le son et la voix fonctionnent parfaitement!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Attention, ${name}! Rappel pour votre rendez-vous: ${title}, aujourd'hui à ${time}.${doctor ? ` Avec ${doctor}.` : ''}${location ? ` Lieu: ${location}.` : ''}`,
  },
  de: {
    appointmentAlarmTitle: '⏰ Terminerinnerung & Wecker',
    scheduledFor: 'Geplant für',
    doctorLabel: 'Arzt / Facharzt',
    locationLabel: 'Ort / Adresse',
    listenAgain: 'Nochmals laut vorlesen',
    confirmSeen: '✓ OK, Ich habe es gesehen!',
    snooze10m: '💤 In 10 Minuten erinnern (Schlummern)',
    alarmActive: 'Wecker Aktiv',
    listenAlarmBtn: '🔔 Wecker anhören',
    testAlarmBtn: '🔔 Wecker testen',
    nextAppointment: 'Nächster Termin',
    noPending: 'Keine anstehenden Termine',
    demoTitle: 'Wecker-Test',
    demoText: 'Ton und deutsche Sprachausgabe funktionieren einwandfrei!',
    demoSpeech: (name) => `Hallo, ${name}! Dies ist ein Test des Terminerinnerungs-Weckers von Parent Care. Ton und Stimme funktionieren einwandfrei!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Achtung, ${name}! Erinnerung an Ihren Termin: ${title}, heute um ${time}.${doctor ? ` Mit ${doctor}.` : ''}${location ? ` Ort: ${location}.` : ''}`,
  },
};

export function getCareTexts(rawLocale?: string): CareTexts {
  const loc = normalizeLocale(rawLocale);
  return CARE_TRANSLATIONS[loc] || CARE_TRANSLATIONS['pt-BR'];
}

export interface AlarmI18n {
  label: string;
  subtext: string;
  none: string;
  exact: string;
  '15m': string;
  '30m': string;
  '1h': string;
  morning: string;
  badgePrefix: string;
}

export const ALARM_I18N: Record<SupportedLocale, AlarmI18n> = {
  'pt-BR': {
    label: 'Despertador / Alarme para o Idoso',
    subtext: 'O tablet ou celular do idoso tocará um alerta sonoro e falará o compromisso em voz alta.',
    none: 'Sem alarme sonoro',
    exact: '⏰ No horário exato do agendamento',
    '15m': '⏰ 15 minutos antes (Recomendado)',
    '30m': '⏰ 30 minutos antes',
    '1h': '⏰ 1 hora antes',
    morning: '⏰ Às 08:00 da manhã do dia',
    badgePrefix: 'Alarme',
  },
  en: {
    label: 'Elder Appointment Alarm Clock',
    subtext: "The elder's tablet or phone will play a musical chime and speak the appointment out loud.",
    none: 'No sound alarm',
    exact: '⏰ At exact appointment time',
    '15m': '⏰ 15 minutes before (Recommended)',
    '30m': '⏰ 30 minutes before',
    '1h': '⏰ 1 hour before',
    morning: '⏰ At 08:00 AM on the day',
    badgePrefix: 'Alarm',
  },
  es: {
    label: 'Alarma / Despertador para el Adulto Mayor',
    subtext: 'La tableta o móvil de la persona mayor tocará una campana y hablará la cita en voz alta.',
    none: 'Sin alarma sonora',
    exact: '⏰ A la hora exacta de la cita',
    '15m': '⏰ 15 minutos antes (Recomendado)',
    '30m': '⏰ 30 minutos antes',
    '1h': '⏰ 1 hora antes',
    morning: '⏰ A las 08:00 de la mañana del día',
    badgePrefix: 'Alarma',
  },
  fr: {
    label: 'Réveil / Alarme pour la Personne Âgée',
    subtext: "La tablette ou le téléphone de la personne âgée sonnera et lira le rendez-vous à voix haute.",
    none: 'Sans alarme sonore',
    exact: "⏰ À l'heure exacte du rendez-vous",
    '15m': '⏰ 15 minutes avant (Recommandé)',
    '30m': '⏰ 30 minutes avant',
    '1h': '⏰ 1 heure avant',
    morning: '⏰ À 08h00 du matin le jour même',
    badgePrefix: 'Alarme',
  },
  de: {
    label: 'Erinnerungs-Wecker für den Senior',
    subtext: 'Das Tablet oder Smartphone des Seniors spielt einen Ton und liest den Termin laut vor.',
    none: 'Kein akustischer Alarm',
    exact: '⏰ Zur genauen Uhrzeit des Termins',
    '15m': '⏰ 15 Minuten vorher (Empfohlen)',
    '30m': '⏰ 30 Minuten vorher',
    '1h': '⏰ 1 Stunde vorher',
    morning: '⏰ Um 08:00 Uhr morgens am Termintag',
    badgePrefix: 'Wecker',
  },
};

export function getAlarmTexts(rawLocale?: string): AlarmI18n {
  const loc = normalizeLocale(rawLocale);
  return ALARM_I18N[loc] || ALARM_I18N['pt-BR'];
}

export interface FinanceI18n {
  title: string;
  subtitle: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  availableBalance: string;
  pensionConfig: string;
  incomeSource: string;
  incomeAmount: string;
  incomeDay: string;
  spentSoFar: string;
  remaining: string;
  overBudget: string;
  addExpense: string;
  editIncome: string;
  saveIncome: string;
  saveExpense: string;
  categoryPharmacy: string;
  categoryMarket: string;
  categoryDoctor: string;
  categoryHousing: string;
  categoryOther: string;
  expenseAdded: string;
  incomeUpdated: string;
  selfManagementTitle: string;
  selfManagementDesc: string;
  budgetUsed: string;
  noExpensesThisMonth: string;
}

export const FINANCE_I18N: Record<SupportedLocale, FinanceI18n> = {
  'pt-BR': {
    title: 'Gestão Financeira do Idoso',
    subtitle: 'Controle de aposentadoria, despesas e saldo disponível no mês.',
    monthlyIncome: 'Aposentadoria / Renda',
    monthlyExpenses: 'Gastos Abatidos',
    availableBalance: 'Saldo Disponível',
    pensionConfig: 'Configurar Aposentadoria',
    incomeSource: 'Fonte da Renda (ex: INSS)',
    incomeAmount: 'Valor Mensal (R$)',
    incomeDay: 'Dia do Recebimento',
    spentSoFar: 'Gasto até agora',
    remaining: 'restante',
    overBudget: 'Orçamento Ultrapassado!',
    addExpense: 'Anotar Gasto',
    editIncome: 'Ajustar Renda',
    saveIncome: 'Salvar Aposentadoria',
    saveExpense: 'Salvar Gasto',
    categoryPharmacy: 'Farmácia / Remédio',
    categoryMarket: 'Mercado / Alimentos',
    categoryDoctor: 'Médico / Exame',
    categoryHousing: 'Contas da Casa',
    categoryOther: 'Outros Gastos',
    expenseAdded: 'Gasto anotado! Seu saldo foi atualizado.',
    incomeUpdated: 'Renda mensal atualizada com sucesso!',
    selfManagementTitle: 'Meu Dinheiro & Gastos',
    selfManagementDesc: 'Acompanhe sua aposentadoria e anote o que você gastou.',
    budgetUsed: 'do orçamento usado',
    noExpensesThisMonth: 'Nenhum gasto registrado neste mês.',
  },
  en: {
    title: 'Senior Financial Management',
    subtitle: 'Pension control, monthly expenses and real-time available balance.',
    monthlyIncome: 'Pension / Monthly Income',
    monthlyExpenses: 'Deducted Expenses',
    availableBalance: 'Available Balance',
    pensionConfig: 'Configure Pension',
    incomeSource: 'Income Source (e.g. Social Security)',
    incomeAmount: 'Monthly Amount ($)',
    incomeDay: 'Payment Day of Month',
    spentSoFar: 'Spent so far',
    remaining: 'remaining',
    overBudget: 'Budget Exceeded!',
    addExpense: 'Log Expense',
    editIncome: 'Adjust Income',
    saveIncome: 'Save Pension',
    saveExpense: 'Save Expense',
    categoryPharmacy: 'Pharmacy / Medicine',
    categoryMarket: 'Groceries / Food',
    categoryDoctor: 'Doctor / Lab Tests',
    categoryHousing: 'Household Bills',
    categoryOther: 'Other Expenses',
    expenseAdded: 'Expense recorded! Balance updated.',
    incomeUpdated: 'Monthly income updated successfully!',
    selfManagementTitle: 'My Money & Expenses',
    selfManagementDesc: 'Track your pension and record what you spent.',
    budgetUsed: 'of budget used',
    noExpensesThisMonth: 'No expenses recorded this month.',
  },
  es: {
    title: 'Gestión Financiera del Adulto Mayor',
    subtitle: 'Control de pensión/jubilación, gastos y saldo disponible en el mes.',
    monthlyIncome: 'Pensión / Jubilación',
    monthlyExpenses: 'Gastos Deducidos',
    availableBalance: 'Saldo Disponible',
    pensionConfig: 'Configurar Pensión',
    incomeSource: 'Fuente de Ingreso (ej. Jubilación)',
    incomeAmount: 'Monto Mensual',
    incomeDay: 'Día de Cobro',
    spentSoFar: 'Gastado hasta ahora',
    remaining: 'restante',
    overBudget: '¡Presupuesto Excedido!',
    addExpense: 'Anotar Gasto',
    editIncome: 'Ajustar Ingreso',
    saveIncome: 'Guardar Pensión',
    saveExpense: 'Guardar Gasto',
    categoryPharmacy: 'Farmacia / Medicina',
    categoryMarket: 'Supermercado / Comida',
    categoryDoctor: 'Médico / Exámenes',
    categoryHousing: 'Cuentas del Hogar',
    categoryOther: 'Otros Gastos',
    expenseAdded: '¡Gasto registrado! Saldo actualizado.',
    incomeUpdated: '¡Ingreso mensual actualizado con éxito!',
    selfManagementTitle: 'Mi Dinero y Gastos',
    selfManagementDesc: 'Controla tu pensión y anota tus gastos.',
    budgetUsed: 'del presupuesto usado',
    noExpensesThisMonth: 'Sin gastos registrados este mes.',
  },
  fr: {
    title: 'Gestion Financière des Aînés',
    subtitle: 'Contrôle des pensions, dépenses et solde disponible.',
    monthlyIncome: 'Pension / Revenu Mensuel',
    monthlyExpenses: 'Dépenses Déduites',
    availableBalance: 'Solde Disponible',
    pensionConfig: 'Configurer la Pension',
    incomeSource: 'Source du Revenu (ex: Retraite)',
    incomeAmount: 'Montant Mensuel',
    incomeDay: 'Jour de Versement',
    spentSoFar: 'Dépensé jusqu’ici',
    remaining: 'restant',
    overBudget: 'Budget Dépassé !',
    addExpense: 'Noter une Dépense',
    editIncome: 'Ajuster le Revenu',
    saveIncome: 'Enregistrer la Pension',
    saveExpense: 'Enregistrer la Dépense',
    categoryPharmacy: 'Pharmacie / Médicaments',
    categoryMarket: 'Épicerie / Nourriture',
    categoryDoctor: 'Médecin / Examens',
    categoryHousing: 'Factures du Logement',
    categoryOther: 'Autres Dépenses',
    expenseAdded: 'Dépense enregistrée ! Solde mis à jour.',
    incomeUpdated: 'Revenu mensuel mis à jour !',
    selfManagementTitle: 'Mes Finances & Dépenses',
    selfManagementDesc: 'Suivez votre pension et notez vos dépenses.',
    budgetUsed: 'du budget utilisé',
    noExpensesThisMonth: 'Aucune dépense enregistrée ce mois-ci.',
  },
  de: {
    title: 'Finanzmanagement für Senioren',
    subtitle: 'Rentenübersicht, Ausgaben und verfügbares Monatsguthaben.',
    monthlyIncome: 'Rente / Monatseinkommen',
    monthlyExpenses: 'Abgezogene Ausgaben',
    availableBalance: 'Verfügbares Guthaben',
    pensionConfig: 'Rente Konfigurieren',
    incomeSource: 'Einkommensquelle (z. B. Rentenkasse)',
    incomeAmount: 'Monatsbetrag',
    incomeDay: 'Auszahlungstag',
    spentSoFar: 'Bisher ausgegeben',
    remaining: 'verbleibend',
    overBudget: 'Budget Überschritten!',
    addExpense: 'Ausgabe Eintragen',
    editIncome: 'Einkommen Anpassen',
    saveIncome: 'Rente Speichern',
    saveExpense: 'Ausgabe Speichern',
    categoryPharmacy: 'Apotheke / Medikamente',
    categoryMarket: 'Supermarkt / Lebensmittel',
    categoryDoctor: 'Arzt / Untersuchungen',
    categoryHousing: 'Haushaltsrechnungen',
    categoryOther: 'Sonstige Ausgaben',
    expenseAdded: 'Ausgabe verbucht! Guthaben aktualisiert.',
    incomeUpdated: 'Monatseinkommen erfolgreich aktualisiert!',
    selfManagementTitle: 'Mein Geld & Ausgaben',
    selfManagementDesc: 'Behalten Sie Ihre Rente im Blick und notieren Sie Ausgaben.',
    budgetUsed: 'des Budgets verbraucht',
    noExpensesThisMonth: 'Keine Ausgaben in diesem Monat erfasst.',
  },
};

export function getFinanceTexts(rawLocale?: string): FinanceI18n {
  const loc = normalizeLocale(rawLocale);
  return FINANCE_I18N[loc] || FINANCE_I18N['pt-BR'];
}

