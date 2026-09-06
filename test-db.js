const { Client } = require('pg');

async function testConnection(region) {
  const connectionString = `postgresql://postgres.rokrsaprrqkjdcaakkkg:James231201@@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    console.log(`Success in region: ${region}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed in region: ${region} - ${err.message}`);
    return false;
  }
}

async function run() {
  const regions = ['sa-east-1', 'us-east-1', 'us-east-2', 'us-west-1', 'eu-west-1'];
  for (const r of regions) {
    if (await testConnection(r)) break;
  }
}
run();
