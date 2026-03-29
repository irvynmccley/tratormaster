import { Equipment, Seller, Condition, Marca } from './types';

export const EQUIPMENTS: string[] = [
  'Retro 3CX (BHL)',
  'ESCAVADEIRA (EXC)',
  'PÁ CARREGADEIRA (WLS)',
  'MANIPULADOR (TH)',
  'MINI ESCAVADEIRA (MIN)',
  'MINI CARREGADEIRA (SSL)',
  'ROLO COMPACTADOR (CPTN)',
  'Consórcio'
];

export const SELLERS: Seller[] = ['Anderson', 'Carlos', 'Thalita', 'Diretoria', 'Outros'];

export const CONDITIONS: Condition[] = [
  'Financiamento - Banco de Fabrica',
  'Financiamento - Banco do Cliente',
  'Recurso Próprio',
  'Consórcio'
];

export const MARCAS: Marca[] = ['JCB', 'EP', 'Consórcio', 'Clark'];

export const INITIAL_GOALS = SELLERS.flatMap(seller => 
  EQUIPMENTS.map(equip => ({
    vendedor: seller,
    equipamento: equip,
    meta: 5 // Default meta
  }))
);
