import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Helper to choose authenticated client vs service role
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

// GET /api/cared-people - List cared people and entitlement status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let organizationId = searchParams.get('organizationId');

    const dbClient = getDbClient(supabase);

    // If org not provided, find user's active organization
    if (!organizationId || !isValidUuid(organizationId)) {
      const { data: membership } = await dbClient
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (membership) {
        organizationId = membership.organization_id;
      } else {
        const { data: ownedOrg } = await dbClient
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();
        organizationId = ownedOrg?.id || null;
      }
    }

    if (!organizationId) {
      return NextResponse.json({ people: [], entitlements: { limit: 2, used: 0, canAdd: true } });
    }

    // 1. Fetch people from DB
    const { data: people, error: fetchError } = await dbClient
      .from('cared_people')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 2. Fetch metadata from organizations.settings if any
    const { data: org } = await dbClient
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .maybeSingle();

    const orgSettings = (org?.settings as any) || {};
    const profilesMeta = orgSettings.cared_people_profiles || {};

    const enrichedPeople = (people || []).map((p: any) => {
      const meta = profilesMeta[p.id] || {};
      return {
        ...p,
        preferred_name: p.preferred_name || meta.preferred_name || p.nickname || null,
        relationship: p.relationship || meta.relationship || null,
        status: p.status || meta.status || (p.archived_at ? 'archived' : 'active'),
        profile_type: p.profile_type || meta.profile_type || 'family_member',
        timezone: p.timezone || meta.timezone || 'America/Sao_Paulo',
        preferred_language: p.preferred_language || meta.preferred_language || 'pt-BR',
        country_code: p.country_code || meta.country_code || 'BR',
        notes: p.notes || meta.notes || null,
      };
    });

    // 3. Entitlement limit check
    const { data: entitlement } = await dbClient
      .from('organization_entitlements')
      .select('cared_people_limit')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const caredPeopleLimit = entitlement?.cared_people_limit ?? 2;
    const activeCount = enrichedPeople.filter((p: any) => p.status !== 'archived' && !p.archived_at).length;

    return NextResponse.json({
      people: enrichedPeople,
      entitlements: {
        limit: caredPeopleLimit,
        used: activeCount,
        canAdd: activeCount < caredPeopleLimit,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao carregar pessoas cuidadas.' }, { status: 500 });
  }
}

// POST /api/cared-people - Create new cared person with server-side limit check
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      organizationId,
      full_name,
      preferred_name,
      relationship,
      birth_date,
      gender_identity,
      pronouns,
      marital_status,
      preferred_language = 'pt-BR',
      timezone = 'America/Sao_Paulo',
      country_code = 'BR',
      profile_type = 'family_member',
      notes,
      blood_type,
      contacts = [],
      addresses = [],
      important_information = [],
      preferences = [],
      consents = {},
      enabled_monitoring_codes = [],
      simplified_screen = {},
    } = payload;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'O nome completo é obrigatório.' }, { status: 400 });
    }

    const dbClient = getDbClient(supabase);

    // Verify or resolve organization
    let orgId = organizationId;
    if (!orgId || !isValidUuid(orgId)) {
      const { data: membership } = await dbClient
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      orgId = membership?.organization_id;
    }

    if (!orgId) {
      const { data: ownedOrg } = await dbClient
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      orgId = ownedOrg?.id || null;
    }

    // Auto-create family organization if user doesn't have one yet
    if (!orgId) {
      const newOrgId = crypto.randomUUID();
      const uniqueSlug = `familia-${user.id.slice(0, 5)}-${Date.now()}`;
      const orgName = full_name ? `Família de ${full_name.split(' ')[0]}` : 'Minha Família';

      const { data: newOrg, error: orgError } = await dbClient.from('organizations').insert({
        id: newOrgId,
        name: orgName,
        slug: uniqueSlug,
        owner_id: user.id,
      }).select('id').single();

      if (!orgError && newOrg) {
        await dbClient.from('organization_members').insert({
          organization_id: newOrgId,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        });
        orgId = newOrgId;
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 400 });
    }

    // SERVER-SIDE PLAN LIMIT CHECK
    try {
      const { data: entitlement } = await dbClient
        .from('organization_entitlements')
        .select('cared_people_limit')
        .eq('organization_id', orgId)
        .maybeSingle();

      const limit = entitlement?.cared_people_limit ?? 2;

      const { count: currentActiveCount } = await dbClient
        .from('cared_people')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('archived_at', null);

      const activeCount = currentActiveCount ?? 0;

      if (activeCount >= limit) {
        return NextResponse.json(
          {
            error: `Limite de pessoas cuidadas do plano atingido (${activeCount}/${limit}). Faça um upgrade no plano para cadastrar mais perfis.`,
            code: 'PLAN_LIMIT_REACHED',
            limit,
            used: activeCount,
          },
          { status: 403 }
        );
      }
    } catch (limErr) {
      console.warn('Plan limit check non-fatal warning:', limErr);
    }

    // Insert into cared_people
    const newPersonId = crypto.randomUUID();

    // 1. Prepare core fields guaranteed to be compatible
    const coreRow: Record<string, any> = {
      id: newPersonId,
      organization_id: orgId,
      full_name: full_name.trim(),
      birth_date: birth_date || null,
      blood_type: blood_type || null,
      notes: notes?.trim() || null,
      created_by: user.id,
    };

    if (preferred_name?.trim()) {
      coreRow.nickname = preferred_name.trim();
    }
    if (gender_identity) {
      coreRow.gender = gender_identity;
    }

    // 2. Prepare full extended fields
    const extendedRow: Record<string, any> = {
      ...coreRow,
      preferred_name: preferred_name?.trim() || null,
      relationship: relationship?.trim() || null,
      profile_type,
      status: 'active',
      preferred_language,
      timezone,
      country_code,
      gender_identity: gender_identity || null,
      pronouns: pronouns || null,
      marital_status: marital_status || null,
    };

    let insertedPerson: any = null;

    // First attempt: full extended row
    const { data: pData, error: pError } = await dbClient
      .from('cared_people')
      .insert(extendedRow as any)
      .select('*')
      .maybeSingle();

    if (pError) {
      console.warn('cared_people extended insert failed, retrying with coreRow:', pError.message);
      // Retry with core compatible row
      const { data: retryData, error: retryError } = await dbClient
        .from('cared_people')
        .insert(coreRow as any)
        .select('*')
        .single();

      if (retryError) {
        console.warn('cared_people core insert failed, retrying without created_by:', retryError.message);
        // Retry without created_by in case FK restriction
        delete coreRow.created_by;
        const { data: retryData2, error: retryError2 } = await dbClient
          .from('cared_people')
          .insert(coreRow as any)
          .select('*')
          .single();

        if (retryError2) {
          return NextResponse.json({ error: `Erro ao criar pessoa cuidada: ${retryError2.message}` }, { status: 500 });
        }
        insertedPerson = retryData2;
      } else {
        insertedPerson = retryData;
      }
    } else {
      insertedPerson = pData;
    }

    // Save extended profile in organizations.settings so nothing is ever lost
    try {
      const { data: orgRecord } = await dbClient
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();

      const existingSettings = (orgRecord?.settings as any) || {};
      const profiles = existingSettings.cared_people_profiles || {};

      profiles[newPersonId] = {
        ...extendedRow,
        contacts,
        addresses,
        important_information,
        preferences,
        consents,
        simplified_screen,
        created_at: new Date().toISOString(),
      };

      await dbClient
        .from('organizations')
        .update({
          settings: {
            ...existingSettings,
            cared_people_profiles: profiles,
          },
        })
        .eq('id', orgId);
    } catch (metaErr) {
      console.warn('Failed to update profiles cache in org settings:', metaErr);
    }

    // Insert Sub-tables (safely try/catch each)
    // 1. Contacts
    if (contacts.length > 0) {
      try {
        const contactRows = contacts.map((c: any, idx: number) => ({
          id: crypto.randomUUID(),
          organization_id: orgId,
          cared_person_id: newPersonId,
          name: c.name,
          relationship: c.relationship || null,
          phone: c.phone || null,
          whatsapp: c.whatsapp || null,
          email: c.email || null,
          priority_order: c.priority_order || idx + 1,
          is_primary: Boolean(c.is_primary),
          is_emergency: Boolean(c.is_emergency),
          can_receive_notifications: c.can_receive_notifications !== false,
          can_view_profile: c.can_view_profile !== false,
          can_edit_records: Boolean(c.can_edit_records),
        }));

        const { error: cErr } = await dbClient.from('cared_person_contacts').insert(contactRows);
        if (cErr) {
          // Fallback to legacy emergency_contacts
          for (const c of contacts) {
            await dbClient.from('emergency_contacts').insert({
              organization_id: orgId,
              cared_person_id: newPersonId,
              name: c.name,
              relationship: c.relationship || 'Familiar',
              phone: c.phone || c.whatsapp || '',
              is_primary: Boolean(c.is_primary),
            });
          }
        }
      } catch (cErr) {
        console.warn('Contacts insert skipped/handled:', cErr);
      }
    }

    // 2. Addresses
    if (addresses.length > 0) {
      try {
        const addressRows = addresses.map((a: any) => ({
          id: crypto.randomUUID(),
          organization_id: orgId,
          cared_person_id: newPersonId,
          address_type: a.address_type || 'primary',
          street: a.street || null,
          number: a.number || null,
          complement: a.complement || null,
          city: a.city || null,
          region: a.region || null,
          postal_code: a.postal_code || null,
          country_code: a.country_code || 'BR',
          housing_type: a.housing_type || null,
          lives_alone: a.lives_alone ?? null,
          lives_with_family: a.lives_with_family ?? null,
          has_caregiver: a.has_caregiver ?? null,
          access_notes: a.access_notes || null,
        }));

        await dbClient.from('cared_person_addresses').insert(addressRows);
      } catch (aErr) {
        console.warn('cared_person_addresses insert skipped/failed:', aErr);
      }
    }

    // 3. Consents
    if (consents && Object.keys(consents).length > 0) {
      try {
        const consentRows = Object.entries(consents).map(([type, granted]) => ({
          id: crypto.randomUUID(),
          organization_id: orgId,
          cared_person_id: newPersonId,
          consent_type: type,
          status: granted ? 'granted' : 'declined',
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        }));

        await dbClient.from('cared_person_consents').insert(consentRows);
      } catch (conErr) {
        console.warn('cared_person_consents insert skipped/failed:', conErr);
      }
    }

    // 4. Monitoring settings if supplied
    if (enabled_monitoring_codes.length > 0) {
      try {
        const { data: defs } = await dbClient
          .from('monitoring_definitions')
          .select('id, code');

        if (defs && defs.length > 0) {
          const defMap = new Map(defs.map((d: any) => [d.code, d.id]));
          for (const code of enabled_monitoring_codes) {
            const defId = defMap.get(code);
            if (defId) {
              await dbClient.from('cared_person_monitoring_settings').insert({
                organization_id: orgId,
                cared_person_id: newPersonId,
                monitoring_definition_id: defId,
                enabled: true,
                enabled_at: new Date().toISOString(),
                settings_json: {},
                display_order: 1,
              });
            }
          }
        }
      } catch (mErr) {
        console.warn('Monitoring settings save error:', mErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        person: insertedPerson,
        caredPersonId: newPersonId,
        message: 'Pessoa cuidada cadastrada com sucesso.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro interno ao processar cadastro.' }, { status: 500 });
  }
}
