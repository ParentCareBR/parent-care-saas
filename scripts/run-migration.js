/*
 * Script para executar a migração SQL no Supabase via Management API
 * Uso: node scripts/run-migration.js
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rokrsaprrqkjdcaakkkg.supabase.co';

// Read the SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '02_cared_persons_and_modules.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('=== Migração SQL para executar no Supabase ===');
console.log('');
console.log('1. Acesse: https://supabase.com/dashboard/project/rokrsaprrqkjdcaakkkg/sql/new');
console.log('2. Cole o SQL abaixo no editor e clique em "Run":');
console.log('');
console.log('--- INÍCIO DO SQL ---');
console.log(sql);
console.log('--- FIM DO SQL ---');
