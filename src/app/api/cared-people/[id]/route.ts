import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

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

// GET /api/cared-people/[id] - Full profile with sub-tables and metadata
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

    const dbClient = getDbClient(supabase);

    // 1. Fetch person
    const { data: person, error: pError } = await dbClient
      .from('cared_people')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (pError || !person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    // 2. Fetch metadata from organizations.settings
    const { data: org } = await dbClient
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .maybeSingle();

    const orgSettings = (org?.settings as any) || {};
    const meta = orgSettings.cared_people_profiles?.[id] || {};

    // 3. Fetch sub-tables
    let contacts: any[] = [];
    let addresses: any[] = [];
    let importantInformation: any[] = [];
    let preferences: any[] = [];
    let professionals: any[] = [];
    let consents: any[] = [];
    let auditLogs: any[] = [];

    try {
      const { data: cData } = await dbClient
        .from('cared_person_contacts')
        .select('*')
        .eq('cared_person_id', id)
        .order('priority_order', { ascending: true });
      contacts = cData || meta.contacts || [];
    } catch {
      contacts = meta.contacts || [];
    }

    try {
      const { data: aData } = await dbClient
        .from('cared_person_addresses')
        .select('*')
        .eq('cared_person_id', id);
      addresses = aData || meta.addresses || [];
    } catch {
      addresses = meta.addresses || [];
    }

    try {
      const { data: iData } = await dbClient
        .from('cared_person_important_information')
        .select('*')
        .eq('cared_person_id', id);
      importantInformation = iData || meta.important_information || [];
    } catch {
      importantInformation = meta.important_information || [];
    }

    try {
      const { data: prData } = await dbClient
        .from('cared_person_preferences')
        .select('*')
        .eq('cared_person_id', id);
      preferences = prData || meta.preferences || [];
    } catch {
      preferences = meta.preferences || [];
    }

    try {
      const { data: pfData } = await dbClient
        .from('cared_person_professionals')
        .select('*')
        .eq('cared_person_id', id);
      professionals = pfData || [];
    } catch {
      professionals = [];
    }

    try {
      const { data: csData } = await dbClient
        .from('cared_person_consents')
        .select('*')
        .eq('cared_person_id', id);
      consents = csData || [];
    } catch {
      consents = [];
    }

    try {
      const { data: lData } = await dbClient
        .from('cared_person_audit_logs')
        .select('*')
        .eq('cared_person_id', id)
        .order('occurred_at', { ascending: false })
        .limit(20);
      auditLogs = lData || [];
    } catch {
      auditLogs = [];
    }

    const fullProfile = {
      ...person,
      preferred_name: person.preferred_name || meta.preferred_name || (person as any).nickname || null,
      relationship: person.relationship || meta.relationship || null,
      status: person.status || meta.status || (person.archived_at ? 'archived' : 'active'),
      profile_type: person.profile_type || meta.profile_type || 'family_member',
      timezone: person.timezone || meta.timezone || 'America/Sao_Paulo',
      preferred_language: person.preferred_language || meta.preferred_language || 'pt-BR',
      country_code: person.country_code || meta.country_code || 'BR',
      contacts,
      addresses,
      important_information: importantInformation,
      preferences,
      professionals,
      consents,
      audit_logs: auditLogs,
    };

    return NextResponse.json(fullProfile);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao carregar perfil.' }, { status: 500 });
  }
}

// PUT /api/cared-people/[id] - Update profile with audit logging
export async function PUT(
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

    const payload = await req.json();
    const dbClient = getDbClient(supabase);

    // 1. Fetch current person
    const { data: currentPerson } = await dbClient
      .from('cared_people')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!currentPerson) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const updateFields: Record<string, any> = {};
    const allowedKeys = [
      'full_name',
      'preferred_name',
      'relationship',
      'birth_date',
      'blood_type',
      'gender_identity',
      'pronouns',
      'marital_status',
      'preferred_language',
      'timezone',
      'country_code',
      'notes',
      'status',
      'profile_type',
    ];

    allowedKeys.forEach((key) => {
      if (payload[key] !== undefined) {
        updateFields[key] = payload[key];
      }
    });

    // 2. Update DB row
    const { error: updateError } = await dbClient
      .from('cared_people')
      .update(updateFields as any)
      .eq('id', id);

    if (updateError) {
      // Fallback update only known base columns
      const legacyUpdate: Record<string, any> = {};
      ['full_name', 'birth_date', 'blood_type', 'notes'].forEach((k) => {
        if (updateFields[k] !== undefined) legacyUpdate[k] = updateFields[k];
      });
      await dbClient.from('cared_people').update(legacyUpdate as any).eq('id', id);
    }

    // 3. Update in org settings metadata
    try {
      const { data: orgRecord } = await dbClient
        .from('organizations')
        .select('settings')
        .eq('id', currentPerson.organization_id)
        .single();

      const existingSettings = (orgRecord?.settings as any) || {};
      const profiles = existingSettings.cared_people_profiles || {};
      const existingMeta = profiles[id] || {};

      profiles[id] = {
        ...existingMeta,
        ...updateFields,
        updated_at: new Date().toISOString(),
      };

      await dbClient
        .from('organizations')
        .update({
          settings: {
            ...existingSettings,
            cared_people_profiles: profiles,
          },
        })
        .eq('id', currentPerson.organization_id);
    } catch (e) {
      console.warn('Could not update metadata cache:', e);
    }

    // 4. Record Audit Log
    try {
      await dbClient.from('cared_person_audit_logs').insert({
        id: crypto.randomUUID(),
        organization_id: currentPerson.organization_id,
        cared_person_id: id,
        action: 'UPDATE_PROFILE',
        field_name: Object.keys(updateFields).join(','),
        previous_value: currentPerson,
        new_value: updateFields,
        performed_by: user.id,
        occurred_at: new Date().toISOString(),
      });
    } catch (aErr) {
      console.warn('Audit log write error:', aErr);
    }

    return NextResponse.json({ success: true, message: 'Perfil atualizado com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar perfil.' }, { status: 500 });
  }
}

// PATCH /api/cared-people/[id] - Archive or restore person
export async function PATCH(
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

    const { action } = await req.json();
    const dbClient = getDbClient(supabase);

    const isArchive = action === 'archive';
    const archivedAt = isArchive ? new Date().toISOString() : null;
    const status = isArchive ? 'archived' : 'active';

    await dbClient
      .from('cared_people')
      .update({ archived_at: archivedAt, status })
      .eq('id', id);

    // Also record audit log
    const { data: person } = await dbClient
      .from('cared_people')
      .select('organization_id')
      .eq('id', id)
      .maybeSingle();

    if (person) {
      try {
        await dbClient.from('cared_person_audit_logs').insert({
          id: crypto.randomUUID(),
          organization_id: person.organization_id,
          cared_person_id: id,
          action: isArchive ? 'ARCHIVE_PROFILE' : 'RESTORE_PROFILE',
          field_name: 'status',
          previous_value: null,
          new_value: { status, archived_at: archivedAt },
          performed_by: user.id,
          occurred_at: new Date().toISOString(),
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: isArchive ? 'Perfil arquivado com sucesso.' : 'Perfil restaurado com sucesso.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao alterar status.' }, { status: 500 });
  }
}

// DELETE /api/cared-people/[id] - Safe soft delete / archive
export async function DELETE(
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

    const dbClient = getDbClient(supabase);

    // Soft delete rule: set archived_at rather than hard delete to preserve care history
    await dbClient
      .from('cared_people')
      .update({
        archived_at: new Date().toISOString(),
        status: 'archived',
      })
      .eq('id', id);

    return NextResponse.json({ success: true, message: 'Perfil arquivado com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao arquivar perfil.' }, { status: 500 });
  }
}
