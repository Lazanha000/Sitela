/**
 * Livro-razão causal (spec §4.6). Toda alteração de indicador passa por
 * aqui com uma causa declarada. A decomposição reconcilia exatamente a
 * variação total porque cada delta aplicado é registrado.
 */
import type { IndicatorId } from '../state/indicators';
import type { IndicatorDelta, WorldState } from '../state/types';

export type CauseKind =
  | 'politica' // decisão do governo (controlável)
  | 'acao' // ação imediata do jogador (comunicação, negociação)
  | 'evento' // acontecimento histórico/emergente
  | 'choque_externo' // fora do controle do governo
  | 'ator' // reação de atores (Congresso, BC, governadores, mercado)
  | 'instituicao' // decisões de instituições autônomas
  | 'dinamica' // inércia, convergência, sazonalidade
  | 'ruido'; // aleatoriedade controlada (semente)

export interface Cause {
  id: string;
  label: string;
  kind: CauseKind;
  controlavel: boolean;
}

export interface Contribution {
  ind: IndicatorId;
  delta: number;
  cause: Cause;
}

export const C = {
  politica: (id: string, label: string): Cause => ({ id: `pol:${id}`, label, kind: 'politica', controlavel: true }),
  acao: (id: string, label: string): Cause => ({ id: `acao:${id}`, label, kind: 'acao', controlavel: true }),
  evento: (id: string, label: string): Cause => ({ id: `ev:${id}`, label, kind: 'evento', controlavel: false }),
  externo: (id: string, label: string): Cause => ({ id: `ext:${id}`, label, kind: 'choque_externo', controlavel: false }),
  ator: (id: string, label: string): Cause => ({ id: `ator:${id}`, label, kind: 'ator', controlavel: false }),
  instituicao: (id: string, label: string): Cause => ({ id: `inst:${id}`, label, kind: 'instituicao', controlavel: false }),
  dinamica: (id: string, label: string): Cause => ({ id: `din:${id}`, label, kind: 'dinamica', controlavel: false }),
  ruido: (id: string): Cause => ({ id: `ruido:${id}`, label: 'Variação aleatória (incerteza do modelo)', kind: 'ruido', controlavel: false }),
};

export class Ledger {
  constructor(
    private readonly state: WorldState,
    readonly entries: Contribution[] = [],
  ) {}

  /** Soma `delta` ao indicador e registra a causa. */
  add(ind: IndicatorId, delta: number, cause: Cause): void {
    if (!Number.isFinite(delta) || delta === 0) return;
    this.state.ind[ind] += delta;
    this.entries.push({ ind, delta, cause });
  }

  /**
   * Define um indicador derivado e reparte a variação entre as partes
   * informadas; o resíduo (interações, arredondamentos) é registrado
   * explicitamente para que a soma sempre feche.
   */
  setDerived(ind: IndicatorId, value: number, parts: { delta: number; cause: Cause }[], residual: Cause): void {
    const before = this.state.ind[ind];
    let acc = 0;
    for (const p of parts) {
      if (!Number.isFinite(p.delta) || p.delta === 0) continue;
      this.entries.push({ ind, delta: p.delta, cause: p.cause });
      acc += p.delta;
    }
    const rest = value - before - acc;
    if (Math.abs(rest) > 1e-9) this.entries.push({ ind, delta: rest, cause: residual });
    this.state.ind[ind] = value;
  }

  /** Valor sem causa explícita: atribui tudo a uma única causa. */
  set(ind: IndicatorId, value: number, cause: Cause): void {
    this.add(ind, value - this.state.ind[ind], cause);
  }

  absorb(other: Contribution[]): void {
    this.entries.push(...other);
  }
}

/** Agrega contribuições por indicador e causa para o relatório. */
export function summarize(
  before: Record<IndicatorId, number>,
  after: Record<IndicatorId, number>,
  entries: Contribution[],
): IndicatorDelta[] {
  const byInd = new Map<IndicatorId, Map<string, { cause: Cause; delta: number }>>();
  for (const e of entries) {
    let m = byInd.get(e.ind);
    if (!m) byInd.set(e.ind, (m = new Map()));
    const cur = m.get(e.cause.id);
    if (cur) cur.delta += e.delta;
    else m.set(e.cause.id, { cause: e.cause, delta: e.delta });
  }
  const out: IndicatorDelta[] = [];
  for (const [ind, m] of byInd) {
    const contributions = [...m.values()]
      .filter((c) => Math.abs(c.delta) > 1e-9)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .map((c) => ({ causeId: c.cause.id, label: c.cause.label, kind: c.cause.kind, controlavel: c.cause.controlavel, delta: c.delta }));
    if (Math.abs(after[ind] - before[ind]) < 1e-9 && contributions.length === 0) continue;
    out.push({ ind, before: before[ind], after: after[ind], contributions });
  }
  return out;
}
