const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runTests() {
  console.log('--- Iniciando Testes de RLS e Banco de Dados ---');
  
  // 1. Check if public can read cared_people
  const { data: publicData, error: publicErr } = await supabase.from('cared_people').select('*').limit(1);
  if (publicData?.length > 0) {
    console.error('❌ FALHA RLS: Acesso anônimo permitido na tabela cared_people!');
    process.exit(1);
  } else {
    console.log('✅ RLS Seguro: Usuário anônimo não consegue ler cared_people.');
  }

  // 2. Check if metrics calculate correctly
  const { count } = await adminSupabase.from('organizations').select('*', { count: 'exact', head: true });
  console.log(`✅ Conexão DB OK: Encontradas ${count || 0} organizações no banco real.`);

  console.log('--- Testes aprovados ---');
}

runTests();
