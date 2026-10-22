/**
 * Opinião pública multidimensional (spec §17.2–17.3).
 *
 * Cada grupo social tem estoques de opinião por FONTE (inflação, emprego,
 * cada política, cada evento...). Fontes com "alvo" convergem a ele com a
 * velocidade do fator (defasagem); choques de eventos/campanha decaem.
 * Região = mistura de grupos + inclinação política regional + eventos
 * locais. Nacional = média ponderada das regiões. Tudo é linear, então a
 * variação do saldo nacional se decompõe exatamente por fonte.
 */
import { C, type Cause } from '../../simulation/causality/ledger';
import { clamp, type Ctx } from '../../simulation/engine/context';
import type { GroupId, OpinionFactor, RegionId, WorldState } from '../../simulation/state/types';
import { FACTOR_LABELS, GROUP_IDS, REGION_IDS, REGIONS, SENSIBILIDADE, VELOCIDADE_OPINIAO, groupWeights } from '../../content/actors/actors2022';

export type OpinionInputs = Record<GroupId, Record<string, { value: number; label: string }>>;

const DECAY_FACTORS: OpinionFactor[] = ['eventos', 'campanha'];

export function emptyInputs(): OpinionInputs {
  return Object.fromEntries(GROUP_IDS.map((g) => [g, {}])) as unknown as OpinionInputs;
}

/** Alvos derivados das condições materiais (fundamentos). */
export function fundamentalTargets(s: WorldState): OpinionInputs {
  const out = emptyInputs();
  const i = s.ind;
  for (const g of GROUP_IDS) {
    const S = SENSIBILIDADE[g];
    out[g]['inflacao:ipca'] = { value: -S.inflacao * 1.1 * Math.max(0, i.ipca_12m - 3.5), label: 'Inflação acumulada (percepção do custo de vida)' };
    out[g]['emprego:desemprego'] = { value: -S.emprego * 1.3 * (i.desemprego - 8), label: 'Desemprego (percepção)' };
    out[g]['combustiveis:preco'] = { value: -S.combustiveis * 0.3 * (i.combustivel - 100), label: 'Preço dos combustíveis (percepção)' };
    out[g]['servicos:fila'] = { value: -S.servicos * 0.12 * (i.saude_fila - 100), label: 'Filas no SUS (percepção)' };
    out[g]['instituicoes:tensao'] = { value: -S.instituicoes * 0.15 * (i.tensao_institucional - 30), label: 'Conflito entre Poderes (percepção)' };
    out[g]['instituicoes:eleitoral'] = { value: -S.instituicoes * 0.1 * Math.max(0, 70 - i.confianca_eleitoral), label: 'Desconfiança no processo eleitoral' };
    const ambSens = g === 'agro' ? 0.1 : S.ambiente;
    out[g]['ambiente:desmatamento'] = { value: -ambSens * 0.6 * (i.desmatamento_12m / 1000 - 8), label: 'Desmatamento (percepção)' };
  }
  return out;
}

export function groupNet(s: WorldState, g: GroupId): number {
  const gs = s.groups[g];
  let n = gs.base;
  for (const v of Object.values(gs.stocks)) n += v;
  return n;
}

export function groupRegular(s: WorldState, g: GroupId): number {
  return clamp(s.groups[g].regular - 0.15 * (s.ind.polarizacao - 65), 8, 40);
}

export interface RegionOpinion {
  net: number;
  pos: number;
  neg: number;
  reg: number;
}

export function regionalOpinion(s: WorldState): Record<RegionId, RegionOpinion> {
  const nets = Object.fromEntries(GROUP_IDS.map((g) => [g, groupNet(s, g)])) as Record<GroupId, number>;
  const regs = Object.fromEntries(GROUP_IDS.map((g) => [g, groupRegular(s, g)])) as Record<GroupId, number>;
  const out = {} as Record<RegionId, RegionOpinion>;
  for (const r of REGION_IDS) {
    const R = REGIONS[r];
    let net = R.lean + s.regions[r].eventStock;
    let reg = 0;
    for (const g of GROUP_IDS) {
      net += R.mix[g] * nets[g];
      reg += R.mix[g] * regs[g];
    }
    const pos = clamp((100 - reg + net) / 2, 2, 95);
    const neg = clamp(100 - reg - pos, 2, 95);
    out[r] = { net, pos, neg, reg: 100 - pos - neg };
  }
  return out;
}

export function nationalOpinion(s: WorldState): RegionOpinion {
  const reg = regionalOpinion(s);
  const acc = { net: 0, pos: 0, neg: 0, reg: 0 };
  for (const r of REGION_IDS) {
    const p = REGIONS[r].pop;
    acc.net += p * reg[r].net;
    acc.pos += p * reg[r].pos;
    acc.neg += p * reg[r].neg;
    acc.reg += p * reg[r].reg;
  }
  return acc;
}

/** Avaliação líquida por grupo, para exibição. */
export function groupOpinion(s: WorldState, g: GroupId): RegionOpinion {
  const net = groupNet(s, g);
  const reg = groupRegular(s, g);
  const pos = clamp((100 - reg + net) / 2, 2, 95);
  const neg = clamp(100 - reg - pos, 2, 95);
  return { net, pos, neg, reg: 100 - pos - neg };
}

function causeForKey(s: WorldState, key: string): Cause {
  const [factor, ...rest] = key.split(':');
  const src = rest.join(':');
  const label = s.opinionLabels[key] ?? FACTOR_LABELS[factor as OpinionFactor] ?? key;
  if (src.startsWith('pol:')) return { id: src, label, kind: 'politica', controlavel: true };
  if (src.startsWith('acao:')) return { id: src, label, kind: 'acao', controlavel: true };
  if (src.startsWith('ev:')) return { id: src, label, kind: 'evento', controlavel: false };
  if (src.startsWith('ext:')) return { id: src, label, kind: 'choque_externo', controlavel: false };
  return C.dinamica(`op:${key}`, label);
}

/** Etapa de opinião do turno. `policyInputs` vem da execução de políticas. */
export function opinionStep(ctx: Ctx, policyInputs: OpinionInputs): void {
  const { s } = ctx;
  const w = groupWeights();
  const fund = fundamentalTargets(s);
  const contrib = new Map<string, { cause: Cause; delta: number }>();
  const addContrib = (cause: Cause, delta: number) => {
    const c = contrib.get(cause.id);
    if (c) c.delta += delta;
    else contrib.set(cause.id, { cause, delta });
  };
  const before = nationalOpinion(s);

  // 1. Convergência dos estoques aos alvos (defasagem) e decaimento de choques.
  for (const g of GROUP_IDS) {
    const stocks = s.groups[g].stocks;
    const targets = { ...fund[g], ...policyInputs[g] };
    for (const [key, t] of Object.entries(targets)) if (!s.opinionLabels[key]) s.opinionLabels[key] = t.label;
    const keys = new Set([...Object.keys(stocks), ...Object.keys(targets)]);
    for (const key of keys) {
      const factor = key.split(':')[0] as OpinionFactor;
      const cur = stocks[key] ?? 0;
      const speed = VELOCIDADE_OPINIAO[factor] ?? 0.2;
      const target = DECAY_FACTORS.includes(factor) ? 0 : (targets[key]?.value ?? 0);
      const delta = speed * (target - cur);
      const next = cur + delta;
      if (Math.abs(next) < 0.02 && !(key in targets)) delete stocks[key];
      else stocks[key] = next;
      if (delta !== 0) addContrib(causeForKey(s, key), w[g] * delta);
    }
  }

  // 2. Choques agendados para este turno (eventos, campanha, regiões).
  const due = s.pendingEffects.filter((e) => e.dueTurn <= s.turn && (e.target.kind === 'opinion' || e.target.kind === 'region'));
  for (const e of due) {
    const cause: Cause = { id: e.causeId, label: e.causeLabel, kind: e.causeKind === 'politica' ? 'politica' : e.causeKind, controlavel: e.causeKind === 'politica' };
    if (e.target.kind === 'opinion') {
      const factor = e.target.factor;
      const key = `${factor}:${e.causeId}`;
      s.opinionLabels[key] = e.causeLabel;
      for (const [g, v] of Object.entries(e.target.groups) as [GroupId, number][]) {
        const d = v * e.delta * SENSIBILIDADE[g][factor];
        s.groups[g].stocks[key] = (s.groups[g].stocks[key] ?? 0) + d;
        addContrib(cause, w[g] * d);
      }
    } else if (e.target.kind === 'region') {
      s.regions[e.target.region].eventStock += e.delta;
      addContrib(cause, REGIONS[e.target.region].pop * e.delta);
    }
  }
  s.pendingEffects = s.pendingEffects.filter((e) => !due.includes(e));

  // 3. Decaimento de choques regionais.
  const decayCause = C.dinamica('op:decaimento_regional', 'Memória de acontecimentos regionais se dissipa');
  for (const r of REGION_IDS) {
    const d = -0.2 * s.regions[r].eventStock;
    s.regions[r].eventStock += d;
    addContrib(decayCause, REGIONS[r].pop * d);
  }

  // 4. Agregação e registro causal.
  const after = nationalOpinion(s);
  const parts = [...contrib.values()].filter((c) => Math.abs(c.delta) > 1e-6);
  ctx.L.setDerived('aval_saldo', after.net, parts, C.dinamica('op:residuo', 'Interações e arredondamento'));
  // Ótimo/bom e ruim/péssimo: metade de cada contribuição ao saldo; o
  // resto vem da variação da parcela "regular" (polarização).
  const regCause = C.dinamica('op:regular', 'Variação da parcela "regular" (polarização)');
  ctx.L.setDerived('aval_positiva', after.pos, parts.map((p) => ({ cause: p.cause, delta: p.delta / 2 })), regCause);
  ctx.L.setDerived('aval_negativa', after.neg, parts.map((p) => ({ cause: p.cause, delta: -p.delta / 2 })), regCause);
  void before;
}

/** Calibra bases para reproduzir o saldo inicial informado. */
export function calibrateInitialOpinion(s: WorldState, saldoAlvo: number, perfil: Record<GroupId, number>): void {
  const w = groupWeights();
  const fund = fundamentalTargets(s);
  let L = 0;
  for (const r of REGION_IDS) L += REGIONS[r].pop * REGIONS[r].lean;
  let wp = 0;
  for (const g of GROUP_IDS) wp += w[g] * perfil[g];
  const shift = saldoAlvo - L - wp;
  for (const g of GROUP_IDS) {
    let sum = 0;
    s.groups[g].stocks = {};
    for (const [key, t] of Object.entries(fund[g])) {
      s.groups[g].stocks[key] = t.value;
      s.opinionLabels[key] = t.label;
      sum += t.value;
    }
    s.groups[g].base = perfil[g] + shift - sum;
  }
}
