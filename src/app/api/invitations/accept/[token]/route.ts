import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { recordAudit } from '@/lib/audit';
import { syncOrganizationEntitlementCounts } from '@/lib/billing/entitlements';
import { apply_default_role_permissions } from '@/lib/permissions/defaults';

/**
 * GET /api/invitations/accept/[token]
 * Returns information about an invitation by its token.
 * Public endpoint — token is the auth mechanism.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data: invitation, error } = await adminSupabase
      .from('care_invitations')
      .select(`
        id, role, invited_email, invited_phone, preferred_language,
        message, status, token_expires_at, organization_id,
        cared_person_id,
        organizations (name, slug),
        cared_people (full_name, preferred_name)
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });
    }

    // Check expiry
    if (invitation.status === 'expired' || new Date(invitation.token_expires_at) < new Date()) {
      // Mark as expired
      await adminSupabase
        .from('care_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json({ error: 'Este convite expirou. Solicite um novo convite ao administrador.' }, { status: 410 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({
        error: `Este convite não está mais disponível (status: ${invitation.status}).`,
        status: invitation.status,
      }, { status: 409 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        role: invitation.role,
        invitedEmail: invitation.invited_email,
        invitedPhone: invitation.invited_phone,
        preferredLanguage: invitation.preferred_language,
        message: invitation.message,
        expiresAt: invitation.token_expires_at,
        organizationId: invitation.organization_id,
        organizationName: (invitation as any).organizations?.name,
        caredPersonId: invitation.cared_person_id,
        caredPersonName: (invitation as any).cared_people?.preferred_name
          ?? (invitation as any).cared_people?.full_name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao verificar convite.' }, { status: 500 });
  }
}

/**
 * POST /api/invitations/accept/[token]
 * Accepts an invitation.
 * If the user already has an account, links them to the org.
 * If not, creates a new account with the provided password.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await req.json();
    const { password, fullName, language, termsAccepted } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: 'É necessário aceitar os termos e a política de privacidade.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch and validate invitation
    const { data: invitation, error: fetchError } = await adminSupabase
      .from('care_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Convite não encontrado ou já utilizado.' }, { status: 404 });
    }

    if (new Date(invitation.token_expires_at) < new Date()) {
      await adminSupabase
        .from('care_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return NextResponse.json({ error: 'Convite expirado. Solicite um novo.' }, { status: 410 });
    }

    // 2. Check if user is already logged in
    const cookieStore = cookies();
    const userSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user: existingUser } } = await userSupabase.auth.getUser();
    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // User already logged in — just link them
      userId = existingUser.id;
    } else {
      // Must create new account
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
      }
      if (!invitation.invited_email && !body.email) {
        return NextResponse.json({ error: 'E-mail é obrigatório para criar uma conta.' }, { status: 400 });
      }

      const email = invitation.invited_email ?? body.email;

      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm since they accepted via invitation
        user_metadata: {
          full_name: fullName ?? null,
          preferred_language: language ?? invitation.preferred_language ?? 'pt-BR',
          source: 'invitation',
          invitation_id: invitation.id,
        },
      });

      if (createError || !newUser.user) {
        return NextResponse.json(
          { error: createError?.message ?? 'Erro ao criar conta.' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
    }

    // 3. Ensure user record exists in public.users
    await adminSupabase
      .from('users')
      .upsert({
        id: userId,
        email: invitation.invited_email ?? body.email ?? '',
        full_name: fullName ?? null,
        preferred_language: language ?? invitation.preferred_language ?? 'pt-BR',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    // 4. Add to organization_members
    const { error: memberError } = await adminSupabase
      .from('organization_members')
      .upsert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        status: 'active',
        invited_email: invitation.invited_email,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
        display_name: fullName ?? null,
      }, { onConflict: 'organization_id,user_id' });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // 5. Grant access to cared person (if specified)
    if (invitation.cared_person_id) {
      await adminSupabase
        .from('user_cared_person_access')
        .upsert({
          organization_id: invitation.organization_id,
          user_id: userId,
          cared_person_id: invitation.cared_person_id,
          granted_by: invitation.invited_by,
          is_active: true,
          notes: `Granted via invitation ${invitation.id}`,
        }, { onConflict: 'user_id,cared_person_id' });

      // Link user to cared_person if role is cared_person
      if (invitation.role === 'cared_person') {
        await adminSupabase
          .from('cared_people')
          .update({
            user_id: userId,
            preferred_language: language ?? invitation.preferred_language,
          })
          .eq('id', invitation.cared_person_id);
      }
    }

    // 6. Apply default module permissions
    try {
      await adminSupabase.rpc('apply_default_role_permissions', {
        p_organization_id: invitation.organization_id,
        p_user_id: userId,
        p_role: invitation.role,
        p_cared_person_id: invitation.cared_person_id ?? null,
      });
    } catch {
      // Non-fatal: permissions can be set manually
    }

    // 7. Mark invitation as accepted
    await adminSupabase
      .from('care_invitations')
      .update({
        status: 'accepted',
        accepted_by: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // 8. Record audit
    await recordAudit({
      organizationId: invitation.organization_id,
      userId,
      caredPersonId: invitation.cared_person_id ?? null,
      moduleCode: 'rotina',
      action: isNewUser ? 'invitation_accepted_new_user' : 'invitation_accepted_existing_user',
      tableName: 'care_invitations',
      recordId: invitation.id,
      newData: { role: invitation.role, user_id: userId },
      description: `Convite aceito. Perfil: ${invitation.role}`,
      languageUsed: language ?? invitation.preferred_language,
    });

    // 9. Notify organization admins
    const { data: admins } = await adminSupabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', invitation.organization_id)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')
      .neq('user_id', userId);

    if (admins && admins.length > 0) {
      const { data: invitee } = await adminSupabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      const notifPayload = admins.map((a) => ({
        user_id: a.user_id,
        organization_id: invitation.organization_id,
        type: 'info',
        title: 'Novo membro entrou',
        message: `${invitee?.full_name ?? invitation.invited_email ?? 'Um usuário'} aceitou o convite e entrou na família.`,
        link_url: `/${invitation.preferred_language}/dashboard/family`,
      }));

      await adminSupabase.from('notifications').insert(notifPayload);
    }

    // 10. Sync entitlements
    syncOrganizationEntitlementCounts(invitation.organization_id).catch(() => {});

    // 11. Return where to redirect
    const locale = language ?? invitation.preferred_language ?? 'pt-BR';
    const redirectTo = invitation.role === 'cared_person'
      ? `/${locale}/care/${invitation.cared_person_id ?? ''}`
      : `/${locale}/dashboard`;

    return NextResponse.json({
      success: true,
      isNewUser,
      userId,
      role: invitation.role,
      redirectTo,
      preferredLanguage: language ?? invitation.preferred_language,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao aceitar convite.' }, { status: 500 });
  }
}
