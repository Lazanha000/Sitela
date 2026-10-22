/**
 * Lançamento de políticas: verificação de competência/instrumento,
 * restrições legais, agenda limitada e custo político (spec §6.1–6.2).
 */
import type { Ctx } from '../../simulation/engine/context';
import type { ActivePolicy, WorldState } from '../../simulation/state/types';
import { POLICY_BY_ID, type Instrumento, type PolicyDef } from '../../content/policies/policies2022';
import { applySignals } from './policies';
import { createBill } from '../congress/congress';
import { maybeChallenge } from '../judiciary/judiciary';
import { DISC_BASE_MENSAL } from '../budget/fiscal';

export const LAUNCH_COST: Record<Instrumento, number> = { PEC: 10, PLP: 6, PL: 5, MP: 6, decreto: 3, ato_gestao: 4 };
export const AGENDA_MAX = 4;

export interface LaunchCheck {
  ok: boolean;
  erros: string[];
  avisos: string[];
  custoNegociacao: number;
}

export function agendaEmUso(s: WorldState): number {
  return s.policies.filter((p) => (p.status === 'tramitando' || p.status === 'preparacao') && !POLICY_BY_ID[p.defId].inicial).length;
}

export function policyInCourse(s: WorldState, defId: string): ActivePolicy | undefined {
  return s.policies.find((p) => p.defId === defId && !['encerrada', 'rejeitada'].includes(p.status));
}

export function checkLaunch(s: WorldState, defId: string, instrumento: Instrumento): LaunchCheck {
  const erros: string[] = [];
  const avisos: string[] = [];
  const def: PolicyDef | undefined = POLICY_BY_ID[defId];
  const custo = LAUNCH_COST[instrumento] ?? 5;
  if (!def) return { ok: false, erros: ['Política desconhecida.'], avisos, custoNegociacao: custo };
  if (s.status === 'encerrada') erros.push('A campanha está encerrada.');
  if (def.inicial) erros.push('Esta proposta já tramita no Congresso; acompanhe-a na seção Congresso.');
  if (!def.instrumentos.some((x) => x.tipo === instrumento)) erros.push('Instrumento jurídico inadequado para esta medida.');
  if (policyInCourse(s, defId)) erros.push('Já existe uma iniciativa desta política em curso.');
  const r = def.restricao?.(s, instrumento);
  if (r) erros.push(r);
  if (['PL', 'PLP', 'PEC', 'MP'].includes(instrumento) && agendaEmUso(s) >= AGENDA_MAX)
    erros.push(`Agenda saturada: o governo já conduz ${AGENDA_MAX} iniciativas em tramitação ou preparação. Conclua ou retire alguma.`);
  if (s.ind.pc_negociacao < custo) erros.push(`Capacidade de negociação insuficiente (precisa de ${custo}, há ${s.ind.pc_negociacao.toFixed(0)}).`);

  if (instrumento === 'MP') avisos.push('MP tem vigência imediata, mas perde a validade em 120 dias (≈ 4 meses) se não for votada nas duas Casas.');
  if (instrumento === 'PEC') avisos.push('PEC exige 3/5 em dois turnos na Câmara (308) e no Senado (49). Tramitação longa.');
  if (def.financiamento === 'discricionario' && def.custoMensal > 0) {
    const resto = s.fiscal.discricionarioAno - s.fiscal.bloqueio - s.fiscal.discricionarioGasto;
    const meses = 12 - (s.turn % 12);
    avisos.push(`Financiada por remanejamento: cada R$ 1 desta política sai do custeio de outras áreas (há ≈ R$ ${(resto - DISC_BASE_MENSAL * meses).toFixed(1)} bi livres além do custeio-base no ano).`);
  }
  if (def.financiamento === 'obrigatoria_teto') avisos.push('Despesa obrigatória sujeita ao teto: se a projeção ultrapassar o limite, o relatório bimestral bloqueará discricionárias.');
  if (def.renunciaMensal > 0) avisos.push(`Renúncia de receita de ≈ R$ ${def.renunciaMensal.toFixed(1)} bi/mês piora o resultado primário.`);
  if (def.riscoJudicial >= 0.4) avisos.push(`Risco elevado de contestação judicial (${def.autorContestacao}).`);
  if (def.exigeCooperacaoEstadual) avisos.push('A execução depende da cooperação de estados e municípios.');
  if (s.turn >= 6 && s.turn <= 9) avisos.push('Período eleitoral: o Congresso se esvazia e a pauta anda mais devagar.');
  if (s.election.resultado === 'derrotado' || s.election.resultado === 'sucessor_derrotado') avisos.push('Governo em fim de mandato após derrota eleitoral: baixa disposição do Congresso.');
  return { ok: erros.length === 0, erros, avisos, custoNegociacao: custo };
}

export function launchPolicy(ctx: Ctx, defId: string, instrumento: Instrumento): { erro?: string; policy?: ActivePolicy } {
  const { s } = ctx;
  const chk = checkLaunch(s, defId, instrumento);
  if (!chk.ok) return { erro: chk.erros.join(' ') };
  const def = POLICY_BY_ID[defId];
  const pol: ActivePolicy = {
    id: ctx.id('pol'),
    defId,
    instrument: instrumento,
    status: 'tramitando',
    launchedTurn: s.turn,
    eficacia: 1,
    custoFator: 1,
    lastExecution: 0,
    textoAjustado: false,
    executionNotes: [],
    spentTotal: 0,
    monthsExecuted: 0,
  };
  s.policies.push(pol);
  if (instrumento === 'decreto' || instrumento === 'ato_gestao') {
    pol.status = 'preparacao';
    pol.executionStartTurn = s.turn + def.preparacao;
    maybeChallenge(ctx, pol, def);
  } else {
    const bill = createBill(ctx, pol.id, def, instrumento);
    pol.billId = bill.id;
    if (instrumento === 'MP') {
      pol.status = 'preparacao';
      pol.executionStartTurn = s.turn + def.preparacao;
      maybeChallenge(ctx, pol, def);
    }
  }
  ctx.L.add('pc_negociacao', -chk.custoNegociacao, { id: `acao:lancar:${defId}`, label: `Lançamento: ${def.nome}`, kind: 'acao', controlavel: true });
  applySignals(ctx, def, def.aoAnunciar);
  ctx.emit('politica_lancada', { policyId: pol.id, defId, nome: def.nome, instrumento }, { importancia: 5 + def.importancia });
  return { policy: pol };
}
