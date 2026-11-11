/* Mundo: geografia, grade de território, adjacência, rios, suprimento e câmera */
(function () {
  const G = window.GEO;
  const CELL = 3.2;
  const GW = Math.ceil(G.vw / CELL), GH = Math.ceil(G.vh / CELL), N = GW * GH;
  const NF = 5; // facções: 0 governo, 1 jogador, 2 Liga do Sul, 3 Comando Nacional, 4 POU (sem território)

  // ---------- projeção ----------
  const L0 = G.proj.L0 * Math.PI / 180, P0 = G.proj.P0 * Math.PI / 180;
  function P(lon, lat) {
    const l = lon * Math.PI / 180, p = lat * Math.PI / 180;
    const k = Math.sqrt(2 / (1 + Math.sin(P0) * Math.sin(p) + Math.cos(P0) * Math.cos(p) * Math.cos(l - L0)));
    const x = k * Math.cos(p) * Math.sin(l - L0);
    const y = -k * (Math.cos(P0) * Math.sin(p) - Math.sin(P0) * Math.cos(p) * Math.cos(l - L0));
    return [(x - G.proj.x0) * G.proj.S, (y - G.proj.y0) * G.proj.S];
  }

  // ---------- dados dos estados (Censo 2022, PIB em % do nacional) ----------
  const INFO = {
    AC: [0.83, 'Rio Branco', 'selva', 0.2, 'Norte'], AL: [3.13, 'Maceió', 'caatinga', 0.8, 'Nordeste'], AP: [0.73, 'Macapá', 'selva', 0.2, 'Norte'],
    AM: [3.94, 'Manaus', 'selva', 1.5, 'Norte'], BA: [14.14, 'Salvador', 'caatinga', 4.0, 'Nordeste'], CE: [8.79, 'Fortaleza', 'caatinga', 2.2, 'Nordeste'],
    DF: [2.82, 'Brasília', 'urbano', 3.6, 'Centro-Oeste'], ES: [3.83, 'Vitória', 'mata', 2.0, 'Sudeste'], GO: [7.06, 'Goiânia', 'cerrado', 2.9, 'Centro-Oeste'],
    MA: [6.78, 'São Luís', 'cerrado', 1.4, 'Nordeste'], MT: [3.66, 'Cuiabá', 'cerrado', 2.0, 'Centro-Oeste'], MS: [2.76, 'Campo Grande', 'cerrado', 1.6, 'Centro-Oeste'],
    MG: [20.54, 'Belo Horizonte', 'serra', 9.0, 'Sudeste'], PA: [8.12, 'Belém', 'selva', 2.5, 'Norte'], PB: [3.97, 'João Pessoa', 'caatinga', 0.9, 'Nordeste'],
    PR: [11.44, 'Curitiba', 'mata', 6.3, 'Sul'], PE: [9.06, 'Recife', 'caatinga', 2.6, 'Nordeste'], PI: [3.27, 'Teresina', 'caatinga', 0.7, 'Nordeste'],
    RJ: [16.05, 'Rio de Janeiro', 'urbano', 10.5, 'Sudeste'], RN: [3.30, 'Natal', 'caatinga', 0.9, 'Nordeste'], RS: [10.88, 'Porto Alegre', 'pampa', 6.3, 'Sul'],
    RO: [1.58, 'Porto Velho', 'selva', 0.6, 'Norte'], RR: [0.64, 'Boa Vista', 'selva', 0.2, 'Norte'], SC: [7.61, 'Florianópolis', 'mata', 4.6, 'Sul'],
    SP: [44.41, 'São Paulo', 'urbano', 30.2, 'Sudeste'], SE: [2.21, 'Aracaju', 'caatinga', 0.6, 'Nordeste'], TO: [1.51, 'Palmas', 'cerrado', 0.5, 'Norte']
  };
  const TERRENO = {
    selva: { nome: 'Floresta amazônica', def: 1.6, guer: 1.5, mov: 0.6, sup: 0.7, rural: 1 },
    cerrado: { nome: 'Cerrado', def: 1.1, guer: 1.15, mov: 1.2, sup: 1, rural: 1 },
    caatinga: { nome: 'Sertão e caatinga', def: 1.25, guer: 1.3, mov: 1, sup: 0.75, rural: 1 },
    serra: { nome: 'Serras e montanhas', def: 1.4, guer: 1.35, mov: 0.75, sup: 0.9, rural: 0.6 },
    mata: { nome: 'Mata Atlântica', def: 1.2, guer: 1.2, mov: 0.9, sup: 1, rural: 0.4 },
    pampa: { nome: 'Pampa', def: 0.9, guer: 0.85, mov: 1.3, sup: 1.1, rural: 1 },
    urbano: { nome: 'Metrópole', def: 1.3, guer: 0.8, mov: 0.9, sup: 1.2, rural: 0 }
  };
  // fronteiras entre estados marcadas por grandes rios (ataque através delas sofre penalidade)
  const RIOS = { 'PA-TO': 'Araguaia', 'MA-TO': 'Tocantins', 'GO-MT': 'Araguaia', 'MT-TO': 'Araguaia', 'MA-PA': 'Gurupi', 'BA-PE': 'São Francisco', 'AL-SE': 'São Francisco',
    'MA-PI': 'Parnaíba', 'MS-SP': 'Paraná', 'MS-PR': 'Paraná', 'PR-SP': 'Paranapanema', 'GO-MG': 'Paranaíba', 'GO-MS': 'Paranaíba', 'MG-SP': 'Grande', 'RS-SC': 'Uruguai', 'AP-PA': 'Jari' };

  const states = G.states.map((s, i) => {
    const f = INFO[s.id];
    return { idx: i, id: s.id, n: s.n, d: s.d, path: new Path2D(s.d), lp: s.lp, pop: f[0], cap: f[1], ter: f[2], pib: f[3], reg: f[4] };
  });
  const byId = {}; states.forEach(s => { byId[s.id] = s.idx; });
  const NS = states.length;
  const brasil = new Path2D(); states.forEach(s => brasil.addPath(s.path));
  const countryPaths = G.countries.map(c => ({ ...c, path: new Path2D(c.d) }));
  const land = new Path2D(); countryPaths.forEach(c => land.addPath(c.path)); land.addPath(brasil);

  // ---------- grade ----------
  const cellState = new Int8Array(N).fill(-1);
  (function rasterize() {
    const ctx = document.createElement('canvas').getContext('2d');
    states.forEach(s => {
      const nums = s.d.match(/-?\d+\.?\d*/g).map(Number); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < nums.length; i += 2) { x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]); y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]); }
      s.bbox = [x0, y0, x1, y1];
      for (let gy = Math.max(0, Math.floor(y0 / CELL)); gy <= Math.min(GH - 1, Math.ceil(y1 / CELL)); gy++)
        for (let gx = Math.max(0, Math.floor(x0 / CELL)); gx <= Math.min(GW - 1, Math.ceil(x1 / CELL)); gx++) {
          const i = gy * GW + gx; if (cellState[i] >= 0) continue;
          if (ctx.isPointInPath(s.path, (gx + 0.5) * CELL, (gy + 0.5) * CELL)) cellState[i] = s.idx;
        }
    });
    states.forEach(s => { let has = false; for (let i = 0; i < N; i++) if (cellState[i] === s.idx) { has = true; break; } if (!has) { const gx = Math.floor(s.lp[0] / CELL), gy = Math.floor(s.lp[1] / CELL); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cellState[(gy + dy) * GW + gx + dx] = s.idx; } });
  })();
  const stateCells = states.map(() => []);
  for (let i = 0; i < N; i++) if (cellState[i] >= 0) stateCells[cellState[i]].push(i);
  states.forEach(s => { s.cells = Int32Array.from(stateCells[s.idx]); s.area = s.cells.length; });

  function cellXY(i) { return [(i % GW + 0.5) * CELL, (((i / GW) | 0) + 0.5) * CELL]; }
  function cellAt(x, y) { const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL); if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return -1; return gy * GW + gx; }
  function stateAt(x, y) { const i = cellAt(x, y); if (i < 0) return null; const s = cellState[i]; return s >= 0 ? states[s] : null; }
  function nb4(i, out) { const x = i % GW; out.length = 0; if (x > 0) out.push(i - 1); if (x < GW - 1) out.push(i + 1); if (i >= GW) out.push(i - GW); if (i < N - GW) out.push(i + GW); return out; }

  // célula interna mais próxima (evita contorno falso na costa)
  const nearIn = new Int32Array(N).fill(-1);
  (function () { const q = [], dist = new Uint8Array(N); for (let i = 0; i < N; i++) if (cellState[i] >= 0) { nearIn[i] = i; q.push(i); } let h = 0; const tmp = [];
    while (h < q.length) { const i = q[h++]; if (dist[i] >= 3) continue; for (const j of nb4(i, tmp)) { if (nearIn[j] !== -1) continue; nearIn[j] = nearIn[i]; dist[j] = dist[i] + 1; q.push(j); } } })();

  // âncora de cada estado: célula mais distante da borda
  (function () {
    const dist = new Int32Array(N).fill(-1); const q = []; const tmp = [];
    for (let i = 0; i < N; i++) { if (cellState[i] < 0) continue; for (const j of nb4(i, tmp)) if (cellState[j] !== cellState[i]) { dist[i] = 0; q.push(i); break; } }
    let h = 0; while (h < q.length) { const i = q[h++]; for (const j of nb4(i, tmp)) if (cellState[j] === cellState[i] && dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } }
    states.forEach(s => { let best = s.cells[0], bd = -1; for (const i of s.cells) if (dist[i] > bd) { bd = dist[i]; best = i; } s.anchor = cellXY(best); s.raio = Math.max(1, bd) * CELL; });
    // âncoras ajustadas à mão onde a capital fica longe do centro geométrico e ajuda a leitura
  })();

  // ---------- adjacência ----------
  const adj = states.map(() => new Map());
  for (let i = 0; i < N; i++) {
    const a = cellState[i]; if (a < 0) continue; const x = i % GW;
    for (const j of [x < GW - 1 ? i + 1 : -1, i + GW < N ? i + GW : -1]) {
      if (j < 0) continue; const b = cellState[j]; if (b < 0 || b === a) continue;
      for (const [u, v, c] of [[a, b, i], [b, a, j]]) { const m = adj[u]; const e = m.get(v) || { n: 0, sx: 0, sy: 0 }; const p = cellXY(c); e.n++; e.sx += p[0]; e.sy += p[1]; m.set(v, e); }
    }
  }
  states.forEach(s => { s.viz = []; adj[s.idx].forEach((e, v) => { if (e.n >= 2) s.viz.push({ s: v, n: e.n, mid: [e.sx / e.n, e.sy / e.n] }); }); });
  function vizinhos(a, b) { return states[a].viz.some(v => v.s === b); }
  function fronteira(a, b) { const v = states[a].viz.find(v => v.s === b); return v ? v.mid : states[b].anchor; }
  function rio(a, b) { const k = [states[a].id, states[b].id].sort().join('-'); return RIOS[k] || null; }

  // ---------- território ----------
  const owner = new Uint8Array(N);
  const cont = states.map(() => new Int32Array(NF));
  function resetOwner() { for (let i = 0; i < N; i++) owner[i] = cellState[i] >= 0 ? 0 : 255; recount(); }
  function recount() { cont.forEach(c => c.fill(0)); for (let i = 0; i < N; i++) if (owner[i] !== 255) cont[cellState[i]][owner[i]]++; }
  function setOwner(i, f) { const o = owner[i]; if (o === f || o === 255) return; cont[cellState[i]][o]--; cont[cellState[i]][f]++; owner[i] = f; }
  function controle(s) { const c = cont[s], a = states[s].area; return [0, 1, 2, 3, 4].map(f => c[f] / a); }
  function centroide(s, f) { let sx = 0, sy = 0, n = 0; for (const i of states[s].cells) if (owner[i] === f) { const p = cellXY(i); sx += p[0]; sy += p[1]; n++; } return n ? [sx / n, sy / n] : null; }
  function celulaMaisProxima(s, f, pt) { let b = -1, bd = 1e18; for (const i of states[s].cells) { if (f != null && owner[i] !== f) continue; const p = cellXY(i); const d = (p[0] - pt[0]) ** 2 + (p[1] - pt[1]) ** 2; if (d < bd) { bd = d; b = i; } } return b; }

  // planeja a tomada de 'count' células do estado s pela facção f, avançando a partir da frente e na direção do alvo
  function planejarAvanco(s, f, count, alvo, origem, pode) {
    const st = states[s]; const res = []; if (count <= 0) return res;
    pode = pode || (o => o !== f);
    const tomada = new Uint8Array(N); const tmp = [];
    const front = new Set();
    for (const i of st.cells) { if (!pode(owner[i])) continue; for (const j of nb4(i, tmp)) if (owner[j] === f) { front.add(i); break; } }
    if (!front.size) { let b = -1, bd = 1e18; const o = origem || alvo; for (const i of st.cells) { if (!pode(owner[i])) continue; const p = cellXY(i); const d = (p[0] - o[0]) ** 2 + (p[1] - o[1]) ** 2; if (d < bd) { bd = d; b = i; } } if (b >= 0) front.add(b); }
    const tx = alvo[0], ty = alvo[1];
    while (res.length < count && front.size) {
      let best = -1, bs = -1e18;
      for (const i of front) { const p = cellXY(i); const sc = -Math.hypot(p[0] - tx, p[1] - ty) + hash(i, res.length) * 16; if (sc > bs) { bs = sc; best = i; } }
      front.delete(best); tomada[best] = 1; res.push(best);
      for (const j of nb4(best, tmp)) if (cellState[j] === s && pode(owner[j]) && !tomada[j]) front.add(j);
    }
    return res;
  }

  // ---------- suprimento: células conectadas a fontes pelo território da facção ----------
  function conectividade(f, fonte) {
    const vis = new Uint8Array(N); const q = []; const tmp = [];
    for (let i = 0; i < N; i++) if (owner[i] === f && fonte(i)) { vis[i] = 1; q.push(i); }
    let h = 0; while (h < q.length) { const i = q[h++]; for (const j of nb4(i, tmp)) if (!vis[j] && owner[j] === f) { vis[j] = 1; q.push(j); } }
    return vis;
  }

  // ---------- máscaras e contornos ----------
  function maskCanvas(colors, arr) {
    const owner_ = arr || owner;
    const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; const ctx = cv.getContext('2d'); const img = ctx.createImageData(GW, GH); const d = img.data;
    for (let i = 0; i < N; i++) { let o = owner_[i]; if (o === 255) { const j = nearIn[i]; o = j >= 0 ? owner_[j] : 255; } const c = colors[o]; if (!c) continue; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = c[3] == null ? 255 : c[3]; }
    ctx.putImageData(img, 0, 0); return cv;
  }
  function contour(f, arr, iso = 0.5) {
    const ow = arr || owner;
    const a = new Float32Array(N); for (let i = 0; i < N; i++) { let o = ow[i]; if (o === 255) { const j = nearIn[i]; o = j >= 0 ? ow[j] : 255; } a[i] = o === f ? 1 : 0; }
    const v = new Float32Array(N);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const w = (dx && dy) ? 0.5 : 1; s += a[ny * GW + nx] * w; n += w; } v[y * GW + x] = s / n; }
    const out = []; const px = x => (x + 0.5) * CELL;
    for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
      const A = v[y * GW + x], B = v[y * GW + x + 1], Cc = v[(y + 1) * GW + x + 1], D = v[(y + 1) * GW + x];
      let k = 0; if (A > iso) k |= 8; if (B > iso) k |= 4; if (Cc > iso) k |= 2; if (D > iso) k |= 1; if (k === 0 || k === 15) continue;
      const t = (p, q) => (iso - p) / (q - p);
      const T = [px(x + t(A, B)), px(y)], R = [px(x + 1), px(y + t(B, Cc))], Bo = [px(x + t(D, Cc)), px(y + 1)], L = [px(x), px(y + t(A, D))];
      const sg = (p, q) => out.push(p[0], p[1], q[0], q[1]);
      switch (k) { case 1: case 14: sg(L, Bo); break; case 2: case 13: sg(Bo, R); break; case 3: case 12: sg(L, R); break; case 4: case 11: sg(T, R); break; case 5: sg(L, T); sg(Bo, R); break; case 6: case 9: sg(T, Bo); break; case 7: case 8: sg(L, T); break; case 10: sg(T, R); sg(L, Bo); break; }
    }
    return out;
  }
  function chains(segs) {
    const key = (x, y) => Math.round(x * 10) + ',' + Math.round(y * 10); const map = new Map(); const n = segs.length / 4; const used = new Uint8Array(n);
    for (let i = 0; i < n; i++) for (const e of [0, 1]) { const k = key(segs[i * 4 + e * 2], segs[i * 4 + e * 2 + 1]); if (!map.has(k)) map.set(k, []); map.get(k).push(i); }
    const res = [];
    for (let i = 0; i < n; i++) {
      if (used[i]) continue; used[i] = 1; const line = [[segs[i * 4], segs[i * 4 + 1]], [segs[i * 4 + 2], segs[i * 4 + 3]]];
      for (const dir of [1, 0]) { let g = 0; while (g++ < 200000) { const end = dir ? line[line.length - 1] : line[0]; const c = (map.get(key(end[0], end[1])) || []).find(j => !used[j]); if (c == null) break; used[c] = 1; const p1 = [segs[c * 4], segs[c * 4 + 1]], p2 = [segs[c * 4 + 2], segs[c * 4 + 3]]; const nx = key(p1[0], p1[1]) === key(end[0], end[1]) ? p2 : p1; if (dir) line.push(nx); else line.unshift(nx); } }
      res.push(line);
    }
    return res;
  }
  function smoothChain(l, it = 2) { for (let k = 0; k < it; k++) { const o = [l[0]]; for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } o.push(l[l.length - 1]); l = o; } return l; }

  // ---------- ruído ----------
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const s = t => t * t * (3 - 2 * t); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf); }
  function fbm(x, y) { return vnoise(x, y) * .55 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .15; }

  // ---------- curva de seta ----------
  function curva(a, b, curv = 0.18, t = 1) {
    const dx = b[0] - a[0], dy = b[1] - a[1]; const cx = (a[0] + b[0]) / 2 - dy * curv, cy = (a[1] + b[1]) / 2 + dx * curv;
    const pts = []; const n = 36; const lim = Math.max(1, Math.round(n * t));
    for (let i = 0; i <= lim; i++) { const u = i / n; pts.push([(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * cx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * cy + u * u * b[1]]); }
    return pts;
  }

  // ---------- cidades ----------
  const RENOME = { 'Bogota': 'Bogotá', 'Panama City': 'Panamá', 'Asunción': 'Assunção', 'Montevideo': 'Montevidéu' };
  const CIDADES = G.cities.filter(c => (c.k === 'uf' || c.k === 'nac' || c.k === 'ext') && !['Timon', 'Guaira', 'Niterói'].includes(c.n)).map(c => ({ n: RENOME[c.n] || c.n, p: c.c, k: c.k, br: c.br }));
  [['Imperatriz', -47.49, -5.52], ['Marabá', -49.12, -5.37], ['Juazeiro', -40.5, -9.41], ['Santarém', -54.7, -2.44], ['Feira de Santana', -38.97, -12.27], ['Montes Claros', -43.86, -16.73],
   ['Uberlândia', -48.28, -18.92], ['Campina Grande', -35.88, -7.23], ['Pelotas', -52.34, -31.77], ['Santa Maria', -53.81, -29.68], ['Londrina', -51.16, -23.31], ['Ribeirão Preto', -47.81, -21.18],
   ['Campinas', -47.06, -22.9], ['Santos', -46.33, -23.96], ['Joinville', -48.85, -26.3], ['Araguaína', -48.2, -7.19], ['Floriano', -43.02, -6.77], ['Barreiras', -45.0, -12.15],
   ['Altamira', -52.21, -3.2], ['Caruaru', -35.97, -8.28], ['Vitória da Conquista', -40.84, -14.86], ['Rondonópolis', -54.64, -16.47], ['Dourados', -54.81, -22.22], ['Chapecó', -52.62, -27.1], ['Sobral', -40.35, -3.69]]
    .forEach(([n, lon, lat]) => CIDADES.push({ n, p: P(lon, lat), k: 'est', br: 1 }));

  // ---------- câmera ----------
  function camera(canvas, onChange, opts = {}) {
    const cam = { k: 1, x: 0, y: 0, dpr: Math.min(2, window.devicePixelRatio || 1), w: 0, h: 0, ver: 0 };
    const pad = opts.pad || [20, 20, 20, 20];
    function fit() {
      const r = canvas.getBoundingClientRect(); cam.w = r.width; cam.h = r.height;
      canvas.width = Math.max(1, Math.round(r.width * cam.dpr)); canvas.height = Math.max(1, Math.round(r.height * cam.dpr));
      const fw = opts.focus || [0, 0, G.vw, G.vh];
      const pd = r.width < 900 ? [Math.min(pad[0], 60), 10, Math.min(pad[2], 60), 10] : pad;
      const aw = Math.max(80, r.width - pd[1] - pd[3]), ah = Math.max(80, r.height - pd[0] - pd[2]);
      cam.k = Math.min(aw / (fw[2] - fw[0]), ah / (fw[3] - fw[1])); cam.k0 = cam.k;
      cam.x = pd[3] + (aw - (fw[2] - fw[0]) * cam.k) / 2 - fw[0] * cam.k; cam.y = pd[0] + (ah - (fw[3] - fw[1]) * cam.k) / 2 - fw[1] * cam.k;
      cam.ver++;
    }
    let lastW = 0, lastH = 0;
    function resize() { const r = canvas.getBoundingClientRect(); if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return; lastW = r.width; lastH = r.height; const keep = cam.w > 0, k = cam.k / cam.k0, cx = (cam.w / 2 - cam.x) / cam.k, cy = (cam.h / 2 - cam.y) / cam.k; fit(); if (keep) { cam.k = cam.k0 * k; cam.x = cam.w / 2 - cx * cam.k; cam.y = cam.h / 2 - cy * cam.k; } onChange(); }
    new ResizeObserver(resize).observe(canvas);
    let drag = null, pinch = null;
    canvas.addEventListener('pointerdown', e => { if (e.button === 2) return; drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, id: e.pointerId }; });
    canvas.addEventListener('pointermove', e => {
      if (drag && !pinch && drag.id === e.pointerId) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; canvas.setPointerCapture(e.pointerId); } if (drag.moved) { cam.x = drag.cx + dx; cam.y = drag.cy + dy; cam.ver++; onChange(); } }
      if (opts.onHover) { const r = canvas.getBoundingClientRect(); opts.onHover(toMap(e.clientX - r.left, e.clientY - r.top), e); }
    });
    canvas.addEventListener('pointerup', e => { if (drag && !drag.moved && !pinch && opts.onClick) { const r = canvas.getBoundingClientRect(); opts.onClick(toMap(e.clientX - r.left, e.clientY - r.top), e); } drag = null; });
    canvas.addEventListener('pointercancel', () => { drag = null; });
    canvas.addEventListener('pointerleave', () => { if (opts.onHover) opts.onHover(null); });
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (opts.onRight) opts.onRight(); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) { const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), k: cam.k }; drag = null; } }, { passive: true });
    canvas.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const [a, b] = e.touches; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); const r = canvas.getBoundingClientRect(); zoomAt((a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top, (pinch.k * d / pinch.d) / cam.k); } }, { passive: true });
    canvas.addEventListener('touchend', e => { if (e.touches.length < 2) setTimeout(() => { pinch = null; }, 50); });
    function zoomAt(sx, sy, f) { const nk = Math.max(cam.k0 * 0.7, Math.min(cam.k0 * 9, cam.k * f)); f = nk / cam.k; cam.x = sx - (sx - cam.x) * f; cam.y = sy - (sy - cam.y) * f; cam.k = nk; cam.ver++; onChange(); }
    function toMap(sx, sy) { return [(sx - cam.x) / cam.k, (sy - cam.y) / cam.k]; }
    cam.apply = ctx => ctx.setTransform(cam.dpr * cam.k, 0, 0, cam.dpr * cam.k, cam.dpr * cam.x, cam.dpr * cam.y);
    cam.screen = ctx => ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    cam.toScreen = p => [p[0] * cam.k + cam.x, p[1] * cam.k + cam.y];
    cam.toMap = toMap; cam.zoomAt = zoomAt;
    cam.fit = () => { fit(); onChange(); };
    cam.zoomIn = () => zoomAt(cam.w / 2, cam.h / 2, 1.4); cam.zoomOut = () => zoomAt(cam.w / 2, cam.h / 2, 1 / 1.4);
    cam.centrar = (p, k) => { if (k) { cam.k = Math.max(cam.k0 * 0.7, Math.min(cam.k0 * 9, k)); } cam.x = cam.w / 2 - p[0] * cam.k; cam.y = cam.h / 2 - p[1] * cam.k; cam.ver++; onChange(); };
    fit(); lastW = cam.w; lastH = cam.h;
    return cam;
  }

  // ---------- serialização do território ----------
  function exportar() { let s = '', run = 0, cur = owner[0]; for (let i = 0; i <= N; i++) { const v = i < N ? owner[i] : -1; if (v === cur && run < 4000) run++; else { s += cur.toString(36) + ':' + run.toString(36) + ','; cur = v; run = 1; } } return s; }
  function importar(str) { let i = 0; for (const part of str.split(',')) { if (!part) continue; const [v, r] = part.split(':'); const val = parseInt(v, 36), n = parseInt(r, 36); for (let k = 0; k < n && i < N; k++) owner[i++] = val; } recount(); }

  resetOwner();
  window.Mundo = { G, P, CELL, GW, GH, N, NF, NS, INFO, TERRENO, RIOS, states, byId, brasil, land, countryPaths, cellState, nearIn, owner, cont, CIDADES,
    cellXY, cellAt, stateAt, nb4, vizinhos, fronteira, rio, resetOwner, recount, setOwner, controle, centroide, celulaMaisProxima, planejarAvanco, conectividade,
    maskCanvas, contour, chains, smoothChain, hash, fbm, curva, camera, exportar, importar };
})();
