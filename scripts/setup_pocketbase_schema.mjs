/**
 * SCRIPT PARA CRIAÇÃO DAS COLEÇÕES NO POCKETBASE: TRATORMASTER
 * Uso: node scripts/setup_pocketbase_schema.mjs --pb-url="http://pb-tratormaster.janagencia.com.br" --pb-email="mccley.1@gmail.com" --pb-pass="082025mccley"
 */

const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    acc[key] = val;
  }
  return acc;
}, {});

const PB_URL = (args['pb-url'] || process.env.VITE_POCKETBASE_URL || 'http://pb-tratormaster.janagencia.com.br').replace(/\/$/, '');
const PB_EMAIL = args['pb-email'] || process.env.PB_EMAIL || 'mccley.1@gmail.com';
const PB_PASS = args['pb-pass'] || process.env.PB_PASS || '082025mccley';

async function getAdminToken() {
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
    throw new Error(`Falha ao autenticar no PocketBase (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.token;
}

const collectionsToCreate = [
  {
    name: 'sales',
    type: 'base',
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { name: 'marca', type: 'text', required: true },
      { name: 'data', type: 'text', required: true },
      { name: 'cliente', type: 'text', required: true },
      { name: 'valor', type: 'number', required: true },
      { name: 'vendedor', type: 'text', required: true },
      { name: 'evento_syonet', type: 'text', required: false },
      { name: 'equipamento', type: 'text', required: false },
      { name: 'nota_fiscal', type: 'text', required: false },
      { name: 'condicao', type: 'text', required: false },
      { name: 'quantidade_cota', type: 'number', required: false },
      { name: 'tipo_cota', type: 'text', required: false },
      { name: 'comissao_personalizada', type: 'number', required: false },
      { name: 'observacao', type: 'text', required: false },
      { name: 'recebido_gerente', type: 'bool', required: false },
      { name: 'original_id', type: 'text', required: false }
    ]
  },
  {
    name: 'goals',
    type: 'base',
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { name: 'vendedor', type: 'text', required: true },
      { name: 'equipamento', type: 'text', required: true },
      { name: 'meta', type: 'number', required: true },
      { name: 'original_id', type: 'text', required: false }
    ]
  },
  {
    name: 'company_goals',
    type: 'base',
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { name: 'equipamento', type: 'text', required: true },
      { name: 'meta', type: 'number', required: true },
      { name: 'original_id', type: 'text', required: false }
    ]
  },
  {
    name: 'kits',
    type: 'base',
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { name: 'data', type: 'text', required: true },
      { name: 'evento_syonet', type: 'text', required: true },
      { name: 'cliente', type: 'text', required: true },
      { name: 'nota_fiscal', type: 'text', required: false },
      { name: 'vendedor', type: 'text', required: true },
      { name: 'original_id', type: 'text', required: false }
    ]
  }
];

async function main() {
  console.log(`\n======================================================`);
  console.log(`   CRIANDO ESTRUTURA DO TRATORMASTER NO POCKETBASE    `);
  console.log(`   URL: ${PB_URL}                                     `);
  console.log(`======================================================\n`);

  try {
    const token = await getAdminToken();
    console.log('✓ Autenticado com sucesso como superusuário!');

    // Get existing collections
    const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const existing = await listRes.json();
    const existingNames = new Set((existing.items || []).map(c => c.name));

    for (const col of collectionsToCreate) {
      if (existingNames.has(col.name)) {
        console.log(`- Coleção "${col.name}" já existe. Atualizando regras...`);
        const existingCol = (existing.items || []).find(c => c.name === col.name);
        if (existingCol) {
          await fetch(`${PB_URL}/api/collections/${existingCol.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              listRule: col.listRule,
              viewRule: col.viewRule,
              createRule: col.createRule,
              updateRule: col.updateRule,
              deleteRule: col.deleteRule
            })
          });
        }
        continue;
      }

      console.log(`⏳ Criando coleção "${col.name}"...`);
      const createRes = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(col)
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`❌ Erro ao criar coleção "${col.name}":`, errText);
      } else {
        console.log(`✓ Coleção "${col.name}" criada com sucesso!`);
      }
    }

    console.log(`\n✅ Estrutura criada e configurada com sucesso no PocketBase!`);
  } catch (err) {
    console.error(`❌ Falha: ${err.message}`);
    process.exit(1);
  }
}

main();
