/**
 * Registro de indicadores: rótulo, unidade, natureza (estoque/fluxo),
 * direção desejável e regra de divulgação (spec §3.3: período de
 * referência ≠ data de publicação).
 */
export type IndicatorId =
  // Economia
  | 'atividade'
  | 'pib_var_12m'
  | 'hiato'
  | 'ipca_mes'
  | 'ipca_12m'
  | 'expect_ipca'
  | 'selic'
  | 'cambio'
  | 'desemprego'
  | 'brent'
  | 'commodities'
  | 'combustivel'
  | 'confianca_empresarial'
  | 'risco_pais'
  // Fiscal (R$ bilhões)
  | 'receita_mes'
  | 'despesa_mes'
  | 'primario_mes'
  | 'juros_mes'
  | 'receita_ano'
  | 'despesa_ano'
  | 'primario_ano'
  | 'juros_ano'
  | 'divida_bruta'
  | 'pib_nominal'
  | 'divida_pib'
  | 'teto_folga'
  // Capital político (0..100)
  | 'pc_apoio_social'
  | 'pc_confianca_aliados'
  | 'pc_negociacao'
  | 'pc_credibilidade'
  | 'pc_coesao'
  | 'pc_mobilizacao'
  // Opinião
  | 'aval_saldo'
  | 'aval_positiva'
  | 'aval_negativa'
  | 'polarizacao'
  | 'confianca_eleitoral'
  // Instituições e federação
  | 'tensao_institucional'
  | 'relacao_stf'
  | 'coop_federativa'
  // Serviços e ambiente
  | 'saude_fila'
  | 'fiscalizacao_amb'
  | 'desmatamento_12m'
  | 'capacidade_adm'
  | 'risco_fertilizantes';

export type IndicatorCategory =
  | 'economia'
  | 'fiscal'
  | 'capital'
  | 'opiniao'
  | 'instituicoes'
  | 'servicos';

export interface IndicatorDef {
  id: IndicatorId;
  label: string;
  unidade: string;
  casas: number;
  categoria: IndicatorCategory;
  natureza: 'estoque' | 'fluxo' | 'taxa' | 'indice';
  /** 'up' = subir é desejável para a maioria; 'down' o contrário. */
  direcao: 'up' | 'down' | 'neutral';
  descricao: string;
  /** Defasagem de divulgação oficial, em meses (0 = acompanhamento diário). */
  divulgacao?: { defasagem: number; fonte: string; referencia: string };
  abstracao?: boolean;
}

const D = (d: IndicatorDef) => d;

export const INDICATORS: Record<IndicatorId, IndicatorDef> = {
  atividade: D({ id: 'atividade', label: 'Atividade econômica (índice)', unidade: 'índice', casas: 1, categoria: 'economia', natureza: 'indice', direcao: 'up', descricao: 'Índice mensal de atividade simulado (média de 2021 ≈ 100), inspirado no IBC-Br.', abstracao: true }),
  pib_var_12m: D({ id: 'pib_var_12m', label: 'Atividade — variação em 12 meses', unidade: '%', casas: 1, categoria: 'economia', natureza: 'taxa', direcao: 'up', descricao: 'Variação do índice de atividade frente ao mesmo mês do ano anterior.', divulgacao: { defasagem: 2, fonte: 'Banco Central (IBC-Br, simulado)', referencia: 'mês' } }),
  hiato: D({ id: 'hiato', label: 'Hiato do produto', unidade: '% do potencial', casas: 1, categoria: 'economia', natureza: 'taxa', direcao: 'neutral', descricao: 'Distância entre a atividade e o potencial. Positivo pressiona preços; negativo indica ociosidade.', abstracao: true }),
  ipca_mes: D({ id: 'ipca_mes', label: 'IPCA do mês', unidade: '%', casas: 2, categoria: 'economia', natureza: 'fluxo', direcao: 'down', descricao: 'Inflação mensal ao consumidor.', divulgacao: { defasagem: 1, fonte: 'IBGE (simulado após jan/2022)', referencia: 'mês' } }),
  ipca_12m: D({ id: 'ipca_12m', label: 'IPCA em 12 meses', unidade: '%', casas: 2, categoria: 'economia', natureza: 'taxa', direcao: 'down', descricao: 'Inflação acumulada em 12 meses. Cair não significa que os preços voltaram ao nível anterior.', divulgacao: { defasagem: 1, fonte: 'IBGE (simulado após jan/2022)', referencia: 'mês' } }),
  expect_ipca: D({ id: 'expect_ipca', label: 'Expectativa de inflação (12 meses)', unidade: '%', casas: 2, categoria: 'economia', natureza: 'taxa', direcao: 'down', descricao: 'Expectativa de mercado para a inflação dos próximos 12 meses (inspirada no Focus).' }),
  selic: D({ id: 'selic', label: 'Taxa Selic (meta)', unidade: '% a.a.', casas: 2, categoria: 'economia', natureza: 'taxa', direcao: 'neutral', descricao: 'Definida pelo Copom/Banco Central, autônomo (LC 179/2021). O Executivo não a controla.' }),
  cambio: D({ id: 'cambio', label: 'Câmbio', unidade: 'R$/US$', casas: 2, categoria: 'economia', natureza: 'indice', direcao: 'neutral', descricao: 'Taxa de câmbio média do mês. Depreciação ajuda exportadores e encarece importados.' }),
  desemprego: D({ id: 'desemprego', label: 'Desemprego', unidade: '%', casas: 1, categoria: 'economia', natureza: 'taxa', direcao: 'down', descricao: 'Taxa de desocupação. Responde à atividade com defasagem.', divulgacao: { defasagem: 2, fonte: 'IBGE/PNAD Contínua (simulado)', referencia: 'trimestre móvel' } }),
  brent: D({ id: 'brent', label: 'Petróleo Brent', unidade: 'US$/barril', casas: 0, categoria: 'economia', natureza: 'indice', direcao: 'neutral', descricao: 'Preço internacional — choque externo, fora do controle do governo.' }),
  commodities: D({ id: 'commodities', label: 'Commodities (índice)', unidade: 'jan/22 = 100', casas: 0, categoria: 'economia', natureza: 'indice', direcao: 'neutral', descricao: 'Preços internacionais de commodities exportadas pelo Brasil (abstração).', abstracao: true }),
  combustivel: D({ id: 'combustivel', label: 'Preço dos combustíveis', unidade: 'dez/21 = 100', casas: 1, categoria: 'economia', natureza: 'indice', direcao: 'down', descricao: 'Preço ao consumidor: refinaria (paridade de importação com repasse parcial) + tributos federais + ICMS.' }),
  confianca_empresarial: D({ id: 'confianca_empresarial', label: 'Confiança empresarial', unidade: '100 = neutro', casas: 1, categoria: 'economia', natureza: 'indice', direcao: 'up', descricao: 'Índice abstrato de confiança de empresas.', abstracao: true }),
  risco_pais: D({ id: 'risco_pais', label: 'Prêmio de risco', unidade: 'pontos-base', casas: 0, categoria: 'economia', natureza: 'indice', direcao: 'down', descricao: 'Prêmio de risco soberano (abstração inspirada no CDS de 5 anos).', abstracao: true }),
  receita_mes: D({ id: 'receita_mes', label: 'Receita líquida do mês', unidade: 'R$ bi', casas: 1, categoria: 'fiscal', natureza: 'fluxo', direcao: 'up', descricao: 'Receita líquida do Governo Central (após transferências constitucionais).' }),
  despesa_mes: D({ id: 'despesa_mes', label: 'Despesa primária do mês', unidade: 'R$ bi', casas: 1, categoria: 'fiscal', natureza: 'fluxo', direcao: 'neutral', descricao: 'Despesa primária do Governo Central (obrigatórias + discricionárias + programas).' }),
  primario_mes: D({ id: 'primario_mes', label: 'Resultado primário do mês', unidade: 'R$ bi', casas: 1, categoria: 'fiscal', natureza: 'fluxo', direcao: 'up', descricao: 'Receita líquida menos despesa primária.' }),
  juros_mes: D({ id: 'juros_mes', label: 'Juros da dívida no mês', unidade: 'R$ bi', casas: 1, categoria: 'fiscal', natureza: 'fluxo', direcao: 'down', descricao: 'Custo nominal da dívida (taxa implícita depende de Selic e inflação).', abstracao: true }),
  receita_ano: D({ id: 'receita_ano', label: 'Receita no ano', unidade: 'R$ bi', casas: 0, categoria: 'fiscal', natureza: 'fluxo', direcao: 'up', descricao: 'Receita líquida acumulada no ano.' }),
  despesa_ano: D({ id: 'despesa_ano', label: 'Despesa primária no ano', unidade: 'R$ bi', casas: 0, categoria: 'fiscal', natureza: 'fluxo', direcao: 'neutral', descricao: 'Despesa primária acumulada no ano.' }),
  primario_ano: D({ id: 'primario_ano', label: 'Primário no ano', unidade: 'R$ bi', casas: 1, categoria: 'fiscal', natureza: 'fluxo', direcao: 'up', descricao: 'Resultado primário acumulado no ano (meta LDO 2022: déficit de até R$ 170,5 bi).' }),
  juros_ano: D({ id: 'juros_ano', label: 'Juros no ano', unidade: 'R$ bi', casas: 0, categoria: 'fiscal', natureza: 'fluxo', direcao: 'down', descricao: 'Juros nominais acumulados no ano.' }),
  divida_bruta: D({ id: 'divida_bruta', label: 'Dívida bruta', unidade: 'R$ bi', casas: 0, categoria: 'fiscal', natureza: 'estoque', direcao: 'down', descricao: 'Estoque da dívida bruta: cresce com juros e déficits, cai com superávits.' }),
  pib_nominal: D({ id: 'pib_nominal', label: 'PIB nominal (12 meses)', unidade: 'R$ bi', casas: 0, categoria: 'fiscal', natureza: 'fluxo', direcao: 'up', descricao: 'PIB em reais correntes acumulado em 12 meses (deflator ≈ IPCA, abstração).' }),
  divida_pib: D({ id: 'divida_pib', label: 'Dívida bruta / PIB', unidade: '% do PIB', casas: 1, categoria: 'fiscal', natureza: 'taxa', direcao: 'down', descricao: 'Depende tanto da dívida quanto do PIB nominal: inflação alta reduz a razão no curto prazo.' }),
  teto_folga: D({ id: 'teto_folga', label: 'Folga no teto de gastos', unidade: 'R$ bi', casas: 1, categoria: 'fiscal', natureza: 'estoque', direcao: 'up', descricao: 'Limite anual (EC 95) menos despesa projetada para o ano. Negativa obriga bloqueio nos relatórios bimestrais.' }),
  pc_apoio_social: D({ id: 'pc_apoio_social', label: 'Apoio social', unidade: '0–100', casas: 0, categoria: 'capital', natureza: 'estoque', direcao: 'up', descricao: 'Capital político derivado da avaliação popular (suavizado).', abstracao: true }),
  pc_confianca_aliados: D({ id: 'pc_confianca_aliados', label: 'Confiança dos aliados', unidade: '0–100', casas: 0, categoria: 'capital', natureza: 'estoque', direcao: 'up', descricao: 'Cumprimento de acordos, vitórias, viabilidade eleitoral. Afeta a precisão das contagens de votos.', abstracao: true }),
  pc_negociacao: D({ id: 'pc_negociacao', label: 'Capacidade de negociação', unidade: '0–100', casas: 0, categoria: 'capital', natureza: 'estoque', direcao: 'up', descricao: 'Recurso gasto em negociações e lançamentos; regenera a cada mês. Recurso escasso.', abstracao: true }),
  pc_credibilidade: D({ id: 'pc_credibilidade', label: 'Credibilidade institucional', unidade: '0–100', casas: 0, categoria: 'capital', natureza: 'estoque', direcao: 'up', descricao: 'Previsibilidade, respeito às regras fiscais e às instituições.', abstracao: true }),
  pc_coesao: D({ id: 'pc_coesao', label: 'Coesão da coalizão', unidade: '0–100', casas: 0, categoria: 'capital', natureza: 'estoque', direcao: 'up', descricao: 'Média da relação das bancadas aliadas com o governo.', abstracao: true }),
  pc_mobilizacao: D({ id: 'pc_mobilizacao', label: 'Mobilização da base', unidade: '0–100', casas: 0, categoria: 'capital', natureza: 'estoque', direcao: 'up', descricao: 'Disposição da base social de se engajar (afeta comparecimento).', abstracao: true }),
  aval_saldo: D({ id: 'aval_saldo', label: 'Saldo de avaliação', unidade: 'pontos', casas: 1, categoria: 'opiniao', natureza: 'indice', direcao: 'up', descricao: 'Ótimo/bom menos ruim/péssimo, agregado por região e grupo.' }),
  aval_positiva: D({ id: 'aval_positiva', label: 'Avaliação ótimo/bom', unidade: '%', casas: 0, categoria: 'opiniao', natureza: 'taxa', direcao: 'up', descricao: 'Parcela que avalia o governo como ótimo ou bom (simulação).' }),
  aval_negativa: D({ id: 'aval_negativa', label: 'Avaliação ruim/péssimo', unidade: '%', casas: 0, categoria: 'opiniao', natureza: 'taxa', direcao: 'down', descricao: 'Parcela que avalia o governo como ruim ou péssimo (simulação).' }),
  polarizacao: D({ id: 'polarizacao', label: 'Polarização', unidade: '0–100', casas: 0, categoria: 'opiniao', natureza: 'indice', direcao: 'down', descricao: 'Reduz a parcela "regular" e o espaço de persuasão.', abstracao: true }),
  confianca_eleitoral: D({ id: 'confianca_eleitoral', label: 'Confiança no processo eleitoral', unidade: '0–100', casas: 0, categoria: 'opiniao', natureza: 'estoque', direcao: 'up', descricao: 'Confiança pública nas regras e na apuração.', abstracao: true }),
  tensao_institucional: D({ id: 'tensao_institucional', label: 'Tensão entre Poderes', unidade: '0–100', casas: 0, categoria: 'instituicoes', natureza: 'estoque', direcao: 'down', descricao: 'Conflito acumulado entre Executivo, Judiciário e Legislativo. Decai lentamente.', abstracao: true }),
  relacao_stf: D({ id: 'relacao_stf', label: 'Relação com o STF', unidade: '0–100', casas: 0, categoria: 'instituicoes', natureza: 'estoque', direcao: 'up', descricao: 'Clima institucional. Não determina decisões, que dependem dos fundamentos.', abstracao: true }),
  coop_federativa: D({ id: 'coop_federativa', label: 'Cooperação federativa', unidade: '0–100', casas: 0, categoria: 'instituicoes', natureza: 'estoque', direcao: 'up', descricao: 'Média ponderada da cooperação dos governadores.', abstracao: true }),
  saude_fila: D({ id: 'saude_fila', label: 'Fila de procedimentos eletivos', unidade: 'jan/22 = 100', casas: 0, categoria: 'servicos', natureza: 'estoque', direcao: 'down', descricao: 'Demanda reprimida no SUS após a pandemia (abstração).', abstracao: true }),
  fiscalizacao_amb: D({ id: 'fiscalizacao_amb', label: 'Capacidade de fiscalização ambiental', unidade: '0–100', casas: 0, categoria: 'servicos', natureza: 'estoque', direcao: 'up', descricao: 'Pessoal, logística e coordenação de Ibama/ICMBio/PF (abstração).', abstracao: true }),
  desmatamento_12m: D({ id: 'desmatamento_12m', label: 'Desmatamento na Amazônia (12 meses)', unidade: 'km²', casas: 0, categoria: 'servicos', natureza: 'fluxo', direcao: 'down', descricao: 'Soma dos últimos 12 meses (inspirado no PRODES/DETER). Área já desmatada não volta.' }),
  capacidade_adm: D({ id: 'capacidade_adm', label: 'Capacidade administrativa', unidade: '0–100', casas: 0, categoria: 'servicos', natureza: 'estoque', direcao: 'up', descricao: 'Capacidade média de execução da administração federal.', abstracao: true }),
  risco_fertilizantes: D({ id: 'risco_fertilizantes', label: 'Risco de oferta de fertilizantes', unidade: '0–100', casas: 0, categoria: 'economia', natureza: 'indice', direcao: 'down', descricao: 'Dependência de importações (Rússia/Belarus) diante da guerra (abstração).', abstracao: true }),
};

export const ALL_INDICATORS = Object.keys(INDICATORS) as IndicatorId[];

export function formatIndicator(id: IndicatorId, v: number): string {
  const d = INDICATORS[id];
  const n = v.toLocaleString('pt-BR', { minimumFractionDigits: d.casas, maximumFractionDigits: d.casas });
  switch (d.unidade) {
    case '%':
    case '% a.a.':
    case '% do PIB':
    case '% do potencial':
      return `${n}%`;
    case 'R$ bi':
      return `R$ ${n} bi`;
    case 'R$/US$':
      return `R$ ${n}`;
    case 'US$/barril':
      return `US$ ${n}`;
    case 'km²':
      return `${n} km²`;
    case 'pontos-base':
      return `${n} pb`;
    default:
      return n;
  }
}

export function formatDelta(id: IndicatorId, delta: number): string {
  const d = INDICATORS[id];
  const casas = Math.max(d.casas, Math.abs(delta) < 1 ? 2 : d.casas);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  const n = Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
  const unit = d.unidade === '%' || d.unidade === '% a.a.' || d.unidade === '% do PIB' || d.unidade === '% do potencial' ? ' p.p.' : d.unidade === 'R$ bi' ? ' bi' : '';
  return `${sign}${n}${unit}`;
}
