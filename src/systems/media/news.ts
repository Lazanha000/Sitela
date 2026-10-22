/**
 * Imprensa simulada (spec §18). Toda notícia nasce de uma ocorrência do
 * motor ou de um dado divulgado, com os números reais da simulação.
 * Colunas de opinião divergem na ênfase, nunca nos fatos.
 * Veículo e colunistas são fictícios; não há citações de pessoas reais.
 */
import { SERIE_OFFSET } from '../../simulation/engine/context';
import { formatIndicator } from '../../simulation/state/indicators';
import type { Editoria, NewsItem, Ocorrencia, WorldState } from '../../simulation/state/types';
import { MESES, isoLabel, turnToDate } from '../../simulation/time/calendar';
import { POLICY_BY_ID } from '../../content/policies/policies2022';
import { BLOCS } from '../../content/actors/actors2022';
import { eventDef } from '../events/events';
import { BILL_TYPE_LABEL } from '../congress/congress';
import { CAND_IDS, candidateLabel, type CandId } from '../elections/elections';

export const JORNAL = 'Gazeta Federal';

const pct = (v: number, c = 1) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c })}%`;
const bi = (v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
const casa = (h: unknown) => (h === 'senado' ? 'Senado' : 'Câmara');

type Draft = Omit<NewsItem, 'id' | 'turn'>;

function fromOcorrencia(s: WorldState, oc: Ocorrencia): Draft | null {
  const d = oc.dados as Record<string, any>;
  const base = { provenance: oc.provenance, importancia: oc.importancia, dataIso: oc.dataIso, ocorrenciaId: oc.id };
  switch (oc.tipo) {
    case 'copom': {
      const verbo = d.passo > 0 ? `eleva a Selic para ${pct(d.nova, 2)}` : d.passo < 0 ? `reduz a Selic para ${pct(d.nova, 2)}` : `mantém a Selic em ${pct(d.nova, 2)}`;
      return {
        ...base,
        editoria: 'economia',
        tipo: 'noticia',
        titulo: `Copom ${verbo}`,
        linha_fina: `Comitê do Banco Central cita expectativa de inflação de ${pct(d.expectativa, 2)} e IPCA de ${pct(d.ipca12, 2)} em 12 meses.`,
        corpo: [
          `O Comitê de Política Monetária ${d.passo === 0 ? 'manteve' : 'alterou'} a taxa básica de juros (de ${pct(d.anterior, 2)} para ${pct(d.nova, 2)} ao ano).`,
          `A decisão é do Banco Central, autônomo desde a LC 179/2021: o Planalto não fixa a Selic. No modelo do jogo, o comitê reage às expectativas de inflação, à distância da meta (3,25% para 2023) e ao hiato do produto (${pct(d.hiato, 1)}).`,
          'Juros mais altos tendem a conter a inflação com defasagem de vários meses, encarecem o crédito e aumentam o custo da dívida pública.',
        ],
        indicadores: ['selic', 'expect_ipca', 'ipca_12m'],
      };
    }
    case 'votacao': {
      const ok = d.aprovado;
      const blocos = Object.entries(d.porBancada as Record<string, { sim: number; nao: number }>)
        .map(([b, v]) => `${BLOCS[b as keyof typeof BLOCS].label}: ${v.sim} sim, ${v.nao} não`)
        .join('; ');
      return {
        ...base,
        editoria: 'congresso',
        tipo: 'noticia',
        titulo: `${casa(d.casa)} ${ok ? 'aprova' : 'rejeita'} ${d.nome}${d.tipo === 'PEC' ? ` em ${d.turno}º turno` : ''}`,
        linha_fina: `Placar: ${d.sim} a ${d.nao}. Regra: ${d.regra}.`,
        corpo: [`A ${casa(d.casa)} ${ok ? 'aprovou' : 'rejeitou'} a proposta (${BILL_TYPE_LABEL[d.tipo as keyof typeof BILL_TYPE_LABEL]}) com ${d.sim} votos favoráveis e ${d.nao} contrários; ${d.ausentes} parlamentares não votaram.`, `Votos por bloco: ${blocos}.`, ok ? 'A proposta segue para a próxima etapa da tramitação.' : 'Com a rejeição, a medida não avança nesta legislatura sem nova proposta.'],
        indicadores: ['pc_confianca_aliados', 'pc_credibilidade'],
      };
    }
    case 'lei_aprovada':
      return {
        ...base,
        editoria: 'congresso',
        tipo: 'noticia',
        titulo: d.tipo === 'PEC' ? `Congresso promulga emenda: ${d.nome}` : d.tipo === 'MP' ? `MP é convertida em lei: ${d.nome}` : `Sancionada a lei: ${d.nome}`,
        linha_fina: 'Aprovação encerra a tramitação; a execução depende agora de orçamento, regulamentação e capacidade dos órgãos.',
        corpo: [`${d.nome} concluiu a tramitação no Congresso.`, 'Aprovar não é entregar: o efeito sobre a vida das pessoas virá com defasagem e dependerá da execução.'],
      };
    case 'derrota':
      if (d.origem === 'historico') return { ...base, editoria: 'congresso', tipo: 'noticia', titulo: `Rejeitada: ${d.nome}`, linha_fina: 'Proposta de autoria parlamentar não reuniu votos.', corpo: [`A proposta foi rejeitada em plenário (${d.voto?.sim ?? '?'} a ${d.voto?.nao ?? '?'}).`] };
      return {
        ...base,
        editoria: 'congresso',
        tipo: 'noticia',
        titulo: `Derrota do governo: ${d.nome} é rejeitada`,
        linha_fina: d.voto ? `Foram ${d.voto.sim} votos a favor; eram necessários ${d.voto.exigido} (${d.voto.regra}).` : 'A proposta não avançou.',
        corpo: ['A derrota reduz a credibilidade do governo e a confiança dos aliados; o tamanho do custo depende da importância da proposta e de compromissos públicos assumidos.'],
        indicadores: ['pc_credibilidade', 'pc_confianca_aliados'],
      };
    case 'mp_caducou':
      return { ...base, editoria: 'congresso', tipo: 'noticia', titulo: `MP de ${d.nome} perde a validade`, linha_fina: 'Sem votação em 120 dias, a medida provisória caducou e deixa de produzir efeitos.', corpo: ['A medida deixa de vigorar. Para retomá-la, o governo precisaria de novo instrumento legal.'] };
    case 'pauta_adiada':
      return { ...base, editoria: 'congresso', tipo: 'noticia', titulo: `Votação de ${d.nome} fica para depois`, linha_fina: d.campanha ? 'Em período eleitoral, o plenário se esvazia.' : `A presidência da ${casa(d.casa)} não pautou a matéria neste mês.`, corpo: ['A pauta é prerrogativa dos presidentes das Casas; a relação com o governo e a urgência influenciam a decisão.'] };
    case 'pronto_plenario':
      return { ...base, editoria: 'congresso', tipo: 'agenda', titulo: `${POLICY_BY_ID[d.defId]?.nome} chega ao plenário da ${casa(d.casa)}`, linha_fina: 'O governo pode pedir a votação ou esperar por mais apoio.', corpo: [] };
    case 'politica_lancada': {
      const inst = d.instrumento as string;
      const verbo = inst === 'MP' ? 'edita medida provisória' : inst === 'decreto' ? 'publica decreto' : inst === 'ato_gestao' ? 'anuncia' : inst === 'PEC' ? 'envia PEC' : 'envia projeto';
      const def = POLICY_BY_ID[d.defId];
      return { ...base, editoria: 'politica', tipo: 'noticia', titulo: `Governo ${verbo}: ${d.nome}`, linha_fina: def?.resumo ?? '', corpo: [def ? `Objetivo declarado: ${def.objetivo}` : '', def ? `Quem ganha: ${def.beneficiados} Quem paga: ${def.prejudicados}` : ''].filter(Boolean) };
    }
    case 'politica_inicio':
      return { ...base, editoria: 'politica', tipo: 'noticia', titulo: `Começa a execução: ${d.nome}`, linha_fina: 'A taxa de execução dependerá de orçamento, capacidade e cooperação.', corpo: [] };
    case 'politica_fim':
      return { ...base, editoria: 'politica', tipo: 'noticia', titulo: `${d.nome} chega ao fim`, linha_fina: d.motivo === 'prazo' ? 'A vigência prevista terminou; efeitos de opinião se dissipam aos poucos.' : 'O governo encerrou a política.', corpo: [] };
    case 'reacao_governadores':
      return { ...base, editoria: 'estados', tipo: 'noticia', titulo: `Governadores reagem a ${d.nome}`, linha_fina: d.compensacao ? 'Compensação reduz, mas não elimina, a perda de arrecadação.' : 'Estados apontam perda de arrecadação e ameaçam ir ao STF.', corpo: ['A cooperação dos estados afeta a execução de políticas que dependem deles, como saúde e obras.'], indicadores: ['coop_federativa'] };
    case 'contestacao':
      return { ...base, editoria: 'justica', tipo: 'noticia', titulo: `${d.autor} questiona ${d.nome} no STF`, linha_fina: `Fundamento: ${d.fundamento}`, corpo: ['A ação será analisada primeiro em pedido de liminar; o julgamento de mérito leva meses.'] };
    case 'liminar':
      return d.concedida
        ? { ...base, editoria: 'justica', tipo: 'noticia', titulo: `Liminar suspende ${d.nome}`, linha_fina: 'A execução fica parada até o julgamento de mérito.', corpo: ['A decisão provisória pode ser mantida, revista ou modulada no julgamento.'] }
        : { ...base, editoria: 'justica', tipo: 'noticia', titulo: `STF nega liminar contra ${d.nome}`, linha_fina: 'A medida segue em vigor enquanto o mérito não é julgado.', corpo: [] };
    case 'decisao_judicial': {
      const r = d.resultado === 'anulada' ? 'derruba' : d.resultado === 'parcial' ? 'mantém parcialmente' : 'mantém';
      return { ...base, editoria: 'justica', tipo: 'noticia', titulo: `STF ${r} ${d.nome}`, linha_fina: d.conciliada ? 'Decisão incorpora acordo de conciliação.' : 'Julgamento de mérito encerra a disputa.', corpo: [] };
    }
    case 'relatorio_bimestral':
      if (d.acao === 'bloqueio')
        return { ...base, editoria: 'economia', tipo: 'relatorio', titulo: `Governo bloqueia ${bi(d.valor)} para cumprir o teto`, linha_fina: `Despesas discricionárias bloqueadas no ano somam ${bi(d.bloqueioTotal)}.`, corpo: ['O relatório bimestral de receitas e despesas projetou gasto acima do limite constitucional. O bloqueio atinge custeio e programas financiados por remanejamento, que passam a executar menos.'], indicadores: ['teto_folga'] };
      return { ...base, editoria: 'economia', tipo: 'relatorio', titulo: d.acao === 'desbloqueio' ? `Governo desbloqueia ${bi(d.valor)}` : 'Relatório bimestral mantém a programação orçamentária', linha_fina: `Folga projetada no teto: ${bi(d.folga)}. Primário acumulado no ano: ${bi(d.primarioAno)}.`, corpo: [], importancia: 3 };
    case 'evento': {
      const def = eventDef(d.eventId);
      if (!def) return null;
      const extra = d.eventId === 'janela_partidaria' ? ` Saldo para a bancada governista ideológica: ${d.deslocamento > 0 ? '+' : ''}${d.deslocamento} deputados.` : d.eventId === 'tcu_eletrobras' ? (d.aprovada ? ' O plenário aprovou a modelagem.' : ' O tribunal pediu ajustes e adiou a decisão.') : '';
      return { ...base, editoria: def.editoria, tipo: 'noticia', titulo: def.titulo, linha_fina: (def.opcoes?.length ? 'Decisão pendente no Planalto. ' : '') + (def.fonte ? `Fonte: ${def.fonte}.` : ''), corpo: [def.descricao(s, null) + extra] };
    }
    case 'decisao_evento': {
      const def = eventDef(d.eventId);
      return { ...base, editoria: def?.editoria ?? 'politica', tipo: 'noticia', titulo: d.automatica ? `Sem decisão do Planalto, prevalece: ${d.opcao}` : `Governo decide: ${d.opcao}`, linha_fina: def?.titulo ?? '', corpo: [] };
    }
    case 'pesquisa': {
      const it = d.intencao as Record<CandId, number>;
      return {
        ...base,
        editoria: 'eleicoes',
        tipo: 'noticia',
        titulo: `Pesquisa simulada: governo tem ${pct(it.governo, 0)}, oposição ${pct(it.oposicao, 0)}`,
        linha_fina: `${d.instituto}. Margem de erro de ${d.margem} pontos. Simulação do jogo — não é pesquisa real.`,
        corpo: [CAND_IDS.map((c) => `${candidateLabel(s, c)}: ${pct(it[c], 0)}`).join(' · ')],
      };
    }
    case 'eleicao': {
      const r = d.round as { turno: number; votosValidos: Record<CandId, number>; vencedor?: CandId; comparecimento: number; dataIso: string };
      const linha = CAND_IDS.filter((c) => r.votosValidos[c] > 0.5).map((c) => `${candidateLabel(s, c)} ${pct(r.votosValidos[c])}`).join(' · ');
      const titulo = r.vencedor ? `${r.vencedor === 'governo' ? 'Governo vence' : 'Oposição vence'} a eleição presidencial${r.turno === 2 ? ' no 2º turno' : ' no 1º turno'}` : 'Eleição presidencial vai ao 2º turno';
      return { ...base, editoria: 'eleicoes', tipo: 'noticia', provenance: 'contrafactual', titulo, linha_fina: `Resultado simulado (${isoLabel(r.dataIso)}). Votos válidos: ${linha}.`, corpo: [`Comparecimento: ${pct(r.comparecimento)}. Resultado contrafactual desta campanha; o resultado real de 2022 está na seção Dados e Fontes.`] };
    }
    case 'paralisacao':
      return { ...base, editoria: 'economia', tipo: 'noticia', titulo: 'Caminhoneiros param estradas em vários estados', linha_fina: 'Desabastecimento pontual afeta atividade e preços neste mês.', corpo: [] };
    case 'retirada':
      return { ...base, editoria: 'congresso', tipo: 'noticia', titulo: `Governo retira ${d.nome}`, linha_fina: 'Recuo tem custo de credibilidade, mas libera a agenda.', corpo: [] };
    case 'posse':
      return { ...base, editoria: 'politica', tipo: 'noticia', titulo: d.titulo, linha_fina: d.linha, corpo: [] };
    default:
      return null;
  }
}

/** Dados oficiais divulgados no início do mês (com defasagem). */
function releases(s: WorldState, published: number): Draft[] {
  const out: Draft[] = [];
  const v = (ind: 'ipca_mes' | 'ipca_12m' | 'desemprego' | 'pib_var_12m', ref: number) => s.serie[ind]?.[ref + SERIE_OFFSET] ?? null;
  const atraso = Number(s.flags.dados_atrasados_ate ?? -1) >= published;
  const refIpca = published - 1;
  const m = v('ipca_mes', refIpca);
  const a = v('ipca_12m', refIpca);
  if (m !== null && a !== null) {
    const ref = turnToDate(refIpca);
    out.push({
      editoria: 'dados',
      tipo: 'indicador',
      provenance: refIpca < 0 ? 'observado' : 'contrafactual',
      importancia: 5,
      titulo: `IPCA de ${MESES[ref.month - 1]} fica em ${pct(m, 2)}; em 12 meses, ${pct(a, 2)}`,
      linha_fina: refIpca < 0 ? 'Dado oficial do IBGE (observado).' : 'Dado do jogo (simulado), divulgado com um mês de defasagem.',
      corpo: [],
      indicadores: ['ipca_mes', 'ipca_12m'],
    });
  }
  const refDes = published - 2;
  const u = v('desemprego', refDes);
  if (u !== null && !atraso) {
    const ref = turnToDate(refDes);
    out.push({ editoria: 'dados', tipo: 'indicador', provenance: refDes < 0 ? 'observado' : 'contrafactual', importancia: 4, titulo: `Desemprego no trimestre até ${MESES[ref.month - 1]}: ${pct(u)}`, linha_fina: refDes < 0 ? 'PNAD Contínua (IBGE), observado.' : 'Simulado; divulgado com dois meses de defasagem.', corpo: [], indicadores: ['desemprego'] });
  }
  const p = v('pib_var_12m', refDes);
  if (p !== null && !atraso && refDes >= 0) {
    out.push({ editoria: 'dados', tipo: 'indicador', provenance: 'contrafactual', importancia: 4, titulo: `Atividade econômica: ${p >= 0 ? 'alta' : 'queda'} de ${pct(Math.abs(p))} em 12 meses`, linha_fina: `Referência: ${MESES[turnToDate(refDes).month - 1]} (índice simulado tipo IBC-Br).`, corpo: [], indicadores: ['pib_var_12m'] });
  }
  if (atraso) out.push({ editoria: 'dados', tipo: 'indicador', provenance: 'contrafactual', importancia: 4, titulo: 'Greve atrasa a divulgação de estatísticas', linha_fina: 'Parte dos dados oficiais deste mês não foi publicada.', corpo: [] });
  return out;
}

/** Colunas: mesmos fatos, ênfases diferentes. */
function colunas(s: WorldState): Draft[] {
  const i = s.ind;
  const fiscal: string[] = [];
  fiscal.push(`O primário acumulado no ano está em ${bi(i.primario_ano)} e a dívida bruta em ${pct(i.divida_pib)} do PIB.`);
  if (i.teto_folga < 0) fiscal.push(`A projeção de gastos estoura o teto em ${bi(-i.teto_folga)}: haverá bloqueio ou será preciso mudar a regra — e mudar regra custa credibilidade.`);
  else fiscal.push(`A folga projetada no teto é de ${bi(i.teto_folga)}, o que limita novos programas sem cortes em outras áreas.`);
  fiscal.push(i.risco_pais > 250 ? `O prêmio de risco em ${i.risco_pais.toFixed(0)} pontos encarece a dívida e pressiona o câmbio.` : `O prêmio de risco (${i.risco_pais.toFixed(0)} pontos) está sob controle por ora.`);
  const social: string[] = [];
  social.push(`Com a inflação em ${pct(i.ipca_12m, 1)} em 12 meses, quem mais sente é a família de baixa renda, que gasta quase tudo com comida, energia e transporte.`);
  social.push(`O desemprego estimado está em ${pct(i.desemprego)}; a recuperação ainda é desigual entre regiões.`);
  const filaAntes = s.serie.saude_fila?.[s.turn - 2 + SERIE_OFFSET];
  const filaSobe = typeof filaAntes === 'number' ? i.saude_fila > filaAntes + 0.1 : true;
  social.push(
    filaSobe
      ? `A fila de procedimentos no SUS continua crescendo (índice ${i.saude_fila.toFixed(0)}; janeiro = 100). Cortes de custeio não aparecem no anúncio, aparecem no atendimento.`
      : `A fila do SUS recuou no último mês (índice ${i.saude_fila.toFixed(0)}). A dúvida é se o ritmo se sustenta.`,
  );
  return [
    { editoria: 'opiniao', tipo: 'editorial', provenance: 'contrafactual', importancia: 2, titulo: 'A conta chega', coluna: 'Contas em Dia (coluna fiscal)', linha_fina: 'Perspectiva: responsabilidade fiscal', corpo: fiscal },
    { editoria: 'opiniao', tipo: 'editorial', provenance: 'contrafactual', importancia: 2, titulo: 'O país que não cabe na média', coluna: 'Vida Real (coluna social)', linha_fina: 'Perspectiva: distribuição e serviços', corpo: social },
  ];
}

export function generateNews(s: WorldState, ocorrencias: Ocorrencia[], publishedTurn: number): NewsItem[] {
  const drafts: Draft[] = [];
  for (const oc of ocorrencias) {
    const d = fromOcorrencia(s, oc);
    if (d) drafts.push(d);
  }
  drafts.push(...releases(s, publishedTurn));
  if (publishedTurn > 0) drafts.push(...colunas(s));
  return drafts.map((d, k) => ({ ...d, id: `n${publishedTurn}-${k}-${s.counters.seq}`, turn: publishedTurn }));
}

export const EDITORIA_LABEL: Record<Editoria, string> = {
  politica: 'Política',
  congresso: 'Congresso',
  economia: 'Economia',
  estados: 'Estados',
  servicos: 'Saúde e serviços',
  justica: 'Justiça',
  ambiente: 'Meio ambiente',
  mundo: 'Mundo',
  eleicoes: 'Eleições',
  opiniao: 'Opinião',
  dados: 'Dados',
};

export { formatIndicator };
