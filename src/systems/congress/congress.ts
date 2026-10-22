/**
 * Congresso Nacional (spec §7). Câmara e Senado distintos; tramitação por
 * tipo de matéria; pauta depende dos presidentes das Casas; votos por
 * bancada com disciplina imperfeita; negociação com custos.
 *
 * Regras de votação (CF): PL/MP maioria simples com quórum de maioria
 * absoluta; PLP maioria absoluta (257/41); PEC 3/5 em dois turnos em cada
 * Casa (308/49). Simplificações: dois turnos da PEC no mesmo mês; sem
 * vetos e emendas de plenário na v0.1 (ver docs/LIMITACOES.md).
 */
import { C } from '../../simulation/causality/ledger';
import { clamp, type Ctx } from '../../simulation/engine/context';
import type { Bill, BillStage, BillType, BlocId, House, Tactic, VoteRecord, WorldState } from '../../simulation/state/types';
import { BLOCS, BLOC_IDS } from '../../content/actors/actors2022';
import { POLICY_BY_ID, isoMonthToTurn, type PolicyDef } from '../../content/policies/policies2022';
import { applySignals, policyCause } from '../executive/policies';
import { maybeChallenge } from '../judiciary/judiciary';

interface StageDef {
  stage: BillStage;
  min: number;
}

export const STAGE_LABEL: Record<BillStage, string> = {
  comissao_mista: 'Comissão mista',
  comissoes_camara: 'Comissões da Câmara',
  ccj_camara: 'CCJ da Câmara',
  comissao_especial: 'Comissão especial (Câmara)',
  plenario_camara: 'Plenário da Câmara',
  comissoes_senado: 'Comissões do Senado',
  ccj_senado: 'CCJ do Senado',
  plenario_senado: 'Plenário do Senado',
  sancao: 'Sanção presidencial',
  promulgacao: 'Promulgação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  caducou: 'Perdeu a validade',
  retirado: 'Retirado',
};

export const BILL_TYPE_LABEL: Record<BillType, string> = {
  MP: 'Medida provisória',
  PL: 'Projeto de lei',
  PLP: 'Projeto de lei complementar',
  PEC: 'Proposta de emenda à Constituição',
};

export function stagesFor(type: BillType, casaInicial: 'camara' | 'senado' = 'camara'): StageDef[] {
  const camaraPL: StageDef[] = [{ stage: 'comissoes_camara', min: 1 }, { stage: 'plenario_camara', min: 0 }];
  const senadoPL: StageDef[] = [{ stage: 'comissoes_senado', min: 1 }, { stage: 'plenario_senado', min: 0 }];
  const camaraPEC: StageDef[] = [{ stage: 'ccj_camara', min: 1 }, { stage: 'comissao_especial', min: 1 }, { stage: 'plenario_camara', min: 0 }];
  const senadoPEC: StageDef[] = [{ stage: 'ccj_senado', min: 1 }, { stage: 'plenario_senado', min: 0 }];
  switch (type) {
    case 'MP':
      return [{ stage: 'comissao_mista', min: 1 }, { stage: 'plenario_camara', min: 0 }, { stage: 'plenario_senado', min: 0 }, { stage: 'sancao', min: 0 }];
    case 'PL':
    case 'PLP':
      return [...(casaInicial === 'camara' ? [...camaraPL, ...senadoPL] : senadoPL), { stage: 'sancao', min: 0 }];
    case 'PEC':
      return [...(casaInicial === 'camara' ? [...camaraPEC, ...senadoPEC] : [...senadoPEC, ...camaraPEC]), { stage: 'promulgacao', min: 0 }];
  }
}

export function houseOf(stage: BillStage): House | 'mista' | null {
  if (stage === 'comissao_mista') return 'mista';
  if (['comissoes_camara', 'ccj_camara', 'comissao_especial', 'plenario_camara'].includes(stage)) return 'camara';
  if (['comissoes_senado', 'ccj_senado', 'plenario_senado'].includes(stage)) return 'senado';
  return null;
}

export const isPlenario = (st: BillStage) => st === 'plenario_camara' || st === 'plenario_senado';
export const isActiveBill = (b: Bill) => !['aprovado', 'rejeitado', 'caducou', 'retirado'].includes(b.stage);

const emCampanha = (s: WorldState) => s.turn >= 6 && s.turn <= 9;

export function requirement(type: BillType, house: House): { exigido: number; regra: string; tipo: 'maioria_simples' | 'absoluta' } {
  if (type === 'PEC') return house === 'camara' ? { exigido: 308, regra: '3/5 em dois turnos (308 votos)', tipo: 'absoluta' } : { exigido: 49, regra: '3/5 em dois turnos (49 votos)', tipo: 'absoluta' };
  if (type === 'PLP') return house === 'camara' ? { exigido: 257, regra: 'maioria absoluta (257 votos)', tipo: 'absoluta' } : { exigido: 41, regra: 'maioria absoluta (41 votos)', tipo: 'absoluta' };
  return house === 'camara' ? { exigido: 257, regra: 'maioria simples, com quórum de 257 presentes', tipo: 'maioria_simples' } : { exigido: 41, regra: 'maioria simples, com quórum de 41 presentes', tipo: 'maioria_simples' };
}

export interface LogitPart {
  label: string;
  value: number;
}

/** Disposição de uma bancada (logit) e os motivos — spec §7.2. */
export function blocDisposition(s: WorldState, bill: Bill, def: PolicyDef, b: BlocId, house: House): { logit: number; parts: LogitPart[] } {
  const B = BLOCS[b];
  const bl = s.blocs[b];
  const parts: LogitPart[] = [];
  parts.push({ label: 'Afinidade programática com a proposta', value: def.afinidade[b] + (house === 'senado' ? (def.ajusteSenado ?? 0) : 0) - 0.3 });
  parts.push({ label: 'Relação da bancada com o governo', value: (bl.relacao - 50) / 30 });
  const neg = (bill.apoioNegociado[b] ?? 0);
  if (neg !== 0) parts.push({ label: 'Negociações e concessões', value: neg });
  // Antes da eleição, votar contra pauta popular custa caro (spec §7.2).
  const pesoEleitoral = s.turn <= 9 ? 2 : 0.6;
  parts.push({ label: 'Pressão eleitoral (popularidade da pauta)', value: B.sensibilidadeEleitoral * def.popularidade * pesoEleitoral });
  const custoAnual = (def.custoMensal + def.renunciaMensal) * 12 * bill.custoTexto;
  if (custoAnual > 0) parts.push({ label: 'Custo fiscal da proposta', value: (-B.fiscalismo * custoAnual) / 80 });
  if (b === 'ideologicos' || b === 'centrao') parts.push({ label: 'Viabilidade eleitoral do governo', value: 0.02 * B.sensibilidadeEleitoral * (s.ind.aval_positiva - 28) });
  if (b === 'centro') parts.push({ label: 'Credibilidade institucional do governo', value: 0.015 * (s.ind.pc_credibilidade - 50) });
  return { logit: parts.reduce((a, p) => a + p.value, 0), parts };
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const individualP = (pBloc: number, disc: number) => clamp(0.5 + (pBloc - 0.5) * (0.6 + 0.6 * disc), 0.02, 0.98);
const presenca = (s: WorldState) => (emCampanha(s) ? 0.88 : 0.93);
/** Pautas populares andam mais rápido antes da eleição (interesse dos próprios parlamentares). */
const prioridadeEleitoral = (s: WorldState, def: PolicyDef) => (s.turn <= 9 ? 0.3 * Math.max(0, def.popularidade) : 0);

function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export interface VoteEstimate {
  house: House;
  regra: string;
  exigido: number;
  esperadoSim: number;
  faixa: [number, number];
  probAprovacao: number;
  porBancada: { bloc: BlocId; seats: number; pSim: number; leitura: string; motivos: LogitPart[] }[];
  precisao: string;
}

/** Estimativa que o governo consegue fazer (com imprecisão — spec §7.5). */
export function estimateVote(s: WorldState, bill: Bill, houseOverride?: House): VoteEstimate | null {
  const h = houseOverride ?? houseOf(bill.stage);
  if (h !== 'camara' && h !== 'senado') return null;
  const def = POLICY_BY_ID[bill.policyId];
  const req = requirement(bill.type, h);
  const pres = presenca(s);
  let E = 0;
  let V = 0;
  let presE = 0;
  const porBancada: VoteEstimate['porBancada'] = [];
  for (const b of BLOC_IDS) {
    const seats = s.blocs[b].seats[h];
    const { logit, parts } = blocDisposition(s, bill, def, b, h);
    const pB = sigmoid(logit);
    const p = individualP(pB, s.blocs[b].disciplina);
    const n = seats * pres;
    E += n * p;
    presE += n;
    const dp = p * (1 - p) * 0.3 * (0.6 + 0.6 * s.blocs[b].disciplina);
    V += n * p * (1 - p) + (n * dp) * (n * dp);
    const leitura = p > 0.75 ? 'tende a apoiar' : p > 0.55 ? 'maioria a favor' : p > 0.45 ? 'dividida' : p > 0.25 ? 'maioria contra' : 'tende a rejeitar';
    porBancada.push({ bloc: b, seats, pSim: p, leitura, motivos: parts });
  }
  const infoMult = clamp(1 + (60 - s.ind.pc_confianca_aliados) / 60, 0.8, 2.2);
  const sigma = Math.sqrt(V) * infoMult + 2;
  let prob: number;
  if (req.tipo === 'absoluta') {
    const z = (E - req.exigido + 0.5) / sigma;
    prob = normCdf(z);
    if (bill.type === 'PEC') prob = prob * clamp(prob + 0.15, 0, 1); // dois turnos
  } else {
    const d = 2 * E - presE;
    prob = normCdf(d / (2 * sigma));
  }
  const precisao = infoMult > 1.5 ? 'baixa (aliados pouco confiáveis)' : infoMult > 1.1 ? 'média' : 'boa';
  return { house: h, regra: req.regra, exigido: req.exigido, esperadoSim: E, faixa: [Math.max(0, E - 1.64 * sigma), E + 1.64 * sigma], probAprovacao: clamp(prob, 0.01, 0.99), porBancada, precisao };
}

function simulateVote(ctx: Ctx, bill: Bill, house: House, turno: 1 | 2): VoteRecord {
  const { s, rng } = ctx;
  const def = POLICY_BY_ID[bill.policyId];
  const pres = presenca(s);
  const porBancada = {} as VoteRecord['porBancada'];
  let sim = 0;
  let nao = 0;
  let aus = 0;
  for (const b of BLOC_IDS) {
    const seats = s.blocs[b].seats[house];
    const { logit } = blocDisposition(s, bill, def, b, house);
    const p = individualP(sigmoid(logit + rng.normal(0, 0.3)), s.blocs[b].disciplina);
    const present = rng.binomial(seats, pres);
    const ys = rng.binomial(present, p);
    porBancada[b] = { sim: ys, nao: present - ys, ausentes: seats - present };
    sim += ys;
    nao += present - ys;
    aus += seats - present;
  }
  const req = requirement(bill.type, house);
  const presentes = sim + nao;
  const aprovado = req.tipo === 'absoluta' ? sim >= req.exigido : presentes >= req.exigido && sim > nao;
  return { turn: s.turn, house, turno, sim, nao, ausentes: aus, exigido: req.exigido, regra: req.regra, aprovado, porBancada };
}

function stageList(bill: Bill): StageDef[] {
  return stagesFor(bill.type, POLICY_BY_ID[bill.policyId].casaInicial ?? 'camara');
}

function advance(ctx: Ctx, bill: Bill): void {
  const list = stageList(bill);
  const idx = list.findIndex((x) => x.stage === bill.stage);
  const next = list[idx + 1];
  bill.stage = next ? next.stage : 'aprovado';
  bill.monthsInStage = 0;
  bill.votacaoSolicitada = false;
  if (isPlenario(bill.stage)) ctx.emit('pronto_plenario', { billId: bill.id, defId: bill.policyId, casa: houseOf(bill.stage) }, { importancia: 4 });
}

export function createBill(ctx: Ctx, policyInstanceId: string, def: PolicyDef, type: BillType, origem: 'jogador' | 'historico' = 'jogador', stage?: BillStage): Bill {
  const list = stagesFor(type, def.casaInicial ?? 'camara');
  const bill: Bill = {
    id: ctx.id('pl'),
    policyId: def.id,
    type,
    stage: stage ?? list[0].stage,
    monthsInStage: 0,
    startedTurn: ctx.s.turn,
    expiresTurn: type === 'MP' ? ctx.s.turn + 4 : undefined,
    urgencia: false,
    votacaoSolicitada: false,
    apoioNegociado: {},
    dialogoPendente: 0,
    taticasUsadas: [],
    compromissoPublico: false,
    eficaciaTexto: 1,
    custoTexto: 1,
    votos: [],
    origem,
  };
  ctx.s.bills.push(bill);
  void policyInstanceId;
  return bill;
}

function policyOf(s: WorldState, bill: Bill) {
  return s.policies.find((p) => p.billId === bill.id);
}

/** Aprovação final: lei sancionada / EC promulgada / MP convertida. */
function finalize(ctx: Ctx, bill: Bill): void {
  const { s, L } = ctx;
  const def = POLICY_BY_ID[bill.policyId];
  const pol = policyOf(s, bill);
  bill.stage = 'aprovado';
  const cause = policyCause(def);
  L.add('pc_credibilidade', def.importancia * (bill.compromissoPublico ? 2 : 1), C.ator('vitoria_legislativa', `Vitória legislativa: ${def.nome}`));
  L.add('pc_confianca_aliados', 2, C.ator('vitoria_legislativa', `Vitória legislativa: ${def.nome}`));
  applySignals(ctx, def, def.aoAprovar);
  if (def.especial === 'excecao_teto') {
    s.fiscal.excecaoTetoAprovada += def.custoMensal * bill.custoTexto * 5;
    s.flags.estado_emergencia = true;
    if (s.flags.compromisso_fiscal) L.add('pc_credibilidade', -4, C.ator('promessa_quebrada', 'Compromisso fiscal anterior contrariado'));
  }
  if (pol) {
    pol.eficacia = bill.eficaciaTexto;
    pol.custoFator = bill.custoTexto;
    pol.textoAjustado = bill.taticasUsadas.includes('ajustar_texto');
    if (bill.type !== 'MP') {
      pol.status = 'preparacao';
      const inicioMin = def.inicioMinimo ? isoMonthToTurn(def.inicioMinimo) : 0;
      pol.executionStartTurn = Math.max(s.turn + Math.max(1, def.preparacao), inicioMin);
      maybeChallenge(ctx, pol, def);
    }
  }
  ctx.emit('lei_aprovada', { billId: bill.id, defId: def.id, nome: def.nome, tipo: bill.type, votos: bill.votos }, { importancia: 6 + def.importancia });
  void cause;
}

function reject(ctx: Ctx, bill: Bill, record: VoteRecord | null, motivo: 'votacao' | 'caducou'): void {
  const { s, L } = ctx;
  const def = POLICY_BY_ID[bill.policyId];
  bill.stage = motivo === 'caducou' ? 'caducou' : 'rejeitado';
  const pol = policyOf(s, bill);
  if (pol) {
    pol.status = motivo === 'caducou' && pol.status === 'execucao' ? 'encerrada' : 'rejeitada';
    pol.endTurn = s.turn;
  }
  const margem = record ? Math.max(0, record.exigido - record.sim) / record.exigido : 0;
  const peso = def.importancia * (bill.compromissoPublico ? 2 : 1) * (1 + margem);
  const cause = C.ator('derrota_legislativa', `Derrota legislativa: ${def.nome}`);
  if (bill.origem === 'jogador') {
    L.add('pc_credibilidade', -1.5 * peso, cause);
    L.add('pc_confianca_aliados', -2 * def.importancia, cause);
    L.add('pc_mobilizacao', -1, cause);
  }
  ctx.emit(motivo === 'caducou' ? 'mp_caducou' : 'derrota', { billId: bill.id, defId: def.id, nome: def.nome, voto: record, origem: bill.origem }, { importancia: 6 + def.importancia });
}

export function congressStep(ctx: Ctx): void {
  const { s, rng } = ctx;
  for (const bill of s.bills) {
    if (!isActiveBill(bill)) continue;
    const def = POLICY_BY_ID[bill.policyId];

    // MP: perda de validade após 120 dias.
    if (bill.type === 'MP' && bill.expiresTurn !== undefined && s.turn >= bill.expiresTurn && bill.stage !== 'sancao') {
      reject(ctx, bill, null, 'caducou');
      continue;
    }

    if (bill.stage === 'sancao' || bill.stage === 'promulgacao') {
      finalize(ctx, bill);
      continue;
    }

    const house = houseOf(bill.stage);
    if (isPlenario(bill.stage)) {
      if (bill.votacaoSolicitada) {
        const presRel = s.presidentes[house as House].relacao;
        const prio = prioridadeEleitoral(s, def);
        let pauta = 0.55 + 0.006 * (presRel - 50) + (bill.urgencia ? 0.2 : 0) - (emCampanha(s) ? 0.35 * Math.max(0, 1 - 3 * prio) : 0) + prio;
        if (bill.type === 'MP' && bill.expiresTurn !== undefined && bill.expiresTurn - s.turn <= 1) pauta += 0.3;
        if (rng.chance(clamp(pauta, 0.05, 0.95))) {
          const h = house as House;
          const v1 = simulateVote(ctx, bill, h, 1);
          bill.votos.push(v1);
          let ok = v1.aprovado;
          if (ok && bill.type === 'PEC') {
            const v2 = simulateVote(ctx, bill, h, 2);
            bill.votos.push(v2);
            ok = v2.aprovado;
          }
          const last = bill.votos[bill.votos.length - 1];
          ctx.emit('votacao', { billId: bill.id, defId: def.id, nome: def.nome, casa: h, tipo: bill.type, ...last, aprovado: ok }, { importancia: 6 + def.importancia });
          if (ok) {
            ctx.L.add('pc_confianca_aliados', 1, C.ator('votacao_vencida', 'Votação vencida'));
            advance(ctx, bill);
            // Sanção/promulgação ocorrem no mesmo mês da votação final.
            const novo = bill.stage as BillStage;
            if (novo === 'sancao' || novo === 'promulgacao') finalize(ctx, bill);
          } else {
            reject(ctx, bill, last, 'votacao');
            continue;
          }
        } else {
          bill.votacaoSolicitada = false;
          ctx.emit('pauta_adiada', { billId: bill.id, defId: def.id, nome: def.nome, casa: house, campanha: emCampanha(s) }, { importancia: 3 });
        }
      }
    } else {
      bill.monthsInStage++;
      const min = stageList(bill).find((x) => x.stage === bill.stage)?.min ?? 1;
      // Acordo de líderes pode dispensar prazos de comissão para pautas muito
      // populares em ano eleitoral (em 2022, a PEC 1/2022 foi apensada a outra
      // PEC já aprovada em comissão na Câmara).
      const atalho = bill.urgencia || prioridadeEleitoral(s, def) >= 0.25;
      // Com atalho, várias etapas de comissão podem ser vencidas no mesmo mês.
      for (let k = 0; k < (atalho ? 3 : 1); k++) {
        const h = houseOf(bill.stage);
        if (isPlenario(bill.stage) || !isActiveBill(bill) || h === null) break;
        if (bill.monthsInStage < (atalho ? 0 : min)) break;
        const presRel = h === 'senado' ? s.presidentes.senado.relacao : s.presidentes.camara.relacao;
        const est = estimateVote(s, bill, h === 'senado' ? 'senado' : 'camara');
        const apoio = est ? est.esperadoSim / (h === 'senado' ? 81 : 513) : 0.5;
        const prio = prioridadeEleitoral(s, def);
        const p = 0.45 + (bill.urgencia ? 0.25 : 0) + 0.004 * (presRel - 50) + 0.4 * (apoio - 0.5) - (emCampanha(s) ? 0.3 * Math.max(0, 1 - 3 * prio) : 0) + (def.importancia === 3 ? -0.1 : 0) + prio;
        if (!rng.chance(clamp(p, 0.05, 0.95))) break;
        advance(ctx, bill);
      }
    }
    // Diálogo maturado neste mês passa a valer nas próximas votações.
    if (bill.dialogoPendente > 0) {
      for (const b of BLOC_IDS) bill.apoioNegociado[b] = (bill.apoioNegociado[b] ?? 0) + bill.dialogoPendente;
      bill.dialogoPendente = 0;
    }
  }
}

export const TACTIC_COST: Record<Tactic, number> = { emendas: 5, ajustar_texto: 4, dialogo: 8, compromisso_publico: 3, urgencia: 6 };

export const TACTIC_LABEL: Record<Tactic, { nome: string; descricao: string }> = {
  emendas: { nome: 'Priorizar emendas e demandas regionais', descricao: 'Libera R$ 2 bi de emendas (dentro do teto, comprime outras despesas). Atrai sobretudo o Centrão. Custa credibilidade; uso repetido rende menos.' },
  ajustar_texto: { nome: 'Ajustar o texto (concessão programática)', descricao: 'Aceita a mudança negociada. Amplia apoio do centro, mas muda eficácia/custo e pode irritar a base.' },
  dialogo: { nome: 'Investir em diálogo com líderes', descricao: 'Apoio moderado em todas as bancadas, mas só faz efeito a partir do mês seguinte (tempo).' },
  compromisso_publico: { nome: 'Assumir compromisso público', descricao: 'Pressiona bancadas sensíveis à opinião. Dobra o ganho da vitória — e o custo da derrota.' },
  urgencia: { nome: 'Pedir urgência constitucional', descricao: 'Acelera comissões (PL/PLP). Irrita os presidentes das Casas.' },
};

/** Aplica uma tática de negociação; devolve mensagem de erro, se houver. */
export function applyTactic(ctx: Ctx, bill: Bill, tactic: Tactic): string | null {
  const { s, L } = ctx;
  const def = POLICY_BY_ID[bill.policyId];
  if (!isActiveBill(bill)) return 'A proposta não está mais em tramitação.';
  const custo = TACTIC_COST[tactic];
  if (s.ind.pc_negociacao < custo) return `Capacidade de negociação insuficiente (precisa de ${custo}).`;
  const usos = bill.taticasUsadas.filter((x) => x === tactic).length;
  const mult = Math.pow(0.5, usos);
  const cause = C.acao(`tatica:${tactic}`, `${TACTIC_LABEL[tactic].nome} (${def.nome})`);
  switch (tactic) {
    case 'emendas': {
      const resto = s.fiscal.discricionarioAno - s.fiscal.bloqueio - s.fiscal.discricionarioGasto;
      if (resto < 6) return 'Sem espaço discricionário para liberar emendas.';
      s.fiscal.extrasMes.push({ label: 'Emendas parlamentares liberadas em negociação', causeId: 'acao:emendas', valor: 2, categoria: 'discricionaria' });
      for (const b of BLOC_IDS) bill.apoioNegociado[b] = (bill.apoioNegociado[b] ?? 0) + 1.3 * BLOCS[b].interesseEmendas * mult;
      L.add('pc_credibilidade', -1, cause);
      s.flags.emendas_usadas = Number(s.flags.emendas_usadas ?? 0) + 1;
      break;
    }
    case 'ajustar_texto':
      if (usos > 0) return 'O texto já foi ajustado.';
      if (def.ajusteTexto.descricao === '—') return 'Não há ajuste negociável relevante para esta proposta.';
      bill.eficaciaTexto = def.ajusteTexto.eficacia;
      bill.custoTexto = def.ajusteTexto.custoFator;
      for (const [b, v] of Object.entries(def.ajusteTexto.afinidadeExtra)) bill.apoioNegociado[b as BlocId] = (bill.apoioNegociado[b as BlocId] ?? 0) + (v as number);
      L.add('pc_mobilizacao', -2, cause);
      {
        const pol = policyOf(s, bill);
        if (pol && bill.type === 'MP') {
          pol.eficacia = bill.eficaciaTexto;
          pol.custoFator = bill.custoTexto;
          pol.textoAjustado = true;
        }
      }
      break;
    case 'dialogo':
      bill.dialogoPendente += 0.45 * mult;
      break;
    case 'compromisso_publico':
      if (bill.compromissoPublico) return 'O governo já assumiu compromisso público com esta proposta.';
      bill.compromissoPublico = true;
      for (const b of BLOC_IDS) bill.apoioNegociado[b] = (bill.apoioNegociado[b] ?? 0) + 0.6 * BLOCS[b].sensibilidadeEleitoral * def.popularidade;
      break;
    case 'urgencia':
      if (bill.type !== 'PL' && bill.type !== 'PLP') return 'Urgência constitucional só se aplica a projetos de lei do Executivo.';
      if (bill.urgencia) return 'Urgência já solicitada.';
      bill.urgencia = true;
      s.presidentes.camara.relacao = clamp(s.presidentes.camara.relacao - 4, 0, 100);
      s.presidentes.senado.relacao = clamp(s.presidentes.senado.relacao - 4, 0, 100);
      break;
  }
  bill.taticasUsadas.push(tactic);
  L.add('pc_negociacao', -custo, cause);
  return null;
}
