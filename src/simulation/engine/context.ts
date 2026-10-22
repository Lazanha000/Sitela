/**
 * Contexto de execução do motor: estado mutável (cópia), livro-razão,
 * gerador aleatório e utilidades de emissão de ocorrências e efeitos.
 */
import { Ledger, type Cause, type Contribution } from '../causality/ledger';
import { Rng } from '../random/rng';
import type { IndicatorId } from '../state/indicators';
import type { DelayedEffect, GroupId, OpinionFactor, Ocorrencia, Provenance, RegionId, WorldState } from '../state/types';

/** Índice do turno 0 dentro das séries (12 meses de 2021 antes). */
export const SERIE_OFFSET = 12;

export interface Ctx {
  s: WorldState;
  L: Ledger;
  rng: Rng;
  emit: (tipo: string, dados: Record<string, unknown>, opts?: { importancia?: number; provenance?: Provenance; dataIso?: string }) => Ocorrencia;
  id: (prefix: string) => string;
  ocorrencias: Ocorrencia[];
}

export function makeCtx(s: WorldState, entries: Contribution[], ocorrencias: Ocorrencia[]): Ctx {
  const L = new Ledger(s, entries);
  const rng = new Rng(s.rng);
  const id = (prefix: string) => `${prefix}-${++s.counters.seq}`;
  const emit: Ctx['emit'] = (tipo, dados, opts = {}) => {
    const oc: Ocorrencia = {
      id: id('oc'),
      turn: s.turn,
      tipo,
      dados,
      importancia: opts.importancia ?? 5,
      provenance: opts.provenance ?? 'contrafactual',
      dataIso: opts.dataIso,
    };
    ocorrencias.push(oc);
    return oc;
  };
  return { s, L, rng, emit, id, ocorrencias };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Agenda efeito sobre indicador para um turno futuro (ou o atual). */
export function scheduleIndicator(ctx: Ctx, ind: IndicatorId, delta: number, dueTurn: number, cause: Cause, saturaEm?: number): void {
  const e: DelayedEffect = {
    id: ctx.id('ef'),
    dueTurn,
    target: { kind: 'indicator', ind },
    delta,
    causeId: cause.id,
    causeLabel: cause.label,
    causeKind: cause.kind === 'politica' || cause.kind === 'evento' || cause.kind === 'choque_externo' || cause.kind === 'ator' ? cause.kind : 'evento',
    createdTurn: ctx.s.turn,
  };
  if (saturaEm !== undefined) e.saturaEm = saturaEm;
  ctx.s.pendingEffects.push(e);
}

/**
 * Choque de opinião (fator "eventos" ou "campanha"), aplicado na etapa de
 * opinião do turno indicado. `grupos = 'todos'` aplica a todos com a
 * sensibilidade de cada grupo.
 */
export function scheduleOpinion(
  ctx: Ctx,
  factor: Extract<OpinionFactor, 'eventos' | 'campanha'>,
  grupos: Partial<Record<GroupId, number>> | 'todos',
  valor: number,
  cause: Cause,
  dueTurn = ctx.s.turn,
): void {
  const groups: Partial<Record<GroupId, number>> =
    grupos === 'todos' ? { baixa_renda: valor, trabalhadores: valor, alta_renda: valor, agro: valor, servidores: valor } : grupos;
  ctx.s.pendingEffects.push({
    id: ctx.id('ef'),
    dueTurn,
    target: { kind: 'opinion', factor, groups },
    delta: 1,
    causeId: cause.id,
    causeLabel: cause.label,
    causeKind: cause.kind === 'politica' || cause.kind === 'acao' ? 'politica' : cause.kind === 'choque_externo' ? 'choque_externo' : 'evento',
    createdTurn: ctx.s.turn,
  });
}

export function scheduleRegional(ctx: Ctx, region: RegionId, delta: number, cause: Cause, dueTurn = ctx.s.turn): void {
  ctx.s.pendingEffects.push({
    id: ctx.id('ef'),
    dueTurn,
    target: { kind: 'region', region },
    delta,
    causeId: cause.id,
    causeLabel: cause.label,
    causeKind: 'evento',
    createdTurn: ctx.s.turn,
  });
}

export function scheduleGap(ctx: Ctx, delta: number, dueTurn: number, cause: Cause): void {
  ctx.s.pendingEffects.push({
    id: ctx.id('ef'),
    dueTurn,
    target: { kind: 'gap' },
    delta,
    causeId: cause.id,
    causeLabel: cause.label,
    causeKind: cause.kind === 'politica' ? 'politica' : cause.kind === 'choque_externo' ? 'choque_externo' : 'evento',
    createdTurn: ctx.s.turn,
  });
}

/** Registra rótulo legível para uma fonte de opinião. */
export function opinionLabel(s: WorldState, key: string, label: string): void {
  s.opinionLabels[key] = label;
}

export function pushSerie(s: WorldState, ind: IndicatorId, turn: number, value: number): void {
  const arr = (s.serie[ind] ??= []);
  const idx = turn + SERIE_OFFSET;
  while (arr.length < idx) arr.push(null);
  arr[idx] = value;
}
