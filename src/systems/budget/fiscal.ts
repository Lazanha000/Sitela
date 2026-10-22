/**
 * Finanças públicas do Governo Central (spec §8), em R$ bilhões.
 * - Receita responde a atividade, preços, petróleo e commodities.
 * - Despesa: obrigatórias (rígidas) + discricionárias (dotação anual
 *   finita) + programas. O teto (EC 95) limita a despesa sujeita a ele;
 *   nos relatórios bimestrais, projeção acima do teto obriga bloqueio.
 * - Dívida (estoque) ← juros − primário. Dívida/PIB depende do PIB nominal.
 */
import { C, type Cause } from '../../simulation/causality/ledger';
import { type Ctx } from '../../simulation/engine/context';
import { turnToDate } from '../../simulation/time/calendar';
import type { WorldState } from '../../simulation/state/types';
import { RELATORIO_BIMESTRAL_MESES } from '../../content/historical-data/pack2022';
import { POLICY_BY_ID, isoMonthToTurn } from '../../content/policies/policies2022';
import type { PolicyStepResult } from '../executive/policies';

export const RECEITA_BASE = 126; // R$ bi/mês a preços de dez/2021 (abstração calibrada)
export const OBRIGATORIAS_BASE = 129; // R$ bi/mês
export const CRESCIMENTO_VEGETATIVO = 0.1; // R$ bi/mês a cada mês
export const DISCRICIONARIO_ANO = 130;
export const DISC_BASE_MENSAL = DISCRICIONARIO_ANO / 12;
export const TETO_2022 = 1680;

const mesesRestantes = (s: WorldState) => 12 - (s.turn % 12);

export function obrigatorias(turn: number): number {
  return OBRIGATORIAS_BASE + CRESCIMENTO_VEGETATIVO * turn;
}

/**
 * Remanejamento: políticas discricionárias competem com o custeio da LOA.
 * Até 45% do disponível no mês pode ir para programas novos; o resto
 * comprime o custeio-base (custo de oportunidade visível).
 */
export function allocateDiscretionary(s: WorldState, demandas: { id: string; valor: number }[]) {
  const disponivel = Math.max(0, (s.fiscal.discricionarioAno - s.fiscal.bloqueio - s.fiscal.discricionarioGasto) / mesesRestantes(s));
  const demanda = demandas.reduce((a, d) => a + d.valor, 0);
  const granted: Record<string, number> = {};
  let baseline: number;
  if (demanda + DISC_BASE_MENSAL <= disponivel + 1e-9) {
    for (const d of demandas) granted[d.id] = 1;
    baseline = DISC_BASE_MENSAL;
  } else {
    const paraProgramas = Math.min(demanda, Math.max(0.45 * disponivel, disponivel - DISC_BASE_MENSAL));
    const frac = demanda > 0 ? paraProgramas / demanda : 1;
    for (const d of demandas) granted[d.id] = frac;
    baseline = Math.min(DISC_BASE_MENSAL, Math.max(0, disponivel - paraProgramas));
  }
  return { granted, baseline, compressao: Math.max(0, 1 - baseline / DISC_BASE_MENSAL), disponivel };
}

/** Despesa sujeita ao teto projetada para o restante do ano. */
export function projetarTeto(s: WorldState): number {
  const t = s.turn;
  const fimAno = 11 + 12 * Math.floor(t / 12);
  let futuro = 0;
  for (let m = t + 1; m <= fimAno; m++) futuro += obrigatorias(m);
  for (const p of s.policies) {
    const def = POLICY_BY_ID[p.defId];
    if (def.financiamento !== 'obrigatoria_teto') continue;
    if (!(p.status === 'execucao' || p.status === 'preparacao')) continue;
    const inicio = Math.max(t + 1, def.inicioMinimo ? isoMonthToTurn(def.inicioMinimo) : 0, p.executionStartTurn ?? 0);
    for (let m = inicio; m <= fimAno; m++) futuro += def.custoMensal * p.custoFator;
  }
  const discRestante = Math.max(0, s.fiscal.discricionarioAno - s.fiscal.bloqueio - s.fiscal.discricionarioGasto);
  return s.fiscal.despesaTetoAno + futuro + discRestante;
}

function priceRatio(s: WorldState): number {
  let p = 1;
  for (let j = 12; j < s.econ.ipcaMesHist.length; j++) p *= 1 + s.econ.ipcaMesHist[j] / 100;
  return p;
}

export function fiscalStep(ctx: Ctx, pol: PolicyStepResult): void {
  const { s, L } = ctx;
  const i = s.ind;
  const t = s.turn;
  const month = turnToDate(t).month;
  if (month === 1 && t > 0) {
    for (const k of ['receita_ano', 'despesa_ano', 'primario_ano', 'juros_ano'] as const) L.set(k, 0, C.dinamica('novo_ano', 'Início de novo exercício'));
    s.fiscal.despesaTetoAno = 0;
    s.fiscal.discricionarioGasto = 0;
    s.fiscal.bloqueio = 0;
  }

  // --- Receita ---
  const aRatio = i.atividade / s.econ.atividadeHist[11];
  const rec: { cause: Cause; value: number }[] = [
    { cause: C.dinamica('arrecadacao', 'Arrecadação: atividade econômica e preços'), value: RECEITA_BASE * priceRatio(s) * Math.pow(aRatio, 1.2) },
    { cause: C.externo('petroleo', 'Mercado internacional de petróleo'), value: 0.35 * (i.brent - 74) * (i.cambio / 5.58) },
    { cause: C.externo('commodities', 'Preços internacionais de commodities'), value: 0.08 * (i.commodities - 100) },
    ...pol.receitas,
  ];
  const desp: { cause: Cause; value: number; cat: 'teto' | 'fora' | 'disc' }[] = [
    { cause: C.dinamica('obrigatorias', 'Despesas obrigatórias (benefícios, pessoal, mínimos de saúde e educação)'), value: obrigatorias(t), cat: 'teto' },
  ];
  for (const d of pol.despesas) desp.push({ cause: d.cause, value: d.valor, cat: d.categoria === 'fora_teto' ? 'fora' : d.categoria === 'discricionaria' ? 'disc' : 'teto' });
  for (const x of s.fiscal.extrasMes) {
    const cause: Cause = { id: x.causeId, label: x.label, kind: x.causeId.startsWith('acao:') ? 'acao' : 'evento', controlavel: x.causeId.startsWith('acao:') };
    if (x.categoria === 'receita') rec.push({ cause, value: x.valor });
    else desp.push({ cause, value: x.valor, cat: x.categoria === 'fora_teto' ? 'fora' : 'disc' });
  }
  s.fiscal.extrasMes = [];

  const receita = rec.reduce((a, r) => a + r.value, 0);
  const despesa = desp.reduce((a, d) => a + d.value, 0);
  const prevMes = C.dinamica('fluxo_anterior', 'Substitui o valor do mês anterior (fluxo mensal)');
  L.setDerived('receita_mes', receita, rec.map((r) => ({ cause: r.cause, delta: r.value })), prevMes);
  L.setDerived('despesa_mes', despesa, desp.map((d) => ({ cause: d.cause, delta: d.value })), prevMes);
  const primParts = [...rec.map((r) => ({ cause: r.cause, delta: r.value })), ...desp.map((d) => ({ cause: d.cause, delta: -d.value }))];
  L.setDerived('primario_mes', receita - despesa, primParts, prevMes);
  for (const r of rec) L.add('receita_ano', r.value, r.cause);
  for (const d of desp) L.add('despesa_ano', d.value, d.cause);
  for (const p of primParts) L.add('primario_ano', p.delta, p.cause);

  s.fiscal.despesaTetoAno += desp.filter((d) => d.cat !== 'fora').reduce((a, d) => a + d.value, 0);
  s.fiscal.discricionarioGasto += desp.filter((d) => d.cat === 'disc').reduce((a, d) => a + d.value, 0);
  s.fiscal.foraDoTeto += desp.filter((d) => d.cat === 'fora').reduce((a, d) => a + d.value, 0);

  // --- Juros e dívida ---
  const taxaImplicita = 2.5 + 0.35 * i.selic + 0.15 * i.ipca_12m;
  const juros = (i.divida_bruta * taxaImplicita) / 100 / 12;
  const jurosCause = C.instituicao('juros_divida', 'Juros sobre o estoque da dívida (Selic e inflação)');
  L.setDerived('juros_mes', juros, [{ cause: jurosCause, delta: juros }], prevMes);
  L.add('juros_ano', juros, jurosCause);
  const dPrev = i.divida_bruta;
  L.add('divida_bruta', juros, jurosCause);
  for (const p of primParts) L.add('divida_bruta', -p.delta, p.cause);
  const pib = i.pib_nominal;
  const pibPrev = s.fiscal.pibNominalAnterior || pib;
  const ratioParts = [
    { cause: jurosCause, delta: (juros / pib) * 100 },
    ...primParts.map((p) => ({ cause: p.cause, delta: (-p.delta / pib) * 100 })),
    { cause: C.dinamica('pib_denominador', 'Crescimento do PIB nominal (denominador: atividade e inflação)'), delta: dPrev * (1 / pib - 1 / pibPrev) * 100 },
  ];
  L.setDerived('divida_pib', (i.divida_bruta / pib) * 100, ratioParts, C.dinamica('divida_residuo', 'Ajustes'));
  s.fiscal.pibNominalAnterior = pib;

  // --- Teto de gastos ---
  const folga = s.fiscal.teto - projetarTeto(s);
  L.set('teto_folga', folga, C.instituicao('teto_projecao', 'Reprojeção das despesas sujeitas ao teto'));
  if (RELATORIO_BIMESTRAL_MESES.includes(month)) {
    const discRestante = Math.max(0, s.fiscal.discricionarioAno - s.fiscal.bloqueio - s.fiscal.discricionarioGasto);
    let acao: 'bloqueio' | 'desbloqueio' | 'nenhuma' = 'nenhuma';
    let valor = 0;
    if (folga < 0) {
      valor = Math.min(-folga + 1, discRestante * 0.8);
      s.fiscal.bloqueio += valor;
      acao = 'bloqueio';
    } else if (folga > 8 && s.fiscal.bloqueio > 0) {
      valor = Math.min(s.fiscal.bloqueio, folga - 3);
      s.fiscal.bloqueio -= valor;
      acao = 'desbloqueio';
    }
    if (acao !== 'nenhuma') L.add('teto_folga', acao === 'bloqueio' ? valor : -valor, C.instituicao('bloqueio', acao === 'bloqueio' ? 'Bloqueio de despesas discricionárias' : 'Desbloqueio de despesas'));
    ctx.emit(
      'relatorio_bimestral',
      { acao, valor, bloqueioTotal: s.fiscal.bloqueio, folga: i.teto_folga, primarioAno: i.primario_ano, receitaAno: i.receita_ano },
      { importancia: acao === 'bloqueio' ? 7 : 4, provenance: 'contrafactual', dataIso: `2022-${String(month).padStart(2, '0')}-22` },
    );
  }
}
