/**
 * Eleições de 2022 (spec §17). O voto não é função só da aprovação:
 * deriva da avaliação por região (ótimo/bom, regular, ruim/péssimo),
 * da campanha regional, do tempo de TV, da mobilização e do comparecimento.
 * As candidaturas são rotuladas genericamente: o jogo não atribui
 * intenções de voto simuladas a pessoas reais. Pesquisas são simulações.
 */
import { C } from '../../simulation/causality/ledger';
import { clamp, scheduleOpinion, type Ctx } from '../../simulation/engine/context';
import type { Candidate, ElectionRound, RegionId, WorldState } from '../../simulation/state/types';
import { REGION_IDS, REGIONS } from '../../content/actors/actors2022';
import { regionalOpinion } from '../opinion/opinion';

export type CandId = Candidate['id'];
export const CAND_IDS: CandId[] = ['governo', 'oposicao', 'terceira_via', 'outros'];

export function candidateLabel(s: WorldState, c: CandId): string {
  switch (c) {
    case 'governo':
      return s.election.governoConcorre ? 'Candidatura do governo (reeleição)' : 'Candidatura do governo (sucessor)';
    case 'oposicao':
      return 'Principal candidatura de oposição';
    case 'terceira_via':
      return 'Terceira via (centro)';
    case 'outros':
      return 'Demais candidaturas';
  }
}

function normalize(x: Record<CandId, number>): Record<CandId, number> {
  const tot = CAND_IDS.reduce((a, c) => a + Math.max(0, x[c]), 0);
  return Object.fromEntries(CAND_IDS.map((c) => [c, (Math.max(0, x[c]) / tot) * 100])) as Record<CandId, number>;
}

export function intencaoRegional(s: WorldState, turno: 1 | 2, choqueGoverno = 0): Record<RegionId, Record<CandId, number>> {
  const op = regionalOpinion(s);
  const e = s.election;
  const out = {} as Record<RegionId, Record<CandId, number>>;
  const mobil = 1 + (s.ind.pc_mobilizacao - 55) / 400;
  const tv = e.alianca === 'ampla' ? 1.5 : e.alianca === 'ideologica' ? -0.5 : 0;
  for (const r of REGION_IDS) {
    const { pos, neg, reg } = op[r];
    const gov = (e.governoConcorre ? pos + 0.45 * reg : 0.75 * pos + 0.35 * reg) * mobil + e.campanhaRegional[r] + tv + choqueGoverno;
    const first: Record<CandId, number> = {
      governo: gov,
      oposicao: 0.85 * neg + 0.38 * reg,
      terceira_via: 0.1 * neg + 0.12 * reg + 0.04 * pos,
      outros: 0.05 * neg + 0.05 * reg + 0.02 * pos,
    };
    const f = normalize(first);
    if (turno === 1) out[r] = f;
    else out[r] = normalize({ governo: f.governo + 0.4 * f.terceira_via + 0.45 * f.outros, oposicao: f.oposicao + 0.6 * f.terceira_via + 0.55 * f.outros, terceira_via: 0, outros: 0 });
  }
  return out;
}

export function intencaoNacional(s: WorldState, turno: 1 | 2, choque = 0): { nacional: Record<CandId, number>; porRegiao: Record<RegionId, Record<CandId, number>> } {
  const porRegiao = intencaoRegional(s, turno, choque);
  const nacional = Object.fromEntries(CAND_IDS.map((c) => [c, REGION_IDS.reduce((a, r) => a + REGIONS[r].pop * porRegiao[r][c], 0)])) as Record<CandId, number>;
  return { nacional, porRegiao };
}

export function comparecimento(s: WorldState): number {
  return clamp(79 + 0.05 * (s.ind.pc_mobilizacao - 55) - 0.03 * (78 - s.ind.confianca_eleitoral), 70, 85);
}

function runRound(ctx: Ctx, turno: 1 | 2): ElectionRound {
  const { s, rng } = ctx;
  const choque = rng.normal(0, 1.2); // erro das pesquisas / último minuto
  const { nacional, porRegiao } = intencaoNacional(s, turno, choque);
  const round: ElectionRound = {
    turno,
    dataIso: turno === 1 ? '2022-10-02' : '2022-10-30',
    votosValidos: nacional,
    porRegiao,
    comparecimento: comparecimento(s),
  };
  const top = [...CAND_IDS].sort((a, b) => nacional[b] - nacional[a]);
  if (turno === 2 || nacional[top[0]] > 50) round.vencedor = top[0];
  return round;
}

function concluir(ctx: Ctx, round: ElectionRound): void {
  const { s, L } = ctx;
  const venceu = round.vencedor === 'governo';
  s.election.resultado = s.election.governoConcorre ? (venceu ? 'reeleito' : 'derrotado') : venceu ? 'sucessor_eleito' : 'sucessor_derrotado';
  const cause = C.evento('resultado_eleicao', 'Resultado da eleição presidencial');
  if (venceu) {
    L.add('pc_confianca_aliados', 12, cause);
    L.add('pc_credibilidade', 3, cause);
    for (const b of ['centrao', 'centro'] as const) s.blocs[b].relacao = clamp(s.blocs[b].relacao + 10, 0, 100);
  } else {
    L.add('pc_confianca_aliados', -20, cause);
    L.add('pc_negociacao', -Math.min(20, s.ind.pc_negociacao), cause);
    for (const b of ['centrao', 'centro'] as const) s.blocs[b].relacao = clamp(s.blocs[b].relacao - 15, 0, 100);
    s.pendingDecisions.push({ instanceId: ctx.id('dec'), eventId: 'transicao_derrota', turn: s.turn + 1, context: {} });
  }
}

export function electionStep(ctx: Ctx): void {
  const { s, rng } = ctx;
  const e = s.election;
  // Campanha regional se dissipa.
  for (const r of REGION_IDS) e.campanhaRegional[r] *= 0.85;

  if (s.turn >= 3 && s.turn <= 7) {
    const { nacional } = intencaoNacional(s, 1);
    const intencao = Object.fromEntries(CAND_IDS.map((c) => [c, Math.max(0, nacional[c] + rng.normal(0, 1.2))])) as Record<CandId, number>;
    const poll = { turn: s.turn + 1, instituto: 'Instituto Ágora (fictício)', intencao, margem: 2 };
    e.polls.push(poll);
    ctx.emit('pesquisa', { ...poll }, { importancia: s.turn >= 6 ? 6 : 4, provenance: 'contrafactual' });
  }
  if (s.turn === 8) {
    const r1 = runRound(ctx, 1);
    e.rounds.push(r1);
    ctx.emit('eleicao', { round: r1 }, { importancia: 10, dataIso: r1.dataIso });
    if (r1.vencedor) concluir(ctx, r1);
    else if (!r1.vencedor) {
      const top2 = [...CAND_IDS].sort((a, b) => r1.votosValidos[b] - r1.votosValidos[a]).slice(0, 2);
      if (!top2.includes('governo')) {
        // Governo fora do 2º turno: derrota antecipada.
        e.resultado = e.governoConcorre ? 'derrotado' : 'sucessor_derrotado';
        s.pendingDecisions.push({ instanceId: ctx.id('dec'), eventId: 'transicao_derrota', turn: s.turn + 1, context: {} });
      } else {
        const { nacional } = intencaoNacional(s, 2);
        const intencao = Object.fromEntries(CAND_IDS.map((c) => [c, Math.max(0, nacional[c] + rng.normal(0, 1.2))])) as Record<CandId, number>;
        e.polls.push({ turn: s.turn + 1, instituto: 'Instituto Ágora (fictício) — 2º turno', intencao, margem: 2 });
      }
    }
  }
  if (s.turn === 9 && e.rounds.length === 1 && !e.rounds[0].vencedor && !e.resultado) {
    const r2 = runRound(ctx, 2);
    e.rounds.push(r2);
    ctx.emit('eleicao', { round: r2 }, { importancia: 10, dataIso: r2.dataIso });
    concluir(ctx, r2);
  }
}

/** Ação de campanha: soma pontos regionais e choque de opinião "campanha". */
export function campanhaRegional(ctx: Ctx, regiao: RegionId | 'todas', pontos: number, label: string, id: string): void {
  const regs = regiao === 'todas' ? REGION_IDS : [regiao];
  for (const r of regs) ctx.s.election.campanhaRegional[r] += regiao === 'todas' ? pontos * 0.5 : pontos;
  scheduleOpinion(ctx, 'campanha', 'todos', regiao === 'todas' ? pontos * 0.4 : pontos * 0.15, C.acao(id, label));
}
