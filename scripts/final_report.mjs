import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pb-tratormaster.janagencia.com.br');

async function finalReport() {
  await pb.collection('_superusers').authWithPassword('mccley.1@gmail.com', '082025mccley');

  const sales = await pb.collection('sales').getFullList();
  const goals = await pb.collection('goals').getFullList();
  const companyGoals = await pb.collection('company_goals').getFullList();

  console.log('=== CONFERÊNCIA POCKETBASE TRATORMASTER ===');
  console.log(`Total de vendas no PocketBase: ${sales.length}`);
  console.log(`Total de metas individuais: ${goals.length}`);
  console.log(`Total de metas da empresa: ${companyGoals.length}`);

  // 1. Equipamentos
  const equipCount = {};
  sales.filter(s => (s.marca || 'JCB').trim().toUpperCase() === 'JCB').forEach(s => {
    let eq = s.equipamento;
    if (eq === '3CX Plus') eq = 'Retro 3CX (BHL)';
    equipCount[eq] = (equipCount[eq] || 0) + 1;
  });

  console.log('\n--- Equipamentos JCB no PocketBase ---');
  console.table(equipCount);

  // 2. Vendedores
  const vendCount = {};
  sales.filter(s => (s.marca || 'JCB').trim().toUpperCase() === 'JCB').forEach(s => {
    vendCount[s.vendedor] = (vendCount[s.vendedor] || 0) + 1;
  });

  console.log('\n--- Vendedores JCB no PocketBase ---');
  console.table(vendCount);

  // 3. Comissões
  const elegiveis = sales.filter(s => ['JCB', 'EP', 'CLARK'].includes((s.marca || '').toUpperCase()));
  const pendentes = elegiveis.filter(s => !s.recebido_gerente);
  const recebidas = elegiveis.filter(s => s.recebido_gerente);

  const totalValorPendentes = pendentes.reduce((acc, s) => acc + s.valor, 0);
  const totalComissaoPendente = pendentes.reduce((acc, s) => acc + (s.valor * 0.002), 0);

  const totalValorRecebidas = recebidas.reduce((acc, s) => acc + s.valor, 0);
  const totalComissaoRecebida = recebidas.reduce((acc, s) => acc + (s.valor * 0.002), 0);

  console.log('\n--- Resumo de Comissões no PocketBase ---');
  console.log('Vendas Pendentes:', totalValorPendentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  console.log('Comissão Pendente:', totalComissaoPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  console.log('Comissões Recebidas:', totalComissaoRecebida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
}

finalReport();
