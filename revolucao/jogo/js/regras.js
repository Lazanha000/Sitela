/* Regras: estado da partida, ações, combate, suprimento, governo, rivais, eventos e finais */
(function () {
  const M = Mundo, ST = M.states, NS = M.NS;
  const rnd = Math.random;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // ---------------- facções ----------------
  const FAC_BASE = {
    0: { sigla: 'GOV', nome: 'Governo Federal', curto: 'Governo', cor: '#5b634e' },
    2: { sigla: 'LFS', nome: 'Liga Federalista do Sul', curto: 'Liga do Sul', cor: '#34456a' },
    3: { sigla: 'CDN', nome: 'Comando de Defesa Nacional', curto: 'Comando Nacional', cor: '#4d3b26' },
    4: { sigla: 'POU', nome: 'Partido Operário Unificado', curto: 'POU', cor: '#c27a2c' }
  };

  // ---------------- tipos de unidade ----------------
  const TIPOS = {
    guerrilha: { nome: 'Guerrilha', atk: 0.85, def: 0.85, guer: true, armas: 0.7, fundos: 0.05, min: 100, req: null, sigla: 'GUE' },
    milicia: { nome: 'Milícia popular', atk: 0.6, def: 0.95, armas: 0.4, fundos: 0.02, min: 200, req: null, sigla: 'MIL' },
    infantaria: { nome: 'Coluna de infantaria', atk: 1, def: 1, armas: 1, fundos: 0.08, min: 400, req: 'exercito', sigla: 'INF' },
    motorizada: { nome: 'Coluna motorizada', atk: 1.25, def: 0.95, armas: 1.2, fundos: 0.25, min: 600, req: 'mecanizada', sigla: 'MOT', rapida: true },
    artilharia: { nome: 'Artilharia', atk: 0.35, def: 0.6, armas: 1.5, fundos: 0.2, min: 150, req: 'exercito', sigla: 'ART', barragem: true },
    // forças do governo e rivais
    exercito: { nome: 'Divisão de exército', atk: 1.05, def: 1.1, sigla: 'DE' },
    blindada: { nome: 'Divisão blindada', atk: 1.45, def: 1.2, sigla: 'BLD', rapida: true },
    aerotransportada: { nome: 'Brigada paraquedista', atk: 1.2, def: 1, sigla: 'PQD', aereo: true },
    fuzileiros: { nome: 'Fuzileiros navais', atk: 1.15, def: 1.05, sigla: 'FN' },
    selva: { nome: 'Brigada de selva', atk: 1, def: 1.15, guer: true, sigla: 'SEL' },
    paramilitar: { nome: 'Grupo paramilitar', atk: 0.8, def: 0.75, sigla: 'PAR' }
  };

  // ---------------- teses (desenvolvimento da organização) ----------------
  const TESES = {
    trabalho_base: { nome: 'Trabalho de base', custo: 15, req: [], desc: 'Agitação e propaganda rendem 50% mais apoio.' },
    disciplina: { nome: 'Disciplina conspirativa', custo: 20, req: [], desc: 'Prisões e infiltrações caem 40%.' },
    imprensa: { nome: 'Imprensa popular', custo: 20, req: ['trabalho_base'], desc: 'Jornal e rádio espalham apoio para estados vizinhos e todo o país.' },
    autodefesa: { nome: 'Autodefesa popular', custo: 20, req: [], desc: 'Milícias +25% em combate; territórios liberados se defendem melhor.' },
    guerrilha: { nome: 'Guerra de guerrilhas', custo: 30, req: ['autodefesa'], desc: 'Guerrilhas +30% e emboscadas mais letais em mata, selva e sertão.' },
    exercito: { nome: 'Exército popular', custo: 40, req: ['guerrilha'], desc: 'Libera colunas de infantaria e artilharia.' },
    mecanizada: { nome: 'Forças mecanizadas', custo: 45, req: ['exercito', 'logistica'], desc: 'Libera colunas motorizadas, rápidas e fortes no ataque.' },
    logistica: { nome: 'Logística revolucionária', custo: 30, req: ['autodefesa'], desc: 'Suprimento recupera 50% mais rápido; rede clandestina abastece tropas isoladas.' },
    frente_unica: { nome: 'Frente única', custo: 20, req: [], desc: 'Facilita alianças: relações sobem mais e a fusão com o POU fica possível mais cedo.' },
    sindicalismo: { nome: 'Sindicalismo revolucionário', custo: 25, req: ['trabalho_base'], desc: 'Trabalho sindical rende o dobro e a greve geral derruba mais a economia.' },
    agraria: { nome: 'Questão agrária', custo: 20, req: [], desc: 'Ocupações e reforma agrária rendem mais apoio no campo.' },
    internacionalismo: { nome: 'Internacionalismo', custo: 25, req: [], desc: 'Apoio internacional cresce sozinho e o contrabando de armas rende mais.' },
    poder_popular: { nome: 'Poder popular', custo: 35, req: ['autodefesa'], desc: 'Governos populares produzem o dobro de fundos, armas e recrutas.' },
    escola_quadros: { nome: 'Escola de quadros', custo: 30, req: ['trabalho_base'], desc: '+1 ponto de ação por mês e formação de quadros 50% melhor.' },
    inteligencia: { nome: 'Inteligência revolucionária', custo: 30, req: ['disciplina'], desc: 'Infiltração em dobro e força exata das tropas inimigas no mapa.' },
    insurreicao_urbana: { nome: 'Insurreição urbana', custo: 35, req: ['trabalho_base', 'autodefesa'], desc: 'Levantes exigem 30% de apoio (em vez de 40%) e saem 50% mais fortes.' }
  };

  // ---------------- doutrinas ----------------
  const DOUTRINAS = {
    insurrecional: { nome: 'Insurrecional', desc: 'Organizar as cidades e tomar o poder num levante de massas.', tese: 'trabalho_base', mods: { urbano: 1.25, levante: 1.2 } },
    prolongada: { nome: 'Guerra popular prolongada', desc: 'Bases no campo, cercar as cidades a partir do interior.', tese: 'agraria', mods: { rural: 1.25, guerCusto: 0.8 } },
    foquista: { nome: 'Foquista', desc: 'Um núcleo armado pequeno acende a luta pelo exemplo.', tese: 'autodefesa', mods: { guer: 1.2, recruta: 0.8 }, unidadeInicial: true },
    sindicalista: { nome: 'Sindicalista', desc: 'A greve geral como arma principal; força nos locais de trabalho.', tese: 'sindicalismo', mods: { urbano: 1.1, greve: 1.3 } },
    eleitoral: { nome: 'Frente ampla e eleitoral', desc: 'Partido legal, voto e mobilização; a luta armada só em defesa.', tese: 'frente_unica', mods: { legit: 1.3, armadaLegit: 1.5 }, legal: true },
    autonomista: { nome: 'Autonomista', desc: 'Comunas e conselhos locais; poder construído de baixo.', tese: 'poder_popular', mods: { coesao: 15 } },
    livre: { nome: 'Personalizada', desc: 'Sem bônus fixo: você define a linha na prática. +15 pontos de formação.', tese: null, mods: { pf: 15 } }
  };
  const BASES_SOCIAIS = {
    operariado: { nome: 'Operariado urbano', ufs: ['SP', 'RJ', 'MG', 'RS', 'PR', 'BA', 'PE', 'AM'], bonus: 4 },
    campesinato: { nome: 'Campesinato e sem-terra', ufs: ['MA', 'PA', 'PI', 'TO', 'BA', 'MT', 'GO', 'PE', 'CE', 'RO'], bonus: 4 },
    estudantes: { nome: 'Estudantes e intelectuais', ufs: ['DF', 'SP', 'RJ', 'MG', 'RS', 'PE', 'BA', 'CE', 'PR'], bonus: 3, quadros: 1.6 },
    periferias: { nome: 'Periferias urbanas', ufs: ['SP', 'RJ', 'BA', 'PE', 'CE', 'PA', 'AM', 'MG'], bonus: 4 },
    povos: { nome: 'Povos indígenas e tradicionais', ufs: ['AM', 'RR', 'PA', 'AC', 'AP', 'MT', 'MS', 'MA', 'RO', 'TO'], bonus: 5 },
    sertanejos: { nome: 'Sertanejos e retirantes', ufs: ['PI', 'CE', 'PE', 'BA', 'PB', 'RN', 'AL', 'SE', 'MA'], bonus: 4 }
  };
  const TAMANHOS = { nucleo: { nome: 'Núcleo clandestino', mil: 150, fundos: 250, visib: 4 }, coletivo: { nome: 'Coletivo', mil: 600, fundos: 350, visib: 8 }, organizacao: { nome: 'Organização média', mil: 2000, fundos: 500, visib: 14 }, massas: { nome: 'Movimento de massas', mil: 6000, fundos: 700, visib: 26 } };
  const DIFICULDADE = { facil: { nome: 'Fácil', gov: 0.75, rec: 1.3 }, normal: { nome: 'Normal', gov: 1, rec: 1 }, dificil: { nome: 'Difícil', gov: 1.3, rec: 0.85 } };

  // ---------------- estado da partida ----------------
  let S = null;
  const fac = f => (f === 1 ? { sigla: S.org.sigla, nome: S.org.nome, curto: S.org.sigla, cor: S.org.cor } : FAC_BASE[f]);
  const tem = t => !!S.teses[t];
  const dout = () => DOUTRINAS[S.org.doutrina] || DOUTRINAS.livre;
  const mod = (k, def = 1) => (dout().mods[k] != null ? dout().mods[k] : def);
  const simp = s => ST[s].pop * 1e6 * S.e[s].apoio / 100;
  const popTotal = ST.reduce((a, s) => a + s.pop, 0);
  function apoioNacional() { let a = 0; ST.forEach((s, i) => { a += s.pop * S.e[i].apoio; }); return a / popTotal; }
  function parcelaPop(f) { let a = 0; ST.forEach((s, i) => { a += s.pop * M.cont[i][f] / s.area; }); return a / popTotal; }
  function parcelaArea(f) { let a = 0, t = 0; ST.forEach((s, i) => { a += M.cont[i][f]; t += s.area; }); return a / t; }
  function combatentes(f = 1) { return S.unidades.filter(u => u.f === f).reduce((a, u) => a + u.forca, 0); }
  function log(texto, imp = 1, s = null, tipo = 'info') { S.log.push({ texto, imp, s, tipo }); }
  function dataTxt(t = S.turno) { const m = (S.mes0 + t) % 12, a = S.ano0 + Math.floor((S.mes0 + t) / 12); return MESES[m] + ' de ' + a; }
  function mesAtual() { return (S.mes0 + S.turno) % 12; }
  function anoAtual() { return S.ano0 + Math.floor((S.mes0 + S.turno) / 12); }

  function novoJogo(cfg) {
    const dif = DIFICULDADE[cfg.dificuldade] || DIFICULDADE.normal;
    const tam = TAMANHOS[cfg.tamanho] || TAMANHOS.coletivo;
    const d = DOUTRINAS[cfg.doutrina] || DOUTRINAS.livre;
    M.resetOwner();
    S = {
      versao: 1, turno: 0, mes0: cfg.mes0 ?? 2, ano0: cfg.ano || 2028, dif: cfg.dificuldade || 'normal', nid: 1, fim: null,
      org: { nome: cfg.nome || 'Organização', sigla: cfg.sigla || 'ORG', tipo: cfg.tipo || 'Organização', vertente: cfg.vertente || 'Socialismo popular', doutrina: cfg.doutrina || 'livre', base: cfg.base || 'operariado', lema: cfg.lema || '', manifesto: cfg.manifesto || '', lider: cfg.lider || '', cor: cfg.cor || '#b8262b', bandeira: cfg.bandeira || null, sede: M.byId[cfg.sede] ?? M.byId.MA },
      rec: { militantes: Math.round(tam.mil * dif.rec), quadros: Math.round(tam.mil * 0.08 * (BASES_SOCIAIS[cfg.base]?.quadros || 1)), fundos: Math.round(tam.fundos * dif.rec), armas: Math.round(60 * dif.rec), moral: 65, coesao: 70 + (d.mods.coesao || 0), visib: tam.visib, legit: 40 * (d.mods.legit || 1), intl: 5, pf: 10 + (d.mods.pf || 0) },
      teses: {}, insurreicao: false, legal: !!d.legal, armado: false,
      e: ST.map(s => ({ apoio: 1.5 + M.hash(s.idx, 7) * 2, nucleos: 0, repressao: 18 + Math.round(M.hash(s.idx, 3) * 12), guarn: Math.round((150 + s.pop * 55) * dif.gov), infiltr: 0, sindical: 0, dano: 0, gp: false, contraint: 0, apoioPOU: 0, apoioLiga: 0, campanha: 0 })),
      gov: { legit: 58, estab: 72, econ: 66, mobil: 10, reserva: Math.round(20000 * dif.gov), concessao: 0, propagandaBonus: 0, novas: 0 },
      liga: { ativa: false, rel: -10, tregua: false, reserva: 0 },
      cdn: { ativa: false, reserva: 0 },
      pou: { ativo: true, rel: 25, fundido: false },
      unidades: [], ordens: [], politicas: [], log: [], historico: [], eventos: [], iaGov: null, eleicao: null, ultimoRelatorio: null, setasHist: [], flags: {}, stats: { batalhas: 0, vitorias: 0, rendicoes: 0, maxPop: 0 }
    };
    if (d.tese) S.teses[d.tese] = true;
    // apoio inicial: base social e sede
    const bs = BASES_SOCIAIS[cfg.base]; if (bs) bs.ufs.forEach(uf => { S.e[M.byId[uf]].apoio += bs.bonus; });
    const sede = S.org.sede; S.e[sede].apoio += 10; S.e[sede].nucleos = 3;
    ST[sede].viz.forEach(v => { S.e[v.s].apoio += 3; if (tam.mil >= 600) S.e[v.s].nucleos = 1; });
    if (tam.mil >= 2000) ST.forEach((s, i) => { if (bs && bs.ufs.includes(s.id) && !S.e[i].nucleos) S.e[i].nucleos = 1; });
    // POU e Liga: apoio de base
    const pou = { SP: 12, RJ: 11, MG: 8, RS: 9, PE: 7, BA: 6, PR: 6, CE: 5, DF: 9, PA: 4, AM: 4, SC: 5, GO: 4, ES: 6 };
    Object.entries(pou).forEach(([uf, v]) => { S.e[M.byId[uf]].apoioPOU = v; });
    S.e[M.byId.RS].apoioLiga = 16; S.e[M.byId.SC].apoioLiga = 11; S.e[M.byId.PR].apoioLiga = 6;
    // forças do governo
    const g = dif.gov;
    [['1ª Divisão de Exército', 'RJ', 'exercito', 7000], ['2ª Divisão de Exército', 'SP', 'exercito', 7500], ['3ª Divisão de Exército', 'RS', 'exercito', 6500],
     ['5ª Divisão Blindada', 'PR', 'blindada', 6000], ['4ª Divisão de Exército', 'MG', 'exercito', 6000], ['6ª Divisão de Exército', 'BA', 'exercito', 5500],
     ['7ª Divisão de Exército', 'PE', 'exercito', 5500], ['8ª Região Militar', 'PA', 'selva', 4500], ['12ª Brigada de Selva', 'AM', 'selva', 4500],
     ['Brigada Paraquedista', 'DF', 'aerotransportada', 3000], ['Fuzileiros Navais', 'RJ', 'fuzileiros', 2800], ['9ª Divisão de Exército', 'MS', 'exercito', 4500],
     ['10ª Região Militar', 'CE', 'exercito', 4000], ['Comando Militar do Planalto', 'GO', 'exercito', 4000], ['Brigada do Meio-Norte', 'MA', 'exercito', 3000]]
      .forEach(([n, uf, t, fz]) => criarUnidade(0, t, Math.round(fz * g), M.byId[uf], n, { equip: 1, moral: 70, xp: 1 }));
    if (d.unidadeInicial) { criarUnidade(1, 'guerrilha', 200, sede, 'Foco ' + ST[sede].n, { equip: 0.8, moral: 80 }); S.rec.militantes = Math.max(50, S.rec.militantes - 200); S.armado = true; }
    S.flags.inicio = true;
    log(`${S.org.nome} inicia suas atividades em ${ST[sede].n}.`, 2, sede, 'org');
    return S;
  }

  // ---------------- unidades ----------------
  const OFFS = [[0, 0], [16, 9], [-16, 9], [0, -15], [18, -8], [-18, -8], [0, 17], [30, 0], [-30, 0]];
  function posLivre(s, f, evitar) {
    const base = (f != null && M.cont[s][f] > 0 ? M.centroide(s, f) : null) || ST[s].anchor;
    const outros = S.unidades.filter(u => u.s === s && u !== evitar);
    const k = Math.min(1, ST[s].raio / 30);
    for (const o of OFFS) { const p = [base[0] + o[0] * k, base[1] + o[1] * k]; if (!outros.some(u => Math.hypot(u.pos[0] - p[0], u.pos[1] - p[1]) < 9)) return p; }
    return [base[0] + (rnd() - 0.5) * 20 * k, base[1] + (rnd() - 0.5) * 20 * k];
  }
  function criarUnidade(f, tipo, forca, s, nome, o = {}) {
    const u = { id: S.nid++, f, tipo, nome, forca: Math.round(forca), max: Math.round(o.max || forca * 1.25), moral: o.moral ?? 65, equip: o.equip ?? 0.7, xp: o.xp || 0, sup: 100, s, pos: null, post: 'normal', entr: 0, isol: 0 };
    u.pos = o.pos || posLivre(s, f, u); S.unidades.push(u); return u;
  }
  function remover(u) { S.unidades = S.unidades.filter(x => x !== u); S.ordens = S.ordens.filter(o => o.uid !== u.id); }
  function unidade(id) { return S.unidades.find(u => u.id === id); }
  function inimigos(f, g) { if (f === g) return false; if (g === 4 || f === 4) return false; if ((f === 1 && g === 2) || (f === 2 && g === 1)) return !S.liga.tregua; if ((f === 0 && g === 3) || (f === 3 && g === 0)) return false; return true; }

  function eficacia(u, papel, sAlvo) {
    const T = TIPOS[u.tipo] || TIPOS.milicia; const ter = M.TERRENO[ST[sAlvo ?? u.s].ter];
    let v = u.forca * (papel === 'atk' ? T.atk : T.def);
    v *= (0.35 + 0.65 * u.equip) * (0.55 + u.moral / 220) * (0.45 + 0.55 * Math.min(100, u.sup) / 100) * (1 + u.xp * 0.05);
    if (T.guer) v *= papel === 'atk' ? ter.guer : Math.sqrt(ter.guer);
    if (u.f === 1) {
      if (u.tipo === 'guerrilha') v *= (tem('guerrilha') ? 1.3 : 1) * mod('guer');
      if (u.tipo === 'milicia') v *= tem('autodefesa') ? 1.25 : 1;
      v *= 0.9 + S.rec.moral / 500;
    }
    if (papel === 'def' && u.post === 'fortificada') v *= 1 + u.entr * 0.15;
    if (papel === 'def' && u.post === 'cercada') v *= 0.8;
    return v;
  }

  // ---------------- ações políticas ----------------
  const PORTAS = ['AC', 'AM', 'RR', 'PA', 'AP', 'RO', 'MT', 'MS', 'PR', 'SC', 'RS', 'AL', 'BA', 'CE', 'ES', 'MA', 'PB', 'PE', 'PI', 'RJ', 'RN', 'SE', 'SP'];
  const fmtF = v => v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1).replace('.', ',') + ' mi' : 'R$ ' + Math.round(v) + ' mil';
  const POL = {
    agitprop: { nome: 'Agitação e propaganda', pa: 1, f: 30, alvo: 'estado', desc: 'Panfletos, assembleias e pichações. Aumenta o apoio popular.',
      ef: s => { const ter = M.TERRENO[ST[s].ter]; let g = 3.2 * (tem('trabalho_base') ? 1.5 : 1) * (ter.rural ? mod('rural') : mod('urbano')) * (1 - S.e[s].apoio / 110); S.e[s].apoio += g; S.rec.visib += 0.6; return `apoio +${r1(g)}%`; } },
    nucleo: { nome: 'Fundar núcleo', pa: 1, f: 40, alvo: 'estado', desc: 'Cria uma célula organizada. Núcleos recrutam, protegem e permitem outras ações.',
      req: s => S.e[s].nucleos >= 10 ? 'Já há 10 núcleos aqui.' : (S.e[s].nucleos === 0 && !ST[s].viz.some(v => S.e[v.s].nucleos > 0) && S.e[s].apoio < 6 && s !== S.org.sede ? 'Precisa de núcleo num estado vizinho ou apoio de 6%.' : null),
      ef: s => { S.e[s].nucleos++; S.rec.militantes += 15; return `núcleos ${S.e[s].nucleos}`; } },
    recrutar: { nome: 'Campanha de recrutamento', pa: 1, f: 20, alvo: 'estado', desc: 'Transforma simpatizantes em militantes.', req: s => S.e[s].nucleos < 1 ? 'Precisa de um núcleo no estado.' : null,
      ef: s => { const n = Math.round(simp(s) * 0.0004 * (1 + S.e[s].nucleos * 0.15) * mod('recruta') + 20); S.rec.militantes += n; return `+${n} militantes`; } },
    quadros: { nome: 'Formar quadros', pa: 1, f: 50, alvo: 'estado', desc: 'Cursos de formação: quadros dão pontos de ação e de formação.', req: s => S.e[s].nucleos < 1 ? 'Precisa de um núcleo no estado.' : null,
      ef: s => { const n = Math.round(Math.min(S.rec.militantes * 0.03, 40 + S.e[s].nucleos * 8) * (tem('escola_quadros') ? 1.5 : 1)); S.rec.quadros += n; S.rec.pf += 3; return `+${n} quadros`; } },
    sindical: { nome: 'Trabalho sindical', pa: 1, f: 30, alvo: 'estado', desc: 'Organiza categorias. Prepara a greve geral e aumenta apoio nas cidades.', req: s => S.e[s].nucleos < 1 ? 'Precisa de um núcleo no estado.' : S.e[s].sindical >= 5 ? 'Base sindical no máximo.' : null,
      ef: s => { S.e[s].sindical = Math.min(5, S.e[s].sindical + (tem('sindicalismo') ? 2 : 1)); const g = 1.5 * (1 - M.TERRENO[ST[s].ter].rural * 0.5); S.e[s].apoio += g; return `base sindical ${S.e[s].sindical}`; } },
    ocupacao: { nome: 'Ocupação de terras', pa: 1, f: 20, alvo: 'estado', desc: 'Ocupa latifúndios improdutivos. Muito apoio no campo, atrai repressão.', req: s => !M.TERRENO[ST[s].ter].rural ? 'Só em estados com campo forte.' : S.e[s].nucleos < 1 ? 'Precisa de um núcleo no estado.' : null,
      ef: s => { const g = 4 * (tem('agraria') ? 1.5 : 1) * mod('rural'); S.e[s].apoio += g; S.rec.visib += 3; S.e[s].repressao += 5; S.rec.militantes += 30; if (S.cdn.ativa && rnd() < 0.3) { const p = Math.round(S.rec.militantes * 0.01 + 10); S.rec.militantes -= p; S.e[s].apoio += 2; log(`Pistoleiros atacam ocupação em ${ST[s].n}: ${p} militantes mortos.`, 2, s, 'perda'); } return `apoio +${r1(g)}%`; } },
    manifestacao: { nome: 'Manifestação de massas', pa: 1, f: 40, alvo: 'estado', desc: 'Leva o povo às ruas. Ganha apoio e legitimidade; com repressão alta, pode acabar em massacre.', req: s => S.e[s].nucleos < 2 ? 'Precisa de 2 núcleos no estado.' : null,
      ef: s => { const e = S.e[s]; e.apoio += 2.5; S.rec.legit += 1.5; if (e.repressao > 50 && rnd() < (e.repressao - 40) / 100) { const p = Math.round(30 + S.rec.militantes * 0.01); S.rec.militantes -= p; e.apoio += 5; S.gov.legit -= 4; log(`Massacre na manifestação de ${ST[s].cap}: ${p} mortos. O país se revolta.`, 3, s, 'perda'); return 'massacre'; } return 'apoio +2,5%'; } },
    arrecadar: { nome: 'Arrecadar fundos', pa: 1, f: 0, alvo: 'estado', desc: 'Festas, rifas, cotas e doações.', req: s => S.e[s].nucleos < 1 ? 'Precisa de um núcleo no estado.' : null,
      ef: s => { const n = Math.round(40 + S.e[s].nucleos * 20 + simp(s) * 0.00003); S.rec.fundos += n; return `+${fmtF(n)}`; } },
    expropriacao: { nome: 'Expropriação', pa: 1, f: 0, alvo: 'estado', ilegal: true, desc: 'Assalto a banco ou carro-forte. Muito dinheiro, mas queima legitimidade e atrai polícia.', req: s => S.e[s].nucleos < 1 ? 'Precisa de um núcleo no estado.' : null,
      ef: s => { const n = Math.round(150 + ST[s].pib * 25); S.rec.fundos += n; S.rec.visib += 8; S.rec.legit -= 4 * mod('armadaLegit'); S.pou.rel -= 5; S.gov.legit += 1; if (rnd() < 0.15 * (S.e[s].repressao / 50)) { const p = 20 + Math.round(rnd() * 20); S.rec.militantes -= p; log(`Expropriação fracassa em ${ST[s].cap}: ${p} presos.`, 2, s, 'perda'); return 'fracasso'; } return `+${fmtF(n)}`; } },
    contrabando: { nome: 'Contrabandear armas', pa: 1, f: 120, alvo: 'estado', ilegal: true, desc: 'Compra armas pela fronteira ou pelo litoral.', req: s => !PORTAS.includes(ST[s].id) ? 'Só em estado de fronteira ou litoral.' : S.e[s].nucleos < 1 ? 'Precisa de um núcleo no estado.' : null,
      ef: s => { const n = Math.round((300 + S.rec.intl * 15) * (tem('internacionalismo') ? 1.3 : 1)); S.rec.armas += n; S.rec.visib += 3; return `+${n} armas`; } },
    infiltrar: { nome: 'Infiltrar quartéis', pa: 1, f: 60, alvo: 'estado', desc: 'Trabalho político dentro da polícia e do exército: reduz a guarnição e causa deserções.', req: s => S.e[s].nucleos < 2 ? 'Precisa de 2 núcleos no estado.' : S.e[s].infiltr >= 5 ? 'Infiltração no máximo.' : null,
      ef: s => { const e = S.e[s]; e.infiltr = Math.min(5, e.infiltr + (tem('inteligencia') ? 2 : 1)); e.guarn = Math.round(e.guarn * 0.92); if (rnd() < 0.12 * (tem('disciplina') ? 0.6 : 1)) { S.rec.militantes -= 15; e.infiltr = Math.max(0, e.infiltr - 1); log(`Infiltrados descobertos num quartel de ${ST[s].n}.`, 2, s, 'perda'); return 'descobertos'; } return `infiltração ${e.infiltr}`; } },
    contraint: { nome: 'Contrainteligência', pa: 1, f: 40, alvo: 'estado', desc: 'Compartimentação e segurança: reduz prisões e a visibilidade.', ef: s => { S.e[s].contraint = Math.min(3, S.e[s].contraint + 1); S.rec.visib -= 6; return 'segurança reforçada'; } },
    radio: { nome: 'Rádio clandestina', pa: 1, f: 60, alvo: 'estado', desc: 'Transmissões que chegam ao estado e aos vizinhos.', ef: s => { S.e[s].apoio += 1.2; ST[s].viz.forEach(v => { S.e[v.s].apoio += tem('imprensa') ? 0.9 : 0.5; }); S.rec.legit += 1; return 'apoio regional'; } },
    campanha: { nome: 'Campanha eleitoral', pa: 1, f: 60, alvo: 'estado', desc: 'Só para partido legal: comícios e propaganda que viram votos.', req: () => !S.legal ? 'A organização não é um partido legal.' : null,
      ef: s => { S.e[s].apoio += 2.5 * mod('legit'); S.e[s].campanha++; return 'apoio +2,5%'; } },
    levante: { nome: 'Levante popular', pa: 2, f: 80, alvo: 'estado', militar: true, desc: 'Insurreição: o povo armado toma as ruas. Cria uma milícia e ataca o governo no estado.',
      req: s => !S.insurreicao ? 'Declare a insurreição antes.' : S.e[s].apoio < (tem('insurreicao_urbana') ? 30 : 40) ? `Precisa de ${tem('insurreicao_urbana') ? 30 : 40}% de apoio.` : S.e[s].nucleos < 3 ? 'Precisa de 3 núcleos no estado.' : M.controle(s)[1] > 0.7 ? 'O estado já está sob seu controle.' : null,
      ef: (s, ctx) => levante(s, ctx) },
    governo_popular: { nome: 'Instalar governo popular', pa: 1, f: 100, alvo: 'estado', desc: 'Conselhos populares administram o território liberado: fundos, armas e recrutas todo mês.', req: s => S.e[s].gp ? 'Já existe governo popular.' : M.controle(s)[1] < 0.6 ? 'Precisa controlar 60% do estado.' : null,
      ef: s => { S.e[s].gp = true; S.rec.legit += 3; S.e[s].apoio += 5; return 'governo popular instalado'; } },
    reforma_agraria: { nome: 'Reforma agrária', pa: 1, f: 80, alvo: 'estado', desc: 'Distribui terra no território liberado.', req: s => !S.e[s].gp ? 'Precisa de governo popular no estado.' : S.e[s].ra ? 'Já foi feita.' : null,
      ef: s => { S.e[s].ra = true; const g = 8 * (tem('agraria') ? 1.5 : 1); S.e[s].apoio += g; S.rec.militantes += Math.round(simp(s) * 0.0005); S.rec.legit += 2; return `apoio +${r1(g)}%`; } },
    // nacionais
    greve: { nome: 'Greve geral', pa: 2, f: 150, alvo: 'nacional', desc: 'Para o país. Derruba a economia e a estabilidade do governo.', req: () => S.e.reduce((a, e) => a + e.sindical, 0) < 6 ? 'Precisa de base sindical somando 6 nos estados.' : null,
      ef: () => { const k = (tem('sindicalismo') ? 1.6 : 1) * mod('greve'); S.gov.econ -= 14 * k; S.gov.estab -= 9 * k; S.e.forEach((e, i) => { if (e.sindical) e.apoio += 1.5 + e.sindical * 0.5; }); S.rec.visib += 6; S.e.forEach(e => { e.sindical = Math.max(0, e.sindical - 1); }); log('Greve geral para o Brasil. Fábricas, portos e transportes param.', 3, null, 'vitoria'); return 'país parado'; } },
    jornal: { nome: 'Jornal nacional', pa: 1, f: 80, alvo: 'nacional', desc: 'Jornal impresso e digital em todo o país.', ef: () => { S.e.forEach(e => { if (e.nucleos || tem('imprensa')) e.apoio += 0.6; }); S.rec.legit += 2; S.rec.pf += 2; return 'apoio nacional'; } },
    intl: { nome: 'Diplomacia internacional', pa: 1, f: 100, alvo: 'nacional', desc: 'Busca apoio de movimentos e governos estrangeiros.', ef: () => { S.rec.intl += 5; return 'apoio internacional +5'; } },
    congresso: { nome: 'Congresso da organização', pa: 2, f: 120, alvo: 'nacional', desc: 'Debate a linha e une a organização.', ef: () => { S.rec.coesao += 12; S.rec.moral += 5; S.rec.pf += 5; return 'coesão +12'; } },
    purga: { nome: 'Depuração interna', pa: 1, f: 0, alvo: 'nacional', desc: 'Expulsa vacilantes e suspeitos. Mais coesão e segurança, menos gente.', ef: () => { const p = Math.round(S.rec.militantes * 0.08); S.rec.militantes -= p; S.rec.coesao += 15; S.rec.visib -= 10; return `−${p} militantes`; } },
    insurreicao: { nome: 'Declarar insurreição', pa: 2, f: 0, alvo: 'nacional', militar: true, desc: 'Chama o povo às armas. Libera levantes e todos os tipos de tropa; o governo se mobiliza.', req: () => S.insurreicao ? 'Já declarada.' : null,
      ef: () => { S.insurreicao = true; S.armado = true; S.legal = false; S.rec.visib += 30; S.gov.mobil += 30; S.rec.legit += S.gov.legit < 40 ? 6 : -6; S.rec.moral += 10; log(`${S.org.sigla} declara a insurreição popular em todo o território nacional.`, 3, null, 'guerra'); return 'insurreição declarada'; } },
    registrar: { nome: 'Registrar partido legal', pa: 1, f: 100, alvo: 'nacional', desc: 'Disputa eleições e reduz a repressão. Impossível depois de pegar em armas.', req: () => S.legal ? 'Já é legal.' : S.armado ? 'A organização já pegou em armas.' : null,
      ef: () => { S.legal = true; S.rec.visib -= 15; S.rec.legit += 5; return 'partido registrado'; } }
  };

  function levante(s, ctx) {
    const e = S.e[s];
    const forca = Math.round(simp(s) * 0.002 * (1 + e.infiltr * 0.1) * (tem('insurreicao_urbana') ? 1.5 : 1) * mod('levante') + 300);
    const u = criarUnidade(1, 'milicia', forca, s, 'Milícia de ' + ST[s].cap, { equip: Math.min(0.9, 0.3 + S.rec.armas / (forca * 2)), moral: 85 });
    const armasUsadas = Math.min(S.rec.armas, forca * 0.5); S.rec.armas -= Math.round(armasUsadas);
    // capital: o levante começa na cidade
    const cap = M.CIDADES.find(c => c.n === ST[s].cap); const ponto = cap ? cap.p : ST[s].anchor;
    u.pos = ponto.slice();
    const res = combate([u], s, { origem: ponto, alvo: ST[s].anchor, levante: true }, ctx);
    if (e.infiltr >= 3) { S.unidades.filter(g => g.f === 0 && g.s === s).forEach(g => { const d = Math.round(g.forca * 0.12 * e.infiltr / 5); g.forca -= d; u.forca += d; }); log(`Soldados de ${ST[s].n} passam para o lado do povo.`, 2, s, 'vitoria'); }
    log(`Levante popular em ${ST[s].cap}: ${forca.toLocaleString('pt-BR')} pessoas em armas.`, 3, s, 'guerra');
    return res ? `${Math.round(res.capt.length / ST[s].area * 100)}% do estado tomado` : 'levante';
  }

  function custoPol(id) { const a = POL[id]; return { pa: a.pa, f: a.f }; }
  function paDisponivel() { return paTotal() - S.politicas.reduce((a, p) => a + (POL[p.id] ? POL[p.id].pa : (p.pa || 1)), 0) - S.ordens.reduce((a, o) => a + (ORD[o.tipo].pa(o)), 0); }
  function paTotal() { return clamp(3 + Math.floor(S.rec.quadros / 120) + (tem('escola_quadros') ? 1 : 0), 3, 10); }
  function fundosReservados() { return S.politicas.reduce((a, p) => a + (POL[p.id] ? POL[p.id].f : (p.f || 0)), 0) + S.ordens.reduce((a, o) => a + (o.fundos || 0), 0); }
  function podePolitica(id, s) {
    const a = POL[id]; if (!a) return 'Ação desconhecida.';
    if (a.alvo === 'nacional' && S.politicas.some(p => p.id === id)) return 'Já programada neste mês.';
    if (a.alvo === 'estado' && S.politicas.some(p => p.id === id && p.s === s)) return 'Já programada para este estado.';
    if (paDisponivel() < a.pa) return 'Pontos de ação insuficientes.';
    if (S.rec.fundos - fundosReservados() < a.f) return 'Fundos insuficientes.';
    if (a.militar && a.alvo === 'estado' && !S.insurreicao && id === 'levante') return 'Declare a insurreição antes.';
    if (a.req) { const r = a.req(s); if (r) return r; }
    return null;
  }
  function programarPolitica(id, s) { const r = podePolitica(id, s); if (r) return r; S.politicas.push({ id, s }); return null; }
  function programarLivre(texto, s, aval) { if (paDisponivel() < (aval.pa || 1)) return 'Pontos de ação insuficientes.'; S.politicas.push({ id: 'livre', s, texto, aval, pa: aval.pa || 1, f: aval.fundos || 0 }); return null; }
  function cancelarPolitica(i) { S.politicas.splice(i, 1); }

  // ---------------- ordens militares ----------------
  const ORD = {
    mover: { nome: 'Mover', pa: () => 0, desc: 'Desloca a tropa para um estado vizinho onde você tem presença ou que esteja livre de inimigos.', alvo: 'viz' },
    atacar: { nome: 'Atacar', pa: () => 1, desc: 'Ataca o inimigo no estado alvo. Ataques de dois estados diferentes no mesmo alvo viram uma pinça (+30%).', alvo: 'atk' },
    travessia: { nome: 'Forçar travessia', pa: () => 2, desc: 'Ataque através de um grande rio com botes e pontes improvisadas: anula a penalidade de 30%.', alvo: 'rio' },
    guerrilha: { nome: 'Guerrilha e emboscada', pa: () => 1, desc: 'Desgasta o inimigo sem disputar terreno. Perdas baixas; ótima em selva, sertão e serra.', alvo: 'atk' },
    sabotar: { nome: 'Sabotar suprimento', pa: () => 1, desc: 'Ataca estradas, pontes e depósitos: tropas inimigas no alvo perdem suprimento.', alvo: 'atk' },
    barragem: { nome: 'Barragem de artilharia', pa: () => 1, desc: 'Só artilharia: reduz em 20% a defesa do alvo para os ataques deste mês.', alvo: 'atk', so: 'artilharia' },
    fortificar: { nome: 'Fortificar posição', pa: () => 0, desc: 'Cava trincheiras: +15% de defesa por mês parado (até +45%).', alvo: null },
    elastica: { nome: 'Defesa elástica', pa: () => 0, desc: 'Se atacada, cede terreno mas perde 40% menos gente.', alvo: null },
    retirada: { nome: 'Retirada estratégica', pa: () => 0, desc: 'Recua para o estado seu mais próximo com suprimento.', alvo: null },
    reforcar: { nome: 'Reforçar', pa: () => 1, desc: 'Incorpora militantes e armas à tropa até o efetivo máximo.', alvo: null },
    dissolver: { nome: 'Dissolver', pa: () => 0, desc: 'Desmobiliza a tropa: combatentes voltam a ser militantes.', alvo: null }
  };
  function alvosValidos(u, tipo) {
    const o = ORD[tipo]; if (!o.alvo) return [];
    const cand = [u.s, ...ST[u.s].viz.map(v => v.s)];
    return cand.filter(s => {
      const c = M.controle(s);
      const inimigoAqui = [0, 2, 3].some(g => inimigos(1, g) && (c[g] > 0.01 || S.unidades.some(x => x.f === g && x.s === s)));
      if (tipo === 'mover') { if (s === u.s) return false; return c[1] > 0.05 || !S.unidades.some(x => x.s === s && inimigos(1, x.f)) && (S.e[s].nucleos > 0 || c[1] > 0); }
      if (tipo === 'travessia') return s !== u.s && M.rio(u.s, s) && inimigoAqui;
      return inimigoAqui;
    });
  }
  function podeOrdem(u, tipo) {
    if (u.f !== 1) return 'Não é sua tropa.';
    if (u.post === 'cercada' && tipo === 'mover') return 'Tropa cercada: só pode atacar para romper o cerco.';
    const o = ORD[tipo]; if (o.so && u.tipo !== o.so) return 'Só para artilharia.';
    if (paDisponivel() + (S.ordens.find(x => x.uid === u.id) ? ORD[S.ordens.find(x => x.uid === u.id).tipo].pa() : 0) < o.pa()) return 'Pontos de ação insuficientes.';
    if (tipo === 'reforcar' && (u.forca >= u.max || S.rec.militantes < 50)) return u.forca >= u.max ? 'Efetivo já completo.' : 'Militantes insuficientes.';
    if (o.alvo && !alvosValidos(u, tipo).length) return 'Nenhum alvo ao alcance.';
    if (['atacar', 'travessia', 'guerrilha', 'sabotar', 'barragem'].includes(tipo) && !S.armado) return 'A organização ainda não pegou em armas.';
    return null;
  }
  function darOrdem(u, tipo, alvo) {
    const r = podeOrdem(u, tipo); if (r) return r;
    if (ORD[tipo].alvo && !alvosValidos(u, tipo).includes(alvo)) return 'Alvo inválido.';
    S.ordens = S.ordens.filter(o => o.uid !== u.id); S.ordens.push({ uid: u.id, tipo, alvo }); return null;
  }
  function cancelarOrdem(uid) { S.ordens = S.ordens.filter(o => o.uid !== uid); }
  function pincas() { const g = {}; S.ordens.filter(o => o.tipo === 'atacar' || o.tipo === 'travessia').forEach(o => { const u = unidade(o.uid); if (!u) return; (g[o.alvo] = g[o.alvo] || new Set()).add(u.s); }); return Object.keys(g).filter(k => g[k].size >= 2).map(Number); }

  function podeFormar(tipo, s) {
    const T = TIPOS[tipo]; if (!T || !T.min) return 'Tipo inválido.';
    if (T.req && !tem(T.req)) return `Exige a tese "${TESES[T.req].nome}".`;
    if (tipo !== 'guerrilha' && !S.insurreicao) return 'Antes da insurreição só é possível formar guerrilhas.';
    if (S.e[s].nucleos < 2 && M.controle(s)[1] < 0.3) return 'Precisa de 2 núcleos ou 30% do estado.';
    if (paDisponivel() < 1) return 'Pontos de ação insuficientes.';
    if (S.rec.militantes < T.min + 50) return 'Militantes insuficientes.';
    return null;
  }
  function custoFormar(tipo, n) { const T = TIPOS[tipo]; return { armas: Math.round(n * T.armas * (tipo === 'guerrilha' ? mod('guerCusto') : 1)), fundos: Math.round(n * T.fundos * (tipo === 'guerrilha' ? mod('guerCusto') : 1)) }; }
  function formarUnidade(tipo, s, n, nome) {
    const r = podeFormar(tipo, s); if (r) return r;
    n = Math.round(clamp(n, TIPOS[tipo].min, S.rec.militantes - 50));
    const c = custoFormar(tipo, n); if (S.rec.fundos - fundosReservados() < c.fundos) return 'Fundos insuficientes.';
    const armas = Math.min(S.rec.armas, c.armas);
    S.rec.militantes -= n; S.rec.armas -= armas; S.rec.fundos -= c.fundos;
    const u = criarUnidade(1, tipo, n, s, nome || nomeUnidade(tipo, s), { equip: c.armas ? clamp(armas / c.armas, 0.15, 1) : 1, moral: 60 + S.rec.moral * 0.3 });
    S.politicas.push({ id: 'formacao', s, pa: 1, f: 0, texto: 'Formação de ' + u.nome, feito: true });
    S.armado = true; if (S.legal && !S.insurreicao) { S.rec.legit -= 5; } S.rec.visib += 4;
    return u;
  }
  function nomeUnidade(tipo, s) {
    const n = S.unidades.filter(u => u.f === 1).length + 1 + (S.flags.perdidas || 0);
    const est = ST[s].n;
    return { guerrilha: `Destacamento ${est}`, milicia: `Milícia de ${ST[s].cap}`, infantaria: `${n}ª Coluna ${est}`, motorizada: `${n}ª Coluna Motorizada`, artilharia: `Artilharia ${est}` }[tipo] || `${n}ª Unidade`;
  }

  // ---------------- combate ----------------
  // atacantes: unidades da mesma facção; s: estado alvo. Retorna resultado e registra animação em ctx.anims
  function combate(atk, s, opt, ctx) {
    const f = atk[0].f; const st = ST[s]; const ter = M.TERRENO[st.ter];
    const c = M.controle(s);
    const posIni = atk.map(u => u.pos.slice()); const src = atk[0].s;
    // defensor: facção inimiga com mais presença
    let dfac = -1, best = 0;
    [0, 1, 2, 3].forEach(g => { if (!inimigos(f, g)) return; const v = c[g] * 3 + S.unidades.filter(u => u.f === g && u.s === s).reduce((a, u) => a + u.forca, 0) / 5000; if (v > best) { best = v; dfac = g; } });
    if (dfac < 0) return null;
    const defs = S.unidades.filter(u => u.f === dfac && u.s === s);
    const pode = o => o === dfac || (inimigos(f, o) && o !== 255 && o !== f);
    let A = atk.reduce((a, u) => a + eficacia(u, 'atk', s), 0);
    const fontes = new Set(atk.map(u => u.s)); if (opt.pinca || fontes.size >= 2) A *= 1.3;
    if (!opt.levante) { const rios = atk.filter(u => u.s !== s && M.rio(u.s, s)); if (rios.length && !opt.travessia) A *= 0.7; }
    if (opt.barragem) A *= 1 / (1 - Math.min(0.4, opt.barragem * 0.2)) * 0.95;
    if (f === 1) A *= 1 + S.e[s].apoio / 250;
    if (f === 0 && S.iaGov && S.iaGov.postura === 'agressiva') A *= 1.08;
    let garn = 0;
    if (dfac === 0) garn = S.e[s].guarn * c[0] * (1 - S.e[s].infiltr * 0.08);
    if (dfac === 1) garn = (simp(s) * 0.0008 * (S.e[s].gp ? 1.5 : 1) * (tem('autodefesa') ? 1.3 : 1) + S.e[s].nucleos * 40) * c[1];
    if (dfac === 2) garn = 400 * c[2];
    let D = defs.reduce((a, u) => a + eficacia(u, 'def', s), 0) + garn * 0.7;
    D *= ter.def; D = Math.max(D, 30);
    if (dfac === 0 && opt.barragemFactor) D *= opt.barragemFactor;
    const r = (A / D) * (0.85 + rnd() * 0.3);
    // território
    const livres = st.area - M.cont[s][f];
    let frac = r < 0.85 ? 0 : clamp(0.08 + (r - 0.85) * 0.4, 0.08, opt.levante ? 0.8 : 0.6);
    if (defs.some(u => u.post === 'elastica')) frac *= 1.4;
    if (!defs.length && garn < 50) frac = Math.max(frac, 0.5);
    const n = Math.round(livres * frac);
    const origem = opt.origem || (src === s ? posIni[0] : M.fronteira(src, s));
    const pontoCombate = src === s ? (M.centroide(s, dfac) || st.anchor) : M.fronteira(src, s);
    const alvoPt = opt.alvo || (dfac >= 0 && M.centroide(s, dfac)) || st.anchor;
    const capt = M.planejarAvanco(s, f, n, alvoPt, origem, pode);
    capt.forEach(i => M.setOwner(i, f));
    // perdas
    const totA = atk.reduce((a, u) => a + u.forca, 0), totD = defs.reduce((a, u) => a + u.forca, 0) + garn;
    let pA = totA * 0.05 * clamp(1 / r, 0.35, 2.5), pD = totD * 0.065 * clamp(r, 0.35, 2.5);
    if (defs.some(u => u.post === 'elastica')) pD *= 0.6;
    atk.forEach(u => { const q = Math.round(pA * u.forca / totA); u.forca -= q; u.moral = clamp(u.moral + (r > 1 ? 4 : -7), 5, 100); u.xp = Math.min(5, u.xp + 0.3); u.entr = 0; if (u.post === 'fortificada') u.post = 'normal'; });
    defs.forEach(u => { const q = Math.round(pD * u.forca / Math.max(1, totD)); u.forca -= q; u.moral = clamp(u.moral + (r > 1 ? -8 : 3), 5, 100); });
    if (garn > 0) { const q = pD * garn / Math.max(1, totD); if (dfac === 0) S.e[s].guarn = Math.max(0, Math.round(S.e[s].guarn - q)); if (dfac === 1) S.rec.militantes = Math.max(0, Math.round(S.rec.militantes - q * 0.3)); }
    // armas capturadas e moral da organização
    if (f === 1) { if (r > 1) { S.rec.armas += Math.round(pD * 0.25); S.rec.moral += 2; S.stats.vitorias++; } else S.rec.moral -= 2; S.stats.batalhas++; }
    if (dfac === 1) { if (r > 1) S.rec.moral -= 2; else { S.rec.moral += 1; S.rec.armas += Math.round(pA * 0.15); } }
    if (dfac === 0 && r > 1) { S.gov.legit -= 0.8; S.gov.estab -= 0.6; }
    // ponto final da seta: até onde a frente realmente chegou
    let fim;
    if (capt.length) { let sx = 0, sy = 0; const k = Math.max(1, Math.round(capt.length * 0.25)); const ult = capt.slice(-k); ult.forEach(i => { const p = M.cellXY(i); sx += p[0]; sy += p[1]; }); fim = [sx / ult.length, sy / ult.length]; }
    else { const fr = src === s ? posIni[0] : M.fronteira(src, s); fim = [fr[0] + (alvoPt[0] - fr[0]) * 0.12, fr[1] + (alvoPt[1] - fr[1]) * 0.12]; }
    // movimento dos atacantes até a frente
    const cAp = M.controle(s);
    atk.forEach((u, k) => { if (capt.length) { u.s = s; u.pos = [fim[0] + OFFS[k % OFFS.length][0] * 0.5, fim[1] + OFFS[k % OFFS.length][1] * 0.5]; } });
    // recuo ou cerco dos defensores
    if (cAp[dfac] < 0.25) defs.forEach(u => recuar(u, ctx));
    const res = { r, capt, dfac, fim, int: clamp(Math.round((totA + totD) / 4000), 1, 3), perdasA: Math.round(pA), perdasD: Math.round(pD) };
    if (ctx) ctx.anims.push({ t: 'seta', f, tipo: opt.levante ? 'levante' : 'ataque', uids: atk.map(u => u.id), de: posIni, origem, para: fim, flips: capt.slice(), alvoF: f, dfac, combate: { p: capt.length ? fim : pontoCombate, int: res.int }, pinca: fontes.size >= 2, s, rotulo: opt.rotulo });
    const quem = fac(f).curto, contra = fac(dfac).curto;
    if (f === 1 || dfac === 1) log(`${opt.levante ? 'Levante' : fontes.size >= 2 ? 'Pinça' : 'Ofensiva'} ${f === 1 ? 'da' : 'do'} ${quem} em ${st.n}: ${r > 1 ? 'vitória' : 'repelida'}${capt.length ? `, ${Math.round(capt.length / st.area * 100)}% do estado tomado` : ''}. Baixas: ${res.perdasA} atacantes, ${res.perdasD} defensores.`, r > 1.2 || capt.length > st.area * 0.2 ? 3 : 2, s, f === 1 ? (r > 1 ? 'vitoria' : 'perda') : (r > 1 ? 'perda' : 'vitoria'));
    return res;
  }

  function recuar(u, ctx) {
    const opts = ST[u.s].viz.map(v => v.s).filter(s => M.controle(s)[u.f] > 0.3 && !S.unidades.some(x => x.s === s && inimigos(u.f, x.f) && x.forca > u.forca * 2));
    if (!opts.length) { u.post = 'cercada'; return false; }
    opts.sort((a, b) => M.controle(b)[u.f] - M.controle(a)[u.f]);
    const de = u.pos.slice(); u.s = opts[0]; u.pos = posLivre(u.s, u.f, u); u.moral = Math.max(5, u.moral - 10); u.post = 'normal'; u.entr = 0;
    if (ctx) ctx.anims.push({ t: 'seta', f: u.f, tipo: 'retirada', uids: [u.id], de: [de], origem: de, para: u.pos.slice(), flips: [], s: u.s });
    return true;
  }

  function mover(u, s, ctx, tipo = 'mover') {
    const de = u.pos.slice(); u.s = s; u.pos = posLivre(s, u.f, u); u.entr = 0; if (u.post === 'fortificada') u.post = 'normal';
    if (ctx) ctx.anims.push({ t: 'seta', f: u.f, tipo, uids: [u.id], de: [de], origem: de, para: u.pos.slice(), flips: [], s });
  }

  // ---------------- resolução do turno ----------------
  function resolverTurno() {
    const ctx = { anims: [], antes: Object.fromEntries(S.unidades.map(u => [u.id, u.pos.slice()])) };
    S.log = []; S.setasHist = [];
    const pop0 = parcelaPop(1);
    S.unidades.forEach(u => { u.pos0 = u.pos.slice(); });
    ctx.anims.push({ t: 'fase', texto: `${S.org.sigla}: ações políticas` });
    // 1. política do jogador
    for (const p of S.politicas) {
      if (p.feito) continue;
      if (p.id === 'livre') { aplicarLivre(p, ctx); continue; }
      const a = POL[p.id]; if (!a) continue;
      if (S.rec.fundos < a.f) { log(`Sem fundos para ${a.nome.toLowerCase()}.`, 1, p.s, 'perda'); continue; }
      const motivo = a.req ? a.req(p.s) : null; if (motivo && p.id !== 'levante') { log(`${a.nome} cancelada: ${motivo}`, 1, p.s); continue; }
      S.rec.fundos -= a.f;
      if (a.militar) ctx.anims.push({ t: 'fase', texto: a.nome });
      const r = a.ef(p.s, ctx);
      if (!a.militar || p.id === 'insurreicao') ctx.anims.push({ t: 'politica', s: p.s, texto: `${a.nome}${p.s != null ? ' — ' + ST[p.s].n : ''}: ${r}` });
      if (a.ilegal && S.legal && rnd() < 0.3) { S.legal = false; log('A justiça cassa o registro do partido após ações ilegais.', 3, null, 'perda'); }
    }
    // 2. ordens militares do jogador
    if (S.ordens.length) ctx.anims.push({ t: 'fase', texto: `Ofensivas da ${S.org.sigla}` });
    const ords = S.ordens.map(o => ({ ...o, u: unidade(o.uid) })).filter(o => o.u);
    ords.filter(o => ['fortificar', 'elastica', 'dissolver', 'reforcar', 'retirada', 'mover'].includes(o.tipo)).forEach(o => {
      const u = o.u;
      if (o.tipo === 'fortificar') { u.post = 'fortificada'; u.entr = Math.min(3, u.entr + 1); }
      if (o.tipo === 'elastica') { u.post = 'elastica'; u.entr = 0; }
      if (o.tipo === 'dissolver') { S.rec.militantes += u.forca; S.rec.armas += Math.round(u.forca * u.equip * 0.6); remover(u); log(`${u.nome} desmobilizada.`, 1, u.s); }
      if (o.tipo === 'reforcar') { const n = Math.min(u.max - u.forca, S.rec.militantes - 30, 1500); if (n > 0) { const ar = Math.min(S.rec.armas, n); u.equip = (u.equip * u.forca + n * Math.min(1, ar / n)) / (u.forca + n); u.forca += n; S.rec.militantes -= n; S.rec.armas -= ar; } }
      if (o.tipo === 'retirada') { const alvo = baseMaisProxima(u); if (alvo != null && alvo !== u.s) mover(u, alvo, ctx, 'retirada'); u.post = 'normal'; }
      if (o.tipo === 'mover') { if (!S.unidades.some(x => x.s === o.alvo && inimigos(1, x.f))) mover(u, o.alvo, ctx); }
    });
    const barr = {}; ords.filter(o => o.tipo === 'barragem').forEach(o => { barr[o.alvo] = (barr[o.alvo] || 0) + 1; const u = o.u; ctx.anims.push({ t: 'seta', f: 1, tipo: 'barragem', uids: [], de: [u.pos], origem: u.pos, para: ST[o.alvo].anchor, flips: [], combate: { p: M.centroide(o.alvo, 0) || ST[o.alvo].anchor, int: 1 }, s: o.alvo }); S.unidades.filter(x => x.s === o.alvo && inimigos(1, x.f)).forEach(x => { x.forca -= Math.round(u.forca * 0.6 * u.equip); x.moral -= 4; }); });
    // ataques agrupados por alvo
    const grupos = {}; ords.filter(o => o.tipo === 'atacar' || o.tipo === 'travessia').forEach(o => { (grupos[o.alvo] = grupos[o.alvo] || []).push(o); });
    Object.entries(grupos).forEach(([s, os]) => { s = +s; const us = os.map(o => o.u).filter(u => S.unidades.includes(u) && u.forca > 0); if (!us.length) return; const fontes = new Set(us.map(u => u.s)); combate(us, s, { pinca: fontes.size >= 2, travessia: os.some(o => o.tipo === 'travessia'), barragemFactor: barr[s] ? 1 - Math.min(0.4, barr[s] * 0.2) : 1 }, ctx); });
    ords.filter(o => o.tipo === 'guerrilha' || o.tipo === 'sabotar').forEach(o => {
      const u = o.u; if (!S.unidades.includes(u)) return; const s = o.alvo; const ter = M.TERRENO[ST[s].ter];
      const alvos = S.unidades.filter(x => x.s === s && inimigos(1, x.f));
      const pt = (alvos[0] && alvos[0].pos) || M.centroide(s, 0) || ST[s].anchor;
      if (o.tipo === 'guerrilha') {
        const dano = eficacia(u, 'atk', s) * 0.09 * ter.guer * (tem('guerrilha') ? 1.3 : 1);
        if (alvos.length) alvos.forEach(x => { x.forca -= Math.round(dano / alvos.length); x.moral -= 5; }); else if (S.e[s].guarn) S.e[s].guarn = Math.max(0, Math.round(S.e[s].guarn - dano));
        u.forca -= Math.round(dano * 0.25 / ter.guer); u.xp = Math.min(5, u.xp + 0.2); S.rec.visib += 1.5; S.rec.armas += Math.round(dano * 0.1);
        log(`Emboscada de ${u.nome} em ${ST[s].n}: ${Math.round(dano)} baixas inimigas.`, 1, s, 'vitoria');
      } else { S.e[s].dano = Math.min(60, S.e[s].dano + 20); alvos.forEach(x => { x.sup = Math.max(0, x.sup - 25); }); S.gov.econ -= 1.5; u.forca -= Math.round(u.forca * 0.02); log(`${u.nome} sabota estradas e depósitos em ${ST[s].n}.`, 1, s, 'vitoria'); }
      ctx.anims.push({ t: 'seta', f: 1, tipo: o.tipo, uids: [], de: [u.pos], origem: u.pos, para: pt, flips: [], combate: { p: pt, int: 1 }, s });
    });
    S.unidades.filter(u => u.forca <= 30).forEach(u => { log(`${u.nome} (${fac(u.f).curto}) foi destruída.`, 2, u.s, u.f === 1 ? 'perda' : 'vitoria'); if (u.f === 1) S.flags.perdidas = (S.flags.perdidas || 0) + 1; remover(u); });
    // 3. rivais
    turnoLiga(ctx); turnoComando(ctx); turnoPOU();
    // 4. governo
    ctx.anims.push({ t: 'fase', texto: 'Resposta do governo' });
    turnoGoverno(ctx);
    S.unidades.filter(u => u.forca <= 30).forEach(u => { log(`${u.nome} (${fac(u.f).curto}) foi destruída.`, 2, u.s, u.f === 1 ? 'perda' : 'vitoria'); remover(u); });
    // 5. suprimento e cercos
    suprimento(ctx);
    // 6. economia e política
    economia();
    // 7. eventos e eleições
    eventosDoMes();
    normalizar();
    // 8. fim do mês
    S.unidades.forEach(u => { delete u.pos0; if (u.post === 'elastica') u.post = 'normal'; });
    S.ordens = []; S.politicas = [];
    const pop1 = parcelaPop(1); S.stats.maxPop = Math.max(S.stats.maxPop, pop1);
    const rel = { turno: S.turno, data: dataTxt(), log: S.log.slice(), popAntes: pop0, popDepois: pop1, apoio: apoioNacional(), gov: { ...S.gov }, rec: { ...S.rec } };
    S.historico.push({ turno: S.turno, pop: pop1, apoio: apoioNacional(), mil: S.rec.militantes, comb: combatentes(), gl: S.gov.legit, ge: S.gov.estab });
    if (S.historico.length > 200) S.historico.shift();
    S.ultimoRelatorio = rel;
    S.turno++;
    verificarFim();
    S.setasHist = ctx.anims.filter(a => a.t === 'seta' && a.tipo !== 'barragem').map(a => ({ f: a.f, tipo: a.tipo, origem: a.origem, para: a.para, pinca: a.pinca }));
    return { anims: ctx.anims, antes: ctx.antes, relatorio: rel };
  }

  function baseMaisProxima(u) {
    // busca em largura no grafo de estados até um estado com 40% de controle
    const vis = new Set([u.s]); let fila = [u.s];
    while (fila.length) { const nx = []; for (const s of fila) { if (M.controle(s)[u.f] >= 0.4 && s !== u.s) return s; for (const v of ST[s].viz) if (!vis.has(v.s)) { vis.add(v.s); nx.push(v.s); } } fila = nx; if (vis.size > 27) break; }
    const c = ST[u.s].viz.map(v => v.s).filter(s => M.controle(s)[u.f] > 0.05 || (u.f === 1 && S.e[s].nucleos > 1));
    return c[0] ?? u.s;
  }

  function aplicarLivre(p, ctx) {
    const a = p.aval || {}; const ok = rnd() < clamp(a.chance ?? 0.5, 0.05, 0.95);
    S.rec.fundos -= Math.min(S.rec.fundos, a.fundos || 0);
    const ef = (ok ? a.efeitos : a.falha) || {}; const s = p.s;
    const lim = (v, m) => clamp(+v || 0, -m, m);
    if (s != null) { S.e[s].apoio += lim(ef.apoio, 8); S.e[s].nucleos = clamp(S.e[s].nucleos + lim(ef.nucleos, 2), 0, 10); S.e[s].repressao += lim(ef.repressao, 15); S.e[s].guarn = Math.max(0, Math.round(S.e[s].guarn * (1 + lim(ef.guarnicao_pct, 30) / 100))); S.e[s].infiltr = clamp(S.e[s].infiltr + lim(ef.infiltracao, 2), 0, 5); }
    S.rec.militantes += Math.round(lim(ef.militantes, 2000)); S.rec.fundos += Math.round(lim(ef.fundos, 600)); S.rec.armas += Math.round(lim(ef.armas, 1500));
    S.rec.visib += lim(ef.visibilidade, 20); S.rec.legit += lim(ef.legitimidade, 8); S.rec.coesao += lim(ef.coesao, 10); S.rec.moral += lim(ef.moral, 10); S.rec.intl += lim(ef.apoio_internacional, 8);
    S.gov.legit += lim(ef.gov_legitimidade, 6); S.gov.estab += lim(ef.gov_estabilidade, 6); S.gov.econ += lim(ef.gov_economia, 6);
    const txt = (ok ? a.narrativa : a.narrativa_falha) || (ok ? 'A ação teve sucesso.' : 'A ação fracassou.');
    log(`${ok ? '' : 'Fracasso: '}${p.texto}${s != null ? ' (' + ST[s].n + ')' : ''} — ${txt}`, 2, s, ok ? 'vitoria' : 'perda');
    ctx.anims.push({ t: 'politica', s, texto: (ok ? 'Ação especial: ' : 'Ação especial fracassou: ') + p.texto });
  }

  // ---------------- governo ----------------
  function ameacaEstado(s) { const c = M.controle(s); return c[1] * 100 + S.unidades.filter(u => u.f === 1 && (u.s === s || ST[s].viz.some(v => v.s === u.s))).reduce((a, u) => a + u.forca, 0) / 200 + S.e[s].apoio * 0.5 + S.e[s].nucleos * 2; }
  function caminho(de, para, f) {
    if (de === para) return [de]; const prev = new Map([[de, -1]]); let fila = [de];
    while (fila.length) { const nx = []; for (const s of fila) for (const v of ST[s].viz) { if (prev.has(v.s)) continue; if (M.controle(v.s)[f] < 0.2 && v.s !== para) continue; prev.set(v.s, s); if (v.s === para) { const r = [para]; let c = s; while (c !== -1) { r.unshift(c); c = prev.get(c); } return r; } nx.push(v.s); } fila = nx; }
    return null;
  }
  function turnoGoverno(ctx) {
    const g = S.gov; const dif = DIFICULDADE[S.dif].gov; const hint = S.iaGov || {};
    // mobilização e reservas
    const ameacaTotal = combatentes(1) / 400 + parcelaPop(1) * 300 + S.e.reduce((a, e) => a + e.nucleos, 0) * 0.5 + S.rec.visib * 0.3 + (S.liga.ativa ? 8 : 0);
    g.mobil = clamp(g.mobil + (ameacaTotal > 45 ? 3 : ameacaTotal > 22 ? 1.2 : -1.5) + (S.insurreicao ? 0.8 : 0), 0, 100);
    g.reserva += Math.round((g.econ * 5 + g.mobil * 9) * dif);
    // repressão política
    const alvos = ST.map((s, i) => i).sort((a, b) => (S.e[b].nucleos * 10 + S.e[b].apoio) - (S.e[a].nucleos * 10 + S.e[a].apoio));
    const foco = (hint.foco_repressao || []).map(uf => M.byId[uf]).filter(x => x != null);
    const lista = [...new Set([...foco, ...alvos.slice(0, 4)])].slice(0, 5);
    let presos = 0;
    lista.forEach(s => {
      const e = S.e[s]; if (M.controle(s)[0] < 0.4) return;
      e.repressao = clamp(e.repressao + 3 + g.mobil / 25 + (hint.postura === 'linha_dura' ? 4 : 0), 0, 95);
      const p = (e.repressao / 100) * (0.25 + S.rec.visib / 120) * (1 - e.contraint * 0.15) * (tem('disciplina') ? 0.6 : 1) * (S.legal ? 0.6 : 1);
      if (e.nucleos > 0 && rnd() < p) { e.nucleos--; const q = Math.round(10 + S.rec.militantes * 0.012 * (e.repressao / 50)); S.rec.militantes -= q; presos += q; S.rec.quadros = Math.max(0, S.rec.quadros - Math.round(q * 0.05)); e.apoio += e.repressao / 45; g.legit -= 0.2; }
    });
    if (presos) log(`Onda de prisões: ${presos} militantes presos pela repressão.`, 2, null, 'perda');
    S.e.forEach(e => { e.repressao = Math.max(10, e.repressao - 0.8); e.contraint = Math.max(0, e.contraint - 0.15); });
    if (g.legit > 45 || hint.propaganda) { g.legit += 0.4; S.e.forEach(e => { e.apoio -= 0.15; }); }
    if (g.legit < 30 && !g.concessao && (hint.concessao !== false)) { g.concessao = 6; g.legit += 6; log('O governo anuncia concessões: aumento do salário mínimo e anistia parcial.', 3, null, 'info'); }
    // recompõe guarnições
    S.e.forEach((e, i) => { const base = (150 + ST[i].pop * 55) * dif * (1 + g.mobil / 120); if (M.controle(i)[0] > 0.5) e.guarn = Math.round(Math.min(base * 1.4, e.guarn + base * 0.06 * (1 - e.infiltr * 0.1))); });
    // unidades militares
    const gov = S.unidades.filter(u => u.f === 0);
    const alvoIA = hint.alvo_ofensiva != null ? M.byId[hint.alvo_ofensiva] : null;
    const ameacas = ST.map((s, i) => [i, ameacaEstado(i)]).filter(x => x[1] > 6).sort((a, b) => b[1] - a[1]);
    const atacados = new Set(); const alocado = {};
    gov.forEach(u => { alocado[u.s] = (alocado[u.s] || 0) + u.forca; });
    const capitais = [M.byId.DF, M.byId.SP, M.byId.RJ];
    for (const u of gov) {
      if (!S.unidades.includes(u)) continue;
      // cercada: tenta romper
      if (u.post === 'cercada') { const saida = ST[u.s].viz.map(v => v.s).filter(s => M.controle(s)[0] > 0.3); const s = u.s; if (M.controle(s)[1] > 0.05) combate([u], s, { origem: u.pos }, ctx); else if (saida.length) mover(u, saida[0], ctx, 'retirada'); continue; }
      const cands = [u.s, ...ST[u.s].viz.map(v => v.s)].filter(s => M.controle(s)[1] > 0.02 || M.controle(s)[2] > 0.02 || S.unidades.some(x => x.s === s && inimigos(0, x.f)));
      let melhor = null, mr = 0;
      cands.filter(s => !atacados.has(s)).forEach(s => { const defF = S.unidades.filter(x => x.s === s && inimigos(0, x.f)).reduce((a, x) => a + eficacia(x, 'def', s), 0) * M.TERRENO[ST[s].ter].def + 200; const atk = eficacia(u, 'atk', s); let r = atk / defF; if (s === alvoIA) r *= 1.3; if (M.controle(s)[1] > 0.4) r *= 1.15; if (r > mr) { mr = r; melhor = s; } });
      const lim = hint.postura === 'defensiva' ? 1.5 : hint.postura === 'agressiva' ? 0.9 : 1.15;
      if (melhor != null && mr >= lim) {
        // reúne aliados no mesmo alvo para pinça do governo
        const juntos = [u, ...gov.filter(x => x !== u && S.unidades.includes(x) && !x._agiu && x.post !== 'cercada' && (x.s === melhor || ST[melhor].viz.some(v => v.s === x.s)) && rnd() < 0.5)];
        juntos.forEach(x => { x._agiu = true; });
        atacados.add(melhor);
        combate(juntos, melhor, { pinca: new Set(juntos.map(x => x.s)).size >= 2 }, ctx);
        continue;
      }
      if (u._agiu) continue;
      // desloca para a maior ameaça
      // guarnição mínima nas capitais e distribuição das tropas entre as ameaças
      if (capitais.includes(u.s) && gov.filter(x => x.s === u.s && S.unidades.includes(x)).length <= 1 && ameacaEstado(u.s) < 30) { if (u.post !== 'fortificada') { u.post = 'fortificada'; } u.entr = Math.min(3, u.entr + 1); continue; }
      if (ameacas.length && rnd() < 0.75) {
        const escolha = ameacas.slice(0, 6).map(([s, a]) => [s, a * 160 - (alocado[s] || 0) - ST[s].viz.reduce((t, v) => t + (alocado[v.s] || 0) * 0.3, 0)]).sort((a, b) => b[1] - a[1])[0];
        if (!escolha || escolha[1] < 0 || escolha[0] === u.s) { if (u.post !== 'fortificada') u.post = 'fortificada'; u.entr = Math.min(3, u.entr + 1); continue; }
        const alvo = escolha[0];
        alocado[u.s] = (alocado[u.s] || 0) - u.forca; alocado[alvo] = (alocado[alvo] || 0) + u.forca;
        if (TIPOS[u.tipo].aereo) { const dest = [alvo, ...ST[alvo].viz.map(v => v.s)].find(s => M.controle(s)[0] > 0.5); if (dest != null && dest !== u.s) { mover(u, dest, ctx, 'aereo'); continue; } }
        const cam = caminho(u.s, alvo, 0); if (cam && cam.length > 1) { const prox = cam[1]; if (!S.unidades.some(x => x.s === prox && inimigos(0, x.f)) && M.controle(prox)[0] > 0.3) mover(u, prox, ctx); }
      } else if (u.post !== 'fortificada' && rnd() < 0.4) { u.post = 'fortificada'; u.entr = Math.min(3, u.entr + 1); }
      else if (u.post === 'fortificada') u.entr = Math.min(3, u.entr + 1);
    }
    gov.forEach(u => { delete u._agiu; });
    // novas tropas
    if (g.reserva > 4000 && g.mobil >= 20 && ameacas.length && S.turno % 3 === 0) {
      const alvo = ameacas[0][0]; const dest = [alvo, ...ST[alvo].viz.map(v => v.s)].filter(s => M.controle(s)[0] > 0.6).sort((a, b) => M.controle(b)[0] - M.controle(a)[0])[0];
      if (dest != null) { const n = Math.min(g.reserva, Math.round(3500 + g.mobil * 40)); g.reserva -= n; g.novas++; const tipo = g.novas % 4 === 0 ? 'blindada' : M.TERRENO[ST[dest].ter].guer > 1.3 ? 'selva' : 'exercito'; const u = criarUnidade(0, tipo, n, dest, `${10 + g.novas}ª Brigada de ${tipo === 'blindada' ? 'Cavalaria Blindada' : tipo === 'selva' ? 'Selva' : 'Infantaria'}`, { equip: 1, moral: 62 }); log(`O governo mobiliza a ${u.nome} (${n.toLocaleString('pt-BR')} homens) em ${ST[dest].n}.`, 2, dest, 'info'); ctx.anims.push({ t: 'politica', s: dest, texto: `Governo mobiliza ${u.nome}` }); }
    }
    // reforço das unidades existentes
    gov.forEach(u => { if (!S.unidades.includes(u) || u.post === 'cercada' || u.sup < 50) return; const n = Math.min(u.max - u.forca, g.reserva * 0.1, 800); if (n > 0) { u.forca += Math.round(n); g.reserva -= Math.round(n); } u.moral = clamp(u.moral + 2, 5, 90); });
  }

  // ---------------- Liga Federalista do Sul ----------------
  function turnoLiga(ctx) {
    const L = S.liga; const rs = M.byId.RS, sc = M.byId.SC, pr = M.byId.PR;
    if (!L.ativa) {
      S.e[rs].apoioLiga += 0.4; S.e[sc].apoioLiga += 0.25;
      if ((S.turno >= 6 && S.gov.estab < 60 && rnd() < 0.35) || (S.turno >= 14 && rnd() < 0.25) || S.turno >= 24) {
        L.ativa = true; L.reserva = 3000;
        const sm = Mundo.P(-53.8, -29.7);
        const capt = M.planejarAvanco(rs, 2, Math.round(ST[rs].area * 0.38), Mundo.P(-55.5, -30), sm, o => o === 0); capt.forEach(i => M.setOwner(i, 2));
        criarUnidade(2, 'paramilitar', 3600, rs, 'Milícia Gaúcha', { equip: 0.8, moral: 75, pos: M.centroide(rs, 2) });
        criarUnidade(2, 'exercito', 2400, rs, 'Coluna Serrana', { equip: 0.75, moral: 70 });
        S.gov.estab -= 6; S.gov.legit -= 3;
        ctx.anims.push({ t: 'fase', texto: 'Levante separatista no Sul' }); ctx.anims.push({ t: 'flips', f: 2, flips: capt, combate: { p: sm, int: 2 } });
        log('A Liga Federalista do Sul pega em armas e proclama a "República do Pampa" em Santa Maria.', 3, rs, 'guerra');
      }
      return;
    }
    L.reserva += Math.round(200 + ST.reduce((a, s, i) => a + M.cont[i][2] / s.area * s.pop * 60, 0));
    const us = S.unidades.filter(u => u.f === 2);
    if (!us.length && M.cont[rs][2] === 0) { L.ativa = false; L.derrotada = true; log('A Liga Federalista do Sul é esmagada pelo governo.', 2, rs); return; }
    if (us.length < 3 && L.reserva > 2500) { const base = [rs, sc, pr].find(s => M.controle(s)[2] > 0.3); if (base != null) { criarUnidade(2, 'paramilitar', 2500, base, 'Brigada Farroupilha ' + (S.nid % 9 + 1), { equip: 0.8, moral: 68 }); L.reserva -= 2500; } }
    for (const u of us) {
      if (!S.unidades.includes(u)) continue;
      const alvos = [u.s, ...ST[u.s].viz.map(v => v.s)].filter(s => [rs, sc, pr].includes(s) || M.controle(s)[2] > 0).filter(s => [0, 1, 3].some(g => inimigos(2, g) && M.controle(s)[g] > 0.05));
      if (L.coord && alvos.length) { combate([u], alvos[0], {}, ctx); continue; }
      if (alvos.length && rnd() < 0.6) { const s = alvos.sort((a, b) => M.controle(b)[0] - M.controle(a)[0])[0]; const def = S.unidades.filter(x => x.s === s && inimigos(2, x.f)).reduce((a, x) => a + x.forca, 0) + S.e[s].guarn * 0.6; if (u.forca > def * 0.7) combate([u], s, {}, ctx); }
    }
    L.coord = false;
  }

  // ---------------- Comando de Defesa Nacional (paramilitar de extrema direita) ----------------
  function turnoComando(ctx) {
    const Cm = S.cdn;
    if (!Cm.ativa) {
      if (S.rec.visib >= 45 || parcelaArea(1) > 0.02 || (S.insurreicao && S.turno > 3)) {
        Cm.ativa = true; Cm.reserva = 1500;
        const alvos = ST.map((s, i) => i).filter(i => M.controle(i)[0] > 0.7).sort((a, b) => ameacaEstado(b) - ameacaEstado(a)).slice(0, 2);
        alvos.forEach((s, k) => criarUnidade(3, 'paramilitar', 1800 + k * 400, s, k ? 'Legião Nacionalista' : 'Comando de Caça', { equip: 0.85, moral: 70 }));
        log('Surge o Comando de Defesa Nacional: grupos paramilitares caçam militantes com a vista grossa do governo.', 3, alvos[0], 'guerra');
      }
      return;
    }
    Cm.reserva += S.gov.legit > 35 ? 350 : 150;
    const us = S.unidades.filter(u => u.f === 3);
    if (us.length < 3 && Cm.reserva > 1800) { const s = ST.map((x, i) => i).filter(i => M.controle(i)[0] > 0.7).sort((a, b) => ameacaEstado(b) - ameacaEstado(a))[0]; if (s != null) { criarUnidade(3, 'paramilitar', 1800, s, 'Grupo Tático ' + (S.nid % 20), { equip: 0.8, moral: 65 }); Cm.reserva -= 1800; } }
    const atacadosCdn = new Set();
    for (const u of us) {
      if (!S.unidades.includes(u)) continue;
      const viz = [u.s, ...ST[u.s].viz.map(v => v.s)];
      const comb = viz.filter(s => M.controle(s)[1] > 0.03 && M.controle(s)[1] < 0.6);
      if (comb.length && rnd() < 0.5) { combate([u], comb[0], {}, ctx); continue; }
      const raid = viz.filter(s => S.e[s].nucleos > 0 && !atacadosCdn.has(s)).sort((a, b) => S.e[b].nucleos - S.e[a].nucleos)[0];
      if (raid != null && rnd() < 0.6) {
        atacadosCdn.add(raid);
        const e = S.e[raid]; const mortos = Math.round(15 + rnd() * 30 + S.rec.militantes * 0.005); S.rec.militantes -= mortos; if (rnd() < 0.5) e.nucleos = Math.max(0, e.nucleos - 1); e.apoio += 1.5; S.gov.legit -= 0.5;
        log(`Paramilitares do Comando atacam militantes em ${ST[raid].n}: ${mortos} mortos.`, 2, raid, 'perda');
        ctx.anims.push({ t: 'seta', f: 3, tipo: 'guerrilha', uids: [], de: [u.pos], origem: u.pos, para: ST[raid].anchor, flips: [], combate: { p: ST[raid].anchor, int: 1 }, s: raid });
        if (raid !== u.s && rnd() < 0.5 && M.controle(raid)[0] > 0.5) mover(u, raid, null);
      } else {
        const alvo = ST.map((s, i) => i).filter(i => S.e[i].nucleos > 0 && M.controle(i)[0] > 0.5).sort((a, b) => S.e[b].nucleos - S.e[a].nucleos)[0];
        const cam = alvo != null ? caminho(u.s, alvo, 0) : null; if (cam && cam.length > 1) mover(u, cam[1], ctx);
      }
    }
  }

  // ---------------- POU ----------------
  function turnoPOU() {
    const P = S.pou; if (!P.ativo) return;
    S.e.forEach((e, i) => { if (e.apoioPOU > 0) e.apoioPOU = clamp(e.apoioPOU + (S.gov.econ < 50 ? 0.2 : 0.05) - (e.apoio > e.apoioPOU ? 0.1 : 0), 0, 40); });
    P.rel = clamp(P.rel + (S.rec.legit > 50 ? 1 : 0) - (S.insurreicao ? 0.5 : 0) + (tem('frente_unica') ? 1 : 0), -100, 100);
  }

  // ---------------- suprimento, cerco e rendição ----------------
  function suprimento(ctx) {
    const fontes = {};
    [0, 1, 2, 3].forEach(f => {
      const base = new Uint8Array(NS); ST.forEach((s, i) => { const c = M.controle(i)[f]; base[i] = f === 1 ? (c >= 0.35 || (i === S.org.sede && c > 0)) : c >= 0.5; });
      fontes[f] = M.conectividade(f, i => base[M.cellState[i]]);
    });
    const rec = 30 * (tem('logistica') ? 1.5 : 1);
    S.unidades.forEach(u => {
      const ter = M.TERRENO[ST[u.s].ter]; let cel = M.cellAt(u.pos[0], u.pos[1]);
      if (cel < 0 || M.owner[cel] !== u.f) cel = M.celulaMaisProxima(u.s, u.f, u.pos);
      const conectado = cel >= 0 && fontes[u.f][cel] && Math.hypot(...[0, 1].map(k => M.cellXY(cel)[k] - u.pos[k])) < 40;
      let teto = 100 - S.e[u.s].dano * (u.f === 1 ? 0.3 : 1);
      if (u.f === 1 && !conectado) { const nuc = S.e[u.s].nucleos; teto = nuc >= 3 ? 60 : nuc >= 1 && u.tipo === 'guerrilha' ? 45 : tem('logistica') && nuc >= 1 ? 40 : 0; }
      if (u.f === 3 && !conectado) teto = M.controle(u.s)[0] > 0.3 ? 80 : 0;
      if (teto > 0 && (conectado || u.f !== 0)) { u.sup = clamp(u.sup + rec * ter.sup, 0, teto); u.isol = 0; if ((u.post === 'cercada' || u.post === 'isolada') && (conectado || teto >= 40)) u.post = 'normal'; }
      else {
        u.sup = Math.max(0, u.sup - 22); u.isol++;
        // cercada = presa num bolsão do próprio território, rodeada pelo inimigo; sem território é só 'sem suprimento'
        const bolsao = M.cont[u.s][u.f] > 0 && ST[u.s].viz.every(v => M.controle(v.s)[u.f] < 0.2);
        const cercado = u.f === 0 ? true : bolsao;
        if (u.f === 1 && !bolsao) { u.sup = Math.min(100, u.sup + 10); if (u.post !== 'fortificada' && u.post !== 'elastica') u.post = 'isolada'; }
        else if (cercado && u.isol >= 1) { if (u.post !== 'cercada') log(`${u.nome} (${fac(u.f).curto}) está cercada em ${ST[u.s].n}.`, u.f === 1 || u.f === 0 ? 3 : 2, u.s, u.f === 1 ? 'perda' : 'vitoria'); u.post = 'cercada'; }
      }
      if (u.sup < 35) { u.forca = Math.round(u.forca * 0.95); u.moral = Math.max(3, u.moral - 6); }
      // rendição de bolsões
      if (u.post === 'cercada' && u.sup <= 0 && u.moral < 28 && rnd() < 0.6) {
        if (u.f !== 1) { S.rec.armas += Math.round(u.forca * 0.45); S.rec.moral += 6; S.stats.rendicoes++; if (u.f === 0) { S.gov.legit -= 5; S.gov.estab -= 5; } log(`RENDIÇÃO: ${u.nome} se rende em ${ST[u.s].n}. ${Math.round(u.forca).toLocaleString('pt-BR')} prisioneiros e ${Math.round(u.forca * 0.45).toLocaleString('pt-BR')} armas capturadas.`, 3, u.s, 'vitoria'); }
        else { S.rec.moral -= 8; S.rec.coesao -= 4; log(`${u.nome} se rende após o cerco em ${ST[u.s].n}.`, 3, u.s, 'perda'); S.flags.perdidas = (S.flags.perdidas || 0) + 1; }
        ctx.anims.push({ t: 'politica', s: u.s, texto: `Rendição de ${u.nome}` });
        // o território do bolsão passa ao sitiante
        const sit = [0, 1, 2, 3].filter(g => inimigos(u.f, g)).sort((a, b) => M.cont[u.s][b] - M.cont[u.s][a])[0];
        if (sit != null) { const capt = M.planejarAvanco(u.s, sit, Math.round(M.cont[u.s][u.f] * 0.6), u.pos, u.pos, o => o === u.f); capt.forEach(i => M.setOwner(i, sit)); if (capt.length) ctx.anims.push({ t: 'flips', f: sit, flips: capt }); }
        remover(u);
      }
    });
  }

  // ---------------- economia e política ----------------
  function economia() {
    const R = S.rec, g = S.gov;
    // apoio
    S.e.forEach((e, i) => {
      const c = M.controle(i);
      let d = e.nucleos > 0 ? 0.12 * e.nucleos * (g.econ < 50 ? 1.4 : 1) * (1 - e.apoio / 90) : -0.25;
      if (e.gp) d += 1.2 * (tem('poder_popular') ? 1.5 : 1);
      if (c[1] > 0.5 && !e.gp) d += 0.3;
      if (g.concessao) d -= 0.25;
      d += (R.legit - 45) / 300;
      e.apoio = clamp(e.apoio + d, 0, 92); e.apoioLiga = clamp(e.apoioLiga, 0, 60);
      e.dano = Math.max(0, e.dano - 8);
    });
    if (g.concessao) g.concessao--;
    // recrutamento passivo e quadros
    let novos = 0; S.e.forEach((e, i) => { novos += simp(i) * 0.00008 * (e.nucleos > 0 ? 1 + e.nucleos * 0.08 : 0.15) * mod('recruta'); });
    novos *= DIFICULDADE[S.dif].rec * (0.6 + R.coesao / 200);
    R.militantes += Math.round(novos);
    R.quadros += Math.round(R.militantes * 0.0015 * (BASES_SOCIAIS[S.org.base]?.quadros || 1));
    // fundos
    const contrib = R.militantes * 0.012 + Math.min(150, R.militantes * 0.02);
    const imposto = ST.reduce((a, s, i) => a + M.controle(i)[1] * s.pib * 22 * (S.e[i].gp ? (tem('poder_popular') ? 2 : 1.4) : 0.6), 0);
    const intl = R.intl * 3 + (tem('internacionalismo') ? 40 : 0);
    const custo = combatentes(1) * 0.02 + R.quadros * 0.06;
    R.fundos = Math.round(R.fundos + contrib + imposto + intl - custo);
    // armas e recrutas dos governos populares
    S.e.forEach((e, i) => { if (e.gp) { const k = tem('poder_popular') ? 2 : 1; R.armas += Math.round(ST[i].pib * 6 * k + 20); R.militantes += Math.round(simp(i) * 0.0002 * k); } });
    if (tem('internacionalismo')) R.intl += 0.6;
    // pontos de formação
    R.pf += 1 + R.quadros / 250;
    // coesão, moral, visibilidade, legitimidade
    R.coesao = clamp(R.coesao + (R.coesao < 70 ? 0.6 : 0) - (R.fundos < 0 ? 3 : 0) - (R.visib > 70 ? 0.5 : 0), 0, 100);
    R.moral = clamp(R.moral + (R.moral < 60 ? 0.8 : -0.3), 0, 100);
    R.visib = clamp(R.visib - 2.2 + (S.insurreicao ? 1 : 0), 0, 100);
    R.legit = clamp(R.legit + (45 - R.legit) * 0.02, 0, 100);
    R.intl = clamp(R.intl, 0, 100);
    if (R.fundos < 0) { R.moral -= 2; let des = 0; S.unidades.filter(u => u.f === 1).forEach(u => { const d = Math.round(u.forca * 0.05); u.forca -= d; des += d; u.moral = Math.max(5, u.moral - 4); }); R.fundos = Math.max(R.fundos, -400); log(`Caixa negativo: sem soldo nem comida, ${des} combatentes desertam.`, 2, null, 'perda'); }
    // governo
    const pp = parcelaPop(1) + parcelaPop(2) * 0.5;
    g.econ = clamp(g.econ + (68 - g.econ) * 0.05 - pp * 2.5 - (S.insurreicao ? 0.5 : 0), 5, 100);
    g.legit = clamp(g.legit + (55 - g.legit) * 0.04 + (g.econ - 60) * 0.03 - pp * 5 - (S.liga.ativa ? 0.3 : 0), 0, 100);
    const alvoEstab = g.legit * 0.6 + g.econ * 0.4 - pp * 80 - (S.liga.ativa ? 5 : 0) + (g.mobil > 50 ? 4 : 0);
    g.estab = clamp(g.estab + (alvoEstab - g.estab) * 0.15, 0, 100);
    R.militantes = Math.max(0, Math.round(R.militantes)); R.quadros = Math.max(0, Math.round(R.quadros)); R.armas = Math.max(0, Math.round(R.armas));
    // POU
    if (S.pou.ativo) S.e.forEach(e => { e.apoioPOU = clamp(e.apoioPOU, 0, 50); });
  }

  // ---------------- eventos ----------------
  const EVENTOS = [
    { id: 'prisao_dirigente', titulo: 'Dirigente preso', cond: () => S.e.reduce((a, e) => a + e.nucleos, 0) >= 3 && S.rec.visib > 20, texto: () => `A Polícia Federal prende um membro do comitê central da ${S.org.sigla}. A imprensa fala em "golpe decisivo".`,
      op: [{ t: 'Campanha pela libertação (−R$ 80 mil)', ef: () => { S.rec.fundos -= 80; S.rec.legit += 4; S.rec.visib += 5; return 'A campanha ganha as ruas e a legitimidade sobe.'; } }, { t: 'Manter silêncio e reorganizar', ef: () => { S.rec.moral -= 8; S.rec.coesao -= 4; S.rec.quadros = Math.round(S.rec.quadros * 0.95); return 'A organização se fecha; o moral cai.'; } }] },
    { id: 'infiltrado', titulo: 'Infiltrado descoberto', cond: () => S.rec.militantes > 400, texto: () => 'Um militante de confiança era agente da inteligência. Ele sabe nomes e endereços.',
      op: [{ t: 'Expulsar e trocar os aparelhos', ef: () => { S.rec.fundos -= 40; S.rec.coesao += 4; S.rec.visib -= 5; return 'Aparelhos trocados a tempo.'; } }, { t: 'Alimentá-lo com informação falsa', ef: () => { if (rnd() < 0.55) { S.gov.mobil -= 8; S.rec.visib -= 10; return 'O governo caiu na armadilha e deslocou tropas para o lugar errado.'; } S.rec.militantes -= 60; S.e.forEach(e => { if (e.nucleos > 2) e.nucleos--; }); return 'O agente percebeu. Vários núcleos caíram.'; } }] },
    { id: 'racha', titulo: 'Tendência interna', cond: () => S.rec.coesao < 58, texto: () => 'Uma tendência interna acusa a direção de desvio e exige um congresso extraordinário.',
      op: [{ t: 'Abrir o debate', ef: () => { S.rec.coesao += 10; S.rec.pf += 4; S.rec.fundos -= 50; return 'O debate cansa, mas une a organização.'; } }, { t: 'Expulsar a tendência', ef: () => { const p = Math.round(S.rec.militantes * 0.1); S.rec.militantes -= p; S.rec.coesao += 6; return `${p} militantes saem e fundam outro grupo.`; } }, { t: 'Ignorar', ef: () => { S.rec.coesao -= 10; return 'A tensão cresce em silêncio.'; } }] },
    { id: 'crise', titulo: 'Crise econômica', cond: () => S.gov.econ < 70, texto: () => 'O desemprego dispara e a inflação dos alimentos chega a dois dígitos.',
      op: [{ t: 'Campanha contra a carestia', ef: () => { S.gov.econ -= 8; S.e.forEach(e => { if (e.nucleos) e.apoio += 2; }); S.rec.visib += 2; return 'Apoio cresce onde há núcleos.'; } }, { t: 'Distribuir alimentos (−R$ 120 mil)', ef: () => { S.rec.fundos -= 120; S.rec.legit += 5; S.e.forEach(e => { e.apoio += 1; }); return 'Cozinhas solidárias ganham o povo.'; } }] },
    { id: 'escandalo', titulo: 'Escândalo no governo', cond: () => true, texto: () => 'Gravações mostram ministros negociando propina com empreiteiras.',
      op: [{ t: 'Explorar o escândalo', ef: () => { S.gov.legit -= 7; S.rec.legit += 2; return 'A legitimidade do governo despenca.'; } }] },
    { id: 'massacre', titulo: 'Chacina policial', cond: () => true, texto: () => `Uma operação policial deixa dezenas de mortos numa favela de ${['Rio de Janeiro', 'Salvador', 'São Paulo', 'Fortaleza'][Math.floor(rnd() * 4)]}.`,
      op: [{ t: 'Convocar protestos', ef: () => { [M.byId.RJ, M.byId.BA, M.byId.SP, M.byId.CE].forEach(s => { S.e[s].apoio += 3; }); S.rec.visib += 4; S.gov.legit -= 3; return 'Protestos tomam as periferias.'; } }, { t: 'Denunciar na ONU', ef: () => { S.rec.intl += 6; S.gov.legit -= 2; return 'O caso repercute no exterior.'; } }] },
    { id: 'doacao', titulo: 'Solidariedade internacional', cond: () => S.rec.intl >= 15, texto: () => 'Movimentos estrangeiros oferecem ajuda.',
      op: [{ t: 'Pedir dinheiro', ef: () => { const n = 150 + S.rec.intl * 8; S.rec.fundos += n; return `+${fmtF(n)}`; } }, { t: 'Pedir armas', ef: () => { const n = 300 + S.rec.intl * 20; S.rec.armas += n; S.rec.visib += 4; return `+${n} armas chegam pelo litoral.`; } }] },
    { id: 'caminhoneiros', titulo: 'Greve dos caminhoneiros', cond: () => true, texto: () => 'Caminhoneiros bloqueiam rodovias em 20 estados contra o preço do diesel.',
      op: [{ t: 'Apoiar os bloqueios', ef: () => { S.gov.econ -= 7; S.rec.visib += 3; S.e.forEach(e => { if (e.sindical) e.apoio += 1.5; }); return 'Abastecimento das tropas do governo prejudicado.'; } }, { t: 'Manter distância', ef: () => { S.gov.econ -= 4; return 'A greve passa sem a organização.'; } }] },
    { id: 'igreja', titulo: 'Igreja e movimentos', cond: () => true, texto: () => (S.insurreicao ? 'Bispos pedem cessar-fogo e criticam os dois lados.' : 'Setores progressistas da Igreja apoiam as lutas por terra e moradia.'),
      op: [{ t: 'Aproximar-se', ef: () => { S.rec.legit += S.insurreicao ? 2 : 5; S.e.forEach(e => { if (M.TERRENO[ST[S.e.indexOf(e)].ter].rural) e.apoio += 1; }); return 'Comunidades de base se aproximam.'; } }, { t: 'Recusar', ef: () => { S.rec.coesao += 3; return 'A organização mantém distância.'; } }] },
    { id: 'imprensa', titulo: '"Terroristas", diz a TV', cond: () => S.armado, texto: () => `Os grandes jornais chamam a ${S.org.sigla} de grupo terrorista.`,
      op: [{ t: 'Responder pela rádio (−R$ 60 mil)', ef: () => { S.rec.fundos -= 60; S.rec.legit += 2; return 'A versão da organização chega ao povo.'; } }, { t: 'Ignorar', ef: () => { S.rec.legit -= 5; return 'A narrativa do governo se impõe.'; } }] },
    { id: 'desercao', titulo: 'Deserção em massa', cond: () => S.insurreicao && S.e.reduce((a, e) => a + e.infiltr, 0) >= 4, texto: () => 'Soldados infiltrados lideram um motim num batalhão do exército.',
      op: [{ t: 'Receber os desertores', ef: () => { const g = S.unidades.filter(u => u.f === 0).sort((a, b) => b.forca - a.forca)[0]; if (!g) return 'Sem efeito.'; const n = Math.round(g.forca * 0.15); g.forca -= n; S.rec.militantes += n; S.rec.armas += n; return `${n} soldados passam para a revolução com suas armas.`; } }] },
    { id: 'seca', titulo: 'Seca no Nordeste', cond: () => true, texto: () => 'A pior seca em décadas castiga o sertão.',
      op: [{ t: 'Brigadas de solidariedade (−R$ 100 mil)', ef: () => { S.rec.fundos -= 100; ['PI', 'CE', 'PE', 'BA', 'PB', 'RN', 'AL', 'SE'].forEach(uf => { S.e[M.byId[uf]].apoio += 3; }); S.rec.legit += 3; return 'O sertão não esquece quem ajudou.'; } }, { t: 'Culpar o governo', ef: () => { ['PI', 'CE', 'PE', 'BA'].forEach(uf => { S.e[M.byId[uf]].apoio += 1.2; }); S.gov.legit -= 2; return 'A culpa recai sobre Brasília.'; } }] },
    { id: 'anistia', titulo: 'Proposta de anistia', cond: () => S.gov.legit < 38 && parcelaPop(1) > 0.08 && !S.flags.anistia, texto: () => 'O governo oferece anistia e eleições antecipadas em troca do desarmamento.',
      op: [{ t: 'Aceitar e encerrar a guerra', ef: () => { S.fim = { tipo: 'paz' }; return 'A guerra termina num acordo.'; } }, { t: 'Recusar', ef: () => { S.flags.anistia = true; S.rec.moral += 5; S.rec.legit -= 2; return 'A luta continua.'; } }] },
    { id: 'professor', titulo: 'Intelectuais aderem', cond: () => true, texto: () => 'Professores e escritores conhecidos assinam manifesto de apoio.',
      op: [{ t: 'Integrar à formação', ef: () => { S.rec.quadros += 40; S.rec.pf += 6; return '+40 quadros.'; } }, { t: 'Usar na propaganda', ef: () => { S.rec.legit += 5; return 'Legitimidade +5.'; } }] },
    { id: 'viral', titulo: 'Vídeo viraliza', cond: () => true, texto: () => 'Um vídeo da organização passa de 20 milhões de visualizações.',
      op: [{ t: 'Aproveitar a onda', ef: () => { S.e.forEach(e => { if (e.nucleos) e.apoio += 1.5; }); S.rec.visib += 4; return 'Apoio cresce onde há núcleos.'; } }] },
    { id: 'glo', titulo: 'Operação de garantia da lei e da ordem', cond: () => S.armado, texto: () => 'O presidente decreta GLO no estado mais rebelde.',
      op: [{ t: 'Recuar os núcleos', ef: () => { const s = ST.map((x, i) => i).sort((a, b) => ameacaEstado(b) - ameacaEstado(a))[0]; S.e[s].repressao += 20; S.rec.visib -= 6; return `Repressão máxima em ${ST[s].n}.`; } }, { t: 'Resistir', ef: () => { const s = ST.map((x, i) => i).sort((a, b) => ameacaEstado(b) - ameacaEstado(a))[0]; S.e[s].repressao += 30; S.e[s].apoio += 3; S.rec.militantes -= 50; return `Confrontos em ${ST[s].n}.`; } }] },
    { id: 'desastre', titulo: 'Barragem se rompe', cond: () => true, texto: () => 'Uma barragem de mineração se rompe e soterra vilarejos em Minas Gerais.',
      op: [{ t: 'Mobilizar os atingidos', ef: () => { S.e[M.byId.MG].apoio += 4; S.gov.legit -= 3; return 'Minas se levanta contra as mineradoras.'; } }] },
    { id: 'estrangeiro', titulo: 'Pressão estrangeira', cond: () => S.insurreicao, texto: () => 'Potências estrangeiras enviam armas e assessores ao governo.',
      op: [{ t: 'Denunciar a intervenção', ef: () => { S.gov.reserva += 6000; S.rec.legit += 4; S.rec.intl += 4; return 'O nacionalismo vira contra o governo.'; } }, { t: 'Buscar apoio de outro bloco', ef: () => { S.gov.reserva += 6000; S.rec.armas += 1200; S.rec.legit -= 3; return 'Chegam armas, mas a acusação de "agentes estrangeiros" pega.'; } }] },
    { id: 'chacina_cdn', titulo: 'Chacina paramilitar', cond: () => S.cdn.ativa, texto: () => 'Paramilitares do Comando executam lideranças comunitárias.',
      op: [{ t: 'Retaliar', ef: () => { const u = S.unidades.find(x => x.f === 3); if (u) u.forca = Math.round(u.forca * 0.8); S.rec.visib += 5; return 'Ataque às bases do Comando.'; } }, { t: 'Transformar em denúncia', ef: () => { S.rec.legit += 4; S.gov.legit -= 3; return 'O governo é cobrado pela omissão.'; } }] }
  ];
  function eventosDoMes() {
    // eleições em outubro de anos pares
    if (mesAtual() === 9 && anoAtual() % 2 === 0) eleicao();
    if (S.fim) return;
    if (rnd() < 0.42) {
      const cands = EVENTOS.filter(e => e.cond() && !(S.flags['ev_' + e.id] > S.turno - 6));
      if (cands.length) { const e = cands[Math.floor(rnd() * cands.length)]; S.flags['ev_' + e.id] = S.turno; S.eventos.push({ id: e.id, titulo: e.titulo, texto: e.texto() }); }
    }
  }
  function resolverEvento(i, op) {
    const ev = S.eventos[i]; if (!ev) return '';
    let r;
    if (ev.ia) { r = aplicarEfeitosIA(ev.opcoes[op]); }
    else if (ev.especial) r = ESPECIAIS[ev.especial](op);
    else { const def = EVENTOS.find(e => e.id === ev.id); r = def.op[op].ef(); }
    S.eventos.splice(i, 1); log(`${ev.titulo}: ${r}`, 2, null, 'info'); normalizar(); verificarFim(); return r;
  }
  function opcoesEvento(ev) { if (ev.ia) return ev.opcoes.map(o => o.texto); if (ev.especial) return ESPECIAIS_OP[ev.especial]; return EVENTOS.find(e => e.id === ev.id).op.map(o => o.t); }
  function aplicarEfeitosIA(o) {
    const ef = o.efeitos || {}; const lim = (v, m) => clamp(+v || 0, -m, m);
    S.rec.militantes += Math.round(lim(ef.militantes, 1500)); S.rec.fundos += Math.round(lim(ef.fundos, 400)); S.rec.armas += Math.round(lim(ef.armas, 1000));
    S.rec.legit += lim(ef.legitimidade, 8); S.rec.coesao += lim(ef.coesao, 10); S.rec.moral += lim(ef.moral, 10); S.rec.visib += lim(ef.visibilidade, 15); S.rec.intl += lim(ef.apoio_internacional, 8);
    S.gov.legit += lim(ef.gov_legitimidade, 8); S.gov.estab += lim(ef.gov_estabilidade, 8); S.gov.econ += lim(ef.gov_economia, 8);
    if (ef.apoio_uf && typeof ef.apoio_uf === 'object') Object.entries(ef.apoio_uf).slice(0, 6).forEach(([uf, v]) => { const s = M.byId[String(uf).toUpperCase()]; if (s != null) S.e[s].apoio += lim(v, 6); });
    return o.resultado || 'Feito.';
  }
  // eleições e golpe
  const ESPECIAIS_OP = { eleicao_vitoria: ['Tomar posse e convocar o povo a defender o governo', 'Tomar posse e negociar com os militares'], golpe: ['Resistir: chamar o povo às armas', 'Partir para o exílio'] };
  const ESPECIAIS = {
    eleicao_vitoria: op => { if (op === 0) { S.flags.mobilizar = true; } return golpeOuPosse(op); },
    golpe: op => { if (op === 1) { S.fim = { tipo: 'exilio' }; return 'A direção parte para o exílio.'; } guerraCivilPosGolpe(); return 'O povo vai às ruas contra o golpe.'; }
  };
  function eleicao() {
    const geral = anoAtual() % 4 === 2;
    const voto = clamp(apoioNacional() * 1.1 + S.rec.legit * 0.25 + S.e.reduce((a, e) => a + e.campanha, 0) * 0.4 - 6, 0, 75);
    S.e.forEach(e => { e.campanha = 0; });
    if (!S.legal) { log(`Eleições ${geral ? 'gerais' : 'municipais'} de ${anoAtual()}: a ${S.org.sigla} está fora da disputa legal.`, 1); S.gov.legit += geral ? 3 : 1; return; }
    if (!geral) { const n = ST.filter((s, i) => S.e[i].apoio > 25).length; S.rec.fundos += 80 + n * 40; S.e.forEach(e => { if (e.apoio > 25) e.nucleos = Math.min(10, e.nucleos + 1); }); log(`Eleições municipais: a ${S.org.sigla} conquista prefeituras e câmaras em ${n} estados (${r1(voto)}% dos votos).`, 3, null, 'vitoria'); return; }
    if (voto >= 50) { S.eventos.push({ id: 'eleicao_vitoria', especial: 'eleicao_vitoria', titulo: 'Vitória nas urnas', texto: `A ${S.org.sigla} vence a eleição presidencial com ${r1(voto)}% dos votos válidos. Os quartéis estão em silêncio.` }); }
    else { S.rec.legit += 3; S.rec.fundos += 200; log(`Eleição presidencial: ${r1(voto)}% para a ${S.org.sigla}. Derrota, mas a bancada cresce.`, 3, null, 'info'); }
  }
  function golpeOuPosse(op) {
    const lealdade = 0.55 - S.e.reduce((a, e) => a + e.infiltr, 0) * 0.03 + (op === 1 ? -0.15 : 0.05);
    if (rnd() < lealdade) { S.eventos.push({ id: 'golpe', especial: 'golpe', titulo: 'Golpe militar', texto: 'Tanques nas ruas de Brasília. Os militares depõem o governo eleito antes da posse.' }); return 'Os militares se movem.'; }
    S.fim = { tipo: 'eleitoral' }; return 'A posse acontece. O governo popular assume.';
  }
  function guerraCivilPosGolpe() {
    S.legal = false; S.insurreicao = true; S.armado = true; S.rec.legit += 20; S.gov.legit -= 25; S.gov.estab -= 15;
    ST.forEach((s, i) => { if (S.e[i].apoio >= 38) { const capt = M.planejarAvanco(i, 1, Math.round(s.area * clamp((S.e[i].apoio - 30) / 60, 0.15, 0.7)), s.anchor, s.anchor, o => o === 0); capt.forEach(c => M.setOwner(c, 1)); criarUnidade(1, 'milicia', Math.round(simp(i) * 0.0015 + 500), i, 'Resistência de ' + s.cap, { equip: 0.5, moral: 90 }); } });
    log('Guerra civil: estados com maioria popular resistem ao golpe.', 3, null, 'guerra');
  }

  // ---------------- teses ----------------
  function podeTese(id) { const t = TESES[id]; if (!t) return 'Desconhecida.'; if (S.teses[id]) return 'Já adotada.'; const falta = t.req.filter(r => !S.teses[r]); if (falta.length) return 'Exige: ' + falta.map(r => TESES[r].nome).join(', '); if (S.rec.pf < t.custo) return `Precisa de ${t.custo} pontos de formação.`; return null; }
  function adotarTese(id) { const r = podeTese(id); if (r) return r; S.rec.pf -= TESES[id].custo; S.teses[id] = true; log(`A ${S.org.sigla} adota a tese "${TESES[id].nome}".`, 2, null, 'org'); return null; }

  // ---------------- diplomacia ----------------
  const DIPLO = {
    liga_tregua: { fac: 2, nome: 'Propor trégua à Liga', desc: 'Pacto de não agressão: vocês não se atacam.', req: () => !S.liga.ativa ? 'A Liga ainda não pegou em armas.' : S.liga.tregua ? 'Já há trégua.' : null, ef: () => { if (S.liga.rel > -20 && rnd() < 0.5 + S.liga.rel / 100) { S.liga.tregua = true; S.liga.rel += 20; S.pou.rel -= 8; return 'A Liga aceita a trégua.'; } S.liga.rel += 8; return 'A Liga recusa, mas as relações melhoram.'; } },
    liga_coord: { fac: 2, nome: 'Coordenar ofensiva com a Liga', desc: 'A Liga ataca o governo no próximo mês com tudo.', req: () => !S.liga.tregua ? 'Exige trégua com a Liga.' : null, ef: () => { S.liga.coord = true; S.rec.legit -= 2; return 'A Liga lançará uma ofensiva.'; } },
    liga_romper: { fac: 2, nome: 'Romper a trégua', desc: 'Volta a tratar a Liga como inimiga.', req: () => !S.liga.tregua ? 'Não há trégua.' : null, ef: () => { S.liga.tregua = false; S.liga.rel -= 40; S.pou.rel += 5; return 'Trégua rompida.'; } },
    pou_aprox: { fac: 4, nome: 'Aproximar-se do POU (R$ 50 mil)', desc: 'Reuniões e ações conjuntas.', req: () => !S.pou.ativo ? 'O POU não existe mais.' : S.rec.fundos < 50 ? 'Fundos insuficientes.' : null, ef: () => { S.rec.fundos -= 50; S.pou.rel += 10 + (tem('frente_unica') ? 6 : 0); return 'As relações melhoram.'; } },
    pou_fusao: { fac: 4, nome: 'Propor frente única ao POU', desc: 'Fusão: o POU traz militantes e apoio, mas a coesão cai.', req: () => !S.pou.ativo ? 'O POU não existe mais.' : S.pou.rel < (tem('frente_unica') ? 35 : 55) ? `Relação precisa ser ${tem('frente_unica') ? 35 : 55}.` : null,
      ef: () => { let mil = 0; S.e.forEach((e, i) => { mil += ST[i].pop * 1e6 * e.apoioPOU / 100 * 0.0003; e.apoio += e.apoioPOU * 0.6; e.apoioPOU = 0; if (e.apoio > 10 && !e.nucleos) e.nucleos = 1; }); S.rec.militantes += Math.round(mil); S.rec.quadros += Math.round(mil * 0.06); S.rec.coesao -= 10; S.pou.ativo = false; S.pou.fundido = true; log(`O POU se funde à ${S.org.sigla}: ${Math.round(mil)} novos militantes.`, 3, null, 'vitoria'); return 'Frente única formada.'; } },
    pou_disputa: { fac: 4, nome: 'Disputar a base do POU', desc: 'Atrai os eleitores do POU, mas rompe pontes.', req: () => !S.pou.ativo ? 'O POU não existe mais.' : null, ef: () => { S.e.forEach(e => { const t = e.apoioPOU * 0.25; e.apoioPOU -= t; e.apoio += t * 0.7; }); S.pou.rel -= 20; return 'Parte da base do POU muda de lado.'; } },
    gov_negociar: { fac: 0, nome: 'Propor negociação de paz', desc: 'Acordo: fim da guerra com anistia, reformas e eleições. Termina o jogo se aceito.', req: () => !S.armado ? 'Não há guerra para negociar.' : null,
      ef: () => { const chance = clamp((parcelaPop(1) * 2 + (40 - S.gov.estab) / 60 + (40 - S.gov.legit) / 80), 0, 0.9); if (rnd() < chance) { S.fim = { tipo: 'paz' }; return 'O governo aceita negociar. A guerra acaba.'; } S.rec.legit += 2; return 'O governo recusa e exige rendição incondicional.'; } },
    cdn_denunciar: { fac: 3, nome: 'Denunciar o Comando', desc: 'Expõe a ligação dos paramilitares com o governo.', req: () => !S.cdn.ativa ? 'O Comando ainda não existe.' : null, ef: () => { S.gov.legit -= 2; S.rec.legit += 2; S.rec.intl += 2; return 'A denúncia repercute.'; } }
  };
  function podeDiplo(id) { const d = DIPLO[id]; if (paDisponivel() < 1) return 'Pontos de ação insuficientes.'; if (S.politicas.some(p => p.id === 'diplo_' + id)) return 'Já feita neste mês.'; return d.req ? d.req() : null; }
  function fazerDiplo(id) { const r = podeDiplo(id); if (r) return r; S.politicas.push({ id: 'diplo_' + id, pa: 1, f: 0, feito: true, texto: DIPLO[id].nome }); const t = DIPLO[id].ef(); log(`${DIPLO[id].nome}: ${t}`, 2, null, 'org'); verificarFim(); return { ok: true, texto: t }; }

  // ---------------- fim de jogo ----------------
  function verificarFim() {
    if (S.fim) return S.fim;
    const df = M.byId.DF; const pp = parcelaPop(1);
    if (M.controle(df)[1] >= 0.6 && pp >= 0.45) S.fim = { tipo: 'revolucao' };
    else if (S.gov.estab <= 3 && apoioNacional() >= 30 && pp > 0.15) S.fim = { tipo: 'colapso' };
    else if (S.rec.coesao <= 0) S.fim = { tipo: 'racha' };
    else if (S.rec.militantes < 30 && !S.unidades.some(u => u.f === 1)) S.fim = { tipo: 'derrota' };
    else if (S.turno >= 120) S.fim = { tipo: 'esgotamento' };
    return S.fim;
  }
  const FINAIS = {
    revolucao: { titulo: 'A revolução triunfa', vitoria: true, texto: () => `Com Brasília tomada e metade do povo em território liberado, o governo cai. A ${S.org.sigla} proclama um novo poder.` },
    colapso: { titulo: 'O regime desmorona', vitoria: true, texto: () => `Sem estabilidade, sem economia e sem povo, o governo se dissolve. A ${S.org.sigla} assume o vazio de poder.` },
    eleitoral: { titulo: 'Governo popular eleito', vitoria: true, texto: () => `A ${S.org.sigla} chega ao governo pelo voto e os quartéis não se movem. Começa outra luta: governar.` },
    paz: { titulo: 'Acordo de paz', vitoria: null, texto: () => `A guerra termina numa mesa de negociação. A ${S.org.sigla} sai com ${Math.round(parcelaPop(1) * 100)}% da população sob sua influência direta e a promessa de reformas.` },
    exilio: { titulo: 'Exílio', vitoria: false, texto: () => 'A direção parte para o exílio. A organização sobrevive no estrangeiro, à espera de outro tempo.' },
    racha: { titulo: 'A organização racha', vitoria: false, texto: () => `Sem coesão, a ${S.org.sigla} se parte em grupos rivais. A revolução morre de dentro para fora.` },
    derrota: { titulo: 'Derrota', vitoria: false, texto: () => `As últimas colunas caem e os militantes estão presos, mortos ou dispersos. A ${S.org.sigla} deixa de existir.` },
    esgotamento: { titulo: 'A luta se esgota', vitoria: false, texto: () => 'Dez anos de guerra sem decisão. O povo cansa e a revolução vira lembrança.' }
  };

  function normalizar() {
    const R = S.rec; ['moral', 'coesao', 'visib', 'legit', 'intl'].forEach(k => { R[k] = clamp(R[k], 0, 100); });
    R.militantes = Math.max(0, Math.round(R.militantes)); R.quadros = Math.max(0, Math.round(R.quadros)); R.armas = Math.max(0, Math.round(R.armas)); R.fundos = Math.round(R.fundos);
    S.gov.legit = clamp(S.gov.legit, 0, 100); S.gov.estab = clamp(S.gov.estab, 0, 100); S.gov.econ = clamp(S.gov.econ, 0, 100); S.gov.mobil = clamp(S.gov.mobil, 0, 100);
    S.e.forEach(e => { e.apoio = clamp(e.apoio, 0, 95); e.repressao = clamp(e.repressao, 0, 100); });
    S.unidades.forEach(u => { u.moral = clamp(u.moral, 1, 100); u.sup = clamp(u.sup, 0, 100); u.forca = Math.max(0, Math.round(u.forca)); });
  }

  // ---------------- salvamento ----------------
  function exportar() { return JSON.stringify({ ...S, territorio: M.exportar() }); }
  function importar(txt) { const o = typeof txt === 'string' ? JSON.parse(txt) : txt; if (!o || !o.org || !o.territorio) throw new Error('Arquivo de partida inválido.'); M.importar(o.territorio); delete o.territorio; S = o; return S; }

  // resumo compacto para a IA
  function resumo() {
    const top = ST.map((s, i) => ({ uf: s.id, apoio: Math.round(S.e[i].apoio), nuc: S.e[i].nucleos, ctrl: Math.round(M.controle(i)[1] * 100), rep: Math.round(S.e[i].repressao) })).filter(x => x.apoio > 8 || x.nuc || x.ctrl).sort((a, b) => b.ctrl - a.ctrl || b.apoio - a.apoio).slice(0, 10);
    return { data: dataTxt(), org: { nome: S.org.nome, sigla: S.org.sigla, tipo: S.org.tipo, vertente: S.org.vertente, doutrina: dout().nome, lema: S.org.lema }, insurreicao: S.insurreicao, legal: S.legal,
      rec: { militantes: S.rec.militantes, combatentes: combatentes(), fundos_mil: S.rec.fundos, armas: S.rec.armas, coesao: Math.round(S.rec.coesao), visibilidade: Math.round(S.rec.visib), legitimidade: Math.round(S.rec.legit) },
      governo: { legitimidade: Math.round(S.gov.legit), estabilidade: Math.round(S.gov.estab), economia: Math.round(S.gov.econ), mobilizacao: Math.round(S.gov.mobil), tropas: combatentes(0) },
      populacao_controlada_pct: Math.round(parcelaPop(1) * 100), apoio_nacional_pct: Math.round(apoioNacional()), estados: top };
  }

  window.Regras = {
    get S() { return S; }, FAC_BASE, TIPOS, TESES, DOUTRINAS, BASES_SOCIAIS, TAMANHOS, DIFICULDADE, POL, ORD, DIPLO, FINAIS, MESES,
    fac, tem, novoJogo, resolverTurno, podePolitica, programarPolitica, programarLivre, cancelarPolitica, paDisponivel, paTotal, fundosReservados,
    podeOrdem, darOrdem, cancelarOrdem, alvosValidos, pincas, podeFormar, custoFormar, formarUnidade, unidade, inimigos, eficacia,
    podeTese, adotarTese, podeDiplo, fazerDiplo, resolverEvento, opcoesEvento, verificarFim, normalizar, exportar, importar, resumo,
    apoioNacional, parcelaPop, parcelaArea, combatentes, simp, dataTxt, mesAtual, anoAtual, fmtF, clamp, ameacaEstado, aplicarEfeitosIA
  };
})();
