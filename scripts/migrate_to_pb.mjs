import fs from 'fs';
import path from 'path';

/**
 * SCRIPT DE MIGRAÇÃO E BATIMENTO CONTÁBIL CENTAVO POR CENTAVO
 * TratorMaster: Supabase Cloud -> PocketBase Coolify
 */

const PB_URL = (process.env.VITE_POCKETBASE_URL || 'http://pb-tratormaster.janagencia.com.br').replace(/\/$/, '');
const PB_EMAIL = process.env.PB_EMAIL || 'mccley.1@gmail.com';
const PB_PASS = process.env.PB_PASS || '082025mccley';

async function getPBToken() {
  console.log(`[1/4] Autenticando no PocketBase (${PB_URL})...`);
  let res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS })
  });

  if (!res.ok) {
    res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS })
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha na autenticação do superusuário (${res.status}): ${errText}`);
  }

  const data = await res.json();
  console.log('✓ Conectado como Superusuário no PocketBase!');
  return data.token;
}

async function main() {
  console.log('\n=============================================================');
  console.log('   MIGRAÇÃO TRATORMASTER: SUPABASE -> POCKETBASE COOLIFY    ');
  console.log('=============================================================\n');

  const dumpPath = path.resolve('backups/supabase_backup_tratormaster.json');
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Arquivo de dump não encontrado em: ${dumpPath}. Execute scripts/backup_supabase.mjs primeiro.`);
  }

  const backupData = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));
  const { sales, goals, company_goals, kits } = backupData.tables;

  const token = await getPBToken();
  const pbHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. Migrar Sales
  console.log(`\n[2/4] Migrando ${sales.length} vendas para a coleção 'sales'...`);
  let salesInserted = 0;
  for (const s of sales) {
    const payload = {
      marca: s.marca || 'JCB',
      data: s.data,
      cliente: s.cliente,
      valor: Number(s.valor || 0),
      vendedor: s.vendedor,
      evento_syonet: s.evento_syonet || '',
      equipamento: s.equipamento || '',
      nota_fiscal: s.nota_fiscal || '',
      condicao: s.condicao || '',
      quantidade_cota: s.quantidade_cota ? Number(s.quantidade_cota) : 0,
      tipo_cota: s.tipo_cota || '',
      comissao_personalizada: s.comissao_personalizada ? Number(s.comissao_personalizada) : 0,
      observacao: s.observacao || '',
      recebido_gerente: Boolean(s.recebido_gerente),
      original_id: s.id
    };

    const res = await fetch(`${PB_URL}/api/collections/sales/records`, {
      method: 'POST',
      headers: pbHeaders,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      salesInserted++;
    } else {
      const err = await res.text();
      console.warn(`  Aviso ao inserir venda ${s.id}: ${err}`);
    }
  }
  console.log(`✓ ${salesInserted}/${sales.length} vendas inseridas com sucesso!`);

  // 2. Migrar Goals
  console.log(`\n[3/4] Migrando ${goals.length} metas individuais para a coleção 'goals'...`);
  let goalsInserted = 0;
  for (const g of goals) {
    const payload = {
      vendedor: g.vendedor,
      equipamento: g.equipamento,
      meta: Number(g.meta || 0),
      original_id: g.id
    };

    const res = await fetch(`${PB_URL}/api/collections/goals/records`, {
      method: 'POST',
      headers: pbHeaders,
      body: JSON.stringify(payload)
    });

    if (res.ok) goalsInserted++;
  }
  console.log(`✓ ${goalsInserted}/${goals.length} metas individuais inseridas com sucesso!`);

  // 3. Migrar Company Goals
  console.log(`\n[4/4] Migrando ${company_goals.length} metas da empresa para 'company_goals'...`);
  let companyGoalsInserted = 0;
  for (const cg of company_goals) {
    const payload = {
      equipamento: cg.equipamento,
      meta: Number(cg.meta || 0),
      original_id: cg.id
    };

    const res = await fetch(`${PB_URL}/api/collections/company_goals/records`, {
      method: 'POST',
      headers: pbHeaders,
      body: JSON.stringify(payload)
    });

    if (res.ok) companyGoalsInserted++;
  }
  console.log(`✓ ${companyGoalsInserted}/${company_goals.length} metas da empresa inseridas!`);

  // 4. BATIMENTO CONTÁBIL
  console.log('\n=============================================================');
  console.log('             RELATÓRIO DE BATIMENTO CONTÁBIL                ');
  console.log('=============================================================');

  // Fetch all records from PocketBase
  const pbSalesRes = await fetch(`${PB_URL}/api/collections/sales/records?perPage=500`, { headers: pbHeaders });
  const pbSalesData = await pbSalesRes.json();
  const pbSalesItems = pbSalesData.items || [];

  const supabaseSalesTotal = sales.reduce((acc, s) => acc + Number(s.valor || 0), 0);
  const pbSalesTotal = pbSalesItems.reduce((acc, s) => acc + Number(s.valor || 0), 0);
  const divergence = Math.abs(supabaseSalesTotal - pbSalesTotal);

  console.log(`Métrica                    | Supabase Cloud         | PocketBase Coolify`);
  console.log(`---------------------------|------------------------|------------------------`);
  console.log(`Total Vendas (linhas)      | ${String(sales.length).padEnd(22)} | ${String(pbSalesItems.length).padEnd(22)}`);
  console.log(`Soma Vendas (R$)           | R$ ${supabaseSalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padEnd(19)} | R$ ${pbSalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padEnd(19)}`);
  console.log(`Metas Individuais (linhas) | ${String(goals.length).padEnd(22)} | ${String(goalsInserted).padEnd(22)}`);
  console.log(`Metas Empresa (linhas)     | ${String(company_goals.length).padEnd(22)} | ${String(companyGoalsInserted).padEnd(22)}`);
  console.log(`---------------------------|------------------------|------------------------`);
  console.log(`DIVERGÊNCIA CONTÁBIL:      | R$ ${divergence.toFixed(2)} (STATUS: ${divergence === 0 ? '✓ BATIMENTO 100% EXATO (R$ 0,00)' : '❌ DIVERGÊNCIA DETECTADA'})`);
  console.log('=============================================================\n');
}

main().catch(err => {
  console.error('❌ Erro na migração:', err.message);
  process.exit(1);
});
