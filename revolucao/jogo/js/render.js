/* Renderizador no estilo cinejornal: mapa, território, frentes, setas, tropas e animação do turno */
(function () {
  const M = Mundo; const G = M.G; const ST = M.states;
  let R = null; // Regras
  let cv, ctx, cam;
  const vis = new Uint8Array(M.N); // território visual (anima atrasado em relação ao lógico)
  let maskDirty = true, maskCv = null, fronts = {}, lastMask = 0;
  let baseCv, baseCtx, topoCv, topoCtx, baseVer = -1;
  let modo = 'frentes', sel = null, alvos = null, hoverS = null, hoverU = null;
  let playing = null; // estado da reprodução do turno
  let marcas = []; // combates do último turno (ficam no mapa)
  let ghosts = []; // unidades destruídas durante a reprodução
  const disp = new Map(); // posições exibidas das unidades
  const flags = {}; let flagKey = '';
  let t0 = performance.now();
  let cb = {};

  const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  function corF(f) { if (f === 1) return rgb(R.S.org.cor || '#b8262b'); return rgb({ 0: '#5b634e', 2: '#34456a', 3: '#4d3b26', 4: '#c27a2c' }[f]); }

  function init(canvas, callbacks) {
    R = Regras; cv = canvas; ctx = cv.getContext('2d'); cb = callbacks || {};
    baseCv = document.createElement('canvas'); baseCtx = baseCv.getContext('2d');
    topoCv = document.createElement('canvas'); topoCtx = topoCv.getContext('2d');
    cam = M.camera(cv, () => { baseVer = -1; }, {
      pad: [80, 30, 30, 30], focus: [230, 60, 1000, 920],
      onHover: (m, e) => { hoverU = m ? unitAt(m) : null; hoverS = m && !hoverU ? M.stateAt(m[0], m[1]) : null; cb.hover && cb.hover(m, e, hoverU, hoverS); cv.style.cursor = (hoverU || (alvos && hoverS && alvos.includes(hoverS.idx))) ? 'pointer' : 'grab'; },
      onClick: (m, e) => { if (playing) { playing.pular = true; return; } cb.click && cb.click(m, unitAt(m), M.stateAt(m[0], m[1]), e); },
      onRight: () => cb.right && cb.right()
    });
    sincronizar();
    requestAnimationFrame(loop);
    return cam;
  }
  function sincronizar() { vis.set(M.owner); maskDirty = true; R.S && R.S.unidades.forEach(u => disp.set(u.id, u.pos.slice())); }
  function focar(p, z) { cam.centrar(p, z ? cam.k0 * z : cam.k); }

  // ---------------- camadas estáticas ----------------
  const riverPaths = G.rivers.map(r => ({ ...r, path: new Path2D(r.d) }));
  const lakePaths = G.lakes.map(r => new Path2D(r.d));
  const reliefPaths = G.relief.filter(r => /Range/.test(r.k)).map(r => new Path2D(r.d));
  function renderBase() {
    for (const [c, g] of [[baseCv, baseCtx], [topoCv, topoCtx]]) { c.width = cv.width; c.height = cv.height; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); }
    const k = cam.k, g = baseCtx;
    cam.screen(g); g.fillStyle = '#8ea7b1'; g.fillRect(0, 0, cam.w, cam.h);
    cam.apply(g);
    g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 0.6 / k;
    const a = cam.toMap(0, 0), b = cam.toMap(cam.w, cam.h);
    for (let y = Math.floor(a[1] / 9) * 9; y < b[1]; y += 9) { g.beginPath(); for (let x = a[0] - 12; x < b[0] + 12; x += 12) { const yy = y + Math.sin(x * 0.05 + y) * 1.2; x === a[0] - 12 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
    g.save(); g.shadowColor = 'rgba(30,50,60,.55)'; g.shadowBlur = 18 * cam.dpr; g.fillStyle = '#d6cbb1'; g.fill(M.land); g.restore();
    g.lineWidth = 4 / k; g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke(M.land);
    g.fillStyle = '#d4c9ae'; M.countryPaths.forEach(c => g.fill(c.path));
    g.fillStyle = '#ebdfc4'; g.fill(M.brasil);
    g.save(); g.filter = `blur(${Math.max(1, 3 * k)}px)`; g.fillStyle = 'rgba(120,96,60,.16)'; reliefPaths.forEach(p => g.fill(p)); g.restore();
    // camada superior: rios, lagos e fronteiras
    const t = topoCtx; cam.apply(t);
    t.strokeStyle = 'rgba(70,110,128,.75)'; riverPaths.forEach(r => { t.lineWidth = (r.r <= 3 ? 1.3 : r.r <= 5 ? 0.85 : 0.55) / Math.sqrt(k) * 1.2; t.stroke(r.path); });
    t.fillStyle = '#8ea7b1'; lakePaths.forEach(p => t.fill(p));
    t.setLineDash([5 / k, 3 / k]); t.strokeStyle = 'rgba(43,38,34,.55)'; t.lineWidth = 1 / k; M.countryPaths.forEach(c => t.stroke(c.path));
    t.setLineDash([1.5 / k, 2.5 / k]); t.strokeStyle = 'rgba(255,255,255,.8)'; t.lineWidth = 1 / k; ST.forEach(s => t.stroke(s.path)); t.setLineDash([]);
    t.strokeStyle = 'rgba(43,38,34,.7)'; t.lineWidth = 1.4 / k; t.stroke(M.brasil);
    baseVer = cam.ver;
  }

  function rebuildMask() {
    const cores = {}; [1, 2, 3].forEach(f => { cores[f] = [...corF(f), f === 1 ? 165 : 150]; });
    maskCv = M.maskCanvas(cores, vis);
    [1, 2, 3].forEach(f => { let tem = false; for (let i = 0; i < M.N; i++) if (vis[i] === f) { tem = true; break; } fronts[f] = tem ? M.chains(M.contour(f, vis)).map(l => M.smoothChain(l, 2)) : []; });
    maskDirty = false; lastMask = performance.now();
  }

  // ---------------- laço de desenho ----------------
  function loop() {
    try { draw(); } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
  }
  function draw() {
    if (!R.S) return;
    const now = performance.now(); const t = (now - t0) / 1000;
    if (playing) avancarReproducao(now);
    if (maskDirty && (now - lastMask > 70 || !maskCv)) rebuildMask();
    if (baseVer !== cam.ver || baseCv.width !== cv.width) renderBase();
    const k = cam.k;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(baseCv, 0, 0);
    cam.apply(ctx);
    // território / modos de mapa
    if (modo === 'frentes' || modo === 'suprimento') { ctx.save(); ctx.clip(M.brasil); ctx.imageSmoothingEnabled = true; ctx.filter = 'blur(0.6px)'; ctx.drawImage(maskCv, 0, 0, M.GW * M.CELL, M.GH * M.CELL); ctx.filter = 'none'; ctx.restore(); }
    if (modo === 'apoio' || modo === 'repressao' || modo === 'nucleos') {
      const c1 = corF(1);
      ST.forEach((s, i) => { const e = R.S.e[i]; let a; if (modo === 'apoio') { a = Math.min(1, e.apoio / 60); ctx.fillStyle = `rgba(${c1},${0.08 + a * 0.75})`; } else if (modo === 'repressao') { a = e.repressao / 100; ctx.fillStyle = `rgba(30,32,40,${a * 0.75})`; } else { a = e.nucleos / 10; ctx.fillStyle = `rgba(${c1},${a * 0.8})`; } ctx.fill(s.path); });
    }
    if (hoverS) { ctx.fillStyle = 'rgba(255,248,230,.18)'; ctx.fill(hoverS.path); }
    if (alvos) { const p = 0.35 + Math.sin(t * 5) * 0.15; alvos.forEach(s => { ctx.fillStyle = `rgba(216,26,32,${p * 0.45})`; ctx.fill(ST[s].path); ctx.strokeStyle = '#d81a20'; ctx.lineWidth = 2 / k; ctx.stroke(ST[s].path); }); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(topoCv, 0, 0); cam.apply(ctx);
    if (sel && sel.tipo === 'estado') { ctx.strokeStyle = '#2b2622'; ctx.lineWidth = 2.5 / k; ctx.stroke(ST[sel.s].path); ctx.strokeStyle = '#f4ecd9'; ctx.lineWidth = 1 / k; ctx.stroke(ST[sel.s].path); }
    // frentes
    if (modo === 'frentes' || modo === 'suprimento') for (const f of [3, 2, 1]) { const fr = fronts[f]; if (!fr || !fr.length) continue; const c = corF(f); const forte = mix(c, [255, 40, 40], f === 1 ? 0.35 : 0); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(${forte},.25)`; ctx.lineWidth = 8 / k; fr.forEach(line); ctx.strokeStyle = `rgb(${f === 1 ? mix(forte, [230, 20, 25], 0.5) : mix(c, [0, 0, 0], 0.2)})`; ctx.lineWidth = 2.4 / k; fr.forEach(line); }
    // suprimento: linhas dos estados com governo popular e das tropas
    if (modo === 'suprimento') R.S.unidades.filter(u => u.f === 1).forEach(u => { const p = disp.get(u.id) || u.pos; ctx.fillStyle = u.sup >= 60 ? 'rgba(80,140,60,.35)' : u.sup >= 30 ? 'rgba(220,160,40,.4)' : 'rgba(200,30,30,.45)'; ctx.beginPath(); ctx.arc(p[0], p[1], 26 / k, 0, 7); ctx.fill(); });
    // trilhas do último turno (setas que ficam paradas no ponto final)
    const trilhas = playing ? playing.trilhas : R.S.setasHist;
    (trilhas || []).forEach(s => desenharSeta(s, 1, k, playing ? 0.95 : 0.55));
    if (playing && playing.atual && playing.atual.t === 'seta') desenharSeta(playing.atual, playing.prog, k, 1);
    // ordens planejadas (tracejadas, paradas)
    if (!playing) planejadas(k, t);
    // ---- tela ----
    cam.screen(ctx); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    M.countryPaths.forEach(c => { if (!c.lp) return; const p = cam.toScreen(c.lp); spaced(c.n.toUpperCase(), p[0], p[1], `500 ${Math.min(16, 10 * Math.sqrt(k))}px Oswald`, 'rgba(70,60,46,.55)', 3); });
    spaced('OCEANO ATLÂNTICO', ...cam.toScreen([860, 780]), `500 ${Math.min(18, 12 * Math.sqrt(k))}px Oswald`, 'rgba(255,255,255,.55)', 6);
    if (k > 0.85 * cam.k0) ST.forEach(s => { const p = cam.toScreen(s.lp); spaced(s.id, p[0], p[1] + 14, '500 10px Oswald', 'rgba(43,38,34,.38)', 2); });
    M.CIDADES.forEach(c => { if (!c.br && c.k !== 'ext') return; if (c.k === 'est' && k < cam.k0 * 1.5) return; const p = cam.toScreen(c.p); if (p[0] < -50 || p[1] < -20 || p[0] > cam.w + 50 || p[1] > cam.h + 20) return; ctx.fillStyle = '#2b2622'; if (c.k === 'nac') estrela(p[0], p[1], 6, 2.6); else ctx.fillRect(p[0] - 2, p[1] - 2, 4, 4); ctx.textAlign = 'left'; ctx.font = `${c.k === 'est' ? 400 : 500} ${c.k === 'est' ? 10 : 11}px Oswald`; ctx.fillStyle = 'rgba(43,38,34,.85)'; ctx.fillText(c.n.toUpperCase(), p[0] + 6, p[1] - 1); });
    // badges de ações políticas planejadas
    if (!playing && R.S.politicas.length) { const cont = {}; R.S.politicas.forEach(p => { if (p.s != null) cont[p.s] = (cont[p.s] || 0) + 1; }); Object.entries(cont).forEach(([s, n]) => { const p = cam.toScreen(ST[s].anchor); badge(p[0] + 18, p[1] - 22, n); }); }
    // marcas de combate
    const mk = playing ? playing.marcas : marcas;
    mk.forEach((m, i) => { const p = cam.toScreen(m.p); const age = playing ? (now - m.t) / 1000 : 9; burst(p[0], p[1], 8 + m.int * 3, t + i, age); });
    // unidades
    const lista = R.S.unidades.slice();
    if (playing) ghosts.forEach(g => { if (!lista.some(u => u.id === g.id)) lista.push(g); });
    const pos = lista.map(u => [u, cam.toScreen(posExibida(u))]);
    pos.sort((a, b) => a[1][1] - b[1][1]);
    // desempilhar fichas sobrepostas
    for (let i = 0; i < pos.length; i++) for (let it = 0; it < 6; it++) { const a = pos[i][1]; const col = pos.slice(0, i).find(([, b]) => Math.abs(a[0] - b[0]) < 36 && Math.abs(a[1] - b[1]) < 25); if (!col) break; pos[i][1] = [a[0] + (it % 2 ? -20 : 20), col[1][1] + 26]; }
    pos.forEach(([u, p]) => ficha(u, p, sel && sel.tipo === 'unidade' && sel.id === u.id, playing && ghosts.includes(u) && !R.S.unidades.includes(u)));
    if (playing && playing.legenda) legendaFase(playing.legenda);
  }
  function posExibida(u) { let p = disp.get(u.id); if (!p) { p = u.pos.slice(); disp.set(u.id, p); } if (!playing || !playing.controladas.has(u.id)) { if (!playing) { p[0] += (u.pos[0] - p[0]) * 0.18; p[1] += (u.pos[1] - p[1]) * 0.18; } } return p; }

  // ---------------- primitivas ----------------
  function line(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
  function spaced(txt, x, y, font, color, sp) { ctx.font = font; ctx.fillStyle = color; ctx.letterSpacing = sp + 'px'; ctx.fillText(txt, x, y); ctx.letterSpacing = '0px'; }
  function estrela(x, y, Rr, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : Rr; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  function badge(x, y, n) { ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#f4ecd9'; ctx.font = '600 11px Oswald'; ctx.textAlign = 'center'; ctx.fillText(n, x, y + 1); }
  function curvaSeta(s, t) { const d = Math.hypot(s.para[0] - s.origem[0], s.para[1] - s.origem[1]); const curv = s.tipo === 'ataque' || s.tipo === 'levante' ? (s.f === 1 ? 0.14 : -0.12) : 0.08; return d < 2 ? [s.origem, s.para] : M.curva(s.origem, s.para, curv, t); }
  function desenharSeta(s, prog, k, alpha) {
    if (prog <= 0) return;
    const pts = curvaSeta(s, prog); if (pts.length < 2) return;
    const c = corF(s.f);
    ctx.save(); ctx.globalAlpha = alpha;
    if (s.tipo === 'ataque' || s.tipo === 'levante') ribbon(pts, k, s.f === 1 ? 15 : 12, `rgb(${s.f === 1 ? mix(c, [200, 20, 25], 0.25) : s.f === 0 ? '86,96,74' : c})`);
    else {
      const col = s.f === 1 ? `rgb(${mix(c, [0, 0, 0], 0.2)})` : s.f === 0 ? '#4a5240' : `rgb(${c})`;
      ctx.strokeStyle = col; ctx.lineWidth = (s.tipo === 'guerrilha' || s.tipo === 'sabotar' || s.tipo === 'barragem' ? 1.6 : 2.2) / k; ctx.lineCap = 'round';
      ctx.setLineDash(s.tipo === 'retirada' ? [2 / k, 4 / k] : s.tipo === 'aereo' ? [8 / k, 5 / k] : s.tipo === 'mover' ? [6 / k, 3 / k] : [1 / k, 3 / k]);
      line(pts); ctx.setLineDash([]);
      const e = pts[pts.length - 1], q = pts[Math.max(0, pts.length - 3)]; const dx = e[0] - q[0], dy = e[1] - q[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, h = 6 / k;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0] - ux * h * 1.6 - uy * h, e[1] - uy * h * 1.6 + ux * h); ctx.lineTo(e[0] - ux * h * 1.6 + uy * h, e[1] - uy * h * 1.6 - ux * h); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function ribbon(pts, k, largura, cor, contorno) {
    const w0 = largura / k, head = w0 * 0.95;
    const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { seg.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); tot += seg[i - 1]; }
    if (tot < head * 0.5) return;
    const stop = Math.max(0, tot - head * 1.4); const L = [], Rr = []; let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) acc += seg[i - 1]; if (acc > stop && i < pts.length - 1) continue;
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const w = w0 * (0.45 + 0.55 * Math.min(1, acc / (tot * 0.7 + 1e-6))) / 2; const nx = -dy / l * w, ny = dx / l * w;
      L.push([pts[i][0] + nx, pts[i][1] + ny]); Rr.unshift([pts[i][0] - nx, pts[i][1] - ny]);
    }
    const e = pts[pts.length - 1], q = pts[Math.max(0, pts.length - 4)]; const dx = e[0] - q[0], dy = e[1] - q[1], l = Math.hypot(dx, dy) || 1; const ux = dx / l, uy = dy / l;
    const hh = Math.min(head, tot * 0.45); const bx = e[0] - ux * hh * 1.4, by = e[1] - uy * hh * 1.4;
    ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.lineTo(bx - uy * hh, by + ux * hh); ctx.lineTo(e[0], e[1]); ctx.lineTo(bx + uy * hh, by - ux * hh); Rr.forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath();
    if (contorno) { ctx.setLineDash([5 / k, 3 / k]); ctx.strokeStyle = cor; ctx.lineWidth = 1.8 / k; ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = contorno; ctx.fill(); return; }
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6 * cam.dpr; ctx.shadowOffsetY = 2 * cam.dpr; ctx.fillStyle = cor; ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(20,10,8,.75)'; ctx.lineWidth = 1 / k; ctx.stroke();
  }
  function pontoAlvo(u, s) { if (u.s === s) { return M.centroide(s, 0) || ST[s].anchor; } const fr = M.fronteira(u.s, s); const a = ST[s].anchor; return [fr[0] + (a[0] - fr[0]) * 0.4, fr[1] + (a[1] - fr[1]) * 0.4]; }
  function planejadas(k, t) {
    const pinc = new Set(R.pincas());
    R.S.ordens.forEach(o => {
      const u = R.unidade(o.uid); if (!u || o.alvo == null) return; const de = disp.get(u.id) || u.pos; const para = pontoAlvo(u, o.alvo);
      const c = corF(1);
      if (o.tipo === 'atacar' || o.tipo === 'travessia') { const pts = M.curva(de, para, 0.14); ribbon(pts, k, 14, `rgb(${mix(c, [120, 0, 0], 0.3)})`, `rgba(${c},0.18)`); }
      else { ctx.save(); ctx.strokeStyle = `rgb(${mix(c, [0, 0, 0], 0.25)})`; ctx.lineWidth = 1.6 / k; ctx.setLineDash(o.tipo === 'mover' ? [6 / k, 4 / k] : [1.5 / k, 3 / k]); line(M.curva(de, para, 0.08)); ctx.restore(); }
      const sp = cam.toScreen(para); cam.screen(ctx); ctx.font = '600 10px Oswald'; ctx.letterSpacing = '1px'; const txt = (o.tipo === 'atacar' && pinc.has(o.alvo) ? 'PINÇA' : R.ORD[o.tipo].nome.toUpperCase()); const w = ctx.measureText(txt).width + 10; ctx.fillStyle = 'rgba(244,236,217,.92)'; ctx.fillRect(sp[0] - w / 2, sp[1] - 22, w, 15); ctx.fillStyle = '#7d1a12'; ctx.textAlign = 'center'; ctx.fillText(txt, sp[0], sp[1] - 14); ctx.letterSpacing = '0px'; cam.apply(ctx);
    });
  }
  function burst(x, y, r, t, age) {
    const s0 = age < 0.35 ? age / 0.35 * 1.4 : age < 0.6 ? 1.4 - (age - 0.35) / 0.25 * 0.4 : 1; const pulse = s0 * (1 + Math.sin(t * 5) * 0.06);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.08); ctx.scale(pulse, pulse);
    ctx.beginPath(); const n = 11; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n; const rr = i % 2 ? r * 0.48 : r * (0.9 + M.hash(i, Math.round(x)) * 0.3); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
    ctx.fillStyle = '#d81a20'; ctx.shadowColor = '#000a'; ctx.shadowBlur = 4; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#4a0b0b'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; const rr = i % 2 ? r * 0.2 : r * 0.42; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = '#ffd8a0'; ctx.fill();
    ctx.restore();
  }
  function bandeiraImg(f) {
    const key = f + ':' + (f === 1 ? (R.S.org.bandeira || R.S.org.cor) : '');
    if (flags[f] && flags[f].key === key) return flags[f].img;
    let src;
    if (f === 1) src = R.S.org.bandeira || Bandeira.svgToDataUrl(Bandeira.render({ layout: 'solida', c1: R.S.org.cor, c2: '#000', c3: '#000', emblem: 'estrela', ce: '#f4ecd9', emblemSize: 60 }));
    else src = Bandeira.svgToDataUrl({ 0: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#3c6e3a"/><polygon points="15,2 28,10 15,18 2,10" fill="#e3c34a"/><circle cx="15" cy="10" r="4.4" fill="#2c3f7a"/></svg>', 2: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#34456a"/><rect y="7" width="30" height="6" fill="#d9c27a"/></svg>', 3: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#1d1a17"/><polygon points="15,3 21,17 9,17" fill="#c9a24a"/></svg>' }[f]);
    const img = new Image(); img.src = src; flags[f] = { key, img }; return img;
  }
  function ficha(u, p, on, morta) {
    const w = 36, h = 23, x = p[0] - w / 2, y = p[1] - h / 2;
    if (x < -60 || y < -40 || x > cam.w + 60 || y > cam.h + 40) return;
    ctx.save(); if (morta) ctx.globalAlpha = 0.45;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    ctx.fillStyle = u.f === 1 ? '#f4ecd9' : u.f === 2 ? '#dfe3ec' : u.f === 3 ? '#d9cfbf' : '#e3e1d4'; ctx.fillRect(x, y, w, h); ctx.restore();
    const img = bandeiraImg(u.f); if (img.complete && img.naturalWidth) ctx.drawImage(img, x + 2, y + 2, 15, 10);
    ctx.strokeStyle = '#1d1a17'; ctx.lineWidth = 1.2; const sx = x + 20, sy = y + 3, sw = 13, sh = 9; ctx.strokeRect(sx, sy, sw, sh);
    ctx.beginPath(); const t = u.tipo;
    if (['infantaria', 'fuzileiros', 'milicia', 'exercito', 'paramilitar', 'selva'].includes(t)) { ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy + sh); ctx.moveTo(sx + sw, sy); ctx.lineTo(sx, sy + sh); }
    if (t === 'blindada' || t === 'motorizada') ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2 - 2, sh / 2 - 1.5, 0, 0, Math.PI * 2);
    if (t === 'guerrilha' || t === 'selva') { ctx.moveTo(sx + 1, sy + sh); ctx.lineTo(sx + sw / 2, sy + 1); ctx.lineTo(sx + sw - 1, sy + sh); }
    if (t === 'aerotransportada') { ctx.moveTo(sx + 2, sy + sh - 2); ctx.quadraticCurveTo(sx + sw / 4, sy, sx + sw / 2, sy + sh - 2); ctx.quadraticCurveTo(sx + 3 * sw / 4, sy, sx + sw - 2, sy + sh - 2); }
    ctx.stroke(); if (t === 'artilharia') { ctx.beginPath(); ctx.arc(sx + sw / 2, sy + sh / 2, 2, 0, 7); ctx.fillStyle = '#1d1a17'; ctx.fill(); }
    if (t === 'milicia') { ctx.fillStyle = '#1d1a17'; ctx.fillRect(sx + sw / 2 - 1, sy - 2, 2, 2); }
    // força (névoa de guerra para o inimigo)
    const exato = u.f === 1 || R.tem('inteligencia') || R.S.unidades.some(x => x.f === 1 && (x.s === u.s || ST[u.s].viz.some(v => v.s === x.s))) || R.S.e[u.s].nucleos >= 2;
    ctx.fillStyle = '#1d1a17'; ctx.font = '600 9px Oswald'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const fz = u.forca >= 1000 ? (u.forca / 1000).toFixed(1) + 'k' : String(u.forca);
    ctx.fillText(exato ? fz : '~' + (Math.round(u.forca / 1000) || '<1') + 'k', x + w / 2, y + h - 2);
    // barra de moral / suprimento
    if (u.f === 1) { ctx.fillStyle = u.sup >= 60 ? '#4e7a3a' : u.sup >= 30 ? '#c9952a' : '#b8262b'; ctx.fillRect(x, y + h, w * Math.max(0.05, u.sup / 100), 2.5); }
    ctx.strokeStyle = on ? '#d81a20' : u.post === 'cercada' ? '#d81a20' : '#1d1a17'; ctx.lineWidth = on ? 2.6 : 1; ctx.strokeRect(x, y, w, h);
    if (u.post === 'fortificada') { ctx.strokeStyle = '#1d1a17'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(x + 3 + i * 7.5, y + h + 3); ctx.lineTo(x + 6.5 + i * 7.5, y + h + 6); ctx.lineTo(x + 10 + i * 7.5, y + h + 3); } ctx.stroke(); }
    if (u.post === 'isolada') { ctx.fillStyle = '#9a6a10'; ctx.font = '600 8.5px Oswald'; ctx.textAlign = 'center'; ctx.fillText('SEM SUPRIMENTO', p[0], y - 3); }
    if (u.post === 'cercada') { ctx.setLineDash([3, 2]); ctx.strokeStyle = '#d81a20'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p[0], p[1], 25, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#d81a20'; ctx.font = '600 9px Oswald'; ctx.fillText('CERCADA', p[0], p[1] - 28); }
    if (R.S.ordens.some(o => o.uid === u.id) && !playing) { ctx.fillStyle = '#d81a20'; ctx.beginPath(); ctx.arc(x + w, y, 4, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function legendaFase(txt) { ctx.save(); ctx.font = '600 13px Oswald'; ctx.letterSpacing = '4px'; const w = ctx.measureText(txt.toUpperCase()).width + 36; const x = cam.w / 2 - w / 2, y = 18; ctx.fillStyle = 'rgba(11,10,9,.82)'; ctx.fillRect(x, y, w, 30); ctx.fillStyle = '#f4ecd9'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt.toUpperCase(), cam.w / 2, y + 15); ctx.restore(); }

  // ---------------- reprodução do turno ----------------
  // A seta cresce UMA vez, da posição da tropa até onde a frente chegou, e fica parada ali.
  function reproduzir(res, unidadesAntes, opts = {}) {
    return new Promise(resolve => {
      const vel = opts.velocidade || 1;
      ghosts = unidadesAntes.map(u => ({ ...u, pos: u.pos.slice() }));
      // posições exibidas começam onde as tropas estavam
      disp.clear(); unidadesAntes.forEach(u => disp.set(u.id, u.pos.slice()));
      R.S.unidades.forEach(u => { if (!disp.has(u.id)) disp.set(u.id, u.pos.slice()); });
      const fila = res.anims.filter(a => a.t !== 'politica' || true);
      playing = { fila, i: -1, atual: null, prog: 0, inicio: 0, dur: 0, trilhas: [], marcas: [], controladas: new Set(), vel, pular: false, legenda: null, resolve, flipsFeitos: 0 };
      marcas = [];
      proximo(performance.now());
    });
  }
  function duracao(a) {
    const v = playing.vel;
    if (a.t === 'fase') return 900 / v;
    if (a.t === 'politica') return 380 / v;
    if (a.t === 'flips') return 900 / v;
    if (a.t === 'seta') { const d = Math.hypot(a.para[0] - a.origem[0], a.para[1] - a.origem[1]); const meu = a.f === 1 || a.dfac === 1; const grande = a.tipo === 'ataque' || a.tipo === 'levante';
      const base = grande ? (meu ? 1300 : 650) : (meu ? 600 : 260); return (base + Math.min(meu ? 900 : 300, d * (meu ? 6 : 2))) / v; }
    return 300 / v;
  }
  function proximo(now) {
    const P = playing; finalizarAtual();
    P.i++;
    if (P.pular) { while (P.i < P.fila.length) { const a = P.fila[P.i]; P.atual = a; P.prog = 1; finalizarAtual(); P.i++; } }
    if (P.i >= P.fila.length) return terminar();
    const a = P.fila[P.i]; P.atual = a; P.prog = 0; P.inicio = now; P.dur = duracao(a); P.flipsFeitos = 0;
    if (a.t === 'fase') { P.legenda = a.texto; cb.fase && cb.fase(a.texto); }
    if (a.t === 'politica') { cb.politica && cb.politica(a); if (a.s != null) pulsoEstado(a.s); }
    if (a.t === 'seta') { (a.uids || []).forEach(id => P.controladas.add(id)); if (cb.seguir && a.s != null) cb.seguir(a); if (a.combate) cb.som && cb.som('marcha'); }
  }
  function finalizarAtual() {
    const P = playing; const a = P.atual; if (!a) return;
    if (a.t === 'seta' || a.t === 'flips') {
      (a.flips || []).forEach(i => { vis[i] = a.alvoF ?? a.f; }); if ((a.flips || []).length) maskDirty = true;
      if (a.combate && !P.marcas.some(m => m.p === a.combate.p)) { P.marcas.push({ p: a.combate.p, int: a.combate.int, t: performance.now() }); }
      if (a.t === 'seta') { P.trilhas.push({ f: a.f, tipo: a.tipo, origem: a.origem, para: a.para }); (a.uids || []).forEach((id, k) => { const u = R.unidade(id); const p = disp.get(id); if (p) { const dest = u ? u.pos : a.para; p[0] = dest[0]; p[1] = dest[1]; } }); }
    }
    P.atual = null;
  }
  function avancarReproducao(now) {
    const P = playing; if (!P.atual) return;
    if (P.pular) { proximo(now); return; }
    const a = P.atual; P.prog = Math.min(1, (now - P.inicio) / P.dur);
    if (a.t === 'seta') {
      // a ponta da seta leva a ficha da tropa junto
      const e = Math.min(1, P.prog * 1.15); const pts = curvaSeta(a, e); const tip = pts[pts.length - 1];
      (a.uids || []).forEach((id, k) => { const p = disp.get(id); if (p) { const de = a.de && a.de[k] ? a.de[k] : a.origem; const tt = Math.min(1, e); p[0] = de[0] + (tip[0] - de[0]) * tt; p[1] = de[1] + (tip[1] - de[1]) * tt; } });
      // o território vira atrás da ponta
      if (a.flips && a.flips.length && P.prog > 0.35) { const alvo = Math.floor(a.flips.length * Math.min(1, (P.prog - 0.35) / 0.6)); for (let i = P.flipsFeitos; i < alvo; i++) vis[a.flips[i]] = a.alvoF ?? a.f; if (alvo > P.flipsFeitos) { maskDirty = true; P.flipsFeitos = alvo; } }
      if (a.combate && P.prog > 0.55 && !P.marcas.some(m => m.p === a.combate.p)) { P.marcas.push({ p: a.combate.p, int: a.combate.int, t: now }); cb.som && cb.som('explosao', a.combate.int); }
    }
    if (a.t === 'flips') { const alvo = Math.floor(a.flips.length * P.prog); for (let i = P.flipsFeitos; i < alvo; i++) vis[a.flips[i]] = a.f; if (alvo > P.flipsFeitos) { maskDirty = true; P.flipsFeitos = alvo; } if (a.combate && !P.marcas.some(m => m.p === a.combate.p)) { P.marcas.push({ p: a.combate.p, int: a.combate.int, t: now }); cb.som && cb.som('explosao', 2); } }
    if (P.prog >= 1) proximo(now + 0);
  }
  function terminar() {
    const P = playing; marcas = P.marcas.map(m => ({ ...m, t: 0 }));
    vis.set(M.owner); maskDirty = true; ghosts = [];
    playing = null; cb.fase && cb.fase(null);
    P.resolve();
  }
  let pulsos = [];
  function pulsoEstado(s) { pulsos.push({ s, t: performance.now() }); }

  function unitAt(m) { if (!m || !R.S) return null; let best = null, bd = 1e9; R.S.unidades.forEach(u => { const p = disp.get(u.id) || u.pos; const sp = cam.toScreen(p), mp = cam.toScreen(m); const d = Math.hypot(sp[0] - mp[0], sp[1] - mp[1]); if (d < 22 && d < bd) { bd = d; best = u; } }); return best; }

  window.Render = {
    init, sincronizar, focar, reproduzir, unitAt,
    get cam() { return cam; }, get tocando() { return !!playing; },
    pular() { if (playing) playing.pular = true; },
    setModo(m) { modo = m; }, get modo() { return modo; },
    selecionar(s) { sel = s; }, setAlvos(a) { alvos = a; }, limparMarcas() { marcas = []; },
    marcarSujo() { maskDirty = true; }
  };
})();
