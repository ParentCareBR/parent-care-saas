import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// GET /api/cared-people/[id]/contacts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. Try DB table cared_person_contacts
    const { data: contacts, error: cError } = await adminSupabase
      .from('cared_person_contacts')
      .select('*')
      .eq('cared_person_id', id)
      .order('priority_order', { ascending: true });

    if (!cError && contacts) {
      return NextResponse.json({ contacts });
    }

    // 2. Fallback to emergency_contacts
    const { data: emContacts } = await adminSupabase
      .from('emergency_contacts')
      .select('*')
      .eq('cared_person_id', id);

    return NextResponse.json({ contacts: emContacts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao buscar contatos.' }, { status: 500 });
  }
}

// POST /api/cared-people/[id]/contacts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      relationship,
      phone,
      whatsapp,
      email,
      is_primary = false,
      is_emergency = false,
      can_receive_notifications = true,
      can_view_profile = true,
      can_edit_records = false,
      priority_order = 1,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome do contato é obrigatório.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data: person } = await adminSupabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const newContactId = crypto.randomUUID();
    const contactRow = {
      id: newContactId,
      organization_id: person.organization_id,
      cared_person_id: id,
      name: name.trim(),
      relationship: relationship?.trim() || null,
      phone: phone?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      priority_order,
      is_primary: Boolean(is_primary),
      is_emergency: Boolean(is_emergency),
      can_receive_notifications: Boolean(can_receive_notifications),
      can_view_profile: Boolean(can_view_profile),
      can_edit_records: Boolean(can_edit_records),
      notes: notes?.trim() || null,
    };

    const { data, error } = await adminSupabase
      .from('cared_person_contacts')
      .insert(contactRow)
      .select('*')
      .single();

    if (error) {
      // Fallback to legacy emergency_contacts
      const legacyRow = {
        organization_id: person.organization_id,
        cared_person_id: id,
        name: name.trim(),
        relationship: relationship?.trim() || 'Familiar',
        phone: phone?.trim() || '',
        is_primary: Boolean(is_primary),
      };

      const { data: legData, error: legErr } = await adminSupabase
        .from('emergency_contacts')
        .insert(legacyRow)
        .select('*')
        .single();

      if (legErr) {
        return NextResponse.json({ error: legErr.message }, { status: 500 });
      }

      return NextResponse.json({ contact: legData }, { status: 201 });
    }

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao salvar contato.' }, { status: 500 });
  }
}
