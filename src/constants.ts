import { Equipment, Seller, Condition, Marca } from './types';

export const EQUIPMENTS: string[] = [
  'BHL- Retro 3CX',
  'EXC -ESCAVADEIRA',
  'WLS -Pá carregadeira',
  'TH -MANIPULADOR',
  'MIN -MINI ESCAVADEIRA',
  'SSL-MINI CARREGADEIRA',
  'CPTN-ROLO COMPACTADOR',
  'Consórcio'
];

export const SELLERS: Seller[] = ['Anderson', 'Carlos', 'Thalita'];

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
