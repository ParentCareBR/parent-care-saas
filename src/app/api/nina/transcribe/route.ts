import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      console.error('[Transcribe] GEMINI_API_KEY não configurada');
      return NextResponse.json({ error: 'Chave de API não configurada' }, { status: 500 });
    }

    let mimeType = 'audio/webm';
    let base64Audio = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('audio') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Arquivo de áudio não enviado' }, { status: 400 });
      }

      mimeType = file.type || 'audio/webm';
      // Normalize mimeType for Gemini
      if (mimeType.includes('webm')) mimeType = 'audio/webm';
      else if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) mimeType = 'audio/mp4';
      else if (mimeType.includes('wav')) mimeType = 'audio/wav';
      else if (mimeType.includes('ogg')) mimeType = 'audio/ogg';

      const arrayBuffer = await file.arrayBuffer();
      base64Audio = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const json = await req.json();
      base64Audio = json.audioBase64 || '';
      mimeType = json.mimeType || 'audio/webm';
    }

    if (!base64Audio) {
      return NextResponse.json({ error: 'Dados de áudio vazios' }, { status: 400 });
    }

    const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
              {
                text: 'Você é o transcritor de voz do Parent Care (aplicativo para idosos e cuidadores). Transcreva com precisão o que foi falado neste áudio. Se não houver fala clara ou for apenas silêncio/ruído, responda apenas "[silêncio]". Retorne exclusivamente o texto falado, sem aspas, sem introduções e sem explicações.',
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Transcribe] Erro Gemini:', res.status, errText);
      return NextResponse.json({ error: 'Erro ao transcrever áudio' }, { status: 502 });
    }

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.trim();

    if (text.toLowerCase() === '[silêncio]' || text.toLowerCase() === '[silencio]') {
      text = '';
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('[Transcribe] Exceção:', err);
    return NextResponse.json({ error: 'Erro interno ao processar áudio', detail: err?.message }, { status: 500 });
  }
}
