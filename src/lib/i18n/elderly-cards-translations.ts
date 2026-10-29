export interface ElderlyMainCardsTranslations {
  routine: {
    title: string;
    subtitle: string;
  };
  medications: {
    title: string;
    subtitle: (taken: number, total: number) => string;
  };
  agenda: {
    title: string;
    subtitle: string;
  };
  aiChat: {
    title: string;
    subtitle: string;
    badge: string;
  };
  games: {
    title: string;
    subtitle: string;
    badge: string;
  };
  routineSummary: {
    completedText: (completed: number, total: number) => string;
    remainingText: (remaining: number) => string;
    allDone: string;
    seeAgenda: string;
  };
  buttons: {
    tookMed: string;
    hadMeal: string;
    completedTask: string;
    confirming: string;
  };
}

export const ELDERLY_CARDS_I18N: Record<string, ElderlyMainCardsTranslations> = {
  'pt-BR': {
    routine: {
      title: 'Minha Rotina',
      subtitle: 'Atividades, refeições e tarefas de hoje',
    },
    medications: {
      title: 'Meus Remédios',
      subtitle: (taken, total) => total > 0 ? `${taken} de ${total} tomados hoje` : 'Nenhum remédio pendente',
    },
    agenda: {
      title: 'Minha Agenda',
      subtitle: 'Consultas médicas e compromissos',
    },
    aiChat: {
      title: 'Conversar com a IA',
      subtitle: 'Converse com a Nina por voz ou texto',
      badge: 'Voz & Chat',
    },
    games: {
      title: 'Jogos e Memória',
      subtitle: 'Exercícios estimulantes para a mente',
      badge: 'Cognitivo',
    },
    routineSummary: {
      completedText: (c, t) => `${c} de ${t} atividades concluídas hoje`,
      remainingText: (r) => `${r} ${r === 1 ? 'atividade restante' : 'atividades restantes'} para hoje`,
      allDone: 'Parabéns! Todas as atividades de hoje estão concluídas.',
      seeAgenda: 'Ver agenda completa',
    },
    buttons: {
      tookMed: '✓ Já tomei esse remédio',
      hadMeal: '✓ Já me alimentei',
      completedTask: '✓ Já fiz essa atividade',
      confirming: 'Salvando confirmação...',
    },
  },
  'en': {
    routine: {
      title: 'My Routine',
      subtitle: 'Today’s activities, meals, and tasks',
    },
    medications: {
      title: 'My Medications',
      subtitle: (taken, total) => total > 0 ? `${taken} of ${total} taken today` : 'No medications pending',
    },
    agenda: {
      title: 'My Schedule',
      subtitle: 'Doctor appointments and events',
    },
    aiChat: {
      title: 'Talk with AI',
      subtitle: 'Chat with Nina via voice or text',
      badge: 'Voice & Chat',
    },
    games: {
      title: 'Games & Memory',
      subtitle: 'Fun cognitive exercises for the mind',
      badge: 'Cognitive',
    },
    routineSummary: {
      completedText: (c, t) => `${c} of ${t} activities completed today`,
      remainingText: (r) => `${r} ${r === 1 ? 'activity' : 'activities'} remaining for today`,
      allDone: 'Great job! All activities for today are completed.',
      seeAgenda: 'View full schedule',
    },
    buttons: {
      tookMed: '✓ I took this medication',
      hadMeal: '✓ I finished my meal',
      completedTask: '✓ I completed this activity',
      confirming: 'Saving confirmation...',
    },
  },
  'es': {
    routine: {
      title: 'Mi Rutina',
      subtitle: 'Actividades, comidas y tareas de hoy',
    },
    medications: {
      title: 'Mis Medicamentos',
      subtitle: (taken, total) => total > 0 ? `${taken} de ${total} tomados hoy` : 'Ningún medicamento pendiente',
    },
    agenda: {
      title: 'Mi Agenda',
      subtitle: 'Citas médicas y compromisos',
    },
    aiChat: {
      title: 'Hablar con la IA',
      subtitle: 'Conversa con Nina por voz o texto',
      badge: 'Voz y Chat',
    },
    games: {
      title: 'Juegos y Memoria',
      subtitle: 'Ejercicios estimulantes para la mente',
      badge: 'Cognitivo',
    },
    routineSummary: {
      completedText: (c, t) => `${c} de ${t} actividades realizadas hoy`,
      remainingText: (r) => `${r} ${r === 1 ? 'actividad restante' : 'actividades restantes'} para hoy`,
      allDone: '¡Excelente! Todas las actividades de hoy están completadas.',
      seeAgenda: 'Ver agenda completa',
    },
    buttons: {
      tookMed: '✓ Ya tomé este medicamento',
      hadMeal: '✓ Ya terminé mi comida',
      completedTask: '✓ Ya realicé esta actividad',
      confirming: 'Guardando confirmación...',
    },
  },
  'fr': {
    routine: {
      title: 'Ma Routine',
      subtitle: 'Activités, repas et tâches du jour',
    },
    medications: {
      title: 'Mes Médicaments',
      subtitle: (taken, total) => total > 0 ? `${taken} sur ${total} pris aujourd’hui` : 'Aucun médicament en attente',
    },
    agenda: {
      title: 'Mon Agenda',
      subtitle: 'Rendez-vous médicaux et événements',
    },
    aiChat: {
      title: 'Parler avec l’IA',
      subtitle: 'Discutez avec Nina par voix ou texte',
      badge: 'Voix & Chat',
    },
    games: {
      title: 'Jeux et Mémoire',
      subtitle: 'Exercices stimulants pour l’esprit',
      badge: 'Cognitif',
    },
    routineSummary: {
      completedText: (c, t) => `${c} sur ${t} activités terminées aujourd’hui`,
      remainingText: (r) => `${r} ${r === 1 ? 'activité restante' : 'activités restantes'} pour aujourd’hui`,
      allDone: 'Félicitations ! Toutes les activités d’aujourd’hui sont terminées.',
      seeAgenda: 'Voir l’agenda complet',
    },
    buttons: {
      tookMed: '✓ J’ai pris ce médicament',
      hadMeal: '✓ J’ai pris mon repas',
      completedTask: '✓ J’ai terminé cette activité',
      confirming: 'Enregistrement...',
    },
  },
  'de': {
    routine: {
      title: 'Meine Routine',
      subtitle: 'Heutige Aktivitäten, Mahlzeiten und Aufgaben',
    },
    medications: {
      title: 'Meine Medikamente',
      subtitle: (taken, total) => total > 0 ? `${taken} von ${total} heute eingenommen` : 'Keine Medikamente ausstehend',
    },
    agenda: {
      title: 'Mein Kalender',
      subtitle: 'Arzttermine und Verabredungen',
    },
    aiChat: {
      title: 'Mit der KI sprechen',
      subtitle: 'Sprechen Sie mit Nina per Stimme oder Text',
      badge: 'Stimme & Chat',
    },
    games: {
      title: 'Spiele & Gedächtnis',
      subtitle: 'Kognitive Übungen für den Geist',
      badge: 'Kognitiv',
    },
    routineSummary: {
      completedText: (c, t) => `${c} von ${t} Aktivitäten heute erledigt`,
      remainingText: (r) => `${r} ${r === 1 ? 'Aktivität' : 'Aktivitäten'} für heute verbleibend`,
      allDone: 'Sehr gut! Alle heutigen Aktivitäten sind abgeschlossen.',
      seeAgenda: 'Ganzen Kalender ansehen',
    },
    buttons: {
      tookMed: '✓ Ich habe dieses Medikament genommen',
      hadMeal: '✓ Ich habe meine Mahlzeit beendet',
      completedTask: '✓ Ich habe diese Aktivität erledigt',
      confirming: 'Bestätigung wird gespeichert...',
    },
  },
};

export function getElderlyCardsTexts(rawLocale?: string): ElderlyMainCardsTranslations {
  if (!rawLocale) return ELDERLY_CARDS_I18N['pt-BR'];
  const norm = rawLocale.startsWith('pt') ? 'pt-BR' : rawLocale.split('-')[0];
  return ELDERLY_CARDS_I18N[norm] || ELDERLY_CARDS_I18N['pt-BR'];
}
