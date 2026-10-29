import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tts
 * Gera áudio de voz neural em alta fidelidade usando Google Gemini TTS.
 * Utiliza gemini-3.8-flash-lite-tts com fallback para gemini-3.8-flash-tts e gemini-3.1-flash-tts-preview.
 * Inclui cache em memória para respostas instantâneas (<2ms) e economia de quota.
 */

// Modelos TTS em ordem de prioridade (velocidade e quota)
const TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
];

// Mapeamento locale → voz neural mais acolhedora
const VOICE_BY_LOCALE: Record<string, string> = {
  'pt-BR': 'Zephyr',   // Feminina, acolhedora e suave
  'pt':    'Zephyr',
  'en':    'Kore',     // Feminina, clara e calorosa
  'es':    'Zephyr',
  'fr':    'Aoede',
  'de':    'Kore',
};

// Mapeamento por persona
const VOICE_BY_PERSONA: Record<string, string> = {
  nina_warm:      'Zephyr',   // feminina afetuosa
  doctor_gentle:  'Charon',   // masculina serena
  google_natural: 'Kore',     // neutra clara
};

// Cache em memória de áudios gerados (máx 150 itens)
const audioCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const MAX_CACHE_ITEMS = 150;

function getCacheKey(locale: string, voiceName: string, text: string): string {
  return `${locale}:${voiceName}:${text.trim().toLowerCase()}`;
}

function setCache(key: string, buffer: Buffer) {
  if (audioCache.size >= MAX_CACHE_ITEMS) {
    // Remove os mais antigos (primeira chave do Map)
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(key, { buffer, timestamp: Date.now() });
}

function buildWavHeader(dataLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // chunk size
  buffer.writeUInt16LE(1, 20);           // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

export async function POST(req: NextRequest) {
  try {
    const { text, locale = 'pt-BR', persona } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TTS API key not configured' }, { status: 500 });
    }

    // Escolhe voz: persona > locale > fallback Zephyr
    const normalizedLocale = locale.startsWith('pt') ? 'pt-BR' : locale.split('-')[0];
    let voiceName = VOICE_BY_LOCALE[normalizedLocale] || 'Zephyr';
    if (persona && VOICE_BY_PERSONA[persona]) {
      voiceName = VOICE_BY_PERSONA[persona];
    }

    const cleanText = text.slice(0, 1000).trim();
    const cacheKey = getCacheKey(normalizedLocale, voiceName, cleanText);

    // 1. Verificar cache em memória
    const cached = audioCache.get(cacheKey);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(cached.buffer.length),
          'Cache-Control': 'public, max-age=86400',
          'X-TTS-Cache': 'HIT',
        },
      });
    }

    // 2. Montar corpo de requisição para Google Gemini TTS
    // Importante: a instrução "Speak the following text: " é mandatória para evitar o erro 400
    const body = {
      contents: [
        {
          parts: [{ text: `Speak the following text: ${cleanText}` }],
          role: 'user',
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    };

    let lastError = '';

    // 3. Tentar os modelos em sequência (caso algum atinja limite de quota instantâneo)
    for (const model of TTS_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `[${model}] status ${response.status}: ${errText.slice(0, 200)}`;
          // Se for 429 (rate limit) tenta o próximo modelo
          if (response.status === 429) {
            continue;
          }
          // Outro erro HTTP
          continue;
        }

        const data = await response.json();
        const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioData) {
          lastError = `[${model}] No audioData in candidate`;
          continue;
        }

        // audioData é base64 PCM L16 24kHz mono
        const pcmBuffer = Buffer.from(audioData, 'base64');
        const wavHeader = buildWavHeader(pcmBuffer.length);
        const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

        // Salva no cache
        setCache(cacheKey, wavBuffer);

        return new NextResponse(new Uint8Array(wavBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': String(wavBuffer.length),
            'Cache-Control': 'public, max-age=86400',
            'X-TTS-Model': model,
          },
        });
      } catch (err: any) {
        lastError = `[${model}] fetch error: ${err?.message || err}`;
        continue;
      }
    }

    console.error('[TTS] Todos os modelos falharam:', lastError);
    return NextResponse.json({ error: 'TTS generation failed', detail: lastError }, { status: 502 });
  } catch (err: any) {
    console.error('[TTS] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 });
  }
}
