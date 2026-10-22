import { newCampaign } from '../src/simulation/engine/newCampaign';
import { advanceTurn } from '../src/simulation/engine/turn';
import { applyAction } from '../src/simulation/engine/actions';
import { estimateVote } from '../src/systems/congress/congress';
let s = newCampaign({ seed: 'brasil-2022' });
s = applyAction(s, { type: 'lancar_politica', defId: 'diesel_pis_cofins', instrumento: 'PLP' }).state;
for (let t = 0; t < 5; t++) {
  for (const b of s.bills) if (b.origem === 'jogador' && b.stage.startsWith('plenario') && !b.votacaoSolicitada) {
    const e = estimateVote(s, b);
    console.log('turn', s.turn, b.policyId, b.stage, 'est', e?.esperadoSim.toFixed(0), e?.faixa.map((x) => x.toFixed(0)), 'p', e?.probAprovacao.toFixed(2));
    for (const pb of e!.porBancada) console.log('   ', pb.bloc, pb.pSim.toFixed(2), pb.motivos.map((m) => `${m.label.slice(0, 20)}=${m.value.toFixed(2)}`).join(' | '));
    s = applyAction(s, { type: 'pautar', billId: b.id }).state;
  }
  s = advanceTurn(s);
  for (const b of s.bills) if (b.origem === 'jogador') console.log('  ->', b.stage, JSON.stringify(b.votos.map((v) => [v.house, v.sim, v.nao, v.exigido, v.aprovado])));
}
