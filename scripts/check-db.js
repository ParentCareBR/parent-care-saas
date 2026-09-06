const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rokrsaprrqkjdcaakkkg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva3JzYXBycnFramRjYWFra2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDQ3MTIsImV4cCI6MjEwNDIyMDcxMn0.rsiEmS37aWDKQw3ZKQx-8z35aGDnkEMNuhdSANrwsyw'
);

async function check() {
  const { data: users, error: uError } = await supabase.from('users').select('*');
  console.log('Users:', users?.length, uError);
  
  const { data: orgs, error: oError } = await supabase.from('organizations').select('*');
  console.log('Orgs:', orgs?.length, oError);
}

check();
