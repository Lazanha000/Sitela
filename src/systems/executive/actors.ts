/**
 * Reação dos atores e capital político (spec §6.5, §7.2, §3.2 etapa 7).
 * Capital político tem seis dimensões que NÃO se reduzem a popularidade.
 * Todas convergem lentamente a alvos derivados do estado (memória).
 */
import { C } from '../../simulation/causality/ledger';
import { clamp, type Ctx } from '../../simulation/engine/context';
import { BLOCS, BLOC_IDS } from '../../content/actors/actors2022';

export function actorsStep(ctx: Ctx): void {
  const { s, L } = ctx;
  const i = s.ind;
  const campanha = s.turn >= 6 && s.turn <= 9;

  // Capital político
  L.add('pc_apoio_social', 0.4 * (clamp(50 + 0.9 * i.aval_saldo, 0, 100) - i.pc_apoio_social), C.dinamica('pc_apoio', 'Avaliação popular do governo'));
  L.add('pc_negociacao', Math.min(100 - i.pc_negociacao, 8 + 0.05 * (i.pc_coesao - 50)), C.dinamica('pc_negociacao_regen', 'Recomposição mensal da articulação política'));
  const aliados = (['ideologicos', 'centrao'] as const).map((b) => ({ rel: s.blocs[b].relacao, seats: s.blocs[b].seats.camara }));
  const coesaoAlvo = aliados.reduce((a, x) => a + x.rel * x.seats, 0) / aliados.reduce((a, x) => a + x.seats, 0);
  L.add('pc_coesao', 0.3 * (coesaoAlvo - i.pc_coesao), C.ator('coesao', 'Relação das bancadas aliadas'));
  const confAlvo = 50 + 0.6 * (i.aval_positiva - 28) + 0.2 * (i.pc_credibilidade - 50);
  L.add('pc_confianca_aliados', 0.15 * (confAlvo - i.pc_confianca_aliados), C.ator('confianca_aliados', 'Viabilidade eleitoral e cumprimento de acordos'));
  L.add('pc_credibilidade', 0.04 * (50 - i.pc_credibilidade), C.dinamica('credibilidade_memoria', 'Memória institucional (reversão lenta)'));
  L.add('pc_mobilizacao', 0.1 * (55 - i.pc_mobilizacao), C.dinamica('mobilizacao_conv', 'Acomodação da base'));

  // Instituições
  L.add('tensao_institucional', 0.08 * (25 - i.tensao_institucional), C.dinamica('tensao_decai', 'Distensão gradual'));
  L.add('relacao_stf', 0.06 * (60 - 0.5 * i.tensao_institucional - i.relacao_stf), C.instituicao('stf_clima', 'Clima institucional com o STF'));
  L.add('confianca_eleitoral', 0.05 * (78 - 0.2 * i.tensao_institucional - i.confianca_eleitoral), C.dinamica('conf_eleitoral', 'Confiança no processo eleitoral (tendência)'));
  const polAlvo = 65 + (campanha ? 8 : 0) + 0.1 * (i.tensao_institucional - 40);
  L.add('polarizacao', 0.15 * (polAlvo - i.polarizacao), C.dinamica('polarizacao', campanha ? 'Campanha eleitoral acirra a polarização' : 'Tendência de polarização'));

  // Bancadas (alinhamento não é obediência)
  for (const b of BLOC_IDS) {
    const base = BLOCS[b].relacao;
    let alvo = base;
    if (b === 'centrao') alvo += 0.5 * (i.aval_positiva - 28) + 0.3 * (i.pc_confianca_aliados - 50);
    if (b === 'centro') alvo += 0.3 * (i.pc_credibilidade - 50) + 0.2 * (i.aval_positiva - 28);
    if (b === 'ideologicos') alvo += 0.2 * (i.pc_mobilizacao - 55);
    if (b === 'oposicao') alvo -= 0.1 * (i.tensao_institucional - 40);
    s.blocs[b].relacao = clamp(s.blocs[b].relacao + 0.12 * (alvo - s.blocs[b].relacao), 0, 100);
  }
  s.presidentes.camara.relacao = clamp(s.presidentes.camara.relacao + 0.1 * (70 + 0.2 * (s.blocs.centrao.relacao - 65) - s.presidentes.camara.relacao), 0, 100);
  s.presidentes.senado.relacao = clamp(s.presidentes.senado.relacao + 0.1 * (50 + 0.2 * (s.blocs.centro.relacao - 40) - s.presidentes.senado.relacao), 0, 100);

  for (const k of ['pc_apoio_social', 'pc_negociacao', 'pc_coesao', 'pc_confianca_aliados', 'pc_credibilidade', 'pc_mobilizacao', 'tensao_institucional', 'relacao_stf', 'confianca_eleitoral', 'polarizacao'] as const) {
    const v = clamp(i[k], 0, 100);
    if (v !== i[k]) L.add(k, v - i[k], C.dinamica('limite_escala', 'Limite da escala (0–100)'));
  }
}
