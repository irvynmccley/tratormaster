export type Equipment = 
  | 'BHL- Retro 3CX'
  | 'EXC -ESCAVADEIRA'
  | 'WLS -Pá carregadeira'
  | 'TH -MANIPULADOR'
  | 'MIN -MINI ESCAVADEIRA'
  | 'SSL-MINI CARREGADEIRA'
  | 'CPTN-ROLO COMPACTADOR'
  | 'Consórcio'
  | string;

export type Seller = 'Anderson' | 'Carlos' | 'Thalita';

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
  
  recebidoGerente?: boolean;
}

export interface Goal {
  vendedor: Seller;
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
