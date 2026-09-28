import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function detectCardBrand(number: string): string {
  const clean = number.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^(4011|4389|4514|4576|5041|5067|5090|6277|6362|6363)/.test(clean)) return 'Elo';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^(606282|3841)/.test(clean)) return 'Hipercard';
  return 'Cartão de Crédito';
}

function validateLuhn(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      card,
      seats = 1,
      billingInterval = 'month',
      locale = 'pt-BR',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome completo é obrigatório.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'A senha deve conter no mínimo 6 caracteres.' }, { status: 400 });
    }

    // Card Validations
    if (!card || !card.number || !card.holder || !card.expiry || !card.cvv) {
      return NextResponse.json({ 
        error: 'Por favor, informe todos os dados do cartão de crédito para validação do teste de 30 dias.' 
      }, { status: 400 });
    }

    const cleanCardNumber = card.number.replace(/\D/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      return NextResponse.json({ error: 'Número de cartão inválido.' }, { status: 400 });
    }

    // Validate Luhn (allow 4242 in test)
    const isLuhnValid = validateLuhn(cleanCardNumber);
    if (!isLuhnValid && cleanCardNumber !== '4242424242424242') {
      return NextResponse.json({ error: 'Número de cartão inválido. Verifique os dígitos digitados.' }, { status: 400 });
    }

    const expiryParts = card.expiry.split('/');
    if (expiryParts.length !== 2) {
      return NextResponse.json({ error: 'Validade do cartão deve ser no formato MM/AA.' }, { status: 400 });
    }
    const expMonth = parseInt(expiryParts[0].trim(), 10);
    const expYearTwoDigits = parseInt(expiryParts[1].trim(), 10);
    if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
      return NextResponse.json({ error: 'Mês de validade inválido (01 a 12).' }, { status: 400 });
    }
    const currentYearTwoDigits = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    if (expYearTwoDigits < currentYearTwoDigits || (expYearTwoDigits === currentYearTwoDigits && expMonth < currentMonth)) {
      return NextResponse.json({ error: 'Cartão com validade vencida.' }, { status: 400 });
    }

    const cleanCvv = card.cvv.replace(/\D/g, '');
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      return NextResponse.json({ error: 'Código de segurança (CVV) inválido.' }, { status: 400 });
    }

    const brand = detectCardBrand(cleanCardNumber);
    const last4 = cleanCardNumber.slice(-4);
    const cardholderName = card.holder.trim().toUpperCase();
    const cleanCpf = (card.cpf || '').replace(/\D/g, '');

    const adminSupabase = createAdminClient();
    const cookieStore = cookies();
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 1. Create User via Admin (if available) or Auth signUp
    let userId: string | null = null;
    let autoConfirmed = false;

    try {
      const { data: adminCreated, error: adminErr } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          full_name: name,
          card_brand: brand,
          card_last4: last4,
          cardholder_name: cardholderName,
          card_exp: `${expMonth}/${expYearTwoDigits}`,
          payment_method: 'credit_card',
        },
      });

      if (!adminErr && adminCreated?.user) {
        userId = adminCreated.user.id;
        autoConfirmed = true;
      }
    } catch {
      // Fall back to standard sign up
    }

    if (!userId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parentcare-pink.vercel.app';
      const redirectTo = `${siteUrl}/${locale}/auth/callback?locale=${locale}`;
      const { data: signUpData, error: signUpErr } = await userClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
            card_brand: brand,
            card_last4: last4,
            cardholder_name: cardholderName,
            card_exp: `${expMonth}/${expYearTwoDigits}`,
            payment_method: 'credit_card',
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (signUpErr) {
        return NextResponse.json({ error: signUpErr.message }, { status: 400 });
      }
      userId = signUpData?.user?.id || null;
      if (signUpData?.session) {
        autoConfirmed = true;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Falha ao registrar usuário.' }, { status: 500 });
    }

    // 2. Ensure public.users profile exists
    try {
      await (adminSupabase as any).from('users').upsert({
        id: userId,
        email,
        full_name: name,
        locale,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    // 3. Create Family Organization with exact 30-Day Trial and Payment Method
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + thirtyDaysMs).toISOString();

    const newOrgId = crypto.randomUUID();
    const uniqueSlug = `familia-${userId.slice(0, 5)}-${Date.now()}`;
    const orgName = `Família de ${name.split(' ')[0]}`;

    const orgSettings = {
      payment_method: {
        type: 'credit_card',
        brand,
        last4,
        cardholder_name: cardholderName,
        expiry: `${String(expMonth).padStart(2, '0')}/${expYearTwoDigits}`,
        cpf: cleanCpf || null,
        registered_at: now.toISOString(),
      },
      trial: {
        is_trial: true,
        days: 30,
        started_at: now.toISOString(),
        ends_at: trialEndsAt,
        initial_charge: 0,
        first_charge_amount: billingInterval === 'year' ? 287.00 : 29.90,
        currency: 'BRL',
      },
    };

    const { error: orgErr } = await (adminSupabase as any).from('organizations').insert({
      id: newOrgId,
      name: orgName,
      slug: uniqueSlug,
      owner_id: userId,
      subscription_status: 'trial',
      trial_ends_at: trialEndsAt,
      settings: orgSettings,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (orgErr) {
      console.warn('[SignupTrial] Could not insert organization via admin:', orgErr.message);
    }

    // 4. Create membership as owner
    try {
      await (adminSupabase as any).from('organization_members').insert({
        organization_id: newOrgId,
        user_id: userId,
        role: 'owner',
        status: 'active',
        created_at: now.toISOString(),
      });
    } catch {
      // ignore
    }

    // 5. Create organization_entitlements
    try {
      await (adminSupabase as any).from('organization_entitlements').insert({
        organization_id: newOrgId,
        seat_limit: Number(seats) || 1,
        cared_people_limit: 2,
        active_members_count: 1,
        reserved_invites_count: 0,
        subscription_status: 'trial',
        access_valid_until: trialEndsAt,
        updated_at: now.toISOString(),
      });
    } catch {
      // ignore
    }


    return NextResponse.json({
      success: true,
      autoConfirmed,
      userId,
      organizationId: newOrgId,
      trialEndsAt,
      brand,
      last4,
      message: 'Cartão validado com sucesso! Seu período de 30 dias grátis está ativo.',
    });
  } catch (error: any) {
    console.error('[API/SignupTrial] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar cadastro.' }, { status: 500 });
  }
}
