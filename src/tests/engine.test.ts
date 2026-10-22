/**
 * Testes do motor (spec §26.1) e de causalidade (spec §26.2).
 */
import { describe, expect, it } from 'vitest';
import { newCampaign } from '../simulation/engine/newCampaign';
import { advanceTurn } from '../simulation/engine/turn';
import { applyAction, type PlayerAction } from '../simulation/engine/actions';
import type { WorldState } from '../simulation/state/types';
import { turnToDate } from '../simulation/time/calendar';
import { estimateVote, blocDisposition } from '../systems/congress/congress';
import { POLICY_BY_ID } from '../content/policies/policies2022';
import { checkLaunch } from '../systems/executive/launch';

function run(seed: string, turns: number, actions: Record<number, PlayerAction[]> = {}): WorldState {
  let s = newCampaign({ seed });
  for (let t = 0; t < turns && s.status !== 'encerrada'; t++) {
    for (const a of actions[t] ?? []) {
      const r = applyAction(s, a);
      if (r.erro) throw new Error(`${a.type}: ${r.erro}`);
      s = r.state;
    }
    s = advanceTurn(s);
  }
  return s;
}

const act = (s: WorldState, a: PlayerAction) => {
  const r = applyAction(s, a);
  if (r.erro) throw new Error(r.erro);
  return r.state;
};

describe('início e relógio', () => {
  it('nova campanha começa em janeiro de 2022, independentemente do relógio do sistema', () => {
    const s = newCampaign({ seed: 'x' });
    expect(s.turn).toBe(0);
    expect(turnToDate(s.turn)).toEqual({ year: 2022, month: 1 });
    expect(turnToDate(-1)).toEqual({ year: 2021, month: 12 });
    expect(turnToDate(12)).toEqual({ year: 2023, month: 1 });
    expect(s.status).toBe('em_andamento');
    expect(s.ind.selic).toBe(9.25);
    expect(s.ind.ipca_12m).toBeCloseTo(10.06, 2);
  });

  it('a folga inicial do teto é coerente com a do fechamento de janeiro (regressão)', () => {
    const s0 = newCampaign({ seed: 'teto' });
    const s1 = advanceTurn(s0);
    expect(Math.abs(s1.ind.teto_folga - s0.ind.teto_folga)).toBeLessThan(2);
  });

  it('a campanha termina após dezembro de 2022 (posse em 1º/jan/2023)', () => {
    const s = run('fim', 20);
    expect(s.turn).toBe(12);
    expect(s.status).toBe('encerrada');
    expect(s.election.rounds.length).toBeGreaterThan(0);
  });
});

describe('determinismo (spec §4.7)', () => {
  const acoes: Record<number, PlayerAction[]> = {
    0: [{ type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' }],
    1: [{ type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'MP' }],
  };
  it('mesmo estado, ações e semente produzem o mesmo resultado', () => {
    const a = run('seed-1', 6, acoes);
    const b = run('seed-1', 6, acoes);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
  it('sementes diferentes produzem trajetórias diferentes', () => {
    const a = run('seed-1', 4);
    const b = run('seed-2', 4);
    expect(a.ind.cambio).not.toEqual(b.ind.cambio);
  });
  it('avançar turno não altera o estado anterior (função pura)', () => {
    const s = newCampaign({ seed: 'puro' });
    const antes = JSON.stringify(s);
    advanceTurn(s);
    expect(JSON.stringify(s)).toEqual(antes);
  });
});

describe('livro-razão causal (spec §4.6)', () => {
  it('a decomposição reconcilia exatamente a variação de cada indicador', () => {
    const s = run('razao', 8, { 0: [{ type: 'lancar_politica', defId: 'obras_retomada', instrumento: 'decreto' }] });
    for (const r of s.reports) {
      for (const d of r.deltas) {
        const soma = d.contributions.reduce((a, c) => a + c.delta, 0);
        expect(Math.abs(soma - (d.after - d.before))).toBeLessThan(1e-6);
      }
    }
  });

  it('choques externos ficam registrados separados das decisões do governo', () => {
    const s = run('ext', 3);
    const brent = s.reports[2].deltas.find((d) => d.ind === 'brent')!;
    expect(brent.contributions.every((c) => c.kind === 'choque_externo' && !c.controlavel)).toBe(true);
  });
});

describe('políticas e execução', () => {
  it('cada política é aplicada uma única vez por turno', () => {
    const s = run('uma-vez', 3, { 0: [{ type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' }] });
    for (const r of s.reports) {
      const n = r.execucao.filter((e) => e.defId === 'mutirao_saude').length;
      expect(n).toBeLessThanOrEqual(1);
    }
    const rep = s.reports[2];
    const gastos = rep.deltas.find((d) => d.ind === 'despesa_mes')!.contributions.filter((c) => c.causeId === 'pol:mutirao_saude');
    expect(gastos.length).toBe(1);
  });

  it('efeitos defasados ocorrem no período correto', () => {
    // Decreto em jan (prep. 1) → execução a partir de fev (t=1); efeito na fila com defasagem 2 → abr (t=3).
    const s = run('defasagem', 5, { 0: [{ type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' }] });
    const temEfeito = (t: number) => (s.reports[t].deltas.find((d) => d.ind === 'saude_fila')?.contributions ?? []).some((c) => c.causeId === 'pol:mutirao_saude');
    expect(temEfeito(1)).toBe(false);
    expect(temEfeito(2)).toBe(false);
    expect(temEfeito(3)).toBe(true);
  });

  it('obra financiada não produz efeitos antes de ser executada', () => {
    const s = run('obra', 2, { 0: [{ type: 'lancar_politica', defId: 'obras_retomada', instrumento: 'decreto' }] });
    // preparação de 2 meses: nada executado em jan e fev
    expect(s.reports.every((r) => r.execucao.every((e) => e.defId !== 'obras_retomada'))).toBe(true);
    expect(s.policies.find((p) => p.defId === 'obras_retomada')!.spentTotal).toBe(0);
  });

  it('política sem orçamento suficiente não executa integralmente', () => {
    let s = newCampaign({ seed: 'orcamento' });
    s = act(s, { type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' });
    s = advanceTurn(s);
    s = structuredClone(s);
    s.fiscal.bloqueio = s.fiscal.discricionarioAno - s.fiscal.discricionarioGasto - 1; // quase nada disponível
    s = advanceTurn(s);
    const exe = s.reports[1].execucao.find((e) => e.defId === 'mutirao_saude')!;
    expect(exe.taxa).toBeLessThan(0.5);
    expect(exe.notas.some((n) => n.startsWith('Orçamento'))).toBe(true);
  });

  it('política que exige cooperação local respeita a cooperação dos estados', () => {
    const taxa = (coop: number) => {
      let s = newCampaign({ seed: 'coop' });
      s = act(s, { type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' });
      s = advanceTurn(s);
      s = structuredClone(s);
      s.ind.coop_federativa = coop;
      for (const r of Object.values(s.regions)) r.governadores.cooperacao = coop;
      s = advanceTurn(s);
      return s.reports[1].execucao.find((e) => e.defId === 'mutirao_saude')!;
    };
    const baixa = taxa(0);
    const alta = taxa(100);
    expect(baixa.taxa).toBeLessThan(alta.taxa);
    expect(baixa.notas.some((n) => n.includes('estados e municípios'))).toBe(true);
  });

  it('medida suspensa por liminar não continua sendo executada', () => {
    let s = newCampaign({ seed: 'liminar' });
    s = act(s, { type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' });
    s = advanceTurn(s);
    s = structuredClone(s);
    const pol = s.policies.find((p) => p.defId === 'mutirao_saude')!;
    s.challenges.push({ id: 'adi-teste', policyInstanceId: pol.id, autor: 'teste', fundamento: 'teste', stage: 'liminar_concedida', filedTurn: 0, monthsInStage: 0, descumprida: false });
    pol.status = 'suspensa';
    s = advanceTurn(s);
    const exe = s.reports[1].execucao.find((e) => e.defId === 'mutirao_saude')!;
    expect(exe.taxa).toBe(0);
    expect(exe.gasto).toBe(0);
  });

  it('despesa recorrente permanece no orçamento enquanto a política está ativa', () => {
    const s = run('recorrente', 5, { 0: [{ type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' }] });
    for (const t of [1, 2, 3, 4]) expect(s.reports[t].execucao.find((e) => e.defId === 'mutirao_saude')!.gasto).toBeGreaterThan(0);
  });

  it('renúncia tributária só afeta a receita quando a medida está em vigor', () => {
    const s = run('renuncia', 3, { 1: [{ type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'MP' }] });
    const temRenuncia = (t: number) => (s.reports[t].deltas.find((d) => d.ind === 'receita_mes')?.contributions ?? []).some((c) => c.causeId === 'pol:diesel_pis_cofins' && c.delta < 0);
    expect(temRenuncia(0)).toBe(false);
    expect(temRenuncia(1)).toBe(true);
  });

  it('restrição legal de ano eleitoral bloqueia ampliação de benefício e indica o caminho', () => {
    const s = newCampaign({ seed: 'lei' });
    const chk = checkLaunch(s, 'auxilio_permanente', 'MP');
    expect(chk.ok).toBe(false);
    expect(chk.erros.join(' ')).toMatch(/PEC/);
  });
});

describe('Congresso', () => {
  it('PEC não é aprovada sem 3/5 dos votos', () => {
    let s = newCampaign({ seed: 'pec' });
    s = act(s, { type: 'lancar_politica', defId: 'pec_emergencia', instrumento: 'PEC' });
    s = structuredClone(s);
    for (const b of Object.values(s.blocs)) b.relacao = 0;
    const bill = s.bills.find((b) => b.policyId === 'pec_emergencia')!;
    bill.stage = 'plenario_senado';
    bill.apoioNegociado = { ideologicos: -6, centrao: -6, centro: -6, oposicao: -6 };
    bill.votacaoSolicitada = true;
    s.presidentes.senado.relacao = 100;
    for (let k = 0; k < 4 && bill.votos.length === 0; k++) {
      const next = advanceTurn(s);
      const b2 = next.bills.find((b) => b.id === bill.id)!;
      if (b2.votos.length) {
        expect(b2.votos[0].aprovado).toBe(false);
        expect(b2.votos[0].exigido).toBe(49);
        expect(b2.stage).toBe('rejeitado');
        return;
      }
      s = structuredClone(s);
      s.bills.find((b) => b.id === bill.id)!.votacaoSolicitada = true;
      s.rng = next.rng;
    }
    throw new Error('votação não ocorreu');
  });

  it('MP perde a validade se não for votada em 120 dias', () => {
    const s = run('mp', 6, { 0: [{ type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'MP' }] });
    const bill = s.bills.find((b) => b.policyId === 'diesel_pis_cofins')!;
    expect(bill.stage).toBe('caducou');
    expect(s.policies.find((p) => p.defId === 'diesel_pis_cofins')!.status).not.toBe('execucao');
  });

  it('mudança de popularidade não altera automaticamente todos os votos', () => {
    let s = newCampaign({ seed: 'pop' });
    s = act(s, { type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'PLP' });
    const bill = s.bills.find((b) => b.policyId === 'diesel_pis_cofins')!;
    const def = POLICY_BY_ID.diesel_pis_cofins;
    const alto = structuredClone(s);
    alto.ind.aval_positiva = 60;
    const op1 = blocDisposition(s, bill, def, 'oposicao', 'camara').logit;
    const op2 = blocDisposition(alto, bill, def, 'oposicao', 'camara').logit;
    const ce1 = blocDisposition(s, bill, def, 'centrao', 'camara').logit;
    const ce2 = blocDisposition(alto, bill, def, 'centrao', 'camara').logit;
    expect(op2).toBeCloseTo(op1, 6);
    expect(ce2).toBeGreaterThan(ce1);
    expect(estimateVote(alto, { ...bill, stage: 'plenario_camara' })).not.toBeNull();
  });
});

describe('instituições autônomas', () => {
  it('decisão presidencial não controla diretamente a Selic', () => {
    let s = newCampaign({ seed: 'bc' });
    const selic = s.ind.selic;
    s = act(s, { type: 'acao_politica', acaoId: 'criticar_bc' });
    expect(s.ind.selic).toBe(selic);
    s = advanceTurn(s);
    const sel = s.reports[0].deltas.find((d) => d.ind === 'selic');
    for (const c of sel?.contributions ?? []) expect(c.causeId).toBe('inst:copom');
  });
});

describe('território e eventos', () => {
  it('estiagem no Sul afeta a região exposta, não as demais', () => {
    let s = newCampaign({ seed: 'seca' });
    s = advanceTurn(s); // efeito regional agendado para fev
    s = structuredClone(s);
    const before = Object.fromEntries(Object.entries(s.regions).map(([k, r]) => [k, r.eventStock]));
    s = advanceTurn(s);
    const sul = s.reports[1].deltas.find((d) => d.ind === 'aval_saldo')!.contributions.find((c) => c.causeId === 'ext:estiagem');
    expect(sul).toBeDefined();
    expect(s.regions.S.eventStock).toBeLessThan(before.S as number);
  });

  it('notícias de votação usam o placar real da votação simulada', () => {
    let found = false;
    for (const seed of ['n1', 'n2', 'n3']) {
      let s = newCampaign({ seed });
      s = act(s, { type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'PLP' });
      for (let t = 0; t < 6; t++) {
        for (const b of s.bills) if (b.origem === 'jogador' && b.stage.startsWith('plenario') && !b.votacaoSolicitada) s = act(s, { type: 'pautar', billId: b.id });
        s = advanceTurn(s);
      }
      const bill = s.bills.find((b) => b.policyId === 'diesel_pis_cofins')!;
      for (const v of bill.votos) {
        const n = s.news.find((x) => x.titulo.includes('diesel') && x.linha_fina.includes(`${v.sim} a ${v.nao}`));
        expect(n).toBeDefined();
        found = true;
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });
});
