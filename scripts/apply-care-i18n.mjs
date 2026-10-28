import { readFileSync, writeFileSync } from 'fs';

const FILE = String.raw`c:\Users\jamin\OneDrive\Área de Trabalho\PARENT CARE\src\app\[locale]\care\[id]\page.tsx`;

let src = readFileSync(FILE, 'utf8');

const replacements = [

  // ── 11. handleAction success message ──────────────────────────────────
  [
    "setSuccessMsg(`${message}! A família foi avisada.`);",
    "setSuccessMsg(tCare.actionNotified(message));",
  ],

  // ── 12. undoLastAction message ─────────────────────────────────────────
  [
    "setSuccessMsg('Ação cancelada.');",
    "setSuccessMsg(tCare.actionUndone);",
  ],

  // ── 10. handleReadAloudCurrentTab full function body ───────────────────
  [
`  const handleReadAloudCurrentTab = () => {
    unlockAudioContext();
    triggerHaptic(30);
    if (activeTab === 'home') {
      let speech = \`Olá, \${personInfo.name}! \`;
      if (currentNowEvent) {
        speech += \`No momento, sua atividade principal é: \${currentNowEvent.title}, agendada para \${currentNowEvent.time || 'agora'}. \`;
      } else {
        speech += \`Todas as suas atividades deste horário estão concluídas. \`;
      }
      if (familyMessage) {
        speech += \`Você tem um recado da família de \${familyMessage.sender}: \${familyMessage.text}. \`;
      }
      speech += \`Você já tomou \${cupsDrank} copos de água hoje.\`;
      speakReminder(speech, params.locale);
    } else if (activeTab === 'routine') {
      const dayLabel = selectedDayOffset === 0 ? 'Hoje' : selectedDayOffset === 1 ? 'Amanhã' : 'Ontem';
      const dayEvents = filteredEvents;
      if (dayEvents.length === 0) {
        speakReminder(\`Você não tem nenhum compromisso marcado para \${dayLabel}.\`, params.locale);
      } else {
        const eventsDesc = dayEvents.map(e => \`\${e.title}\${e.time ? \` às \${e.time}\` : ''}\`).join('. ');
        speakReminder(\`Sua rotina de \${dayLabel} tem \${dayEvents.length} atividades: \${eventsDesc}.\`, params.locale);
      }
    } else if (activeTab === 'games') {
      speakReminder('Aqui estão seus jogos cognitivos: Jogo da Forca, Memória, Caça-Palavras, Trivia Brasil, Genius e muito mais. Toque em um jogo para exercitar a mente!', params.locale);
    } else if (activeTab === 'actions') {
      speakReminder(\`Aqui você pode registrar o que fez hoje: beber água, tomar remédio, refeição, ou avisar como está se sentindo.\`, params.locale);
    } else if (activeTab === 'finances') {
      speakReminder(\`Seu saldo disponível para este mês é de \${formatCurrency(financeData.balance)}.\`, params.locale);
    }
  };`,
`  const handleReadAloudCurrentTab = () => {
    unlockAudioContext();
    triggerHaptic(30);
    if (activeTab === 'home') {
      const speech = tCare.speechHome(
        personInfo.name,
        currentNowEvent?.title,
        cupsDrank,
        !!familyMessage,
      );
      speakReminder(speech, params.locale);
    } else if (activeTab === 'routine') {
      const dayLabel = selectedDayOffset === 0 ? tCare.dayToday : selectedDayOffset === 1 ? tCare.dayTomorrow : tCare.dayYesterday;
      const dayEvents = filteredEvents;
      if (dayEvents.length === 0) {
        speakReminder(tCare.speechNoRoutine(dayLabel), params.locale);
      } else {
        speakReminder(tCare.speechRoutine(dayEvents.length, dayLabel), params.locale);
      }
    } else if (activeTab === 'games') {
      speakReminder(tCare.speechGames, params.locale);
    } else if (activeTab === 'actions') {
      speakReminder(tCare.speechActions, params.locale);
    } else if (activeTab === 'finances') {
      speakReminder(tCare.speechFinances(formatCurrency(financeData.balance)), params.locale);
    }
  };`,
  ],

  // ── 1. Routine tab header ──────────────────────────────────────────────
  [
    ">Minha Rotina</h2>",
    ">{tCare.routineTitle}</h2>",
  ],
  [
    "<Volume2 className='h-3.5 w-3.5' /> Ouvir",
    "<Volume2 className='h-3.5 w-3.5' /> {tCare.listenBtn}",
  ],
  [
    "                  { offset: -1, label: 'Ontem' },\n                  { offset: 0, label: 'Hoje' },\n                  { offset: 1, label: 'Amanhã' },",
    "                  { offset: -1, label: tCare.dayYesterday },\n                  { offset: 0, label: tCare.dayToday },\n                  { offset: 1, label: tCare.dayTomorrow },",
  ],
  [
    "                  { key: 'all', label: 'Tudo' },\n                  { key: 'medication', label: '💊 Remédios' },\n                  { key: 'meal', label: '🍽️ Refeições' },\n                  { key: 'appointment', label: '🩺 Consultas' },\n                  { key: 'task', label: '✅ Tarefas' },",
    "                  { key: 'all', label: tCare.filterAll },\n                  { key: 'medication', label: `💊 ${tCare.filterMeds}` },\n                  { key: 'meal', label: `🍽️ ${tCare.filterMeals}` },\n                  { key: 'appointment', label: `🩺 ${tCare.filterAppts}` },\n                  { key: 'task', label: `✅ ${tCare.filterTasks}` },",
  ],
  [
    "                   Nenhum compromisso deste tipo marcado para este dia.",
    "                   {tCare.noEventsDay}",
  ],
  [
    "                          ⏰ {ev.time || 'Horário flexível'}",
    "                          ⏰ {ev.time || tCare.flexibleSchedule}",
  ],
  [
    "                             ✓ Realizado",
    "                             {tCare.doneStatus}",
  ],

  // ── 2. Games tab ───────────────────────────────────────────────────────
  [
    "                    Passatempos Cognitivos",
    "                    {tCare.gamesHubTitle}",
  ],
  [
    "                    7 jogos para exercitar a memória e o raciocínio",
    "                    {tCare.gamesHubSubtitle}",
  ],
  [
    "                Voltar\n              </button>\n            </div>\n\n            <GamesAndMomentsHub",
    "                {tCare.backBtn}\n              </button>\n            </div>\n\n            <GamesAndMomentsHub",
  ],

  // ── 3. Actions tab header ──────────────────────────────────────────────
  [
    "<h2 className='text-lg font-black text-stone-900 dark:text-stone-100'>O que você fez agora?</h2>\n              <p className='text-xs text-stone-500 font-medium'>Toque no botão para registrar e avisar a família:</p>",
    "<h2 className='text-lg font-black text-stone-900 dark:text-stone-100'>{tCare.actionsTitle}</h2>\n              <p className='text-xs text-stone-500 font-medium'>{tCare.actionsSubtitle}</p>",
  ],

  // Finances shortcut button
  [
    "                  <span className='text-sm font-black text-stone-900 dark:text-white block'>Meu Saldo & Finanças</span>\n                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>Ver extrato mensal disponível</span>",
    "                  <span className='text-sm font-black text-stone-900 dark:text-white block'>{tCare.actionFinancesTitle}</span>\n                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>{tCare.actionFinancesSubtitle}</span>",
  ],

  // Water button
  [
    "                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>Bebi Água</span>\n                <span className='text-xs font-bold text-sky-700 dark:text-sky-300'>+1 copo ({cupsDrank}/8)</span>",
    "                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>{tCare.actionWaterLabel}</span>\n                <span className='text-xs font-bold text-sky-700 dark:text-sky-300'>{tCare.actionWaterSub(cupsDrank)}</span>",
  ],

  // Meds button (note: class is emerald-700 not blue-700 in actual file)
  [
    "                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>Tomei Remédio</span>\n                <span className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>Horário cumprido</span>",
    "                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>{tCare.actionMedsLabel}</span>\n                <span className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>{tCare.actionMedsSub}</span>",
  ],

  // Meal button — actual file says "Já Me Alimentei" not "Já Comi"
  [
    "                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>Já Me Alimentei</span>\n                <span className='text-xs font-bold text-amber-700 dark:text-amber-300'>Refeição feita</span>",
    "                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>{tCare.actionMealLabel}</span>\n                <span className='text-xs font-bold text-amber-700 dark:text-amber-300'>{tCare.actionMealSub}</span>",
  ],

  // Wake/Sleep button — ternary, replace the inner spans
  [
    "                  {hour < 15 ? 'Acordei' : 'Vou Dormir'}\n                </span>\n                <span className='text-xs font-bold text-indigo-700 dark:text-indigo-300'>\n                  {hour < 15 ? 'Bom dia família!' : 'Boa noite família!'}",
    "                  {hour < 15 ? tCare.actionWakeLabel : tCare.actionSleepLabel}\n                </span>\n                <span className='text-xs font-bold text-indigo-700 dark:text-indigo-300'>\n                  {hour < 15 ? tCare.actionWakeSub : tCare.actionSleepSub}",
  ],

  // Mood section title
  [
    "<h3 className='text-base font-black text-stone-900 dark:text-stone-100'>Como está seu humor hoje?</h3>",
    "<h3 className='text-base font-black text-stone-900 dark:text-stone-100'>{tCare.actionMoodTitle}</h3>",
  ],

  // Mood items — actual file has different emojis (😄 😊 instead of 😁 🙂)
  [
    "                  { mood: 'great', emoji: '😄', label: 'Muito Bem' },\n                  { mood: 'good', emoji: '😊', label: 'Tranquilo' },\n                  { mood: 'okay', emoji: '😐', label: 'Mais ou Menos' },\n                  { mood: 'bad', emoji: '😔', label: 'Com Dor' },",
    "                  { mood: 'great', emoji: '😄', label: tCare.moodGreat },\n                  { mood: 'good', emoji: '😊', label: tCare.moodGood },\n                  { mood: 'okay', emoji: '😐', label: tCare.moodOkay },\n                  { mood: 'bad', emoji: '😔', label: tCare.moodSad },",
  ],

  // ── 4. Finances tab ───────────────────────────────────────────────────
  [
    "                  <span>Renda: <strong className='text-emerald-700'>{formatCurrency(financeData.monthlyIncome)}</strong></span>\n                  <span>Gastos: <strong className='text-amber-700'>{formatCurrency(financeData.totalExpenses)}</strong></span>",
    "                  <span>{tCare.financeIncome}: <strong className='text-emerald-700'>{formatCurrency(financeData.monthlyIncome)}</strong></span>\n                  <span>{tCare.financeExpenses}: <strong className='text-amber-700'>{formatCurrency(financeData.totalExpenses)}</strong></span>",
  ],
  [
    "                <span>+ REGISTRAR GASTO</span>",
    "                <span>{tCare.financeRegisterExpense}</span>",
  ],
  [
    "                <span>Minha Aposentadoria / Renda</span>",
    "                <span>{tCare.financePension}</span>",
  ],

  // ── 5. Bottom nav ─────────────────────────────────────────────────────
  [
    "            <span className='text-[11px] leading-none'>Início</span>",
    "            <span className='text-[11px] leading-none'>{tCare.tabHome}</span>",
  ],
  [
    "            <span className='text-[11px] leading-none'>Rotina</span>",
    "            <span className='text-[11px] leading-none'>{tCare.tabRoutine}</span>",
  ],
  [
    "            <span className='text-[10px] font-black text-red-600 dark:text-red-400 leading-none mt-0.5'>SOS</span>",
    "            <span className='text-[10px] font-black text-red-600 dark:text-red-400 leading-none mt-0.5'>{tCare.tabSos}</span>",
  ],
  [
    "            <span className='text-[11px] leading-none'>Jogos</span>",
    "            <span className='text-[11px] leading-none'>{tCare.tabGames}</span>",
  ],
  [
    "            <span className='text-[11px] leading-none font-bold'>Nina IA</span>",
    "            <span className='text-[11px] leading-none font-bold'>{tCare.ninaTab}</span>",
  ],

  // ── 6. Conversation modal ─────────────────────────────────────────────
  [
    "                 Pedido de Conversa",
    "                 {tCare.conversationRequestTitle}",
  ],
  [
    "                 Avisamos sua família!",
    "                 {tCare.conversationNotifiedTitle}",
  ],

  // ── 7. SOS modal cancel ───────────────────────────────────────────────
  [
    "                Cancelar / Toquei Sem Querer",
    "                {tCare.sosCancel}",
  ],

  // ── 8. Expense modal ──────────────────────────────────────────────────
  [
    "                <p className='text-xs text-stone-500 font-medium'>Será abatido do saldo do mês.</p>",
    "                <p className='text-xs text-stone-500 font-medium'>{tCare.expenseDeducted}</p>",
  ],
  [
    "                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>Valor Gasto (R$) *</label>",
    "                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>{tCare.expenseLabelAmount}</label>",
  ],
  [
    "                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1.5'>Categoria:</label>",
    "                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1.5'>{tCare.expenseLabelCategory}</label>",
  ],
  [
    "                <label className='block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1'>Detalhe (opcional):</label>",
    "                <label className='block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1'>{tCare.expenseLabelDetail}</label>",
  ],
  // Expense modal cancel + save buttons
  [
    "                   Cancelar\n                 </Button>\n                 <Button type='submit' disabled={savingExpense} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                   {savingExpense ? 'Salvando...' : '✓ Salvar Gasto'}",
    "                   {tCare.cancelBtn}\n                 </Button>\n                 <Button type='submit' disabled={savingExpense} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                   {savingExpense ? tCare.expenseSaving : tCare.expenseSave}",
  ],

  // ── 9. Pension modal ──────────────────────────────────────────────────
  [
    "                <p className='text-xs text-stone-500 font-medium'>Renda mensal para cálculo de saldo.</p>",
    "                <p className='text-xs text-stone-500 font-medium'>{tCare.pensionDesc}</p>",
  ],
  [
    "                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>Valor Mensal (R$) *</label>",
    "                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>{tCare.pensionLabelAmount}</label>",
  ],
  // Pension modal cancel + save buttons
  [
    "                   Cancelar\n                 </Button>\n                 <Button type='submit' disabled={savingPension} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                   {savingPension ? 'Salvando...' : '✓ Salvar Minha Renda'}",
    "                   {tCare.cancelBtn}\n                 </Button>\n                 <Button type='submit' disabled={savingPension} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                   {savingPension ? tCare.pensionSaving : tCare.pensionSave}",
  ],
];

let successCount = 0;
let failCount = 0;
const failed = [];

for (const [from, to] of replacements) {
  if (src.includes(from)) {
    src = src.replace(from, to);
    successCount++;
  } else {
    failCount++;
    failed.push(from.slice(0, 80).replace(/\n/g, '\\n'));
  }
}

writeFileSync(FILE, src, 'utf8');

console.log(`\n✅ Applied ${successCount} replacements.`);
if (failCount > 0) {
  console.log(`\n⚠️  ${failCount} patterns NOT found (no change made):`);
  for (const f of failed) {
    console.log(`  - "${f}"`);
  }
} else {
  console.log('All patterns matched successfully.');
}
