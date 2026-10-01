import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/service';
import { WhatsAppTemplates } from '@/lib/whatsapp/message-templates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, elder_name } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Número de telefone é obrigatório.' }, { status: 400 });
    }

    const elderName = elder_name || 'Dona Maria';
    const text = WhatsAppTemplates.testGreeting(elderName);

    const result = await sendWhatsAppMessage(phone, text);

    return NextResponse.json({
      success: result.success,
      simulated: result.simulated,
      messageId: result.messageId,
      sentTo: phone,
      message: result.success ? 'Mensagem de teste enviada com sucesso!' : result.error,
    });
  } catch (err: any) {
    console.error('Error in WhatsApp test:', err);
    return NextResponse.json({ error: err.message || 'Erro ao enviar teste.' }, { status: 500 });
  }
}
