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
