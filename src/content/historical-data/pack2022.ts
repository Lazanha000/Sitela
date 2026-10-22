/**
 * Pacote histórico "brasil-2022". Cada valor tem natureza, período de
 * referência, fonte e notas (spec §21). Valores marcados "verificar" foram
 * transcritos de memória de fontes públicas e devem ser conferidos contra
 * a fonte primária antes de qualquer uso fora do jogo — ver docs/DADOS.md.
 */
import type { Provenance } from '../../simulation/state/types';

export const DATA_PACK_ID = 'brasil-2022';
export const DATA_PACK_VERSION = '0.1.0';

export interface DataRecord {
  id: string;
  nome: string;
  valor: string;
  referencia: string;
  publicacao?: string;
  fonte: string;
  url?: string;
  tipo: Provenance;
  notas?: string;
}

export const DATA_RECORDS: DataRecord[] = [
  { id: 'selic_inicial', nome: 'Meta da taxa Selic', valor: '9,25% a.a.', referencia: 'decisão de 08/12/2021', fonte: 'Banco Central do Brasil — Copom', url: 'https://www.bcb.gov.br/controleinflacao/historicotaxasjuros', tipo: 'observado' },
  { id: 'ipca_2021', nome: 'IPCA acumulado em 2021', valor: '10,06%', referencia: 'jan–dez/2021', publicacao: '11/01/2022', fonte: 'IBGE', url: 'https://www.ibge.gov.br/explica/inflacao.php', tipo: 'observado' },
  { id: 'ipca_mensal_2021', nome: 'IPCA mensal de 2021', valor: '0,25; 0,86; 0,93; 0,31; 0,83; 0,53; 0,96; 0,87; 1,16; 1,25; 0,95; 0,73 (%)', referencia: 'jan–dez/2021', fonte: 'IBGE — SIDRA tabela 1737', url: 'https://sidra.ibge.gov.br/tabela/1737', tipo: 'observado', notas: 'Transcrito de memória; verificar.' },
  { id: 'meta_inflacao', nome: 'Meta de inflação', valor: '3,50% (2022) e 3,25% (2023), tolerância ±1,5 p.p.', referencia: '2022–2023', fonte: 'Conselho Monetário Nacional', tipo: 'fato' },
  { id: 'focus_jan22', nome: 'Expectativa de IPCA para 2022 (Focus)', valor: '≈ 5,0%', referencia: 'início de jan/2022', fonte: 'Banco Central — Boletim Focus', url: 'https://www.bcb.gov.br/publicacoes/focus', tipo: 'estimativa', notas: 'Valor aproximado; usado como expectativa inicial de 12 meses.' },
  { id: 'cambio_inicial', nome: 'Câmbio (PTAX venda)', valor: 'R$ 5,58/US$', referencia: '31/12/2021', fonte: 'Banco Central do Brasil — PTAX', tipo: 'observado', notas: 'R$ 5,5805; verificar.' },
  { id: 'desemprego_4t21', nome: 'Taxa de desocupação', valor: '11,1%', referencia: '4º tri/2021', publicacao: 'fev/2022', fonte: 'IBGE — PNAD Contínua', tipo: 'observado', notas: 'Valor do modelo em jan/2022. No início do jogo o último dado publicado é o do trimestre set–nov/2021 (≈ 11,6%; verificar).' },
  { id: 'pib_2021', nome: 'Crescimento do PIB em 2021', valor: '4,6%', referencia: '2021', publicacao: 'mar/2022 (1ª estimativa; revisada depois)', fonte: 'IBGE — Contas Nacionais', tipo: 'observado' },
  { id: 'pib_nominal_2021', nome: 'PIB nominal 2021', valor: '≈ R$ 8,7 trilhões', referencia: '2021', fonte: 'IBGE — Contas Nacionais (1ª estimativa)', tipo: 'observado', notas: 'Revisado posteriormente para cima.' },
  { id: 'dbgg_dez21', nome: 'Dívida bruta do governo geral', valor: '≈ 80,3% do PIB (≈ R$ 6,97 tri)', referencia: 'dez/2021', publicacao: 'fev/2022', fonte: 'Banco Central — Estatísticas fiscais', tipo: 'observado', notas: 'Percentual revisado depois com a revisão do PIB; verificar.' },
  { id: 'primario_2021', nome: 'Resultado primário do Governo Central', valor: 'déficit de ≈ R$ 35 bi (≈ 0,4% do PIB)', referencia: '2021', fonte: 'Tesouro Nacional — RTN', tipo: 'observado', notas: 'Verificar.' },
  { id: 'meta_primaria_2022', nome: 'Meta de resultado primário 2022 (LDO)', valor: 'déficit de até R$ 170,5 bi (Governo Central)', referencia: '2022', fonte: 'LDO 2022 (Lei 14.194/2021)', tipo: 'fato', notas: 'Verificar número da lei.' },
  { id: 'teto_2022', nome: 'Limite do teto de gastos 2022', valor: '≈ R$ 1.680 bi', referencia: '2022', fonte: 'EC 95/2016, alterada pelas EC 113 e 114/2021', tipo: 'estimativa', notas: 'Ordem de grandeza; o jogo usa este valor como limite anual.' },
  { id: 'discricionarias_2022', nome: 'Despesas discricionárias 2022 (incl. emendas)', valor: '≈ R$ 130 bi', referencia: 'LOA 2022', fonte: 'Abstração calibrada na LOA 2022', tipo: 'abstracao' },
  { id: 'auxilio_brasil', nome: 'Auxílio Brasil', valor: 'benefício mínimo de R$ 400; ≈ 17–18 mi de famílias', referencia: 'jan/2022', fonte: 'Ministério da Cidadania; Lei 14.284/2021', tipo: 'observado', notas: 'Número de famílias aproximado.' },
  { id: 'brent_2022', nome: 'Petróleo Brent (média mensal)', valor: '74 (dez/21); 87, 97, 117, 105, 113, 123, 112, 100, 90, 93, 91, 81 (2022)', referencia: 'dez/2021–dez/2022', fonte: 'U.S. EIA — Europe Brent Spot', url: 'https://www.eia.gov/dnav/pet/hist/rbrteM.htm', tipo: 'observado', notas: 'Valores aproximados, arredondados. Choque externo exógeno.' },
  { id: 'fed_2022', nome: 'Juro básico dos EUA (limite superior)', valor: '0,25% → 4,50% ao longo de 2022', referencia: '2022', fonte: 'Federal Reserve — FOMC', tipo: 'fato' },
  { id: 'commodities_idx', nome: 'Índice de commodities', valor: 'trajetória estilizada (jan/22 = 100; pico ≈ 118 no 2º tri)', referencia: '2022', fonte: 'Abstração inspirada no IC-Br (BCB) e CRB', tipo: 'abstracao' },
  { id: 'copom_2022', nome: 'Calendário do Copom 2022', valor: '2/fev, 16/mar, 4/mai, 15/jun, 3/ago, 21/set, 26/out, 7/dez', referencia: '2022', fonte: 'Banco Central do Brasil', tipo: 'fato' },
  { id: 'calendario_eleitoral', nome: 'Calendário eleitoral 2022', valor: 'janela partidária 3/mar–1º/abr; desincompatibilização 2/abr; condutas vedadas a partir de 2/jul; convenções 20/jul–5/ago; campanha a partir de 16/ago; 1º turno 2/out; 2º turno 30/out; posse 1º/jan/2023', referencia: '2022', fonte: 'TSE — Resolução 23.674/2021; Lei 9.504/1997', tipo: 'fato' },
  { id: 'congresso_estrutura', nome: 'Congresso Nacional', valor: 'Câmara 513 deputados; Senado 81 senadores', referencia: '2022', fonte: 'Constituição Federal, arts. 45–46', tipo: 'fato' },
  { id: 'congresso_blocos', nome: 'Blocos parlamentares do jogo', valor: 'Governistas ideológicos 90/9; Centrão 160/22; Centro independente 133/32; Oposição 130/18 (Câmara/Senado)', referencia: 'jan/2022', fonte: 'Abstração a partir da composição partidária aproximada de jan/2022', tipo: 'abstracao', notas: 'Partidos não votam em bloco perfeito; tamanhos são estimativas de jogo, não contagem oficial.' },
  { id: 'populacao_regioes', nome: 'Participação regional na população', valor: 'N 8,9%; NE 27,0%; SE 42,0%; S 14,3%; CO 7,8%', referencia: 'estimativa 2021', fonte: 'IBGE — Estimativas de população', tipo: 'estimativa', notas: 'Arredondado.' },
  { id: 'eleitorado_2022', nome: 'Eleitorado apto', valor: '≈ 156,5 milhões', referencia: '2022', fonte: 'TSE — Estatísticas do eleitorado', tipo: 'observado' },
  { id: 'avaliacao_dez21', nome: 'Avaliação do governo (ponto de partida)', valor: 'ótimo/bom ≈ 22%; ruim/péssimo ≈ 53%', referencia: 'dez/2021', fonte: 'Calibrado em pesquisas públicas de dez/2021', tipo: 'estimativa', notas: 'O jogo não reproduz pesquisas reais; todas as pesquisas exibidas na campanha são simulações.' },
  { id: 'prodes_2021', nome: 'Desmatamento na Amazônia Legal (PRODES)', valor: '≈ 13.200 km²', referencia: 'ago/2020–jul/2021', fonte: 'INPE — PRODES', url: 'http://terrabrasilis.dpi.inpe.br', tipo: 'observado', notas: 'Estimativa divulgada em nov/2021; taxa consolidada difere ligeiramente.' },
  { id: 'servicos_abstracoes', nome: 'Fila do SUS, capacidade administrativa e de fiscalização', valor: 'índices 0–100', referencia: '—', fonte: 'Abstração de jogo', tipo: 'abstracao', notas: 'Não há série oficial equivalente; usados para tornar visíveis capacidade e defasagem.' },
];

/** Fatos de 2022 que o jogo NÃO força: servem de comparação (spoilers). */
export const HISTORIA_REAL_2022: DataRecord[] = [
  { id: 'real_ipca22', nome: 'IPCA 2022', valor: '5,79%', referencia: '2022', fonte: 'IBGE', tipo: 'fato' },
  { id: 'real_selic22', nome: 'Selic ao fim de 2022', valor: '13,75% (desde ago/2022)', referencia: '2022', fonte: 'Banco Central', tipo: 'fato' },
  { id: 'real_pib22', nome: 'PIB 2022', valor: '+2,9% (1ª estimativa, revisada para +3,0%)', referencia: '2022', fonte: 'IBGE', tipo: 'fato' },
  { id: 'real_desemprego', nome: 'Desocupação no 4º tri/2022', valor: '7,9%', referencia: '4º tri/2022', fonte: 'IBGE — PNAD Contínua', tipo: 'fato' },
  { id: 'real_primario', nome: 'Primário do Governo Central 2022', valor: 'superávit de ≈ R$ 54 bi', referencia: '2022', fonte: 'Tesouro Nacional', tipo: 'fato', notas: 'Verificar.' },
  { id: 'real_divida', nome: 'Dívida bruta / PIB', valor: '≈ 73,5% (1ª divulgação)', referencia: 'dez/2022', fonte: 'Banco Central', tipo: 'fato', notas: 'Verificar.' },
  { id: 'real_lc192', nome: 'PIS/Cofins zerado sobre diesel e GLP', valor: 'LC 192/2022', referencia: 'mar/2022', fonte: 'Planalto', tipo: 'fato' },
  { id: 'real_lc194', nome: 'ICMS de combustíveis, energia e telecom limitado (bens essenciais)', valor: 'LC 194/2022', referencia: 'jun/2022', fonte: 'Planalto', tipo: 'fato' },
  { id: 'real_ec123', nome: 'Estado de emergência: Auxílio Brasil a R$ 600 e outros benefícios até dez/2022', valor: 'EC 123/2022', referencia: 'jul/2022', fonte: 'Planalto', tipo: 'fato' },
  { id: 'real_petrobras', nome: 'Petrobras teve três presidentes em 2022', valor: 'trocas em abr e jun/2022', referencia: '2022', fonte: 'Petrobras — fatos relevantes', tipo: 'fato' },
  { id: 'real_eletrobras', nome: 'Capitalização da Eletrobras', valor: 'aprovada pelo TCU em mai/2022; oferta em jun/2022', referencia: '2022', fonte: 'TCU; Eletrobras', tipo: 'fato' },
  { id: 'real_1turno', nome: 'Eleição presidencial — 1º turno (2/out)', valor: 'Lula 48,43%; Bolsonaro 43,20%; Tebet 4,16%; Ciro 3,04%', referencia: '02/10/2022', fonte: 'TSE', tipo: 'fato' },
  { id: 'real_2turno', nome: 'Eleição presidencial — 2º turno (30/out)', valor: 'Lula 50,90%; Bolsonaro 49,10%', referencia: '30/10/2022', fonte: 'TSE', tipo: 'fato' },
  { id: 'real_prodes22', nome: 'Desmatamento na Amazônia (PRODES)', valor: '≈ 11.600 km²', referencia: 'ago/2021–jul/2022', fonte: 'INPE', tipo: 'fato', notas: 'Estimativa divulgada em nov/2022; verificar.' },
];

/** Séries exógenas (índice 0 = dez/2021, 1..12 = 2022, 13 = jan/2023). */
export const EXOGENO = {
  brent: [74, 87, 97, 117, 105, 113, 123, 112, 100, 90, 93, 91, 81, 83],
  fed: [0.25, 0.25, 0.25, 0.5, 0.5, 1.0, 1.75, 2.5, 2.5, 3.25, 3.25, 4.0, 4.5, 4.5],
  commodities: [98, 100, 106, 118, 117, 118, 116, 108, 108, 104, 104, 105, 103, 103],
};

/** IPCA mensal observado em 2021 (IBGE). */
export const IPCA_2021 = [0.25, 0.86, 0.93, 0.31, 0.83, 0.53, 0.96, 0.87, 1.16, 1.25, 0.95, 0.73];

/** Selic no fim de cada mês de 2021 (Copom). */
export const SELIC_2021 = [2.0, 2.0, 2.75, 2.75, 3.5, 4.25, 4.25, 5.25, 6.25, 7.75, 7.75, 9.25];

/** Índice de atividade estilizado de 2021 (média ≈ 100), abstração. */
export const ATIVIDADE_2021 = [99.2, 99.6, 99.1, 99.3, 100.4, 100.3, 100.2, 100.0, 99.8, 100.2, 100.6, 101.0];

/** Fluxo mensal estilizado de desmatamento (km²), soma ≈ PRODES 2021. */
export const DESMATAMENTO_BASE = [290, 290, 430, 790, 1290, 1570, 2140, 2290, 2000, 860, 710, 360];

export const COPOM_MESES_2022 = [2, 3, 5, 6, 8, 9, 10, 12];
export const COPOM_DATAS: Record<number, string> = { 2: '2022-02-02', 3: '2022-03-16', 5: '2022-05-04', 6: '2022-06-15', 8: '2022-08-03', 9: '2022-09-21', 10: '2022-10-26', 12: '2022-12-07' };
/** Relatórios bimestrais de avaliação de receitas e despesas (datas aproximadas). */
export const RELATORIO_BIMESTRAL_MESES = [3, 5, 7, 9, 11];

export const META_INFLACAO = { 2022: 3.5, 2023: 3.25 };
export const META_PRIMARIA_2022 = -170.5;

export interface CalendarFact {
  dataIso: string;
  titulo: string;
  descricao: string;
  tipo: Provenance;
  fonte: string;
}

export const CALENDARIO_2022: CalendarFact[] = [
  { dataIso: '2022-01-01', titulo: 'Início da campanha', descricao: 'O jogador assume a condução do Executivo federal no quadro institucional de 1º de janeiro de 2022.', tipo: 'abstracao', fonte: '—' },
  { dataIso: '2022-02-02', titulo: 'Reunião do Copom', descricao: 'Primeira reunião do ano do Comitê de Política Monetária.', tipo: 'fato', fonte: 'BCB' },
  { dataIso: '2022-03-03', titulo: 'Abre a janela partidária', descricao: 'Deputados podem trocar de partido sem perder o mandato até 1º/abr.', tipo: 'fato', fonte: 'TSE' },
  { dataIso: '2022-04-02', titulo: 'Prazo de desincompatibilização', descricao: 'Ministros que disputarão eleições deixam os cargos.', tipo: 'fato', fonte: 'LC 64/1990' },
  { dataIso: '2022-04-05', titulo: 'Vedação a reajuste acima da inflação', descricao: 'A partir de 180 dias antes da eleição, revisão geral de servidores não pode exceder a inflação do ano.', tipo: 'fato', fonte: 'Lei 9.504/1997, art. 73, VIII' },
  { dataIso: '2022-07-02', titulo: 'Começam as condutas vedadas', descricao: 'Três meses antes do pleito: suspensas transferências voluntárias, publicidade institucional e nomeações (com exceções).', tipo: 'fato', fonte: 'Lei 9.504/1997, art. 73' },
  { dataIso: '2022-07-20', titulo: 'Convenções partidárias', descricao: 'Partidos escolhem candidatos e coligações até 5/ago.', tipo: 'fato', fonte: 'TSE' },
  { dataIso: '2022-08-16', titulo: 'Início da campanha eleitoral', descricao: 'Propaganda eleitoral permitida.', tipo: 'fato', fonte: 'TSE' },
  { dataIso: '2022-08-26', titulo: 'Horário eleitoral gratuito', descricao: 'Começa a propaganda no rádio e na TV.', tipo: 'fato', fonte: 'TSE' },
  { dataIso: '2022-10-02', titulo: 'Eleições gerais — 1º turno', descricao: 'Presidente, governadores, senadores, deputados.', tipo: 'fato', fonte: 'TSE' },
  { dataIso: '2022-10-30', titulo: 'Eleições — 2º turno', descricao: 'Segundo turno para Presidente e governadores, se necessário.', tipo: 'fato', fonte: 'TSE' },
  { dataIso: '2023-01-01', titulo: 'Posse presidencial', descricao: 'Fim da campanha de 2022.', tipo: 'fato', fonte: 'CF, art. 82' },
];
