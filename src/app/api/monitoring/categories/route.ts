import { NextResponse } from 'next/server';
import { MONITORING_CATALOG } from '@/lib/monitoring/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      categories: MONITORING_CATALOG,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao carregar catálogo.' }, { status: 500 });
  }
}
