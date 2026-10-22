/**
 * Avanço de turno — ordem determinística e documentada (spec §3.2).
 *
 *  0. Decisões pendentes não tomadas recebem a opção padrão.
 *  1. Congresso: tramitação, pautas, votações, validade de MPs.
 *  2. Judiciário: contestações, liminares, julgamentos.
 *  3. Execução de políticas: orçamento, capacidade, cooperação → gastos e
 *     efeitos agendados (com defasagem).
 *  4. Economia: exógenos, combustíveis, hiato, atividade, inflação,
 *     expectativas, Copom, câmbio, risco, desemprego.
 *  5. Finanças públicas: receita, despesa, teto, bloqueios, juros, dívida.
 *  6. Serviços e ambiente.
 *  7. Efeitos defasados sobre indicadores que vencem neste mês.
 *  8. Federação. 9. Opinião pública. 10. Atores e capital político.
 *  11. Eleições (pesquisas e votação). 12. Registro, relatório causal e
 *  jornal. 13. Avanço da data e geração dos acontecimentos do novo mês.
 *
 * Cada etapa lê o estado deixado pela anterior no MESMO turno, o que evita
 * usar popularidade desatualizada ou aplicar uma política duas vezes.
 */
import { summarize, type Contribution } from '../causality/ledger';
import type { Ocorrencia, TurnReport, WorldState } from '../state/types';
import { ALL_INDICATORS } from '../state/indicators';
import { makeCtx, pushSerie, type Ctx } from './context';
import { resolveDefaults, generateEvents, decisionsDue } from '../../systems/events/events';
import { congressStep } from '../../systems/congress/congress';
import { judiciaryStep } from '../../systems/judiciary/judiciary';
import { policyStep } from '../../systems/executive/policies';
import { economyStep } from '../../systems/economy/economy';
import { fiscalStep } from '../../systems/budget/fiscal';
import { servicesStep } from '../../systems/public-services/services';
import { federationStep } from '../../systems/federation/federation';
import { opinionStep } from '../../systems/opinion/opinion';
import { actorsStep } from '../../systems/executive/actors';
import { electionStep } from '../../systems/elections/elections';
import { generateNews } from '../../systems/media/news';
import { POLICY_BY_ID } from '../../content/policies/policies2022';

export const FINAL_TURN = 11; // dezembro de 2022

function applyDueIndicatorEffects(ctx: Ctx): void {
  const { s } = ctx;
  const due = s.pendingEffects.filter((e) => e.dueTurn <= s.turn && e.target.kind === 'indicator');
  for (const e of due) {
    if (e.target.kind !== 'indicator') continue;
    let delta = e.delta;
    if (e.saturaEm !== undefined && delta > 0) {
      const cur = s.ind[e.target.ind];
      delta *= Math.max(0, Math.min(1, ((e.saturaEm - cur) / e.saturaEm) * 2));
    }
    ctx.L.add(e.target.ind, delta, { id: e.causeId, label: e.causeLabel, kind: e.causeKind, controlavel: e.causeKind === 'politica' });
  }
  s.pendingEffects = s.pendingEffects.filter((e) => !due.includes(e));
}

function publishNews(s: WorldState, ocorrencias: Ocorrencia[], publishedTurn: number): void {
  const ja = new Set(s.news.map((n) => n.ocorrenciaId).filter(Boolean));
  const novas = generateNews(s, ocorrencias.filter((o) => !ja.has(o.id)), publishedTurn);
  s.news.push(...novas);
}

/** Gera os acontecimentos do mês corrente (início de turno). */
export function openTurn(s: WorldState): void {
  s.pendingLedger = [];
  s.pendingOcorrencias = [];
  const ctx = makeCtx(s, s.pendingLedger, s.pendingOcorrencias);
  generateEvents(ctx);
  publishNews(s, s.pendingOcorrencias, s.turn);
}

export function advanceTurn(prev: WorldState): WorldState {
  if (prev.status === 'encerrada') return prev;
  const s = structuredClone(prev);
  const entries: Contribution[] = [...s.pendingLedger];
  const ocorrencias: Ocorrencia[] = [...s.pendingOcorrencias];
  const ctx = makeCtx(s, entries, ocorrencias);
  const resolvedTurn = s.turn;

  resolveDefaults(ctx);
  congressStep(ctx);
  judiciaryStep(ctx);
  const pol = policyStep(ctx);
  economyStep(ctx, pol);
  fiscalStep(ctx, pol);
  servicesStep(ctx, pol);
  applyDueIndicatorEffects(ctx);
  federationStep(ctx);
  opinionStep(ctx, pol.opinionInputs);
  actorsStep(ctx);
  electionStep(ctx);

  for (const k of ALL_INDICATORS) pushSerie(s, k, resolvedTurn, s.ind[k]);

  const alertas: string[] = [];
  if (s.ind.teto_folga < 0) alertas.push(`Despesa projetada acima do teto em R$ ${(-s.ind.teto_folga).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi: haverá bloqueio no próximo relatório bimestral.`);
  if (s.ind.pc_negociacao < 15) alertas.push('Capacidade de negociação baixa: novas iniciativas e táticas ficam limitadas.');
  if (s.ind.risco_pais > 280) alertas.push('Prêmio de risco elevado: câmbio e juros sob pressão.');
  if (s.ind.tensao_institucional > 70) alertas.push('Tensão institucional muito alta.');
  for (const b of s.bills) {
    if (b.type === 'MP' && b.expiresTurn !== undefined && b.expiresTurn - (resolvedTurn + 1) <= 1 && !['aprovado', 'rejeitado', 'caducou'].includes(b.stage)) alertas.push(`MP "${POLICY_BY_ID[b.policyId].nome}" perde a validade em breve.`);
  }
  const report: TurnReport = {
    turn: resolvedTurn,
    deltas: summarize(s.indInicioTurno, s.ind, entries),
    ocorrencias,
    execucao: pol.execucao,
    alertas,
    pendencias: [],
  };
  s.reports.push(report);
  s.log.push(...s.currentActions);
  s.currentActions = [];

  // Avança a data.
  s.turn = resolvedTurn + 1;
  s.indInicioTurno = { ...s.ind };
  publishNews(s, ocorrencias, s.turn);

  if (resolvedTurn >= FINAL_TURN) {
    s.status = 'encerrada';
    const r = s.election.resultado;
    const titulo = r === 'reeleito' ? 'Presidente reeleito toma posse para o segundo mandato' : r === 'sucessor_eleito' ? 'Sucessor do governo toma posse' : 'Oposição toma posse; termina o governo';
    const oc: Ocorrencia = { id: `oc-posse-${s.counters.seq}`, turn: s.turn, tipo: 'posse', importancia: 10, provenance: 'contrafactual', dataIso: '2023-01-01', dados: { titulo, linha: 'Fim da campanha de 2022. Veja o balanço no Arquivo.' } };
    publishNews(s, [oc], s.turn);
    s.pendingLedger = [];
    s.pendingOcorrencias = [];
    return s;
  }
  openTurn(s);
  report.pendencias = decisionsDue(s).map((d) => d.eventId);
  return s;
}
