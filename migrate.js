const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.rokrsaprrqkjdcaakkkg:James231201%40@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase in us-east-1...');
    await client.connect();
    console.log('Connected!');

    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'supabase', 'schema.sql'), 'utf8');
    
    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    console.log('schema.sql executed successfully!');

    console.log('Reading 20260905_billing_schema.sql...');
    const billingSql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20260905_billing_schema.sql'), 'utf8');
    
    console.log('Executing billing schema...');
    await client.query(billingSql);
    console.log('Billing schema executed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
