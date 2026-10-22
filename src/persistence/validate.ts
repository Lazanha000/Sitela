/** Validação estrutural antes de carregar um salvamento (spec §22.2). */
import { ALL_INDICATORS } from '../simulation/state/indicators';
import type { WorldState } from '../simulation/state/types';

export function validateState(raw: unknown): string[] {
  const e: string[] = [];
  const s = raw as Partial<WorldState> & Record<string, unknown>;
  if (!s || typeof s !== 'object') return ['Arquivo não contém um estado de jogo.'];
  if (!s.meta || typeof s.meta !== 'object') e.push('meta ausente');
  else {
    if (typeof s.meta.schemaVersion !== 'number') e.push('meta.schemaVersion inválido');
    if (typeof s.meta.seed !== 'string') e.push('meta.seed inválida');
    if (typeof s.meta.campaignId !== 'string') e.push('meta.campaignId inválido');
  }
  if (typeof s.turn !== 'number' || s.turn < 0 || s.turn > 12) e.push('turno inválido');
  if (!s.rng || typeof s.rng.a !== 'number') e.push('estado do gerador aleatório ausente');
  if (!s.ind || typeof s.ind !== 'object') e.push('indicadores ausentes');
  else for (const k of ALL_INDICATORS) if (typeof s.ind[k] !== 'number' || !Number.isFinite(s.ind[k])) e.push(`indicador ${k} inválido`);
  for (const k of ['bills', 'policies', 'challenges', 'pendingEffects', 'pendingDecisions', 'news', 'reports'] as const) if (!Array.isArray(s[k])) e.push(`${k} ausente`);
  for (const k of ['groups', 'regions', 'blocs', 'econ', 'fiscal', 'election', 'flags'] as const) if (!s[k] || typeof s[k] !== 'object') e.push(`${k} ausente`);
  return e;
}
