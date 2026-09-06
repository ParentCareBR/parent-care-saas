import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const caredPersonId = searchParams.get('caredPersonId');

    if (!caredPersonId) {
      return NextResponse.json({ error: 'caredPersonId é obrigatório.' }, { status: 400 });
    }

    const { data: person } = await supabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', caredPersonId)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    // 1. Fetch metadata from organizations.settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .maybeSingle();

    const orgSettings = (org?.settings as any) || {};
    const expensesMeta = orgSettings.expenses_meta || {};
    const fallbackList = orgSettings.expenses?.[caredPersonId] || [];

    // 2. Fetch from expenses table in Supabase
    let dbExpenses: any[] = [];
    try {
      const adminSupabase = createAdminClient();
      const { data, error } = await adminSupabase
        .from('expenses')
        .select('*')
        .eq('cared_person_id', caredPersonId)
        .order('paid_at', { ascending: false });

      if (!error && data) {
        dbExpenses = data;
      }
    } catch (_) {
      // safe fallback if table issue
    }

    if (dbExpenses.length > 0) {
      const mapped = dbExpenses.map((e) => {
        const meta = expensesMeta[e.id] || {};
        return {
          id: e.id,
          organization_id: e.organization_id,
          cared_person_id: e.cared_person_id,
          category: e.category,
          description: e.description,
          amount: Number(e.amount),
          currency: e.currency || 'BRL',
          date: e.paid_at || e.created_at,
          paid_by: meta.paid_by_text || e.paid_by || null,
          notes: meta.notes || null,
          receipt_url: e.receipt_url || null,
          created_by: e.created_by,
          created_at: e.created_at,
        };
      });
      return NextResponse.json({ success: true, expenses: mapped });
    }

    // Fallback if db table has no rows or is empty
    return NextResponse.json({ success: true, expenses: fallbackList });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao carregar despesas.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      caredPersonId,
      category,
      description,
      amount,
      date,
      paid_by,
      notes,
    } = body;

    if (!caredPersonId || !category || !description || amount === undefined || amount === null) {
      return NextResponse.json({
        error: 'Pessoa cuidada, categoria, descrição e valor são obrigatórios.',
      }, { status: 400 });
    }

    const numericAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 });
    }

    const { data: person } = await supabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', caredPersonId)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', person.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Acesso não autorizado para esta família.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const paidAtDate = date ? new Date(date.includes('T') ? date : `${date}T12:00:00Z`).toISOString() : now;
    const isPaidByUuid = isValidUuid(paid_by);
    const dbPaidBy = isPaidByUuid ? paid_by : user.id;
    const paidByText = paid_by?.trim() || null;
    const notesText = notes?.trim() || null;

    let createdRecord: any = null;

    // 1. Insert into public.expenses table
    try {
      const adminSupabase = createAdminClient();
      const { data, error } = await adminSupabase
        .from('expenses')
        .insert({
          organization_id: person.organization_id,
          cared_person_id: caredPersonId,
          category,
          description: description.trim(),
          amount: numericAmount,
          currency: 'BRL',
          paid_at: paidAtDate,
          paid_by: dbPaidBy,
          created_by: user.id,
        })
        .select()
        .single();

      if (!error && data) {
        createdRecord = data;
      } else if (error) {
        console.warn('Could not insert into expenses table, using fallback:', error.message);
      }
    } catch (err: any) {
      console.warn('Expenses table insert exception:', err?.message);
    }

    // 2. Persist metadata (paid_by display name & notes) in organizations.settings
    const newId = createdRecord?.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .single();

    const currentOrgSettings = (org?.settings as any) || {};
    const expensesMeta = { ...(currentOrgSettings.expenses_meta || {}) };

    expensesMeta[newId] = {
      paid_by_text: paidByText,
      notes: notesText,
      updated_at: now,
    };

    // If expenses table was not available, save complete fallback row
    const expensesListMap = { ...(currentOrgSettings.expenses || {}) };
    const currentList = expensesListMap[caredPersonId] || [];

    const unifiedExpense = {
      id: newId,
      organization_id: person.organization_id,
      cared_person_id: caredPersonId,
      category,
      description: description.trim(),
      amount: numericAmount,
      currency: 'BRL',
      date: paidAtDate,
      paid_by: paidByText,
      notes: notesText,
      created_by: user.id,
      created_at: now,
    };

    if (!createdRecord) {
      expensesListMap[caredPersonId] = [unifiedExpense, ...currentList];
    }

    await supabase
      .from('organizations')
      .update({
        settings: {
          ...currentOrgSettings,
          expenses_meta: expensesMeta,
          expenses: expensesListMap,
        },
        updated_at: now,
      })
      .eq('id', person.organization_id);

    // 3. Insert audit log
    try {
      await supabase.from('audit_logs').insert({
        organization_id: person.organization_id,
        user_id: user.id,
        action: 'expense_created',
        table_name: 'expenses',
        record_id: newId,
        old_data: {},
        new_data: unifiedExpense,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Despesa registrada com sucesso!',
      expense: unifiedExpense,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao registrar despesa.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      caredPersonId,
      category,
      description,
      amount,
      date,
      paid_by,
      notes,
    } = body;

    if (!id || !caredPersonId) {
      return NextResponse.json({ error: 'id e caredPersonId são obrigatórios.' }, { status: 400 });
    }

    const numericAmount = parseFloat(String(amount).replace(',', '.'));
    const now = new Date().toISOString();
    const paidAtDate = date ? new Date(date.includes('T') ? date : `${date}T12:00:00Z`).toISOString() : now;
    const paidByText = paid_by?.trim() || null;
    const notesText = notes?.trim() || null;

    const { data: person } = await supabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', caredPersonId)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    // 1. Update in public.expenses if available
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase
        .from('expenses')
        .update({
          category,
          description: description.trim(),
          amount: numericAmount,
          paid_at: paidAtDate,
        })
        .eq('id', id);
    } catch (_) {}

    // 2. Update metadata in organizations.settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .single();

    const currentOrgSettings = (org?.settings as any) || {};
    const expensesMeta = { ...(currentOrgSettings.expenses_meta || {}) };
    expensesMeta[id] = {
      paid_by_text: paidByText,
      notes: notesText,
      updated_at: now,
    };

    // Update fallback list if present
    const expensesListMap = { ...(currentOrgSettings.expenses || {}) };
    const currentList = expensesListMap[caredPersonId] || [];
    const updatedList = currentList.map((e: any) =>
      e.id === id
        ? {
            ...e,
            category,
            description: description.trim(),
            amount: numericAmount,
            date: paidAtDate,
            paid_by: paidByText,
            notes: notesText,
          }
        : e
    );
    expensesListMap[caredPersonId] = updatedList;

    await supabase
      .from('organizations')
      .update({
        settings: {
          ...currentOrgSettings,
          expenses_meta: expensesMeta,
          expenses: expensesListMap,
        },
        updated_at: now,
      })
      .eq('id', person.organization_id);

    return NextResponse.json({
      success: true,
      message: 'Despesa atualizada com sucesso!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar despesa.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const caredPersonId = searchParams.get('caredPersonId');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    // 1. Delete from expenses table
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase.from('expenses').delete().eq('id', id);
    } catch (_) {}

    // 2. Clean from organizations.settings if caredPersonId provided
    if (caredPersonId) {
      const { data: person } = await supabase
        .from('cared_people')
        .select('organization_id')
        .eq('id', caredPersonId)
        .maybeSingle();

      if (person) {
        const { data: org } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', person.organization_id)
          .single();

        const currentOrgSettings = (org?.settings as any) || {};
        const expensesMeta = { ...(currentOrgSettings.expenses_meta || {}) };
        delete expensesMeta[id];

        const expensesListMap = { ...(currentOrgSettings.expenses || {}) };
        const currentList = expensesListMap[caredPersonId] || [];
        expensesListMap[caredPersonId] = currentList.filter((e: any) => e.id !== id);

        await supabase
          .from('organizations')
          .update({
            settings: {
              ...currentOrgSettings,
              expenses_meta: expensesMeta,
              expenses: expensesListMap,
            },
          })
          .eq('id', person.organization_id);

        try {
          await supabase.from('audit_logs').insert({
            organization_id: person.organization_id,
            user_id: user.id,
            action: 'expense_deleted',
            table_name: 'expenses',
            record_id: id,
            old_data: { id },
            new_data: {},
          });
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Despesa excluída com sucesso.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao excluir despesa.' }, { status: 500 });
  }
}
