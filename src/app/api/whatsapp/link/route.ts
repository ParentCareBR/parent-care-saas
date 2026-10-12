import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// POST: Create a new link request for a cared person
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { caredPersonId } = await req.json();
    if (!caredPersonId) return NextResponse.json({ error: 'caredPersonId obrigatório.' }, { status: 400 });

    // Verify the user has access to this cared person
    const { data: person } = await supabase
      .from('cared_people')
      .select('id, full_name, organization_id, whatsapp_phone')
      .eq('id', caredPersonId)
      .single();

    if (!person) return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });

    const db = createAdminClient();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Invalidate old pending tokens for this person (best-effort)
    try {
      await (db as any)
        .from('whatsapp_link_requests')
        .update({ status: 'expired' })
        .eq('cared_person_id', caredPersonId)
        .eq('status', 'pending');
    } catch {}

    // Create new token
    await (db as any)
      .from('whatsapp_link_requests')
      .insert({
        cared_person_id: caredPersonId,
        token,
        status: 'pending',
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    // Build the WhatsApp platform number from env
    const platformPhone = process.env.WHATSAPP_PLATFORM_NUMBER ||
      process.env.WHATSAPP_META_PHONE_DISPLAY ||
      '15556657789'; // Meta test number fallback

    const prefilledText = encodeURIComponent(`PC-LINK-${token}`);
    const waLink = `https://wa.me/${platformPhone}?text=${prefilledText}`;

    return NextResponse.json({
      token,
      waLink,
      platformPhone,
      expiresAt: expiresAt.toISOString(),
      personName: person.full_name.split(' ')[0],
      alreadyLinked: !!(person as any).whatsapp_phone,
    });
  } catch (err: any) {
    console.error('Error creating WhatsApp link:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Check link + current whatsapp_phone status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const caredPersonId = req.nextUrl.searchParams.get('caredPersonId');
    if (!caredPersonId) return NextResponse.json({ error: 'caredPersonId obrigatório.' }, { status: 400 });

    const db = createAdminClient();

    let linkReq: any = null;
    try {
      const { data } = await (db as any)
        .from('whatsapp_link_requests')
        .select('token, status, linked_phone, linked_at, expires_at, created_at')
        .eq('cared_person_id', caredPersonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      linkReq = data;
    } catch {}

    // Current whatsapp_phone
    const { data: person } = await (db as any)
      .from('cared_people')
      .select('whatsapp_phone')
      .eq('id', caredPersonId)
      .maybeSingle();

    return NextResponse.json({
      linkRequest: linkReq || null,
      whatsappPhone: (person as any)?.whatsapp_phone || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
