/* Motor compartilhado dos protótipos: grade de território, frentes, cenário de exemplo e câmera.
   Cada protótipo só muda a forma de desenhar; os dados e regras são os mesmos. */
(function () {
  const G = window.GEO;
  const CELL = 3.2;
  const GW = Math.ceil(G.vw / CELL), GH = Math.ceil(G.vh / CELL);
  const N = GW * GH;

  // ---------- projeção (mesma do pré-processamento) ----------
  const L0 = G.proj.L0 * Math.PI / 180, P0 = G.proj.P0 * Math.PI / 180;
  function P(lon, lat) {
    const l = lon * Math.PI / 180, p = lat * Math.PI / 180;
    const k = Math.sqrt(2 / (1 + Math.sin(P0) * Math.sin(p) + Math.cos(P0) * Math.cos(p) * Math.cos(l - L0)));
    const x = k * Math.cos(p) * Math.sin(l - L0);
    const y = -k * (Math.cos(P0) * Math.sin(p) - Math.sin(P0) * Math.cos(p) * Math.cos(l - L0));
    return [(x - G.proj.x0) * G.proj.S, (y - G.proj.y0) * G.proj.S];
  }

  // ---------- dados dos estados ----------
  const INFO = {
    AC: [0.83, 'Rio Branco', 'selva'], AL: [3.13, 'Maceió', 'caatinga'], AP: [0.73, 'Macapá', 'selva'], AM: [3.94, 'Manaus', 'selva'],
    BA: [14.14, 'Salvador', 'caatinga'], CE: [8.79, 'Fortaleza', 'caatinga'], DF: [2.82, 'Brasília', 'urbano'], ES: [3.83, 'Vitória', 'mata'],
    GO: [7.06, 'Goiânia', 'cerrado'], MA: [6.78, 'São Luís', 'cerrado'], MT: [3.66, 'Cuiabá', 'cerrado'], MS: [2.76, 'Campo Grande', 'cerrado'],
    MG: [20.54, 'Belo Horizonte', 'serra'], PA: [8.12, 'Belém', 'selva'], PB: [3.97, 'João Pessoa', 'caatinga'], PR: [11.44, 'Curitiba', 'mata'],
    PE: [9.06, 'Recife', 'caatinga'], PI: [3.27, 'Teresina', 'caatinga'], RJ: [16.05, 'Rio de Janeiro', 'urbano'], RN: [3.30, 'Natal', 'caatinga'],
    RS: [10.88, 'Porto Alegre', 'pampa'], RO: [1.58, 'Porto Velho', 'selva'], RR: [0.64, 'Boa Vista', 'selva'], SC: [7.61, 'Florianópolis', 'mata'],
    SP: [44.41, 'São Paulo', 'urbano'], SE: [2.21, 'Aracaju', 'caatinga'], TO: [1.51, 'Palmas', 'cerrado']
  };
  const TERRENO = {
    selva: 'Floresta amazônica · defesa +60% · guerrilha +50%', cerrado: 'Cerrado · defesa +10% · blindados livres',
    caatinga: 'Sertão · defesa +25% · suprimento −30%', serra: 'Serras · defesa +40% · mobilidade −30%',
    mata: 'Mata Atlântica · defesa +20%', pampa: 'Pampa · defesa −10% · ideal p/ blindados', urbano: 'Metrópole · defesa +30% · insurreição urbana'
  };

  const states = G.states.map((s, i) => ({ ...s, idx: i, path: new Path2D(s.d), pop: INFO[s.id][0], cap: INFO[s.id][1], ter: INFO[s.id][2], terTxt: TERRENO[INFO[s.id][2]] }));
  const brasil = new Path2D(); states.forEach(s => brasil.addPath(s.path));

  // ---------- grade ----------
  const cellState = new Int8Array(N).fill(-1);
  (function rasterize() {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 4;
    const ctx = cv.getContext('2d');
    const bbox = states.map(s => {
      const nums = s.d.match(/-?\d+\.?\d*/g).map(Number);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < nums.length; i += 2) { x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]); y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]); }
      return [x0, y0, x1, y1];
    });
    states.forEach(s => { s.bbox = bbox[s.idx]; });
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL;
      for (const s of states) {
        const b = s.bbox; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
        if (ctx.isPointInPath(s.path, x, y)) { cellState[gy * GW + gx] = s.idx; break; }
      }
    }
    // garante ao menos uma célula para estados minúsculos (DF)
    states.forEach(s => {
      let has = false; for (let i = 0; i < N; i++) if (cellState[i] === s.idx) { has = true; break; }
      if (!has) { const gx = Math.floor(s.lp[0] / CELL), gy = Math.floor(s.lp[1] / CELL); cellState[gy * GW + gx] = s.idx; }
    });
  })();

  // célula interna mais próxima para células fora do país (evita contorno falso no litoral)
  const nearIn = new Int32Array(N).fill(-1);
  (function () {
    const q = []; for (let i = 0; i < N; i++) if (cellState[i] >= 0) { nearIn[i] = i; q.push(i); }
    const dist = new Uint8Array(N); let h = 0;
    while (h < q.length) {
      const i = q[h++]; if (dist[i] >= 3) continue;
      const x = i % GW, y = (i / GW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const j = ny * GW + nx; if (nearIn[j] !== -1) continue; nearIn[j] = nearIn[i]; dist[j] = dist[i] + 1; q.push(j);
      }
    }
  })();

  // ---------- facções ----------
  const FAC = [
    { id: 0, sigla: 'GOV', nome: 'Governo Federal', curto: 'Governo' },
    { id: 1, sigla: 'UPR', nome: 'União Popular Revolucionária', curto: 'UPR' },
    { id: 2, sigla: 'LFS', nome: 'Liga Federalista do Sul', curto: 'Liga do Sul' }
  ];

  // ---------- cenário: território inicial ----------
  const owner = new Uint8Array(N);
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const s = t => t * t * (3 - 2 * t);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf); }
  function fbm(x, y) { return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15; }

  // [lon, lat, raio em graus, facção]
  const BLOBS = [
    [-48.6, -6.4, 2.6, 1], [-47.2, -8.6, 1.8, 1], [-45.0, -7.0, 1.7, 1], [-43.0, -7.6, 1.5, 1], [-40.6, -8.3, 1.9, 1], [-38.6, -8.8, 1.2, 1],
    [-55.3, -4.2, 1.0, 1], [-35.05, -8.1, 0.45, 1],
    [-53.6, -29.4, 1.9, 2], [-52.6, -27.6, 1.05, 2], [-55.3, -29.3, 1.2, 2]
  ];
  const POCKET = [-47.5, -5.55, 0.62]; // bolsão governista cercado (Imperatriz)

  function seedScenario() {
    const pb = BLOBS.map(b => { const p = P(b[0], b[1]); const r = (P(b[0] + b[2], b[1])[0] - p[0]); return { x: p[0], y: p[1], r, f: b[3] }; });
    const pp = P(POCKET[0], POCKET[1]); const pr = P(POCKET[0] + POCKET[2], POCKET[1])[0] - pp[0];
    for (let i = 0; i < N; i++) {
      if (cellState[i] < 0) { owner[i] = 255; continue; }
      const x = (i % GW + 0.5) * CELL, y = (((i / GW) | 0) + 0.5) * CELL;
      const n = fbm(x / 38, y / 38) - 0.5;
      let best = 0, bv = 0;
      for (const b of pb) { const d = Math.hypot(x - b.x, y - b.y) / b.r; const v = 1 - d + n * 0.7; if (v > 0 && v > bv) { bv = v; best = b.f; } }
      if (best === 1 && Math.hypot(x - pp[0], y - pp[1]) / pr + n * 0.5 < 1) best = 0;
      owner[i] = best;
    }
  }
  seedScenario();
  const owner0 = owner.slice();

  // ---------- unidades, setas, combates, suprimento ----------
  const LL = (lon, lat) => P(lon, lat);
  const UNIDADES = [
    { f: 1, tipo: 'guerrilha', nome: '1ª Coluna do Araguaia', forca: 2400, max: 3000, moral: 82, sup: 74, post: 'ataque', ll: [-48.9, -7.6] },
    { f: 1, tipo: 'motorizada', nome: 'Brigada Tocantins', forca: 3100, max: 3500, moral: 71, sup: 58, post: 'ataque', ll: [-46.9, -8.4] },
    { f: 1, tipo: 'infantaria', nome: 'Batalhão Sertanejo', forca: 1800, max: 2500, moral: 77, sup: 41, post: 'ataque', ll: [-40.7, -9.0] },
    { f: 1, tipo: 'artilharia', nome: 'Artilharia Popular', forca: 600, max: 800, moral: 68, sup: 66, post: 'apoio', ll: [-47.9, -6.2] },
    { f: 1, tipo: 'milicia', nome: 'Milícia Operária do Recife', forca: 1300, max: 1300, moral: 90, sup: 35, post: 'defesa', ll: [-35.15, -8.05] },
    { f: 1, tipo: 'guerrilha', nome: 'Destacamento Tapajós', forca: 450, max: 900, moral: 55, sup: 12, post: 'isolada', ll: [-55.3, -4.3] },
    { f: 0, tipo: 'infantaria', nome: '23ª Brigada (cercada)', forca: 2100, max: 4000, moral: 34, sup: 8, post: 'cercada', ll: [-47.5, -5.55] },
    { f: 0, tipo: 'blindada', nome: '8ª Divisão Blindada', forca: 7800, max: 8000, moral: 74, sup: 92, post: 'fortificada', ll: [-48.3, -11.4] },
    { f: 0, tipo: 'infantaria', nome: '6ª Divisão de Exército', forca: 6200, max: 7000, moral: 66, sup: 88, post: 'ataque', ll: [-39.2, -12.3] },
    { f: 0, tipo: 'aerotransportada', nome: 'Brigada Paraquedista', forca: 3000, max: 3000, moral: 85, sup: 95, post: 'reserva', ll: [-47.9, -15.8] },
    { f: 0, tipo: 'fuzileiros', nome: 'Fuzileiros Navais', forca: 2600, max: 2600, moral: 80, sup: 90, post: 'ataque', ll: [-34.95, -7.25] },
    { f: 0, tipo: 'infantaria', nome: '10ª Região Militar', forca: 4200, max: 5000, moral: 61, sup: 80, post: 'defesa', ll: [-38.6, -3.9] },
    { f: 0, tipo: 'motorizada', nome: 'Força-Tarefa Amazônia', forca: 3800, max: 4000, moral: 70, sup: 63, post: 'defesa', ll: [-54.7, -2.6] },
    { f: 2, tipo: 'milicia', nome: 'Milícia Gaúcha', forca: 2900, max: 3200, moral: 69, sup: 71, post: 'ataque', ll: [-53.2, -29.2] },
    { f: 2, tipo: 'infantaria', nome: 'Coluna Serrana', forca: 1700, max: 2000, moral: 60, sup: 64, post: 'defesa', ll: [-52.3, -27.5] }
  ].map((u, i) => ({ ...u, id: i, p: LL(u.ll[0], u.ll[1]) }));

  const SETAS = [
    { f: 1, tipo: 'pinca', nome: 'Pinça Norte — Op. Palmas', a: [-49.1, -7.9], via: [-49.6, -9.2], b: [-48.6, -10.25] },
    { f: 1, tipo: 'pinca', nome: 'Pinça Leste — Op. Palmas', a: [-46.6, -8.6], via: [-46.7, -9.8], b: [-47.9, -10.45] },
    { f: 1, tipo: 'ataque', nome: 'Ofensiva do São Francisco', a: [-40.6, -9.1], via: [-40.0, -10.2], b: [-39.4, -11.5] },
    { f: 1, tipo: 'ataque', nome: 'Assalto ao bolsão', a: [-48.3, -5.9], via: [-48.0, -5.5], b: [-47.65, -5.5] },
    { f: 0, tipo: 'contra', nome: 'Contraofensiva da 6ª DE', a: [-39.2, -12.2], via: [-38.4, -11.2], b: [-38.7, -9.7] },
    { f: 0, tipo: 'contra', nome: 'Desembarque dos Fuzileiros', a: [-34.4, -7.3], via: [-34.5, -7.9], b: [-34.95, -8.0] },
    { f: 2, tipo: 'ataque', nome: 'Marcha sobre Porto Alegre', a: [-52.9, -29.4], via: [-52.0, -30.2], b: [-51.35, -30.0] }
  ].map(s => ({ ...s, pa: LL(s.a[0], s.a[1]), pv: LL(s.via[0], s.via[1]), pb: LL(s.b[0], s.b[1]) }));

  const COMBATES = [
    { ll: [-48.7, -9.95], nome: 'Batalha de Miracema', int: 3 }, { ll: [-47.6, -5.55], nome: 'Cerco de Imperatriz', int: 3 },
    { ll: [-39.8, -10.3], nome: 'Combates em Juazeiro', int: 2 }, { ll: [-35.0, -8.05], nome: 'Levante do Recife', int: 2 },
    { ll: [-51.5, -29.9], nome: 'Frente de Porto Alegre', int: 1 }, { ll: [-55.0, -3.8], nome: 'Emboscada no Tapajós', int: 1 }
  ].map(c => ({ ...c, p: LL(c.ll[0], c.ll[1]) }));

  const SUPRIMENTO = [
    { f: 1, ok: true, nome: 'Rota do Araguaia', pts: [[-49.1, -5.4], [-48.9, -6.6], [-48.9, -7.6]] },
    { f: 1, ok: true, nome: 'Estrada Transamazônica', pts: [[-49.1, -5.4], [-47.6, -7.0], [-46.9, -8.4]] },
    { f: 1, ok: true, nome: 'Corredor do Sertão', pts: [[-44.6, -6.8], [-42.6, -7.6], [-40.7, -9.0]] },
    { f: 1, ok: false, nome: 'Rota do Tapajós (cortada)', pts: [[-49.1, -5.4], [-52.3, -4.6], [-55.3, -4.3]] }
  ].map(s => ({ ...s, p: s.pts.map(q => LL(q[0], q[1])) }));

  const FORTIFICACOES = [
    { f: 0, nome: 'Linha Tocantins', pts: [[-50.4, -11.0], [-49.3, -10.9], [-48.3, -11.0], [-47.2, -10.9], [-46.2, -11.2]] }
  ].map(s => ({ ...s, p: s.pts.map(q => LL(q[0], q[1])) }));

  const BASES = [{ f: 1, nome: 'QG Marabá', ll: [-49.1, -5.4] }, { f: 1, nome: 'Base de Floriano', ll: [-43.0, -6.8] }].map(b => ({ ...b, p: LL(b.ll[0], b.ll[1]) }));
  const TRAVESSIAS = [{ nome: 'Travessia do Tocantins', ll: [-48.25, -8.95] }, { nome: 'Ponte de Juazeiro', ll: [-40.5, -9.4] }].map(b => ({ ...b, p: LL(b.ll[0], b.ll[1]) }));

  // ---------- cidades (capitais reais + cidades estratégicas do cenário) ----------
  const RENOME = { 'Bogota': 'Bogotá', 'Panama City': 'Panamá', 'Asunción': 'Assunção', 'Montevideo': 'Montevidéu' };
  const CIDADES = G.cities.filter(c => (c.k === 'uf' || c.k === 'nac' || c.k === 'ext') && !['Timon', 'Guaira', 'Niterói'].includes(c.n))
    .map(c => ({ n: RENOME[c.n] || c.n, p: c.c, k: c.k, br: c.br, pop: c.pop }));
  [['Imperatriz', -47.49, -5.52], ['Marabá', -49.12, -5.37], ['Juazeiro', -40.5, -9.41], ['Santarém', -54.7, -2.44], ['Feira de Santana', -38.97, -12.27],
   ['Montes Claros', -43.86, -16.73], ['Uberlândia', -48.28, -18.92], ['Campina Grande', -35.88, -7.23], ['Pelotas', -52.34, -31.77], ['Santa Maria', -53.81, -29.68],
   ['Londrina', -51.16, -23.31], ['Ribeirão Preto', -47.81, -21.18], ['Campinas', -47.06, -22.9], ['Santos', -46.33, -23.96], ['Joinville', -48.85, -26.3],
   ['Araguaína', -48.2, -7.19], ['Floriano', -43.02, -6.77], ['Miracema', -48.39, -9.56], ['Barreiras', -45.0, -12.15], ['Altamira', -52.21, -3.2]]
    .forEach(([n, lon, lat]) => CIDADES.push({ n, p: P(lon, lat), k: 'est', br: 1, pop: 0 }));

  // ---------- consultas ----------
  function cellAt(mx, my) { const gx = Math.floor(mx / CELL), gy = Math.floor(my / CELL); if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return -1; return gy * GW + gx; }
  function stateAt(mx, my) { const i = cellAt(mx, my); if (i < 0 || cellState[i] < 0) return null; return states[cellState[i]]; }
  function controle(sIdx) {
    const c = [0, 0, 0]; let t = 0;
    for (let i = 0; i < N; i++) if (cellState[i] === sIdx) { c[owner[i]]++; t++; }
    return c.map(v => t ? v / t : 0);
  }
  function totais() {
    let pop = [0, 0, 0], area = [0, 0, 0], tot = 0;
    const per = states.map(s => controle(s.idx));
    states.forEach((s, k) => per[k].forEach((v, f) => { pop[f] += v * s.pop; }));
    for (let i = 0; i < N; i++) if (owner[i] !== 255) { area[owner[i]]++; tot++; }
    const tp = states.reduce((a, s) => a + s.pop, 0);
    return { pop: pop.map(v => v / tp), area: area.map(v => v / tot), popAbs: pop };
  }

  // ---------- máscaras e contornos ----------
  function maskCanvas(colors) {
    const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
    const ctx = cv.getContext('2d'); const img = ctx.createImageData(GW, GH); const d = img.data;
    for (let i = 0; i < N; i++) {
      let o = owner[i]; if (o === 255) { const j = nearIn[i]; o = j >= 0 ? owner[j] : 255; }
      const c = colors[o]; if (!c) continue;
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = c[3] == null ? 255 : c[3];
    }
    ctx.putImageData(img, 0, 0); return cv;
  }

  function field(f) {
    const a = new Float32Array(N);
    for (let i = 0; i < N; i++) { let o = owner[i]; if (o === 255) { const j = nearIn[i]; o = j >= 0 ? owner[j] : 255; } a[i] = o === f ? 1 : 0; }
    const b = new Float32Array(N);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const w = (dx && dy) ? 0.5 : 1; s += a[ny * GW + nx] * w; n += w; }
      b[y * GW + x] = s / n;
    }
    return b;
  }

  // marching squares -> lista de segmentos [x1,y1,x2,y2,...] em coordenadas do mapa
  function contour(f, iso = 0.5) {
    const v = field(f); const out = [];
    const px = x => (x + 0.5) * CELL;
    for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
      const a = v[y * GW + x], b = v[y * GW + x + 1], c = v[(y + 1) * GW + x + 1], d = v[(y + 1) * GW + x];
      let k = 0; if (a > iso) k |= 8; if (b > iso) k |= 4; if (c > iso) k |= 2; if (d > iso) k |= 1;
      if (k === 0 || k === 15) continue;
      const t = (p, q) => (iso - p) / (q - p);
      const T = [px(x + t(a, b)), px(y)], R = [px(x + 1), px(y + t(b, c))], B = [px(x + t(d, c)), px(y + 1)], L = [px(x), px(y + t(a, d))];
      const seg = (p, q) => out.push(p[0], p[1], q[0], q[1]);
      switch (k) {
        case 1: case 14: seg(L, B); break; case 2: case 13: seg(B, R); break; case 3: case 12: seg(L, R); break;
        case 4: case 11: seg(T, R); break; case 5: seg(L, T); seg(B, R); break; case 6: case 9: seg(T, B); break;
        case 7: case 8: seg(L, T); break; case 10: seg(T, R); seg(L, B); break;
      }
    }
    return out;
  }
  // encadeia segmentos em polilinhas (para desenhar linhas "à mão", com hachuras etc.)
  function chains(segs) {
    const key = (x, y) => Math.round(x * 10) + ',' + Math.round(y * 10);
    const map = new Map(); const n = segs.length / 4; const used = new Uint8Array(n);
    for (let i = 0; i < n; i++) for (const e of [0, 1]) { const k = key(segs[i * 4 + e * 2], segs[i * 4 + e * 2 + 1]); if (!map.has(k)) map.set(k, []); map.get(k).push(i); }
    const res = [];
    for (let i = 0; i < n; i++) {
      if (used[i]) continue; used[i] = 1;
      const line = [[segs[i * 4], segs[i * 4 + 1]], [segs[i * 4 + 2], segs[i * 4 + 3]]];
      for (const dir of [1, 0]) {
        let guard = 0;
        while (guard++ < 100000) {
          const end = dir ? line[line.length - 1] : line[0];
          const cand = (map.get(key(end[0], end[1])) || []).find(j => !used[j]); if (cand == null) break;
          used[cand] = 1;
          const p1 = [segs[cand * 4], segs[cand * 4 + 1]], p2 = [segs[cand * 4 + 2], segs[cand * 4 + 3]];
          const nxt = key(p1[0], p1[1]) === key(end[0], end[1]) ? p2 : p1;
          if (dir) line.push(nxt); else line.unshift(nxt);
        }
      }
      res.push(line);
    }
    return res;
  }
  function smoothChain(line, it = 2) {
    let l = line;
    for (let k = 0; k < it; k++) { const o = [l[0]]; for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(l[l.length - 1]); l = o; }
    return l;
  }

  // ---------- simulação de turno (para demonstrar o avanço das frentes) ----------
  let turno = 0;
  const datas = ['Março de 2028', 'Abril de 2028', 'Maio de 2028', 'Junho de 2028', 'Julho de 2028', 'Agosto de 2028', 'Setembro de 2028', 'Outubro de 2028'];
  function neighbors(i) { const x = i % GW, y = (i / GW) | 0; const r = []; if (x > 0) r.push(i - 1); if (x < GW - 1) r.push(i + 1); if (y > 0) r.push(i - GW); if (y < GH - 1) r.push(i + GW); return r; }
  function planTurn() {
    // cada seta empurra a frente na direção do alvo; retorna lista ordenada de [célula, novaFacção]
    const flips = []; const taken = new Uint8Array(N);
    const sim = owner.slice();
    for (const s of SETAS) {
      const quota = s.f === 1 ? (s.tipo === 'pinca' ? 150 : 110) : 60;
      for (let step = 0; step < quota; step++) {
        let best = -1, bs = -1e9;
        // candidatos: células inimigas vizinhas de células da facção, perto do eixo da seta
        const tx = s.pb[0], ty = s.pb[1];
        const cx0 = Math.floor(Math.min(s.pa[0], tx) / CELL) - 14, cx1 = Math.ceil(Math.max(s.pa[0], tx) / CELL) + 14;
        const cy0 = Math.floor(Math.min(s.pa[1], ty) / CELL) - 14, cy1 = Math.ceil(Math.max(s.pa[1], ty) / CELL) + 14;
        for (let gy = Math.max(0, cy0); gy < Math.min(GH, cy1); gy++) for (let gx = Math.max(0, cx0); gx < Math.min(GW, cx1); gx++) {
          const i = gy * GW + gx; if (sim[i] === 255 || sim[i] === s.f || taken[i]) continue;
          if (!neighbors(i).some(j => sim[j] === s.f)) continue;
          const x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL;
          const sc = -Math.hypot(x - tx, y - ty) + Math.random() * 14;
          if (sc > bs) { bs = sc; best = i; }
        }
        if (best < 0) break;
        sim[best] = s.f; taken[best] = 1; flips.push([best, s.f]);
      }
    }
    // bolsão cercado encolhe
    for (let i = 0; i < N; i++) if (sim[i] === 0 && cellState[i] >= 0) {
      const nb = neighbors(i); if (nb.every(j => sim[j] === 1 || sim[j] === 0) && nb.filter(j => sim[j] === 1).length >= 2 && Math.random() < 0.5) { const p = cellXY(i); const q = P(-47.5, -5.55); if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 30) { sim[i] = 1; flips.push([i, 1]); } }
    }
    return flips;
  }
  function cellXY(i) { return [(i % GW + 0.5) * CELL, (((i / GW) | 0) + 0.5) * CELL]; }
  function apply(flip) { owner[flip[0]] = flip[1]; }
  function nextTurn() { turno++; // avança setas e combates
    for (const s of SETAS) { const dx = s.pb[0] - s.pa[0], dy = s.pb[1] - s.pa[1]; const k = s.f === 1 ? 0.35 : 0.15; s.pa = [s.pa[0] + dx * k, s.pa[1] + dy * k]; s.pv = [s.pv[0] + dx * k, s.pv[1] + dy * k]; s.pb = [s.pb[0] + dx * k, s.pb[1] + dy * k]; }
    for (const u of UNIDADES) { const s = SETAS.find(a => a.f === u.f && Math.hypot(a.pa[0] - u.p[0], a.pa[1] - u.p[1]) < 60); if (s && u.post === 'ataque') { const dx = s.pb[0] - u.p[0], dy = s.pb[1] - u.p[1]; u.p = [u.p[0] + dx * 0.25, u.p[1] + dy * 0.25]; u.forca = Math.round(u.forca * (0.9 + Math.random() * 0.06)); } }
    for (const c of COMBATES) { const s = SETAS.reduce((m, a) => { const d = Math.hypot(a.pb[0] - c.p[0], a.pb[1] - c.p[1]); return d < m[0] ? [d, a] : m; }, [1e9, null])[1]; if (s) c.p = [c.p[0] * 0.6 + s.pb[0] * 0.4, c.p[1] * 0.6 + s.pb[1] * 0.4]; }
  }
  function reset() { owner.set(owner0); turno = 0; location.reload(); }

  // ---------- câmera (arrastar, zoom, pinça) ----------
  function camera(canvas, draw, opts = {}) {
    const cam = { k: 1, x: 0, y: 0, dpr: Math.min(2, window.devicePixelRatio || 1), w: 0, h: 0 };
    const pad = opts.pad || [20, 20, 20, 20]; // topo, direita, baixo, esquerda (px da tela)
    function fit() {
      const r = canvas.getBoundingClientRect(); cam.w = r.width; cam.h = r.height;
      canvas.width = Math.round(r.width * cam.dpr); canvas.height = Math.round(r.height * cam.dpr);
      const fw = (opts.focus || [0, 0, G.vw, G.vh]);
      // em telas estreitas os painéis viram gavetas: ignora as margens laterais grandes
      const pd = r.width < 900 ? [Math.min(pad[0], 70), 12, Math.min(pad[2], 80), 12] : pad;
      const aw = Math.max(80, r.width - pd[1] - pd[3]), ah = Math.max(80, r.height - pd[0] - pd[2]);
      const pad_ = pd;
      cam.k = Math.min(aw / (fw[2] - fw[0]), ah / (fw[3] - fw[1]));
      cam.x = pad_[3] + (aw - (fw[2] - fw[0]) * cam.k) / 2 - fw[0] * cam.k;
      cam.y = pad_[0] + (ah - (fw[3] - fw[1]) * cam.k) / 2 - fw[1] * cam.k;
      cam.k0 = cam.k;
    }
    function resize() { const k = cam.k, x = cam.x, y = cam.y, had = cam.w; fit(); if (had && opts.keepOnResize) { cam.k = k; cam.x = x; cam.y = y; } draw(); }
    window.addEventListener('resize', resize);
    let drag = null, pinch = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (drag && !pinch) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; cam.x = drag.cx + dx; cam.y = drag.cy + dy; draw(); }
      if (opts.onHover) { const r = canvas.getBoundingClientRect(); opts.onHover(toMap(e.clientX - r.left, e.clientY - r.top), e); }
    });
    canvas.addEventListener('pointerup', e => { if (drag && !drag.moved && opts.onClick) { const r = canvas.getBoundingClientRect(); opts.onClick(toMap(e.clientX - r.left, e.clientY - r.top), e); } drag = null; });
    canvas.addEventListener('pointerleave', () => { if (opts.onHover) opts.onHover(null); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) { const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), k: cam.k }; } }, { passive: true });
    canvas.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const [a, b] = e.touches; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); const r = canvas.getBoundingClientRect(); zoomAt((a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top, (pinch.k * d / pinch.d) / cam.k); } }, { passive: true });
    canvas.addEventListener('touchend', () => { pinch = null; });
    function zoomAt(sx, sy, f) { const nk = Math.max(cam.k0 * 0.7, Math.min(cam.k0 * 8, cam.k * f)); f = nk / cam.k; cam.x = sx - (sx - cam.x) * f; cam.y = sy - (sy - cam.y) * f; cam.k = nk; draw(); }
    function toMap(sx, sy) { return [(sx - cam.x) / cam.k, (sy - cam.y) / cam.k]; }
    function apply(ctx) { ctx.setTransform(cam.dpr * cam.k, 0, 0, cam.dpr * cam.k, cam.dpr * cam.x, cam.dpr * cam.y); }
    function screen(ctx) { ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); }
    function toScreen(p) { return [p[0] * cam.k + cam.x, p[1] * cam.k + cam.y]; }
    fit();
    cam.zoomAt = zoomAt; cam.toMap = toMap; cam.apply = apply; cam.screen = screen; cam.toScreen = toScreen; cam.fit = () => { fit(); draw(); };
    cam.zoomIn = () => zoomAt(cam.w / 2, cam.h / 2, 1.4); cam.zoomOut = () => zoomAt(cam.w / 2, cam.h / 2, 1 / 1.4);
    return cam;
  }

  // curva da seta (quadrática por um ponto de passagem)
  function arrowPath(s, t = 1) {
    const [a, v, b] = [s.pa, s.pv, s.pb];
    const cx = 2 * v[0] - (a[0] + b[0]) / 2, cy = 2 * v[1] - (a[1] + b[1]) / 2;
    const pts = []; const n = 40;
    for (let i = 0; i <= n * t; i++) { const u = i / n; pts.push([(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * cx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * cy + u * u * b[1]]); }
    return pts;
  }

  window.Cenario = {
    G, P, CELL, GW, GH, N, states, brasil, CIDADES, cellState, owner, FAC, UNIDADES, SETAS, COMBATES, SUPRIMENTO, FORTIFICACOES, BASES, TRAVESSIAS,
    cellAt, stateAt, controle, totais, maskCanvas, contour, chains, smoothChain, planTurn, apply, nextTurn, cellXY, camera, arrowPath, fbm, hash,
    get turno() { return turno; }, data: () => datas[Math.min(turno, datas.length - 1)], reset
  };
})();
