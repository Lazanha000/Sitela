/**
 * Ações do jogador. Cada ação é validada contra o estado e devolve um NOVO
 * estado (o anterior não é mutado). Efeitos imediatos entram no livro-razão
 * do turno corrente; o restante é resolvido no fechamento do mês.
 */
import type { Instrumento } from '../../content/policies/policies2022';
import { POLICY_BY_ID } from '../../content/policies/policies2022';
import { ACAO_BY_ID, usosNoMes } from '../../content/actions/acoes2022';
import { applyTactic, isActiveBill, isPlenario } from '../../systems/congress/congress';
import { resolveDecision } from '../../systems/events/events';
import { launchPolicy } from '../../systems/executive/launch';
import { C } from '../causality/ledger';
import type { RegionId, Tactic, WorldState } from '../state/types';
import { makeCtx } from './context';

export type PlayerAction =
  | { type: 'lancar_politica'; defId: string; instrumento: Instrumento }
  | { type: 'negociar'; billId: string; tatica: Tactic }
  | { type: 'pautar'; billId: string }
  | { type: 'retirar'; billId: string }
  | { type: 'encerrar_politica'; policyInstanceId: string }
  | { type: 'decidir_evento'; instanceId: string; optionId: string }
  | { type: 'acao_politica'; acaoId: string; regiao?: RegionId };

export interface ActionResult {
  state: WorldState;
  erro?: string;
  mensagem?: string;
}

export function applyAction(prev: WorldState, action: PlayerAction): ActionResult {
  if (prev.status === 'encerrada') return { state: prev, erro: 'A campanha está encerrada.' };
  const s = structuredClone(prev);
  const ctx = makeCtx(s, s.pendingLedger, s.pendingOcorrencias);
  let erro: string | null | undefined = null;
  let descricao = '';

  switch (action.type) {
    case 'lancar_politica': {
      const r = launchPolicy(ctx, action.defId, action.instrumento);
      erro = r.erro;
      descricao = `Lançou "${POLICY_BY_ID[action.defId]?.nome}" (${action.instrumento})`;
      break;
    }
    case 'negociar': {
      const bill = s.bills.find((b) => b.id === action.billId);
      erro = bill ? applyTactic(ctx, bill, action.tatica) : 'Proposta não encontrada.';
      descricao = `Negociação (${action.tatica}) em "${bill ? POLICY_BY_ID[bill.policyId].nome : '?'}"`;
      break;
    }
    case 'pautar': {
      const bill = s.bills.find((b) => b.id === action.billId);
      if (!bill || !isActiveBill(bill)) erro = 'Proposta não encontrada.';
      else if (!isPlenario(bill.stage)) erro = 'A proposta ainda não está pronta para o plenário.';
      else if (bill.votacaoSolicitada) erro = 'A votação já foi solicitada neste mês.';
      else if (s.ind.pc_negociacao < 2) erro = 'Capacidade de negociação insuficiente.';
      else {
        bill.votacaoSolicitada = true;
        ctx.L.add('pc_negociacao', -2, C.acao('pautar', 'Articulação para pautar votação'));
      }
      descricao = `Pediu votação de "${bill ? POLICY_BY_ID[bill.policyId].nome : '?'}"`;
      break;
    }
    case 'retirar': {
      const bill = s.bills.find((b) => b.id === action.billId);
      if (!bill || !isActiveBill(bill)) erro = 'Proposta não encontrada.';
      else if (bill.type === 'MP') erro = 'Uma MP editada não pode ser retirada; só revogada por outra MP ou rejeitada pelo Congresso.';
      else if (bill.origem === 'historico') erro = 'Proposta de autoria parlamentar: o Executivo pode deixar de apoiá-la, mas não retirá-la.';
      else {
        bill.stage = 'retirado';
        const pol = s.policies.find((p) => p.billId === bill.id);
        if (pol) {
          pol.status = 'encerrada';
          pol.endTurn = s.turn;
        }
        ctx.L.add('pc_credibilidade', -1, C.acao('retirar', 'Retirada de proposta'));
        ctx.emit('retirada', { billId: bill.id, defId: bill.policyId, nome: POLICY_BY_ID[bill.policyId].nome }, { importancia: 4 });
      }
      descricao = `Retirou "${bill ? POLICY_BY_ID[bill.policyId].nome : '?'}"`;
      break;
    }
    case 'encerrar_politica': {
      const pol = s.policies.find((p) => p.id === action.policyInstanceId);
      if (!pol || !['execucao', 'preparacao', 'suspensa'].includes(pol.status)) erro = 'Política não está em execução.';
      else if (pol.billId && s.bills.find((b) => b.id === pol.billId && b.type !== 'MP' && b.stage === 'aprovado')) erro = 'Política aprovada em lei: encerrá-la exige nova lei (não disponível na v0.1).';
      else {
        pol.status = 'encerrada';
        pol.endTurn = s.turn;
        ctx.emit('politica_fim', { policyId: pol.id, defId: pol.defId, nome: POLICY_BY_ID[pol.defId].nome, motivo: 'decisao' }, { importancia: 5 });
      }
      descricao = `Encerrou "${pol ? POLICY_BY_ID[pol.defId].nome : '?'}"`;
      break;
    }
    case 'decidir_evento': {
      erro = resolveDecision(ctx, action.instanceId, action.optionId);
      descricao = `Decidiu evento (${action.optionId})`;
      break;
    }
    case 'acao_politica': {
      const def = ACAO_BY_ID[action.acaoId];
      if (!def) erro = 'Ação desconhecida.';
      else {
        erro = def.disponivel(s);
        if (!erro && usosNoMes(s, def.id) >= def.limiteMensal) erro = 'Limite mensal desta ação atingido.';
        if (!erro && s.ind.pc_negociacao < def.custoNegociacao) erro = `Capacidade de negociação insuficiente (precisa de ${def.custoNegociacao}).`;
        if (!erro && def.precisaRegiao && !action.regiao) erro = 'Escolha uma região.';
        if (!erro) {
          def.aplicar(ctx, action.regiao);
          if (def.custoNegociacao > 0) ctx.L.add('pc_negociacao', -def.custoNegociacao, C.acao(def.id, def.nome));
          s.flags[`acao:${def.id}:${s.turn}`] = usosNoMes(s, def.id) + 1;
          ctx.emit('acao_politica', { acaoId: def.id, nome: def.nome, regiao: action.regiao }, { importancia: 3 });
        }
      }
      descricao = `Ação: ${def?.nome ?? action.acaoId}${action.regiao ? ` (${action.regiao})` : ''}`;
      break;
    }
  }

  if (erro) return { state: prev, erro };
  const entry = { turn: s.turn, descricao, acao: action };
  s.currentActions.push(entry);
  return { state: s, mensagem: descricao };
}
