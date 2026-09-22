import PocketBase from 'pocketbase';
import { Sale, Goal, CompanyGoal, Kit, Seller, Equipment, Condition, Marca, TipoCota, ProductItem, CategoryItem, SellerItem } from '../types';
import { INITIAL_GOALS, INITIAL_COMPANY_GOALS, EQUIPMENTS, MARCAS, SELLERS } from '../constants';

const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'https://pb-tratormaster.janagencia.com.br';

export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

export const isPocketBaseConfigured = !!pbUrl;

// --- AUTHENTICATION & ACCESS CONTROL ---
export const authService = {
  isValid(): boolean {
    return pb.authStore.isValid;
  },
  getUser() {
    return pb.authStore.record;
  },
  onAuthChange(callback: (token: string, record: any) => void) {
    return pb.authStore.onChange(callback);
  },
  async login(email: string, pass: string) {
    return await pb.collection('users').authWithPassword(email, pass);
  },
  async changePassword(oldPassword: string, newPassword: string) {
    const user = pb.authStore.record;
    if (!user) throw new Error('Usuário não autenticado.');
    return await pb.collection('users').update(user.id, {
      oldPassword,
      password: newPassword,
      passwordConfirm: newPassword
    });
  },
  logout() {
    pb.authStore.clear();
  }
};

// --- DATA MAPPING HELPERS ---
function mapSaleFromPB(record: any): Sale {
  return {
    id: record.id,
    marca: record.marca as Marca,
    data: record.data,
    cliente: record.cliente,
    valor: Number(record.valor || 0),
    vendedor: record.vendedor as Seller,
    eventoSyonet: record.evento_syonet || undefined,
    equipamento: record.equipamento as Equipment || undefined,
    notaFiscal: record.nota_fiscal || undefined,
    condicao: record.condicao as Condition || undefined,
    quantidadeCota: record.quantidade_cota ? Number(record.quantidade_cota) : undefined,
    tipoCota: record.tipo_cota as TipoCota || undefined,
    comissaoPersonalizada: record.comissao_personalizada ? Number(record.comissao_personalizada) : undefined,
    observacao: record.observacao || undefined,
    recebidoGerente: Boolean(record.recebido_gerente)
  };
}

function mapSaleToPB(sale: Partial<Sale>) {
  const data: Record<string, any> = {};
  if (sale.marca !== undefined) data.marca = sale.marca;
  if (sale.data !== undefined) data.data = sale.data;
  if (sale.cliente !== undefined) data.cliente = sale.cliente;
  if (sale.valor !== undefined) data.valor = sale.valor;
  if (sale.vendedor !== undefined) data.vendedor = sale.vendedor;
  if (sale.eventoSyonet !== undefined) data.evento_syonet = sale.eventoSyonet;
  if (sale.equipamento !== undefined) data.equipamento = sale.equipamento;
  if (sale.notaFiscal !== undefined) data.nota_fiscal = sale.notaFiscal;
  if (sale.condicao !== undefined) data.condicao = sale.condicao;
  if (sale.quantidadeCota !== undefined) data.quantidade_cota = sale.quantidadeCota;
  if (sale.tipoCota !== undefined) data.tipo_cota = sale.tipoCota;
  if (sale.comissaoPersonalizada !== undefined) data.comissao_personalizada = sale.comissaoPersonalizada;
  if (sale.observacao !== undefined) data.observacao = sale.observacao;
  if (sale.recebidoGerente !== undefined) data.recebido_gerente = sale.recebidoGerente;
  return data;
}

// --- SALES CRUD ---
export async function fetchSales(): Promise<Sale[]> {
  const records = await pb.collection('sales').getFullList({
    sort: '-data'
  });
  return records.map(mapSaleFromPB);
}

export async function createSale(sale: Omit<Sale, 'id' | 'recebidoGerente'> & { id?: string }): Promise<Sale> {
  const payload = {
    ...mapSaleToPB(sale),
    recebido_gerente: false
  };
  const record = await pb.collection('sales').create(payload);
  return mapSaleFromPB(record);
}

export async function updateSale(sale: Sale): Promise<Sale> {
  const payload = mapSaleToPB(sale);
  const record = await pb.collection('sales').update(sale.id, payload);
  return mapSaleFromPB(record);
}

export async function toggleRecebidoGerente(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  await pb.collection('sales').update(id, { recebido_gerente: newStatus });
  return newStatus;
}

export async function deleteSale(id: string): Promise<void> {
  await pb.collection('sales').delete(id);
}

// --- GOALS CRUD ---
export async function fetchGoals(): Promise<Goal[]> {
  const records = await pb.collection('goals').getFullList();
  const fetchedGoals: Goal[] = records.map(r => ({
    vendedor: r.vendedor as Seller,
    equipamento: r.equipamento as Equipment,
    meta: Number(r.meta || 0)
  }));

  return INITIAL_GOALS.map(initial => {
    const found = fetchedGoals.find(f => f.vendedor === initial.vendedor && f.equipamento === initial.equipamento);
    return found || initial;
  });
}

export async function updateGoal(vendedor: Seller, equipamento: Equipment, meta: number): Promise<void> {
  try {
    const existing = await pb.collection('goals').getFirstListItem(
      pb.filter('vendedor = {:vendedor} && equipamento = {:equipamento}', { vendedor, equipamento })
    );
    await pb.collection('goals').update(existing.id, { meta });
  } catch (err: any) {
    if (err.status === 404) {
      await pb.collection('goals').create({ vendedor, equipamento, meta });
    } else {
      throw err;
    }
  }
}

// --- COMPANY GOALS CRUD ---
export async function fetchCompanyGoals(): Promise<CompanyGoal[]> {
  const records = await pb.collection('company_goals').getFullList();
  const fetched: CompanyGoal[] = records.map(r => ({
    equipamento: r.equipamento as Equipment,
    meta: Number(r.meta || 0)
  }));

  return INITIAL_COMPANY_GOALS.map(initial => {
    const found = fetched.find(f => f.equipamento === initial.equipamento);
    return found || initial;
  });
}

export async function updateCompanyGoal(equipamento: Equipment, meta: number): Promise<void> {
  try {
    const existing = await pb.collection('company_goals').getFirstListItem(
      pb.filter('equipamento = {:equipamento}', { equipamento })
    );
    await pb.collection('company_goals').update(existing.id, { meta });
  } catch (err: any) {
    if (err.status === 404) {
      await pb.collection('company_goals').create({ equipamento, meta });
    } else {
      throw err;
    }
  }
}

export async function saveAllGoals(companyGoals: CompanyGoal[], goals: Goal[]): Promise<void> {
  for (const cg of companyGoals) {
    await updateCompanyGoal(cg.equipamento as Equipment, cg.meta);
  }
  for (const g of goals) {
    await updateGoal(g.vendedor, g.equipamento as Equipment, g.meta);
  }
}

// --- KITS CRUD ---
export async function fetchKits(): Promise<Kit[]> {
  const records = await pb.collection('kits').getFullList({
    sort: '-data'
  });
  return records.map(r => ({
    id: r.id,
    data: r.data,
    eventoSyonet: r.evento_syonet,
    cliente: r.cliente,
    notaFiscal: r.nota_fiscal,
    vendedor: r.vendedor as Seller
  }));
}

export async function createKit(kit: Omit<Kit, 'id'>): Promise<Kit> {
  const record = await pb.collection('kits').create({
    data: kit.data,
    evento_syonet: kit.eventoSyonet,
    cliente: kit.cliente,
    nota_fiscal: kit.notaFiscal,
    vendedor: kit.vendedor
  });
  return {
    id: record.id,
    data: record.data,
    eventoSyonet: record.evento_syonet,
    cliente: record.cliente,
    notaFiscal: record.nota_fiscal,
    vendedor: record.vendedor as Seller
  };
}

export async function deleteKit(id: string): Promise<void> {
  await pb.collection('kits').delete(id);
}

// --- PRODUCTS (EQUIPAMENTOS) CRUD ---
export async function fetchProducts(): Promise<ProductItem[]> {
  try {
    const records = await pb.collection('products').getFullList({ sort: 'name' });
    if (records.length > 0) {
      return records.map(r => ({ id: r.id, name: r.name, active: r.active ?? true }));
    }
  } catch (err) {
    console.warn('Failed to fetch products from PB, using defaults:', err);
  }
  return EQUIPMENTS.map((name, i) => ({ id: `default-${i}`, name, active: true }));
}

export async function createProduct(name: string): Promise<ProductItem> {
  const record = await pb.collection('products').create({ name: name.trim(), active: true });
  return { id: record.id, name: record.name, active: record.active };
}

export async function deleteProduct(id: string): Promise<void> {
  await pb.collection('products').delete(id);
}

// --- CATEGORIES (MARCAS) CRUD ---
export async function fetchCategories(): Promise<CategoryItem[]> {
  try {
    const records = await pb.collection('categories').getFullList({ sort: 'name' });
    if (records.length > 0) {
      return records.map(r => ({ id: r.id, name: r.name, active: r.active ?? true }));
    }
  } catch (err) {
    console.warn('Failed to fetch categories from PB, using defaults:', err);
  }
  return MARCAS.map((name, i) => ({ id: `default-${i}`, name, active: true }));
}

export async function createCategory(name: string): Promise<CategoryItem> {
  const record = await pb.collection('categories').create({ name: name.trim(), active: true });
  return { id: record.id, name: record.name, active: record.active };
}

export async function deleteCategory(id: string): Promise<void> {
  await pb.collection('categories').delete(id);
}

// --- SELLERS (VENDEDORES) CRUD ---
export async function fetchSellers(): Promise<SellerItem[]> {
  try {
    const records = await pb.collection('sellers').getFullList({ sort: 'name' });
    if (records.length > 0) {
      return records.map(r => ({ id: r.id, name: r.name, email: r.email, active: r.active ?? true }));
    }
  } catch (err) {
    console.warn('Failed to fetch sellers from PB, using defaults:', err);
  }
  return SELLERS.map((name, i) => ({ id: `default-${i}`, name, active: true }));
}

export async function createSeller(name: string, email?: string): Promise<SellerItem> {
  const record = await pb.collection('sellers').create({ name: name.trim(), email: email?.trim(), active: true });
  return { id: record.id, name: record.name, email: record.email, active: record.active };
}

export async function deleteSeller(id: string): Promise<void> {
  await pb.collection('sellers').delete(id);
}
