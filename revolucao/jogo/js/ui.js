/* Interface: telas, criação da organização, fichas, ordens, modais, turno, salvamento e som */
(function () {
  const R = Regras, M = Mundo, ST = M.states;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtN = n => Math.round(n).toLocaleString('pt-BR');
  const pct = v => Math.round(v) + '%';
  const S = () => R.S;
  let prefs = { vel: 1.5, som: true, relatorio: true };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem('revbr_prefs') || '{}') }; } catch (e) { }
  const salvarPrefs = () => { try { localStorage.setItem('revbr_prefs', JSON.stringify(prefs)); } catch (e) { } };
  let renderPronto = false, mira = null, ocupado = false;

  // ---------------- utilidades ----------------
  function toast(txt, ms = 2600) { const t = $('toast'); t.textContent = txt; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms); }
  function tela(nome) { $('inicio').hidden = nome !== 'inicio'; $('criacao').hidden = nome !== 'criacao'; $('jogo').hidden = nome !== 'jogo'; $('fim').hidden = nome !== 'fim'; }
  function comTempo(p, ms) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('Tempo esgotado')), ms))]); }

  // ---------------- modal genérico ----------------
  let fecharModalCb = null;
  function modal({ titulo, html, botoes = [], classe = '', aoAbrir, fechavel = true, aoFechar }) {
    const m = $('modal'); fecharModalCb = aoFechar || null;
    m.innerHTML = `<div class="doc ${classe}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><header><h2>${esc(titulo)}</h2>${fechavel ? '<button class="x" aria-label="Fechar">×</button>' : ''}</header><div class="conteudo">${html}</div>${botoes.length ? `<footer>${botoes.map((b, i) => `<button class="btn ${b.classe || ''}" data-b="${i}" ${b.desabilitado ? 'disabled' : ''}>${esc(b.txt)}</button>`).join('')}</footer>` : ''}</div>`;
    m.hidden = false;
    if (fechavel) { m.querySelector('.x').onclick = fecharModal; m.onclick = e => { if (e.target === m) fecharModal(); }; } else m.onclick = null;
    botoes.forEach((b, i) => { m.querySelector(`[data-b="${i}"]`).onclick = () => b.acao ? b.acao() : fecharModal(); });
    const doc = m.querySelector('.doc'); if (aoAbrir) aoAbrir(doc);
    const f = doc.querySelector('input, textarea, select, .escolhas button, footer .btn'); if (f) setTimeout(() => f.focus(), 30);
    return doc;
  }
  function fecharModal() { $('modal').hidden = true; $('modal').innerHTML = ''; const cb = fecharModalCb; fecharModalCb = null; if (cb) cb(); }

  // ---------------- som ----------------
  let actx = null;
  function audio() { if (!prefs.som) return null; if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === 'suspended') actx.resume(); return actx; }
  function som(tipo, int = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    if (tipo === 'explosao') {
      const len = a.sampleRate * (0.5 + int * 0.25); const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      const src = a.createBufferSource(); src.buffer = buf; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380 + int * 90; const g = a.createGain(); g.gain.value = 0.22 + int * 0.06;
      src.connect(f); f.connect(g); g.connect(a.destination); src.start(t);
    } else if (tipo === 'marcha') {
      for (let i = 0; i < 3; i++) { const o = a.createOscillator(); const g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t + i * 0.18); o.frequency.exponentialRampToValueAtTime(40, t + i * 0.18 + 0.12); g.gain.setValueAtTime(0.18, t + i * 0.18); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.15); o.connect(g); g.connect(a.destination); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.16); }
    } else if (tipo === 'clique') { const o = a.createOscillator(); const g = a.createGain(); o.type = 'square'; o.frequency.value = 900; g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.06); }
  }

  // ---------------- grão de filme ----------------
  function grao(cv) { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; const g = cv.getContext('2d'); cv.width = 220; cv.height = 160; setInterval(() => { if (cv.offsetParent === null) return; const img = g.createImageData(220, 160); for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 40; } g.putImageData(img, 0, 0); }, 90); }

  // ================= TELA INICIAL =================
  function initInicio() {
    grao($('grao-ini')); grao($('grao'));
    $('ini-novo').onclick = () => { iniciarCriacao(); };
    $('ini-continuar').hidden = !temAutosave();
    $('ini-continuar').onclick = () => { if (carregarAutosave()) iniciarJogo(); };
    $('ini-carregar').onclick = () => abrirCarregar();
    $('ini-ia').onclick = () => abrirIA();
    $('ini-ajuda').onclick = () => abrirAjuda();
    tela('inicio');
  }

  // ================= CRIAÇÃO =================
  const TIPOS_ORG = ['Partido', 'Vanguarda', 'Frente revolucionária', 'Guerrilha', 'Movimento social', 'Sindicato', 'Coletivo', 'Milícia popular', 'Outro'];
  const VERTENTES = ['Marxismo-leninismo', 'Maoísmo', 'Trotskismo', 'Anarquismo', 'Anarcossindicalismo', 'Guevarismo', 'Socialismo democrático', 'Socialismo popular', 'Trabalhismo nacionalista', 'Ecossocialismo', 'Indigenismo revolucionário', 'Comunalismo', 'Bolivarianismo'];
  const PASSOS = ['Identidade', 'Bandeira', 'Estratégia', 'Partida'];
  const cri = { passo: 0, d: null };
  function iniciarCriacao() {
    cri.passo = 0;
    cri.d = { nome: '', sigla: '', tipo: 'Frente revolucionária', vertente: 'Socialismo popular', lema: '', lider: '', manifesto: '', doutrina: 'prolongada', base: 'campesinato', sede: 'MA', tamanho: 'coletivo', cor: '#b8262b', dificuldade: 'normal', ano: 2028, mes0: 2,
      bmodo: 'montar', flag: { layout: 'triangulo', c1: '#1d1a17', c2: '#b8262b', c3: '#b8262b', emblem: 'estrela', ce: '#f4ecd9', emblemSize: 46, emblemPos: 'tralha', text: '', ct: '#f4ecd9', textSize: 34 }, img: null, iaDesc: '' };
    tela('criacao'); desenharCriacao();
    $('cri-ant').onclick = () => { if (cri.passo > 0) { cri.passo--; desenharCriacao(); } };
    $('cri-prox').onclick = () => { const e = validarPasso(); if (e) { toast(e); return; } if (cri.passo < PASSOS.length - 1) { cri.passo++; desenharCriacao(); } else finalizarCriacao(); };
    $('cri-voltar-ini').onclick = () => initInicio();
  }
  function validarPasso() { const d = cri.d; if (cri.passo === 0) { if (!d.nome.trim()) return 'Dê um nome à organização.'; if (!d.sigla.trim()) return 'Dê uma sigla.'; } return null; }
  function bandeiraURL() { const d = cri.d; if (d.bmodo !== 'montar' && d.img) return d.img; const f = { ...d.flag }; return Bandeira.svgToDataUrl(Bandeira.render(f)); }
  function desenharPrevia() {
    const d = cri.d; const dt = R.DOUTRINAS[d.doutrina];
    $('previa').innerHTML = `<div class="bnd" style="background-image:url('${bandeiraURL().replace(/'/g, '%27')}')"></div><div class="info"><div class="sig">${esc(d.sigla || 'SIGLA')}</div><div class="nom">${esc(d.nome || 'Nome da organização')}</div><div class="det">${esc(d.tipo)} · ${esc(d.vertente)}<br>${esc(dt.nome)} · ${esc(R.BASES_SOCIAIS[d.base].nome)}<br>Sede: ${esc(ST[M.byId[d.sede]].n)}</div>${d.lema ? `<div class="lema">“${esc(d.lema)}”</div>` : ''}</div>`;
  }
  function desenharCriacao() {
    const d = cri.d; const e = $('etapa');
    $('passos').innerHTML = PASSOS.map((p, i) => `<span class="${i === cri.passo ? 'on' : ''}">${i + 1}. ${p}</span>`).join('');
    $('cri-ant').disabled = cri.passo === 0; $('cri-prox').textContent = cri.passo === PASSOS.length - 1 ? 'Fundar e começar ▸' : 'Próximo ▸';
    if (cri.passo === 0) {
      e.innerHTML = `<h2>Quem são vocês</h2><p class="sub">A identidade da organização. Tudo pode ser editado depois.</p>
        <div class="linha2"><div class="campo"><label for="c-nome">Nome</label><input type="text" id="c-nome" maxlength="60" value="${esc(d.nome)}" placeholder="Ex.: União Popular Revolucionária"></div><div class="campo"><label for="c-sigla">Sigla</label><input type="text" id="c-sigla" maxlength="10" value="${esc(d.sigla)}" placeholder="Ex.: UPR"></div></div>
        <div class="linha2"><div class="campo"><label for="c-tipo">Tipo de organização</label><select id="c-tipo">${TIPOS_ORG.map(t => `<option ${t === d.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="campo"><label for="c-vert">Vertente ideológica</label><input type="text" id="c-vert" list="l-vert" maxlength="60" value="${esc(d.vertente)}"><datalist id="l-vert">${VERTENTES.map(v => `<option value="${v}">`).join('')}</datalist><span class="ajuda">Escolha da lista ou escreva a sua.</span></div></div>
        <div class="linha2"><div class="campo"><label for="c-lema">Lema</label><input type="text" id="c-lema" maxlength="80" value="${esc(d.lema)}" placeholder="Ex.: Terra, pão e poder ao povo"></div><div class="campo"><label for="c-lider">Direção</label><input type="text" id="c-lider" maxlength="60" value="${esc(d.lider)}" placeholder="Ex.: Comitê Central de 7 membros"></div></div>
        <div class="campo"><label for="c-man">Manifesto e programa</label><textarea id="c-man" maxlength="1500" placeholder="O que a organização defende, contra quem luta e que país quer construir.">${esc(d.manifesto)}</textarea><span class="ajuda">Opcional. Se você ligar a IA, ela usa o manifesto e a vertente na narração e nas ações livres.</span></div>`;
      const liga = (id, k) => { $(id).oninput = ev => { d[k] = ev.target.value; if (k === 'sigla' && !d.flag.textoManual) { } desenharPrevia(); }; };
      liga('c-nome', 'nome'); liga('c-sigla', 'sigla'); liga('c-tipo', 'tipo'); liga('c-vert', 'vertente'); liga('c-lema', 'lema'); liga('c-lider', 'lider'); liga('c-man', 'manifesto');
      $('c-tipo').onchange = ev => { d.tipo = ev.target.value; desenharPrevia(); };
    }
    if (cri.passo === 1) {
      const F = d.flag;
      e.innerHTML = `<h2>A bandeira</h2><p class="sub">Monte aqui, envie um arquivo pronto (feito em outro programa ou por uma IA de imagem) ou peça para a IA desenhar.</p>
        <div class="abas" role="tablist">${[['montar', 'Montar'], ['arquivo', 'Enviar arquivo'], ['ia', 'Gerar com IA']].map(([k, t]) => `<button role="tab" data-m="${k}" aria-selected="${d.bmodo === k}">${t}</button>`).join('')}</div>
        <div id="b-corpo"></div>`;
      e.querySelector('.abas').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; d.bmodo = b.dataset.m; desenharCriacao(); };
      const c = $('b-corpo');
      if (d.bmodo === 'montar') {
        c.innerHTML = `<div class="linha2"><div class="campo"><label for="f-lay">Desenho</label><select id="f-lay">${Object.entries(Bandeira.LAYOUTS).map(([k, v]) => `<option value="${k}" ${k === F.layout ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="campo"><label>Cores do fundo</label><div class="cores"><input type="color" id="f-c1" value="${F.c1}" aria-label="Cor 1"><input type="color" id="f-c2" value="${F.c2}" aria-label="Cor 2"><input type="color" id="f-c3" value="${F.c3}" aria-label="Cor 3"></div></div></div>
          <div class="linha3"><div class="campo"><label for="f-em">Emblema</label><select id="f-em">${Object.entries(Bandeira.EMBLEMS).map(([k, v]) => `<option value="${k}" ${k === F.emblem ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></div><div class="campo"><label for="f-pos">Posição</label><select id="f-pos">${[['centro', 'Centro'], ['tralha', 'Junto ao mastro'], ['canto', 'Canto superior']].map(([k, v]) => `<option value="${k}" ${k === F.emblemPos ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="campo"><label>Cor e tamanho</label><div class="cores"><input type="color" id="f-ce" value="${F.ce}" aria-label="Cor do emblema"><input type="range" id="f-tam" min="20" max="95" value="${F.emblemSize}" aria-label="Tamanho do emblema" style="flex:1"></div></div></div>
          <div class="linha2"><div class="campo"><label for="f-txt">Texto na bandeira</label><input type="text" id="f-txt" maxlength="14" value="${esc(F.text)}" placeholder="Ex.: a sigla"></div><div class="campo"><label>Cor do texto e posição</label><div class="cores"><input type="color" id="f-ct" value="${F.ct}" aria-label="Cor do texto"><select id="f-tpos" style="flex:1;background:#15120f;border:1px solid #3a342b;padding:8px;color:var(--papel)"><option value="base" ${F.textPos !== 'topo' ? 'selected' : ''}>Embaixo</option><option value="topo" ${F.textPos === 'topo' ? 'selected' : ''}>Em cima</option></select></div></div></div>
          <div class="cores"><button class="btn sec peq" id="f-sig">Usar a sigla</button><button class="btn sec peq" id="f-sort">Sortear bandeira</button><span class="ajuda" style="font-family:var(--f-narra);font-style:italic;color:var(--apagado)">A cor principal da organização no mapa será a da bandeira, ajustável no passo 3.</span></div>`;
        const set = (id, k, num) => { $(id).oninput = ev => { F[k] = num ? +ev.target.value : ev.target.value; if (k === 'c2' || k === 'c1') d.cor = escolherCor(F); desenharPrevia(); }; };
        set('f-lay', 'layout'); set('f-c1', 'c1'); set('f-c2', 'c2'); set('f-c3', 'c3'); set('f-em', 'emblem'); set('f-pos', 'emblemPos'); set('f-ce', 'ce'); set('f-tam', 'emblemSize', true); set('f-txt', 'text'); set('f-ct', 'ct'); set('f-tpos', 'textPos');
        ['f-lay', 'f-em', 'f-pos', 'f-tpos'].forEach(id => { $(id).onchange = $(id).oninput; });
        $('f-sig').onclick = () => { F.text = d.sigla; $('f-txt').value = d.sigla; desenharPrevia(); };
        $('f-sort').onclick = () => { const pal = ['#b8262b', '#1d1a17', '#f4ecd9', '#2f6b3a', '#e0b030', '#24407a', '#7a1f3d', '#d9661f', '#ffffff']; const r = a => a[Math.floor(Math.random() * a.length)]; Object.assign(F, { layout: r(Object.keys(Bandeira.LAYOUTS)), c1: r(pal), c2: r(pal), c3: r(pal), emblem: r(Object.keys(Bandeira.EMBLEMS)), ce: r(pal), emblemPos: r(['centro', 'tralha']) }); d.cor = escolherCor(F); desenharCriacao(); };
      }
      if (d.bmodo === 'arquivo') {
        c.innerHTML = `<div class="campo"><label>Arquivo de imagem</label><div class="cores"><button class="btn" id="b-env">Escolher imagem</button><span class="ajuda">PNG, JPG, SVG ou WebP. A imagem é reduzida para caber no salvamento.</span></div></div>${d.img ? '<p class="ajuda" style="font-family:var(--f-narra);color:var(--apagado)">Imagem carregada. Veja a prévia ao lado.</p>' : ''}
          <div class="campo"><label for="b-cor">Cor da organização no mapa</label><div class="cores"><input type="color" id="b-cor" value="${d.cor}"><span class="ajuda">Escolha a cor que mais aparece na sua bandeira.</span></div></div>`;
        $('b-env').onclick = () => { const inp = $('arquivo-img'); inp.value = ''; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = async () => { try { d.img = await Bandeira.normalizeImage(fr.result); desenharCriacao(); } catch (err) { toast('Não consegui abrir essa imagem.'); } }; fr.readAsDataURL(f); }; inp.click(); };
        $('b-cor').oninput = ev => { d.cor = ev.target.value; };
      }
      if (d.bmodo === 'ia') {
        const on = IA.ativo('bandeira');
        c.innerHTML = on ? `<div class="campo"><label for="b-desc">Descreva a bandeira</label><textarea id="b-desc" placeholder="Ex.: fundo vermelho com uma faixa preta diagonal e uma estrela dourada de cinco pontas, estilo latino-americano dos anos 60">${esc(d.iaDesc)}</textarea></div><div class="cores"><button class="btn" id="b-gerar">Gerar bandeira</button><span id="b-st" class="ajuda" style="font-family:var(--f-narra);color:var(--apagado)"></span></div><div class="campo"><label for="b-cor2">Cor da organização no mapa</label><input type="color" id="b-cor2" value="${d.cor}"></div>`
          : `<div class="aviso" style="color:var(--papel);background:#c9952a22">A IA está desligada. Ela é opcional: você pode configurar um provedor gratuito agora ou gerar a imagem em outro lugar e usar a aba "Enviar arquivo".</div><div><button class="btn" id="b-cfg">Configurar IA</button></div>`;
        if (on) { $('b-desc').oninput = ev => { d.iaDesc = ev.target.value; }; $('b-cor2').oninput = ev => { d.cor = ev.target.value; };
          $('b-gerar').onclick = async () => { if (!d.iaDesc.trim()) { toast('Descreva a bandeira primeiro.'); return; } $('b-st').textContent = 'Desenhando...'; $('b-gerar').disabled = true; try { const svg = await IA.bandeira(d.iaDesc, { nome: d.nome, sigla: d.sigla, vertente: d.vertente }); d.img = Bandeira.svgToDataUrl(svg); $('b-st').textContent = 'Pronto.'; desenharPrevia(); } catch (err) { $('b-st').textContent = err.message; } $('b-gerar').disabled = false; }; }
        else $('b-cfg').onclick = () => abrirIA(() => desenharCriacao());
      }
    }
    if (cri.passo === 2) {
      e.innerHTML = `<h2>Linha estratégica</h2><p class="sub">A doutrina dá a primeira tese e bônus permanentes. A base social define onde vocês começam fortes.</p>
        <div class="rot">Doutrina</div><div class="cards" id="c-dout">${Object.entries(R.DOUTRINAS).map(([k, v]) => `<button class="card-op" data-k="${k}" aria-pressed="${k === d.doutrina}"><b>${v.nome}</b><span>${v.desc}${v.tese ? ' Começa com a tese "' + R.TESES[v.tese].nome + '".' : ''}</span></button>`).join('')}</div>
        <div class="linha2"><div class="campo"><label for="c-base">Base social</label><select id="c-base">${Object.entries(R.BASES_SOCIAIS).map(([k, v]) => `<option value="${k}" ${k === d.base ? 'selected' : ''}>${v.nome}</option>`).join('')}</select><span class="ajuda" id="c-base-uf"></span></div>
        <div class="campo"><label for="c-sede">Sede (estado de origem)</label><select id="c-sede">${ST.slice().sort((a, b) => a.n.localeCompare(b.n)).map(s => `<option value="${s.id}" ${s.id === d.sede ? 'selected' : ''}>${s.n}</option>`).join('')}</select><span class="ajuda">Começa com 3 núcleos e apoio maior. Estados rurais e longe de Brasília sofrem menos repressão no início.</span></div></div>
        <div class="rot">Tamanho inicial</div><div class="cards" id="c-tam">${Object.entries(R.TAMANHOS).map(([k, v]) => `<button class="card-op" data-k="${k}" aria-pressed="${k === d.tamanho}"><b>${v.nome}</b><span>${fmtN(v.mil)} militantes. ${k === 'massas' ? 'Mais gente, mas já começa vigiado.' : k === 'nucleo' ? 'Discreto e difícil de achar.' : ''}</span></button>`).join('')}</div>
        <div class="campo"><label for="c-cor">Cor no mapa</label><div class="cores"><input type="color" id="c-cor" value="${d.cor}"><span class="ajuda">Território, setas e frentes da organização usam esta cor.</span></div></div>`;
      const cards = (id, k) => { $(id).onclick = ev => { const b = ev.target.closest('.card-op'); if (!b) return; d[k] = b.dataset.k; $(id).querySelectorAll('.card-op').forEach(x => x.setAttribute('aria-pressed', x === b)); desenharPrevia(); }; };
      cards('c-dout', 'doutrina'); cards('c-tam', 'tamanho');
      const baseUf = () => { $('c-base-uf').textContent = 'Força inicial em: ' + R.BASES_SOCIAIS[d.base].ufs.join(', '); }; baseUf();
      $('c-base').onchange = ev => { d.base = ev.target.value; baseUf(); desenharPrevia(); }; $('c-sede').onchange = ev => { d.sede = ev.target.value; desenharPrevia(); }; $('c-cor').oninput = ev => { d.cor = ev.target.value; };
    }
    if (cri.passo === 3) {
      e.innerHTML = `<h2>A partida</h2><p class="sub">Cada turno é um mês. Vence quem toma Brasília com metade do povo, derruba o regime, chega ao governo pelo voto ou arranca um acordo de paz.</p>
        <div class="rot">Dificuldade</div><div class="cards" id="c-dif">${Object.entries(R.DIFICULDADE).map(([k, v]) => `<button class="card-op" data-k="${k}" aria-pressed="${k === d.dificuldade}"><b>${v.nome}</b><span>${k === 'facil' ? 'Governo 25% mais fraco e mais recursos.' : k === 'dificil' ? 'Governo 30% mais forte e menos recursos.' : 'Equilibrado.'}</span></button>`).join('')}</div>
        <div class="linha2"><div class="campo"><label for="c-ano">Ano de início</label><select id="c-ano">${[2026, 2027, 2028, 2029, 2030, 2032, 2035].map(a => `<option ${a === d.ano ? 'selected' : ''}>${a}</option>`).join('')}</select><span class="ajuda">Eleições em outubro dos anos pares; presidenciais em 2026, 2030, 2034…</span></div>
        <div class="campo"><label for="c-mes">Mês de início</label><select id="c-mes">${R.MESES.map((m, i) => `<option value="${i}" ${i === d.mes0 ? 'selected' : ''}>${m}</option>`).join('')}</select></div></div>
        <div class="campo"><label>Inteligência artificial</label><div class="cores"><span class="ajuda">${IA.ligada() ? 'Ligada: ' + esc(IA.PROVEDORES[IA.cfg.prov].nome) : 'Desligada. O jogo é completo sem ela.'}</span><button class="btn sec peq" id="c-ia">Configurar</button></div></div>`;
      $('c-dif').onclick = ev => { const b = ev.target.closest('.card-op'); if (!b) return; d.dificuldade = b.dataset.k; $('c-dif').querySelectorAll('.card-op').forEach(x => x.setAttribute('aria-pressed', x === b)); };
      $('c-ano').onchange = ev => { d.ano = +ev.target.value; }; $('c-mes').onchange = ev => { d.mes0 = +ev.target.value; };
      $('c-ia').onclick = () => abrirIA(() => desenharCriacao());
    }
    desenharPrevia();
  }
  function escolherCor(F) { const lum = h => { const c = h.replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); return (r * 299 + g * 587 + b * 114) / 1000; }; const cs = [F.c1, F.c2, F.c3].filter(c => lum(c) > 40 && lum(c) < 215); return cs[0] || '#b8262b'; }
  function finalizarCriacao() {
    const d = cri.d;
    R.novoJogo({ nome: d.nome.trim(), sigla: d.sigla.trim().toUpperCase(), tipo: d.tipo, vertente: d.vertente, lema: d.lema, lider: d.lider, manifesto: d.manifesto, doutrina: d.doutrina, base: d.base, sede: d.sede, tamanho: d.tamanho, cor: d.cor, dificuldade: d.dificuldade, ano: d.ano, mes0: d.mes0, bandeira: bandeiraURL() });
    S().jornal = []; iniciarJogo(true);
  }

  // ================= JOGO =================
  function iniciarJogo(novo) {
    tela('jogo'); fecharModal();
    if (!renderPronto) { Render.init($('mapa'), { click: cliqueMapa, hover: passarMapa, right: cancelarMira, fase: legendaFase, politica: () => {}, som }); renderPronto = true; ligarControles(); }
    else Render.sincronizar();
    Render.selecionar(null); Render.setAlvos(null); fecharFicha();
    atualizar();
    if (novo) {
      narrar(`${S().org.sigla} — ${R.dataTxt()}`, `Nasce a ${S().org.nome}. ${S().org.lema ? '“' + S().org.lema + '”. ' : ''}A luta começa em ${ST[S().org.sede].n}.`);
      setTimeout(() => { Render.focar(ST[S().org.sede].anchor, 1.6); }, 60);
      if (!localStorage.getItem('revbr_viu_ajuda')) { try { localStorage.setItem('revbr_viu_ajuda', '1'); } catch (e) { } setTimeout(() => abrirAjuda(true), 400); }
    } else { const j = (S().jornal || [])[0]; narrar(j ? j.data : R.dataTxt(), j ? j.narracao : 'A partida continua.'); }
    if (S().fim) mostrarFim();
  }
  function narrar(peq, txt) { $('narra').innerHTML = `<small>${esc(peq)}</small>${esc(txt)}`; }
  function legendaFase(txt) { if (txt) narrar('Neste mês', txt); }

  function ligarControles() {
    $('zi').onclick = () => Render.cam.zoomIn(); $('zo').onclick = () => Render.cam.zoomOut(); $('zf').onclick = () => Render.cam.fit();
    const modos = [['frentes', 'Frentes'], ['apoio', 'Apoio'], ['nucleos', 'Núcleos'], ['repressao', 'Repressão'], ['suprimento', 'Suprimento']];
    $('modos').innerHTML = modos.map(([k, t], i) => `<button data-m="${k}" aria-pressed="${k === Render.modo}" title="Tecla ${i + 1}">${t}</button>`).join('');
    $('modos').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; setModo(b.dataset.m); };
    $('turno').onclick = encerrarMes;
    $('btn-org').onclick = () => abrirOrganizacao();
    $('btn-diplo').onclick = () => abrirDiplomacia();
    $('btn-menu').onclick = () => abrirMenu();
    $('btn-jornal').onclick = () => abrirJornal();
    $('btn-conselho').onclick = () => abrirConselheiro();
    $('btn-plano').onclick = () => $('plano').classList.toggle('aberto-m');
    $('plano-tog').onclick = () => { $('plano').classList.toggle('fechado'); $('plano-tog').textContent = $('plano').classList.contains('fechado') ? '+' : '–'; };
    $('mira-x').onclick = cancelarMira;
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { if (!$('modal').hidden) { fecharModal(); return; } if (mira) { cancelarMira(); return; } fecharFicha(); return; }
      if ($('jogo').hidden || !$('modal').hidden || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      const i = +ev.key; if (i >= 1 && i <= 5) setModo(['frentes', 'apoio', 'nucleos', 'repressao', 'suprimento'][i - 1]);
      if (ev.key === ' ' && Render.tocando) { ev.preventDefault(); Render.pular(); }
    });
  }
  function setModo(m) { Render.setModo(m); document.querySelectorAll('#modos button').forEach(x => x.setAttribute('aria-pressed', x.dataset.m === m)); atualizarLegenda(); }

  // ---------------- barra superior e plano ----------------
  function atualizar() {
    const s = S(); if (!s) return;
    if (!s.org.bandeira) s.org.bandeira = Bandeira.svgToDataUrl(Bandeira.render({ layout: 'triangulo', c1: '#1d1a17', c2: s.org.cor, c3: s.org.cor, emblem: 'estrela', ce: '#f4ecd9', emblemSize: 46, emblemPos: 'tralha', text: s.org.sigla, ct: '#f4ecd9', textSize: 34 }));
    $('topo-bandeira').src = s.org.bandeira || ''; $('topo-nome').textContent = s.org.nome; $('topo-tipo').textContent = `${s.org.tipo} · ${s.insurreicao ? 'Em insurreição' : s.legal ? 'Partido legal' : s.armado ? 'Luta armada' : 'Clandestina'}`;
    $('data').textContent = R.dataTxt(); $('num').textContent = s.turno + 1; $('sub-data').textContent = s.insurreicao ? 'Situação das frentes' : 'Situação da organização';
    const r = s.rec; const comb = R.combatentes();
    const itens = [
      ['Militantes', fmtN(r.militantes), 'Membros organizados. Viram combatentes, quadros e pagam contribuições.', r.militantes < 200 ? 'ruim' : ''],
      ['Combatentes', fmtN(comb), 'Soma do efetivo das suas tropas.'],
      ['Fundos', R.fmtF(r.fundos - R.fundosReservados()), `Caixa disponível depois do que já está programado (total ${R.fmtF(r.fundos)}).`, r.fundos < 50 ? 'ruim' : ''],
      ['Armas', fmtN(r.armas), 'Arsenal para equipar novas tropas e reforços.', r.armas < 100 ? 'aviso' : ''],
      ['Apoio', pct(R.apoioNacional()), 'Apoio popular médio no país, ponderado pela população.'],
      ['População', pct(R.parcelaPop(1) * 100), 'Parcela da população vivendo em território que vocês controlam.'],
      ['Coesão', pct(r.coesao), 'Unidade interna. Em zero a organização racha e o jogo acaba.', r.coesao < 35 ? 'ruim' : r.coesao < 55 ? 'aviso' : ''],
      ['Visibilidade', pct(r.visib), 'Quanto a polícia sabe de vocês. Alta visibilidade = mais prisões.', r.visib > 65 ? 'ruim' : r.visib > 45 ? 'aviso' : ''],
      ['Legitimidade', pct(r.legit), 'Como o povo vê a organização. Afeta o crescimento do apoio.'],
      ['Governo', `${Math.round(s.gov.legit)}/${Math.round(s.gov.estab)}`, `Legitimidade ${Math.round(s.gov.legit)}% e estabilidade ${Math.round(s.gov.estab)}% do governo. Economia ${Math.round(s.gov.econ)}%, mobilização militar ${Math.round(s.gov.mobil)}%.`]
    ];
    $('recursos').innerHTML = itens.map(([n, v, t, c]) => `<div title="${esc(t)}">${n}<b class="${c || ''}">${v}</b></div>`).join('');
    $('pa').innerHTML = `Pontos de ação<b>${R.paDisponivel()} / ${R.paTotal()}</b>`;
    $('btn-conselho').hidden = !IA.ativo('conselheiro');
    atualizarPlano(); atualizarLegenda();
  }
  function atualizarLegenda() {
    const s = S(); const m = Render.modo; const cor = s.org.cor;
    const l = { frentes: [[cor, `Território da ${s.org.sigla}`], ...(R.parcelaArea(2) > 0 ? [['#34456a', 'Liga Federalista do Sul']] : []), ...(R.parcelaArea(3) > 0 ? [['#4d3b26', 'Comando Nacional']] : []), ['repeating-linear-gradient(90deg,#d81a20 0 6px,transparent 6px 9px)', 'Linha de frente'], ['#e3e1d4', 'Governo (sem cor)']],
      apoio: [[cor, 'Apoio popular à organização (mais forte = mais apoio)']], nucleos: [[cor, 'Núcleos organizados (até 10 por estado)']], repressao: [['#1e2028', 'Repressão policial e militar']],
      suprimento: [['#508c3c', 'Tropa abastecida'], ['#dca028', 'Suprimento baixo'], ['#c81e1e', 'Sem suprimento / cercada']] }[m];
    $('legenda').innerHTML = l.map(([c, t]) => `<div><i style="background:${c}"></i>${esc(t)}</div>`).join('');
  }
  function atualizarPlano() {
    const s = S(); const itens = [];
    s.politicas.forEach((p, i) => { const a = R.POL[p.id]; const nome = a ? a.nome : (p.texto || 'Ação'); const custo = a ? `${a.pa} PA${a.f ? ' · ' + R.fmtF(a.f) : ''}` : `${p.pa || 1} PA`; itens.push(`<div class="item"><div>${esc(nome)}<small>${p.s != null ? esc(ST[p.s].n) + ' · ' : ''}${custo}${p.feito ? ' · já feita' : ''}</small></div>${p.feito ? '' : `<button data-p="${i}" aria-label="Cancelar">×</button>`}</div>`); });
    const pinc = new Set(R.pincas());
    s.ordens.forEach(o => { const u = R.unidade(o.uid); if (!u) return; const pin = (o.tipo === 'atacar' || o.tipo === 'travessia') && pinc.has(o.alvo); itens.push(`<div class="item"><div>${esc(u.nome)}<small>${esc(R.ORD[o.tipo].nome)}${o.alvo != null ? ' → ' + esc(ST[o.alvo].n) : ''}${pin ? ' · PINÇA +30%' : ''}${M.rio(u.s, o.alvo ?? u.s) && o.tipo === 'atacar' ? ' · cruza o ' + M.rio(u.s, o.alvo) + ' (−30%)' : ''}</small></div><button data-o="${o.uid}" aria-label="Cancelar">×</button></div>`); });
    $('plano-lista').innerHTML = itens.length ? itens.join('') : `<div class="vazio">Nada programado. Clique num estado para agir politicamente ou numa tropa sua para dar ordens. <button class="btn claro peq" id="btn-nac" style="margin-top:8px">Ações nacionais</button></div>`;
    if (itens.length) $('plano-lista').insertAdjacentHTML('beforeend', `<div style="padding:8px 12px"><button class="btn claro peq" id="btn-nac">Ações nacionais</button></div>`);
    $('btn-nac').onclick = abrirNacionais;
    $('plano-lista').querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { R.cancelarPolitica(+b.dataset.p); atualizar(); }; });
    $('plano-lista').querySelectorAll('[data-o]').forEach(b => { b.onclick = () => { R.cancelarOrdem(+b.dataset.o); atualizar(); }; });
    $('plano-rodape').innerHTML = `<span>PA ${R.paTotal() - R.paDisponivel()}/${R.paTotal()}</span><span>Reservado ${R.fmtF(R.fundosReservados())}</span>`;
  }

  // ---------------- mapa: clique, dica, mira ----------------
  function passarMapa(m, ev, u, s) {
    const d = $('dica'); if (!m || Render.tocando) { d.hidden = true; return; }
    let txt = '';
    if (u) txt = `${u.nome} · ${R.fac(u.f).curto}`;
    else if (s) { const c = M.controle(s.idx); const e = S().e[s.idx]; txt = `${s.n} · apoio ${Math.round(e.apoio)}%${c[1] > 0.005 ? ' · ' + S().org.sigla + ' ' + Math.round(c[1] * 100) + '%' : ''}${mira && Render && mira.alvos.includes(s.idx) ? ' · clique para confirmar' : ''}`; }
    if (!txt) { d.hidden = true; return; }
    const r = $('mapa-wrap').getBoundingClientRect(); d.hidden = false; d.textContent = txt; d.style.left = (ev.clientX - r.left) + 'px'; d.style.top = (ev.clientY - r.top) + 'px';
  }
  function cliqueMapa(m, u, s, ev) {
    if (ocupado) return;
    if (mira) { if (s && mira.alvos.includes(s.idx)) { const r = R.darOrdem(mira.u, mira.tipo, s.idx); if (r) toast(r); else { som('clique'); toast(`${R.ORD[mira.tipo].nome}: ${mira.u.nome} → ${s.n}`); } const u0 = mira.u; cancelarMira(); atualizar(); abrirFichaUnidade(u0, ev); } return; }
    if (u) abrirFichaUnidade(u, ev); else if (s) abrirFichaEstado(s.idx, ev); else fecharFicha();
  }
  function entrarMira(u, tipo) {
    const alvos = R.alvosValidos(u, tipo); if (!alvos.length) { toast('Nenhum alvo ao alcance.'); return; }
    mira = { u, tipo, alvos }; Render.setAlvos(alvos); fecharFicha(false);
    $('mira-txt').textContent = `${R.ORD[tipo].nome}: escolha o estado marcado`; $('mira').hidden = false;
  }
  function cancelarMira() { mira = null; Render.setAlvos(null); $('mira').hidden = true; }
  function posicionarFicha(ev) {
    const f = $('ficha'); const r = $('mapa-wrap').getBoundingClientRect();
    if (innerWidth <= 760 || !ev) { f.style.left = ''; f.style.top = ''; return; }
    const x = ev.clientX - r.left, y = ev.clientY - r.top; const w = f.offsetWidth, h = f.offsetHeight;
    f.style.left = Math.max(12, Math.min(r.width - w - 12, x + (x > r.width / 2 ? -w - 24 : 24))) + 'px';
    f.style.top = Math.max(12, Math.min(r.height - h - 12, y - 60)) + 'px';
  }
  function fecharFicha(limparSel = true) { $('ficha').hidden = true; if (limparSel) Render.selecionar(null); }
  function cab(img, sup, titulo) { return `<header>${img ? `<img src="${esc(img)}" alt="">` : ''}<div><p>${esc(sup)}</p><h3>${esc(titulo)}</h3></div><button class="fechar" aria-label="Fechar">×</button></header>`; }
  function abrirFichaUnidade(u, ev) {
    const s = S(); Render.selecionar({ tipo: 'unidade', id: u.id }); const f = $('ficha');
    const T = R.TIPOS[u.tipo]; const est = ST[u.s];
    const exato = u.f === 1 || R.tem('inteligencia') || s.unidades.some(x => x.f === 1 && (x.s === u.s || est.viz.some(v => v.s === x.s))) || s.e[u.s].nucleos >= 2;
    const ordem = s.ordens.find(o => o.uid === u.id);
    const flag = u.f === 1 ? s.org.bandeira : null;
    let html = cab(flag, `${R.fac(u.f).nome} · ${T.nome}`, u.nome);
    html += `<div class="dados"><div>Efetivo<b>${exato ? fmtN(u.forca) : '≈ ' + fmtN(Math.round(u.forca / 1000) * 1000)}</b></div><div>Moral<b>${exato ? u.moral + '%' : '?'}</b></div><div>Suprimento<b>${exato ? Math.round(u.sup) + '%' : '?'}</b></div>
      ${u.f === 1 ? `<div>Equipamento<b>${Math.round(u.equip * 100)}%</b></div><div>Experiência<b>${u.xp.toFixed(1)}</b></div><div>Força máx.<b>${fmtN(u.max)}</b></div>` : ''}</div>`;
    const postura = { normal: 'em campo', fortificada: `entrincheirada (+${u.entr * 15}% defesa)`, elastica: 'em defesa elástica', cercada: 'CERCADA num bolsão: sem saída, pode se render', isolada: 'sem suprimento, vivendo da rede clandestina (núcleos no estado ajudam)' }[u.post] || u.post;
    html += `<div class="rolar"><div class="terr">${esc(est.n)} · ${esc(M.TERRENO[est.ter].nome)}. A tropa está ${postura}.${u.f === 1 && u.sup < 35 ? ' Sem suprimento ela perde gente e moral todo mês: reconecte ao seu território ou recue.' : ''}${ordem ? `<br><b>Ordem do mês:</b> ${esc(R.ORD[ordem.tipo].nome)}${ordem.alvo != null ? ' → ' + esc(ST[ordem.alvo].n) : ''}` : ''}</div>`;
    if (u.f === 1) {
      html += `<div class="sec">Ordens militares</div><div class="ordens">${Object.entries(R.ORD).map(([k, o]) => { if (o.so && u.tipo !== o.so) return ''; const r = R.podeOrdem(u, k); const pa = o.pa(); return `<button data-o="${k}" ${r ? 'disabled' : ''} class="${ordem && ordem.tipo === k ? 'on' : ''}" title="${esc(r || o.desc)}">${esc(o.nome)}<span>${pa ? pa + ' PA · ' : ''}${esc(r || o.desc)}</span></button>`; }).join('')}${ordem ? '<button data-o="_cancel" class="largo">Cancelar a ordem<span>A tropa fica parada neste mês.</span></button>' : ''}</div>`;
    }
    html += '</div>';
    f.innerHTML = html; f.hidden = false; posicionarFicha(ev);
    f.querySelector('.fechar').onclick = () => fecharFicha();
    f.querySelectorAll('[data-o]').forEach(b => { b.onclick = () => { const k = b.dataset.o; if (k === '_cancel') { R.cancelarOrdem(u.id); atualizar(); abrirFichaUnidade(u, null); return; } if (R.ORD[k].alvo) { entrarMira(u, k); return; } const r = R.darOrdem(u, k); if (r) toast(r); else { som('clique'); toast(`${u.nome}: ${R.ORD[k].nome.toLowerCase()}`); } atualizar(); abrirFichaUnidade(u, null); }; });
  }
  function abrirFichaEstado(si, ev) {
    const s = S(); const st = ST[si]; const e = s.e[si]; const c = M.controle(si); Render.selecionar({ tipo: 'estado', s: si });
    const f = $('ficha');
    const rios = st.viz.map(v => M.rio(si, v.s) ? `${M.rio(si, v.s)} (divisa com ${ST[v.s].id})` : null).filter(Boolean);
    const garn = s.e[si].guarn * c[0];
    let html = cab(null, `${st.reg} · capital ${st.cap}`, `${st.n} (${st.id})`);
    html += `<div class="dados"><div>População<b>${st.pop.toLocaleString('pt-BR')} mi</b></div><div>Apoio<b>${Math.round(e.apoio)}%</b></div><div>Núcleos<b>${e.nucleos}/10</b></div>
      <div>${esc(s.org.sigla)}<b>${Math.round(c[1] * 100)}%</b></div><div>Governo<b>${Math.round(c[0] * 100)}%</b></div><div>Repressão<b>${Math.round(e.repressao)}%</b></div>
      <div>Guarnição<b>${garn > 0 ? '≈ ' + fmtN(Math.round(garn / 100) * 100) : '—'}</b></div><div>Infiltração<b>${e.infiltr}/5</b></div><div>Sindical<b>${e.sindical}/5</b></div></div>`;
    html += `<div class="rolar"><div class="terr">${esc(M.TERRENO[st.ter].nome)}: defesa ×${M.TERRENO[st.ter].def}, guerrilha ×${M.TERRENO[st.ter].guer}.${rios.length ? ' Rios na divisa: ' + esc(rios.join(', ')) + '.' : ''}${c[2] > 0.01 ? ` Liga do Sul controla ${Math.round(c[2] * 100)}%.` : ''}${c[3] > 0.01 ? ` Comando Nacional controla ${Math.round(c[3] * 100)}%.` : ''}${e.gp ? ' <b>Governo popular instalado.</b>' : ''}${e.apoioPOU > 3 ? ` O POU tem ${Math.round(e.apoioPOU)}% de apoio aqui.` : ''}</div>`;
    const acoes = Object.entries(R.POL).filter(([k, a]) => a.alvo === 'estado');
    html += `<div class="sec">Ações no estado</div><div class="ordens">${acoes.map(([k, a]) => { const r = R.podePolitica(k, si); return `<button data-a="${k}" ${r ? 'disabled' : ''} title="${esc(r || a.desc)}">${esc(a.nome)}<span>${a.pa} PA${a.f ? ' · ' + R.fmtF(a.f) : ''} · ${esc(r || a.desc)}</span></button>`; }).join('')}
      <button data-x="formar" class="largo">Formar tropa…<span>${esc(['guerrilha', 'milicia', 'infantaria'].map(t => R.podeFormar(t, si)).every(Boolean) ? R.podeFormar('guerrilha', si) : 'Converte militantes e armas numa unidade.')}</span></button>
      ${IA.ativo('livres') ? '<button data-x="livre" class="largo">Ação livre (IA)…<span>Escreva qualquer ação; a IA avalia custo, chance e efeito.</span></button>' : ''}</div></div>`;
    f.innerHTML = html; f.hidden = false; posicionarFicha(ev);
    f.querySelector('.fechar').onclick = () => fecharFicha();
    f.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => { const r = R.programarPolitica(b.dataset.a, si); if (r) toast(r); else { som('clique'); toast(`${R.POL[b.dataset.a].nome} programada em ${st.n}`); } atualizar(); abrirFichaEstado(si, null); }; });
    const fb = f.querySelector('[data-x=formar]'); if (fb) fb.onclick = () => abrirFormar(si);
    const lb = f.querySelector('[data-x=livre]'); if (lb) lb.onclick = () => abrirLivre(si);
  }

  // ---------------- formar tropa ----------------
  function abrirFormar(si) {
    const s = S(); let tipo = ['guerrilha', 'milicia', 'infantaria', 'motorizada', 'artilharia'].find(t => !R.podeFormar(t, si)) || 'guerrilha';
    const desenha = doc => {
      const T = R.TIPOS[tipo]; const r = R.podeFormar(tipo, si); const max = Math.max(T.min, Math.min(s.rec.militantes - 50, 8000)); const n = Math.min(max, Math.max(T.min, +(doc.querySelector('#fz-n') || {}).value || Math.min(max, 800)));
      const c = R.custoFormar(tipo, n); const equip = c.armas ? Math.min(1, s.rec.armas / c.armas) : 1;
      doc.querySelector('.conteudo').innerHTML = `<p>Estado: <b>${esc(ST[si].n)}</b>. Disponível: ${fmtN(s.rec.militantes)} militantes, ${fmtN(s.rec.armas)} armas, ${R.fmtF(s.rec.fundos - R.fundosReservados())}.</p>
        <div class="cards">${['guerrilha', 'milicia', 'infantaria', 'motorizada', 'artilharia'].map(k => { const t = R.TIPOS[k]; const rr = R.podeFormar(k, si); return `<button class="card-op" data-t="${k}" aria-pressed="${k === tipo}"><b>${t.nome}</b><span>Ataque ×${t.atk} · defesa ×${t.def}${t.guer ? ' · bônus de terreno' : ''}${t.rapida ? ' · rápida' : ''}${t.barragem ? ' · barragem' : ''}. Mín. ${t.min}.${rr ? '<br><i>' + esc(rr) + '</i>' : ''}</span></button>`; }).join('')}</div>
        <div class="campo"><label for="fz-n">Efetivo: <b id="fz-v">${fmtN(n)}</b></label><input type="range" id="fz-n" min="${T.min}" max="${max}" step="50" value="${n}"></div>
        <div class="campo"><label for="fz-nome">Nome da tropa</label><input type="text" id="fz-nome" maxlength="40" placeholder="Deixe vazio para nome automático"></div>
        <p>Custo: <b>${fmtN(n)}</b> militantes, <b>${fmtN(c.armas)}</b> armas, <b>${R.fmtF(c.fundos)}</b> e 1 PA. Equipamento previsto: <b>${Math.round(Math.max(0.15, equip) * 100)}%</b>${equip < 0.6 ? ' — pouca arma deixa a tropa fraca.' : '.'}</p>
        ${r ? `<div class="erro">${esc(r)}</div>` : ''}`;
      doc.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { tipo = b.dataset.t; desenha(doc); }; });
      const sl = doc.querySelector('#fz-n'); sl.oninput = () => desenha(doc);
      doc.querySelector('footer [data-b="0"]').disabled = !!r;
    };
    modal({ titulo: 'Formar tropa', html: '', botoes: [{ txt: 'Formar', acao: () => { const d = $('modal'); const n = +d.querySelector('#fz-n').value; const nome = d.querySelector('#fz-nome').value.trim(); const u = R.formarUnidade(tipo, si, n, nome || undefined); if (typeof u === 'string') { toast(u); return; } fecharModal(); som('marcha'); Render.sincronizar(); atualizar(); toast(`${u.nome} formada.`); abrirFichaUnidade(u, null); } }, { txt: 'Cancelar', classe: 'claro' }], aoAbrir: desenha });
  }

  // ---------------- ação livre (IA) ----------------
  function abrirLivre(si) {
    let aval = null;
    modal({ titulo: 'Ação livre', html: `<p>Descreva o que a organização vai fazer em <b>${si != null ? esc(ST[si].n) : 'todo o país'}</b>. A IA avalia custo, chance e efeitos; as regras do jogo limitam o resultado.</p>
      <div class="campo"><label for="lv-t">Ação</label><textarea id="lv-t" maxlength="400" placeholder="Ex.: infiltrar o sindicato dos portuários de Santos para preparar uma greve no porto"></textarea></div><div id="lv-r"></div>`,
      botoes: [{ txt: 'Avaliar', acao: async () => { const t = $('lv-t').value.trim(); if (!t) return; $('lv-r').innerHTML = '<p><i>Avaliando...</i></p>'; try { aval = await IA.avaliarAcao(t, si != null ? ST[si].n : null, R.resumo()); $('lv-r').innerHTML = aval.viavel === false ? `<div class="erro">Inviável: ${esc(aval.motivo || '')}</div>` : `<div class="aviso">Custo: ${aval.pa} PA e ${R.fmtF(aval.fundos)}. Chance: ${Math.round(aval.chance * 100)}%.<br>Se der certo: ${esc(efeitosTxt(aval.efeitos))}<br>Se der errado: ${esc(efeitosTxt(aval.falha))}</div>`; $('modal').querySelector('[data-b="1"]').disabled = aval.viavel === false; } catch (e) { $('lv-r').innerHTML = `<div class="erro">${esc(e.message)}</div>`; } } },
        { txt: 'Programar', desabilitado: true, acao: () => { if (!aval) return; const r = R.programarLivre($('lv-t').value.trim(), si, aval); if (r) { toast(r); return; } fecharModal(); atualizar(); toast('Ação livre programada.'); } }, { txt: 'Cancelar', classe: 'claro' }] });
  }
  function efeitosTxt(ef) { if (!ef || !Object.keys(ef).length) return 'nada muda'; return Object.entries(ef).map(([k, v]) => typeof v === 'object' ? k + ' ' + JSON.stringify(v) : `${k.replace(/_/g, ' ')} ${v > 0 ? '+' : ''}${v}`).join(', '); }

  // ---------------- ações nacionais ----------------
  function abrirNacionais() {
    const acoes = Object.entries(R.POL).filter(([k, a]) => a.alvo === 'nacional');
    modal({ titulo: 'Ações nacionais', html: `<div class="ordens" style="padding:0;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${acoes.map(([k, a]) => { const r = R.podePolitica(k, null); return `<button data-a="${k}" ${r ? 'disabled' : ''}>${esc(a.nome)}<span>${a.pa} PA${a.f ? ' · ' + R.fmtF(a.f) : ''} · ${esc(r || a.desc)}</span></button>`; }).join('')}
      ${IA.ativo('livres') ? '<button data-x="livre" class="largo">Ação livre nacional (IA)…<span>Qualquer ação de alcance nacional.</span></button>' : ''}</div>`,
      aoAbrir: doc => { doc.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => { const r = R.programarPolitica(b.dataset.a, null); if (r) toast(r); else { toast(`${R.POL[b.dataset.a].nome} programada.`); fecharModal(); atualizar(); } }; }); const l = doc.querySelector('[data-x=livre]'); if (l) l.onclick = () => abrirLivre(null); } });
  }

  // ================= TURNO =================
  async function encerrarMes() {
    if (ocupado || Render.tocando) { Render.pular(); return; }
    const s = S(); if (s.fim) { mostrarFim(); return; }
    if (s.eventos.length) { await mostrarEventos(); if (s.fim) { mostrarFim(); return; } }
    ocupado = true; $('turno').disabled = true; cancelarMira(); fecharFicha(); $('plano').classList.remove('aberto-m');
    try {
      // estratégia do governo pela IA (opcional)
      s.iaGov = null;
      if (IA.ativo('governo')) { narrar('Brasília', 'O governo traça sua estratégia...'); try { s.iaGov = await comTempo(IA.governo(R.resumo()), IA.cfg.prov === 'manual' ? 600000 : 30000); } catch (e) { toast('IA do governo falhou; o governo usa as regras. ' + e.message, 4000); } }
      const antes = s.unidades.map(u => ({ ...u, pos: u.pos.slice() }));
      Render.limparMarcas();
      const res = R.resolverTurno();
      atualizarPlano();
      $('turno').textContent = 'Pular animação ▸▸'; $('turno').disabled = false;
      if (s.iaGov && s.iaGov.declaracao) narrar('Pronunciamento do presidente', '“' + s.iaGov.declaracao + '”');
      await Render.reproduzir(res, antes, { velocidade: prefs.vel });
      $('turno').textContent = 'Encerrar o mês ▸';
      // narração
      const rel = res.relatorio; const padrao = narracaoPadrao(rel);
      const entrada = { data: rel.data, narracao: padrao, log: rel.log.filter(l => l.imp >= 2).map(l => ({ texto: l.texto, tipo: l.tipo })) };
      s.jornal = s.jornal || []; s.jornal.unshift(entrada); if (s.jornal.length > 80) s.jornal.pop();
      narrar(rel.data, padrao);
      if (IA.ativo('narrador')) { narrar(rel.data, padrao + ' …'); IA.narrar(rel, R.resumo()).then(t => { if (t) { entrada.narracao = t; narrar(rel.data, t); autosave(); } }).catch(e => { narrar(rel.data, padrao); if (IA.cfg.prov !== 'manual') toast('Narrador: ' + e.message, 3500); }); }
      // evento criado pela IA (opcional)
      if (IA.ativo('eventos') && Math.random() < 0.3 && !s.fim) { try { const ev = await comTempo(IA.evento(R.resumo()), IA.cfg.prov === 'manual' ? 600000 : 30000); s.eventos.push(ev); } catch (e) { } }
      atualizar(); autosave();
      if (s.fim) { mostrarFim(); return; }
      if (s.eventos.length) await mostrarEventos();
      atualizar();
      if (s.fim) { mostrarFim(); return; }
      if (prefs.relatorio) mostrarRelatorio(rel);
      autosave();
    } catch (e) { console.error(e); toast('Erro no turno: ' + e.message, 5000); }
    finally { ocupado = false; $('turno').disabled = false; $('turno').textContent = 'Encerrar o mês ▸'; atualizar(); }
  }
  function narracaoPadrao(rel) {
    const ord = rel.log.filter(l => l.imp >= 3).concat(rel.log.filter(l => l.imp === 2));
    if (!ord.length) return 'Um mês de trabalho silencioso. A organização cresce longe dos olhos do país.';
    return ord.slice(0, 2).map(l => l.texto).join(' ');
  }
  function mostrarEventos() {
    return new Promise(resolve => {
      const prox = () => {
        const s = S(); if (!s.eventos.length || s.fim) { fecharModal(); resolve(); return; }
        const ev = s.eventos[0]; const ops = R.opcoesEvento(ev);
        modal({ titulo: 'Edição extra', fechavel: false, html: `<div class="jornal"><div class="extra">EXTRA! · ${esc(R.dataTxt())}</div><div class="manchete">${esc(ev.titulo)}</div><p style="margin-top:8px">${esc(ev.texto)}</p></div><div class="escolhas">${ops.map((o, i) => `<button data-i="${i}">${esc(o)}</button>`).join('')}</div>`,
          aoAbrir: doc => { doc.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => { const r = R.resolverEvento(0, +b.dataset.i); atualizar(); doc.querySelector('.conteudo').innerHTML = `<div class="jornal"><div class="manchete">${esc(ev.titulo)}</div><p style="margin-top:8px">${esc(r)}</p></div><div><button class="btn papel" id="ev-ok">Continuar</button></div>`; doc.querySelector('#ev-ok').onclick = prox; doc.querySelector('#ev-ok').focus(); }; }); } });
      };
      prox();
    });
  }
  function mostrarRelatorio(rel) {
    const s = S(); const d = (a, b, f = fmtN) => { const v = b - a; return `${f(b)} <small style="color:${v >= 0 ? 'var(--bom)' : 'var(--ruim)'}">${v >= 0 ? '+' : ''}${f(v)}</small>`; };
    const ant = s.historico.length > 1 ? s.historico[s.historico.length - 2] : null;
    const linhas = rel.log.slice().sort((a, b) => b.imp - a.imp);
    modal({ titulo: `Relatório de ${rel.data}`, classe: 'largo', html: `<div class="jornal"><div class="extra">${esc(s.org.sigla)} · BOLETIM INTERNO</div><div class="manchete">${esc((linhas[0] || { texto: 'Mês sem grandes combates' }).texto.split(':')[0].slice(0, 90))}</div></div>
      <table class="tabela"><tr><th>Indicador</th><th class="n">Agora</th></tr>
      <tr><td>População controlada</td><td class="n">${(rel.popDepois * 100).toFixed(1)}% <small>(${rel.popDepois >= rel.popAntes ? '+' : ''}${((rel.popDepois - rel.popAntes) * 100).toFixed(1)})</small></td></tr>
      <tr><td>Militantes</td><td class="n">${ant ? d(ant.mil, s.rec.militantes) : fmtN(s.rec.militantes)}</td></tr><tr><td>Combatentes</td><td class="n">${ant ? d(ant.comb, R.combatentes()) : fmtN(R.combatentes())}</td></tr>
      <tr><td>Apoio nacional</td><td class="n">${R.apoioNacional().toFixed(1)}%</td></tr><tr><td>Fundos / armas</td><td class="n">${R.fmtF(s.rec.fundos)} / ${fmtN(s.rec.armas)}</td></tr>
      <tr><td>Governo: legitimidade / estabilidade / economia</td><td class="n">${Math.round(s.gov.legit)}% / ${Math.round(s.gov.estab)}% / ${Math.round(s.gov.econ)}%</td></tr></table>
      <h3>Acontecimentos</h3><div>${linhas.length ? linhas.map(l => `<div class="log-item ${l.tipo}">${esc(l.texto)}</div>`).join('') : '<p>Nada digno de nota.</p>'}</div>`,
      botoes: [{ txt: 'Continuar', classe: 'papel' }, { txt: 'Não mostrar mais', classe: 'claro', acao: () => { prefs.relatorio = false; salvarPrefs(); fecharModal(); toast('Relatório desligado. Religue no Menu.'); } }] });
  }

  // ================= MODAIS =================
  function abrirOrganizacao(aba = 'perfil') {
    const s = S(); const o = s.org;
    const abas = [['perfil', 'Perfil'], ['teses', 'Teses'], ['estados', 'Estados'], ['estat', 'Estatísticas']];
    const corpo = () => {
      if (aba === 'perfil') return `<div style="display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:start"><img src="${esc(o.bandeira || '')}" alt="Bandeira" style="width:150px;aspect-ratio:3/2;object-fit:cover;box-shadow:0 0 0 2px var(--tinta)"><div style="display:grid;gap:4px"><b style="font-family:var(--f-tit);font-size:24px;letter-spacing:.06em">${esc(o.sigla)} — ${esc(o.nome)}</b><span>${esc(o.tipo)} · ${esc(o.vertente)} · ${esc(R.DOUTRINAS[o.doutrina].nome)}</span><span>Base: ${esc(R.BASES_SOCIAIS[o.base].nome)} · sede em ${esc(ST[o.sede].n)}</span>${o.lider ? `<span>Direção: ${esc(o.lider)}</span>` : ''}${o.lema ? `<i>“${esc(o.lema)}”</i>` : ''}</div></div>
        <table class="tabela"><tr><td>Militantes</td><td class="n">${fmtN(s.rec.militantes)}</td><td>Quadros</td><td class="n">${fmtN(s.rec.quadros)}</td></tr><tr><td>Combatentes</td><td class="n">${fmtN(R.combatentes())}</td><td>Tropas</td><td class="n">${s.unidades.filter(u => u.f === 1).length}</td></tr><tr><td>Simpatizantes</td><td class="n">${fmtN(ST.reduce((a, x, i) => a + R.simp(i), 0))}</td><td>Núcleos</td><td class="n">${s.e.reduce((a, e) => a + e.nucleos, 0)}</td></tr><tr><td>Moral</td><td class="n">${Math.round(s.rec.moral)}%</td><td>Apoio internacional</td><td class="n">${Math.round(s.rec.intl)}%</td></tr><tr><td>Pontos de formação</td><td class="n">${Math.floor(s.rec.pf)}</td><td>Situação</td><td class="n">${s.insurreicao ? 'Insurreição' : s.legal ? 'Legal' : 'Clandestina'}</td></tr></table>
        ${o.manifesto ? `<h3>Manifesto</h3><p style="white-space:pre-wrap">${esc(o.manifesto)}</p>` : ''}
        <h3>Editar</h3><div class="linha2"><div class="campo"><label for="o-nome">Nome</label><input type="text" id="o-nome" value="${esc(o.nome)}" maxlength="60"></div><div class="campo"><label for="o-sig">Sigla</label><input type="text" id="o-sig" value="${esc(o.sigla)}" maxlength="10"></div></div>
        <div class="linha2"><div class="campo"><label for="o-vert">Vertente</label><input type="text" id="o-vert" value="${esc(o.vertente)}" maxlength="60"></div><div class="campo"><label for="o-lema">Lema</label><input type="text" id="o-lema" value="${esc(o.lema)}" maxlength="80"></div></div>
        <div class="campo"><label for="o-man">Manifesto</label><textarea id="o-man" maxlength="1500">${esc(o.manifesto)}</textarea></div>
        <div class="cores"><label class="rot" for="o-cor">Cor</label><input type="color" id="o-cor" value="${esc(o.cor)}"><button class="btn claro peq" id="o-band">Trocar bandeira (arquivo)</button>${IA.ativo('bandeira') ? '<button class="btn claro peq" id="o-band-ia">Nova bandeira por IA</button>' : ''}<button class="btn papel peq" id="o-salvar">Salvar mudanças</button></div>`;
      if (aba === 'teses') return `<p>Pontos de formação: <b>${Math.floor(s.rec.pf)}</b>. Ganhe formando quadros, publicando o jornal e fazendo congressos. Cada tese muda o jeito de jogar para sempre.</p><div class="grade-teses">${Object.entries(R.TESES).map(([k, t]) => { const r = R.podeTese(k); const ok = s.teses[k]; return `<div class="tese ${ok ? 'ok' : r && !/pontos/.test(r) ? 'bloq' : ''}"><b>${esc(t.nome)}</b><span>${esc(t.desc)}</span><small>${ok ? 'Adotada' : t.custo + ' pontos' + (t.req.length ? ' · exige ' + t.req.map(x => R.TESES[x].nome).join(', ') : '')}</small>${ok ? '' : `<button class="btn papel peq" data-t="${k}" ${r ? 'disabled title="' + esc(r) + '"' : ''}>Adotar</button>`}</div>`; }).join('')}</div>`;
      if (aba === 'estados') return `<div style="overflow-x:auto"><table class="tabela"><tr><th>Estado</th><th class="n">Pop.</th><th class="n">Apoio</th><th class="n">Núcleos</th><th class="n">Controle</th><th class="n">Repressão</th><th class="n">Infiltr.</th><th class="n">Sindical</th><th>Gov. popular</th></tr>${ST.map((x, i) => [x, i]).sort((a, b) => s.e[b[1]].apoio - s.e[a[1]].apoio).map(([x, i]) => { const e = s.e[i]; return `<tr><td><button class="btn claro peq" data-s="${i}" style="padding:3px 8px">${esc(x.n)}</button></td><td class="n">${x.pop}</td><td class="n">${Math.round(e.apoio)}%</td><td class="n">${e.nucleos}</td><td class="n">${Math.round(M.controle(i)[1] * 100)}%</td><td class="n">${Math.round(e.repressao)}%</td><td class="n">${e.infiltr}</td><td class="n">${e.sindical}</td><td>${e.gp ? 'Sim' : ''}</td></tr>`; }).join('')}</table></div>`;
      if (aba === 'estat') return `<canvas id="graf" style="width:100%;height:240px;background:#fffaf0;box-shadow:inset 0 0 0 1px var(--papel3)"></canvas><p style="font-size:13px"><span style="color:${esc(o.cor)}">■</span> população controlada · <span style="color:#2b2622">■</span> apoio nacional · <span style="color:#5b634e">■</span> legitimidade do governo · <span style="color:#c9952a">■</span> estabilidade do governo</p>
        <table class="tabela"><tr><td>Batalhas travadas</td><td class="n">${s.stats.batalhas}</td></tr><tr><td>Vitórias</td><td class="n">${s.stats.vitorias}</td></tr><tr><td>Rendições inimigas</td><td class="n">${s.stats.rendicoes}</td></tr><tr><td>Maior população controlada</td><td class="n">${(s.stats.maxPop * 100).toFixed(1)}%</td></tr><tr><td>Tropas do governo</td><td class="n">≈ ${fmtN(Math.round(R.combatentes(0) / 1000) * 1000)}</td></tr><tr><td>Teses adotadas</td><td class="n">${Object.keys(s.teses).length}</td></tr></table>`;
    };
    const doc = modal({ titulo: 'Organização', classe: 'largo', html: `<div class="abas" role="tablist">${abas.map(([k, t]) => `<button role="tab" data-a="${k}" aria-selected="${k === aba}">${t}</button>`).join('')}</div><div id="org-c">${corpo()}</div>`, aoAbrir: d => ligar(d) });
    function ligar(d) {
      d.querySelector('.abas').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; aba = b.dataset.a; d.querySelectorAll('.abas button').forEach(x => x.setAttribute('aria-selected', x === b)); d.querySelector('#org-c').innerHTML = corpo(); ligarCorpo(d); };
      ligarCorpo(d);
    }
    function ligarCorpo(d) {
      d.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { const r = R.adotarTese(b.dataset.t); if (r) toast(r); else { toast('Tese adotada.'); d.querySelector('#org-c').innerHTML = corpo(); ligarCorpo(d); atualizar(); } }; });
      d.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { fecharModal(); Render.focar(ST[+b.dataset.s].anchor, 2); abrirFichaEstado(+b.dataset.s, null); }; });
      const sv = d.querySelector('#o-salvar'); if (sv) sv.onclick = () => { o.nome = d.querySelector('#o-nome').value.trim() || o.nome; o.sigla = d.querySelector('#o-sig').value.trim().toUpperCase() || o.sigla; o.vertente = d.querySelector('#o-vert').value; o.lema = d.querySelector('#o-lema').value; o.manifesto = d.querySelector('#o-man').value; o.cor = d.querySelector('#o-cor').value; Render.marcarSujo(); atualizar(); autosave(); toast('Organização atualizada.'); d.querySelector('#org-c').innerHTML = corpo(); ligarCorpo(d); };
      const bb = d.querySelector('#o-band'); if (bb) bb.onclick = () => { const inp = $('arquivo-img'); inp.value = ''; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = async () => { try { o.bandeira = await Bandeira.normalizeImage(fr.result); atualizar(); autosave(); d.querySelector('#org-c').innerHTML = corpo(); ligarCorpo(d); } catch (e) { toast('Imagem inválida.'); } }; fr.readAsDataURL(f); }; inp.click(); };
      const bi = d.querySelector('#o-band-ia'); if (bi) bi.onclick = async () => { toast('Gerando a partir do nome, vertente e lema...'); try { const svg = await IA.bandeira(`bandeira que represente "${o.lema || o.vertente}"`, o); o.bandeira = Bandeira.svgToDataUrl(svg); atualizar(); autosave(); d.querySelector('#org-c').innerHTML = corpo(); ligarCorpo(d); } catch (e) { toast(e.message, 4000); } };
      const g = d.querySelector('#graf'); if (g) grafico(g);
    }
  }
  function grafico(cv) {
    const s = S(); const h = s.historico; const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; const g = cv.getContext('2d'); g.scale(2, 2);
    const W = r.width, H = r.height, p = 28; g.strokeStyle = '#d6cbb1'; g.lineWidth = 1; g.font = '10px Oswald'; g.fillStyle = '#6b6253';
    for (let v = 0; v <= 100; v += 25) { const y = H - p - (H - 2 * p) * v / 100; g.beginPath(); g.moveTo(p, y); g.lineTo(W - 8, y); g.stroke(); g.fillText(v + '%', 2, y + 3); }
    if (h.length < 2) { g.fillText('O gráfico aparece depois de alguns meses.', p + 10, H / 2); return; }
    const x = i => p + (W - p - 8) * i / (h.length - 1);
    const serie = (k, cor, esc = 1) => { g.strokeStyle = cor; g.lineWidth = 2; g.beginPath(); h.forEach((o, i) => { const y = H - p - (H - 2 * p) * Math.min(100, o[k] * esc) / 100; i ? g.lineTo(x(i), y) : g.moveTo(x(i), y); }); g.stroke(); };
    serie('gl', '#5b634e'); serie('ge', '#c9952a'); serie('apoio', '#2b2622'); serie('pop', s.org.cor, 100);
  }

  function abrirDiplomacia() {
    const s = S();
    const card = (f, img, status, rel, ids) => `<div class="fac"><img src="${esc(img)}" alt=""><div><b style="font-family:var(--f-tit);font-size:16px;letter-spacing:.04em;text-transform:uppercase">${esc(R.fac(f).nome)}</b><div style="font-size:14px">${status}</div>${rel != null ? `<div class="medidor" style="margin-top:6px" title="Relação ${Math.round(rel)}"><i style="width:${(rel + 100) / 2}%;background:${rel >= 0 ? 'var(--bom)' : 'var(--ruim)'}"></i></div>` : ''}<div class="acs">${ids.map(id => { const d = R.DIPLO[id]; const r = R.podeDiplo(id); return `<button class="btn ${r ? 'claro' : 'papel'} peq" data-d="${id}" ${r ? 'disabled' : ''} title="${esc(r || d.desc)}">${esc(d.nome)}</button>`; }).join('')}</div></div></div>`;
    const svg = x => Bandeira.svgToDataUrl(x);
    const html = `<p>Cada gesto diplomático custa 1 ponto de ação e tem efeito imediato.</p>
      ${card(0, svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#3c6e3a"/><polygon points="15,2 28,10 15,18 2,10" fill="#e3c34a"/><circle cx="15" cy="10" r="4.4" fill="#2c3f7a"/></svg>'), `Legitimidade ${Math.round(s.gov.legit)}% · estabilidade ${Math.round(s.gov.estab)}% · economia ${Math.round(s.gov.econ)}% · mobilização ${Math.round(s.gov.mobil)}%. Tropas ≈ ${fmtN(Math.round(R.combatentes(0) / 1000) * 1000)}.`, null, ['gov_negociar'])}
      ${card(2, svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#34456a"/><rect y="7" width="30" height="6" fill="#d9c27a"/></svg>'), s.liga.ativa ? `Em armas no Sul. ${s.liga.tregua ? '<b>Trégua com vocês.</b>' : 'Sem trégua.'} Separatistas de direita: inimigos do governo, mas não amigos de vocês.` : s.liga.derrotada ? 'Derrotada.' : 'Movimento separatista legal, crescendo no RS e em SC.', s.liga.rel, ['liga_tregua', 'liga_coord', 'liga_romper'])}
      ${card(3, svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#1d1a17"/><polygon points="15,3 21,17 9,17" fill="#c9a24a"/></svg>'), s.cdn.ativa ? 'Paramilitares de extrema direita. Caçam militantes e atacam núcleos. Não negociam.' : 'Ainda não surgiu. Aparece quando a organização fica visível ou pega em armas.', null, ['cdn_denunciar'])}
      ${card(4, svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#c27a2c"/><circle cx="15" cy="10" r="5" fill="#fff"/></svg>'), s.pou.ativo ? `Partido legal de esquerda, forte nas cidades (até ${Math.round(Math.max(...s.e.map(e => e.apoioPOU)))}% num estado). Pode virar aliado ou rival.` : 'Fundido à organização.', s.pou.ativo ? s.pou.rel : null, ['pou_aprox', 'pou_fusao', 'pou_disputa'])}`;
    modal({ titulo: 'Diplomacia', html, aoAbrir: d => { d.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const r = R.fazerDiplo(b.dataset.d); if (typeof r === 'string') toast(r); else { toast(r.texto, 4000); atualizar(); if (S().fim) { fecharModal(); mostrarFim(); return; } abrirDiplomacia(); } }; }); } });
  }

  function abrirMenu() {
    modal({ titulo: 'Menu', classe: 'estreito', html: `<div style="display:grid;gap:8px">
      <button class="btn papel" id="m-salvar">Salvar partida</button><button class="btn claro" id="m-carregar">Carregar partida</button>
      <button class="btn claro" id="m-ia">Inteligência artificial ${IA.ligada() ? '(ligada)' : '(desligada)'}</button><button class="btn claro" id="m-ajuda">Como jogar</button>
      <div class="campo"><label>Velocidade das animações</label><div class="abas">${[[0.75, 'Lenta'], [1.5, 'Normal'], [3, 'Rápida'], [8, 'Instantânea']].map(([v, t]) => `<button data-v="${v}" aria-selected="${prefs.vel === v}">${t}</button>`).join('')}</div></div>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="m-som" ${prefs.som ? 'checked' : ''}> Som</label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="m-rel" ${prefs.relatorio ? 'checked' : ''}> Relatório no fim de cada mês</label>
      <button class="btn claro" id="m-sair">Voltar à tela inicial</button></div>`,
      aoAbrir: d => {
        d.querySelector('#m-salvar').onclick = abrirSalvar; d.querySelector('#m-carregar').onclick = abrirCarregar; d.querySelector('#m-ia').onclick = () => abrirIA(); d.querySelector('#m-ajuda').onclick = () => abrirAjuda();
        d.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => { prefs.vel = +b.dataset.v; salvarPrefs(); d.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-selected', x === b)); }; });
        d.querySelector('#m-som').onchange = ev => { prefs.som = ev.target.checked; salvarPrefs(); };
        d.querySelector('#m-rel').onchange = ev => { prefs.relatorio = ev.target.checked; salvarPrefs(); };
        d.querySelector('#m-sair').onclick = () => { autosave(); fecharModal(); initInicio(); };
      } });
  }

  function abrirJornal() {
    const j = S().jornal || [];
    modal({ titulo: 'Jornal da guerra', classe: 'largo', html: j.length ? j.map(e => `<div class="jornal"><div class="extra">${esc(e.data)}</div><p style="font-style:italic;margin:6px 0">${esc(e.narracao)}</p>${e.log.map(l => `<div class="log-item ${l.tipo}">${esc(l.texto)}</div>`).join('')}</div>`).join('') : '<p>O jornal começa a circular depois do primeiro mês.</p>' });
  }

  function abrirConselheiro() {
    const hist = S().conselho = S().conselho || [];
    const desenha = d => { d.querySelector('.chat').innerHTML = hist.length ? hist.map(m => `<div class="m ${m.eu ? 'eu' : ''}">${esc(m.texto)}</div>`).join('') : '<p><i>Pergunte sobre estratégia: onde atacar, quando declarar a insurreição, como lidar com a repressão...</i></p>'; d.querySelector('.chat').scrollTop = 1e9; };
    modal({ titulo: 'Conselheiro', html: `<div class="chat"></div><div class="campo"><label for="cs-t">Pergunta</label><textarea id="cs-t" style="min-height:60px"></textarea></div>`,
      botoes: [{ txt: 'Perguntar', acao: async () => { const d = $('modal'); const t = d.querySelector('#cs-t').value.trim(); if (!t) return; hist.push({ eu: true, texto: t }); d.querySelector('#cs-t').value = ''; desenha(d); try { const r = await IA.conselheiro(t, hist, R.resumo()); hist.push({ eu: false, texto: r }); } catch (e) { hist.push({ eu: false, texto: 'Erro: ' + e.message }); } if (hist.length > 30) hist.splice(0, hist.length - 30); if (!$('modal').hidden) desenha($('modal')); } }, { txt: 'Fechar', classe: 'claro' }],
      aoAbrir: desenha });
  }

  // ---------------- IA: configuração ----------------
  function abrirIA(aoFechar) {
    const c = JSON.parse(JSON.stringify(IA.cfg));
    const opts = Object.entries(IA.PROVEDORES).map(([k, p]) => `<option value="${k}">${esc(p.nome)}</option>`).join('');
    const bloco = (pre, p) => { const P = IA.PROVEDORES[p.prov]; return `<div class="campo"><label for="${pre}-prov">Provedor</label><select id="${pre}-prov">${opts}</select><span class="ajuda">${esc(P.desc || '')}${P.gratis ? ' · ' + esc(P.gratis) : ''}${P.site ? ' · ' + esc(P.site) : ''}</span></div>
      ${P.tipo !== 'nenhum' && P.tipo !== 'manual' ? `<div class="linha2">${P.chave || p.prov === 'personalizado' ? `<div class="campo"><label for="${pre}-chave">Chave de API</label><input type="password" id="${pre}-chave" value="${esc(p.chave)}" autocomplete="off"></div>` : ''}${P.tipo !== 'puter' || true ? `<div class="campo"><label for="${pre}-mod">Modelo</label><input type="text" id="${pre}-mod" value="${esc(p.modelo)}" placeholder="${esc(P.modelo || '')}"></div>` : ''}</div>` : ''}
      ${['personalizado', 'ollama', 'lmstudio'].includes(p.prov) ? `<div class="campo"><label for="${pre}-base">Endereço da API</label><input type="url" id="${pre}-base" value="${esc(p.base || P.base)}" placeholder="https://.../v1"></div>` : ''}`; };
    const html = () => `<p>A IA é um extra: sem ela, o governo, os rivais, os eventos e a narração funcionam pelas regras do jogo. Com ela, a narração fica viva, você pode inventar ações e o governo pensa melhor.</p>
      <div class="aviso">A chave fica guardada só neste navegador. Se este jogo estiver aberto como página publicada no Claude, o acesso a sites externos é bloqueado: use o modo <b>Manual</b> (copiar e colar no ChatGPT) ou abra o arquivo do jogo no seu computador.</div>
      <h3>Principal</h3>${bloco('p', c)}
      <details ${c.reserva.prov !== 'nenhum' ? 'open' : ''}><summary style="cursor:pointer;font-family:var(--f-tit);letter-spacing:.14em;text-transform:uppercase;font-size:13px">Reserva (usada se a principal falhar)</summary><div style="display:grid;gap:12px;margin-top:10px">${bloco('r', c.reserva)}</div></details>
      <h3>O que a IA faz</h3><div style="display:grid;gap:6px">${Object.entries(IA.RECURSOS).map(([k, r]) => `<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-r="${k}" ${c.recursos[k] ? 'checked' : ''} style="margin-top:5px"><span><b style="font-family:var(--f-tit);letter-spacing:.04em">${esc(r.nome)}</b> — ${esc(r.desc)}</span></label>`).join('')}</div>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ia-eco" ${c.economico ? 'checked' : ''}> Modo econômico (respostas curtas, gasta menos)</label>
      ${c.prov === 'manual' ? '<div class="aviso">No modo manual, cada função ligada pede uma colagem por mês. Deixe ligado só o que valer a pena (por exemplo, só o narrador).</div>' : ''}
      <div id="ia-st"></div><p style="font-size:13px">Chamadas nesta sessão: ${IA.gasto.chamadas}.</p>`;
    const ler = d => { const lerB = (pre, p) => { const g = id => d.querySelector('#' + pre + '-' + id); p.prov = g('prov').value; if (g('chave')) p.chave = g('chave').value.trim(); if (g('mod')) p.modelo = g('mod').value.trim(); if (g('base')) p.base = g('base').value.trim(); }; lerB('p', c); if (d.querySelector('#r-prov')) lerB('r', c.reserva); d.querySelectorAll('[data-r]').forEach(x => { c.recursos[x.dataset.r] = x.checked; }); c.economico = d.querySelector('#ia-eco').checked; };
    const ligar = d => { d.querySelector('#p-prov').value = c.prov; if (d.querySelector('#r-prov')) d.querySelector('#r-prov').value = c.reserva.prov;
      d.querySelector('#p-prov').onchange = () => { ler(d); if (c.prov !== IA.cfg.prov) { c.modelo = ''; c.base = ''; } d.querySelector('.conteudo').innerHTML = html(); ligar(d); };
      const rp = d.querySelector('#r-prov'); if (rp) rp.onchange = () => { ler(d); c.reserva.modelo = ''; c.reserva.base = ''; d.querySelector('.conteudo').innerHTML = html(); ligar(d); }; };
    modal({ titulo: 'Inteligência artificial (opcional)', html: html(), aoAbrir: ligar, aoFechar: aoFechar,
      botoes: [{ txt: 'Testar conexão', classe: 'claro', acao: async () => { const d = $('modal'); ler(d); const velho = IA.cfg; IA.cfg = c; d.querySelector('#ia-st').innerHTML = '<p><i>Testando...</i></p>'; try { const t = await IA.testar(); d.querySelector('#ia-st').innerHTML = `<div class="aviso" style="border-color:var(--bom)">Funcionou. Resposta: ${esc(t)}</div>`; } catch (e) { d.querySelector('#ia-st').innerHTML = `<div class="erro">${esc(e.message)}</div>`; IA.cfg = velho; } } },
        { txt: 'Salvar', classe: 'papel', acao: () => { ler($('modal')); IA.cfg = c; toast(IA.ligada() ? 'IA ligada: ' + IA.PROVEDORES[c.prov].nome : 'IA desligada.'); fecharModal(); if (S()) atualizar(); } }] });
  }
  // modo manual: mostra o pedido e espera a resposta colada
  IA.setManual(prompt => new Promise((ok, erro) => {
    const anterior = $('modal').hidden ? null : $('modal').innerHTML;
    modal({ titulo: 'IA manual: copie e cole', fechavel: false, html: `<p>1. Copie o pedido abaixo e cole no ChatGPT (ou outro chat) em outra aba. 2. Copie a resposta inteira e cole no segundo campo.</p>
      <div class="campo"><label for="mn-p">Pedido</label><textarea id="mn-p" readonly style="min-height:140px;font-size:13px">${esc(prompt)}</textarea></div><div><button class="btn claro peq" id="mn-c">Copiar pedido</button></div>
      <div class="campo"><label for="mn-r">Resposta</label><textarea id="mn-r" style="min-height:120px"></textarea></div>`,
      botoes: [{ txt: 'Usar resposta', classe: 'papel', acao: () => { const t = $('mn-r').value.trim(); if (!t) { toast('Cole a resposta primeiro.'); return; } fecharModal(); ok(t); } }, { txt: 'Pular', classe: 'claro', acao: () => { fecharModal(); erro(new Error('Pulado pelo jogador.')); } }],
      aoAbrir: d => { d.querySelector('#mn-c').onclick = async () => { try { await navigator.clipboard.writeText(prompt); toast('Copiado.'); } catch (e) { const t = d.querySelector('#mn-p'); t.focus(); t.select(); toast('Selecionado: use Ctrl+C.'); } }; } });
  }));

  // ---------------- ajuda ----------------
  function abrirAjuda(primeira) {
    modal({ titulo: 'Como jogar', classe: 'largo', html: `${primeira ? '<div class="aviso">Primeira partida: leia isto em 1 minuto. Fica no Menu depois.</div>' : ''}
      <h3>O mês</h3><p>Cada turno é um mês. Você tem <b>pontos de ação (PA)</b> e fundos. Programe ações, dê ordens às tropas e clique em <b>Encerrar o mês</b>. Aí tudo se resolve e o cinejornal mostra o que aconteceu.</p>
      <h3>Política primeiro</h3><p>Clique num estado. Funde <b>núcleos</b>, faça <b>agitação</b> para subir o apoio, <b>recrute</b> militantes, forme <b>quadros</b> (mais PA), <b>arrecade</b> e <b>contrabandeie armas</b>. Cuidado com a <b>visibilidade</b>: quanto mais a polícia sabe, mais núcleos caem nas ondas de prisões.</p>
      <h3>A hora das armas</h3><p>Antes da insurreição só dá para formar <b>guerrilhas</b>. Quando um estado tiver apoio alto (40%) e 3 núcleos, <b>declare a insurreição</b> (ação nacional) e faça um <b>levante popular</b>: o povo armado toma as cidades. Levante onde o exército está fraco, não onde ele está concentrado.</p>
      <h3>Estratégia militar</h3><p><b>Suprimento:</b> tropas precisam estar ligadas por território seu a um estado que vocês dominam. Sem isso, perdem gente e moral todo mês. <b>Cerco:</b> uma tropa sem saída fica CERCADA e acaba se rendendo, entregando armas. Cerque o inimigo e evite ser cercado. <b>Pinça:</b> atacar o mesmo estado a partir de dois estados diferentes dá +30%. <b>Rios</b> na divisa tiram 30% do ataque, a menos que você use <b>Forçar travessia</b>. <b>Terreno:</b> selva, serra e sertão ajudam quem defende e quem faz guerrilha. <b>Fortificar</b> acumula +15% de defesa por mês. <b>Artilharia</b> faz barragem antes do assalto. <b>Guerrilha</b> e <b>sabotagem</b> desgastam o inimigo sem disputar terreno.</p>
      <h3>Território liberado</h3><p>Com 60% de um estado, instale um <b>governo popular</b>: ele rende fundos, armas e recrutas todo mês. Depois faça <b>reforma agrária</b>.</p>
      <h3>Inimigos e aliados</h3><p>O <b>governo</b> reprime, move divisões para as ameaças e mobiliza novas brigadas. O <b>Comando Nacional</b> (paramilitares) caça militantes. A <b>Liga do Sul</b> (separatistas) pode virar aliada de ocasião. O <b>POU</b> (partido legal) pode se fundir a vocês.</p>
      <h3>Como vencer</h3><p>Tomar 60% do Distrito Federal com 45% da população do país sob controle; derrubar a estabilidade do governo a zero com o povo do seu lado; vencer a eleição presidencial (como partido legal) e sobreviver ao golpe; ou arrancar um acordo de paz. Perde quem racha (coesão zero), quem é destruído ou quem não decide a guerra em 10 anos.</p>
      <h3>Atalhos</h3><p>Arraste para mover o mapa; roda do mouse ou pinça para zoom. Teclas 1 a 5 trocam o modo do mapa. Esc cancela. Durante a animação, clique no mapa ou aperte espaço para pular.</p>
      <h3>IA (opcional)</h3><p>No Menu você pode ligar uma IA gratuita (Gemini, Groq, OpenRouter e outras), uma local (Ollama) ou o modo Manual, que usa o ChatGPT por copiar e colar. Ela narra, avalia ações livres, comanda a estratégia do governo e cria eventos. Tudo isso é opcional.</p>`, botoes: [{ txt: 'Entendi', classe: 'papel' }] });
  }

  // ---------------- fim de jogo ----------------
  async function mostrarFim() {
    const s = S(); const F = R.FINAIS[s.fim.tipo];
    tela('fim'); $('jogo').hidden = false;
    $('fim').innerHTML = `<div class="c"><div class="fimtxt">FIM</div><h2>${esc(F.titulo)}</h2><p>${esc(F.texto())}</p><p id="fim-ep"></p>
      <div class="stats"><div>Meses de luta<b>${s.turno}</b></div><div>População controlada<b>${(R.parcelaPop(1) * 100).toFixed(0)}%</b></div><div>Militantes<b>${fmtN(s.rec.militantes)}</b></div><div>Batalhas<b>${s.stats.batalhas}</b></div><div>Rendições inimigas<b>${s.stats.rendicoes}</b></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn" id="fim-novo">Nova partida</button><button class="btn sec" id="fim-mapa">Ver o mapa final</button><button class="btn sec" id="fim-ini">Tela inicial</button></div></div>`;
    $('fim-novo').onclick = () => { try { localStorage.removeItem('revbr_auto'); } catch (e) { } iniciarCriacao(); };
    $('fim-mapa').onclick = () => { $('fim').hidden = true; $('turno').disabled = true; };
    $('fim-ini').onclick = () => { initInicio(); };
    autosave();
    if (IA.ligada() && IA.cfg.prov !== 'manual') { $('fim-ep').textContent = '…'; try { $('fim-ep').textContent = await IA.epilogo(F.titulo, R.resumo()); } catch (e) { $('fim-ep').textContent = ''; } }
  }

  // ---------------- salvamento ----------------
  function temAutosave() { try { return !!localStorage.getItem('revbr_auto'); } catch (e) { return false; } }
  function autosave() { try { localStorage.setItem('revbr_auto', R.exportar()); } catch (e) { console.warn('Autosave falhou', e); } }
  function carregarAutosave() { try { R.importar(localStorage.getItem('revbr_auto')); return true; } catch (e) { toast('Não foi possível continuar: ' + e.message); return false; } }
  function slots() { return [1, 2, 3].map(i => { try { const t = localStorage.getItem('revbr_slot_' + i); if (!t) return null; const o = JSON.parse(t); return { i, txt: `${o.org.sigla} · ${R.MESES[(o.mes0 + o.turno) % 12]} de ${o.ano0 + Math.floor((o.mes0 + o.turno) / 12)}` }; } catch (e) { return null; } }); }
  function abrirSalvar() {
    modal({ titulo: 'Salvar partida', classe: 'estreito', html: `<p>A partida também é salva sozinha no fim de cada mês.</p><div style="display:grid;gap:6px">${slots().map((s, k) => `<button class="btn claro" data-s="${k + 1}">Espaço ${k + 1}: ${s ? esc(s.txt) : 'vazio'}</button>`).join('')}</div>
      <h3>Arquivo</h3><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn papel peq" id="sv-arq">Baixar arquivo .json</button><button class="btn claro peq" id="sv-cod">Copiar código da partida</button></div><p style="font-size:13px">Se o download não funcionar (por exemplo, dentro do app do Claude), use "Copiar código" e guarde o texto.</p>`,
      aoAbrir: d => {
        d.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { try { localStorage.setItem('revbr_slot_' + b.dataset.s, R.exportar()); toast('Salvo no espaço ' + b.dataset.s + '.'); fecharModal(); } catch (e) { toast('Sem espaço no navegador: ' + e.message); } }; });
        d.querySelector('#sv-arq').onclick = () => { const blob = new Blob([R.exportar()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `revolucao-${S().org.sigla}-${R.dataTxt().replace(/ /g, '-')}.json`; document.body.appendChild(a); a.click(); a.remove(); };
        d.querySelector('#sv-cod').onclick = async () => { const t = R.exportar(); try { await navigator.clipboard.writeText(t); toast('Código copiado (' + Math.round(t.length / 1024) + ' KB).'); } catch (e) { modal({ titulo: 'Código da partida', html: `<textarea style="width:100%;min-height:240px;font-size:11px">${esc(t)}</textarea>` }); } };
      } });
  }
  function abrirCarregar() {
    modal({ titulo: 'Carregar partida', classe: 'estreito', html: `<div style="display:grid;gap:6px">${temAutosave() ? '<button class="btn papel" data-s="auto">Última partida (salva sozinha)</button>' : ''}${slots().map((s, k) => s ? `<button class="btn claro" data-s="${k + 1}">Espaço ${k + 1}: ${esc(s.txt)}</button>` : '').join('')}</div>
      <h3>De arquivo ou código</h3><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn claro peq" id="cg-arq">Abrir arquivo .json</button></div><div class="campo"><label for="cg-cod">Ou cole o código</label><textarea id="cg-cod" style="min-height:70px;font-size:12px"></textarea></div><div><button class="btn papel peq" id="cg-ok">Carregar código</button></div>`,
      aoAbrir: d => {
        const ok = txt => { try { R.importar(txt); fecharModal(); iniciarJogo(); toast('Partida carregada.'); } catch (e) { toast('Arquivo inválido: ' + e.message, 4000); } };
        d.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => ok(b.dataset.s === 'auto' ? localStorage.getItem('revbr_auto') : localStorage.getItem('revbr_slot_' + b.dataset.s)); });
        d.querySelector('#cg-arq').onclick = () => { const inp = $('arquivo'); inp.value = ''; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsText(f); }; inp.click(); };
        d.querySelector('#cg-ok').onclick = () => { const t = d.querySelector('#cg-cod').value.trim(); if (t) ok(t); };
      } });
  }

  window.UI = { atualizar, iniciarJogo, abrirIA, abrirAjuda };
  initInicio();
})();
