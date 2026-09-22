import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pb-tratormaster.janagencia.com.br');

const INITIAL_PRODUCTS = [
  'Retro 3CX (BHL)',
  '3CX Plus',
  'ESCAVADEIRA (EXC)',
  'PÁ CARREGADEIRA (WLS)',
  'MANIPULADOR (TH)',
  'MINI ESCAVADEIRA (MIN)',
  'MINI CARREGADEIRA (SSL)',
  'ROLO COMPACTADOR (CPTN)',
  'Consórcio'
];

const INITIAL_CATEGORIES = ['JCB', 'EP', 'Consórcio', 'Clark'];

const INITIAL_SELLERS = ['Anderson', 'Carlos', 'Thalita', 'Diretoria', 'Outros'];

async function createOrUpdateCollection(name, fields) {
  try {
    const existing = await pb.collections.getOne(name);
    console.log(`Collection "${name}" already exists with id: ${existing.id}`);
    return existing;
  } catch (err) {
    if (err.status === 404) {
      console.log(`Creating collection "${name}"...`);
      const created = await pb.collections.create({
        name,
        type: 'base',
        fields,
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""'
      });
      console.log(`Created collection "${name}" successfully (id: ${created.id})`);
      return created;
    }
    throw err;
  }
}

async function seedCollection(colName, items, key = 'name') {
  const existing = await pb.collection(colName).getFullList();
  console.log(`Checking seed for ${colName} (current items: ${existing.length})...`);
  
  for (const item of items) {
    const found = existing.some(e => e[key]?.trim().toLowerCase() === item.trim().toLowerCase());
    if (!found) {
      await pb.collection(colName).create({
        [key]: item,
        active: true
      });
      console.log(`  + Seeded ${colName}: "${item}"`);
    }
  }
}

async function main() {
  await pb.collection('_superusers').authWithPassword('mccley.1@gmail.com', '082025mccley');
  console.log('Authenticated as superuser.');

  // 1. Products collection
  await createOrUpdateCollection('products', [
    { name: 'name', type: 'text', required: true },
    { name: 'active', type: 'bool', required: false }
  ]);
  await seedCollection('products', INITIAL_PRODUCTS);

  // 2. Categories collection
  await createOrUpdateCollection('categories', [
    { name: 'name', type: 'text', required: true },
    { name: 'active', type: 'bool', required: false }
  ]);
  await seedCollection('categories', INITIAL_CATEGORIES);

  // 3. Sellers collection
  await createOrUpdateCollection('sellers', [
    { name: 'name', type: 'text', required: true },
    { name: 'active', type: 'bool', required: false }
  ]);
  await seedCollection('sellers', INITIAL_SELLERS);

  console.log('\nAll settings collections created and seeded successfully!');
}

main().catch(console.error);
