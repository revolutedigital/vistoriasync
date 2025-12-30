export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'GERENTE' | 'OPERADOR';
  active: boolean;
  createdAt: string;
}

export interface Imobiliaria {
  id: string;
  nome: string;
  nomeKsi: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cidade?: string;
  ativo: boolean;
  diaPagamento: number;
  formaPagamento: 'BOLETO' | 'PIX' | 'TRANSFERENCIA';
  createdAt: string;
  updatedAt: string;
}

export interface Vistoriador {
  id: string;
  nome: string;
  nomeKsi: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cidade?: string;
  chavePix?: string;
  ativo: boolean;
  portalToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TipoServico {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

export interface FaixaMetragem {
  id: string;
  nome: string;
  metrosMin: number;
  metrosMax: number;
  multiplicador: number;
  ordem: number;
}

export interface TabelaPreco {
  id: string;
  imobiliariaId: string;
  tipoServicoId: string;
  faixaMetragemId?: string;
  valorBase: number;
  valorMobiliado?: number;
  valorSemiMob?: number;
  ativo: boolean;
  tipoServico?: TipoServico;
  faixaMetragem?: FaixaMetragem;
}

export interface Fechamento {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  status: StatusFechamento;
  dataImportacao?: string;
  dataEnvioVist?: string;
  dataEnvioImob?: string;
  dataFinalizado?: string;
  totalVistorias: number;
  totalReceber: number;
  totalPagar: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    vistorias: number;
    faturas: number;
    pagamentos?: number;
  };
}

export type StatusFechamento =
  | 'RASCUNHO'
  | 'IMPORTADO'
  | 'CALCULADO'
  | 'AGUARDANDO_VISTORIADORES'
  | 'EM_REVISAO'
  | 'AGUARDANDO_IMOBILIARIAS'
  | 'FATURADO'
  | 'FINALIZADO';

export interface Vistoria {
  id: string;
  fechamentoId: string;
  imobiliariaId: string;
  vistoriadorId: string;
  tipoServicoId: string;
  idKsi: string;
  numeroContrato?: string;
  endereco: string;
  cidade: string;
  areaInformada?: number;
  areaAferida?: number;
  areaFaturar: number;
  tipoMobilia: 'NAO' | 'SEMI' | 'SIM';
  dataAgenda?: string;
  dataFinalizado?: string;
  valorServico: number;
  valorVistoriador: number;
  status: StatusVistoria;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
  fechamento?: Fechamento;
  imobiliaria?: Imobiliaria;
  vistoriador?: Vistoriador;
  tipoServico?: TipoServico;
  _count?: {
    contestacoes: number;
  };
}

export type StatusVistoria =
  | 'IMPORTADA'
  | 'CALCULADA'
  | 'CONTESTADA'
  | 'REVISADA'
  | 'APROVADA'
  | 'FATURADA';

export interface Fatura {
  id: string;
  fechamentoId: string;
  imobiliariaId: string;
  numero: string;
  valor: number;
  dataVencimento: string;
  asaasPaymentId?: string;
  asaasBoletoUrl?: string;
  asaasPixQrCode?: string;
  asaasPixCopiaECola?: string;
  status: StatusFatura;
  dataPagamento?: string;
  valorPago?: number;
  createdAt: string;
  updatedAt: string;
  imobiliaria?: Imobiliaria;
}

export type StatusFatura = 'PENDENTE' | 'ENVIADA' | 'VENCIDA' | 'PAGA' | 'CANCELADA';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ImportResult {
  total: number;
  importadas: number;
  erros: Array<{ linha: number; erro: string }>;
  imobiliariasNovas: string[];
  vistoriadoresNovos: string[];
}

export interface CalculoResult {
  totalVistorias: number;
  totalReceber: number;
  totalPagar: number;
  calculadas: number;
  erros: Array<{ vistoriaId: string; erro: string }>;
}
