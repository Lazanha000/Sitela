/**
 * Federação (spec §12) — v0.1 agregada por região. Governadores têm
 * alinhamento, necessidade fiscal e cooperação; alinhamento não é
 * obediência: a cooperação converge a uma mistura de alinhamento e
 * contexto, e reage a medidas que afetam as finanças estaduais.
 */
import { C, type Cause } from '../../simulation/causality/ledger';
import { clamp, type Ctx } from '../../simulation/engine/context';
import type { RegionId } from '../../simulation/state/types';
import { REGION_IDS, REGIONS } from '../../content/actors/actors2022';

export function coopNacional(ctx: Ctx): number {
  return REGION_IDS.reduce((a, r) => a + REGIONS[r].pop * ctx.s.regions[r].governadores.cooperacao, 0);
}

/** Choque na cooperação de governadores, registrado no livro-razão. */
export function shockGovernors(ctx: Ctx, deltas: Partial<Record<RegionId, number>>, cause: Cause): void {
  let nac = 0;
  for (const [r, d] of Object.entries(deltas) as [RegionId, number][]) {
    const g = ctx.s.regions[r].governadores;
    const before = g.cooperacao;
    g.cooperacao = clamp(before + d, 0, 100);
    nac += REGIONS[r].pop * (g.cooperacao - before);
  }
  ctx.L.add('coop_federativa', nac, cause);
}

export function federationStep(ctx: Ctx): void {
  const { s } = ctx;
  let drift = 0;
  for (const r of REGION_IDS) {
    const g = s.regions[r].governadores;
    const alvo = 0.6 * g.alinhamento + 20 - 0.1 * (g.necessidadeFiscal - 50);
    const d = 0.06 * (alvo - g.cooperacao);
    g.cooperacao = clamp(g.cooperacao + d, 0, 100);
    drift += REGIONS[r].pop * d;
  }
  ctx.L.setDerived('coop_federativa', coopNacional(ctx), [{ cause: C.ator('governadores', 'Relação com governadores (convergência gradual)'), delta: drift }], C.dinamica('coop_ajuste', 'Ajustes'));
}
