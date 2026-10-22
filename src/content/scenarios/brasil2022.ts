/**
 * Cenário "Brasil, 1º de janeiro de 2022". Monta o estado inicial a partir
 * do pacote histórico e calibra a opinião para reproduzir o ponto de
 * partida (≈ 22% ótimo/bom, ≈ 53% ruim/péssimo — estimativa).
 */
import { seedRng } from '../../simulation/random/rng';
import { ALL_INDICATORS, type IndicatorId } from '../../simulation/state/indicators';
import type { BlocId, GroupId, OrgId, RegionId, WorldState } from '../../simulation/state/types';
import { ENGINE_VERSION, SCHEMA_VERSION } from '../../simulation/version';
import { BLOCS, BLOC_IDS, GROUPS, GROUP_IDS, ORGS, REGIONS, REGION_IDS } from '../actors/actors2022';
import { ATIVIDADE_2021, DATA_PACK_ID, DATA_PACK_VERSION, DESMATAMENTO_BASE, IPCA_2021, SELIC_2021 } from '../historical-data/pack2022';
import { POLICY_BY_ID } from '../policies/policies2022';
import { calibrateInitialOpinion, nationalOpinion } from '../../systems/opinion/opinion';
import { CAPACIDADE_INICIAL } from '../../systems/executive/policies';
import { projetarTeto, TETO_2022, DISCRICIONARIO_ANO } from '../../systems/budget/fiscal';
import { SERIE_OFFSET } from '../../simulation/engine/context';

export const SCENARIO_ID = 'brasil-2022-01';

/** Séries de 2021 para gráficos e defasagens (observadas, aproximadas). */
const PREHIST: Partial<Record<IndicatorId, number[]>> = {
  ipca_mes: IPCA_2021,
  ipca_12m: [4.56, 5.2, 6.1, 6.76, 8.06, 8.35, 8.99, 9.68, 10.25, 10.67, 10.74, 10.06],
  selic: SELIC_2021,
  desemprego: [14.2, 14.4, 14.7, 14.7, 14.6, 14.1, 13.7, 13.2, 12.6, 12.1, 11.6, 11.1],
  cambio: [5.36, 5.42, 5.65, 5.55, 5.3, 5.03, 5.16, 5.26, 5.28, 5.54, 5.56, 5.58],
  brent: [55, 62, 65, 65, 68, 73, 75, 71, 74, 84, 81, 74],
};

export interface NewCampaignOptions {
  seed?: string;
  name?: string;
  difficulty?: 'normal' | 'dificil';
  campaignId?: string;
  createdAtReal?: string;
}

export function buildInitialState(opts: NewCampaignOptions = {}): WorldState {
  const seed = opts.seed ?? 'brasil-2022';
  const ind = Object.fromEntries(ALL_INDICATORS.map((k) => [k, 0])) as Record<IndicatorId, number>;
  Object.assign(ind, {
    atividade: ATIVIDADE_2021[11],
    pib_var_12m: 1.6,
    hiato: -1.0,
    ipca_mes: 0.73,
    ipca_12m: 10.06,
    expect_ipca: 5.0,
    selic: 9.25,
    cambio: 5.58,
    desemprego: 11.1,
    brent: 74,
    commodities: 98,
    combustivel: 100,
    confianca_empresarial: 98,
    risco_pais: 218,
    receita_mes: 140,
    despesa_mes: 135,
    primario_mes: 5,
    juros_mes: 42,
    divida_bruta: 6967,
    pib_nominal: 8680,
    divida_pib: (6967 / 8680) * 100,
    pc_apoio_social: 22,
    pc_confianca_aliados: 55,
    pc_negociacao: 60,
    pc_credibilidade: 45,
    pc_coesao: (BLOCS.ideologicos.relacao * BLOCS.ideologicos.seats.camara + BLOCS.centrao.relacao * BLOCS.centrao.seats.camara) / (BLOCS.ideologicos.seats.camara + BLOCS.centrao.seats.camara),
    pc_mobilizacao: 60,
    polarizacao: 70,
    confianca_eleitoral: 72,
    tensao_institucional: 55,
    relacao_stf: 32,
    saude_fila: 100,
    fiscalizacao_amb: 50,
    desmatamento_12m: DESMATAMENTO_BASE.reduce((a, b) => a + b, 0),
    capacidade_adm: CAPACIDADE_INICIAL,
    risco_fertilizantes: 30,
  } satisfies Partial<Record<IndicatorId, number>>);

  const serie: WorldState['serie'] = {};
  for (const k of ALL_INDICATORS) {
    const pre = PREHIST[k];
    serie[k] = pre ? [...pre] : Array(SERIE_OFFSET).fill(null);
  }

  const groups = Object.fromEntries(GROUP_IDS.map((g) => [g, { id: g, stocks: {}, base: 0, regular: 25 }])) as unknown as Record<GroupId, WorldState['groups'][GroupId]>;
  const regions = Object.fromEntries(REGION_IDS.map((r) => [r, { id: r, eventStock: 0, governadores: { ...REGIONS[r].governadores } }])) as Record<RegionId, WorldState['regions'][RegionId]>;
  const blocs = Object.fromEntries(BLOC_IDS.map((b) => [b, { id: b, seats: { ...BLOCS[b].seats }, relacao: BLOCS[b].relacao, disciplina: BLOCS[b].disciplina }])) as Record<BlocId, WorldState['blocs'][BlocId]>;

  const s: WorldState = {
    meta: {
      campaignId: opts.campaignId ?? `camp-${seed}`,
      name: opts.name ?? 'Brasil 2022',
      scenarioId: SCENARIO_ID,
      dataPackVersion: `${DATA_PACK_ID}@${DATA_PACK_VERSION}`,
      engineVersion: ENGINE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      seed,
      difficulty: opts.difficulty ?? 'normal',
      createdAtReal: opts.createdAtReal ?? '1970-01-01T00:00:00.000Z',
    },
    turn: 0,
    status: 'em_andamento',
    rng: seedRng(seed),
    ind,
    indInicioTurno: { ...ind },
    serie,
    econ: {
      atividadeHist: [...ATIVIDADE_2021],
      ipcaMesHist: [...IPCA_2021],
      selicHist: [...SELIC_2021],
      expectHist: [3.3, 3.6, 3.9, 4.1, 4.4, 4.6, 4.8, 5.0, 5.2, 5.0, 5.0, 5.0],
      cambioHist: [...PREHIST.cambio!],
      refinaria: 100,
      defasagemCombustivel: 0,
      fedJuros: 0.25,
      fedTaxaNivel: 1,
      icmsNivel: 1,
      petrobrasAjuste: 0.35,
      alavancas: {},
      desmatamentoHist: [...DESMATAMENTO_BASE],
      fiscalImpulso: 0,
      ipcaComposicao: [],
      pibNominal2021: 8680,
      compressaoCusteio: 0,
    },
    fiscal: {
      teto: TETO_2022,
      discricionarioAno: DISCRICIONARIO_ANO,
      discricionarioGasto: 0,
      bloqueio: 0,
      foraDoTeto: 0,
      excecaoTetoAprovada: 0,
      despesaTetoAno: 0,
      pibNominalAnterior: 8680,
      extrasMes: [],
    },
    groups,
    regions,
    blocs,
    presidentes: { camara: { relacao: 72 }, senado: { relacao: 50 } },
    bills: [],
    policies: [],
    orgs: Object.fromEntries(Object.keys(ORGS).map((o) => [o, 0])) as Record<OrgId, number>,
    opinionLabels: {},
    challenges: [],
    pendingEffects: [],
    pendingDecisions: [],
    eventHistory: [],
    flags: {},
    election: {
      governoConcorre: true,
      candidatoGovernoLabel: 'Candidatura do governo',
      alianca: 'indefinida',
      campanhaAtiva: false,
      campanhaRegional: { N: 0, NE: 0, CO: 0, SE: 0, S: 0 },
      tempoTV: 1,
      polls: [],
      rounds: [],
    },
    news: [],
    reports: [],
    currentActions: [],
    log: [],
    pendingLedger: [],
    pendingOcorrencias: [],
    counters: { seq: 0 },
    migrations: [],
  };

  // Opinião calibrada no ponto de partida.
  const perfil = Object.fromEntries(GROUP_IDS.map((g) => [g, GROUPS[g].perfilInicial])) as Record<GroupId, number>;
  calibrateInitialOpinion(s, -31, perfil);
  const op = nationalOpinion(s);
  s.ind.aval_saldo = op.net;
  s.ind.aval_positiva = op.pos;
  s.ind.aval_negativa = op.neg;
  s.ind.pc_apoio_social = Math.max(0, 50 + 0.9 * op.net);
  s.ind.coop_federativa = REGION_IDS.reduce((a, r) => a + REGIONS[r].pop * s.regions[r].governadores.cooperacao, 0);
  s.ind.teto_folga = TETO_2022 - projetarTeto(s);

  // Proposições já em tramitação no início de 2022 (autoria parlamentar).
  const iniciais: { defId: string; type: 'PEC' | 'PL'; stage: 'ccj_senado' | 'comissoes_senado' }[] = [
    { defId: 'pec110_tributaria', type: 'PEC', stage: 'ccj_senado' },
    { defId: 'desestatizacao_correios', type: 'PL', stage: 'comissoes_senado' },
  ];
  for (const x of iniciais) {
    const polId = `pol-hist-${x.defId}`;
    const billId = `pl-hist-${x.defId}`;
    s.bills.push({ id: billId, policyId: x.defId, type: x.type, stage: x.stage, monthsInStage: 0, startedTurn: -6, urgencia: false, votacaoSolicitada: false, apoioNegociado: {}, dialogoPendente: 0, taticasUsadas: [], compromissoPublico: false, eficaciaTexto: 1, custoTexto: 1, votos: [], origem: 'historico' });
    s.policies.push({ id: polId, defId: x.defId, instrument: x.type, status: 'tramitando', launchedTurn: -6, billId, eficacia: 1, custoFator: 1, lastExecution: 0, textoAjustado: false, executionNotes: [], spentTotal: 0, monthsExecuted: 0 });
    void POLICY_BY_ID[x.defId];
  }
  s.indInicioTurno = { ...s.ind };
  return s;
}
