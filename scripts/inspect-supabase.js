const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[k] = v;
    }
  }
});

const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const tables = [
    'organizations',
    'organization_members',
    'organization_entitlements',
    'cared_people',
    'medications',
    'appointments',
    'tasks',
    'meals',
    'hydration_logs',
    'care_notes',
    'billing_subscriptions',
    'billing_customers'
  ];
  const { data: invData, error: invErr } = await client.from('organization_invitations').select('id').limit(1);
  console.log('organization_invitations ->', invErr ? invErr.message : 'EXISTS');
}

check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
