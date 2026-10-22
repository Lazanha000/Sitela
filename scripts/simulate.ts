/**
 * Roda uma campanha inteira sem interface e imprime a trajetória mensal.
 * Uso: npm run simulate -- [semente] [estrategia]
 * Estratégias: passiva | historica (aproxima as decisões reais de 2022)
 */
import { newCampaign } from '../src/simulation/engine/newCampaign';
import { advanceTurn } from '../src/simulation/engine/turn';
import { applyAction, type PlayerAction } from '../src/simulation/engine/actions';
import type { WorldState } from '../src/simulation/state/types';
import { shortLabel, turnToDate } from '../src/simulation/time/calendar';

const seed = process.argv[2] ?? 'brasil-2022';
const estrategia = process.argv[3] ?? 'passiva';

function act(s: WorldState, a: PlayerAction): WorldState {
  const r = applyAction(s, a);
  if (r.erro) console.log(`  [erro] ${a.type}: ${r.erro}`);
  return r.state;
}

let s = newCampaign({ seed });
const f = (v: number, c = 1) => v.toFixed(c).padStart(7);
console.log('mês     pib12   ipca12  ipcaM  selic  câmbio desemp  comb  hiato  ót/bom ruim  saldo  prim.ano  div/pib folga  negoc cred  risco');
while (s.status !== 'encerrada') {
  if (estrategia === 'historica') {
    const t = s.turn;
    const pautar = () => { for (const b of s.bills) if (b.origem === 'jogador' && (b.stage === 'plenario_camara' || b.stage === 'plenario_senado') && !b.votacaoSolicitada) s = act(s, { type: 'pautar', billId: b.id }); };
    if (t === 1) s = act(s, { type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'PLP' });
    if (t === 2) s = act(s, { type: 'lancar_politica', defId: 'petrobras_comando', instrumento: 'ato_gestao' });
    if (t === 3) s = act(s, { type: 'lancar_politica', defId: 'icms_essenciais', instrumento: 'PLP' });
    if (t === 4) s = act(s, { type: 'lancar_politica', defId: 'pec_emergencia', instrumento: 'PEC' });
    if (t >= 2) pautar();
    if (t >= 7 && t <= 8) { s = act(s, { type: 'acao_politica', acaoId: 'campanha_propositiva' }); s = act(s, { type: 'acao_politica', acaoId: 'campanha_regiao', regiao: 'SE' }); }
  }
  if (estrategia === 'ativa') {
    const t = s.turn;
    const tentar = (a: PlayerAction) => { const r = applyAction(s, a); if (!r.erro) s = r.state; };
    if (t === 0) { tentar({ type: 'acao_politica', acaoId: 'reuniao_lideres' }); tentar({ type: 'lancar_politica', defId: 'mutirao_saude', instrumento: 'decreto' }); }
    if (t === 1) tentar({ type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'PLP' });
    if (t === 3) tentar({ type: 'lancar_politica', defId: 'icms_essenciais', instrumento: 'PLP' });
    if (t === 4) tentar({ type: 'lancar_politica', defId: 'pec_emergencia', instrumento: 'PEC' });
    for (const b of s.bills) {
      if (b.origem !== 'jogador' || ['aprovado', 'rejeitado', 'caducou', 'retirado'].includes(b.stage)) continue;
      if (b.stage.startsWith('plenario')) tentar({ type: 'pautar', billId: b.id });
      if (b.policyId === 'icms_essenciais' && !b.taticasUsadas.includes('ajustar_texto')) tentar({ type: 'negociar', billId: b.id, tatica: 'ajustar_texto' });
      if (!b.taticasUsadas.includes('dialogo')) tentar({ type: 'negociar', billId: b.id, tatica: 'dialogo' });
      if (b.stage.startsWith('plenario') && !b.taticasUsadas.includes('emendas')) tentar({ type: 'negociar', billId: b.id, tatica: 'emendas' });
    }
    if (t < 6) tentar({ type: 'acao_politica', acaoId: 'pronunciamento' });
    if (t >= 7 && t <= 9) { tentar({ type: 'acao_politica', acaoId: 'campanha_propositiva' }); tentar({ type: 'acao_politica', acaoId: 'campanha_regiao', regiao: 'SE' }); tentar({ type: 'acao_politica', acaoId: 'campanha_regiao', regiao: 'NE' }); tentar({ type: 'acao_politica', acaoId: 'campanha_mobilizacao' }); }
    for (const d of s.pendingDecisions.filter((x) => x.turn <= t)) {
      const pref: Record<string, string> = { omicron: 'campanha', petropolis: 'rapida', estiagem_sul: 'socorro', convencoes: 'ampla', debate_agosto: 'propositivo', debate_setembro: 'propositivo', sistema_eleitoral: 'defender', resposta_liminar: 'conciliar' };
      if (pref[d.eventId]) tentar({ type: 'decidir_evento', instanceId: d.instanceId, optionId: pref[d.eventId] });
    }
  }
  const d = turnToDate(s.turn);
  s = advanceTurn(s);
  const i = s.ind;
  console.log(`${shortLabel(d).padEnd(7)}${f(i.pib_var_12m)}${f(i.ipca_12m, 2)}${f(i.ipca_mes, 2)}${f(i.selic, 2)}${f(i.cambio, 2)}${f(i.desemprego)}${f(i.combustivel)}${f(i.hiato, 2)}${f(i.aval_positiva, 0)}${f(i.aval_negativa, 0)}${f(i.aval_saldo)}${f(i.primario_ano, 0).padStart(9)}${f(i.divida_pib)}${f(i.teto_folga)}${f(i.pc_negociacao, 0)}${f(i.pc_credibilidade, 0)}${f(i.risco_pais, 0)}`);
}
console.log('\nEleição:', JSON.stringify(s.election.rounds.map((r) => ({ t: r.turno, v: Object.fromEntries(Object.entries(r.votosValidos).map(([k, v]) => [k, +v.toFixed(1)])), venc: r.vencedor }))));
console.log('Resultado:', s.election.resultado);
console.log('Políticas:', s.policies.map((p) => `${p.defId}:${p.status}`).join(', '));
console.log('Projetos:', s.bills.map((b) => `${b.policyId}:${b.stage} ${JSON.stringify(b.votos.map((v) => [v.turn, v.house, v.sim, v.nao, v.exigido]))}`).join('\n  '));
console.log('Bloqueio:', s.fiscal.bloqueio.toFixed(1), 'Desmat 12m:', s.ind.desmatamento_12m.toFixed(0), 'Fila SUS:', s.ind.saude_fila.toFixed(0), 'RNG draws:', s.rng.draws);

if (process.env.DEBUG_OPINIAO) {
  const { groupWeights } = await import('../src/content/actors/actors2022');
  const w = groupWeights();
  const agg: Record<string, number> = {};
  for (const [g, gs] of Object.entries(s.groups)) for (const [k, v] of Object.entries(gs.stocks)) agg[k] = (agg[k] ?? 0) + (w as any)[g] * v;
  console.log('Estoques nacionais (pontos de saldo):');
  for (const [k, v] of Object.entries(agg).sort((a, b) => a[1] - b[1])) console.log(`  ${v.toFixed(2).padStart(7)}  ${k}`);
  for (const r of s.reports) console.log(r.turn, s.policies.map((p) => `${p.defId.slice(0, 10)}:${p.status.slice(0, 4)}`).join(' '));
}
