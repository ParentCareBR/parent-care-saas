import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppBroadcast } from '@/lib/whatsapp/service';
import { WhatsAppTemplates } from '@/lib/whatsapp/message-templates';

export const dynamic = 'force-dynamic';

function getDbClient(authenticatedSupabase: any) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      return authenticatedSupabase;
    }
  }
  return authenticatedSupabase;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { cared_person_id, type, message } = body;

    if (!cared_person_id || !type) {
      return NextResponse.json({ error: 'cared_person_id e type são obrigatórios.' }, { status: 400 });
    }

    const db = getDbClient(supabase);

    // 1. Obter dados da pessoa cuidada
    const { data: person, error: personErr } = await db
      .from('cared_people')
      .select('id, full_name, organization_id')
      .eq('id', cared_person_id)
      .single();

    if (personErr || !person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const orgId = person.organization_id;
    const elderName = person.full_name.split(' ')[0];

    // 2. Registrar na tabela específica
    if (type === 'emergency') {
      await db.from('emergency_events').insert({
        organization_id: orgId,
        cared_person_id: person.id,
        reported_by: user.id,
        description: message || `Emergência acionada pelo botão SOS da tela de ${elderName}`,
        severity: 'critical',
      });

      // Também registra nas notas de cuidado (visível na timeline da família)
      await db.from('care_notes').insert({
        organization_id: orgId,
        cared_person_id: person.id,
        author_id: user.id,
        content: `🚨 EMERGÊNCIA: ${elderName} acionou o botão SOS de emergência!`,
        type: 'incident',
      });
    } else {
      await db.from('help_requests').insert({
        organization_id: orgId,
        cared_person_id: person.id,
        requested_by: user.id,
        message: message || `${elderName} solicitou atenção ou ligação da família.`,
        status: 'open',
      });

      // Também registra nas notas de cuidado
      await db.from('care_notes').insert({
        organization_id: orgId,
        cared_person_id: person.id,
        author_id: user.id,
        content: `📞 PEDIDO DE CONTATO: ${elderName} pediu ajuda e quer conversar com a família.`,
        type: 'general',
      });
    }

    // 3. Notificar todos os membros da organização (com as colunas corretas do banco: title, body, type, data)
    const { data: members } = await db
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId);

    if (members && members.length > 0) {
      const notifRows = members.map((m: any) => ({
        organization_id: orgId,
        user_id: m.user_id,
        title: type === 'emergency' ? `🚨 EMERGÊNCIA: ${person.full_name}` : `📞 Pedido de Ajuda: ${person.full_name}`,
        body: type === 'emergency' 
          ? `Alerta crítico acionado por ${elderName}! Verifique imediatamente.` 
          : `${elderName} pediu para a família entrar em contato hoje.`,
        type: type === 'emergency' ? 'alert' : 'info',
        data: {
          cared_person_id: person.id,
          type,
          created_at: new Date().toISOString(),
        },
      }));

      await db.from('notifications').insert(notifRows);
    }

    // 4. Disparar WhatsApp para os contatos de emergência cadastrados
    try {
      const { data: contacts } = await db
        .from('emergency_contacts')
        .select('phone')
        .eq('cared_person_id', person.id);

      const phones = (contacts || []).map((c: any) => c.phone).filter(Boolean);
      if (phones.length > 0) {
        const timeNow = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
        const waText = type === 'emergency'
          ? WhatsAppTemplates.emergencyAlert({
              elderName,
              time: timeNow,
              description: message || undefined,
            })
          : WhatsAppTemplates.helpAlert({
              elderName,
              time: timeNow,
            });

        await sendWhatsAppBroadcast(phones, waText);
      }
    } catch (waErr) {
      console.warn('[WhatsApp Alert Error]', waErr);
    }

    return NextResponse.json({
      success: true,
      message: type === 'emergency' ? 'Alerta de emergência emitido.' : 'Pedido de ajuda enviado à família.',
    });
  } catch (err: any) {
    console.error('Error handling care alert:', err);
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { alert_type, id } = body;

    if (!alert_type || !id) {
      return NextResponse.json({ error: 'alert_type e id são obrigatórios.' }, { status: 400 });
    }

    const db = getDbClient(supabase);

    if (alert_type === 'emergency') {
      await db
        .from('emergency_events')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id);
    } else {
      await db
        .from('help_requests')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id,
        })
        .eq('id', id);
    }

    return NextResponse.json({ success: true, message: 'Alerta marcado como atendido.' });
  } catch (err: any) {
    console.error('Error resolving alert:', err);
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}
