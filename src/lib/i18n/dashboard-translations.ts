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

export interface DashboardTexts {
  categoryTitle: string;
  categorySubtitle: string;
  cardsCount: (count: number) => string;
  searchPlaceholder: string;

  cards: {
    agenda: { title: string };
    medications: { title: string };
    meals: { title: string };
    appointments: { title: string };
    activities: { title: string };
    vitals: { title: string };
    hydration: { title: string; badge: (cups: number) => string };
    games: { title: string; badge: string };
    tasks: { title: string };
    nina: { title: string; badge: string };
    expenses: { title: string };
    shopping: { title: string };
    handovers: { title: string };
    elderlyMode: { title: string; badge: string };
    family: { title: string };
    caredPeople: { title: string };
    reports: { title: string };
    history: { title: string };
    safety: { title: string };
    memories: { title: string };
    settings: { title: string };
    whatsapp: { title: string };
    sos: { title: string; badge: string };
    prescriptions: { title: string };
  };

  caringFor: string;
  seniorMode: string;
  openSeniorMode: string;
  todaySchedule: string;
  viewAll: string;
  allCalmToday: string;
  selectLanguage: string;

  trial: {
    urgentTitle: string;
    normalTitle: string;
    message: (days: number) => string;
    viewPlansBtn: string;
  };

  bottomNav: {
    home: string;
    schedule: string;
    medications: string;
    nina: string;
  };

  sidebar: {
    home: string;
    appointments: string;
    medications: string;
    meals: string;
    tasks: string;
    nina: string;
    history: string;
    family: string;
    shopping: string;
    expenses: string;
    handovers: string;
    reports: string;
    activities: string;
    safety: string;
    memories: string;
  };
}

export const DASHBOARD_TRANSLATIONS: Record<SupportedLocale, DashboardTexts> = {
  'pt-BR': {
    categoryTitle: 'Categoria',
    categorySubtitle: 'Todos os recursos e opções do Parent Care em cards diretos',
    cardsCount: (count) => `${count} Cards`,
    searchPlaceholder: 'Buscar recurso (ex: remédios, pressão, plantão...)',
    cards: {
      agenda: { title: 'Agenda' },
      medications: { title: 'Medicamentos' },
      meals: { title: 'Alimentação' },
      appointments: { title: 'Consultas' },
      activities: { title: 'Atividades' },
      vitals: { title: 'Sinais Vitais' },
      hydration: { title: 'Hidratação', badge: (cups) => `${cups}/8 copos` },
      games: { title: 'Jogos & Cérebro', badge: '7 Jogos' },
      tasks: { title: 'Tarefas' },
      nina: { title: 'Nina IA', badge: 'IA 24h' },
      expenses: { title: 'Despesas' },
      shopping: { title: 'Compras' },
      handovers: { title: 'Plantão' },
      elderlyMode: { title: 'Modo Idoso', badge: 'Acessível' },
      family: { title: 'Família' },
      caredPeople: { title: 'Idosos' },
      reports: { title: 'Relatórios' },
      history: { title: 'Histórico' },
      safety: { title: 'Segurança' },
      memories: { title: 'Memórias' },
      settings: { title: 'Ajustes' },
      whatsapp: { title: 'WhatsApp' },
      sos: { title: 'SOS / Ajuda', badge: 'Urgente' },
      prescriptions: { title: 'Prescrições' },
    },
    caringFor: 'Acompanhando',
    seniorMode: 'Modo Idoso',
    openSeniorMode: 'Abrir Modo Idoso ↗',
    todaySchedule: 'Agenda de hoje',
    viewAll: 'Ver tudo',
    allCalmToday: 'Tudo tranquilo por hoje.',
    selectLanguage: 'Selecionar Idioma',
    trial: {
      urgentTitle: 'Atenção ao prazo:',
      normalTitle: 'Período de Teste Grátis:',
      message: (days) => `Você tem ${days === 1 ? '1 dia restante' : `${days} dias restantes`} com acesso completo a todos os recursos sem cobrança.`,
      viewPlansBtn: 'Ver Planos & Assinar',
    },
    bottomNav: {
      home: 'Início',
      schedule: 'Agenda',
      medications: 'Remédios',
      nina: 'Nina IA',
    },
    sidebar: {
      home: 'Início',
      appointments: 'Agenda',
      medications: 'Remédios',
      meals: 'Alimentação',
      tasks: 'Tarefas',
      nina: 'Nina IA',
      history: 'Histórico',
      family: 'Família',
      shopping: 'Compras',
      expenses: 'Despesas',
      handovers: 'Passagem de Turno',
      reports: 'Relatórios',
      activities: 'Atividades',
      safety: 'Segurança',
      memories: 'Memórias',
    },
  },

  en: {
    categoryTitle: 'Categories',
    categorySubtitle: 'All Parent Care tools and features in direct cards',
    cardsCount: (count) => `${count} Cards`,
    searchPlaceholder: 'Search features (e.g. medications, vitals, shifts...)',
    cards: {
      agenda: { title: 'Schedule' },
      medications: { title: 'Medications' },
      meals: { title: 'Meals & Diet' },
      appointments: { title: 'Appointments' },
      activities: { title: 'Activities' },
      vitals: { title: 'Vital Signs' },
      hydration: { title: 'Hydration', badge: (cups) => `${cups}/8 glasses` },
      games: { title: 'Games & Brain', badge: '7 Games' },
      tasks: { title: 'Tasks' },
      nina: { title: 'Nina AI', badge: 'AI 24/7' },
      expenses: { title: 'Expenses' },
      shopping: { title: 'Shopping' },
      handovers: { title: 'Shift Handover' },
      elderlyMode: { title: 'Senior View', badge: 'Accessible' },
      family: { title: 'Family' },
      caredPeople: { title: 'Seniors' },
      reports: { title: 'Reports' },
      history: { title: 'History' },
      safety: { title: 'Home Safety' },
      memories: { title: 'Memories' },
      settings: { title: 'Settings' },
      whatsapp: { title: 'WhatsApp' },
      sos: { title: 'SOS / Help', badge: 'Urgent' },
      prescriptions: { title: 'Prescriptions' },
    },
    caringFor: 'Caring for',
    seniorMode: 'Senior View',
    openSeniorMode: 'Open Senior View ↗',
    todaySchedule: "Today's Schedule",
    viewAll: 'View all',
    allCalmToday: 'All clear for today.',
    selectLanguage: 'Select Language',
    trial: {
      urgentTitle: 'Attention to deadline:',
      normalTitle: 'Free Trial Period:',
      message: (days) => `You have ${days === 1 ? '1 day remaining' : `${days} days remaining`} with full access to all features at no charge.`,
      viewPlansBtn: 'View Plans & Subscribe',
    },
    bottomNav: {
      home: 'Home',
      schedule: 'Schedule',
      medications: 'Meds',
      nina: 'Nina AI',
    },
    sidebar: {
      home: 'Home',
      appointments: 'Schedule',
      medications: 'Medications',
      meals: 'Nutrition',
      tasks: 'Tasks',
      nina: 'Nina AI',
      history: 'History',
      family: 'Family',
      shopping: 'Shopping',
      expenses: 'Expenses',
      handovers: 'Shift Handover',
      reports: 'Reports',
      activities: 'Activities',
      safety: 'Home Safety',
      memories: 'Memories',
    },
  },

  es: {
    categoryTitle: 'Categorías',
    categorySubtitle: 'Todas las herramientas de Parent Care en tarjetas directas',
    cardsCount: (count) => `${count} Tarjetas`,
    searchPlaceholder: 'Buscar función (ej: medicamentos, presión, turnos...)',
    cards: {
      agenda: { title: 'Agenda' },
      medications: { title: 'Medicamentos' },
      meals: { title: 'Alimentación' },
      appointments: { title: 'Consultas' },
      activities: { title: 'Actividades' },
      vitals: { title: 'Signos Vitales' },
      hydration: { title: 'Hidratación', badge: (cups) => `${cups}/8 vasos` },
      games: { title: 'Juegos y Mente', badge: '7 Juegos' },
      tasks: { title: 'Tareas' },
      nina: { title: 'Nina IA', badge: 'IA 24h' },
      expenses: { title: 'Gastos' },
      shopping: { title: 'Compras' },
      handovers: { title: 'Guardia' },
      elderlyMode: { title: 'Modo Mayor', badge: 'Accesible' },
      family: { title: 'Familia' },
      caredPeople: { title: 'Mayores' },
      reports: { title: 'Informes' },
      history: { title: 'Historial' },
      safety: { title: 'Seguridad' },
      memories: { title: 'Recuerdos' },
      settings: { title: 'Ajustes' },
      whatsapp: { title: 'WhatsApp' },
      sos: { title: 'SOS / Ayuda', badge: 'Urgente' },
      prescriptions: { title: 'Prescripciones' },
    },
    caringFor: 'Acompañando a',
    seniorMode: 'Modo Mayor',
    openSeniorMode: 'Abrir Modo Mayor ↗',
    todaySchedule: 'Agenda de hoy',
    viewAll: 'Ver todo',
    allCalmToday: 'Todo tranquilo por hoy.',
    selectLanguage: 'Seleccionar Idioma',
    trial: {
      urgentTitle: 'Atención al plazo:',
      normalTitle: 'Período de Prueba Gratis:',
      message: (days) => `Tienes ${days === 1 ? '1 día restante' : `${days} días restantes`} con acceso completo a todas las funciones sin cargo.`,
      viewPlansBtn: 'Ver Planes y Suscribirse',
    },
    bottomNav: {
      home: 'Inicio',
      schedule: 'Agenda',
      medications: 'Medicinas',
      nina: 'Nina IA',
    },
    sidebar: {
      home: 'Inicio',
      appointments: 'Agenda',
      medications: 'Medicamentos',
      meals: 'Alimentación',
      tasks: 'Tareas',
      nina: 'Nina IA',
      history: 'Historial',
      family: 'Familia',
      shopping: 'Compras',
      expenses: 'Gastos',
      handovers: 'Guardia',
      reports: 'Informes',
      activities: 'Actividades',
      safety: 'Seguridad',
      memories: 'Recuerdos',
    },
  },

  fr: {
    categoryTitle: 'Catégories',
    categorySubtitle: 'Toutes les options de Parent Care en cartes d\'accès direct',
    cardsCount: (count) => `${count} Cartes`,
    searchPlaceholder: 'Rechercher (ex : médicaments, tension, garde...)',
    cards: {
      agenda: { title: 'Agenda' },
      medications: { title: 'Médicaments' },
      meals: { title: 'Alimentation' },
      appointments: { title: 'Rendez-vous' },
      activities: { title: 'Activités' },
      vitals: { title: 'Signes Vitaux' },
      hydration: { title: 'Hydratation', badge: (cups) => `${cups}/8 verres` },
      games: { title: 'Jeux & Cerveau', badge: '7 Jeux' },
      tasks: { title: 'Tâches' },
      nina: { title: 'Nina IA', badge: 'IA 24h' },
      expenses: { title: 'Dépenses' },
      shopping: { title: 'Achats' },
      handovers: { title: 'Passation' },
      elderlyMode: { title: 'Mode Aîné', badge: 'Accessible' },
      family: { title: 'Famille' },
      caredPeople: { title: 'Aînés' },
      reports: { title: 'Rapports' },
      history: { title: 'Historique' },
      safety: { title: 'Sécurité' },
      memories: { title: 'Souvenirs' },
      settings: { title: 'Réglages' },
      whatsapp: { title: 'WhatsApp' },
      sos: { title: 'SOS / Aide', badge: 'Urgent' },
      prescriptions: { title: 'Ordonnances' },
    },
    caringFor: 'Accompagnement de',
    seniorMode: 'Mode Aîné',
    openSeniorMode: 'Ouvrir Mode Aîné ↗',
    todaySchedule: "Programme d'aujourd'hui",
    viewAll: 'Voir tout',
    allCalmToday: "Tout est calme aujourd'hui.",
    selectLanguage: 'Sélectionner la langue',
    trial: {
      urgentTitle: 'Attention au délai :',
      normalTitle: "Période d'essai gratuit :",
      message: (days) => `Il vous reste ${days === 1 ? '1 jour' : `${days} jours`} avec un accès complet à toutes les fonctionnalités sans frais.`,
      viewPlansBtn: 'Voir les Forfaits & S\'abonner',
    },
    bottomNav: {
      home: 'Accueil',
      schedule: 'Agenda',
      medications: 'Médicaments',
      nina: 'Nina IA',
    },
    sidebar: {
      home: 'Accueil',
      appointments: 'Agenda',
      medications: 'Médicaments',
      meals: 'Alimentation',
      tasks: 'Tâches',
      nina: 'Nina IA',
      history: 'Historique',
      family: 'Famille',
      shopping: 'Achats',
      expenses: 'Dépenses',
      handovers: 'Passation',
      reports: 'Rapports',
      activities: 'Activités',
      safety: 'Sécurité',
      memories: 'Souvenirs',
    },
  },

  de: {
    categoryTitle: 'Kategorien',
    categorySubtitle: 'Alle Parent Care-Funktionen auf direkten Kacheln',
    cardsCount: (count) => `${count} Kacheln`,
    searchPlaceholder: 'Funktion suchen (z.B. Medikamente, Vitalwerte, Schicht...)',
    cards: {
      agenda: { title: 'Termine' },
      medications: { title: 'Medikamente' },
      meals: { title: 'Ernährung' },
      appointments: { title: 'Arzttermine' },
      activities: { title: 'Aktivitäten' },
      vitals: { title: 'Vitalwerte' },
      hydration: { title: 'Flüssigkeit', badge: (cups) => `${cups}/8 Gläser` },
      games: { title: 'Spiele & Geist', badge: '7 Spiele' },
      tasks: { title: 'Aufgaben' },
      nina: { title: 'Nina KI', badge: 'KI 24h' },
      expenses: { title: 'Ausgaben' },
      shopping: { title: 'Einkauf' },
      handovers: { title: 'Schichtwechsel' },
      elderlyMode: { title: 'Seniorenmodus', badge: 'Barrierefrei' },
      family: { title: 'Familie' },
      caredPeople: { title: 'Senioren' },
      reports: { title: 'Berichte' },
      history: { title: 'Verlauf' },
      safety: { title: 'Sicherheit' },
      memories: { title: 'Erinnerungen' },
      settings: { title: 'Einstellungen' },
      whatsapp: { title: 'WhatsApp' },
      sos: { title: 'SOS / Hilfe', badge: 'Dringend' },
      prescriptions: { title: 'Rezepte' },
    },
    caringFor: 'Betreuung von',
    seniorMode: 'Seniorenmodus',
    openSeniorMode: 'Seniorenmodus öffnen ↗',
    todaySchedule: 'Heutiger Zeitplan',
    viewAll: 'Alle anzeigen',
    allCalmToday: 'Heute alles ruhig.',
    selectLanguage: 'Sprache wählen',
    trial: {
      urgentTitle: 'Frist beachten:',
      normalTitle: 'Kostenlose Testphase:',
      message: (days) => `Sie haben noch ${days === 1 ? '1 Tag' : `${days} Tage`} mit vollem Zugriff auf alle Funktionen ohne Gebühren.`,
      viewPlansBtn: 'Pläne ansehen & abonnieren',
    },
    bottomNav: {
      home: 'Start',
      schedule: 'Termine',
      medications: 'Medikamente',
      nina: 'Nina KI',
    },
    sidebar: {
      home: 'Start',
      appointments: 'Termine',
      medications: 'Medikamente',
      meals: 'Ernährung',
      tasks: 'Aufgaben',
      nina: 'Nina KI',
      history: 'Verlauf',
      family: 'Familie',
      shopping: 'Einkauf',
      expenses: 'Ausgaben',
      handovers: 'Schichtwechsel',
      reports: 'Berichte',
      activities: 'Aktivitäten',
      safety: 'Sicherheit',
      memories: 'Erinnerungen',
    },
  },
};

export function getDashboardTexts(rawLocale?: string): DashboardTexts {
  const loc = normalizeLocale(rawLocale);
  return DASHBOARD_TRANSLATIONS[loc] || DASHBOARD_TRANSLATIONS['pt-BR'];
}
