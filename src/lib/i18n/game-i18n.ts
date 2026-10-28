export type SupportedGameLocale = 'pt-BR' | 'en' | 'es' | 'fr' | 'de';

export function normalizeGameLocale(raw?: string): SupportedGameLocale {
  if (!raw) return 'pt-BR';
  const lower = raw.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('en')) return 'en';
  return 'pt-BR';
}

export interface GameCommonTexts {
  hint: string;
  hintPair: string;
  hintStart: string;
  hintDiff: string;
  restart: string;
  restartTitle: string;
  shuffle: string;
  undo: string;
  erase: string;
  hintsUsedCount: (count: number) => string;
  levelOf: (current: number, total?: string) => string;
  footerTag: string;
  playAgain: string;
  nextLevel: string;
  congratulations: string;
  stageCompleted: string;
  wordsFoundAll: string;
  boardCleared: string;
  memoryWin: string;
  goalReached: string;
  completed: string;
  score: string;
  moves: string;
  time: string;

  // Solitaire / Spider / FreeCell
  solitaire: {
    instructions: string;
    hintAceCol: (col: number) => string;
    hintAceWaste: string;
    hintReveal: string;
    hintDraw: string;
    winTitle: string;
    winDesc: string;
  };

  // Domino
  domino: {
    yourTurn: string;
    tableOpen: (left: number, right: number) => string;
    botPassed: (botName: string) => string;
    youPassed: (botName: string) => string;
    playerWon: string;
    botWon: (botName: string) => string;
    buy: (count: number) => string;
    pass: string;
    winPointsPlayer: string;
    winPointsBot: (botName: string) => string;
    hintMatch: (left: number, right: number) => string;
    hintBuy: string;
    hintPass: string;
  };

  // Mahjong
  mahjong: {
    instructions: string;
    tilesRemaining: (count: number) => string;
    noMovesLeft: string;
    winTitle: string;
    winDesc: string;
  };

  // Sudoku
  sudoku: {
    instructions: string;
    hintApplied: (num: number) => string;
    erase: string;
    errors: string;
    winTitle: string;
    winDesc: string;
  };

  // Memory
  memory: {
    pairsFound: (found: number, total: number) => string;
    instructions: string;
    winTitle: string;
    winDesc: string;
  };

  // Checkers
  checkers: {
    yourTurn: string;
    botTurn: (name: string) => string;
    youWon: string;
    botWon: (name: string) => string;
    hintAdvance: (row: number) => string;
    hintDiagonals: string;
  };

  // Differences
  differences: {
    found: (found: number, total: number) => string;
    instructions: string;
    hintItem: (name: string) => string;
  };
}

export const GAME_TRANSLATIONS: Record<SupportedGameLocale, GameCommonTexts> = {
  'pt-BR': {
    hint: 'Dica',
    hintPair: 'Dica de Par',
    hintStart: 'Dica de Início',
    hintDiff: 'Dica de Diferença',
    restart: 'Reiniciar',
    restartTitle: 'Reiniciar jogo',
    shuffle: 'Embaralhar',
    undo: 'Desfazer',
    erase: 'Apagar',
    hintsUsedCount: (count) => `Dicas usadas: ${count}`,
    levelOf: (current, total = '100+') => `Nível ${current} de ${total}`,
    footerTag: 'Parent Care • Jogos e Momentos',
    playAgain: 'Jogar Novamente',
    nextLevel: 'Próxima Etapa',
    congratulations: 'Parabéns!',
    stageCompleted: 'Parabéns! Etapa Concluída! 🎉',
    wordsFoundAll: 'Você Encontrou Todas as Palavras! 🎉',
    boardCleared: 'Parabéns! Tabuleiro Limpo!',
    memoryWin: 'Parabéns! Memória Excelente! 🎉',
    goalReached: 'Parabéns! Meta Atingida!',
    completed: 'Concluído!',
    score: 'Pontos',
    moves: 'Movimentos',
    time: 'Tempo',

    solitaire: {
      instructions: 'Toque em uma carta para selecioná-la, depois toque onde quer colocá-la.',
      hintAceCol: (col) => `Dica: Há um Ás na coluna ${col} — mova-o para a base!`,
      hintAceWaste: 'Dica: O Ás no descarte pode ir para a base!',
      hintReveal: 'Dica: Tente mover cartas para revelar as viradas de costas.',
      hintDraw: 'Dica: Compre mais cartas do monte para continuar.',
      winTitle: 'Parabéns! Partida Concluída!',
      winDesc: 'Você organizou todas as cartas com grande calma e concentração.',
    },

    domino: {
      yourTurn: 'Sua vez! Toque em uma peça com borda verde para jogar.',
      tableOpen: (left, right) => `Jogo aberto na mesa com [${left} | ${right}]. Sua vez!`,
      botPassed: (botName) => `${botName} não tem peça e passou a vez. Sua vez de jogar!`,
      youPassed: (botName) => `Você passou a vez para ${botName}.`,
      playerWon: 'Parabéns! Você bateu o dominó e venceu!',
      botWon: (botName) => `${botName} bateu o dominó. Bom jogo!`,
      buy: (count) => `Comprar (${count})`,
      pass: 'Passar a vez',
      winPointsPlayer: '✨ Parabéns! Você tinha menos pontos nas pedras e levou a vitória!',
      winPointsBot: (botName) => `👏 ${botName} tinha menos pontos nesta rodada. Parabéns pelo empenho!`,
      hintMatch: (left, right) => `Dica: A peça [${left}|${right}] combina com uma das pontas da mesa.`,
      hintBuy: 'Dica: Não há peças que combinam. Compre do monte.',
      hintPass: 'Dica: Não há peças no monte, passe a vez para apurar os pontos.',
    },

    mahjong: {
      instructions: 'Toque em duas peças livres e idênticas para combiná-las e removê-las.',
      tilesRemaining: (count) => `${count} peças restantes`,
      noMovesLeft: 'Sem movimentos livres. Embaralhe para continuar.',
      winTitle: 'Parabéns! Tabuleiro Limpo!',
      winDesc: 'Você combinou todas as peças com grande harmonia e concentração.',
    },

    sudoku: {
      instructions: 'Selecione um espaço vazio e escolha o número de 1 a 9 correto.',
      hintApplied: (num) => `Dica aplicada: número ${num} preenchido.`,
      erase: 'Apagar',
      errors: 'Erros',
      winTitle: 'Parabéns! Sudoku Resolvido! 🎉',
      winDesc: 'Você completou toda a grade com excelente lógica.',
    },

    memory: {
      pairsFound: (found, total) => `Pares: ${found} de ${total}`,
      instructions: 'Vire as cartas e encontre todos os pares de imagens idênticas.',
      winTitle: 'Parabéns! Memória Excelente! 🎉',
      winDesc: 'Você encontrou todos os pares com grande agilidade mental.',
    },

    checkers: {
      yourTurn: 'Sua vez de jogar com as peças brancas.',
      botTurn: (name) => `${name} está pensando na jogada...`,
      youWon: 'Parabéns! Você venceu a partida de damas!',
      botWon: (name) => `${name} venceu desta vez. Tente novamente!`,
      hintAdvance: (row) => `Dica: A peça na linha ${row} pode avançar.`,
      hintDiagonals: 'Dica: Fique atento às diagonais livres.',
    },

    differences: {
      found: (found, total) => `${found} de ${total} diferenças encontradas`,
      instructions: 'Observe atentamente as duas imagens e toque nas diferenças.',
      hintItem: (name) => `Dica: Repare com atenção no(a) ${name}!`,
    },
  },

  en: {
    hint: 'Hint',
    hintPair: 'Pair Hint',
    hintStart: 'Start Hint',
    hintDiff: 'Difference Hint',
    restart: 'Restart',
    restartTitle: 'Restart game',
    shuffle: 'Shuffle',
    undo: 'Undo',
    erase: 'Erase',
    hintsUsedCount: (count) => `Hints used: ${count}`,
    levelOf: (current, total = '100+') => `Level ${current} of ${total}`,
    footerTag: 'Parent Care • Games & Moments',
    playAgain: 'Play Again',
    nextLevel: 'Next Level',
    congratulations: 'Congratulations!',
    stageCompleted: 'Congratulations! Stage Completed! 🎉',
    wordsFoundAll: 'You Found All the Words! 🎉',
    boardCleared: 'Congratulations! Board Cleared!',
    memoryWin: 'Congratulations! Great Memory! 🎉',
    goalReached: 'Congratulations! Goal Reached!',
    completed: 'Completed!',
    score: 'Score',
    moves: 'Moves',
    time: 'Time',

    solitaire: {
      instructions: 'Tap a card to select it, then tap where you want to place it.',
      hintAceCol: (col) => `Hint: There is an Ace in column ${col} — move it to the foundation!`,
      hintAceWaste: 'Hint: The Ace in the waste pile can go to the foundation!',
      hintReveal: 'Hint: Try moving cards to reveal face-down cards.',
      hintDraw: 'Hint: Draw more cards from the deck to continue.',
      winTitle: 'Congratulations! Game Completed!',
      winDesc: 'You organized all the cards with great calm and focus.',
    },

    domino: {
      yourTurn: 'Your turn! Tap a green-bordered tile to play.',
      tableOpen: (left, right) => `Table opened with [${left} | ${right}]. Your turn!`,
      botPassed: (botName) => `${botName} has no playable tile and passed. Your turn!`,
      youPassed: (botName) => `You passed your turn to ${botName}.`,
      playerWon: 'Congratulations! You played all your dominoes and won!',
      botWon: (botName) => `${botName} played out all dominoes. Good game!`,
      buy: (count) => `Draw (${count})`,
      pass: 'Pass turn',
      winPointsPlayer: '✨ Congratulations! You had fewer points and won the round!',
      winPointsBot: (botName) => `👏 ${botName} had fewer points this round. Great effort!`,
      hintMatch: (left, right) => `Hint: Tile [${left}|${right}] matches an open end on the board.`,
      hintBuy: 'Hint: No matching tiles. Draw from the boneyard.',
      hintPass: 'Hint: No tiles left in the boneyard, pass your turn.',
    },

    mahjong: {
      instructions: 'Tap two free identical tiles to match and clear them.',
      tilesRemaining: (count) => `${count} tiles remaining`,
      noMovesLeft: 'No free moves left. Shuffle to continue.',
      winTitle: 'Congratulations! Board Cleared!',
      winDesc: 'You matched all tiles with great harmony and focus.',
    },

    sudoku: {
      instructions: 'Select an empty cell and choose the correct number from 1 to 9.',
      hintApplied: (num) => `Hint applied: number ${num} filled in.`,
      erase: 'Erase',
      errors: 'Mistakes',
      winTitle: 'Congratulations! Sudoku Solved! 🎉',
      winDesc: 'You filled the entire grid with sharp logic.',
    },

    memory: {
      pairsFound: (found, total) => `Pairs: ${found} of ${total}`,
      instructions: 'Flip cards and find all matching pairs.',
      winTitle: 'Congratulations! Great Memory! 🎉',
      winDesc: 'You found all pairs with great focus.',
    },

    checkers: {
      yourTurn: 'Your turn to play with the white pieces.',
      botTurn: (name) => `${name} is thinking...`,
      youWon: 'Congratulations! You won the checkers game!',
      botWon: (name) => `${name} won this time. Try again!`,
      hintAdvance: (row) => `Hint: The piece on row ${row} can advance.`,
      hintDiagonals: 'Hint: Look out for open diagonals.',
    },

    differences: {
      found: (found, total) => `${found} of ${total} differences found`,
      instructions: 'Observe both pictures carefully and tap the differences.',
      hintItem: (name) => `Hint: Look closely at the ${name}!`,
    },
  },

  es: {
    hint: 'Pista',
    hintPair: 'Pista de Pareja',
    hintStart: 'Pista de Inicio',
    hintDiff: 'Pista de Diferencia',
    restart: 'Reiniciar',
    restartTitle: 'Reiniciar juego',
    shuffle: 'Mezclar',
    undo: 'Deshacer',
    erase: 'Borrar',
    hintsUsedCount: (count) => `Pistas usadas: ${count}`,
    levelOf: (current, total = '100+') => `Nivel ${current} de ${total}`,
    footerTag: 'Parent Care • Juegos y Momentos',
    playAgain: 'Jugar de Nuevo',
    nextLevel: 'Siguiente Nivel',
    congratulations: '¡Felicidades!',
    stageCompleted: '¡Felicidades! ¡Etapa Completada! 🎉',
    wordsFoundAll: '¡Encontraste Todas las Palabras! 🎉',
    boardCleared: '¡Felicidades! ¡Tablero Despejado!',
    memoryWin: '¡Felicidades! ¡Memoria Excelente! 🎉',
    goalReached: '¡Felicidades! ¡Meta Alcanzada!',
    completed: '¡Completado!',
    score: 'Puntos',
    moves: 'Movimientos',
    time: 'Tiempo',

    solitaire: {
      instructions: 'Toca una carta para seleccionarla, luego toca donde quieras colocarla.',
      hintAceCol: (col) => `Pista: Hay un As en la columna ${col} — ¡muévelo a la base!`,
      hintAceWaste: 'Pista: ¡El As del descarte puede ir a la base!',
      hintReveal: 'Pista: Intenta mover cartas para revelar las cartas ocultas.',
      hintDraw: 'Pista: Roba más cartas del mazo para continuar.',
      winTitle: '¡Felicidades! ¡Partida Completada!',
      winDesc: 'Organizaste todas las cartas con gran calma y concentración.',
    },

    domino: {
      yourTurn: '¡Tu turno! Toca una ficha con borde verde para jugar.',
      tableOpen: (left, right) => `Juego abierto en la mesa con [${left} | ${right}]. ¡Tu turno!`,
      botPassed: (botName) => `${botName} no tiene ficha y pasó el turno. ¡Tu turno!`,
      youPassed: (botName) => `Pasaste el turno a ${botName}.`,
      playerWon: '¡Felicidades! ¡Pusiste todas tus fichas y ganaste!',
      botWon: (botName) => `${botName} cerró el dominó. ¡Buen juego!`,
      buy: (count) => `Robar (${count})`,
      pass: 'Pasar turno',
      winPointsPlayer: '✨ ¡Felicidades! ¡Tenías menos puntos en las fichas y ganaste!',
      winPointsBot: (botName) => `👏 ${botName} tenía menos puntos en esta ronda. ¡Buen esfuerzo!`,
      hintMatch: (left, right) => `Pista: La ficha [${left}|${right}] encaja con un extremo de la mesa.`,
      hintBuy: 'Pista: No hay fichas que encajen. Roba del pozo.',
      hintPass: 'Pista: No quedan fichas en el pozo, pasa tu turno.',
    },

    mahjong: {
      instructions: 'Toca dos fichas idénticas y libres para unirlas y retirarlas.',
      tilesRemaining: (count) => `${count} fichas restantes`,
      noMovesLeft: 'No quedan movimientos libres. Mezcla para continuar.',
      winTitle: '¡Felicidades! ¡Tablero Despejado!',
      winDesc: 'Combinaste todas las fichas con gran armonía y concentración.',
    },

    sudoku: {
      instructions: 'Selecciona una celda vacía y elige el número del 1 al 9 correcto.',
      hintApplied: (num) => `Pista aplicada: número ${num} completado.`,
      erase: 'Borrar',
      errors: 'Errores',
      winTitle: '¡Felicidades! ¡Sudoku Resuelto! 🎉',
      winDesc: 'Completaste toda la cuadrícula con excelente lógica.',
    },

    memory: {
      pairsFound: (found, total) => `Parejas: ${found} de ${total}`,
      instructions: 'Voltea las cartas y encuentra todas las parejas idénticas.',
      winTitle: '¡Felicidades! ¡Memoria Excelente! 🎉',
      winDesc: 'Encontraste todas las parejas con gran agilidad mental.',
    },

    checkers: {
      yourTurn: 'Tu turno para jugar con las piezas blancas.',
      botTurn: (name) => `${name} está pensando...`,
      youWon: '¡Felicidades! ¡Ganaste la partida de damas!',
      botWon: (name) => `${name} ganó esta vez. ¡Inténtalo de nuevo!`,
      hintAdvance: (row) => `Pista: La pieza en la fila ${row} puede avanzar.`,
      hintDiagonals: 'Pista: Atento a las diagonales libres.',
    },

    differences: {
      found: (found, total) => `${found} de ${total} diferencias encontradas`,
      instructions: 'Observa atentamente ambas imágenes y toca las diferencias.',
      hintItem: (name) => `Pista: ¡Fíjate bien en el/la ${name}!`,
    },
  },

  fr: {
    hint: 'Indice',
    hintPair: 'Indice de Paire',
    hintStart: 'Indice de Départ',
    hintDiff: "Indice d'Erreur",
    restart: 'Recommencer',
    restartTitle: 'Recommencer la partie',
    shuffle: 'Mélanger',
    undo: 'Annuler',
    erase: 'Effacer',
    hintsUsedCount: (count) => `Indices utilisés : ${count}`,
    levelOf: (current, total = '100+') => `Niveau ${current} sur ${total}`,
    footerTag: 'Parent Care • Jeux et Moments',
    playAgain: 'Rejouer',
    nextLevel: 'Niveau Suivant',
    congratulations: 'Félicitations !',
    stageCompleted: 'Félicitations ! Étape Terminée ! 🎉',
    wordsFoundAll: 'Vous Avez Trouvé Tous les Mots ! 🎉',
    boardCleared: 'Félicitations ! Plateau Nettoyé !',
    memoryWin: 'Félicitations ! Excellente Mémoire ! 🎉',
    goalReached: 'Félicitations ! Objectif Atteint !',
    completed: 'Terminé !',
    score: 'Points',
    moves: 'Coups',
    time: 'Temps',

    solitaire: {
      instructions: 'Touchez une carte pour la sélectionner, puis touchez où vous voulez la placer.',
      hintAceCol: (col) => `Indice : Il y a un As dans la colonne ${col} — déplacez-le vers la base !`,
      hintAceWaste: "Indice : L'As de la défausse peut aller sur la base !",
      hintReveal: 'Indice : Déplacez des cartes pour révéler les cartes cachées.',
      hintDraw: 'Indice : Piochez plus de cartes pour continuer.',
      winTitle: 'Félicitations ! Partie Terminée !',
      winDesc: 'Vous avez organisé toutes les cartes avec grand calme et concentration.',
    },

    domino: {
      yourTurn: 'À vous de jouer ! Touchez une pièce au bord vert pour jouer.',
      tableOpen: (left, right) => `Jeu ouvert sur la table avec [${left} | ${right}]. À vous !`,
      botPassed: (botName) => `${botName} n'a pas de pièce et passe son tour. À vous de jouer !`,
      youPassed: (botName) => `Vous avez passé votre tour à ${botName}.`,
      playerWon: 'Félicitations ! Vous avez posé tous vos dominos et gagné !',
      botWon: (botName) => `${botName} a posé tous ses dominos. Belle partie !`,
      buy: (count) => `Piocher (${count})`,
      pass: 'Passer son tour',
      winPointsPlayer: '✨ Félicitations ! Vous aviez moins de points et vous avez gagné !',
      winPointsBot: (botName) => `👏 ${botName} avait moins de points sur cette manche. Bel effort !`,
      hintMatch: (left, right) => `Indice : Le domino [${left}|${right}] correspond à une extrémité de la table.`,
      hintBuy: 'Indice : Aucune pièce ne correspond. Piochez dans la réserve.',
      hintPass: 'Indice : La pioche est vide, passez votre tour.',
    },

    mahjong: {
      instructions: 'Touchez deux tuiles identiques et libres pour les combiner et les retirer.',
      tilesRemaining: (count) => `${count} tuiles restantes`,
      noMovesLeft: 'Aucun coup disponible. Mélangez pour continuer.',
      winTitle: 'Félicitations ! Plateau Nettoyé !',
      winDesc: 'Vous avez combiné toutes les tuiles avec harmonie et concentration.',
    },

    sudoku: {
      instructions: 'Sélectionnez une case vide et choisissez le bon chiffre de 1 à 9.',
      hintApplied: (num) => `Indice appliqué : chiffre ${num} complété.`,
      erase: 'Effacer',
      errors: 'Erreurs',
      winTitle: 'Félicitations ! Sudoku Résolu ! 🎉',
      winDesc: 'Vous avez complété toute la grille avec brio.',
    },

    memory: {
      pairsFound: (found, total) => `Paires : ${found} sur ${total}`,
      instructions: 'Retournez les cartes et retrouvez toutes les paires identiques.',
      winTitle: 'Félicitations ! Excellente Mémoire ! 🎉',
      winDesc: 'Vous avez retrouvé toutes les paires avec une belle vivacité d\'esprit.',
    },

    checkers: {
      yourTurn: 'À vous de jouer avec les pions blancs.',
      botTurn: (name) => `${name} réfléchit au coup suivant...`,
      youWon: 'Félicitations ! Vous avez gagné la partie de dames !',
      botWon: (name) => `${name} a gagné cette fois. Réessayez !`,
      hintAdvance: (row) => `Indice : La pièce sur la ligne ${row} peut avancer.`,
      hintDiagonals: 'Indice : Surveillez les diagonales libres.',
    },

    differences: {
      found: (found, total) => `${found} sur ${total} erreurs trouvées`,
      instructions: 'Observez attentivement les deux images et touchez les différences.',
      hintItem: (name) => `Indice : Regardez attentivement le/la ${name} !`,
    },
  },

  de: {
    hint: 'Tipp',
    hintPair: 'Paar-Tipp',
    hintStart: 'Start-Tipp',
    hintDiff: 'Fehler-Tipp',
    restart: 'Neustart',
    restartTitle: 'Spiel neustarten',
    shuffle: 'Mischen',
    undo: 'Rückgängig',
    erase: 'Löschen',
    hintsUsedCount: (count) => `Verwendete Tipps: ${count}`,
    levelOf: (current, total = '100+') => `Level ${current} von ${total}`,
    footerTag: 'Parent Care • Spiele & Momente',
    playAgain: 'Nochmal spielen',
    nextLevel: 'Nächste Stufe',
    congratulations: 'Glückwunsch!',
    stageCompleted: 'Glückwunsch! Stufe abgeschlossen! 🎉',
    wordsFoundAll: 'Alle Wörter gefunden! 🎉',
    boardCleared: 'Glückwunsch! Spielfeld geräumt!',
    memoryWin: 'Glückwunsch! Tolles Gedächtnis! 🎉',
    goalReached: 'Glückwunsch! Ziel erreicht!',
    completed: 'Abgeschlossen!',
    score: 'Punkte',
    moves: 'Züge',
    time: 'Zeit',

    solitaire: {
      instructions: 'Tippen Sie auf eine Karte, um sie auszuwählen, und dann dorthin, wo sie platziert werden soll.',
      hintAceCol: (col) => `Tipp: In Spalte ${col} liegt ein Ass — bewegen Sie es auf die Basis!`,
      hintAceWaste: 'Tipp: Das Ass auf dem Ablagestapel kann auf die Basis gelegt werden!',
      hintReveal: 'Tipp: Bewegen Sie Karten, um verdeckte Karten aufzudecken.',
      hintDraw: 'Tipp: Ziehen Sie weitere Karten vom Stapel.',
      winTitle: 'Glückwunsch! Spiel beendet!',
      winDesc: 'Sie haben alle Karten mit viel Ruhe und Konzentration sortiert.',
    },

    domino: {
      yourTurn: 'Sie sind dran! Tippen Sie auf einen Stein mit grünem Rand, um zu spielen.',
      tableOpen: (left, right) => `Spiel eröffnet mit [${left} | ${right}]. Sie sind dran!`,
      botPassed: (botName) => `${botName} kann nicht anlegen und passt. Sie sind am Zug!`,
      youPassed: (botName) => `Sie haben an ${botName} übergeben.`,
      playerWon: 'Glückwunsch! Sie haben alle Steine abgelegt und gewonnen!',
      botWon: (botName) => `${botName} hat alle Steine abgelegt. Gutes Spiel!`,
      buy: (count) => `Ziehen (${count})`,
      pass: 'Passen',
      winPointsPlayer: '✨ Glückwunsch! Sie hatten weniger Augen und gewinnen das Spiel!',
      winPointsBot: (botName) => `👏 ${botName} hatte in dieser Runde weniger Augen. Guter Einsatz!`,
      hintMatch: (left, right) => `Tipp: Der Stein [${left}|${right}] passt an ein offenes Ende.`,
      hintBuy: 'Tipp: Kein passender Stein. Ziehen Sie vom Talon.',
      hintPass: 'Tipp: Kein Stein mehr im Talon, passen Sie Ihren Zug.',
    },

    mahjong: {
      instructions: 'Tippen Sie auf zwei freie identische Steine, um sie zu entfernen.',
      tilesRemaining: (count) => `Noch ${count} Steine`,
      noMovesLeft: 'Keine Züge mehr möglich. Mischen Sie, um fortzufahren.',
      winTitle: 'Glückwunsch! Spielfeld geräumt!',
      winDesc: 'Sie haben alle Steine mit großer Konzentration abgebaut.',
    },

    sudoku: {
      instructions: 'Wählen Sie ein leeres Feld und tragen Sie die Zahl 1 bis 9 ein.',
      hintApplied: (num) => `Tipp angewendet: Zahl ${num} eingetragen.`,
      erase: 'Löschen',
      errors: 'Fehler',
      winTitle: 'Glückwunsch! Sudoku gelöst! 🎉',
      winDesc: 'Sie haben das Raster mit messerscharfer Logik ausgefüllt.',
    },

    memory: {
      pairsFound: (found, total) => `Paare: ${found} von ${total}`,
      instructions: 'Decken Sie Karten auf und finden Sie alle identischen Paare.',
      winTitle: 'Glückwunsch! Tolles Gedächtnis! 🎉',
      winDesc: 'Sie haben alle Paare mit großer geistiger Frische gefunden.',
    },

    checkers: {
      yourTurn: 'Sie sind am Zug mit den weißen Spielsteinen.',
      botTurn: (name) => `${name} überlegt...`,
      youWon: 'Glückwunsch! Sie haben die Dame-Partie gewonnen!',
      botWon: (name) => `${name} hat diesmal gewonnen. Versuchen Sie es erneut!`,
      hintAdvance: (row) => `Tipp: Der Spielstein in Reihe ${row} kann ziehen.`,
      hintDiagonals: 'Tipp: Achten Sie auf freie Diagonalen.',
    },

    differences: {
      found: (found, total) => `${found} von ${total} Fehlern gefunden`,
      instructions: 'Betrachten Sie beide Bilder aufmerksam und tippen Sie auf die Unterschiede.',
      hintItem: (name) => `Tipp: Schauen Sie sich ${name} genau an!`,
    },
  },
};

export function getGameTexts(rawLocale?: string): GameCommonTexts {
  const loc = normalizeGameLocale(rawLocale);
  return GAME_TRANSLATIONS[loc] || GAME_TRANSLATIONS['pt-BR'];
}
