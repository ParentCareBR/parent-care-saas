import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, caredPersonId, language = 'pt-BR' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    let personContext = '';
    if (caredPersonId) {
      try {
        const supabase = await createClient();
        const [{ data: person }, { data: meds }, { data: recentNotes }] = await Promise.all([
          supabase.from('cared_people').select('full_name, birth_date, blood_type').eq('id', caredPersonId).maybeSingle(),
          supabase.from('medications').select('name, dosage, unit, instructions').eq('cared_person_id', caredPersonId).eq('is_active', true).limit(10),
          supabase.from('care_notes').select('content, created_at, type').eq('cared_person_id', caredPersonId).order('created_at', { ascending: false }).limit(5),
        ]);

        if (person) {
          personContext = `\nCONTEXTO DO IDOSO ACOMPANHADO:\nNome: ${person.full_name}\nData de Nascimento: ${person.birth_date || 'Não informada'}\nTipo Sanguíneo: ${person.blood_type || 'Não informado'}\n`;
        }
        if (meds && meds.length > 0) {
          personContext += `Medicamentos em uso:\n${meds.map((m: any) => `- ${m.name} ${m.dosage}${m.unit}: ${m.instructions || 'Uso contínuo'}`).join('\n')}\n`;
        }
        if (recentNotes && recentNotes.length > 0) {
          personContext += `Últimas observações clínicas:\n${recentNotes.map((n: any) => `- ${n.content}`).join('\n')}\n`;
        }
      } catch (err) {
        console.warn('Erro ao carregar contexto clínico para Nina IA:', err);
      }
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    // Use gemini-2.0-flash or fallback to gemini-1.5-flash
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `Você é a Nina IA, enfermeira e especialista virtual do Parent Care.
Seu título completo: Nina IA — Núcleo Inteligente de Navegação e Apoio com Inteligência Artificial.
Sua missão: Fornecer assistência humanizada, acolhedora e respostas rápidas e claras para dúvidas de saúde, sintomas, prevenção, cuidados na terceira idade e bem-estar de idosos e familiares.

Diretrizes:
1. Tom de voz: Extremamente carinhosa, empática, respeitosa e clara (como uma enfermeira sênior atenciosa da família). Use linguagem simples sem jargões desnecessários.
2. Dúvidas de saúde: Responda sobre primeiros socorros domésticos, hidratação no idoso, prevenção de escaras, prevenção de quedas, alimentação saudável, rotina de sono e horários de medicação.
3. Segurança clínica responsável: Deixe claro que sua orientação é de apoio e suporte diário e nunca substitui a consulta médica presencial ou um atendimento de emergência. Se o usuário relatar dor forte no peito, falta de ar severa, desmaio, confusão mental súbita ou perda de movimento, oriente IMEDIATAMENTE a acionar o SAMU 192 ou o botão de emergência SOS do aplicativo.
4. Responda em português brasileiro (ou no idioma da mensagem do usuário).
5. Mantenha as respostas concisas, bem formatadas em tópicos quando útil, para facilitar a leitura no celular e no computador.
${personContext}`,
    });

    // Format chat history
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Erro na rota da Nina IA:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro ao processar mensagem',
        reply: 'Olá! Tive uma pequena oscilação na conexão com a central. Por favor, repita sua dúvida que estarei pronta para ajudar! 🩺💙',
      },
      { status: 500 }
    );
  }
}
