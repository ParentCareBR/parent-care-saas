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
    const { phone, elder_name, meta_token, meta_phone_id, use_template, template_name } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Número de telefone é obrigatório.' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').startsWith('55')
      ? phone.replace(/\D/g, '')
      : '55' + phone.replace(/\D/g, '');

    const elderName = elder_name || 'Dona Maria';
    const text = WhatsAppTemplates.testGreeting(elderName);
    const waMeUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    // Check if organization has custom WhatsApp meta token configured
    let customMetaToken = meta_token;
    let customPhoneId = meta_phone_id;

    if (!customMetaToken) {
      try {
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (member?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', member.organization_id)
            .maybeSingle();

          const orgSettings = (org?.settings as any) || {};
          customMetaToken = orgSettings.whatsapp_meta_token;
          customPhoneId = orgSettings.whatsapp_meta_phone_id;
        }
      } catch {}
    }

    const result = await sendWhatsAppMessage(phone, text, {
      metaToken: customMetaToken,
      metaPhoneId: customPhoneId,
      templateName: use_template ? (template_name || 'hello_world') : undefined,
    });

    const isExpiredToken = Boolean(
      result.error && /expirado|expired|access token|session|OAuth/i.test(result.error)
    );

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      sentTo: phone,
      waMeUrl,
      isExpiredToken,
      message: result.success ? `Mensagem entregue com sucesso via ${result.provider}!` : result.error,
      error: result.error,
    }, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    console.error('Error in WhatsApp test:', err);
    return NextResponse.json({ error: err.message || 'Erro ao enviar teste.' }, { status: 500 });
  }
}
