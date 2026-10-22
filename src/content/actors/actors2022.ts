/**
 * Atores do cenário 2022: grupos sociais, regiões, bancadas e órgãos.
 * Todos os parâmetros comportamentais são ABSTRAÇÕES DE JOGO calibradas
 * para plausibilidade (spec §4.5), não estimativas econométricas.
 */
import type { BlocId, GroupId, OpinionFactor, OrgId, RegionId } from '../../simulation/state/types';

export const GROUPS: Record<GroupId, { label: string; descricao: string; perfilInicial: number }> = {
  baixa_renda: { label: 'Baixa renda', descricao: 'Famílias com renda até ~2 salários mínimos, inclusive informais e beneficiários de transferências.', perfilInicial: -38 },
  trabalhadores: { label: 'Renda média', descricao: 'Trabalhadores formais e autônomos de renda média, urbanos.', perfilInicial: -30 },
  alta_renda: { label: 'Alta renda', descricao: 'Profissionais de alta renda, empresários urbanos e investidores.', perfilInicial: -14 },
  agro: { label: 'Agro e interior produtivo', descricao: 'Produtores rurais, trabalhadores e cadeias do agronegócio.', perfilInicial: 22 },
  servidores: { label: 'Servidores públicos', descricao: 'Servidores civis e militares e suas famílias.', perfilInicial: -34 },
};

export const GROUP_IDS = Object.keys(GROUPS) as GroupId[];

/** Sensibilidade (multiplicador) de cada grupo a cada fator de opinião. */
export const SENSIBILIDADE: Record<GroupId, Record<OpinionFactor, number>> = {
  baixa_renda: { inflacao: 1.6, emprego: 1.3, renda: 1.0, combustiveis: 0.8, servicos: 1.3, instituicoes: 0.6, ambiente: 0.2, eventos: 1, campanha: 1 },
  trabalhadores: { inflacao: 1.3, emprego: 1.2, renda: 1.0, combustiveis: 1.2, servicos: 1.0, instituicoes: 0.9, ambiente: 0.5, eventos: 1, campanha: 1 },
  alta_renda: { inflacao: 0.8, emprego: 0.4, renda: 1.0, combustiveis: 0.7, servicos: 0.4, instituicoes: 1.3, ambiente: 1.0, eventos: 1, campanha: 0.8 },
  agro: { inflacao: 0.6, emprego: 0.4, renda: 1.0, combustiveis: 1.1, servicos: 0.4, instituicoes: 0.3, ambiente: 0.6, eventos: 1, campanha: 0.9 },
  servidores: { inflacao: 1.3, emprego: 0.2, renda: 1.0, combustiveis: 0.8, servicos: 0.8, instituicoes: 1.1, ambiente: 0.6, eventos: 1, campanha: 0.9 },
};

/** Velocidade de ajuste dos estoques de opinião (fração por mês). */
export const VELOCIDADE_OPINIAO: Record<OpinionFactor, number> = {
  inflacao: 0.25,
  emprego: 0.15,
  renda: 0.4,
  combustiveis: 0.4,
  servicos: 0.2,
  instituicoes: 0.2,
  ambiente: 0.1,
  eventos: 0.25, // decaimento
  campanha: 0.12, // decaimento
};

export const FACTOR_LABELS: Record<OpinionFactor, string> = {
  inflacao: 'Inflação e custo de vida',
  emprego: 'Emprego',
  renda: 'Renda e transferências',
  combustiveis: 'Preço dos combustíveis',
  servicos: 'Serviços públicos',
  instituicoes: 'Conflito institucional',
  ambiente: 'Meio ambiente',
  eventos: 'Acontecimentos recentes',
  campanha: 'Campanha e comunicação',
};

export const REGIONS: Record<RegionId, { label: string; pop: number; lean: number; mix: Record<GroupId, number>; governadores: { alinhamento: number; cooperacao: number; necessidadeFiscal: number } }> = {
  N: { label: 'Norte', pop: 0.089, lean: 4, mix: { baixa_renda: 0.52, trabalhadores: 0.24, alta_renda: 0.06, agro: 0.12, servidores: 0.06 }, governadores: { alinhamento: 55, cooperacao: 55, necessidadeFiscal: 65 } },
  NE: { label: 'Nordeste', pop: 0.27, lean: -12, mix: { baixa_renda: 0.58, trabalhadores: 0.22, alta_renda: 0.06, agro: 0.08, servidores: 0.06 }, governadores: { alinhamento: 25, cooperacao: 40, necessidadeFiscal: 75 } },
  CO: { label: 'Centro-Oeste', pop: 0.078, lean: 9, mix: { baixa_renda: 0.34, trabalhadores: 0.3, alta_renda: 0.12, agro: 0.16, servidores: 0.08 }, governadores: { alinhamento: 65, cooperacao: 60, necessidadeFiscal: 45 } },
  SE: { label: 'Sudeste', pop: 0.42, lean: 2, mix: { baixa_renda: 0.34, trabalhadores: 0.36, alta_renda: 0.14, agro: 0.06, servidores: 0.1 }, governadores: { alinhamento: 40, cooperacao: 45, necessidadeFiscal: 45 } },
  S: { label: 'Sul', pop: 0.143, lean: 8, mix: { baixa_renda: 0.3, trabalhadores: 0.38, alta_renda: 0.12, agro: 0.12, servidores: 0.08 }, governadores: { alinhamento: 55, cooperacao: 50, necessidadeFiscal: 40 } },
};

export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

/** Peso de cada grupo na população, derivado das regiões (consistente por construção). */
export function groupWeights(): Record<GroupId, number> {
  const w = Object.fromEntries(GROUP_IDS.map((g) => [g, 0])) as Record<GroupId, number>;
  for (const r of REGION_IDS) for (const g of GROUP_IDS) w[g] += REGIONS[r].pop * REGIONS[r].mix[g];
  return w;
}

export interface BlocDef {
  label: string;
  descricao: string;
  seats: { camara: number; senado: number };
  relacao: number;
  disciplina: number;
  /** Quanto emendas/demandas regionais movem a bancada. */
  interesseEmendas: number;
  /** Quanto a bancada reage à popularidade de uma pauta em ano eleitoral. */
  sensibilidadeEleitoral: number;
  /** Aversão a expansão fiscal (penaliza projetos caros). */
  fiscalismo: number;
}

export const BLOCS: Record<BlocId, BlocDef> = {
  ideologicos: { label: 'Governistas ideológicos', descricao: 'Base alinhada à agenda do governo por convicção. Alta disciplina.', seats: { camara: 90, senado: 9 }, relacao: 85, disciplina: 0.9, interesseEmendas: 0.4, sensibilidadeEleitoral: 0.5, fiscalismo: 0.2 },
  centrao: { label: 'Centrão', descricao: 'Partidos de centro-direita pragmáticos; apoio condicionado a espaço político, emendas e viabilidade eleitoral.', seats: { camara: 160, senado: 22 }, relacao: 65, disciplina: 0.7, interesseEmendas: 1.0, sensibilidadeEleitoral: 1.0, fiscalismo: 0.2 },
  centro: { label: 'Centro independente', descricao: 'Partidos de centro e centro-direita sem compromisso com o governo; sensíveis a credibilidade fiscal e institucional.', seats: { camara: 133, senado: 32 }, relacao: 40, disciplina: 0.6, interesseEmendas: 0.6, sensibilidadeEleitoral: 0.7, fiscalismo: 0.7 },
  oposicao: { label: 'Oposição', descricao: 'Partidos de esquerda e centro-esquerda. Podem apoiar pautas sociais pontuais.', seats: { camara: 130, senado: 18 }, relacao: 10, disciplina: 0.9, interesseEmendas: 0.2, sensibilidadeEleitoral: 0.6, fiscalismo: 0.3 },
};

export const BLOC_IDS = Object.keys(BLOCS) as BlocId[];

export const ORGS: Record<OrgId, { label: string; capacidade: number }> = {
  economia: { label: 'Ministério da Economia', capacidade: 62 },
  cidadania: { label: 'Ministério da Cidadania', capacidade: 58 },
  saude: { label: 'Ministério da Saúde', capacidade: 55 },
  infraestrutura: { label: 'Infraestrutura e Desenvolvimento Regional', capacidade: 50 },
  meio_ambiente: { label: 'Meio Ambiente (Ibama/ICMBio)', capacidade: 40 },
  minas_energia: { label: 'Minas e Energia', capacidade: 55 },
  gestao: { label: 'Gestão e Governo Digital', capacidade: 50 },
};
