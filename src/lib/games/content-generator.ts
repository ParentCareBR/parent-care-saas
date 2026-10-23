// Procedural content generator and seed bank for all 21 games
// Provides 100+ stages per game with smooth senior-friendly difficulty progression

export interface SudokuPuzzle {
  size: 4 | 6 | 9;
  initial: (number | null)[][];
  solution: number[][];
  difficulty: 'iniciante' | 'tranquilo' | 'intermediario' | 'experiente' | 'desafio';
}

export function getSudokuLevel(level: number): SudokuPuzzle {
  const seed = (level * 9301 + 49297) % 233280;
  
  if (level <= 30) {
    // 4x4 Mini Sudoku (2x2 blocks) - numbers 1 to 4
    // Base valid 4x4 solution
    const baseSol = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ];
    // Permute digits based on level
    const perm = [1, 2, 3, 4].sort((a, b) => ((seed + a * 7) % 5) - ((seed + b * 7) % 5));
    const sol = baseSol.map(row => row.map(v => perm[v - 1]));
    
    // Remove cells based on level:
    // Level 1-10: 4 missing cells
    // Level 11-20: 6 missing cells
    // Level 21-30: 8 missing cells
    const missing = level <= 10 ? 4 : level <= 20 ? 6 : 8;
    const initial = sol.map(r => [...r]) as (number | null)[][];
    
    let removed = 0;
    for (let r = 0; r < 4 && removed < missing; r++) {
      for (let c = 0; c < 4 && removed < missing; c++) {
        if ((seed + r * 4 + c) % 2 === 0) {
          initial[r][c] = null;
          removed++;
        }
      }
    }
    // Guarantee at least 'missing' nulls
    for (let i = 0; i < missing; i++) {
      const r = (seed + i * 3) % 4;
      const c = (seed + i * 5) % 4;
      initial[r][c] = null;
    }

    return {
      size: 4,
      initial,
      solution: sol,
      difficulty: level <= 10 ? 'iniciante' : 'tranquilo',
    };
  } else if (level <= 70) {
    // 6x6 Sudoku (2x3 blocks) - numbers 1 to 6
    const baseSol = [
      [1, 2, 3, 4, 5, 6],
      [4, 5, 6, 1, 2, 3],
      [2, 3, 1, 5, 6, 4],
      [5, 6, 4, 2, 3, 1],
      [3, 1, 2, 6, 4, 5],
      [6, 4, 5, 3, 1, 2],
    ];
    const perm = [1, 2, 3, 4, 5, 6].sort((a, b) => ((seed + a * 11) % 7) - ((seed + b * 11) % 7));
    const sol = baseSol.map(row => row.map(v => perm[v - 1]));
    const initial = sol.map(r => [...r]) as (number | null)[][];
    const missing = 12 + Math.min(10, Math.floor((level - 30) / 4));

    for (let i = 0; i < missing; i++) {
      const r = (seed + i * 7) % 6;
      const c = (seed + i * 13) % 6;
      initial[r][c] = null;
    }

    return {
      size: 6,
      initial,
      solution: sol,
      difficulty: level <= 50 ? 'tranquilo' : 'intermediario',
    };
  } else {
    // 9x9 Classic Sudoku
    const baseSol = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ];
    const perm = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => ((seed + a * 13) % 9) - ((seed + b * 13) % 9));
    const sol = baseSol.map(row => row.map(v => perm[v - 1]));
    const initial = sol.map(r => [...r]) as (number | null)[][];
    const missing = 28 + Math.min(22, Math.floor((level - 70) / 2));

    for (let i = 0; i < missing; i++) {
      const r = (seed + i * 11) % 9;
      const c = (seed + i * 17) % 9;
      initial[r][c] = null;
    }

    return {
      size: 9,
      initial,
      solution: sol,
      difficulty: level <= 85 ? 'intermediario' : level <= 100 ? 'experiente' : 'desafio',
    };
  }
}

// ── WORD SEARCH PROCEDURAL GENERATOR ──
export interface WordSearchPuzzle {
  grid: string[][];
  words: string[];
  theme: string;
  size: number;
}

const WORD_BANKS: Record<string, { theme: string; words: string[] }[]> = {
  'pt-BR': [
    { theme: 'Família & Afeto', words: ['AMOR', 'PAZ', 'CASA', 'NETO', 'ABRACO', 'SORRISO', 'FILHO', 'MAE', 'PAI', 'UNIAO'] },
    { theme: 'Natureza & Jardim', words: ['FLOR', 'SOL', 'ROSA', 'FOLHA', 'ARVORE', 'PASSARO', 'JARDIM', 'VENTO', 'RIO', 'TERRA'] },
    { theme: 'Comidas Gostosas', words: ['CAFE', 'BOLO', 'CHA', 'PUDIM', 'FRUTA', 'DOCE', 'SOPA', 'PAO', 'QUEIJO', 'SUCO'] },
    { theme: 'Animais Amigos', words: ['GATO', 'CAO', 'PATO', 'PEIXE', 'PASSARO', 'COELHO', 'CAVALO', 'CORUJA', 'TARTARUGA'] },
    { theme: 'Música & Lazer', words: ['VIOLAO', 'SOM', 'CANCAO', 'RADIO', 'FESTA', 'VIAGEM', 'POESIA', 'LIVRO', 'ARTE', 'CINEMA'] },
    { theme: 'Sentimentos Bons', words: ['ALEGRIA', 'SAUDE', 'ESPERANCA', 'CALMA', 'CARINHO', 'BONDADE', 'GRATIDAO', 'PAZ'] },
  ],
  en: [
    { theme: 'Family & Love', words: ['LOVE', 'PEACE', 'HOME', 'SMILE', 'FAMILY', 'HUG', 'KIND', 'HEART', 'HOPE', 'CARE'] },
    { theme: 'Nature', words: ['SUN', 'TREE', 'FLOWER', 'BIRD', 'RIVER', 'LEAF', 'GARDEN', 'WIND', 'STAR', 'SKY'] },
    { theme: 'Delicious Food', words: ['TEA', 'COFFEE', 'CAKE', 'BREAD', 'APPLE', 'SOUP', 'FRUIT', 'HONEY', 'PIE'] },
  ],
  es: [
    { theme: 'Familia y Amor', words: ['AMOR', 'PAZ', 'CASA', 'NIETO', 'ABRAZO', 'SONRISA', 'HIJO', 'MADRE', 'PADRE'] },
    { theme: 'Naturaleza', words: ['FLOR', 'SOL', 'ROSA', 'HOJA', 'ARBOL', 'PAJARO', 'JARDIN', 'VIENTO', 'RIO'] },
  ],
};

export function getWordSearchLevel(level: number, locale: string = 'pt-BR'): WordSearchPuzzle {
  const bank = WORD_BANKS[locale] || WORD_BANKS['pt-BR'];
  const themeIndex = (level - 1) % bank.length;
  const currentTheme = bank[themeIndex];
  
  // Size scales gently: 8x8 initially (levels 1-20), 10x10 (levels 21-60), 12x12 (61+)
  const size = level <= 20 ? 8 : level <= 60 ? 10 : 12;
  const wordCount = level <= 15 ? 4 : level <= 40 ? 5 : 6;
  const wordsToPlace = currentTheme.words.slice(0, wordCount);

  // Initialize empty grid
  const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));

  // Place words horizontally or vertically (always left-to-right or top-to-bottom for seniors)
  wordsToPlace.forEach((word, wIdx) => {
    const isHorizontal = wIdx % 2 === 0;
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 50) {
      attempts++;
      if (isHorizontal) {
        const row = (wIdx * 2 + attempts) % size;
        const maxCol = size - word.length;
        if (maxCol >= 0) {
          const col = Math.floor(Math.random() * (maxCol + 1));
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            if (grid[row][col + i] !== '' && grid[row][col + i] !== word[i]) {
              canPlace = false;
              break;
            }
          }
          if (canPlace) {
            for (let i = 0; i < word.length; i++) {
              grid[row][col + i] = word[i];
            }
            placed = true;
          }
        }
      } else {
        const col = (wIdx * 2 + attempts) % size;
        const maxRow = size - word.length;
        if (maxRow >= 0) {
          const row = Math.floor(Math.random() * (maxRow + 1));
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            if (grid[row + i][col] !== '' && grid[row + i][col] !== word[i]) {
              canPlace = false;
              break;
            }
          }
          if (canPlace) {
            for (let i = 0; i < word.length; i++) {
              grid[row + i][col] = word[i];
            }
            placed = true;
          }
        }
      }
    }
  });

  // Fill remaining cells with friendly letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return {
    grid,
    words: wordsToPlace,
    theme: currentTheme.theme,
    size,
  };
}

// ── MEMORY GAME PROCEDURAL GENERATOR ──
export interface MemoryPair {
  id: string;
  emoji: string;
  label: string;
}

const MEMORY_THEMES = [
  {
    theme: 'Frutas Frescas',
    items: [
      { emoji: '🍎', label: 'Maçã' }, { emoji: '🍌', label: 'Banana' }, { emoji: '🍇', label: 'Uva' },
      { emoji: '🍓', label: 'Morango' }, { emoji: '🍊', label: 'Laranja' }, { emoji: '🍉', label: 'Melancia' },
      { emoji: '🍍', label: 'Abacaxi' }, { emoji: '🥭', label: 'Manga' }, { emoji: '🥑', label: 'Abacate' },
      { emoji: '🍒', label: 'Cereja' }, { emoji: '🥝', label: 'Kiwi' }, { emoji: '🍐', label: 'Pera' },
    ],
  },
  {
    theme: 'Animais Fofos',
    items: [
      { emoji: '🐶', label: 'Cachorrinho' }, { emoji: '🐱', label: 'Gatinho' }, { emoji: '🐰', label: 'Coelhinho' },
      { emoji: '🐼', label: 'Panda' }, { emoji: '🐨', label: 'Coala' }, { emoji: '🦊', label: 'Raposa' },
      { emoji: '🦁', label: 'Leão' }, { emoji: '🐘', label: 'Elefante' }, { emoji: '🦒', label: 'Girafa' },
      { emoji: '🐧', label: 'Pinguim' }, { emoji: '🐬', label: 'Golfinho' }, { emoji: '🦋', label: 'Borboleta' },
    ],
  },
  {
    theme: 'Flores & Jardim',
    items: [
      { emoji: '🌹', label: 'Rosa' }, { emoji: '🌻', label: 'Girassol' }, { emoji: '🌷', label: 'Tulipa' },
      { emoji: '🌺', label: 'Hibisco' }, { emoji: '🌸', label: 'Cerejeira' }, { emoji: '🌼', label: 'Margarida' },
      { emoji: '🍀', label: 'Trevo' }, { emoji: '🌿', label: 'Raminho' }, { emoji: '🌲', label: 'Pinheiro' },
      { emoji: '🍁', label: 'Outono' }, { emoji: '🍄', label: 'Cogumelo' }, { emoji: '🌴', label: 'Palmeira' },
    ],
  },
];

export function getMemoryLevel(level: number): { pairs: MemoryPair[]; theme: string; pairCount: number } {
  const themeObj = MEMORY_THEMES[(level - 1) % MEMORY_THEMES.length];
  // Pair counts: level 1-10: 3-4 pairs (6-8 cards); level 11-30: 6 pairs; level 31-60: 8 pairs; 61+: 10-12 pairs
  let pairCount = 3;
  if (level > 60) pairCount = 10;
  else if (level > 30) pairCount = 8;
  else if (level > 10) pairCount = 6;
  else if (level > 5) pairCount = 4;

  const selectedItems = themeObj.items.slice(0, pairCount);
  const pairs: MemoryPair[] = selectedItems.map((item, idx) => ({
    id: `pair-${idx}`,
    emoji: item.emoji,
    label: item.label,
  }));

  return {
    pairs,
    theme: themeObj.theme,
    pairCount,
  };
}

// ── WORD DISCOVERY (FORCA SEM VIOLÊNCIA) ──
export interface WordDiscoveryPuzzle {
  word: string;
  category: string;
  hint: string;
}

const DISCOVERY_BANK: Record<string, WordDiscoveryPuzzle[]> = {
  'pt-BR': [
    { word: 'ABACAXI', category: 'Frutas', hint: 'Tem coroa mas não é rei' },
    { word: 'GIRASSOL', category: 'Flores', hint: 'Gira acompanhando o sol' },
    { word: 'BORBOLETA', category: 'Natureza', hint: 'Transforma-se após a lagarta' },
    { word: 'CHOCOLATE', category: 'Doces', hint: 'Feito com sementes de cacau' },
    { word: 'VIOLAO', category: 'Música', hint: 'Instrumento de seis cordas' },
    { word: 'CAFEEIRO', category: 'Plantas', hint: 'Produz a bebida favorita matinal' },
    { word: 'ESPERANCA', category: 'Sentimentos', hint: 'A última que morre' },
    { word: 'CARINHO', category: 'Afeto', hint: 'Gesto afetuoso que aquece' },
    { word: 'HARMONIA', category: 'Paz', hint: 'Equilíbrio e tranquilidade' },
    { word: 'PASSARINHO', category: 'Aves', hint: 'Canta na janela pela manhã' },
    { word: 'JARDINEIRO', category: 'Profissões', hint: 'Cuida das flores e plantas' },
    { word: 'TARTARUGA', category: 'Animais', hint: 'Anda devagar e vive muitos anos' },
    { word: 'BRISA', category: 'Clima', hint: 'Vento suave e agradável' },
    { word: 'ORQUIDEA', category: 'Flores', hint: 'Flor elegante e colorida' },
    { word: 'SINFONIA', category: 'Música', hint: 'Composição de orquestra' },
    { word: 'AMIZADE', category: 'Vida', hint: 'Conexão verdadeira entre pessoas' },
    { word: 'BICICLETA', category: 'Passeio', hint: 'Veículo de duas rodas movido a pedal' },
    { word: 'PIRACICABA', category: 'Lugares', hint: 'Famoso rio do interior' },
    { word: 'JABUTICABA', category: 'Frutas', hint: 'Cresce no tronco da árvore' },
    { word: 'ALECRIM', category: 'Temperos', hint: 'Erva aromática do campo' },
  ],
};

export function getWordDiscoveryLevel(level: number, locale: string = 'pt-BR'): WordDiscoveryPuzzle {
  const bank = DISCOVERY_BANK[locale] || DISCOVERY_BANK['pt-BR'];
  const index = (level - 1) % bank.length;
  return bank[index];
}
