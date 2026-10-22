/**
 * Ações políticas imediatas: comunicação, articulação, instituições e
 * campanha. Cada uma tem custo, limite mensal e consequências declaradas.
 */
import { C } from '../../simulation/causality/ledger';
import { clamp, scheduleOpinion, type Ctx } from '../../simulation/engine/context';
import type { RegionId, WorldState } from '../../simulation/state/types';
import { campanhaRegional } from '../../systems/elections/elections';
import { condutasVedadas } from '../../systems/executive/policies';

export interface AcaoDef {
  id: string;
  nome: string;
  categoria: 'comunicacao' | 'articulacao' | 'instituicoes' | 'campanha';
  descricao: string;
  consequencias: string[];
  custoNegociacao: number;
  limiteMensal: number;
  precisaRegiao?: boolean;
  disponivel: (s: WorldState) => string | null;
  aplicar: (ctx: Ctx, regiao?: RegionId) => void;
}

const sempre = () => null;
const naCampanha = (s: WorldState) =>
  !s.election.campanhaAtiva ? 'A campanha eleitoral começa em 16 de agosto.' : s.turn > 9 || (s.election.rounds.length > 0 && s.election.rounds[s.election.rounds.length - 1].vencedor) ? 'A eleição já foi decidida.' : null;

export const ACOES: AcaoDef[] = [
  {
    id: 'pronunciamento',
    nome: 'Pronunciamento em rede nacional',
    categoria: 'comunicacao',
    descricao: 'Explicar decisões e resultados econômicos à população.',
    consequencias: ['Melhora temporária da avaliação (decai em poucos meses).', 'Polarização sobe levemente.', 'Repetir em meses seguidos rende menos.'],
    custoNegociacao: 0,
    limiteMensal: 1,
    disponivel: (s) => (condutasVedadas(s).publicidade ? 'Período eleitoral: cadeia nacional depende de autorização da Justiça Eleitoral; publicidade institucional vedada.' : null),
    aplicar: (ctx) => {
      const ultimo = Number(ctx.s.flags.ultimo_pronunciamento ?? -10);
      const mult = ctx.s.turn - ultimo <= 1 ? 0.5 : 1;
      ctx.s.flags.ultimo_pronunciamento = ctx.s.turn;
      const cause = C.acao('pronunciamento', 'Pronunciamento em rede nacional');
      scheduleOpinion(ctx, 'eventos', 'todos', 1.2 * mult, cause);
      ctx.L.add('polarizacao', 1, cause);
    },
  },
  {
    id: 'compromisso_fiscal',
    nome: 'Reafirmar compromisso com o teto e a meta fiscal',
    categoria: 'comunicacao',
    descricao: 'Sinalização a investidores e ao Banco Central.',
    consequencias: ['Credibilidade sobe e o prêmio de risco cai.', 'Expectativas de inflação recuam um pouco.', 'Se o governo depois furar o teto, a perda de credibilidade será maior.'],
    custoNegociacao: 2,
    limiteMensal: 1,
    disponivel: sempre,
    aplicar: (ctx) => {
      const cause = C.acao('compromisso_fiscal', 'Compromisso fiscal público');
      ctx.L.add('pc_credibilidade', 4, cause);
      ctx.L.add('expect_ipca', -0.1, cause);
      ctx.L.add('risco_pais', -8, cause);
      ctx.L.add('pc_mobilizacao', -2, cause);
      ctx.s.flags.compromisso_fiscal = true;
    },
  },
  {
    id: 'criticar_bc',
    nome: 'Criticar publicamente os juros do Banco Central',
    categoria: 'instituicoes',
    descricao: 'O BC é autônomo (LC 179/2021): a crítica não altera a Selic.',
    consequencias: ['Não muda a decisão do Copom.', 'Expectativas de inflação e prêmio de risco sobem.', 'Base aplaude.'],
    custoNegociacao: 0,
    limiteMensal: 1,
    disponivel: sempre,
    aplicar: (ctx) => {
      const cause = C.acao('criticar_bc', 'Críticas públicas ao Banco Central');
      ctx.L.add('expect_ipca', 0.15, cause);
      ctx.L.add('pc_credibilidade', -4, cause);
      ctx.L.add('risco_pais', 6, cause);
      ctx.L.add('pc_mobilizacao', 2, cause);
    },
  },
  {
    id: 'distensionar',
    nome: 'Gesto de distensão com o STF e o TSE',
    categoria: 'instituicoes',
    descricao: 'Reuniões institucionais e declarações conciliatórias.',
    consequencias: ['Tensão entre Poderes cai.', 'Base mais radical se frustra.'],
    custoNegociacao: 4,
    limiteMensal: 1,
    disponivel: sempre,
    aplicar: (ctx) => {
      const cause = C.acao('distensionar', 'Distensão com o Judiciário');
      ctx.L.add('tensao_institucional', -6, cause);
      ctx.L.add('relacao_stf', 8, cause);
      ctx.L.add('pc_mobilizacao', -3, cause);
    },
  },
  {
    id: 'criticar_stf',
    nome: 'Atacar decisões do STF publicamente',
    categoria: 'instituicoes',
    descricao: 'Confronto aberto com o Judiciário.',
    consequencias: ['Mobiliza a base.', 'Tensão, risco e desgaste entre eleitores de centro sobem.', 'Não altera decisões judiciais (que dependem dos fundamentos).'],
    custoNegociacao: 0,
    limiteMensal: 1,
    disponivel: sempre,
    aplicar: (ctx) => {
      const cause = C.acao('criticar_stf', 'Ataques ao STF');
      ctx.L.add('tensao_institucional', 10, cause);
      ctx.L.add('relacao_stf', -10, cause);
      ctx.L.add('pc_mobilizacao', 4, cause);
      ctx.L.add('pc_credibilidade', -4, cause);
      ctx.L.add('risco_pais', 8, cause);
      ctx.L.add('confianca_eleitoral', -2, cause);
      scheduleOpinion(ctx, 'eventos', { alta_renda: -2, trabalhadores: -1, servidores: -1, agro: 1 }, 1, cause);
    },
  },
  {
    id: 'reuniao_lideres',
    nome: 'Reunião com líderes partidários',
    categoria: 'articulacao',
    descricao: 'Articulação política geral (agenda, cargos de segundo escalão, prioridades).',
    consequencias: ['Relação com Centrão, centro e base melhora.', 'Consome capacidade de negociação.'],
    custoNegociacao: 10,
    limiteMensal: 1,
    disponivel: sempre,
    aplicar: (ctx) => {
      const b = ctx.s.blocs;
      b.centrao.relacao = clamp(b.centrao.relacao + 4, 0, 100);
      b.centro.relacao = clamp(b.centro.relacao + 3, 0, 100);
      b.ideologicos.relacao = clamp(b.ideologicos.relacao + 2, 0, 100);
      ctx.s.presidentes.camara.relacao = clamp(ctx.s.presidentes.camara.relacao + 3, 0, 100);
      ctx.s.presidentes.senado.relacao = clamp(ctx.s.presidentes.senado.relacao + 3, 0, 100);
    },
  },
  {
    id: 'liberar_emendas',
    nome: 'Acelerar pagamento de emendas parlamentares',
    categoria: 'articulacao',
    descricao: 'R$ 3 bi em emendas, dentro do teto (comprime outras despesas discricionárias).',
    consequencias: ['Centrão bem mais próximo.', 'Menos recursos para custeio e programas.', 'Uso repetido atrai escrutínio da imprensa e dos órgãos de controle.'],
    custoNegociacao: 0,
    limiteMensal: 1,
    disponivel: (s) => (s.fiscal.discricionarioAno - s.fiscal.bloqueio - s.fiscal.discricionarioGasto < 10 ? 'Sem espaço discricionário.' : null),
    aplicar: (ctx) => {
      const cause = C.acao('liberar_emendas', 'Liberação de emendas parlamentares');
      ctx.s.fiscal.extrasMes.push({ label: 'Emendas parlamentares (aceleração de pagamentos)', causeId: cause.id, valor: 3, categoria: 'discricionaria' });
      const b = ctx.s.blocs;
      b.centrao.relacao = clamp(b.centrao.relacao + 7, 0, 100);
      b.ideologicos.relacao = clamp(b.ideologicos.relacao + 3, 0, 100);
      b.centro.relacao = clamp(b.centro.relacao + 2, 0, 100);
      ctx.L.add('pc_credibilidade', -1.5, cause);
      ctx.s.flags.emendas_usadas = Number(ctx.s.flags.emendas_usadas ?? 0) + 1;
    },
  },
  {
    id: 'campanha_regiao',
    nome: 'Concentrar agenda de campanha em uma região',
    categoria: 'campanha',
    descricao: 'Comícios, palanques regionais e mídia local.',
    consequencias: ['Ganho de votos concentrado na região escolhida.', 'Efeito decai com o tempo.'],
    custoNegociacao: 3,
    limiteMensal: 2,
    precisaRegiao: true,
    disponivel: naCampanha,
    aplicar: (ctx, r) => campanhaRegional(ctx, r ?? 'SE', 2.5, 'Agenda de campanha regional', `campanha_regiao_${r}`),
  },
  {
    id: 'campanha_propositiva',
    nome: 'Campanha nacional propositiva',
    categoria: 'campanha',
    descricao: 'Propaganda focada em entregas e propostas.',
    consequencias: ['Ganho moderado e difuso.'],
    custoNegociacao: 3,
    limiteMensal: 1,
    disponivel: naCampanha,
    aplicar: (ctx) => campanhaRegional(ctx, 'todas', 1.4, 'Campanha propositiva', 'campanha_propositiva'),
  },
  {
    id: 'campanha_ataque',
    nome: 'Campanha de ataque ao adversário principal',
    categoria: 'campanha',
    descricao: 'Propaganda negativa.',
    consequencias: ['Ganho um pouco maior, porém polariza.', 'Desgaste entre eleitores de alta renda.'],
    custoNegociacao: 3,
    limiteMensal: 1,
    disponivel: naCampanha,
    aplicar: (ctx) => {
      campanhaRegional(ctx, 'todas', 1.7, 'Campanha de ataque', 'campanha_ataque');
      const cause = C.acao('campanha_ataque', 'Campanha de ataque');
      ctx.L.add('polarizacao', 4, cause);
      scheduleOpinion(ctx, 'eventos', { alta_renda: -1 }, 1, cause);
    },
  },
  {
    id: 'campanha_mobilizacao',
    nome: 'Mobilização da base (atos e redes)',
    categoria: 'campanha',
    descricao: 'Eventos de rua e mobilização digital.',
    consequencias: ['Mobilização sobe (afeta comparecimento dos apoiadores).'],
    custoNegociacao: 3,
    limiteMensal: 1,
    disponivel: naCampanha,
    aplicar: (ctx) => ctx.L.add('pc_mobilizacao', 6, C.acao('campanha_mobilizacao', 'Mobilização da base')),
  },
];

export const ACAO_BY_ID: Record<string, AcaoDef> = Object.fromEntries(ACOES.map((a) => [a.id, a]));

export function usosNoMes(s: WorldState, id: string): number {
  return Number(s.flags[`acao:${id}:${s.turn}`] ?? 0);
}
