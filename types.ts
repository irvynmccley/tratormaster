export type Equipment = 
  | 'Retro 3CX (BHL)'
  | 'ESCAVADEIRA (EXC)'
  | 'PÁ CARREGADEIRA (WLS)'
  | 'MANIPULADOR (TH)'
  | 'MINI ESCAVADEIRA (MIN)'
  | 'MINI CARREGADEIRA (SSL)'
  | 'ROLO COMPACTADOR (CPTN)'
  | 'Consórcio'
  | string;

export type Seller = 'Anderson' | 'Carlos' | 'Thalita' | 'Diretoria' | 'Outros';

export type Condition = 
  | 'Financiamento - Banco de Fabrica'
  | 'Financiamento - Banco do Cliente'
  | 'Recurso Próprio'
  | 'Consórcio'
  | 'Financiamento' // For backwards compatibility
  | 'Recurso Proprio'; // For backwards compatibility

export type Marca = 'JCB' | 'EP' | 'Consórcio' | 'Clark';

export interface Sale {
  id: string;
  marca: Marca;
  data: string;
  cliente: string;
  valor: number;
  vendedor: Seller;
  
  // JCB, EP, Clark
  eventoSyonet?: string;
  equipamento?: string;
  notaFiscal?: string;
  
  // JCB only
  condicao?: Condition;
  
  // Consórcio only
  quantidadeCota?: number;
  
  // Outros only
  observacao?: string;
  
  recebidoGerente?: boolean;
}

export interface Goal {
  vendedor: Seller;
  equipamento: string;
  meta: number;
}

export interface CompanyGoal {
  equipamento: string;
  meta: number;
}

export interface Kit {
  id: string;
  data: string;
  eventoSyonet: string;
  cliente: string;
  notaFiscal: string;
  vendedor: Seller;
}
