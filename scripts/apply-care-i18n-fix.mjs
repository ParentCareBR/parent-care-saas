import { readFileSync, writeFileSync } from 'fs';

const FILE = String.raw`c:\Users\jamin\OneDrive\Área de Trabalho\PARENT CARE\src\app\[locale]\care\[id]\page.tsx`;

let src = readFileSync(FILE, 'utf8');

const replacements = [
  // noEventsDay — 18 spaces indent (actual file)
  [
    "                   Nenhum compromisso deste tipo marcado para este dia.",
    "                   {tCare.noEventsDay}",
  ],
  // Also try 18-space version as it shows in the reader (line 1694 had 18 spaces)
  [
    "                  Nenhum compromisso deste tipo marcado para este dia.",
    "                  {tCare.noEventsDay}",
  ],

  // doneStatus — 28 spaces indent (actual file line 1719)
  [
    "                            ✓ Realizado",
    "                            {tCare.doneStatus}",
  ],
  // try 28 spaces
  [
    "                             ✓ Realizado",
    "                             {tCare.doneStatus}",
  ],

  // Conversation modal — 17 spaces (actual line 2032)
  [
    "                 Pedido de Conversa",
    "                 {tCare.conversationRequestTitle}",
  ],
  // try 16
  [
    "                Pedido de Conversa",
    "                {tCare.conversationRequestTitle}",
  ],

  // Conversation notified — 17 spaces (actual line 2035)
  [
    "                 Avisamos sua família!",
    "                 {tCare.conversationNotifiedTitle}",
  ],
  [
    "                Avisamos sua família!",
    "                {tCare.conversationNotifiedTitle}",
  ],

  // Expense cancel+save buttons (actual lines 2235-2239, 18 spaces for "Cancelar")
  [
    "                  Cancelar\n                </Button>\n                <Button type='submit' disabled={savingExpense} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                  {savingExpense ? 'Salvando...' : '✓ Salvar Gasto'}",
    "                  {tCare.cancelBtn}\n                </Button>\n                <Button type='submit' disabled={savingExpense} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                  {savingExpense ? tCare.expenseSaving : tCare.expenseSave}",
  ],

  // Pension cancel+save buttons (actual lines 2272-2276, 18 spaces)
  [
    "                  Cancelar\n                </Button>\n                <Button type='submit' disabled={savingPension} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                  {savingPension ? 'Salvando...' : '✓ Salvar Minha Renda'}",
    "                  {tCare.cancelBtn}\n                </Button>\n                <Button type='submit' disabled={savingPension} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>\n                  {savingPension ? tCare.pensionSaving : tCare.pensionSave}",
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
    failed.push(from.slice(0, 100).replace(/\n/g, '\\n'));
  }
}

writeFileSync(FILE, src, 'utf8');

console.log(`\n✅ Applied ${successCount} replacements.`);
if (failCount > 0) {
  console.log(`\n⚠️  ${failCount} patterns NOT found:`);
  for (const f of failed) {
    console.log(`  - "${f}"`);
  }
} else {
  console.log('All patterns matched successfully.');
}
