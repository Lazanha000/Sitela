/**
 * Estado do mundo (spec §4.1). A interface nunca é a fonte da verdade:
 * ela apenas exibe este objeto, que é serializável (JSON) e versionado.
 */
import type { RngState } from '../random/rng';
import type { IndicatorId } from './indicators';
import type { Contribution } from '../causality/ledger';

/** Natureza da informação (spec §2.3). */
export type Provenance =
  | 'fato'
  | 'observado'
  | 'estimativa'
  | 'abstracao'
  | 'contrafactual'
  | 'projecao';

export type RegionId = 'N' | 'NE' | 'CO' | 'SE' | 'S';
export type GroupId = 'baixa_renda' | 'trabalhadores' | 'alta_renda' | 'agro' | 'servidores';
export type BlocId = 'ideologicos' | 'centrao' | 'centro' | 'oposicao';
export type House = 'camara' | 'senado';
export type OrgId = 'economia' | 'cidadania' | 'saude' | 'infraestrutura' | 'meio_ambiente' | 'minas_energia' | 'gestao';

/** Fatores de opinião: cada um é um "estoque" que se ajusta com defasagem. */
export type OpinionFactor =
  | 'inflacao'
  | 'emprego'
  | 'renda'
  | 'combustiveis'
  | 'servicos'
  | 'instituicoes'
  | 'ambiente'
  | 'eventos'
  | 'campanha';

export interface CampaignMeta {
  campaignId: string;
  name: string;
  scenarioId: string;
  dataPackVersion: string;
  engineVersion: string;
  schemaVersion: number;
  seed: string;
  difficulty: 'normal' | 'dificil';
  /** Metadado real (não é data do jogo). */
  createdAtReal: string;
}

export interface GroupState {
  id: GroupId;
  /**
   * Estoques de opinião por fonte, chave `fator:fonte` (ex.: `renda:pol:pec_emergencia`).
   * Cada um converge ao seu alvo com a velocidade do fator — permite
   * atribuir exatamente cada variação de avaliação a uma causa.
   */
  stocks: Record<string, number>;
  /** Saldo de base (identidade política pré-existente, abstração). */
  base: number;
  /** Parcela "regular" (nem aprova nem reprova), em %. */
  regular: number;
}

export interface RegionState {
  id: RegionId;
  /** Estoque regional de eventos locais (enchentes, seca), pontos de saldo. */
  eventStock: number;
  governadores: {
    alinhamento: number; // 0..100
    cooperacao: number; // 0..100
    necessidadeFiscal: number; // 0..100
  };
}

export interface BlocState {
  id: BlocId;
  seats: Record<House, number>;
  relacao: number; // 0..100 com o Executivo
  disciplina: number; // 0..1
}

export type BillType = 'MP' | 'PL' | 'PLP' | 'PEC';

export type BillStage =
  | 'comissao_mista'
  | 'comissoes_camara'
  | 'ccj_camara'
  | 'comissao_especial'
  | 'plenario_camara'
  | 'comissoes_senado'
  | 'ccj_senado'
  | 'plenario_senado'
  | 'sancao'
  | 'promulgacao'
  | 'aprovado'
  | 'rejeitado'
  | 'caducou'
  | 'retirado';

export type Tactic = 'emendas' | 'ajustar_texto' | 'dialogo' | 'compromisso_publico' | 'urgencia';

export interface Bill {
  id: string;
  policyId: string;
  type: BillType;
  stage: BillStage;
  monthsInStage: number;
  startedTurn: number;
  /** MP: turno-limite de vigência (120 dias ≈ 4 turnos). */
  expiresTurn?: number;
  urgencia: boolean;
  votacaoSolicitada: boolean;
  /** Bônus (logit) acumulado por bancada a partir de negociações. */
  apoioNegociado: Partial<Record<BlocId, number>>;
  /** Diálogos iniciados no mês: só fazem efeito no mês seguinte. */
  dialogoPendente: number;
  taticasUsadas: Tactic[];
  compromissoPublico: boolean;
  /** Fração do texto original mantida (concessões reduzem eficácia). */
  eficaciaTexto: number;
  custoTexto: number;
  votos: VoteRecord[];
  origem: 'jogador' | 'historico';
}

export interface VoteRecord {
  turn: number;
  house: House;
  turno: 1 | 2;
  sim: number;
  nao: number;
  ausentes: number;
  exigido: number;
  regra: string;
  aprovado: boolean;
  porBancada: Record<BlocId, { sim: number; nao: number; ausentes: number }>;
}

export type PolicyStatus =
  | 'tramitando'
  | 'preparacao'
  | 'execucao'
  | 'suspensa'
  | 'encerrada'
  | 'rejeitada';

export interface ActivePolicy {
  id: string; // instância
  defId: string;
  instrument: BillType | 'decreto' | 'ato_gestao';
  status: PolicyStatus;
  launchedTurn: number;
  /** Turno em que entra em execução (após preparação/aprovação). */
  executionStartTurn?: number;
  endTurn?: number;
  billId?: string;
  eficacia: number;
  custoFator: number;
  /** Última taxa de execução (0..1) e seus motivos. */
  lastExecution: number;
  textoAjustado: boolean;
  executionNotes: string[];
  spentTotal: number;
  monthsExecuted: number;
}

export interface Challenge {
  id: string;
  policyInstanceId: string;
  autor: string;
  fundamento: string;
  stage: 'ajuizada' | 'liminar_concedida' | 'liminar_negada' | 'decidida';
  filedTurn: number;
  monthsInStage: number;
  resultado?: 'mantida' | 'anulada' | 'parcial';
  descumprida: boolean;
}

export interface DelayedEffect {
  id: string;
  dueTurn: number;
  target:
    | { kind: 'indicator'; ind: IndicatorId }
    | { kind: 'opinion'; factor: OpinionFactor; groups: Partial<Record<GroupId, number>> }
    | { kind: 'region'; region: RegionId }
    | { kind: 'gap' };
  delta: number;
  causeId: string;
  causeLabel: string;
  causeKind: 'politica' | 'evento' | 'choque_externo' | 'ator';
  createdTurn: number;
  /** Saturação: efeitos positivos rendem menos perto deste nível. */
  saturaEm?: number;
}

export interface PendingDecision {
  instanceId: string;
  eventId: string;
  turn: number;
  /** Dados de contexto do evento, congelados quando ele foi gerado. */
  context: Record<string, number | string | boolean>;
}

export interface EventRecord {
  instanceId: string;
  eventId: string;
  turn: number;
  optionId?: string;
}

export interface Candidate {
  id: 'governo' | 'oposicao' | 'terceira_via' | 'outros';
  label: string;
}

export interface ElectionRound {
  turno: 1 | 2;
  dataIso: string;
  votosValidos: Record<Candidate['id'], number>; // %
  porRegiao: Record<RegionId, Record<Candidate['id'], number>>;
  comparecimento: number; // %
  vencedor?: Candidate['id'];
}

export interface Poll {
  turn: number;
  instituto: string;
  intencao: Record<Candidate['id'], number>;
  margem: number;
}

export interface ElectionState {
  governoConcorre: boolean;
  candidatoGovernoLabel: string;
  alianca: 'ampla' | 'ideologica' | 'indefinida';
  campanhaAtiva: boolean;
  /** Efeitos de campanha acumulados (pontos) por região. */
  campanhaRegional: Record<RegionId, number>;
  tempoTV: number; // índice relativo
  polls: Poll[];
  rounds: ElectionRound[];
  resultado?: 'reeleito' | 'derrotado' | 'sucessor_eleito' | 'sucessor_derrotado';
  posturaResultado?: 'reconheceu' | 'atrasou' | 'contestou';
}

export type Editoria =
  | 'politica'
  | 'congresso'
  | 'economia'
  | 'estados'
  | 'servicos'
  | 'justica'
  | 'ambiente'
  | 'mundo'
  | 'eleicoes'
  | 'opiniao'
  | 'dados';

export interface NewsItem {
  id: string;
  turn: number;
  dataIso?: string;
  editoria: Editoria;
  tipo: 'noticia' | 'reportagem' | 'indicador' | 'editorial' | 'agenda' | 'relatorio' | 'analise';
  provenance: Provenance;
  importancia: number; // 0..10
  titulo: string;
  linha_fina: string;
  corpo: string[];
  indicadores?: IndicatorId[];
  ocorrenciaId?: string;
  coluna?: string;
}

/** Algo que aconteceu no turno — fonte das notícias e do relatório. */
export interface Ocorrencia {
  id: string;
  turn: number;
  tipo: string;
  dataIso?: string;
  importancia: number;
  provenance: Provenance;
  dados: Record<string, unknown>;
}

export interface IndicatorDelta {
  ind: IndicatorId;
  before: number;
  after: number;
  contributions: { causeId: string; label: string; kind: string; controlavel: boolean; delta: number }[];
}

export interface TurnReport {
  turn: number; // turno resolvido
  deltas: IndicatorDelta[];
  ocorrencias: Ocorrencia[];
  execucao: { policyInstanceId: string; defId: string; taxa: number; notas: string[]; gasto: number }[];
  alertas: string[];
  pendencias: string[];
}

export interface DecisionLogEntry {
  turn: number;
  descricao: string;
  acao: unknown;
}

export interface WorldState {
  meta: CampaignMeta;
  turn: number;
  status: 'em_andamento' | 'encerrada';
  rng: RngState;
  ind: Record<IndicatorId, number>;
  /** Indicadores no início do turno (antes de ações e eventos do mês). */
  indInicioTurno: Record<IndicatorId, number>;
  /** Série histórica por turno (valor no fechamento de cada turno). */
  serie: Partial<Record<IndicatorId, (number | null)[]>>;
  econ: {
    atividadeHist: number[]; // índice mensal, inclui 2021
    ipcaMesHist: number[]; // % ao mês, inclui 2021
    selicHist: number[]; // % a.a. no fim de cada mês, inclui 2021
    expectHist: number[];
    cambioHist: number[];
    refinaria: number; // índice de preço Petrobras (dez/21 = 100)
    defasagemCombustivel: number; // paridade − refinaria (pontos do índice)
    fedJuros: number; // juro básico dos EUA (exógeno)
    fedTaxaNivel: number; // nível de tributos federais sobre combustíveis (1 = base)
    icmsNivel: number; // nível de ICMS sobre combustíveis (1 = base)
    petrobrasAjuste: number; // velocidade de repasse (0..1)
    /** Contribuição atual de cada política às alavancas (para calcular variações). */
    alavancas: Record<string, { alavanca: 'fedTaxa' | 'icmsNivel' | 'petrobrasAjuste'; valor: number; label: string }>;
    desmatamentoHist: number[]; // km² por mês
    fiscalImpulso: number; // impulso do mês (p.p. do hiato), para relatório
    ipcaComposicao: { label: string; kind: string; value: number }[];
    pibNominal2021: number;
    compressaoCusteio: number; // 0..1 no último mês
  };
  fiscal: {
    teto: number; // R$ bi (limite anual)
    discricionarioAno: number; // dotação discricionária anual
    discricionarioGasto: number; // executado no ano
    bloqueio: number; // R$ bi bloqueados
    foraDoTeto: number; // créditos extraordinários / exceções aprovadas no ano
    excecaoTetoAprovada: number; // R$ bi de espaço criado por PEC
    despesaTetoAno: number; // executado no ano sujeito ao teto
    pibNominalAnterior: number;
    /** Receitas/despesas pontuais do mês (eventos, emendas), consumidas no fechamento. */
    extrasMes: { label: string; causeId: string; valor: number; categoria: 'discricionaria' | 'fora_teto' | 'receita' }[];
  };
  groups: Record<GroupId, GroupState>;
  regions: Record<RegionId, RegionState>;
  blocs: Record<BlocId, BlocState>;
  presidentes: Record<House, { relacao: number }>;
  bills: Bill[];
  policies: ActivePolicy[];
  /** Deslocamento de capacidade por órgão (somado à base e à média geral). */
  orgs: Record<OrgId, number>;
  /** Rótulos legíveis das fontes de opinião (`fator:fonte`). */
  opinionLabels: Record<string, string>;
  challenges: Challenge[];
  pendingEffects: DelayedEffect[];
  pendingDecisions: PendingDecision[];
  eventHistory: EventRecord[];
  flags: Record<string, number | boolean | string>;
  election: ElectionState;
  news: NewsItem[];
  reports: TurnReport[];
  /** Ações tomadas no turno corrente (com efeitos imediatos já aplicados). */
  currentActions: DecisionLogEntry[];
  log: DecisionLogEntry[];
  /** Contribuições registradas durante o turno corrente (ações imediatas). */
  pendingLedger: Contribution[];
  /** Ocorrências geradas por ações no turno corrente. */
  pendingOcorrencias: Ocorrencia[];
  counters: { seq: number };
  migrations: string[];
}
