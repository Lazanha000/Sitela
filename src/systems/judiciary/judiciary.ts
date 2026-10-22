/**
 * Judiciário (spec §11). Contestação → análise de liminar → julgamento.
 * A decisão depende sobretudo da fragilidade jurídica da medida
 * (fundamentos), com influência menor do contexto de conflito.
 * Uma medida suspensa não é executada (execução = 0).
 */
import { C } from '../../simulation/causality/ledger';
import { clamp, type Ctx } from '../../simulation/engine/context';
import type { ActivePolicy, Challenge } from '../../simulation/state/types';
import { POLICY_BY_ID, type PolicyDef } from '../../content/policies/policies2022';

export function maybeChallenge(ctx: Ctx, pol: ActivePolicy, def: PolicyDef): Challenge | null {
  const { s, rng } = ctx;
  if (def.riscoJudicial <= 0) return null;
  if (s.challenges.some((c) => c.policyInstanceId === pol.id)) return null;
  let p = def.riscoJudicial;
  if (pol.instrument === 'MP' && def.fragilidadeJuridica > 0.3) p += 0.1;
  if (!rng.chance(clamp(p, 0, 0.95))) return null;
  const ch: Challenge = {
    id: ctx.id('adi'),
    policyInstanceId: pol.id,
    autor: def.autorContestacao,
    fundamento: def.fundamentoContestacao,
    stage: 'ajuizada',
    filedTurn: s.turn,
    monthsInStage: 0,
    descumprida: false,
  };
  s.challenges.push(ch);
  ctx.emit('contestacao', { challengeId: ch.id, defId: def.id, nome: def.nome, autor: ch.autor, fundamento: ch.fundamento }, { importancia: 6 });
  return ch;
}

function liminarProb(ctx: Ctx, def: PolicyDef, pol: ActivePolicy): number {
  const t = ctx.s.ind.tensao_institucional;
  let p = def.fragilidadeJuridica * (1 + 0.3 * ((t - 50) / 50));
  if (pol.instrument === 'MP') p += 0.05;
  return clamp(p, 0.02, 0.9);
}

export function judiciaryStep(ctx: Ctx): void {
  const { s, rng, L } = ctx;
  for (const ch of s.challenges) {
    if (ch.stage === 'decidida') continue;
    const pol = s.policies.find((p) => p.id === ch.policyInstanceId);
    if (!pol) continue;
    const def = POLICY_BY_ID[pol.defId];
    ch.monthsInStage++;

    if (ch.descumprida && pol.status !== 'encerrada') {
      const cause = C.acao('descumprimento', 'Descumprimento de decisão judicial');
      L.add('tensao_institucional', 6, cause);
      L.add('pc_credibilidade', -3, cause);
      L.add('relacao_stf', -5, cause);
      L.add('risco_pais', 10, cause);
    }

    if (ch.stage === 'ajuizada' && ch.monthsInStage >= 1) {
      if (rng.chance(liminarProb(ctx, def, pol))) {
        ch.stage = 'liminar_concedida';
        if (!ch.descumprida && (pol.status === 'execucao' || pol.status === 'preparacao')) pol.status = 'suspensa';
        s.pendingDecisions.push({ instanceId: ctx.id('dec'), eventId: 'resposta_liminar', turn: s.turn + 1, context: { challengeId: ch.id, policyId: pol.id, nome: def.nome } });
        ctx.emit('liminar', { challengeId: ch.id, defId: def.id, nome: def.nome, concedida: true }, { importancia: 8 });
      } else {
        ch.stage = 'liminar_negada';
        ctx.emit('liminar', { challengeId: ch.id, defId: def.id, nome: def.nome, concedida: false }, { importancia: 5 });
      }
      ch.monthsInStage = 0;
    } else if ((ch.stage === 'liminar_concedida' || ch.stage === 'liminar_negada') && ch.monthsInStage >= 3) {
      const base = def.fragilidadeJuridica * (ch.stage === 'liminar_concedida' ? 1.4 : 0.5);
      const r = rng.next();
      const conciliada = s.flags[`conciliacao:${ch.id}`] === true;
      ch.resultado = r < clamp(base, 0, 0.9) * (conciliada ? 0.4 : 1) ? 'anulada' : r < clamp(base, 0, 0.9) + 0.15 || conciliada ? 'parcial' : 'mantida';
      ch.stage = 'decidida';
      if (ch.resultado === 'anulada') {
        pol.status = 'encerrada';
        pol.endTurn = s.turn;
      } else {
        if (pol.status === 'suspensa') pol.status = 'execucao';
        if (ch.resultado === 'parcial') pol.eficacia *= 0.7;
      }
      ctx.emit('decisao_judicial', { challengeId: ch.id, defId: def.id, nome: def.nome, resultado: ch.resultado, conciliada }, { importancia: 7 });
    }
  }
}
