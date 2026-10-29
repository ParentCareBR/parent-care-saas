import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tts
 * Gera áudio de alta qualidade (PCM 24kHz mono) usando Google Gemini TTS.
 * Vozes neurais disponíveis: Zephyr (F, calma), Kore (F, firme), Charon (M, sereno), Fenrir (M, grave)
 * Retorna: audio/wav base64 ou stream de bytes
 */

const GEMINI_TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

// Mapeamento locale → voz Gemini mais adequada para idosos
const VOICE_BY_LOCALE: Record<string, { name: string; label: string }> = {
  'pt-BR': { name: 'Zephyr', label: 'Voz feminina suave' },
  'pt':    { name: 'Zephyr', label: 'Voz feminina suave' },
  'en':    { name: 'Kore',   label: 'Warm female voice' },
  'es':    { name: 'Zephyr', label: 'Voz femenina suave' },
  'fr':    { name: 'Aoede',  label: 'Voix féminine douce' },
  'de':    { name: 'Kore',   label: 'Weiche Frauenstimme' },
};

// Fallback por persona
const VOICE_BY_PERSONA: Record<string, string> = {
  nina_warm:      'Zephyr',   // feminina, suave
  doctor_gentle:  'Charon',   // masculino, sereno
  google_natural: 'Kore',     // feminina, clara
};

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

    // Escolher voz: persona > locale > fallback
    const normalizedLocale = locale.startsWith('pt') ? 'pt-BR' : locale.split('-')[0];
    let voiceName = VOICE_BY_LOCALE[normalizedLocale]?.name || 'Zephyr';
    if (persona && VOICE_BY_PERSONA[persona]) {
      voiceName = VOICE_BY_PERSONA[persona];
    }

    const cleanText = text.slice(0, 1000).trim(); // Limite de segurança

    const body = {
      contents: [
        {
          parts: [{ text: cleanText }],
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

    const response = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[TTS] Gemini API error:', response.status, errText);
      return NextResponse.json({ error: 'TTS generation failed', detail: errText }, { status: 502 });
    }

    const data = await response.json();

    // Extract audio data from Gemini response
    const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      console.error('[TTS] No audio data in response:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: 'No audio data returned by TTS' }, { status: 502 });
    }

    // audioData is base64-encoded PCM (L16, 24kHz, mono)
    const pcmBuffer = Buffer.from(audioData, 'base64');
    const wavHeader = buildWavHeader(pcmBuffer.length);
    const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(wavBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[TTS] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 });
  }
}
