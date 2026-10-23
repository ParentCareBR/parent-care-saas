import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || today;

  // Rotates games daily in a predictable, stable sequence
  const dailyGames = [
    { game_id: 'sudoku', title: 'Sudoku do Dia', desc: 'Desafio lógico especial de hoje', icon: '🔢', difficulty: 'tranquilo', level_number: 1 },
    { game_id: 'caca_palavras', title: 'Caça-Palavras do Dia', desc: 'Encontre as palavras temáticas do dia', icon: '🔤', difficulty: 'tranquilo', level_number: 1 },
    { game_id: 'descubra_palavra', title: 'Descubra a Palavra do Dia', desc: 'Adivinhe a palavra secreta de hoje', icon: '🌸', difficulty: 'iniciante', level_number: 1 },
    { game_id: 'memoria', title: 'Jogo da Memória do Dia', desc: 'Encontre todos os pares do dia', icon: '🧠', difficulty: 'tranquilo', level_number: 1 },
    { game_id: 'palavras_cruzadas', title: 'Palavras Cruzadas do Dia', desc: 'Pistas culturais para completar', icon: '📝', difficulty: 'tranquilo', level_number: 1 },
    { game_id: 'quebra_cabeca', title: 'Quebra-Cabeça do Dia', desc: 'Monte a bela imagem de hoje', icon: '🧩', difficulty: 'tranquilo', level_number: 1 },
    { game_id: 'domino', title: 'Partida de Dominó do Dia', desc: 'Jogue dominó com peças especiais', icon: '🁓', difficulty: 'tranquilo', level_number: 1 },
  ];

  // Hash date string to pick index
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % dailyGames.length;
  const challenge = dailyGames[index];

  return NextResponse.json({
    date,
    challenge: {
      ...challenge,
      stars_reward: 3,
      bonus_points: 150,
    },
  });
}
