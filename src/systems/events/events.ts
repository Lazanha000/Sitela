/**
 * Motor de acontecimentos (spec §19). Eventos históricos têm data;
 * emergentes têm condições de elegibilidade, probabilidade e limites de
 * repetição — nunca surgem "porque o jogador vai bem". Opções têm custos
 * e consequências; sem decisão, aplica-se a opção padrão (inércia).
 */
import type { Ctx } from '../../simulation/engine/context';
import type { Editoria, PendingDecision, Provenance, WorldState } from '../../simulation/state/types';
import { EVENTS_2022 } from '../../content/events/events2022';

export interface EventOption {
  id: string;
  label: string;
  descricao: string;
  consequencias: string[];
  disponivel?: (s: WorldState, d: PendingDecision) => string | null;
  aplicar: (ctx: Ctx, d: PendingDecision) => void;
}

export interface EventDef {
  id: string;
  titulo: string;
  tipo: 'historico' | 'calendario' | 'emergente' | 'sistema';
  provenance: Provenance;
  editoria: Editoria;
  fonte?: string;
  dataIso?: string;
  turno?: number;
  condicao?: (s: WorldState) => boolean;
  probabilidade?: (s: WorldState) => number;
  maxOcorrencias?: number;
  janela?: [number, number];
  descricao: (s: WorldState, d: PendingDecision | null) => string;
  aoOcorrer?: (ctx: Ctx) => Record<string, string | number | boolean> | void;
  opcoes?: EventOption[];
  padrao?: string;
  importancia: number;
}

const REGISTRY: Record<string, EventDef> = Object.fromEntries(EVENTS_2022.map((d) => [d.id, d]));

export function eventDef(id: string): EventDef | undefined {
  return REGISTRY[id];
}

export function allEvents(): EventDef[] {
  return Object.values(REGISTRY);
}

function occurrences(s: WorldState, id: string): number {
  return s.eventHistory.filter((e) => e.eventId === id).length;
}

function trigger(ctx: Ctx, def: EventDef): void {
  const { s } = ctx;
  const instanceId = ctx.id('evt');
  const extra = def.aoOcorrer?.(ctx) ?? {};
  s.eventHistory.push({ instanceId, eventId: def.id, turn: s.turn });
  if (def.opcoes && def.opcoes.length) {
    s.pendingDecisions.push({ instanceId, eventId: def.id, turn: s.turn, context: { ...extra } });
  }
  ctx.emit('evento', { eventId: def.id, titulo: def.titulo, instanceId, ...extra }, { importancia: def.importancia, provenance: def.provenance, dataIso: def.dataIso });
}

/** Gera os acontecimentos do turno atual (chamado no início do mês). */
export function generateEvents(ctx: Ctx): void {
  const { s, rng } = ctx;
  for (const def of Object.values(REGISTRY)) {
    if (def.tipo === 'sistema') continue;
    if (def.turno !== undefined) {
      if (def.turno !== s.turn || occurrences(s, def.id) > 0) continue;
      if (def.condicao && !def.condicao(s)) continue;
      trigger(ctx, def);
      continue;
    }
    if (def.tipo !== 'emergente') continue;
    if (def.janela && (s.turn < def.janela[0] || s.turn > def.janela[1])) continue;
    if (occurrences(s, def.id) >= (def.maxOcorrencias ?? 1)) continue;
    if (def.condicao && !def.condicao(s)) continue;
    if (rng.chance(def.probabilidade?.(s) ?? 0.3)) trigger(ctx, def);
  }
}

export function decisionsDue(s: WorldState): PendingDecision[] {
  return s.pendingDecisions.filter((d) => d.turn <= s.turn);
}

export function resolveDecision(ctx: Ctx, instanceId: string, optionId: string, automatica = false): string | null {
  const { s } = ctx;
  const d = s.pendingDecisions.find((x) => x.instanceId === instanceId);
  if (!d) return 'Decisão não encontrada.';
  if (d.turn > s.turn) return 'Esta decisão ainda não está disponível.';
  const def = REGISTRY[d.eventId];
  const opt = def?.opcoes?.find((o) => o.id === optionId);
  if (!def || !opt) return 'Opção inválida.';
  const bloqueio = opt.disponivel?.(s, d);
  if (bloqueio) return bloqueio;
  opt.aplicar(ctx, d);
  s.pendingDecisions = s.pendingDecisions.filter((x) => x.instanceId !== instanceId);
  const rec = s.eventHistory.find((e) => e.instanceId === instanceId);
  if (rec) rec.optionId = optionId;
  else s.eventHistory.push({ instanceId, eventId: d.eventId, turn: s.turn, optionId });
  ctx.emit('decisao_evento', { eventId: def.id, titulo: def.titulo, opcao: opt.label, optionId, automatica, ...d.context }, { importancia: def.importancia - 1, provenance: 'contrafactual' });
  return null;
}

/** Decisões não tomadas no mês recebem a opção padrão. */
export function resolveDefaults(ctx: Ctx): void {
  for (const d of decisionsDue(ctx.s)) {
    const def = REGISTRY[d.eventId];
    if (!def?.opcoes?.length) {
      ctx.s.pendingDecisions = ctx.s.pendingDecisions.filter((x) => x !== d);
      continue;
    }
    const opt = def.opcoes.find((o) => o.id === def.padrao && !o.disponivel?.(ctx.s, d)) ?? def.opcoes.find((o) => !o.disponivel?.(ctx.s, d)) ?? def.opcoes[0];
    resolveDecision(ctx, d.instanceId, opt.id, true);
  }
}
