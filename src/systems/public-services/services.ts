/**
 * Serviços públicos e ambiente (spec §13, §15) — versão mínima da v0.1:
 * fila do SUS, capacidade administrativa, fiscalização e desmatamento.
 * Todos são estoques que mudam devagar; cortes de custeio os desgastam.
 */
import { C } from '../../simulation/causality/ledger';
import { type Ctx } from '../../simulation/engine/context';
import { turnToDate } from '../../simulation/time/calendar';
import { DESMATAMENTO_BASE } from '../../content/historical-data/pack2022';
import { CAPACIDADE_INICIAL, type PolicyStepResult } from '../executive/policies';

export function servicesStep(ctx: Ctx, pol: PolicyStepResult): void {
  const { s, L, rng } = ctx;
  const i = s.ind;
  const comp = pol.compressao;
  s.econ.compressaoCusteio = comp;
  const compCause = C.instituicao('compressao_custeio', 'Compressão do custeio discricionário (remanejamentos e bloqueios)');

  L.add('saude_fila', 0.6, C.dinamica('demanda_reprimida', 'Demanda reprimida pós-pandemia'));
  if (comp > 0) L.add('saude_fila', 4 * comp, compCause);

  if (comp > 0) L.add('capacidade_adm', -1.5 * comp, compCause);
  L.add('capacidade_adm', 0.03 * (CAPACIDADE_INICIAL - i.capacidade_adm), C.dinamica('capacidade_reversao', 'Reacomodação das equipes'));

  L.add('fiscalizacao_amb', -0.3, C.dinamica('fiscalizacao_desgaste', 'Desgaste: aposentadorias sem reposição e logística'));
  if (comp > 0) L.add('fiscalizacao_amb', -1 * comp, compCause);
  if (i.fiscalizacao_amb < 0) L.add('fiscalizacao_amb', -i.fiscalizacao_amb, C.dinamica('limite_escala', 'Limite da escala (0–100)'));

  // Desmatamento: fluxo mensal = base sazonal × pressão × (1,25 − 0,5·fiscalização)
  const month = turnToDate(s.turn).month;
  const base = DESMATAMENTO_BASE[month - 1];
  const pressao = Math.pow(i.commodities / 100, 0.4);
  const fisc = 1.25 - 0.5 * (i.fiscalizacao_amb / 100);
  const ruido = Math.exp(rng.normal(0, 0.08));
  const fluxo = base * pressao * fisc * ruido;
  const saida = s.econ.desmatamentoHist[s.econ.desmatamentoHist.length - 12];
  s.econ.desmatamentoHist.push(fluxo);
  L.setDerived(
    'desmatamento_12m',
    s.econ.desmatamentoHist.slice(-12).reduce((a, b) => a + b, 0),
    [
      { cause: C.dinamica('desmat_sazonal', 'Sazonalidade e efeito de base (mesmo mês do ano anterior)'), delta: base - saida },
      { cause: C.externo('commodities', 'Preços internacionais de commodities'), delta: base * (pressao - 1) },
      { cause: C.dinamica('desmat_fiscalizacao', 'Capacidade de fiscalização ambiental'), delta: base * (fisc - 1) },
      { cause: C.ruido('desmatamento'), delta: base * (ruido - 1) },
    ],
    C.dinamica('desmat_interacao', 'Interação entre fatores'),
  );
}
