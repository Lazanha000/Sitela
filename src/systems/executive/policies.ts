/**
 * Execução de políticas (spec §6.4, §13). Uma política aprovada não é uma
 * política entregue: a taxa de execução do mês é o produto de orçamento,
 * capacidade do órgão, sobrecarga, cooperação federativa, restrições
 * eleitorais e decisões judiciais. Os efeitos são agendados com defasagem.
 */
import { C, type Cause } from '../../simulation/causality/ledger';
import { clamp, scheduleIndicator, type Ctx } from '../../simulation/engine/context';
import type { ActivePolicy, OrgId, RegionId, WorldState } from '../../simulation/state/types';
import { ORGS, REGION_IDS, REGIONS } from '../../content/actors/actors2022';
import { POLICY_BY_ID, isoMonthToTurn, type PolicyDef } from '../../content/policies/policies2022';
import { emptyInputs, type OpinionInputs } from '../opinion/opinion';
import type { CausalValue, EconomyInputs } from '../economy/economy';
import { allocateDiscretionary, DISC_BASE_MENSAL } from '../budget/fiscal';
import { shockGovernors } from '../federation/federation';

export const CAPACIDADE_INICIAL = Object.values(ORGS).reduce((a, o) => a + o.capacidade, 0) / Object.keys(ORGS).length;

export function orgCapacity(s: WorldState, org: OrgId): number {
  return clamp(ORGS[org].capacidade + s.orgs[org] + (s.ind.capacidade_adm - CAPACIDADE_INICIAL), 5, 100);
}

export function policyCause(def: PolicyDef): Cause {
  return C.politica(def.id, def.nome);
}

export interface PolicyStepResult extends EconomyInputs {
  opinionInputs: OpinionInputs;
  /** Despesa primária por categoria de teto. */
  despesas: { cause: Cause; valor: number; categoria: 'discricionaria' | 'obrigatoria_teto' | 'fora_teto' }[];
  receitas: CausalValue[];
  baselineDiscricionario: number;
  compressao: number;
  execucao: { policyInstanceId: string; defId: string; taxa: number; notas: string[]; gasto: number }[];
}

/** Restrições eleitorais por mês (Lei 9.504/97, art. 73). */
export function condutasVedadas(s: WorldState) {
  const t = s.turn;
  return {
    transferenciasVoluntarias: t >= 6 && t <= 9, // 2/jul a 30/out
    contratacoes: t >= 6 && t <= 11, // 3 meses antes até a posse
    publicidade: t >= 6 && t <= 9,
  };
}

function overload(s: WorldState, org: OrgId): number {
  const n = s.policies.filter((p) => (p.status === 'execucao' || p.status === 'preparacao') && POLICY_BY_ID[p.defId].orgao === org).length;
  return Math.max(0, n - 2) * 0.1;
}

/** Fatores não orçamentários da execução, com explicações. */
export function executionFactors(s: WorldState, p: ActivePolicy, def: PolicyDef): { taxa: number; notas: string[] } {
  const notas: string[] = [];
  let taxa = 1;
  if (p.status === 'suspensa') return { taxa: 0, notas: ['Suspensa por decisão judicial liminar.'] };
  const cap = orgCapacity(s, def.orgao);
  const fCap = clamp(1 - def.complexidade * (1 - cap / 100) * 1.2, 0.2, 1);
  if (fCap < 0.98) notas.push(`Capacidade do órgão (${ORGS[def.orgao].label}: ${cap.toFixed(0)}/100) limita a execução a ${(fCap * 100).toFixed(0)}%.`);
  taxa *= fCap;
  const ov = overload(s, def.orgao);
  if (ov > 0) {
    notas.push(`Sobrecarga: muitas iniciativas no mesmo órgão (−${(ov * 100).toFixed(0)}%).`);
    taxa *= 1 - ov;
  }
  if (def.exigeCooperacaoEstadual) {
    const fc = 0.4 + 0.6 * (s.ind.coop_federativa / 100);
    notas.push(`Depende de estados e municípios: cooperação ${s.ind.coop_federativa.toFixed(0)}/100 → ${(fc * 100).toFixed(0)}%.`);
    taxa *= fc;
  }
  const cv = condutasVedadas(s);
  if (def.viaTransferenciaVoluntaria && cv.transferenciasVoluntarias) {
    taxa *= 1 - def.viaTransferenciaVoluntaria;
    notas.push('Condutas vedadas (art. 73, VI): convênios com estados e municípios suspensos até a eleição.');
  }
  if (def.dependeContratacao && cv.contratacoes) {
    taxa *= 1 - def.dependeContratacao;
    notas.push('Contratações vedadas no período eleitoral (art. 73, V).');
  }
  return { taxa: clamp(taxa, 0, 1), notas };
}

function endTurn(def: PolicyDef, p: ActivePolicy): number | undefined {
  if (def.fim) return isoMonthToTurn(def.fim);
  if (def.duracao && p.executionStartTurn !== undefined) return p.executionStartTurn + def.duracao - 1;
  return undefined;
}

export function policyStep(ctx: Ctx): PolicyStepResult {
  const { s, rng } = ctx;
  const res: PolicyStepResult = {
    opinionInputs: emptyInputs(),
    fiscalImpulses: [],
    inflacaoDireta: [],
    leverChanges: [],
    despesas: [],
    receitas: [],
    baselineDiscricionario: 0,
    compressao: 0,
    execucao: [],
  };
  const pibMensal = s.ind.pib_nominal / 12;

  // 1. Transições de status (preparação → execução; término).
  for (const p of s.policies) {
    const def = POLICY_BY_ID[p.defId];
    if (p.status === 'preparacao' && p.executionStartTurn !== undefined && s.turn >= p.executionStartTurn) {
      p.status = 'execucao';
      ctx.emit('politica_inicio', { policyId: p.id, defId: def.id, nome: def.nome }, { importancia: 5 + def.importancia });
      for (const ef of def.efeitos) {
        if (ef.kind === 'governadores') {
          const alivio = p.textoAjustado ? (def.ajusteTexto.alivioFederativo ?? 0) : 0;
          const deltas: Partial<Record<RegionId, number>> = {};
          for (const r of REGION_IDS) deltas[r] = (ef.delta + (ef.regioes?.[r] ?? 0)) * (1 - alivio);
          shockGovernors(ctx, deltas, policyCause(def));
          ctx.emit('reacao_governadores', { defId: def.id, nome: def.nome, delta: ef.delta * (1 - alivio), compensacao: alivio > 0 }, { importancia: 6 });
        }
      }
    }
    if (p.status === 'execucao') {
      const fim = endTurn(def, p);
      if (fim !== undefined && s.turn > fim) {
        p.status = 'encerrada';
        p.endTurn = s.turn;
        ctx.emit('politica_fim', { policyId: p.id, defId: def.id, nome: def.nome, motivo: 'prazo' }, { importancia: 5 });
      }
    }
  }

  // 2. Fatores de execução e demanda por orçamento discricionário.
  const ativos = s.policies.filter((p) => p.status === 'execucao' || p.status === 'suspensa');
  const fatores = new Map<string, { taxa: number; notas: string[] }>();
  const demandas: { id: string; valor: number }[] = [];
  for (const p of ativos) {
    const def = POLICY_BY_ID[p.defId];
    const f = executionFactors(s, p, def);
    if (def.complexidade >= 0.5 && f.taxa > 0) {
      const atraso = def.complexidade * 0.25 * rng.next();
      if (atraso > 0.05) f.notas.push(`Atrasos e gargalos de contratação neste mês (−${(atraso * 100).toFixed(0)}%).`);
      f.taxa *= 1 - atraso;
    }
    fatores.set(p.id, f);
    if (def.financiamento === 'discricionario' && def.custoMensal > 0) demandas.push({ id: p.id, valor: def.custoMensal * p.custoFator * f.taxa });
  }
  const alloc = allocateDiscretionary(s, demandas);
  res.baselineDiscricionario = alloc.baseline;
  res.compressao = alloc.compressao;
  res.despesas.push({ cause: C.dinamica('custeio_base', 'Custeio e investimentos discricionários da LOA'), valor: alloc.baseline, categoria: 'discricionaria' });

  // 3. Execução, gastos e efeitos.
  const novasAlavancas: WorldState['econ']['alavancas'] = {};
  for (const p of ativos) {
    const def = POLICY_BY_ID[p.defId];
    const cause = policyCause(def);
    const f = fatores.get(p.id)!;
    let taxa = f.taxa;
    const notas = [...f.notas];
    let gasto = 0;
    if (def.financiamento === 'discricionario' && def.custoMensal > 0) {
      const frac = alloc.granted[p.id] ?? 0;
      if (frac < 0.98) notas.push(`Orçamento: o remanejamento cobriu ${(frac * 100).toFixed(0)}% do custo (teto e bloqueios limitam).`);
      taxa *= frac;
      gasto = def.custoMensal * p.custoFator * taxa;
      res.despesas.push({ cause, valor: gasto, categoria: 'discricionaria' });
    } else if (def.custoMensal > 0) {
      const inicioMin = def.inicioMinimo ? isoMonthToTurn(def.inicioMinimo) : -1;
      if (s.turn < inicioMin) {
        taxa = 0;
        notas.push(`Começa a vigorar em ${def.inicioMinimo}.`);
      }
      gasto = def.custoMensal * p.custoFator * taxa;
      res.despesas.push({ cause, valor: gasto, categoria: def.financiamento === 'excecao_teto' ? 'fora_teto' : 'obrigatoria_teto' });
    }
    const emVigor = p.status === 'execucao';
    if (def.renunciaMensal > 0 && emVigor) res.receitas.push({ cause, value: -def.renunciaMensal * p.custoFator });

    const efic = p.eficacia;
    for (const ef of def.efeitos) {
      switch (ef.kind) {
        case 'ind':
          if (taxa > 0) scheduleIndicator(ctx, ef.ind, ef.porMes * taxa * efic, s.turn + ef.defasagem, cause, ef.saturaEm);
          break;
        case 'ind_unico':
          if (p.monthsExecuted === 0 && taxa > 0) scheduleIndicator(ctx, ef.ind, ef.valor * efic, s.turn + ef.defasagem, cause);
          break;
        case 'opiniao':
          if (p.monthsExecuted >= ef.defasagem && taxa > 0) {
            for (const [g, v] of Object.entries(ef.grupos)) {
              const key = `${ef.factor}:pol:${def.id}`;
              const cur = res.opinionInputs[g as keyof OpinionInputs][key];
              const val = (v as number) * taxa * efic;
              res.opinionInputs[g as keyof OpinionInputs][key] = { value: (cur?.value ?? 0) + val, label: def.nome };
            }
          }
          break;
        case 'alavanca':
          if (emVigor) novasAlavancas[`${p.id}:${ef.alavanca}`] = { alavanca: ef.alavanca, valor: ef.valor * efic, label: def.nome };
          break;
        case 'receita':
          if (emVigor) res.receitas.push({ cause, value: ef.porMes });
          break;
        case 'inflacao_direta':
          if (emVigor && p.monthsExecuted < ef.meses) res.inflacaoDireta.push({ cause, value: ef.porMes * efic });
          break;
        case 'governadores':
          break;
      }
    }
    if (gasto > 0 && def.multiplicadorDemanda > 0) {
      res.fiscalImpulses.push({ cause, value: (0.06 * def.multiplicadorDemanda * gasto * 100) / pibMensal });
    }
    if (def.renunciaMensal > 0 && emVigor && def.multiplicadorDemanda > 0) {
      res.fiscalImpulses.push({ cause, value: (0.06 * def.multiplicadorDemanda * def.renunciaMensal * 100) / pibMensal });
    }
    p.lastExecution = taxa;
    p.executionNotes = notas;
    p.spentTotal += gasto;
    if (emVigor && (taxa > 0 || def.custoMensal === 0)) p.monthsExecuted++;
    res.execucao.push({ policyInstanceId: p.id, defId: def.id, taxa, notas, gasto });
  }

  // 4. Variações das alavancas (ligar/desligar políticas).
  const prev = s.econ.alavancas;
  const keys = new Set([...Object.keys(prev), ...Object.keys(novasAlavancas)]);
  for (const k of keys) {
    const a = novasAlavancas[k] ?? { ...prev[k], valor: 0 };
    const d = a.valor - (prev[k]?.valor ?? 0);
    if (Math.abs(d) > 1e-9) {
      const defId = s.policies.find((p) => k.startsWith(`${p.id}:`))?.defId;
      const cause = defId ? policyCause(POLICY_BY_ID[defId]) : C.dinamica('alavanca', a.label);
      res.leverChanges.push({ alavanca: a.alavanca, cause, delta: d });
    }
  }
  s.econ.alavancas = novasAlavancas;
  return res;
}

/** Efeitos de anúncio/aprovação (sinalização — spec §4.4 F). */
export function applySignals(ctx: Ctx, def: PolicyDef, list: PolicyDef['aoAnunciar']): void {
  if (!list) return;
  for (const sig of list) ctx.L.add(sig.ind, sig.valor, policyCause(def));
}

export function regionLabel(r: RegionId): string {
  return REGIONS[r].label;
}

export { DISC_BASE_MENSAL };
