import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://xwtxywzkaexzbocvaklu.supabase.co';
const ANON_KEY = 'sb_publishable_3gGA-s5zqukC2BwUWntYOA_aYnNEMWl';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`
};

const backupDir = path.resolve('backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function fetchAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${table}: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

async function main() {
  console.log('=== EXTRAINDO DADOS DO SUPABASE CLOUD ===');
  const sales = await fetchAll('sales');
  const goals = await fetchAll('goals');
  const companyGoals = await fetchAll('company_goals');
  const kits = await fetchAll('kits');

  const fullDump = {
    timestamp: new Date().toISOString(),
    source: SUPABASE_URL,
    counts: {
      sales: sales.length,
      goals: goals.length,
      company_goals: companyGoals.length,
      kits: kits.length
    },
    tables: {
      sales,
      goals,
      company_goals: companyGoals,
      kits
    }
  };

  // 1. JSON Dump
  const jsonPath = path.join(backupDir, 'supabase_backup_tratormaster.json');
  fs.writeFileSync(jsonPath, JSON.stringify(fullDump, null, 2), 'utf-8');
  console.log(`✓ Backup JSON salvo em: ${jsonPath}`);

  // 2. SQL Dump
  const sqlLines = [
    `-- SUPABASE BACKUP FOR TRATORMASTER`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source: ${SUPABASE_URL}`,
    ``
  ];

  for (const s of sales) {
    const cols = Object.keys(s).map(k => `"${k}"`).join(', ');
    const vals = Object.values(s).map(v => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'boolean' || typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(', ');
    sqlLines.push(`INSERT INTO public.sales (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`);
  }

  for (const g of goals) {
    const cols = Object.keys(g).map(k => `"${k}"`).join(', ');
    const vals = Object.values(g).map(v => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'boolean' || typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(', ');
    sqlLines.push(`INSERT INTO public.goals (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`);
  }

  for (const cg of companyGoals) {
    const cols = Object.keys(cg).map(k => `"${k}"`).join(', ');
    const vals = Object.values(cg).map(v => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'boolean' || typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(', ');
    sqlLines.push(`INSERT INTO public.company_goals (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`);
  }

  const sqlPath = path.join(backupDir, 'supabase_backup_tratormaster.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8');
  console.log(`✓ Backup SQL salvo em: ${sqlPath}`);

  // 3. Batimento Contábil Supabase
  const totalSalesValue = sales.reduce((acc, s) => acc + Number(s.valor || 0), 0);
  console.log('\n=== BATIMENTO CONTÁBIL BASE (SUPABASE) ===');
  console.log(`Total de Vendas: ${sales.length} registros`);
  console.log(`Soma Total Financeira: R$ ${totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`Total de Metas Individuais: ${goals.length} registros`);
  console.log(`Total de Metas da Empresa: ${companyGoals.length} registros`);
  console.log(`Total de Kits: ${kits.length} registros`);
}

main().catch(err => {
  console.error('Falha na extração:', err);
  process.exit(1);
});
