/**
 * Acontecimentos da campanha 2022. Cada evento declara natureza
 * (fato/abstração), data, condições e consequências. Eventos históricos
 * NÃO forçam o resultado real: as opções são do jogador.
 */
import { C } from '../../simulation/causality/ledger';
import { clamp, scheduleGap, scheduleIndicator, scheduleOpinion, scheduleRegional, type Ctx } from '../../simulation/engine/context';
import type { PendingDecision } from '../../simulation/state/types';
import type { EventDef } from '../../systems/events/events';
import { shockGovernors } from '../../systems/federation/federation';
import { launchPolicy, policyInCourse } from '../../systems/executive/launch';
import { BLOC_IDS } from '../actors/actors2022';

const dec = (eventId: string, opt: string, label: string) => C.acao(`evento:${eventId}:${opt}`, label);
const ev = (id: string, label: string) => C.evento(id, label);

function relacao(ctx: Ctx, deltas: Partial<Record<'ideologicos' | 'centrao' | 'centro' | 'oposicao', number>>) {
  for (const b of BLOC_IDS) if (deltas[b]) ctx.s.blocs[b].relacao = clamp(ctx.s.blocs[b].relacao + deltas[b]!, 0, 100);
}

export const EVENTS_2022: EventDef[] = [
  {
    id: 'loa_2022',
    titulo: 'Sanção do Orçamento de 2022',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'economia',
    turno: 0,
    dataIso: '2022-01-21',
    fonte: 'LOA 2022 aprovada pelo Congresso em dez/2021',
    importancia: 7,
    descricao: () =>
      'O Congresso aprovou o Orçamento de 2022 com volume elevado de emendas de relator e fundo eleitoral de cerca de R$ 4,9 bilhões. O espaço sob o teto é estreito e há sinais de despesas obrigatórias subestimadas. A sanção pode incluir vetos — que o Congresso pode derrubar.',
    padrao: 'sancionar',
    opcoes: [
      {
        id: 'sancionar',
        label: 'Sancionar sem vetos relevantes',
        descricao: 'Preserva acordos com a base e com o comando da Câmara.',
        consequencias: ['Relação com o Centrão melhora.', 'Credibilidade fiscal cai levemente.', 'Nenhum espaço extra para prioridades do Executivo.'],
        aplicar: (ctx) => {
          relacao(ctx, { centrao: 4 });
          ctx.L.add('pc_credibilidade', -1, dec('loa_2022', 'sancionar', 'Orçamento sancionado sem vetos'));
        },
      },
      {
        id: 'vetar_emendas',
        label: 'Vetar R$ 3 bi de emendas para recompor despesas',
        descricao: 'Abre espaço para custeio e prioridades do Executivo, ao custo de atrito com o Congresso.',
        consequencias: ['+R$ 3 bi de margem discricionária do Executivo.', 'Centrão e presidente da Câmara se irritam.', 'Credibilidade fiscal melhora levemente.'],
        aplicar: (ctx) => {
          ctx.s.fiscal.discricionarioAno += 3;
          relacao(ctx, { centrao: -8, ideologicos: -2 });
          ctx.s.presidentes.camara.relacao = clamp(ctx.s.presidentes.camara.relacao - 6, 0, 100);
          ctx.L.add('pc_credibilidade', 2, dec('loa_2022', 'vetar_emendas', 'Veto a emendas no Orçamento'));
        },
      },
      {
        id: 'vetar_fundo',
        label: 'Vetar o aumento do fundo eleitoral',
        descricao: 'Gesto popular; o Congresso tende a derrubar o veto.',
        consequencias: ['Ganho de imagem difuso e temporário.', 'Atrito com quase todas as bancadas.', 'Alta chance de o veto ser derrubado.'],
        aplicar: (ctx) => {
          relacao(ctx, { centrao: -6, centro: -3, oposicao: -2 });
          ctx.s.presidentes.camara.relacao = clamp(ctx.s.presidentes.camara.relacao - 5, 0, 100);
          scheduleOpinion(ctx, 'eventos', 'todos', 1, dec('loa_2022', 'vetar_fundo', 'Veto ao fundo eleitoral'));
          ctx.s.flags.veto_fundo = true;
        },
      },
    ],
  },
  {
    id: 'omicron',
    titulo: 'Onda da variante Ômicron',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'servicos',
    turno: 0,
    dataIso: '2022-01-10',
    fonte: 'Ministério da Saúde; secretarias estaduais',
    importancia: 7,
    descricao: () =>
      'A variante Ômicron provoca explosão de casos, afastamentos de trabalhadores e pressão sobre a atenção primária. A vacinação de crianças de 5 a 11 anos começa em meados de janeiro.',
    aoOcorrer: (ctx) => {
      const cause = ev('omicron', 'Onda da Ômicron (afastamentos e pressão no SUS)');
      scheduleGap(ctx, -0.15, ctx.s.turn, cause);
      scheduleIndicator(ctx, 'saude_fila', 3, ctx.s.turn, cause);
      scheduleOpinion(ctx, 'eventos', 'todos', -0.8, cause);
    },
    padrao: 'rotina',
    opcoes: [
      {
        id: 'campanha',
        label: 'Coordenar campanha de vacinação e testagem',
        descricao: 'Crédito extraordinário para testes e logística, com comunicação pró-vacina.',
        consequencias: ['Custo ≈ R$ 0,5 bi fora do teto (crédito extraordinário).', 'Reduz a pressão no SUS.', 'Parte da base mais mobilizada pode se incomodar.'],
        aplicar: (ctx) => {
          const cause = dec('omicron', 'campanha', 'Campanha de vacinação e testagem');
          ctx.s.fiscal.extrasMes.push({ label: 'Crédito extraordinário: testagem e vacinação', causeId: cause.id, valor: 0.5, categoria: 'fora_teto' });
          scheduleIndicator(ctx, 'saude_fila', -2, ctx.s.turn + 1, cause);
          scheduleOpinion(ctx, 'eventos', { baixa_renda: 1.5, trabalhadores: 1.5, alta_renda: 1.5, servidores: 1.5, agro: 0.3 }, 1, cause);
          ctx.L.add('pc_mobilizacao', -1, cause);
        },
      },
      {
        id: 'rotina',
        label: 'Manter a rotina do Ministério da Saúde',
        descricao: 'Sem medidas adicionais.',
        consequencias: ['Sem custo fiscal.', 'Pressão sobre o SUS se prolonga.'],
        aplicar: (ctx) => {
          const cause = ev('omicron_rotina', 'Ômicron sem resposta adicional');
          scheduleIndicator(ctx, 'saude_fila', 2, ctx.s.turn + 1, cause);
          scheduleOpinion(ctx, 'eventos', 'todos', -0.5, cause);
        },
      },
      {
        id: 'questionar',
        label: 'Questionar publicamente a vacinação infantil',
        descricao: 'Discurso de liberdade individual, contrário à orientação técnica predominante.',
        consequencias: ['Mobiliza parte da base.', 'Desgaste com grupos urbanos e servidores.', 'Atrito com o STF e com governadores.'],
        aplicar: (ctx) => {
          const cause = dec('omicron', 'questionar', 'Questionamento da vacinação infantil');
          ctx.L.add('pc_mobilizacao', 3, cause);
          ctx.L.add('tensao_institucional', 3, cause);
          ctx.L.add('relacao_stf', -3, cause);
          scheduleOpinion(ctx, 'eventos', { alta_renda: -2.5, trabalhadores: -2, servidores: -2, baixa_renda: -1, agro: 0.5 }, 1, cause);
          shockGovernors(ctx, { SE: -4, NE: -4, S: -2, N: -2, CO: -1 }, cause);
        },
      },
    ],
  },
  {
    id: 'estiagem_sul',
    titulo: 'Estiagem no Sul derruba a safra de soja',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'economia',
    turno: 0,
    dataIso: '2022-01-15',
    fonte: 'Conab; secretarias de agricultura (La Niña 2021/22)',
    importancia: 5,
    descricao: () => 'O fenômeno La Niña provoca seca no Rio Grande do Sul e no Paraná, com perdas relevantes na safra de grãos. Efeitos esperados: renda agrícola menor na região e pressão em alimentos.',
    aoOcorrer: (ctx) => {
      const cause = C.externo('estiagem', 'Estiagem no Sul (choque climático)');
      scheduleGap(ctx, -0.12, ctx.s.turn + 1, cause);
      scheduleGap(ctx, -0.08, ctx.s.turn + 2, cause);
      for (const k of [1, 2, 3]) scheduleIndicator(ctx, 'ipca_mes', 0.08, ctx.s.turn + k, cause);
      scheduleRegional(ctx, 'S', -2.5, cause, ctx.s.turn + 1);
    },
    padrao: 'monitorar',
    opcoes: [
      {
        id: 'socorro',
        label: 'Crédito emergencial e prorrogação de dívidas rurais',
        descricao: 'Medidas via crédito extraordinário e Conselho Monetário.',
        consequencias: ['Custo ≈ R$ 0,8 bi fora do teto.', 'Alívio a produtores do Sul.', 'Não recupera a safra perdida.'],
        aplicar: (ctx) => {
          const cause = dec('estiagem_sul', 'socorro', 'Socorro emergencial ao agro do Sul');
          ctx.s.fiscal.extrasMes.push({ label: 'Crédito extraordinário: estiagem no Sul', causeId: cause.id, valor: 0.8, categoria: 'fora_teto' });
          scheduleOpinion(ctx, 'eventos', { agro: 3 }, 1, cause, ctx.s.turn + 1);
          scheduleRegional(ctx, 'S', 2, cause, ctx.s.turn + 1);
          ctx.L.add('pc_credibilidade', -0.5, cause);
        },
      },
      {
        id: 'monitorar',
        label: 'Monitorar e usar instrumentos existentes',
        descricao: 'Seguro rural e linhas regulares.',
        consequencias: ['Sem custo extra.', 'Insatisfação de produtores atingidos.'],
        aplicar: (ctx) => scheduleOpinion(ctx, 'eventos', { agro: -2 }, 1, ev('estiagem_monitorar', 'Estiagem sem socorro adicional'), ctx.s.turn + 1),
      },
    ],
  },
  {
    id: 'crise_ucrania',
    titulo: 'Escalada da crise Rússia–Ucrânia às vésperas de viagem oficial a Moscou',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'mundo',
    turno: 1,
    dataIso: '2022-02-14',
    fonte: 'Itamaraty; agenda presidencial de fev/2022',
    importancia: 6,
    descricao: () =>
      'Tropas russas se concentram na fronteira ucraniana. Há uma viagem oficial a Moscou programada, com pauta de comércio e fertilizantes — o Brasil importa grande parte dos fertilizantes que usa, parte relevante da Rússia e de Belarus.',
    padrao: 'manter',
    opcoes: [
      {
        id: 'manter',
        label: 'Manter a viagem e a pauta comercial',
        descricao: 'Prioriza garantias de suprimento de fertilizantes.',
        consequencias: ['Pode reduzir o risco de suprimento de fertilizantes.', 'Desconforto de EUA e Europa; prêmio de risco sobe um pouco.'],
        aplicar: (ctx) => {
          const cause = dec('crise_ucrania', 'manter', 'Viagem oficial mantida');
          ctx.L.add('risco_fertilizantes', -8, cause);
          ctx.L.add('risco_pais', 5, cause);
          ctx.L.add('pc_credibilidade', -2, cause);
          ctx.L.add('pc_mobilizacao', 1, cause);
        },
      },
      {
        id: 'adiar',
        label: 'Adiar a viagem',
        descricao: 'Evita exposição em meio à crise.',
        consequencias: ['Menos atrito com parceiros ocidentais.', 'Sem garantias adicionais de fertilizantes.'],
        aplicar: (ctx) => {
          const cause = dec('crise_ucrania', 'adiar', 'Viagem a Moscou adiada');
          ctx.L.add('risco_fertilizantes', 3, cause);
          ctx.L.add('pc_credibilidade', 1, cause);
        },
      },
    ],
  },
  {
    id: 'petropolis',
    titulo: 'Tragédia das chuvas em Petrópolis',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'estados',
    turno: 1,
    dataIso: '2022-02-15',
    fonte: 'Defesa Civil do RJ',
    importancia: 7,
    descricao: () => 'Temporal provoca deslizamentos em Petrópolis (RJ), com mais de 230 mortos. A resposta exige coordenação entre União, estado e município.',
    aoOcorrer: (ctx) => scheduleRegional(ctx, 'SE', -1.5, ev('petropolis', 'Tragédia em Petrópolis')),
    padrao: 'padrao',
    opcoes: [
      {
        id: 'rapida',
        label: 'Resposta federal rápida e presencial',
        descricao: 'Crédito extraordinário, Força Nacional e Defesa Civil, em coordenação com o estado.',
        consequencias: ['Custo ≈ R$ 0,6 bi fora do teto (crédito extraordinário é cabível: imprevisível e urgente).', 'Melhora a cooperação com o governo estadual.', 'Reconhecimento regional.'],
        aplicar: (ctx) => {
          const cause = dec('petropolis', 'rapida', 'Resposta federal a Petrópolis');
          ctx.s.fiscal.extrasMes.push({ label: 'Crédito extraordinário: Petrópolis', causeId: cause.id, valor: 0.6, categoria: 'fora_teto' });
          scheduleRegional(ctx, 'SE', 2.5, cause);
          shockGovernors(ctx, { SE: 6 }, cause);
        },
      },
      {
        id: 'padrao',
        label: 'Apoio federal pelos canais regulares',
        descricao: 'Repasses da Defesa Civil conforme pedidos.',
        consequencias: ['Custo ≈ R$ 0,2 bi.', 'Efeito político neutro.'],
        aplicar: (ctx) => {
          const cause = dec('petropolis', 'padrao', 'Apoio federal regular a Petrópolis');
          ctx.s.fiscal.extrasMes.push({ label: 'Defesa Civil: Petrópolis', causeId: cause.id, valor: 0.2, categoria: 'fora_teto' });
          scheduleRegional(ctx, 'SE', 0.5, cause);
        },
      },
      {
        id: 'distante',
        label: 'Manter a agenda sem envolvimento direto',
        descricao: 'Delegar ao estado.',
        consequencias: ['Sem custo.', 'Críticas de ausência; desgaste no Sudeste.'],
        aplicar: (ctx) => {
          const cause = dec('petropolis', 'distante', 'Ausência na resposta a Petrópolis');
          scheduleRegional(ctx, 'SE', -2, cause);
          shockGovernors(ctx, { SE: -4 }, cause);
        },
      },
    ],
  },
  {
    id: 'invasao_ucrania',
    titulo: 'Rússia invade a Ucrânia; ONU vota resolução',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'mundo',
    turno: 2,
    dataIso: '2022-03-02',
    fonte: 'ONU — Assembleia Geral, resolução ES-11/1',
    importancia: 9,
    descricao: () =>
      'A invasão de 24 de fevereiro dispara petróleo, gás, trigo e fertilizantes. A Assembleia Geral da ONU vota resolução condenando a invasão. O Brasil precisa definir sua posição — inclusive sobre sanções.',
    aoOcorrer: (ctx) => {
      ctx.L.add('risco_fertilizantes', 25, C.externo('guerra_ucrania', 'Guerra na Ucrânia (cadeias de suprimento)'));
    },
    padrao: 'condenar',
    opcoes: [
      {
        id: 'condenar',
        label: 'Votar pela condenação, sem aderir a sanções',
        descricao: 'Posição intermediária.',
        consequencias: ['Mantém canais com todas as partes.', 'Efeito pequeno sobre risco e fertilizantes.'],
        aplicar: (ctx) => ctx.L.add('pc_credibilidade', 1, dec('invasao_ucrania', 'condenar', 'Voto pela condenação na ONU')),
      },
      {
        id: 'sancoes',
        label: 'Aderir às sanções ocidentais',
        descricao: 'Alinhamento a EUA e Europa.',
        consequencias: ['Prêmio de risco cai um pouco.', 'Risco de fertilizantes sobe: o agro sente.'],
        aplicar: (ctx) => {
          const cause = dec('invasao_ucrania', 'sancoes', 'Adesão a sanções contra a Rússia');
          ctx.L.add('risco_fertilizantes', 15, cause);
          ctx.L.add('risco_pais', -5, cause);
          ctx.L.add('pc_credibilidade', 2, cause);
          scheduleOpinion(ctx, 'eventos', { agro: -2 }, 1, cause);
        },
      },
      {
        id: 'neutralidade',
        label: 'Abster-se (neutralidade estrita)',
        descricao: 'Prioriza relações comerciais.',
        consequencias: ['Risco de fertilizantes cai.', 'Prêmio de risco e desgaste externo sobem.'],
        aplicar: (ctx) => {
          const cause = dec('invasao_ucrania', 'neutralidade', 'Abstenção na ONU');
          ctx.L.add('risco_fertilizantes', -8, cause);
          ctx.L.add('risco_pais', 8, cause);
          ctx.L.add('pc_credibilidade', -3, cause);
        },
      },
    ],
  },
  {
    id: 'janela_partidaria',
    titulo: 'Janela partidária redistribui deputados',
    tipo: 'calendario',
    provenance: 'fato',
    editoria: 'congresso',
    turno: 2,
    dataIso: '2022-03-03',
    fonte: 'TSE — calendário eleitoral',
    importancia: 5,
    descricao: () => 'Deputados podem trocar de partido sem perder o mandato. Movimentos refletem a viabilidade eleitoral de cada campo.',
    aoOcorrer: (ctx) => {
      const { s } = ctx;
      const shift = Math.round(clamp((s.ind.aval_positiva - 24) * 0.8, -8, 10));
      if (shift > 0) {
        s.blocs.ideologicos.seats.camara += shift;
        s.blocs.centro.seats.camara -= shift;
      } else if (shift < 0) {
        s.blocs.ideologicos.seats.camara += shift;
        s.blocs.centrao.seats.camara -= shift;
      }
      return { deslocamento: shift };
    },
  },
  {
    id: 'desincompatibilizacao',
    titulo: 'Ministros deixam os cargos para disputar eleições',
    tipo: 'calendario',
    provenance: 'fato',
    editoria: 'politica',
    turno: 3,
    dataIso: '2022-04-02',
    fonte: 'LC 64/1990',
    importancia: 6,
    descricao: () => 'Ministros candidatos precisam deixar os cargos seis meses antes da eleição. A transição afeta a gestão e abre espaço político.',
    aoOcorrer: (ctx) => {
      ctx.L.add('capacidade_adm', -3, ev('desincompatibilizacao', 'Saída de ministros candidatos'));
    },
    padrao: 'tecnicos',
    opcoes: [
      {
        id: 'tecnicos',
        label: 'Promover secretários-executivos (perfil técnico)',
        descricao: 'Continuidade administrativa.',
        consequencias: ['Recupera parte da capacidade de gestão.', 'Partidos aliados ficam sem espaço.'],
        aplicar: (ctx) => {
          ctx.L.add('capacidade_adm', 2, dec('desincompatibilizacao', 'tecnicos', 'Substitutos técnicos nos ministérios'));
          relacao(ctx, { centrao: -4 });
        },
      },
      {
        id: 'politicos',
        label: 'Entregar ministérios a indicados de partidos aliados',
        descricao: 'Fortalece a coalizão para a eleição e o Congresso.',
        consequencias: ['Centrão mais próximo.', 'Capacidade de gestão cai mais.'],
        aplicar: (ctx) => {
          ctx.L.add('capacidade_adm', -2, dec('desincompatibilizacao', 'politicos', 'Indicações políticas nos ministérios'));
          relacao(ctx, { centrao: 6, ideologicos: -1 });
        },
      },
    ],
  },
  {
    id: 'greve_servidores',
    titulo: 'Servidores do Banco Central e de outras carreiras entram em greve',
    tipo: 'emergente',
    provenance: 'contrafactual',
    editoria: 'politica',
    janela: [2, 5],
    maxOcorrencias: 1,
    condicao: (s) => s.ind.ipca_12m > 8 && !policyInCourse(s, 'reajuste_servidores'),
    probabilidade: () => 0.5,
    importancia: 6,
    descricao: () => 'Sem reajuste geral desde 2019 e com inflação de dois dígitos, categorias cruzam os braços. No Banco Central, a greve atrasa a divulgação de estatísticas (em 2022 houve greve semelhante).',
    padrao: 'recusar',
    opcoes: [
      {
        id: 'negociar',
        label: 'Abrir negociação de reajuste',
        descricao: 'Sinaliza disposição; a política de reajuste precisará ser lançada.',
        consequencias: ['Alivia a tensão com servidores.', 'Cria expectativa de reajuste (custo futuro).'],
        aplicar: (ctx) => scheduleOpinion(ctx, 'eventos', { servidores: 2 }, 1, dec('greve_servidores', 'negociar', 'Negociação com servidores')),
      },
      {
        id: 'recusar',
        label: 'Recusar reajuste neste ano',
        descricao: 'Prioriza o teto de gastos.',
        consequencias: ['Insatisfação de servidores.', 'Capacidade administrativa cai.', 'Dados oficiais podem atrasar.'],
        aplicar: (ctx) => {
          const cause = dec('greve_servidores', 'recusar', 'Reajuste recusado; greve continua');
          scheduleOpinion(ctx, 'eventos', { servidores: -4 }, 1, cause);
          ctx.L.add('capacidade_adm', -2, cause);
          ctx.s.flags.dados_atrasados_ate = ctx.s.turn + 2;
        },
      },
    ],
  },
  {
    id: 'tcu_eletrobras',
    titulo: 'TCU julga a modelagem da capitalização da Eletrobras',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'economia',
    turno: 4,
    dataIso: '2022-05-18',
    fonte: 'TCU',
    importancia: 6,
    descricao: () => 'O Tribunal de Contas da União, órgão de controle com competência própria, analisa a modelagem da desestatização. A decisão não é do Executivo.',
    aoOcorrer: (ctx) => {
      const p = clamp(0.75 + 0.004 * (ctx.s.ind.pc_credibilidade - 45), 0.4, 0.95);
      const ok = ctx.rng.chance(p);
      ctx.s.flags.eletrobras_aprovada = ok;
      return { aprovada: ok };
    },
  },
  {
    id: 'oferta_eletrobras',
    titulo: 'Oferta de ações capitaliza a Eletrobras',
    tipo: 'historico',
    provenance: 'fato',
    editoria: 'economia',
    turno: 5,
    dataIso: '2022-06-09',
    fonte: 'Eletrobras; B3',
    importancia: 5,
    condicao: (s) => s.flags.eletrobras_aprovada === true,
    descricao: () => 'A oferta reduz a participação da União, que recebe bônus de outorga pela renovação das concessões (valor do jogo: estimativa).',
    aoOcorrer: (ctx) => {
      ctx.s.fiscal.extrasMes.push({ label: 'Bônus de outorga — capitalização da Eletrobras (estimativa)', causeId: 'ev:eletrobras', valor: 25, categoria: 'receita' });
      ctx.L.add('confianca_empresarial', 2, ev('eletrobras', 'Capitalização da Eletrobras'));
    },
  },
  {
    id: 'pressao_caminhoneiros',
    titulo: 'Caminhoneiros ameaçam paralisação pelo preço do diesel',
    tipo: 'emergente',
    provenance: 'contrafactual',
    editoria: 'economia',
    janela: [2, 8],
    maxOcorrencias: 1,
    condicao: (s) => s.ind.combustivel > 112 && !policyInCourse(s, 'diesel_pis_cofins') && !policyInCourse(s, 'icms_essenciais'),
    probabilidade: (s) => clamp(0.25 + (s.ind.combustivel - 112) * 0.03, 0.25, 0.8),
    importancia: 8,
    descricao: (s) => `O preço dos combustíveis está ${(s.ind.combustivel - 100).toFixed(0)}% acima de dezembro. Lideranças de caminhoneiros convocam paralisação nacional (em 2018, uma greve semelhante parou o país).`,
    padrao: 'endurecer',
    opcoes: [
      {
        id: 'mp_diesel',
        label: 'Editar MP zerando PIS/Cofins do diesel',
        descricao: 'Lança a desoneração por medida provisória (vigência imediata, risco jurídico maior).',
        consequencias: ['Renúncia ≈ R$ 1,6 bi/mês.', 'Esvazia a paralisação.', 'MP precisa ser votada em 120 dias.'],
        disponivel: (s) => (s.ind.pc_negociacao < 6 ? 'Capacidade de negociação insuficiente para editar a MP.' : null),
        aplicar: (ctx) => {
          launchPolicy(ctx, 'diesel_pis_cofins', 'MP');
        },
      },
      {
        id: 'negociar',
        label: 'Negociar com lideranças sem medida fiscal',
        descricao: 'Reuniões e promessas de estudos.',
        consequencias: ['Custa capital de negociação.', 'Chance moderada de a paralisação ocorrer mesmo assim.'],
        aplicar: (ctx) => {
          const cause = dec('pressao_caminhoneiros', 'negociar', 'Negociação com caminhoneiros');
          ctx.L.add('pc_negociacao', -5, cause);
          if (ctx.rng.chance(0.3)) paralisacao(ctx);
        },
      },
      {
        id: 'endurecer',
        label: 'Endurecer: garantir abastecimento com forças federais',
        descricao: 'Sem concessões.',
        consequencias: ['Alta chance de paralisação: atividade cai e preços sobem no mês seguinte.', 'Mobiliza parte da base.'],
        aplicar: (ctx) => {
          ctx.L.add('pc_mobilizacao', 1, dec('pressao_caminhoneiros', 'endurecer', 'Linha dura com caminhoneiros'));
          if (ctx.rng.chance(0.55)) paralisacao(ctx);
        },
      },
    ],
  },
  {
    id: 'condutas_vedadas',
    titulo: 'Começam as condutas vedadas do período eleitoral',
    tipo: 'calendario',
    provenance: 'fato',
    editoria: 'eleicoes',
    turno: 6,
    dataIso: '2022-07-02',
    fonte: 'Lei 9.504/1997, art. 73',
    importancia: 5,
    descricao: () => 'Três meses antes do pleito ficam suspensas transferências voluntárias a estados e municípios, publicidade institucional e nomeações (com exceções). Programas que dependem de convênios desaceleram.',
  },
  {
    id: 'sistema_eleitoral',
    titulo: 'Pressão de aliados para questionar o sistema eletrônico de votação',
    tipo: 'historico',
    provenance: 'abstracao',
    editoria: 'eleicoes',
    turno: 6,
    dataIso: '2022-07-15',
    fonte: 'TSE — testes públicos de segurança e auditorias (fato); escolha do jogador (contrafactual)',
    importancia: 8,
    descricao: () =>
      'Aliados defendem que o governo questione publicamente a confiabilidade das urnas eletrônicas, em uso desde 1996 e submetidas a testes públicos de segurança e auditorias. Não há evidência pública de fraude.',
    padrao: 'silencio',
    opcoes: [
      {
        id: 'defender',
        label: 'Defender o sistema e cooperar com o TSE',
        descricao: 'Reconhecimento das auditorias existentes.',
        consequencias: ['Confiança eleitoral e relação com o STF/TSE melhoram.', 'Parte da base mais mobilizada se frustra.'],
        aplicar: (ctx) => {
          const cause = dec('sistema_eleitoral', 'defender', 'Defesa pública do sistema eleitoral');
          ctx.L.add('confianca_eleitoral', 5, cause);
          ctx.L.add('tensao_institucional', -5, cause);
          ctx.L.add('relacao_stf', 5, cause);
          ctx.L.add('pc_mobilizacao', -2, cause);
        },
      },
      {
        id: 'silencio',
        label: 'Não se manifestar',
        descricao: 'Evita o tema.',
        consequencias: ['Sem efeitos imediatos.'],
        aplicar: () => {},
      },
      {
        id: 'questionar',
        label: 'Questionar a confiabilidade das urnas sem apresentar provas',
        descricao: 'Discurso de suspeição sobre o processo.',
        consequencias: ['Mobiliza parte da base.', 'Confiança eleitoral e credibilidade caem; tensão com STF/TSE dispara.', 'Prêmio de risco sobe; desgaste entre eleitores de centro.'],
        aplicar: (ctx) => {
          const cause = dec('sistema_eleitoral', 'questionar', 'Questionamento das urnas sem provas');
          ctx.L.add('confianca_eleitoral', -12, cause);
          ctx.L.add('tensao_institucional', 15, cause);
          ctx.L.add('relacao_stf', -10, cause);
          ctx.L.add('pc_credibilidade', -6, cause);
          ctx.L.add('risco_pais', 10, cause);
          ctx.L.add('pc_mobilizacao', 5, cause);
          scheduleOpinion(ctx, 'eventos', { alta_renda: -4, trabalhadores: -2, servidores: -2, baixa_renda: -1, agro: 1 }, 1, cause);
          ctx.s.flags.questionou_urnas = true;
        },
      },
    ],
  },
  {
    id: 'convencoes',
    titulo: 'Convenções partidárias definem chapas',
    tipo: 'calendario',
    provenance: 'fato',
    editoria: 'eleicoes',
    turno: 6,
    dataIso: '2022-07-20',
    fonte: 'TSE — calendário eleitoral',
    importancia: 9,
    descricao: () => 'Entre 20 de julho e 5 de agosto, partidos oficializam candidaturas e coligações. O tempo de rádio e TV depende das alianças.',
    padrao: 'ampla',
    opcoes: [
      {
        id: 'ampla',
        label: 'Concorrer à reeleição com aliança ampla (Centrão)',
        descricao: 'Mais tempo de TV e palanques regionais.',
        consequencias: ['Tempo de TV maior.', 'Centrão mais comprometido.', 'Base ideológica um pouco menos mobilizada.'],
        aplicar: (ctx) => {
          ctx.s.election.governoConcorre = true;
          ctx.s.election.alianca = 'ampla';
          relacao(ctx, { centrao: 5 });
          ctx.L.add('pc_mobilizacao', -2, dec('convencoes', 'ampla', 'Aliança ampla para a reeleição'));
        },
      },
      {
        id: 'ideologica',
        label: 'Concorrer com chapa ideológica enxuta',
        descricao: 'Discurso coeso, menos palanques.',
        consequencias: ['Base mais mobilizada.', 'Menos tempo de TV; Centrão se distancia.'],
        aplicar: (ctx) => {
          ctx.s.election.governoConcorre = true;
          ctx.s.election.alianca = 'ideologica';
          relacao(ctx, { centrao: -5 });
          ctx.L.add('pc_mobilizacao', 5, dec('convencoes', 'ideologica', 'Chapa ideológica'));
        },
      },
      {
        id: 'sucessor',
        label: 'Não concorrer e apoiar um sucessor',
        descricao: 'Contrafactual: o governo lança outro nome.',
        consequencias: ['O sucessor herda apenas parte da avaliação do governo.', 'Base desmobilizada; menos polarização em torno do governo.'],
        aplicar: (ctx) => {
          ctx.s.election.governoConcorre = false;
          ctx.s.election.alianca = 'ampla';
          ctx.L.add('pc_mobilizacao', -8, dec('convencoes', 'sucessor', 'Apoio a um sucessor'));
        },
      },
    ],
  },
  {
    id: 'inicio_campanha',
    titulo: 'Começa a campanha eleitoral',
    tipo: 'calendario',
    provenance: 'fato',
    editoria: 'eleicoes',
    turno: 7,
    dataIso: '2022-08-16',
    fonte: 'TSE',
    importancia: 7,
    descricao: () => 'A propaganda eleitoral está liberada; o horário gratuito no rádio e na TV começa em 26 de agosto. Ações de campanha ficam disponíveis no painel de eleições.',
    aoOcorrer: (ctx) => {
      ctx.s.election.campanhaAtiva = true;
    },
  },
  ...(['debate_agosto', 'debate_setembro'] as const).map(
    (id, k): EventDef => ({
      id,
      titulo: k === 0 ? 'Primeiro debate presidencial na TV' : 'Último debate antes do 1º turno',
      tipo: 'calendario',
      provenance: 'fato',
      editoria: 'eleicoes',
      turno: 7 + k,
      dataIso: k === 0 ? '2022-08-28' : '2022-09-29',
      fonte: 'Emissoras de TV (debates ocorreram nessas datas)',
      importancia: 7,
      descricao: () => 'Emissoras promovem debate entre os principais candidatos. O desempenho é incerto.',
      padrao: 'faltar',
      opcoes: [
        {
          id: 'propositivo',
          label: 'Participar com tom propositivo',
          descricao: 'Foco em entregas e propostas.',
          consequencias: ['Ganho provável, porém incerto.'],
          aplicar: (ctx) => {
            const v = ctx.rng.normal(0.9, 1.2);
            for (const r of Object.keys(ctx.s.election.campanhaRegional) as (keyof typeof ctx.s.election.campanhaRegional)[]) ctx.s.election.campanhaRegional[r] += v * 0.6;
            scheduleOpinion(ctx, 'campanha', 'todos', v * 0.5, dec(id, 'propositivo', 'Desempenho no debate'));
          },
        },
        {
          id: 'ataque',
          label: 'Participar com tom de confronto',
          descricao: 'Ataques ao adversário principal.',
          consequencias: ['Resultado muito incerto: pode render mais ou sair pela culatra.', 'Polarização sobe.'],
          aplicar: (ctx) => {
            const v = ctx.rng.normal(0.5, 2.2);
            for (const r of Object.keys(ctx.s.election.campanhaRegional) as (keyof typeof ctx.s.election.campanhaRegional)[]) ctx.s.election.campanhaRegional[r] += v * 0.6;
            ctx.L.add('polarizacao', 3, dec(id, 'ataque', 'Debate em tom de confronto'));
            ctx.L.add('pc_mobilizacao', 2, dec(id, 'ataque', 'Debate em tom de confronto'));
          },
        },
        {
          id: 'faltar',
          label: 'Não comparecer',
          descricao: 'Evita riscos.',
          consequencias: ['Pequena perda certa: críticas de ausência.'],
          aplicar: (ctx) => {
            for (const r of Object.keys(ctx.s.election.campanhaRegional) as (keyof typeof ctx.s.election.campanhaRegional)[]) ctx.s.election.campanhaRegional[r] -= 0.5;
          },
        },
      ],
    }),
  ),
  {
    id: 'orcamento_opaco',
    titulo: 'Reportagens revelam distribuição opaca de emendas de relator',
    tipo: 'emergente',
    provenance: 'contrafactual',
    editoria: 'politica',
    maxOcorrencias: 1,
    condicao: (s) => Number(s.flags.emendas_usadas ?? 0) >= 3,
    probabilidade: () => 0.35,
    importancia: 7,
    descricao: () => 'O uso intensivo de emendas como moeda de negociação chama a atenção da imprensa e de órgãos de controle. (Gatilho: o governo liberou emendas em negociações três vezes ou mais.)',
    padrao: 'sigilo',
    opcoes: [
      {
        id: 'transparencia',
        label: 'Publicar a lista de indicações',
        descricao: 'Transparência ativa.',
        consequencias: ['Credibilidade melhora.', 'Centrão se irrita.'],
        aplicar: (ctx) => {
          ctx.L.add('pc_credibilidade', 2, dec('orcamento_opaco', 'transparencia', 'Transparência das emendas'));
          relacao(ctx, { centrao: -6 });
        },
      },
      {
        id: 'sigilo',
        label: 'Defender a legalidade e manter o modelo',
        descricao: 'Sem mudanças.',
        consequencias: ['Desgaste com eleitores urbanos.', 'Tensão com o STF aumenta.'],
        aplicar: (ctx) => {
          const cause = dec('orcamento_opaco', 'sigilo', 'Defesa das emendas de relator');
          scheduleOpinion(ctx, 'eventos', { alta_renda: -2, trabalhadores: -2, servidores: -2, baixa_renda: -0.5 }, 1, cause);
          ctx.L.add('pc_credibilidade', -3, cause);
          ctx.L.add('tensao_institucional', 4, cause);
          relacao(ctx, { centrao: 2 });
        },
      },
    ],
  },
  {
    id: 'estresse_mercado',
    titulo: 'Estresse no mercado: dólar e juros futuros disparam',
    tipo: 'emergente',
    provenance: 'contrafactual',
    editoria: 'economia',
    maxOcorrencias: 2,
    condicao: (s) => s.ind.risco_pais > 290 || s.ind.cambio > 6,
    probabilidade: () => 0.5,
    importancia: 7,
    descricao: (s) => `O prêmio de risco chegou a ${s.ind.risco_pais.toFixed(0)} pontos e o dólar a R$ ${s.ind.cambio.toFixed(2)}. (Gatilho: deterioração da credibilidade fiscal e institucional.)`,
    padrao: 'ignorar',
    opcoes: [
      {
        id: 'compromisso',
        label: 'Anunciar compromisso fiscal crível',
        descricao: 'Reafirma regras e metas.',
        consequencias: ['Risco e câmbio aliviam.', 'Base pode ver recuo.'],
        aplicar: (ctx) => {
          const cause = dec('estresse_mercado', 'compromisso', 'Compromisso fiscal anunciado');
          ctx.L.add('pc_credibilidade', 4, cause);
          ctx.L.add('risco_pais', -15, cause);
          ctx.L.add('pc_mobilizacao', -2, cause);
        },
      },
      {
        id: 'culpar',
        label: 'Culpar especuladores',
        descricao: 'Discurso de confronto com o mercado.',
        consequencias: ['Risco sobe mais.', 'Base aplaude.'],
        aplicar: (ctx) => {
          const cause = dec('estresse_mercado', 'culpar', 'Ataque a especuladores');
          ctx.L.add('risco_pais', 10, cause);
          ctx.L.add('pc_credibilidade', -3, cause);
          ctx.L.add('pc_mobilizacao', 2, cause);
        },
      },
      {
        id: 'ignorar',
        label: 'Não reagir',
        descricao: 'Esperar acomodação.',
        consequencias: ['Pressão persiste um pouco.'],
        aplicar: (ctx) => ctx.L.add('risco_pais', 5, ev('estresse_ignorado', 'Estresse de mercado sem resposta')),
      },
    ],
  },
  {
    id: 'resposta_liminar',
    titulo: 'Liminar suspende medida do governo',
    tipo: 'sistema',
    provenance: 'contrafactual',
    editoria: 'justica',
    importancia: 8,
    descricao: (_s, d: PendingDecision | null) => `Uma decisão liminar suspendeu "${d?.context.nome ?? 'a medida'}". A execução está parada até o julgamento.`,
    padrao: 'cumprir',
    opcoes: [
      {
        id: 'cumprir',
        label: 'Cumprir e recorrer pela AGU',
        descricao: 'Respeita a decisão e disputa nos autos.',
        consequencias: ['Medida parada até o julgamento.', 'Preserva previsibilidade institucional.'],
        aplicar: (ctx) => ctx.L.add('pc_credibilidade', 1, dec('resposta_liminar', 'cumprir', 'Cumprimento de decisão judicial')),
      },
      {
        id: 'conciliar',
        label: 'Propor conciliação (ajustes negociados)',
        descricao: 'Busca acordo com os autores da ação.',
        consequencias: ['Maior chance de decisão parcial (mantém parte da medida).', 'Reduz a tensão institucional.'],
        aplicar: (ctx, d) => {
          ctx.s.flags[`conciliacao:${d.context.challengeId}`] = true;
          ctx.L.add('tensao_institucional', -3, dec('resposta_liminar', 'conciliar', 'Conciliação judicial'));
        },
      },
      {
        id: 'descumprir',
        label: 'Manter a execução apesar da liminar',
        descricao: 'Descumprimento de ordem judicial.',
        consequencias: ['A medida volta a ser executada.', 'Crise institucional: tensão, risco e credibilidade pioram todo mês.', 'Possíveis sanções e responsabilização.'],
        aplicar: (ctx, d) => {
          const ch = ctx.s.challenges.find((c) => c.id === d.context.challengeId);
          const pol = ctx.s.policies.find((p) => p.id === d.context.policyId);
          if (ch) ch.descumprida = true;
          if (pol && pol.status === 'suspensa') pol.status = 'execucao';
          ctx.L.add('tensao_institucional', 15, dec('resposta_liminar', 'descumprir', 'Descumprimento de decisão judicial'));
        },
      },
    ],
  },
  {
    id: 'transicao_derrota',
    titulo: 'Derrota nas urnas: como o governo reage',
    tipo: 'sistema',
    provenance: 'contrafactual',
    editoria: 'eleicoes',
    importancia: 10,
    descricao: () => 'A candidatura do governo foi derrotada. A forma de reagir afeta a confiança no processo, a estabilidade e a transição.',
    padrao: 'reconhecer',
    opcoes: [
      {
        id: 'reconhecer',
        label: 'Reconhecer o resultado e instalar a transição',
        descricao: 'Transição institucional ordenada.',
        consequencias: ['Confiança eleitoral e credibilidade sobem.', 'Base frustrada.'],
        aplicar: (ctx) => {
          const cause = dec('transicao_derrota', 'reconhecer', 'Reconhecimento do resultado');
          ctx.L.add('confianca_eleitoral', 6, cause);
          ctx.L.add('tensao_institucional', -10, cause);
          ctx.L.add('pc_credibilidade', 6, cause);
          ctx.L.add('pc_mobilizacao', -5, cause);
          ctx.s.election.posturaResultado = 'reconheceu';
        },
      },
      {
        id: 'atrasar',
        label: 'Silenciar e atrasar o reconhecimento',
        descricao: 'Ambiguidade deliberada.',
        consequencias: ['Tensão e risco sobem.', 'Protestos de apoiadores tornam-se prováveis.'],
        aplicar: (ctx) => {
          const cause = dec('transicao_derrota', 'atrasar', 'Demora em reconhecer o resultado');
          ctx.L.add('tensao_institucional', 10, cause);
          ctx.L.add('confianca_eleitoral', -6, cause);
          ctx.L.add('risco_pais', 10, cause);
          ctx.L.add('pc_credibilidade', -4, cause);
          ctx.s.election.posturaResultado = 'atrasou';
        },
      },
      {
        id: 'contestar',
        label: 'Contestar o resultado sem provas',
        descricao: 'Ação institucional de alto risco.',
        consequencias: ['TSE e STF tendem a rejeitar a contestação.', 'Crise institucional grave; risco e credibilidade despencam.', 'Responsabilização possível.'],
        aplicar: (ctx) => {
          const cause = dec('transicao_derrota', 'contestar', 'Contestação do resultado sem provas');
          ctx.L.add('tensao_institucional', 25, cause);
          ctx.L.add('confianca_eleitoral', -15, cause);
          ctx.L.add('pc_credibilidade', -12, cause);
          ctx.L.add('relacao_stf', -20, cause);
          ctx.L.add('risco_pais', 25, cause);
          scheduleOpinion(ctx, 'eventos', { alta_renda: -4, trabalhadores: -3, servidores: -3, baixa_renda: -2, agro: 1 }, 1, cause);
          ctx.s.election.posturaResultado = 'contestou';
        },
      },
    ],
  },
];

function paralisacao(ctx: Ctx): void {
  const cause = ev('paralisacao', 'Paralisação de caminhoneiros');
  scheduleGap(ctx, -0.35, ctx.s.turn, cause);
  scheduleIndicator(ctx, 'ipca_mes', 0.25, ctx.s.turn, cause);
  scheduleOpinion(ctx, 'eventos', 'todos', -1.5, cause);
  ctx.emit('paralisacao', {}, { importancia: 9 });
}
