/**
 * Macroeconomia mensal simplificada (spec §9). Modelo de hiato:
 *  - Hiato ← persistência, juros reais defasados, impulso fiscal,
 *    commodities, reabertura, confiança, choques.
 *  - Inflação mensal ← inércia, expectativas, demanda, câmbio,
 *    combustíveis, sazonalidade, choques e efeitos diretos de políticas.
 *  - Copom (autônomo) segue regra documentada; o Executivo não decide.
 *  - Câmbio converge a um valor de equilíbrio (juros, commodities, risco).
 * Coeficientes: ABSTRAÇÃO DE JOGO, ver docs/CAUSALIDADE.md.
 */
import { C, type Cause } from '../../simulation/causality/ledger';
import { clamp, type Ctx } from '../../simulation/engine/context';
import { turnToDate } from '../../simulation/time/calendar';
import { COPOM_DATAS, COPOM_MESES_2022, EXOGENO, META_INFLACAO } from '../../content/historical-data/pack2022';

export interface CausalValue {
  cause: Cause;
  value: number;
}

export interface EconomyInputs {
  /** Impulso ao hiato (p.p.) por política (gasto × multiplicador). */
  fiscalImpulses: CausalValue[];
  /** Efeitos diretos no IPCA do mês (p.p.). */
  inflacaoDireta: CausalValue[];
  /** Mudanças de alavancas de combustíveis (variação do nível). */
  leverChanges: { alavanca: 'fedTaxa' | 'icmsNivel' | 'petrobrasAjuste'; cause: Cause; delta: number }[];
}

export const PIB_POTENCIAL = 1.5; // % a.a., abstração
const SAZONAL = [0.05, 0.25, 0.05, 0, -0.05, -0.05, 0, -0.05, -0.05, 0, 0, 0.05];
const BRENT_REF = 74;
const CAMBIO_REF = 5.58;

/** Peso do combustível: refinaria 65%, tributos federais 10%, ICMS 25%. */
export function combustivelIndex(refinaria: number, fedTaxa: number, icms: number): number {
  return 0.65 * refinaria + 10 * fedTaxa + 25 * icms;
}

function exo(arr: number[], turn: number): number {
  return arr[Math.min(turn + 1, arr.length - 1)];
}

export function priceIndexSeries(ipcaMes: number[]): number[] {
  const out: number[] = [];
  let p = 100;
  for (const m of ipcaMes) {
    p *= 1 + m / 100;
    out.push(p);
  }
  return out;
}

export function economyStep(ctx: Ctx, inputs: EconomyInputs): void {
  const { s, L, rng } = ctx;
  const i = s.ind;
  const e = s.econ;
  const t = s.turn;
  const month = turnToDate(t).month;
  const shockMult = s.meta.difficulty === 'dificil' ? 1.3 : 1;

  // --- Exógenos (choques externos) ---
  const extPetroleo = C.externo('petroleo', 'Mercado internacional de petróleo');
  const extCommod = C.externo('commodities', 'Preços internacionais de commodities');
  L.set('brent', exo(EXOGENO.brent, t), extPetroleo);
  L.set('commodities', exo(EXOGENO.commodities, t), extCommod);
  e.fedJuros = exo(EXOGENO.fed, t);

  // --- Alavancas de combustíveis (políticas) ---
  // fedTaxa/icms/petrobrasAjuste armazenados em `e` já incluem as políticas.
  const fedBefore = e.fedTaxaNivel;
  const icmsBefore = e.icmsNivel;
  for (const lc of inputs.leverChanges) {
    if (lc.alavanca === 'fedTaxa') e.fedTaxaNivel += lc.delta;
    else if (lc.alavanca === 'icmsNivel') e.icmsNivel += lc.delta;
    else e.petrobrasAjuste += lc.delta;
  }
  e.fedTaxaNivel = clamp(e.fedTaxaNivel, 0, 1);
  e.icmsNivel = clamp(e.icmsNivel, 0, 1);
  e.petrobrasAjuste = clamp(e.petrobrasAjuste, 0.05, 0.6);

  // --- Preço dos combustíveis ---
  const paridade = (i.brent / BRENT_REF) * (i.cambio / CAMBIO_REF) * 100;
  const refBefore = e.refinaria;
  e.refinaria += e.petrobrasAjuste * (paridade - e.refinaria);
  const combPrev = i.combustivel;
  const combParts: CausalValue[] = [];
  combParts.push({ cause: C.ator('petrobras_paridade', 'Repasse da paridade internacional (petróleo × câmbio) pela Petrobras'), value: 0.65 * (e.refinaria - refBefore) });
  for (const lc of inputs.leverChanges) {
    if (lc.alavanca === 'fedTaxa') combParts.push({ cause: lc.cause, value: 10 * lc.delta * (e.fedTaxaNivel !== fedBefore ? 1 : 0) });
    if (lc.alavanca === 'icmsNivel') combParts.push({ cause: lc.cause, value: 25 * lc.delta * (e.icmsNivel !== icmsBefore ? 1 : 0) });
  }
  const combNew = combustivelIndex(e.refinaria, e.fedTaxaNivel, e.icmsNivel);
  L.setDerived('combustivel', combNew, combParts.map((p) => ({ cause: p.cause, delta: p.value })), C.dinamica('comb_residuo', 'Ajustes de composição'));
  e.defasagemCombustivel = paridade - e.refinaria;

  // --- Hiato do produto ---
  const hPrev = i.hiato;
  const gapParts: CausalValue[] = [];
  gapParts.push({ cause: C.dinamica('convergencia', 'Convergência ao produto potencial'), value: -0.15 * hPrev });
  if (t <= 5) gapParts.push({ cause: C.externo('reabertura', 'Normalização pós-pandemia (serviços)'), value: 0.1 * (1 - t / 6) });
  const lagIdx = e.selicHist.length - 1; // inclui 2021
  const win = (arr: number[]) => arr.slice(Math.max(0, lagIdx - 6), Math.max(1, lagIdx - 2));
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const jurosReais = avg(win(e.selicHist)) - avg(win(e.expectHist));
  gapParts.push({ cause: C.instituicao('copom_juros', 'Juros reais (política monetária, com defasagem de 3–6 meses)'), value: -0.03 * (jurosReais - 4.5) });
  gapParts.push({ cause: extCommod, value: 0.004 * (i.commodities - 100) });
  gapParts.push({ cause: C.ator('confianca', 'Confiança empresarial'), value: 0.003 * (i.confianca_empresarial - 100) });
  for (const f of inputs.fiscalImpulses) gapParts.push(f);
  const dueGap = s.pendingEffects.filter((x) => x.dueTurn <= t && x.target.kind === 'gap');
  for (const d of dueGap) gapParts.push({ cause: { id: d.causeId, label: d.causeLabel, kind: d.causeKind, controlavel: d.causeKind === 'politica' }, value: d.delta * shockMult });
  s.pendingEffects = s.pendingEffects.filter((x) => !dueGap.includes(x));
  gapParts.push({ cause: C.ruido('hiato'), value: rng.normal(0, 0.05) });
  e.fiscalImpulso = inputs.fiscalImpulses.reduce((a, f) => a + f.value, 0);
  for (const p of gapParts) L.add('hiato', p.value, p.cause);

  // --- Atividade ---
  const aPrev = i.atividade;
  const potencial = aPrev * (PIB_POTENCIAL / 12 / 100);
  const ativParts: CausalValue[] = [{ cause: C.dinamica('potencial', 'Crescimento potencial (produtividade e força de trabalho)'), value: potencial }];
  for (const p of gapParts) ativParts.push({ cause: p.cause, value: (aPrev * p.value) / 100 });
  const aNew = aPrev + ativParts.reduce((x, p) => x + p.value, 0);
  for (const p of ativParts) L.add('atividade', p.value, p.cause);
  e.atividadeHist.push(aNew);
  const a12 = e.atividadeHist[e.atividadeHist.length - 13];
  const var12 = (aNew / a12 - 1) * 100;
  L.setDerived('pib_var_12m', var12, ativParts.map((p) => ({ cause: p.cause, delta: (p.value / a12) * 100 })), C.dinamica('base_pib', 'Efeito de base (comparação com 12 meses antes)'));

  // --- Inflação ---
  const mPrev = e.ipcaMesHist[e.ipcaMesHist.length - 1];
  const ePrev = i.expect_ipca;
  const cambioVar = e.cambioHist.length >= 2 ? (e.cambioHist[e.cambioHist.length - 1] / e.cambioHist[e.cambioHist.length - 2] - 1) * 100 : 0;
  const infl: CausalValue[] = [];
  infl.push({ cause: C.dinamica('inercia', 'Inércia inflacionária (indexação de preços e contratos)'), value: 0.4 * mPrev });
  infl.push({ cause: C.ator('expectativas', 'Expectativas de inflação'), value: (0.6 * ePrev) / 12 });
  infl.push({ cause: C.dinamica('demanda', 'Pressão de demanda (hiato do produto)'), value: 0.05 * i.hiato });
  infl.push({ cause: C.dinamica('repasse_cambial', 'Repasse cambial'), value: 0.06 * cambioVar });
  // 8% do IPCA: elasticidade do índice a 1% de variação nos combustíveis.
  for (const p of combParts) infl.push({ cause: p.cause, value: 0.08 * (p.value / combPrev) * 100 });
  infl.push({ cause: C.dinamica('sazonal', 'Sazonalidade (ex.: reajustes escolares em fevereiro)'), value: SAZONAL[month - 1] });
  if (t === 4) infl.push({ cause: C.evento('bandeira_hidrica', 'Fim da bandeira de escassez hídrica na energia elétrica (abr/2022)'), value: -0.25 });
  infl.push({ cause: C.ator('fertilizantes', 'Custo de fertilizantes (alimentos)'), value: 0.0015 * (i.risco_fertilizantes - 30) });
  for (const d of inputs.inflacaoDireta) infl.push(d);
  const dueInfl = s.pendingEffects.filter((x) => x.dueTurn <= t && x.target.kind === 'indicator' && x.target.ind === 'ipca_mes');
  for (const d of dueInfl) infl.push({ cause: { id: d.causeId, label: d.causeLabel, kind: d.causeKind, controlavel: d.causeKind === 'politica' }, value: d.delta * shockMult });
  s.pendingEffects = s.pendingEffects.filter((x) => !dueInfl.includes(x));
  infl.push({ cause: C.ruido('ipca'), value: rng.normal(0, 0.06) });
  const mNew = infl.reduce((x, p) => x + p.value, 0);
  e.ipcaComposicao = infl.map((p) => ({ label: p.cause.label, kind: p.cause.kind, value: p.value }));
  L.setDerived('ipca_mes', mNew, infl.map((p) => ({ cause: p.cause, delta: p.value })), C.dinamica('ipca_mes_anterior', 'Substitui o valor do mês anterior (o IPCA mensal é um fluxo)'));
  e.ipcaMesHist.push(mNew);
  const last12 = e.ipcaMesHist.slice(-12);
  const ipca12 = (last12.reduce((p, m) => p * (1 + m / 100), 1) - 1) * 100;
  const saida = e.ipcaMesHist[e.ipcaMesHist.length - 13];
  L.setDerived(
    'ipca_12m',
    ipca12,
    [...infl.map((p) => ({ cause: p.cause, delta: p.value })), { cause: C.dinamica('ipca_base', 'Saída do mês de 12 meses atrás (efeito de base)'), delta: -saida }],
    C.dinamica('ipca_composicao', 'Capitalização composta'),
  );

  // --- Expectativas ---
  const meta = META_INFLACAO[2023];
  const expParts: CausalValue[] = [
    { cause: C.dinamica('exp_convergencia', 'Revisão gradual das expectativas'), value: -0.2 * ePrev },
    { cause: C.dinamica('exp_inflacao_corrente', 'Inflação corrente contamina expectativas'), value: 0.2 * 0.35 * i.ipca_12m },
    { cause: C.instituicao('exp_meta', 'Âncora da meta de inflação (credibilidade do BC)'), value: 0.2 * 0.65 * meta },
    { cause: C.ator('exp_risco', 'Prêmio de risco (percepção fiscal e institucional)'), value: 0.2 * 0.01 * (i.risco_pais - 220) },
    { cause: C.ator('exp_credibilidade', 'Credibilidade do governo'), value: 0.2 * 0.02 * (50 - i.pc_credibilidade) },
  ];
  for (const p of expParts) L.add('expect_ipca', p.value, p.cause);
  e.expectHist.push(i.expect_ipca);

  // --- Copom (autônomo) ---
  if (COPOM_MESES_2022.includes(month) && turnToDate(t).year === 2022) {
    const E = i.expect_ipca;
    const alvo = 4.5 + E + 1.0 * (E - meta) + 0.3 * i.hiato;
    let passo = 0.6 * (alvo - i.selic);
    passo = clamp(Math.round(passo * 4) / 4, -1.5, 1.5);
    if (Math.abs(passo) < 0.25) passo = 0;
    const anterior = i.selic;
    if (passo !== 0) L.add('selic', passo, C.instituicao('copom', 'Decisão do Copom (Banco Central autônomo)'));
    ctx.emit('copom', { anterior, nova: i.selic, passo, alvo, expectativa: E, ipca12: i.ipca_12m, hiato: i.hiato }, { importancia: passo !== 0 ? 6 : 4, dataIso: COPOM_DATAS[month], provenance: 'contrafactual' });
  }
  e.selicHist.push(i.selic);

  // --- Câmbio ---
  const diff = i.selic - e.fedJuros;
  const diff0 = 9.25 - 0.25;
  const lnC = Math.log(i.cambio);
  const lnFairParts = {
    base: Math.log(5.45),
    juros: -0.025 * (diff - diff0),
    commod: -0.35 * Math.log(i.commodities / 100),
    risco: 0.003 * (i.risco_pais - 220),
  };
  const k = 0.25;
  const noise = rng.normal(0, 0.025 * shockMult);
  const dLn = k * (lnFairParts.base + lnFairParts.juros + lnFairParts.commod + lnFairParts.risco - lnC) + noise;
  const cNew = Math.exp(lnC + dLn);
  const cPrev = i.cambio;
  L.setDerived(
    'cambio',
    cNew,
    [
      { cause: C.dinamica('cambio_conv', 'Convergência ao câmbio de equilíbrio'), delta: cPrev * k * (lnFairParts.base - lnC) },
      { cause: C.instituicao('cambio_juros', 'Diferencial de juros (Selic vs. Fed)'), delta: cPrev * k * lnFairParts.juros },
      { cause: extCommod, delta: cPrev * k * lnFairParts.commod },
      { cause: C.ator('cambio_risco', 'Prêmio de risco'), delta: cPrev * k * lnFairParts.risco },
      { cause: C.ruido('cambio'), delta: cPrev * noise },
    ],
    C.dinamica('cambio_composto', 'Efeitos compostos'),
  );
  e.cambioHist.push(i.cambio);

  // --- Prêmio de risco ---
  const eleicao = t >= 6 && t <= 9 ? 15 : 0;
  const rParts: CausalValue[] = [
    { cause: C.dinamica('risco_conv', 'Reversão do prêmio de risco'), value: 0.3 * (200 - i.risco_pais) },
    { cause: C.ator('risco_cred', 'Credibilidade do governo'), value: 0.3 * 1.2 * (50 - i.pc_credibilidade) },
    { cause: C.ator('risco_tensao', 'Tensão institucional'), value: 0.3 * 0.8 * (i.tensao_institucional - 40) },
    { cause: C.instituicao('risco_teto', 'Risco de descumprimento do teto'), value: i.teto_folga < 0 ? 0.3 * 20 : 0 },
    { cause: C.evento('risco_eleicao', 'Incerteza eleitoral'), value: 0.3 * eleicao },
    { cause: C.ruido('risco'), value: rng.normal(0, 4 * shockMult) },
  ];
  for (const p of rParts) L.add('risco_pais', p.value, p.cause);

  // --- Desemprego (defasado) ---
  const natural = 10.5 - (2.8 * Math.min(t, 11)) / 11;
  const uPrev = i.desemprego;
  L.add('desemprego', 0.18 * (natural - uPrev), C.dinamica('reabertura_trabalho', 'Recuperação pós-pandemia do mercado de trabalho'));
  L.add('desemprego', 0.18 * (-0.5 * i.hiato), C.dinamica('desemprego_hiato', 'Nível de atividade (hiato do produto)'));
  L.add('desemprego', rng.normal(0, 0.04), C.ruido('desemprego'));

  // --- Confiança empresarial ---
  const confAlvo = 100 + 2 * i.hiato - 0.08 * (i.risco_pais - 220) - 0.6 * (i.selic - 9.25);
  L.add('confianca_empresarial', 0.2 * (confAlvo - i.confianca_empresarial), C.dinamica('confianca_conv', 'Atividade, juros e risco'));

  // --- Fertilizantes ---
  L.add('risco_fertilizantes', 0.08 * (25 - i.risco_fertilizantes), C.dinamica('fertilizantes_normalizacao', 'Reorganização de cadeias de suprimento'));

  // --- PIB nominal (12 meses) ---
  const P = priceIndexSeries(e.ipcaMesHist);
  const A = e.atividadeHist;
  const n = A.length;
  let num = 0;
  let den = 0;
  for (let j = 0; j < 12; j++) {
    num += A[n - 12 + j] * P[P.length - 12 + j];
    den += A[j] * P[j];
  }
  L.set('pib_nominal', s.econ.pibNominal2021 * (num / den), C.dinamica('pib_nominal', 'Crescimento real e inflação (deflator ≈ IPCA)'));
}
