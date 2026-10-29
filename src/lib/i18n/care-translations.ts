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
  // Appointment Alarm
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

  // Header & Status
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  trialDaysLabel: string;
  greeting: (name: string) => string;
  familyConnected: string;
  signOut: string;
  trialBadge: (days: number) => string;
  todaySummary: (count: number) => string;
  allCalm: string;
  emergencySosTitle: string;
  emergencySosSubtitle: string;
  emergencyAlertConfirm: string;

  // Home 8 Cards
  cardMedsTitle: string;
  cardMedsSubtitle: string;
  cardMedsNone: string;
  cardWaterTitle: string;
  cardWaterSubtitle: (cups: number) => string;
  cardMealTitle: string;
  cardMealSubtitle: string;
  cardRoutineTitle: string;
  cardRoutineSubtitle: string;
  cardFamilyTitle: string;
  cardFamilySubtitle: string;
  cardGamesTitle: string;
  cardGamesSubtitle: string;
  cardCallTitle: string;
  cardCallSubtitle: string;
  cardMoodTitle: string;
  cardMoodSubtitle: string;

  // Navigation Tabs
  tabHome: string;
  tabRoutine: string;
  tabGames: string;
  tabActions: string;
  tabFinances: string;

  // Routine View
  routineTitle: string;
  dayYesterday: string;
  dayToday: string;
  dayTomorrow: string;
  filterAll: string;
  filterMeds: string;
  filterMeals: string;
  filterAppts: string;
  filterTasks: string;
  noEventsDay: string;
  backBtn: string;
  completedBadge: string;
  pendingBadge: string;

  // Emotional Moods
  moodGreat: string;
  moodGood: string;
  moodOkay: string;
  moodSad: string;
  moodNeedHelp: string;

  // Call / Talk Modal
  callModalTitle: string;
  callModalSubtitle: string;
  callModalDesc: string;
  callModalBtnCall: string;
  callModalBtnWa: string;
  callModalBtnDismiss: string;

  // Games Hub
  gamesHubTitle: string;
  gamesHubSubtitle: string;
  gamesCategories: {
    all: string;
    cards: string;
    words: string;
    numbers: string;
    memory: string;
    images: string;
    strategy: string;
    relaxation: string;
    family: string;
  };
  gamesPlayNow: string;
  gamesLevel: string;
  gamesStars: string;
  gamesDailyChallenge: string;
  gamesEvolution: string;
  gamesHistory: string;
  gamesAchievements: string;
  gamesFavorites: string;
  gamesSearchPlaceholder: string;
  gamesFamilyBadge: string;

  // Game Names & Descriptions
  gameNames: Record<string, { title: string; desc: string }>;

  // Voice speech synthesis texts
  speechWater: (count: number) => string;
  speechMeds: (name: string) => string;
  speechMeal: () => string;
  speechMoodGood: (name: string) => string;
  speechMoodBad: (name: string) => string;
  speechCallRequested: (name: string) => string;
  speechRoutine: (count: number, dayLabel: string) => string;
  speechNoRoutine: (dayLabel: string) => string;

  // Extra care strings for complete multilingual UI
  activityNow: string;
  allDoneTitle: string;
  allDoneDesc: string;
  btnTookMed: string;
  btnHadMeal: string;
  btnCompleteNow: string;
  emergencyNumbersTitle: string;
  oneTapToCall: string;
  ambulanceLabel: string;
  firefightersLabel: string;
  rescueLabel: string;
  policeLabel: string;
  policeEmergencyLabel: string;
  assistantTitle: string;
  assistantVoiceText: string;
  assistantName: string;
  assistantDesc: string;
  assistantBtn: string;
  seeAllTodayRoutine: (count: number) => string;
  wokeUpTitle: string;
  sleepTitle: string;
  wokeUpSub: string;
  sleepSub: string;
  myMoneyTitle: string;
  myMoneySub: string;
  familyNoteTitle: string;
  listenBtn: string;
  fromLabel: string;
  atLabel: string;
  tapToEnter: string;
  myActivitiesTitle: string;
  undoBtn: string;
  actionUndone: string;
  readAloudTooltip: string;
  flexibleSchedule: string;
  doneStatus: string;
  pauseBtn: string;
  resumeBtn: string;
  pausedGameTitle: string;
  pausedGameDesc: string;
  resumeGameBtn: string;
  backToGamesBtn: string;
  exitConfirm: string;

  // Actions tab
  actionsTitle: string;
  actionsSubtitle: string;
  actionWaterLabel: string;
  actionWaterSub: (cups: number) => string;
  actionMedsLabel: string;
  actionMedsSub: string;
  actionMealLabel: string;
  actionMealSub: string;
  actionWakeLabel: string;
  actionWakeSub: string;
  actionSleepLabel: string;
  actionSleepSub: string;
  actionActivityLabel: string;
  actionActivitySub: string;
  actionLaterLabel: string;
  actionLaterSub: string;
  actionMoodTitle: string;
  actionFinancesTitle: string;
  actionFinancesSubtitle: string;
  familyNotified: string;
  actionUrgentHelp: string;
  actionUrgentHelpSub: string;
  actionNotified: (msg: string) => string;

  // Bottom nav
  ninaTab: string;
  tabSos: string;

  // Modals - cancel/dismiss
  cancelBtn: string;
  sosCancel: string;
  conversationRequestTitle: string;
  conversationNotifiedTitle: string;
  conversationSendingTitle: string;

  // Finances
  financeIncome: string;
  financeExpenses: string;
  financeRegisterExpense: string;
  financePension: string;
  expenseLabelAmount: string;
  expenseLabelCategory: string;
  expenseLabelDetail: string;
  expenseSaving: string;
  expenseSave: string;
  expenseDeducted: string;
  pensionLabelAmount: string;
  pensionSaving: string;
  pensionSave: string;
  pensionDesc: string;

  // Read aloud speech
  speechHome: (name: string, activity?: string, water?: number, hasNote?: boolean) => string;
  speechGames: string;
  speechActions: string;
  speechFinances: (balance: string) => string;
}

export const CARE_TRANSLATIONS: Record<SupportedLocale, CareTexts> = {
  'pt-BR': {
    appointmentAlarmTitle: '⏰ Despertador de Compromisso',
    scheduledFor: 'Marcado para',
    doctorLabel: 'Médico(a)',
    locationLabel: 'Local',
    listenAgain: 'Ouvir em Voz Alta Novamente',
    confirmSeen: '✓ OK, Já Vi / Já Estou Ciente!',
    snooze10m: '⏱️ Lembrar em 10 minutos (Soneca)',
    alarmActive: 'Despertador Ativo',
    listenAlarmBtn: '🔊 Ouvir Despertador',
    testAlarmBtn: '🔊 Testar Despertador',
    nextAppointment: 'Próximo Compromisso',
    noPending: 'Nenhum agendamento pendente',
    demoTitle: 'Teste do Despertador',
    demoText: 'O som e a voz em português estão funcionando perfeitamente!',
    demoSpeech: (name) => `Olá, ${name}! Este é um teste do despertador de consultas do Parent Care. O som e a voz estão funcionando perfeitamente!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Atenção, ${name}! Lembrete do seu compromisso: ${title}, hoje às ${time}.${doctor ? ` Com ${doctor}.` : ''}${location ? ` No local: ${location}.` : ''}`,

    greetingMorning: 'Bom dia',
    greetingAfternoon: 'Boa tarde',
    greetingEvening: 'Boa noite',
    trialDaysLabel: 'dias',
    greeting: (name) => `Olá, ${name}!`,
    familyConnected: 'Família Conectada',
    signOut: 'Sair',
    trialBadge: (days) => `${days} dias grátis`,
    todaySummary: (count) => `${count} atividades hoje`,
    allCalm: 'Tudo tranquilo na rotina',
    emergencySosTitle: 'EMERGÊNCIA / SOS',
    emergencySosSubtitle: 'Pedir socorro imediato à família',
    emergencyAlertConfirm: 'ALERTA DE EMERGÊNCIA! Deseja enviar um aviso urgente para sua família agora?',

    cardMedsTitle: 'Tomei Remédio',
    cardMedsSubtitle: 'Horário cumprido',
    cardMedsNone: 'Nenhum remédio ativo',
    cardWaterTitle: 'Bebi Água',
    cardWaterSubtitle: (cups) => `${cups}/8 copos hoje (+1)`,
    cardMealTitle: 'Já Comi',
    cardMealSubtitle: 'Alimentação feita',
    cardRoutineTitle: 'Rotina de Hoje',
    cardRoutineSubtitle: 'Ver agenda do dia',
    cardFamilyTitle: 'Família',
    cardFamilySubtitle: 'Recados e fotos',
    cardGamesTitle: 'Jogos da Mente',
    cardGamesSubtitle: 'Exercitar o cérebro',
    cardCallTitle: 'Quero Conversar',
    cardCallSubtitle: 'Ligue para mim',
    cardMoodTitle: 'Estou Bem!',
    cardMoodSubtitle: 'Avisar família',

    tabHome: 'Início',
    tabRoutine: 'Rotina',
    tabGames: 'Jogos',
    tabActions: 'Ações',
    tabFinances: 'Finanças',

    routineTitle: 'Minha Rotina & Compromissos',
    dayYesterday: 'Ontem',
    dayToday: 'Hoje',
    dayTomorrow: 'Amanhã',
    filterAll: 'Todos',
    filterMeds: 'Remédios',
    filterMeals: 'Refeições',
    filterAppts: 'Consultas',
    filterTasks: 'Tarefas',
    noEventsDay: 'Nenhum compromisso marcado para este dia.',
    backBtn: 'Voltar',
    completedBadge: 'Concluído',
    pendingBadge: 'Pendente',

    moodGreat: 'Ótimo',
    moodGood: 'Bem',
    moodOkay: 'Mais ou menos',
    moodSad: 'Triste',
    moodNeedHelp: 'Preciso de ajuda',

    callModalTitle: 'Avisamos sua família!',
    callModalSubtitle: 'Pedido de Conversa',
    callModalDesc: 'Um aviso foi registrado no painel e enviado para a família te dar uma ligadinha.',
    callModalBtnCall: 'Ligar para a Família Agora',
    callModalBtnWa: 'Abrir WhatsApp da Família',
    callModalBtnDismiss: '✓ Entendi, vou aguardar a ligação',

    gamesHubTitle: 'Passatempos Cognitivos',
    gamesHubSubtitle: 'Jogos para exercitar a memória e o raciocínio',
    gamesCategories: {
      all: 'Todos os Jogos',
      cards: 'Cartas',
      words: 'Palavras',
      numbers: 'Números',
      memory: 'Memória',
      images: 'Imagens',
      strategy: 'Estratégia',
      relaxation: 'Relaxamento',
      family: 'Jogos em Família',
    },
    gamesPlayNow: 'Jogar Agora',
    gamesLevel: 'Nível',
    gamesStars: 'Estrelas',
    gamesDailyChallenge: 'Desafio Diário',
    gamesEvolution: 'Evolução Cognitiva',
    gamesHistory: 'Histórico',
    gamesAchievements: 'Conquistas',
    gamesFavorites: 'Favoritos',
    gamesSearchPlaceholder: 'Buscar jogo...',
    gamesFamilyBadge: 'Familiar',

    gameNames: {
      paciencia: { title: 'Paciência', desc: 'Jogo clássico de cartas para raciocínio e estratégia' },
      domino: { title: 'Dominó', desc: 'Clássico jogo de dominó contra o computador com contagem de pontos' },
      caca_palavras: { title: 'Caça-Palavras', desc: 'Encontre as palavras escondidas deslizando o dedo' },
      mahjong: { title: 'Mahjong', desc: 'Combine os pares de pedras idênticas livres' },
      sudoku: { title: 'Sudoku', desc: 'Complete a grade com números de 1 a 9 sem repetir' },
      memoria: { title: 'Jogo da Memória', desc: 'Encontre os pares das cartas viradas' },
      palavras_cruzadas: { title: 'Palavras Cruzadas', desc: 'Preencha as palavras cruzadas com as dicas' },
      quebra_cabeca: { title: 'Quebra-Cabeça', desc: 'Monte as peças para formar uma imagem linda' },
      damas: { title: 'Jogo de Damas', desc: 'Clássico jogo de damas com regras fáceis' },
      memorias_familia: { title: 'Memórias da Família', desc: 'Quiz com fotos e lembranças da sua própria família' },
      freecell: { title: 'FreeCell', desc: 'Organize todas as cartas nos 4 montes por naipe' },
      spider: { title: 'Paciência Spider', desc: 'Construa sequências completas de cartas do Rei ao Ás' },
      tripeaks: { title: 'Três Picos (TriPeaks)', desc: 'Limpe as 3 pirâmides de cartas em sequência' },
      combine_tres: { title: 'Combine 3', desc: 'Junte 3 elementos iguais para relaxar e pontuar' },
      encontre_diferencas: { title: '7 Diferenças', desc: 'Observe os detalhes e encontre as diferenças nas fotos' },
      perguntas_respostas: { title: 'Perguntas & Respostas', desc: 'Curiosidades divertidas e cultura geral para a mente' },
      objetos_escondidos: { title: 'Objetos Ocultos', desc: 'Procure e encontre os itens escondidos no cenário' },
      unir_numeros: { title: 'Unir Números', desc: 'Deslize e combine números iguais para somar pontos' },
      blocos: { title: 'Encaixe de Blocos', desc: 'Posicione as peças de madeira e complete linhas' },
      bolhas: { title: 'Estourar Bolhas', desc: 'Mire e combine cores para estourar bolhas coloridas' },
      formar_palavras: { title: 'Formar Palavras', desc: 'Conecte as letras em círculo para descobrir palavras' },
      descubra_palavra: { title: 'Adivinhe a Palavra', desc: 'Descubra a palavra secreta de 5 letras em 6 tentativas' },
    },

    speechWater: (count) => `Parabéns! Mais um copo de água registrado. Você já tomou ${count} copos hoje.`,
    speechMeds: (name) => `Parabéns! Remédio ${name} confirmado com sucesso.`,
    speechMeal: () => 'Muito bem! Sua refeição foi registrada com sucesso.',
    speechMoodGood: (name) => `Que ótimo, ${name}! É muito bom saber que você está bem.`,
    speechMoodBad: (name) => `Fique tranquilo, ${name}. Já avisamos sua família para te ligar com carinho.`,
    speechCallRequested: (name) => `Avisamos sua família, ${name}! Logo alguém vai te dar uma ligadinha para conversar.`,
    speechRoutine: (count, dayLabel) => `Sua rotina de ${dayLabel} tem ${count} atividades.`,
    speechNoRoutine: (dayLabel) => `Você não tem nenhum compromisso marcado para ${dayLabel}.`,

    activityNow: 'Atividade do Momento',
    allDoneTitle: 'Tudo em dia por agora!',
    allDoneDesc: 'Você cumpriu seus horários. Aproveite para descansar ou tomar uma água!',
    btnTookMed: '✓ JÁ TOMEI ESSE REMÉDIO',
    btnHadMeal: '✓ JÁ ME ALIMENTEI',
    btnCompleteNow: '✓ CONCLUIR AGORA',
    emergencyNumbersTitle: 'Números de Emergência Rápidos',
    oneTapToCall: '1 Toque para Ligar',
    ambulanceLabel: 'Ambulância',
    firefightersLabel: 'Bombeiros',
    rescueLabel: 'Resgate',
    policeLabel: 'Polícia',
    policeEmergencyLabel: 'Emergência',
    assistantTitle: 'Assistente Pessoal',
    assistantVoiceText: 'Voz & Texto',
    assistantName: 'Falar com a Nina',
    assistantDesc: 'Pergunte sobre horários, remédios ou converse por áudio',
    assistantBtn: 'Conversar',
    seeAllTodayRoutine: (count) => `Ver Todos os Compromissos de Hoje (${count})`,
    wokeUpTitle: 'Acordei',
    sleepTitle: 'Vou Dormir',
    wokeUpSub: 'Bom dia!',
    sleepSub: 'Boa noite!',
    myMoneyTitle: 'Meu Dinheiro',
    myMoneySub: 'Saldo & gastos',
    familyNoteTitle: 'Recado com Carinho',
    listenBtn: 'Ouvir',
    fromLabel: 'De',
    atLabel: 'às',
    tapToEnter: 'Toque para entrar',
    myActivitiesTitle: 'Minhas Atividades & Acessos',
    undoBtn: 'Desfazer',
    actionUndone: 'Ação cancelada.',
    readAloudTooltip: 'Ouvir em Voz Alta',
    flexibleSchedule: 'Horário flexível',
    doneStatus: '✓ Realizado',
    pauseBtn: 'Pausar',
    resumeBtn: 'Continuar',
    pausedGameTitle: 'Partida Pausada',
    pausedGameDesc: 'Respire fundo, tome uma água e continue quando estiver pronto. Seu progresso está guardado!',
    resumeGameBtn: 'Retomar Jogo',
    backToGamesBtn: 'Voltar aos Jogos',
    exitConfirm: 'Deseja sair do jogo? Seu progresso nesta etapa está salvo.',

    // Actions tab
    actionsTitle: 'O que você fez agora?',
    actionsSubtitle: 'Toque no botão para registrar e avisar a família:',
    actionWaterLabel: 'Bebi Água',
    actionWaterSub: (cups) => `+1 copo (${cups}/8)`,
    actionMedsLabel: 'Tomei Remédio',
    actionMedsSub: 'Horário cumprido',
    actionMealLabel: 'Já Comi',
    actionMealSub: 'Refeição feita',
    actionWakeLabel: 'Acordei',
    actionWakeSub: 'Bom dia!',
    actionSleepLabel: 'Vou Dormir',
    actionSleepSub: 'Boa noite!',
    actionActivityLabel: 'Atividade',
    actionActivitySub: 'Caminhada/exercício',
    actionLaterLabel: 'Depois',
    actionLaterSub: 'Lembrar em 15 min',
    actionMoodTitle: 'Como você está se sentindo?',
    actionFinancesTitle: 'Meu Saldo & Finanças',
    actionFinancesSubtitle: 'Ver extrato mensal disponível',
    familyNotified: 'A família foi avisada.',
    actionUrgentHelp: 'Preciso de Ajuda',
    actionUrgentHelpSub: 'Avisar a família para me ligar',
    actionNotified: (msg) => `${msg}! A família foi avisada.`,

    // Bottom nav
    ninaTab: 'Nina IA',
    tabSos: 'SOS',

    // Modals
    cancelBtn: 'Cancelar',
    sosCancel: 'Cancelar / Toquei Sem Querer',
    conversationRequestTitle: 'Pedido de Conversa',
    conversationNotifiedTitle: 'Avisamos sua família!',
    conversationSendingTitle: 'Enviando aviso...',

    // Finances
    financeIncome: 'Renda',
    financeExpenses: 'Gastos',
    financeRegisterExpense: '+ REGISTRAR GASTO',
    financePension: 'Minha Aposentadoria / Renda',
    expenseLabelAmount: 'Valor Gasto (R$) *',
    expenseLabelCategory: 'Categoria:',
    expenseLabelDetail: 'Detalhe (opcional):',
    expenseSaving: 'Salvando...',
    expenseSave: '✓ Salvar Gasto',
    expenseDeducted: 'Será abatido do saldo do mês.',
    pensionLabelAmount: 'Valor Mensal (R$) *',
    pensionSaving: 'Salvando...',
    pensionSave: '✓ Salvar Minha Renda',
    pensionDesc: 'Renda mensal para cálculo de saldo.',

    // Read aloud
    speechHome: (name, activity, water, hasNote) => {
      let s = `Olá, ${name}! `;
      if (activity) s += `No momento, sua atividade principal é: ${activity}. `;
      else s += `Todas as suas atividades deste horário estão concluídas. `;
      if (hasNote) s += `Você tem um recado da família. `;
      if (water !== undefined) s += `Você já tomou ${water} copos de água hoje.`;
      return s;
    },
    speechGames: 'Aqui estão seus jogos cognitivos: Paciência, Dominó, Caça-Palavras, Mahjong, Sudoku e muito mais. Toque em um jogo para exercitar a mente!',
    speechActions: 'Aqui você pode registrar o que fez hoje: beber água, tomar remédio, refeição, ou avisar como está se sentindo.',
    speechFinances: (balance) => `Seu saldo disponível para este mês é de ${balance}.`,
  },

  en: {
    appointmentAlarmTitle: '⏰ Appointment Alarm',
    scheduledFor: 'Scheduled for',
    doctorLabel: 'Doctor / Specialist',
    locationLabel: 'Location',
    listenAgain: 'Listen Out Loud Again',
    confirmSeen: "✓ OK, I'm Ready / I Got It!",
    snooze10m: '⏱️ Remind in 10 minutes (Snooze)',
    alarmActive: 'Alarm Active',
    listenAlarmBtn: '🔊 Listen Alarm',
    testAlarmBtn: '🔊 Test Alarm',
    nextAppointment: 'Next Appointment',
    noPending: 'No pending appointments',
    demoTitle: 'Alarm Clock Test',
    demoText: 'Sound and voice are working perfectly!',
    demoSpeech: (name) => `Hello, ${name}! This is a test of the Parent Care appointment alarm. The sound and voice are working perfectly!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Attention, ${name}! Reminder for your appointment: ${title}, today at ${time}.${doctor ? ` With ${doctor}.` : ''}${location ? ` At: ${location}.` : ''}`,

    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    trialDaysLabel: 'days',
    greeting: (name) => `Hello, ${name}!`,
    familyConnected: 'Family Connected',
    signOut: 'Sign Out',
    trialBadge: (days) => `${days} days free`,
    todaySummary: (count) => `${count} activities today`,
    allCalm: 'Everything calm in routine',
    emergencySosTitle: 'EMERGENCY / SOS',
    emergencySosSubtitle: 'Request immediate family help',
    emergencyAlertConfirm: 'EMERGENCY ALERT! Do you want to send an urgent alert to your family right now?',

    cardMedsTitle: 'Took Medication',
    cardMedsSubtitle: 'Schedule followed',
    cardMedsNone: 'No active medications',
    cardWaterTitle: 'Drank Water',
    cardWaterSubtitle: (cups) => `${cups}/8 glasses today (+1)`,
    cardMealTitle: 'Ate Meal',
    cardMealSubtitle: 'Meal recorded',
    cardRoutineTitle: "Today's Routine",
    cardRoutineSubtitle: 'View daily schedule',
    cardFamilyTitle: 'Family',
    cardFamilySubtitle: 'Messages and photos',
    cardGamesTitle: 'Brain Games',
    cardGamesSubtitle: 'Exercise your brain',
    cardCallTitle: 'Want to Talk',
    cardCallSubtitle: 'Call me please',
    cardMoodTitle: "I'm Doing Well!",
    cardMoodSubtitle: 'Notify family',

    tabHome: 'Home',
    tabRoutine: 'Routine',
    tabGames: 'Games',
    tabActions: 'Actions',
    tabFinances: 'Finances',

    routineTitle: 'My Routine & Schedule',
    dayYesterday: 'Yesterday',
    dayToday: 'Today',
    dayTomorrow: 'Tomorrow',
    filterAll: 'All',
    filterMeds: 'Meds',
    filterMeals: 'Meals',
    filterAppts: 'Appointments',
    filterTasks: 'Tasks',
    noEventsDay: 'No appointments scheduled for this day.',
    backBtn: 'Back',
    completedBadge: 'Completed',
    pendingBadge: 'Pending',

    moodGreat: 'Great',
    moodGood: 'Good',
    moodOkay: 'So-so',
    moodSad: 'Sad',
    moodNeedHelp: 'Need Help',

    callModalTitle: 'We notified your family!',
    callModalSubtitle: 'Call Request',
    callModalDesc: 'An alert has been posted to the panel and sent to your family so they can call you.',
    callModalBtnCall: 'Call Family Now',
    callModalBtnWa: 'Open Family WhatsApp',
    callModalBtnDismiss: "✓ Got it, I'll wait for the call",

    gamesHubTitle: 'Cognitive Games',
    gamesHubSubtitle: 'Games to exercise memory and reasoning',
    gamesCategories: {
      all: 'All Games',
      cards: 'Cards',
      words: 'Words',
      numbers: 'Numbers',
      memory: 'Memory',
      images: 'Images',
      strategy: 'Strategy',
      relaxation: 'Relaxation',
      family: 'Family Games',
    },
    gamesPlayNow: 'Play Now',
    gamesLevel: 'Level',
    gamesStars: 'Stars',
    gamesDailyChallenge: 'Daily Challenge',
    gamesEvolution: 'Cognitive Evolution',
    gamesHistory: 'History',
    gamesAchievements: 'Achievements',
    gamesFavorites: 'Favorites',
    gamesSearchPlaceholder: 'Search game...',
    gamesFamilyBadge: 'Family',

    gameNames: {
      paciencia: { title: 'Solitaire', desc: 'Classic card game for reasoning and strategy' },
      domino: { title: 'Dominoes', desc: 'Classic domino game against computer with scoring' },
      caca_palavras: { title: 'Word Search', desc: 'Find hidden words by swiping your finger' },
      mahjong: { title: 'Mahjong', desc: 'Match pairs of free identical tiles' },
      sudoku: { title: 'Sudoku', desc: 'Fill the grid with numbers 1 to 9 without repeating' },
      memoria: { title: 'Memory Match', desc: 'Find pairs of face-down cards' },
      palavras_cruzadas: { title: 'Crosswords', desc: 'Fill crossword grid using clues' },
      quebra_cabeca: { title: 'Jigsaw Puzzle', desc: 'Assemble pieces to complete a beautiful picture' },
      damas: { title: 'Checkers', desc: 'Classic checkers with simple rules' },
      memorias_familia: { title: 'Family Memories', desc: 'Quiz with photos and memories of your family' },
      freecell: { title: 'FreeCell', desc: 'Sort cards into four foundation piles' },
      spider: { title: 'Spider Solitaire', desc: 'Build complete sequences from King down to Ace' },
      tripeaks: { title: 'TriPeaks Solitaire', desc: 'Clear the 3 card pyramids in sequence' },
      combine_tres: { title: 'Match 3', desc: 'Connect 3 identical elements to relax and score' },
      encontre_diferencas: { title: 'Find 7 Differences', desc: 'Spot the subtle differences between images' },
      perguntas_respostas: { title: 'Trivia Quiz', desc: 'Fun trivia and general knowledge questions' },
      objetos_escondidos: { title: 'Hidden Objects', desc: 'Search and find hidden items in the scenery' },
      unir_numeros: { title: 'Number Merge', desc: 'Slide and combine matching numbers for points' },
      blocos: { title: 'Block Puzzle', desc: 'Place wooden shapes and clear lines at your pace' },
      bolhas: { title: 'Bubble Pop', desc: 'Aim and match colors to pop colorful bubbles' },
      formar_palavras: { title: 'Word Builder', desc: 'Connect circular letters to discover words' },
      descubra_palavra: { title: 'Word Guesser', desc: 'Guess the secret 5-letter word in 6 attempts' },
    },

    speechWater: (count) => `Great job! Another glass of water logged. You have drank ${count} glasses today.`,
    speechMeds: (name) => `Well done! Medication ${name} confirmed successfully.`,
    speechMeal: () => 'Well done! Your meal has been recorded successfully.',
    speechMoodGood: (name) => `That is wonderful, ${name}! So glad to know you are feeling well.`,
    speechMoodBad: (name) => `Stay calm, ${name}. We have already notified your family to give you a loving call.`,
    speechCallRequested: (name) => `We notified your family, ${name}! Someone will call you shortly to chat.`,
    speechRoutine: (count, dayLabel) => `Your routine for ${dayLabel} has ${count} activities.`,
    speechNoRoutine: (dayLabel) => `You have no scheduled appointments for ${dayLabel}.`,

    activityNow: 'Activity Right Now',
    allDoneTitle: 'All caught up for now!',
    allDoneDesc: 'You are on schedule. Take a moment to rest or drink some water!',
    btnTookMed: '✓ I TOOK THIS MEDICATION',
    btnHadMeal: '✓ I ATE MY MEAL',
    btnCompleteNow: '✓ COMPLETE NOW',
    emergencyNumbersTitle: 'Quick Emergency Numbers',
    oneTapToCall: '1 Tap to Call',
    ambulanceLabel: 'Ambulance',
    firefightersLabel: 'Firefighters',
    rescueLabel: 'Rescue',
    policeLabel: 'Police',
    policeEmergencyLabel: 'Emergency',
    assistantTitle: 'Personal Assistant',
    assistantVoiceText: 'Voice & Text',
    assistantName: 'Talk with Nina',
    assistantDesc: 'Ask about schedules, medications or chat with voice',
    assistantBtn: 'Chat',
    seeAllTodayRoutine: (count) => `View All Today's Appointments (${count})`,
    wokeUpTitle: 'Woke Up',
    sleepTitle: 'Going to Sleep',
    wokeUpSub: 'Good morning!',
    sleepSub: 'Good night!',
    myMoneyTitle: 'My Money',
    myMoneySub: 'Balance & expenses',
    familyNoteTitle: 'Loving Note',
    listenBtn: 'Listen',
    fromLabel: 'From',
    atLabel: 'at',
    tapToEnter: 'Tap to open',
    myActivitiesTitle: 'My Activities & Access',
    undoBtn: 'Undo',
    actionUndone: 'Action undone.',
    readAloudTooltip: 'Listen Out Loud',
    flexibleSchedule: 'Flexible time',
    doneStatus: '✓ Done',
    pauseBtn: 'Pause',
    resumeBtn: 'Resume',
    pausedGameTitle: 'Game Paused',
    pausedGameDesc: 'Take a deep breath, drink some water, and resume whenever you are ready. Your progress is saved!',
    resumeGameBtn: 'Resume Game',
    backToGamesBtn: 'Back to Games',
    exitConfirm: 'Do you want to exit the game? Your progress on this level is saved.',

    actionsTitle: 'What did you do just now?',
    actionsSubtitle: 'Tap a button to log and notify your family:',
    actionWaterLabel: 'Drank Water',
    actionWaterSub: (cups) => `+1 glass (${cups}/8)`,
    actionMedsLabel: 'Took Medication',
    actionMedsSub: 'Schedule followed',
    actionMealLabel: 'Ate Meal',
    actionMealSub: 'Meal done',
    actionWakeLabel: 'Woke Up',
    actionWakeSub: 'Good morning!',
    actionSleepLabel: 'Going to Sleep',
    actionSleepSub: 'Good night!',
    actionActivityLabel: 'Activity',
    actionActivitySub: 'Walk / exercise',
    actionLaterLabel: 'Later',
    actionLaterSub: 'Remind in 15 min',
    actionMoodTitle: 'How are you feeling?',
    actionFinancesTitle: 'My Balance & Finances',
    actionFinancesSubtitle: 'View monthly statement',
    familyNotified: 'Your family has been notified.',
    actionUrgentHelp: 'I Need Help',
    actionUrgentHelpSub: 'Alert family to call me',
    actionNotified: (msg) => `${msg}! Your family has been notified.`,
    ninaTab: 'Nina AI',
    tabSos: 'SOS',
    cancelBtn: 'Cancel',
    sosCancel: 'Cancel / Tapped by Mistake',
    conversationRequestTitle: 'Call Request',
    conversationNotifiedTitle: 'We notified your family!',
    conversationSendingTitle: 'Sending notification...',
    financeIncome: 'Income',
    financeExpenses: 'Expenses',
    financeRegisterExpense: '+ LOG EXPENSE',
    financePension: 'My Pension / Income',
    expenseLabelAmount: 'Amount Spent (USD) *',
    expenseLabelCategory: 'Category:',
    expenseLabelDetail: 'Detail (optional):',
    expenseSaving: 'Saving...',
    expenseSave: '✓ Save Expense',
    expenseDeducted: "Will be deducted from this month's balance.",
    pensionLabelAmount: 'Monthly Amount *',
    pensionSaving: 'Saving...',
    pensionSave: '✓ Save My Income',
    pensionDesc: 'Monthly income for balance calculation.',
    speechHome: (name, activity, water, hasNote) => {
      let s = `Hello, ${name}! `;
      if (activity) s += `Your main activity right now is: ${activity}. `;
      else s += `All your scheduled activities are done for now. `;
      if (hasNote) s += `You have a message from your family. `;
      if (water !== undefined) s += `You have had ${water} glasses of water today.`;
      return s;
    },
    speechGames: 'Here are your cognitive games: Solitaire, Dominoes, Word Search, Mahjong, Sudoku and many more. Tap a game to exercise your mind!',
    speechActions: 'Here you can log what you did today: drink water, take medication, record a meal, or let your family know how you are feeling.',
    speechFinances: (balance) => `Your available balance for this month is ${balance}.`,
  },

  es: {
    appointmentAlarmTitle: '⏰ Alarma de Cita Médica',
    scheduledFor: 'Programada para',
    doctorLabel: 'Médico(a)',
    locationLabel: 'Ubicación / Lugar',
    listenAgain: 'Escuchar en Voz Alta de Nuevo',
    confirmSeen: '✓ ¡Entendido, Ya lo Vi!',
    snooze10m: '⏱️ Recordar en 10 minutos (Posponer)',
    alarmActive: 'Alarma Activa',
    listenAlarmBtn: '🔊 Escuchar Alarma',
    testAlarmBtn: '🔊 Probar Alarma',
    nextAppointment: 'Próxima Cita',
    noPending: 'Sin citas pendientes',
    demoTitle: 'Prueba de Alarma',
    demoText: '¡El sonido y la voz en español funcionan perfectamente!',
    demoSpeech: (name) => `¡Hola, ${name}! Esta es una prueba de la alarma de citas de Parent Care. ¡El sonido y la voz funcionan perfectamente!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `¡Atención, ${name}! Recordatorio de su cita: ${title}, hoy a las ${time}.${doctor ? ` Con ${doctor}.` : ''}${location ? ` En: ${location}.` : ''}`,

    greetingMorning: 'Buenos días',
    greetingAfternoon: 'Buenas tardes',
    greetingEvening: 'Buenas noches',
    trialDaysLabel: 'días',
    greeting: (name) => `¡Hola, ${name}!`,
    familyConnected: 'Familia Conectada',
    signOut: 'Salir',
    trialBadge: (days) => `${days} días gratis`,
    todaySummary: (count) => `${count} actividades hoy`,
    allCalm: 'Todo tranquilo en la rutina',
    emergencySosTitle: 'EMERGENCIA / SOS',
    emergencySosSubtitle: 'Pedir auxilio inmediato a la familia',
    emergencyAlertConfirm: '¡ALERTA DE EMERGENCIA! ¿Desea enviar una alerta urgente a su familia ahora?',

    cardMedsTitle: 'Tomé Medicina',
    cardMedsSubtitle: 'Horario cumplido',
    cardMedsNone: 'Sin medicamentos activos',
    cardWaterTitle: 'Bebí Agua',
    cardWaterSubtitle: (cups) => `${cups}/8 vasos hoy (+1)`,
    cardMealTitle: 'Ya Comí',
    cardMealSubtitle: 'Comida realizada',
    cardRoutineTitle: 'Rutina de Hoy',
    cardRoutineSubtitle: 'Ver horario del día',
    cardFamilyTitle: 'Familia',
    cardFamilySubtitle: 'Mensajes y fotos',
    cardGamesTitle: 'Juegos Mentales',
    cardGamesSubtitle: 'Ejercitar la mente',
    cardCallTitle: 'Quiero Hablar',
    cardCallSubtitle: 'Llámenme por favor',
    cardMoodTitle: '¡Estoy Bien!',
    cardMoodSubtitle: 'Avisar a familia',

    tabHome: 'Inicio',
    tabRoutine: 'Rutina',
    tabGames: 'Juegos',
    tabActions: 'Acciones',
    tabFinances: 'Finanzas',

    routineTitle: 'Mi Rutina y Citas',
    dayYesterday: 'Ayer',
    dayToday: 'Hoy',
    dayTomorrow: 'Mañana',
    filterAll: 'Todos',
    filterMeds: 'Medicinas',
    filterMeals: 'Comidas',
    filterAppts: 'Citas',
    filterTasks: 'Tareas',
    noEventsDay: 'No hay citas programadas para este día.',
    backBtn: 'Volver',
    completedBadge: 'Completado',
    pendingBadge: 'Pendiente',

    moodGreat: 'Excelente',
    moodGood: 'Bien',
    moodOkay: 'Regular',
    moodSad: 'Triste',
    moodNeedHelp: 'Necesito ayuda',

    callModalTitle: '¡Avisamos a tu familia!',
    callModalSubtitle: 'Petición de Llamada',
    callModalDesc: 'Se envió un aviso para que tu familia te llame pronto para conversar.',
    callModalBtnCall: 'Llamar a la Familia Ahora',
    callModalBtnWa: 'Abrir WhatsApp Familiar',
    callModalBtnDismiss: '✓ Entendido, esperaré la llamada',

    gamesHubTitle: 'Pasatiempos Cognitivos',
    gamesHubSubtitle: 'Juegos para ejercitar memoria y razonamiento',
    gamesCategories: {
      all: 'Todos los Juegos',
      cards: 'Cartas',
      words: 'Palabras',
      numbers: 'Números',
      memory: 'Memoria',
      images: 'Imágenes',
      strategy: 'Estrategia',
      relaxation: 'Relajación',
      family: 'Juegos en Familia',
    },
    gamesPlayNow: 'Jugar Ahora',
    gamesLevel: 'Nivel',
    gamesStars: 'Estrellas',
    gamesDailyChallenge: 'Desafío Diario',
    gamesEvolution: 'Evolución Cognitiva',
    gamesHistory: 'Historial',
    gamesAchievements: 'Logros',
    gamesFavorites: 'Favoritos',
    gamesSearchPlaceholder: 'Buscar juego...',
    gamesFamilyBadge: 'Familiar',

    gameNames: {
      paciencia: { title: 'Solitario', desc: 'Clásico juego de cartas para razonamiento y estrategia' },
      domino: { title: 'Dominó', desc: 'Clásico juego de dominó contra la computadora' },
      caca_palavras: { title: 'Sopa de Letras', desc: 'Encuentra las palabras ocultas deslizando el dedo' },
      mahjong: { title: 'Mahjong', desc: 'Empareja las fichas libres idénticas' },
      sudoku: { title: 'Sudoku', desc: 'Completa la cuadrícula con números del 1 al 9 sin repetir' },
      memoria: { title: 'Juego de Memoria', desc: 'Encuentra las parejas de cartas boca abajo' },
      palavras_cruzadas: { title: 'Crucigrama', desc: 'Completa el crucigrama con las pistas' },
      quebra_cabeca: { title: 'Rompecabezas', desc: 'Une las piezas para completar la hermosa imagen' },
      damas: { title: 'Juego de Damas', desc: 'Clásico juego de damas con reglas sencillas' },
      memorias_familia: { title: 'Recuerdos Familiares', desc: 'Quiz con fotos y recuerdos de tu propia familia' },
      freecell: { title: 'FreeCell', desc: 'Ordena todas las cartas en 4 montones por palo' },
      spider: { title: 'Solitario Spider', desc: 'Crea secuencias completas de cartas de Rey a As' },
      tripeaks: { title: 'TriPeaks', desc: 'Despeja las 3 pirámides de cartas en secuencia' },
      combine_tres: { title: 'Conecta 3', desc: 'Junta 3 elementos iguales para relajarte y puntuar' },
      encontre_diferencas: { title: '7 Diferencias', desc: 'Observa los detalles y halla las diferencias' },
      perguntas_respostas: { title: 'Preguntas y Respuestas', desc: 'Curiosidades divertidas y cultura general' },
      objetos_escondidos: { title: 'Objetos Ocultos', desc: 'Busca y encuentra los objetos ocultos en el escenario' },
      unir_numeros: { title: 'Unir Números', desc: 'Desliza y une números iguales para sumar puntos' },
      blocos: { title: 'Encaje de Bloques', desc: 'Coloca las piezas de madera y completa líneas' },
      bolhas: { title: 'Explotar Burbujas', desc: 'Apunta y combina colores para reventar burbujas' },
      formar_palavras: { title: 'Formar Palabras', desc: 'Conecta letras en círculo para descubrir palabras' },
      descubra_palavra: { title: 'Adivina la Palabra', desc: 'Descubre la palabra secreta de 5 letras en 6 intentos' },
    },

    speechWater: (count) => `¡Excelente! Otro vaso de agua registrado. Ya tomaste ${count} vasos hoy.`,
    speechMeds: (name) => `¡Muy bien! Medicina ${name} confirmada con éxito.`,
    speechMeal: () => '¡Muy bien! Tu comida ha sido registrada con éxito.',
    speechMoodGood: (name) => `¡Qué alegría, ${name}! Es muy grato saber que te encuentras bien.`,
    speechMoodBad: (name) => `Tranquilo(a), ${name}. Ya avisamos a tu familia para que te llame con cariño.`,
    speechCallRequested: (name) => `¡Avisamos a tu familia, ${name}! Pronto te llamarán para charlar.`,
    speechRoutine: (count, dayLabel) => `Tu rutina para ${dayLabel} tiene ${count} actividades.`,
    speechNoRoutine: (dayLabel) => `No tienes compromisos agendados para ${dayLabel}.`,

    activityNow: 'Actividad del Momento',
    allDoneTitle: '¡Todo al día por ahora!',
    allDoneDesc: 'Cumpliste con tus horarios. ¡Aprovecha para descansar o tomar agua!',
    btnTookMed: '✓ YA TOMÉ ESTE REMEDIO',
    btnHadMeal: '✓ YA HE COMIDO',
    btnCompleteNow: '✓ COMPLETAR AHORA',
    emergencyNumbersTitle: 'Números de Emergencia Rápidos',
    oneTapToCall: '1 Toque para Llamar',
    ambulanceLabel: 'Ambulancia',
    firefightersLabel: 'Bomberos',
    rescueLabel: 'Rescate',
    policeLabel: 'Policía',
    policeEmergencyLabel: 'Emergencia',
    assistantTitle: 'Asistente Personal',
    assistantVoiceText: 'Voz y Texto',
    assistantName: 'Hablar con Nina',
    assistantDesc: 'Pregunta sobre horarios, medicinas o conversa por voz',
    assistantBtn: 'Conversar',
    seeAllTodayRoutine: (count) => `Ver Todos los Compromisos de Hoy (${count})`,
    wokeUpTitle: 'Me Desperté',
    sleepTitle: 'Me Voy a Dormir',
    wokeUpSub: '¡Buenos días!',
    sleepSub: '¡Buenas noches!',
    myMoneyTitle: 'Mi Dinero',
    myMoneySub: 'Saldo y gastos',
    familyNoteTitle: 'Mensaje con Cariño',
    listenBtn: 'Escuchar',
    fromLabel: 'De',
    atLabel: 'a las',
    tapToEnter: 'Toca para entrar',
    myActivitiesTitle: 'Mis Actividades y Accesos',
    undoBtn: 'Deshacer',
    actionUndone: 'Acción cancelada.',
    readAloudTooltip: 'Escuchar en Voz Alta',
    flexibleSchedule: 'Horario flexible',
    doneStatus: '✓ Realizado',
    pauseBtn: 'Pausar',
    resumeBtn: 'Continuar',
    pausedGameTitle: 'Partida Pausada',
    pausedGameDesc: 'Respira hondo, toma un poco de agua y continúa cuando estés listo(a). ¡Tu progreso está guardado!',
    resumeGameBtn: 'Reanudar Juego',
    backToGamesBtn: 'Volver a Juegos',
    exitConfirm: '¿Deseas salir del juego? Tu progreso en esta etapa está guardado.',

    actionsTitle: '¿Qué hizo ahora?',
    actionsSubtitle: 'Toque el botón para registrar y avisar a su familia:',
    actionWaterLabel: 'Bebí Agua',
    actionWaterSub: (cups) => `+1 vaso (${cups}/8)`,
    actionMedsLabel: 'Tomé el Medicamento',
    actionMedsSub: 'Horario cumplido',
    actionMealLabel: 'Ya Comí',
    actionMealSub: 'Comida registrada',
    actionWakeLabel: 'Me Desperté',
    actionWakeSub: '¡Buenos días!',
    actionSleepLabel: 'Voy a Dormir',
    actionSleepSub: '¡Buenas noches!',
    actionActivityLabel: 'Actividad',
    actionActivitySub: 'Caminata/ejercicio',
    actionLaterLabel: 'Después',
    actionLaterSub: 'Recordar en 15 min',
    actionMoodTitle: '¿Cómo se siente?',
    actionFinancesTitle: 'Mi Saldo y Finanzas',
    actionFinancesSubtitle: 'Ver estado mensual disponible',
    familyNotified: 'Su familia ha sido avisada.',
    actionUrgentHelp: 'Necesito Ayuda',
    actionUrgentHelpSub: 'Avisar a la familia para que me llame',
    actionNotified: (msg) => `¡${msg}! Su familia fue avisada.`,
    ninaTab: 'Nina IA',
    tabSos: 'SOS',
    cancelBtn: 'Cancelar',
    sosCancel: 'Cancelar / Toqué sin Querer',
    conversationRequestTitle: 'Solicitud de Llamada',
    conversationNotifiedTitle: '¡Avisamos a su familia!',
    conversationSendingTitle: 'Enviando aviso...',
    financeIncome: 'Ingresos',
    financeExpenses: 'Gastos',
    financeRegisterExpense: '+ REGISTRAR GASTO',
    financePension: 'Mi Pensión / Ingresos',
    expenseLabelAmount: 'Valor Gastado *',
    expenseLabelCategory: 'Categoría:',
    expenseLabelDetail: 'Detalle (opcional):',
    expenseSaving: 'Guardando...',
    expenseSave: '✓ Guardar Gasto',
    expenseDeducted: 'Se deducirá del saldo del mes.',
    pensionLabelAmount: 'Monto Mensual *',
    pensionSaving: 'Guardando...',
    pensionSave: '✓ Guardar Mis Ingresos',
    pensionDesc: 'Ingresos mensuales para cálculo de saldo.',
    speechHome: (name, activity, water, hasNote) => {
      let s = `¡Hola, ${name}! `;
      if (activity) s += `Su actividad principal en este momento es: ${activity}. `;
      else s += `Todas sus actividades de este horario están completadas. `;
      if (hasNote) s += `Tiene un mensaje de su familia. `;
      if (water !== undefined) s += `Ha tomado ${water} vasos de agua hoy.`;
      return s;
    },
    speechGames: '¡Aquí están sus juegos cognitivos: Solitario, Dominó, Sopa de Letras, Mahjong, Sudoku y muchos más. ¡Toque un juego para ejercitar la mente!',
    speechActions: 'Aquí puede registrar lo que hizo hoy: beber agua, tomar medicamentos, una comida, o avisar cómo se siente.',
    speechFinances: (balance) => `Su saldo disponible para este mes es de ${balance}.`,
  },

  fr: {
    appointmentAlarmTitle: '⏰ Alarme de Rendez-vous',
    scheduledFor: 'Prévu pour',
    doctorLabel: 'Médecin / Spécialiste',
    locationLabel: 'Lieu',
    listenAgain: 'Réécouter à Voix Haute',
    confirmSeen: "✓ OK, C'est Compris!",
    snooze10m: '⏱️ Rappeler dans 10 minutes (Répéter)',
    alarmActive: 'Alarme Active',
    listenAlarmBtn: "🔊 Écouter l'alarme",
    testAlarmBtn: "🔊 Tester l'alarme",
    nextAppointment: 'Prochain Rendez-vous',
    noPending: 'Aucun rendez-vous prévu',
    demoTitle: "Test de l'Alarme",
    demoText: 'Le son et la voix en français fonctionnent parfaitement!',
    demoSpeech: (name) => `Bonjour, ${name}! Ceci est un test de l'alarme de rendez-vous Parent Care. Le son et la voix fonctionnent parfaitement!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Attention, ${name}! Rappel pour votre rendez-vous: ${title}, aujourd'hui à ${time}.${doctor ? ` Avec ${doctor}.` : ''}${location ? ` Lieu: ${location}.` : ''}`,

    greetingMorning: 'Bonjour',
    greetingAfternoon: 'Bon après-midi',
    greetingEvening: 'Bonsoir',
    trialDaysLabel: 'jours',
    greeting: (name) => `Bonjour, ${name}!`,
    familyConnected: 'Famille Connectée',
    signOut: 'Déconnexion',
    trialBadge: (days) => `${days} jours gratuits`,
    todaySummary: (count) => `${count} activités aujourd'hui`,
    allCalm: 'Tout est calme aujourd’hui',
    emergencySosTitle: 'URGENCE / SOS',
    emergencySosSubtitle: 'Demander de l’aide immédiate',
    emergencyAlertConfirm: 'ALERTE D’URGENCE! Souhaitez-vous envoyer une alerte urgente à votre famille maintenant?',

    cardMedsTitle: 'Médicament Pris',
    cardMedsSubtitle: 'Horaire respecté',
    cardMedsNone: 'Aucun médicament actif',
    cardWaterTitle: "Bu de l'Eau",
    cardWaterSubtitle: (cups) => `${cups}/8 verres aujourd'hui (+1)`,
    cardMealTitle: 'Déjà Mangé',
    cardMealSubtitle: 'Repas enregistré',
    cardRoutineTitle: 'Routine du Jour',
    cardRoutineSubtitle: 'Voir le planning',
    cardFamilyTitle: 'Famille',
    cardFamilySubtitle: 'Messages et photos',
    cardGamesTitle: 'Jeux Cérébraux',
    cardGamesSubtitle: 'Entraîner l’esprit',
    cardCallTitle: 'Envie de Parler',
    cardCallSubtitle: 'Appelez-moi',
    cardMoodTitle: 'Je Vais Bien!',
    cardMoodSubtitle: 'Prévenir famille',

    tabHome: 'Accueil',
    tabRoutine: 'Routine',
    tabGames: 'Jeux',
    tabActions: 'Actions',
    tabFinances: 'Finances',

    routineTitle: 'Ma Routine et Rendez-vous',
    dayYesterday: 'Hier',
    dayToday: "Aujourd'hui",
    dayTomorrow: 'Demain',
    filterAll: 'Tous',
    filterMeds: 'Médicaments',
    filterMeals: 'Repas',
    filterAppts: 'Rendez-vous',
    filterTasks: 'Tâches',
    noEventsDay: 'Aucun rendez-vous prévu pour ce jour.',
    backBtn: 'Retour',
    completedBadge: 'Terminé',
    pendingBadge: 'En attente',

    moodGreat: 'Super',
    moodGood: 'Bien',
    moodOkay: 'Comme ci comme ça',
    moodSad: 'Triste',
    moodNeedHelp: 'Besoin d’aide',

    callModalTitle: 'Nous avons prévenu votre famille!',
    callModalSubtitle: 'Demande d’Appel',
    callModalDesc: 'Un message a été envoyé à vos proches afin qu’ils vous appellent rapidement.',
    callModalBtnCall: 'Appeler la Famille Maintenant',
    callModalBtnWa: 'Ouvrir WhatsApp Famille',
    callModalBtnDismiss: '✓ D’accord, j’attends leur appel',

    gamesHubTitle: 'Passe-temps Cognitifs',
    gamesHubSubtitle: 'Jeux pour exercer la mémoire et la logique',
    gamesCategories: {
      all: 'Tous les Jeux',
      cards: 'Cartes',
      words: 'Mots',
      numbers: 'Chiffres',
      memory: 'Mémoire',
      images: 'Images',
      strategy: 'Stratégie',
      relaxation: 'Détente',
      family: 'Jeux en Famille',
    },
    gamesPlayNow: 'Jouer',
    gamesLevel: 'Niveau',
    gamesStars: 'Étoiles',
    gamesDailyChallenge: 'Défi Quotidien',
    gamesEvolution: 'Évolution Cognitive',
    gamesHistory: 'Historique',
    gamesAchievements: 'Succès',
    gamesFavorites: 'Favoris',
    gamesSearchPlaceholder: 'Rechercher un jeu...',
    gamesFamilyBadge: 'Famille',

    gameNames: {
      paciencia: { title: 'Solitaire', desc: 'Jeu de cartes classique pour la logique et la stratégie' },
      domino: { title: 'Dominos', desc: 'Jeu de domino classique contre l’ordinateur' },
      caca_palavras: { title: 'Mots Mêlés', desc: 'Trouvez les mots cachés en faisant glisser le doigt' },
      mahjong: { title: 'Mahjong', desc: 'Associez les paires de tuiles libres identiques' },
      sudoku: { title: 'Sudoku', desc: 'Remplissez la grille avec les chiffres de 1 à 9' },
      memoria: { title: 'Jeu de Mémoire', desc: 'Trouvez les paires de cartes retournées' },
      palavras_cruzadas: { title: 'Mots Croisés', desc: 'Remplissez la grille avec les définitions' },
      quebra_cabeca: { title: 'Puzzle', desc: 'Assemblez les pièces pour former la belle image' },
      damas: { title: 'Jeu de Dames', desc: 'Jeu de dames classique aux règles simples' },
      memorias_familia: { title: 'Souvenirs de Famille', desc: 'Quiz avec photos et souvenirs de votre famille' },
      freecell: { title: 'FreeCell', desc: 'Rangez toutes les cartes dans 4 piles par couleur' },
      spider: { title: 'Spider Solitaire', desc: 'Construisez des suites complètes du Roi à l’As' },
      tripeaks: { title: 'TriPeaks', desc: 'Éliminez les 3 pyramides de cartes en séquence' },
      combine_tres: { title: 'Match 3', desc: 'Associez 3 éléments identiques pour vous détendre' },
      encontre_diferencas: { title: '7 Erreurs', desc: 'Observez les détails et trouvez les différences' },
      perguntas_respostas: { title: 'Quiz Culture', desc: 'Anecdotes amusantes et culture générale pour l’esprit' },
      objetos_escondidos: { title: 'Objets Cachés', desc: 'Cherchez et trouvez les objets cachés dans le décor' },
      unir_numeros: { title: 'Fusion de Nombres', desc: 'Faites glisser et fusionnez les nombres identiques' },
      blocos: { title: 'Casse-tête de Blocs', desc: 'Placez les formes en bois et complétez les lignes' },
      bolhas: { title: 'Tir aux Bulles', desc: 'Visez et associez les couleurs pour éclater les bulles' },
      formar_palavras: { title: 'Créateur de Mots', desc: 'Reliez les lettres en cercle pour trouver des mots' },
      descubra_palavra: { title: 'Devine le Mot', desc: 'Trouvez le mot secret de 5 lettres en 6 essais' },
    },

    speechWater: (count) => `Bravo! Un autre verre d'eau enregistré. Vous avez bu ${count} verres aujourd'hui.`,
    speechMeds: (name) => `Félicitations! Médicament ${name} confirmé avec succès.`,
    speechMeal: () => 'Très bien! Votre repas a été enregistré avec succès.',
    speechMoodGood: (name) => `C’est merveilleux, ${name}! Nous sommes ravis que vous alliez bien.`,
    speechMoodBad: (name) => `Restez serein(e), ${name}. Nous avons prévenu vos proches pour qu’ils vous appellent avec tendresse.`,
    speechCallRequested: (name) => `Nous avons prévenu votre famille, ${name}! Quelqu’un va bientôt vous appeler.`,
    speechRoutine: (count, dayLabel) => `Votre journée de ${dayLabel} comporte ${count} activités.`,
    speechNoRoutine: (dayLabel) => `Vous n'avez aucun rendez-vous pour ${dayLabel}.`,

    activityNow: 'Activité du Moment',
    allDoneTitle: 'Tout est à jour pour l’instant!',
    allDoneDesc: 'Vous êtes à jour dans vos horaires. Profitez-en pour vous reposer ou boire un verre d’eau!',
    btnTookMed: '✓ J’AI DÉJÀ PRIS CE MÉDICAMENT',
    btnHadMeal: '✓ J’AI DÉJÀ MANGÉ',
    btnCompleteNow: '✓ TERMINER MAINTENANT',
    emergencyNumbersTitle: 'Numéros d’Urgence Rapides',
    oneTapToCall: '1 Clic pour Appeler',
    ambulanceLabel: 'Ambulance / SAMU',
    firefightersLabel: 'Pompiers',
    rescueLabel: 'Secours',
    policeLabel: 'Police',
    policeEmergencyLabel: 'Urgence',
    assistantTitle: 'Assistante Personnelle',
    assistantVoiceText: 'Voix & Texte',
    assistantName: 'Parler avec Nina',
    assistantDesc: 'Posez des questions sur vos horaires, médicaments ou discutez par voix',
    assistantBtn: 'Discuter',
    seeAllTodayRoutine: (count) => `Voir Tous les Rendez-vous du Jour (${count})`,
    wokeUpTitle: 'Réveillé(e)',
    sleepTitle: 'Au Lit',
    wokeUpSub: 'Bonjour!',
    sleepSub: 'Bonne nuit!',
    myMoneyTitle: 'Mon Argent',
    myMoneySub: 'Solde & dépenses',
    familyNoteTitle: 'Message d’Affection',
    listenBtn: 'Écouter',
    fromLabel: 'De',
    atLabel: 'à',
    tapToEnter: 'Toucher pour ouvrir',
    myActivitiesTitle: 'Mes Activités & Accès',
    undoBtn: 'Annuler',
    actionUndone: 'Action annulée.',
    readAloudTooltip: 'Écouter à Voix Haute',
    flexibleSchedule: 'Horaire flexible',
    doneStatus: '✓ Fait',
    pauseBtn: 'Pause',
    resumeBtn: 'Reprendre',
    pausedGameTitle: 'Partie en Pause',
    pausedGameDesc: 'Respirez profondément, buvez un peu d’eau et continuez dès que vous êtes prêt(e). Votre progression est sauvegardée!',
    resumeGameBtn: 'Reprendre le Jeu',
    backToGamesBtn: 'Retour aux Jeux',
    exitConfirm: 'Souhaitez-vous quitter la partie? Votre progression à cette étape est sauvegardée.',

    actionsTitle: "Qu'avez-vous fait maintenant ?",
    actionsSubtitle: 'Touchez un bouton pour enregistrer et prévenir votre famille :',
    actionWaterLabel: "J'ai bu de l'eau",
    actionWaterSub: (cups) => `+1 verre (${cups}/8)`,
    actionMedsLabel: "J'ai pris mon médicament",
    actionMedsSub: 'Horaire respecté',
    actionMealLabel: "J'ai mangé",
    actionMealSub: 'Repas enregistré',
    actionWakeLabel: 'Je me suis réveillé(e)',
    actionWakeSub: 'Bonjour !',
    actionSleepLabel: 'Je vais dormir',
    actionSleepSub: 'Bonne nuit !',
    actionActivityLabel: 'Activité',
    actionActivitySub: 'Marche/exercice',
    actionLaterLabel: 'Plus tard',
    actionLaterSub: 'Rappeler dans 15 min',
    actionMoodTitle: 'Comment vous sentez-vous ?',
    actionFinancesTitle: 'Mon Solde & Finances',
    actionFinancesSubtitle: 'Voir le relevé mensuel',
    familyNotified: 'Votre famille a été prévenue.',
    actionUrgentHelp: "J'ai besoin d'aide",
    actionUrgentHelpSub: "Prévenir la famille pour qu'elle m'appelle",
    actionNotified: (msg) => `${msg} ! Votre famille a été prévenue.`,
    ninaTab: 'Nina IA',
    tabSos: 'SOS',
    cancelBtn: 'Annuler',
    sosCancel: "Annuler / J'ai touché par erreur",
    conversationRequestTitle: "Demande d'appel",
    conversationNotifiedTitle: 'Votre famille a été prévenue !',
    conversationSendingTitle: 'Envoi de la notification...',
    financeIncome: 'Revenus',
    financeExpenses: 'Dépenses',
    financeRegisterExpense: '+ ENREGISTRER DÉPENSE',
    financePension: 'Ma Retraite / Revenus',
    expenseLabelAmount: 'Montant Dépensé *',
    expenseLabelCategory: 'Catégorie :',
    expenseLabelDetail: 'Détail (optionnel) :',
    expenseSaving: 'Enregistrement...',
    expenseSave: '✓ Enregistrer la Dépense',
    expenseDeducted: 'Sera déduit du solde du mois.',
    pensionLabelAmount: 'Montant Mensuel *',
    pensionSaving: 'Enregistrement...',
    pensionSave: '✓ Enregistrer Mes Revenus',
    pensionDesc: 'Revenus mensuels pour le calcul du solde.',
    speechHome: (name, activity, water, hasNote) => {
      let s = `Bonjour, ${name} ! `;
      if (activity) s += `Votre activité principale en ce moment est : ${activity}. `;
      else s += `Toutes vos activités de ce moment sont terminées. `;
      if (hasNote) s += `Vous avez un message de votre famille. `;
      if (water !== undefined) s += `Vous avez bu ${water} verres d'eau aujourd'hui.`;
      return s;
    },
    speechGames: "Voici vos jeux cognitifs : Solitaire, Dominos, Mots Cachés, Mahjong, Sudoku et bien d'autres. Touchez un jeu pour exercer votre esprit !",
    speechActions: "Ici vous pouvez enregistrer ce que vous avez fait aujourd'hui : boire de l'eau, prendre vos médicaments, un repas, ou prévenir votre famille de votre état.",
    speechFinances: (balance) => `Votre solde disponible pour ce mois est de ${balance}.`,
  },

  de: {
    appointmentAlarmTitle: '⏰ Terminerinnerung & Wecker',
    scheduledFor: 'Geplant für',
    doctorLabel: 'Arzt / Facharzt',
    locationLabel: 'Ort / Adresse',
    listenAgain: 'Nochmals laut vorlesen',
    confirmSeen: '✓ OK, Ich habe es gesehen!',
    snooze10m: '⏱️ In 10 Minuten erinnern (Schlummern)',
    alarmActive: 'Wecker Aktiv',
    listenAlarmBtn: '🔊 Wecker anhören',
    testAlarmBtn: '🔊 Wecker testen',
    nextAppointment: 'Nächster Termin',
    noPending: 'Keine anstehenden Termine',
    demoTitle: 'Wecker-Test',
    demoText: 'Ton und deutsche Sprachausgabe funktionieren einwandfrei!',
    demoSpeech: (name) => `Hallo, ${name}! Dies ist ein Test des Terminerinnerungs-Weckers von Parent Care. Ton und Stimme funktionieren einwandfrei!`,
    alarmSpeech: ({ name, title, time, doctor, location }) =>
      `Achtung, ${name}! Erinnerung an Ihren Termin: ${title}, heute um ${time}.${doctor ? ` Mit ${doctor}.` : ''}${location ? ` Ort: ${location}.` : ''}`,

    greetingMorning: 'Guten Morgen',
    greetingAfternoon: 'Guten Nachmittag',
    greetingEvening: 'Guten Abend',
    trialDaysLabel: 'Tage',
    greeting: (name) => `Hallo, ${name}!`,
    familyConnected: 'Familie Verbunden',
    signOut: 'Abmelden',
    trialBadge: (days) => `${days} Tage kostenlos`,
    todaySummary: (count) => `${count} Aktivitäten heute`,
    allCalm: 'Alles ruhig im Tagesablauf',
    emergencySosTitle: 'NOTFALL / SOS',
    emergencySosSubtitle: 'Soforthilfe bei der Familie anfordern',
    emergencyAlertConfirm: 'NOTFALL-ALARM! Möchten Sie jetzt sofort einen dringenden Alarm an Ihre Familie senden?',

    cardMedsTitle: 'Medikament Genommen',
    cardMedsSubtitle: 'Zeitplan eingehalten',
    cardMedsNone: 'Keine aktiven Medikamente',
    cardWaterTitle: 'Wasser Getrunken',
    cardWaterSubtitle: (cups) => `${cups}/8 Gläser heute (+1)`,
    cardMealTitle: 'Bereits Gegessen',
    cardMealSubtitle: 'Mahlzeit erfasst',
    cardRoutineTitle: 'Heutiger Tagesplan',
    cardRoutineSubtitle: 'Tagesablauf ansehen',
    cardFamilyTitle: 'Familie',
    cardFamilySubtitle: 'Nachrichten & Fotos',
    cardGamesTitle: 'Denkspiele',
    cardGamesSubtitle: 'Gehirn trainieren',
    cardCallTitle: 'Möchte Sprechen',
    cardCallSubtitle: 'Ruf mich bitte an',
    cardMoodTitle: "Mir Geht's Gut!",
    cardMoodSubtitle: 'Familie benachrichtigen',

    tabHome: 'Start',
    tabRoutine: 'Tagesablauf',
    tabGames: 'Spiele',
    tabActions: 'Aktionen',
    tabFinances: 'Finanzen',

    routineTitle: 'Mein Tagesablauf & Termine',
    dayYesterday: 'Gestern',
    dayToday: 'Heute',
    dayTomorrow: 'Morgen',
    filterAll: 'Alle',
    filterMeds: 'Medikamente',
    filterMeals: 'Mahlzeiten',
    filterAppts: 'Termine',
    filterTasks: 'Aufgaben',
    noEventsDay: 'Keine Termine für diesen Tag geplant.',
    backBtn: 'Zurück',
    completedBadge: 'Erledigt',
    pendingBadge: 'Ausstehend',

    moodGreat: 'Super',
    moodGood: 'Gut',
    moodOkay: 'Geht so',
    moodSad: 'Traurig',
    moodNeedHelp: 'Brauche Hilfe',

    callModalTitle: 'Wir haben Ihre Familie benachrichtigt!',
    callModalSubtitle: 'Gesprächswunsch',
    callModalDesc: 'Ihre Familie wurde informiert, damit sich bald jemand bei Ihnen meldet.',
    callModalBtnCall: 'Familie Jetzt Anrufen',
    callModalBtnWa: 'Familien-WhatsApp Öffnen',
    callModalBtnDismiss: '✓ Verstanden, ich warte auf den Anruf',

    gamesHubTitle: 'Kognitive Denkspiele',
    gamesHubSubtitle: 'Spiele zur Förderung von Gedächtnis und Logik',
    gamesCategories: {
      all: 'Alle Spiele',
      cards: 'Karten',
      words: 'Wörter',
      numbers: 'Zahlen',
      memory: 'Gedächtnis',
      images: 'Bilder',
      strategy: 'Strategie',
      relaxation: 'Entspannung',
      family: 'Familienspiele',
    },
    gamesPlayNow: 'Jetzt Spielen',
    gamesLevel: 'Level',
    gamesStars: 'Sterne',
    gamesDailyChallenge: 'Tages-Herausforderung',
    gamesEvolution: 'Gehirntraining-Verlauf',
    gamesHistory: 'Verlauf',
    gamesAchievements: 'Erfolge',
    gamesFavorites: 'Favoriten',
    gamesSearchPlaceholder: 'Spiel suchen...',
    gamesFamilyBadge: 'Familie',

    gameNames: {
      paciencia: { title: 'Solitär', desc: 'Klassisches Kartenspiel für Denken und Strategie' },
      domino: { title: 'Domino', desc: 'Klassisches Dominospiel gegen den Computer' },
      caca_palavras: { title: 'Wortsuche', desc: 'Finde versteckte Wörter durch Wischen mit dem Finger' },
      mahjong: { title: 'Mahjong', desc: 'Kombiniere freie identische Spielsteine' },
      sudoku: { title: 'Sudoku', desc: 'Fülle das Gitter mit Zahlen von 1 bis 9 ohne Wiederholung' },
      memoria: { title: 'Memory-Spiel', desc: 'Finde passende Paare der umgedrehten Karten' },
      palavras_cruzadas: { title: 'Kreuzworträtsel', desc: 'Löse das Kreuzworträtsel mit den Hinweisen' },
      quebra_cabeca: { title: 'Puzzle', desc: 'Setze Teile zusammen, um das schöne Bild zu vollenden' },
      damas: { title: 'Damespiel', desc: 'Klassisches Damespiel mit einfachen Regeln' },
      memorias_familia: { title: 'Familien-Erinnerungen', desc: 'Quiz mit Fotos und Erinnerungen Ihrer eigenen Familie' },
      freecell: { title: 'FreeCell', desc: 'Ordne alle Karten auf die 4 Ablagestapel nach Farben' },
      spider: { title: 'Spider Solitär', desc: 'Bilde vollständige Sequenzen von König bis Ass' },
      tripeaks: { title: 'TriPeaks', desc: 'Beseitigen Sie die 3 Kartenpyramiden in Reihenfolge' },
      combine_tres: { title: '3-Gewinnt', desc: 'Verbinde 3 gleiche Elemente zum Entspannen' },
      encontre_diferencas: { title: '7 Unterschiede', desc: 'Finde die feinen Unterschiede in den Bildern' },
      perguntas_respostas: { title: 'Wissensquiz', desc: 'Spannendes Allgemeinwissen und Quizfragen' },
      objetos_escondidos: { title: 'Wimmelbild', desc: 'Suche und finde versteckte Gegenstände in der Szene' },
      unir_numeros: { title: 'Zahlen Verbinden', desc: 'Verschiebe und kombiniere gleiche Zahlen für Punkte' },
      blocos: { title: 'Block-Puzzle', desc: 'Platziere Holzblöcke und bilde vollständige Reihen' },
      bolhas: { title: 'Bubble-Shooter', desc: 'Ziele und bringe bunte Blasen zum Platzen' },
      formar_palavras: { title: 'Wortbau', desc: 'Verbinde Buchstaben im Kreis, um Wörter zu entdecken' },
      descubra_palavra: { title: 'Wort-Rätsel', desc: 'Errate das geheime 5-Buchstaben-Wort in 6 Versuchen' },
    },

    speechWater: (count) => `Klasse! Wieder ein Glas Wasser getrunken. Sie haben heute bereits ${count} Gläser geschafft.`,
    speechMeds: (name) => `Ausgezeichnet! Medikament ${name} wurde erfolgreich bestätigt.`,
    speechMeal: () => 'Sehr gut! Ihre Mahlzeit wurde erfolgreich erfasst.',
    speechMoodGood: (name) => `Wie schön, ${name}! Es freut uns sehr zu hören, dass es Ihnen gut geht.`,
    speechMoodBad: (name) => `Keine Sorge, ${name}. Wir haben Ihre Familie bereits informiert, damit man sich liebevoll bei Ihnen meldet.`,
    speechCallRequested: (name) => `Wir haben Ihre Familie benachrichtigt, ${name}! Es wird sich bald jemand melden.`,
    speechRoutine: (count, dayLabel) => `Ihr Tagesplan für ${dayLabel} umfasst ${count} Aktivitäten.`,
    speechNoRoutine: (dayLabel) => `Sie haben keine Termine für ${dayLabel}.`,

    activityNow: 'Aktuelle Aktivität',
    allDoneTitle: 'Alles erledigt für den Moment!',
    allDoneDesc: 'Sie sind voll im Zeitplan. Gönnen Sie sich eine Pause oder trinken Sie etwas Wasser!',
    btnTookMed: '✓ DIESES MEDIKAMENT EINGENOMMEN',
    btnHadMeal: '✓ MAHLZEIT EINGENOMMEN',
    btnCompleteNow: '✓ JETZT ABSCHLIESSEN',
    emergencyNumbersTitle: 'Schnellwahlnummern im Notfall',
    oneTapToCall: '1 Tipp zum Anrufen',
    ambulanceLabel: 'Rettungsdienst',
    firefightersLabel: 'Feuerwehr',
    rescueLabel: 'Rettung',
    policeLabel: 'Polizei',
    policeEmergencyLabel: 'Notruf',
    assistantTitle: 'Persönliche Assistentin',
    assistantVoiceText: 'Sprache & Text',
    assistantName: 'Mit Nina Sprechen',
    assistantDesc: 'Fragen Sie nach Terminen, Medikamenten oder unterhalten Sie sich per Sprache',
    assistantBtn: 'Unterhalten',
    seeAllTodayRoutine: (count) => `Alle heutigen Termine ansehen (${count})`,
    wokeUpTitle: 'Aufgewacht',
    sleepTitle: 'Schlafen Gehen',
    wokeUpSub: 'Guten Morgen!',
    sleepSub: 'Gute Nacht!',
    myMoneyTitle: 'Mein Geld',
    myMoneySub: 'Guthaben & Ausgaben',
    familyNoteTitle: 'Liebe Nachricht',
    listenBtn: 'Anhören',
    fromLabel: 'Von',
    atLabel: 'um',
    tapToEnter: 'Zum Öffnen tippen',
    myActivitiesTitle: 'Meine Aktivitäten & Schnellzugriffe',
    undoBtn: 'Rückgängig',
    actionUndone: 'Aktion rückgängig gemacht.',
    readAloudTooltip: 'Laut vorlesen',
    flexibleSchedule: 'Flexible Uhrzeit',
    doneStatus: '✓ Erledigt',
    pauseBtn: 'Pause',
    resumeBtn: 'Fortsetzen',
    pausedGameTitle: 'Spiel Pausiert',
    pausedGameDesc: 'Atmen Sie tief durch, trinken Sie ein Glas Wasser und spielen Sie weiter, sobald Sie bereit sind. Ihr Fortschritt ist gespeichert!',
    resumeGameBtn: 'Spiel Fortsetzen',
    backToGamesBtn: 'Zurück zu den Spielen',
    exitConfirm: 'Möchten Sie das Spiel verlassen? Ihr Fortschritt in diesem Level ist gespeichert.',

    actionsTitle: 'Was haben Sie gerade gemacht?',
    actionsSubtitle: 'Tippen Sie auf eine Schaltfläche, um zu protokollieren und Ihre Familie zu benachrichtigen:',
    actionWaterLabel: 'Wasser getrunken',
    actionWaterSub: (cups) => `+1 Glas (${cups}/8)`,
    actionMedsLabel: 'Medikament genommen',
    actionMedsSub: 'Zeitplan eingehalten',
    actionMealLabel: 'Gegessen',
    actionMealSub: 'Mahlzeit protokolliert',
    actionWakeLabel: 'Aufgewacht',
    actionWakeSub: 'Guten Morgen!',
    actionSleepLabel: 'Schlafen gehen',
    actionSleepSub: 'Gute Nacht!',
    actionActivityLabel: 'Aktivität',
    actionActivitySub: 'Spaziergang/Sport',
    actionLaterLabel: 'Später',
    actionLaterSub: 'In 15 Min erinnern',
    actionMoodTitle: 'Wie fühlen Sie sich?',
    actionFinancesTitle: 'Mein Guthaben & Finanzen',
    actionFinancesSubtitle: 'Monatsauszug anzeigen',
    familyNotified: 'Ihre Familie wurde benachrichtigt.',
    actionUrgentHelp: 'Ich brauche Hilfe',
    actionUrgentHelpSub: 'Familie benachrichtigen, damit sie mich anruft',
    actionNotified: (msg) => `${msg}! Ihre Familie wurde benachrichtigt.`,
    ninaTab: 'Nina KI',
    tabSos: 'SOS',
    cancelBtn: 'Abbrechen',
    sosCancel: 'Abbrechen / Versehentlich gedrückt',
    conversationRequestTitle: 'Anrufanfrage',
    conversationNotifiedTitle: 'Ihre Familie wurde benachrichtigt!',
    conversationSendingTitle: 'Benachrichtigung wird gesendet...',
    financeIncome: 'Einkommen',
    financeExpenses: 'Ausgaben',
    financeRegisterExpense: '+ AUSGABE ERFASSEN',
    financePension: 'Meine Rente / Einkommen',
    expenseLabelAmount: 'Ausgabenbetrag *',
    expenseLabelCategory: 'Kategorie:',
    expenseLabelDetail: 'Details (optional):',
    expenseSaving: 'Speichern...',
    expenseSave: '✓ Ausgabe speichern',
    expenseDeducted: 'Wird vom Monatsguthaben abgezogen.',
    pensionLabelAmount: 'Monatlicher Betrag *',
    pensionSaving: 'Speichern...',
    pensionSave: '✓ Einkommen speichern',
    pensionDesc: 'Monatliches Einkommen für die Guthabenberechnung.',
    speechHome: (name, activity, water, hasNote) => {
      let s = `Hallo, ${name}! `;
      if (activity) s += `Ihre Hauptaktivität gerade ist: ${activity}. `;
      else s += `Alle Ihre Aktivitäten für diese Zeit sind erledigt. `;
      if (hasNote) s += `Sie haben eine Nachricht von Ihrer Familie. `;
      if (water !== undefined) s += `Sie haben heute ${water} Gläser Wasser getrunken.`;
      return s;
    },
    speechGames: 'Hier sind Ihre kognitiven Spiele: Solitaire, Domino, Wortsuche, Mahjong, Sudoku und viele mehr. Tippen Sie auf ein Spiel, um Ihren Geist zu trainieren!',
    speechActions: 'Hier können Sie protokollieren, was Sie heute getan haben: Wasser trinken, Medikamente nehmen, eine Mahlzeit aufzeichnen oder Ihrer Familie mitteilen, wie es Ihnen geht.',
    speechFinances: (balance) => `Ihr verfügbares Guthaben für diesen Monat beträgt ${balance}.`,
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
    categoryPharmacy: 'Farmácia / Medicamento',
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
    incomeDay: 'Payment Day',
    spentSoFar: 'Spent so far',
    remaining: 'remaining',
    overBudget: 'Budget Exceeded!',
    addExpense: 'Record Expense',
    editIncome: 'Adjust Income',
    saveIncome: 'Save Pension',
    saveExpense: 'Save Expense',
    categoryPharmacy: 'Pharmacy / Meds',
    categoryMarket: 'Groceries / Food',
    categoryDoctor: 'Doctor / Tests',
    categoryHousing: 'Household Bills',
    categoryOther: 'Other Expenses',
    expenseAdded: 'Expense recorded! Your balance was updated.',
    incomeUpdated: 'Monthly income updated successfully!',
    selfManagementTitle: 'My Money & Expenses',
    selfManagementDesc: 'Track your pension and record what you spent.',
    budgetUsed: 'of budget used',
    noExpensesThisMonth: 'No expenses recorded this month.',
  },
  es: {
    title: 'Gestión Financiera para Adultos Mayores',
    subtitle: 'Control de pensión, gastos mensuales y saldo disponible en tiempo real.',
    monthlyIncome: 'Pensión / Ingresos',
    monthlyExpenses: 'Gastos Deducidos',
    availableBalance: 'Saldo Disponible',
    pensionConfig: 'Configurar Pensión',
    incomeSource: 'Fuente de Ingreso (ej. Pensión)',
    incomeAmount: 'Monto Mensual ($)',
    incomeDay: 'Día de Cobro',
    spentSoFar: 'Gastado hasta ahora',
    remaining: 'restante',
    overBudget: '¡Presupuesto Superado!',
    addExpense: 'Anotar Gasto',
    editIncome: 'Ajustar Ingreso',
    saveIncome: 'Guardar Pensión',
    saveExpense: 'Guardar Gasto',
    categoryPharmacy: 'Farmacia / Medicina',
    categoryMarket: 'Mercado / Alimentos',
    categoryDoctor: 'Médico / Exámenes',
    categoryHousing: 'Cuentas del Hogar',
    categoryOther: 'Otros Gastos',
    expenseAdded: '¡Gasto registrado! Tu saldo ha sido actualizado.',
    incomeUpdated: '¡Ingreso mensual actualizado con éxito!',
    selfManagementTitle: 'Mi Dinero y Gastos',
    selfManagementDesc: 'Sigue tu pensión y anota tus gastos del día a día.',
    budgetUsed: 'del presupuesto utilizado',
    noExpensesThisMonth: 'No hay gastos registrados este mes.',
  },
  fr: {
    title: 'Gestion Financière pour Personnes Âgées',
    subtitle: 'Contrôle des pensions, des dépenses et solde disponible en temps réel.',
    monthlyIncome: 'Pension / Revenus',
    monthlyExpenses: 'Dépenses Déduites',
    availableBalance: 'Solde Disponible',
    pensionConfig: 'Configurer la Pension',
    incomeSource: 'Source de Revenus (ex: Retraite)',
    incomeAmount: 'Montant Mensuel (€)',
    incomeDay: 'Jour de Versement',
    spentSoFar: 'Dépensé jusqu’à présent',
    remaining: 'restant',
    overBudget: 'Budget Dépassé!',
    addExpense: 'Ajouter Dépense',
    editIncome: 'Ajuster Revenu',
    saveIncome: 'Enregistrer Pension',
    saveExpense: 'Enregistrer Dépense',
    categoryPharmacy: 'Pharmacie / Médicaments',
    categoryMarket: 'Courses / Alimentation',
    categoryDoctor: 'Médecin / Examens',
    categoryHousing: 'Factures du Logement',
    categoryOther: 'Autres Dépenses',
    expenseAdded: 'Dépense enregistrée! Votre solde a été mis à jour.',
    incomeUpdated: 'Revenu mensuel mis à jour avec succès!',
    selfManagementTitle: 'Mon Argent & Dépenses',
    selfManagementDesc: 'Suivez votre pension et notez vos dépenses au fur et à mesure.',
    budgetUsed: 'du budget utilisé',
    noExpensesThisMonth: 'Aucune dépense enregistrée ce mois-ci.',
  },
  de: {
    title: 'Finanzverwaltung für Senioren',
    subtitle: 'Kontrolle über Rente, monatliche Ausgaben und verfügbares Guthaben.',
    monthlyIncome: 'Rente / Monatseinkommen',
    monthlyExpenses: 'Abgezogene Ausgaben',
    availableBalance: 'Verfügbares Guthaben',
    pensionConfig: 'Rente Konfigurieren',
    incomeSource: 'Einkommensquelle (z. B. Gesetzliche Rente)',
    incomeAmount: 'Monatlicher Betrag (€)',
    incomeDay: 'Auszahlungstag',
    spentSoFar: 'Bisher ausgegeben',
    remaining: 'verbleibend',
    overBudget: 'Budget Überschritten!',
    addExpense: 'Ausgabe Erfassen',
    editIncome: 'Einkommen Anpassen',
    saveIncome: 'Rente Speichern',
    saveExpense: 'Ausgabe Speichern',
    categoryPharmacy: 'Apotheke / Medikamente',
    categoryMarket: 'Lebensmittel / Supermarkt',
    categoryDoctor: 'Arzt / Untersuchungen',
    categoryHousing: 'Wohnungs- & Fixkosten',
    categoryOther: 'Sonstige Ausgaben',
    expenseAdded: 'Ausgabe notiert! Ihr Guthaben wurde aktualisiert.',
    incomeUpdated: 'Monatliches Einkommen erfolgreich aktualisiert!',
    selfManagementTitle: 'Mein Geld & Ausgaben',
    selfManagementDesc: 'Behalten Sie Ihre Rente im Blick und notieren Sie Ihre Ausgaben.',
    budgetUsed: 'des Budgets verbraucht',
    noExpensesThisMonth: 'In diesem Monat wurden keine Ausgaben erfasst.',
  },
};

export function getFinanceTexts(rawLocale?: string): FinanceI18n {
  const loc = normalizeLocale(rawLocale);
  return FINANCE_I18N[loc] || FINANCE_I18N['pt-BR'];
}
