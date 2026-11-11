/* Construtor de bandeiras em SVG */
(function () {
  const W = 300, H = 200;

  const LAYOUTS = {
    solida: 'Cor única',
    horizontal2: 'Duas faixas horizontais',
    horizontal3: 'Três faixas horizontais',
    vertical2: 'Duas faixas verticais',
    vertical3: 'Três faixas verticais',
    diagonal: 'Diagonal (estilo anarquista)',
    triangulo: 'Triângulo na tralha',
    cantao: 'Cantão (quadrado no canto)',
    cruz: 'Cruz nórdica',
    faixa: 'Faixa central larga',
    circulo: 'Disco central',
    sol: 'Raios de sol'
  };

  // Emblemas desenhados em uma caixa 100x100 centrada em (50,50)
  const EMBLEMS = {
    nenhum: { nome: 'Nenhum', svg: () => '' },
    estrela: { nome: 'Estrela', svg: c => `<polygon fill="${c}" points="${star(50, 50, 48, 19, 5)}"/>` },
    estrela_vazada: { nome: 'Estrela vazada', svg: c => `<polygon fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round" points="${star(50, 52, 42, 17, 5)}"/>` },
    estrelas3: { nome: 'Três estrelas', svg: c => `<polygon fill="${c}" points="${star(18, 50, 17, 7, 5)}"/><polygon fill="${c}" points="${star(50, 50, 22, 9, 5)}"/><polygon fill="${c}" points="${star(82, 50, 17, 7, 5)}"/>` },
    foice_martelo: { nome: 'Foice e martelo', svg: c => `<g fill="${c}"><path d="M30 18 A36 36 0 1 0 84 62 L76 58 A27 27 0 1 1 40 24 Z"/><path d="M20 84 L60 44 L54 38 L68 26 L80 38 L68 50 L62 46 L26 90 Z"/></g>` },
    punho: { nome: 'Punho erguido', svg: c => `<g fill="${c}"><rect x="34" y="52" width="30" height="44" rx="4"/><rect x="28" y="18" width="12" height="36" rx="6"/><rect x="40" y="10" width="12" height="44" rx="6"/><rect x="52" y="12" width="12" height="42" rx="6"/><rect x="64" y="20" width="11" height="34" rx="5"/><rect x="22" y="40" width="22" height="12" rx="6" transform="rotate(-35 33 46)"/></g>` },
    a_circulado: { nome: 'A circulado', svg: c => `<g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"><circle cx="50" cy="52" r="40"/><path d="M22 92 L50 4 L78 92 M33 62 L67 62"/></g>` },
    engrenagem: { nome: 'Engrenagem', svg: c => gear(c) },
    trigo: { nome: 'Espigas de trigo', svg: c => wheat(c) },
    tocha: { nome: 'Tocha', svg: c => `<g fill="${c}"><path d="M42 50 L58 50 L54 96 L46 96 Z"/><path d="M50 4 C30 22 40 34 34 44 L66 44 C60 30 74 24 50 4 Z"/></g>` },
    livro: { nome: 'Livro aberto', svg: c => `<g fill="${c}"><path d="M8 26 C26 18 40 20 48 28 L48 84 C40 76 26 74 8 82 Z"/><path d="M92 26 C74 18 60 20 52 28 L52 84 C60 76 74 74 92 82 Z"/></g>` },
    circulo: { nome: 'Círculo', svg: c => `<circle cx="50" cy="50" r="40" fill="${c}"/>` },
    anel: { nome: 'Anel', svg: c => `<circle cx="50" cy="50" r="38" fill="none" stroke="${c}" stroke-width="10"/>` },
    sol: { nome: 'Sol nascente', svg: c => sun(c) },
    machado: { nome: 'Facão cruzado', svg: c => `<g fill="${c}"><path d="M14 22 L22 14 L88 80 L80 88 Z"/><path d="M86 22 L78 14 L12 80 L20 88 Z"/></g>` },
    arvore: { nome: 'Árvore', svg: c => `<g fill="${c}"><rect x="45" y="58" width="10" height="38"/><circle cx="50" cy="38" r="30"/></g>` },
    folha: { nome: 'Folha', svg: c => `<path fill="${c}" d="M50 4 C90 30 86 72 50 96 C14 72 10 30 50 4 Z"/>` },
    raio: { nome: 'Raio', svg: c => `<polygon fill="${c}" points="58,2 22,56 46,56 38,98 78,40 54,40"/>` }
  };

  function star(cx, cy, R, r, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / n;
      const rad = i % 2 ? r : R;
      pts.push((cx + Math.cos(a) * rad).toFixed(1) + ',' + (cy + Math.sin(a) * rad).toFixed(1));
    }
    return pts.join(' ');
  }
  function gear(c) {
    let teeth = '';
    for (let i = 0; i < 10; i++) teeth += `<rect x="44" y="4" width="12" height="16" fill="${c}" transform="rotate(${i * 36} 50 50)"/>`;
    return `<g>${teeth}<circle cx="50" cy="50" r="34" fill="${c}"/><circle cx="50" cy="50" r="14" fill="var(--hole,#000)" opacity="0"/></g>`;
  }
  function wheat(c) {
    let s = `<g fill="${c}"><rect x="48" y="30" width="4" height="66"/>`;
    for (let i = 0; i < 5; i++) {
      const y = 12 + i * 12;
      s += `<ellipse cx="42" cy="${y + 6}" rx="6" ry="10" transform="rotate(-30 42 ${y + 6})"/><ellipse cx="58" cy="${y + 6}" rx="6" ry="10" transform="rotate(30 58 ${y + 6})"/>`;
    }
    return s + `<ellipse cx="50" cy="8" rx="5" ry="9"/></g>`;
  }
  function sun(c) {
    let s = `<g fill="${c}">`;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i + 0.5) * Math.PI / 9;
      const x1 = 50 + Math.cos(a - 0.08) * 28, y1 = 80 + Math.sin(a - 0.08) * 28;
      const x2 = 50 + Math.cos(a) * 62, y2 = 80 + Math.sin(a) * 62;
      const x3 = 50 + Math.cos(a + 0.08) * 28, y3 = 80 + Math.sin(a + 0.08) * 28;
      s += `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}"/>`;
    }
    return s + `<path d="M24 80 A26 26 0 0 1 76 80 Z"/></g>`;
  }

  function background(cfg) {
    const [a, b, c] = [cfg.c1, cfg.c2, cfg.c3];
    switch (cfg.layout) {
      case 'horizontal2': return `<rect width="${W}" height="${H / 2}" fill="${a}"/><rect y="${H / 2}" width="${W}" height="${H / 2}" fill="${b}"/>`;
      case 'horizontal3': return `<rect width="${W}" height="${H}" fill="${b}"/><rect width="${W}" height="${H / 3}" fill="${a}"/><rect y="${2 * H / 3}" width="${W}" height="${H / 3 + 1}" fill="${c}"/>`;
      case 'vertical2': return `<rect width="${W / 2}" height="${H}" fill="${a}"/><rect x="${W / 2}" width="${W / 2}" height="${H}" fill="${b}"/>`;
      case 'vertical3': return `<rect width="${W}" height="${H}" fill="${b}"/><rect width="${W / 3}" height="${H}" fill="${a}"/><rect x="${2 * W / 3}" width="${W / 3 + 1}" height="${H}" fill="${c}"/>`;
      case 'diagonal': return `<rect width="${W}" height="${H}" fill="${b}"/><polygon points="0,0 ${W},0 0,${H}" fill="${a}"/>`;
      case 'triangulo': return `<rect width="${W}" height="${H / 2}" fill="${b}"/><rect y="${H / 2}" width="${W}" height="${H / 2}" fill="${c}"/><polygon points="0,0 ${W * 0.45},${H / 2} 0,${H}" fill="${a}"/>`;
      case 'cantao': return `<rect width="${W}" height="${H}" fill="${b}"/><rect width="${W * 0.45}" height="${H / 2}" fill="${a}"/>`;
      case 'cruz': return `<rect width="${W}" height="${H}" fill="${a}"/><rect x="${W * 0.3}" width="${W * 0.12}" height="${H}" fill="${b}"/><rect y="${H * 0.42}" width="${W}" height="${H * 0.16}" fill="${b}"/>`;
      case 'faixa': return `<rect width="${W}" height="${H}" fill="${a}"/><rect y="${H * 0.25}" width="${W}" height="${H * 0.5}" fill="${b}"/>`;
      case 'circulo': return `<rect width="${W}" height="${H}" fill="${a}"/><circle cx="${W / 2}" cy="${H / 2}" r="${H * 0.38}" fill="${b}"/>`;
      case 'sol': {
        let s = `<rect width="${W}" height="${H}" fill="${a}"/>`;
        for (let i = 0; i < 16; i += 2) {
          const a1 = i * Math.PI / 8, a2 = (i + 1) * Math.PI / 8, R = 400;
          s += `<polygon fill="${b}" points="${W / 2},${H / 2} ${W / 2 + Math.cos(a1) * R},${H / 2 + Math.sin(a1) * R} ${W / 2 + Math.cos(a2) * R},${H / 2 + Math.sin(a2) * R}"/>`;
        }
        return s;
      }
      default: return `<rect width="${W}" height="${H}" fill="${a}"/>`;
    }
  }

  function emblemPos(cfg) {
    const size = (cfg.emblemSize || 60) / 100 * H;
    let cx = W / 2, cy = H / 2;
    if (cfg.emblemPos === 'tralha') cx = H * 0.48;
    if (cfg.emblemPos === 'canto') { cx = W * 0.225; cy = H * 0.25; }
    if (cfg.layout === 'triangulo' && cfg.emblemPos !== 'centro') { cx = W * 0.15; cy = H / 2; }
    return { cx, cy, size };
  }

  function render(cfg) {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    svg += background(cfg);
    const em = EMBLEMS[cfg.emblem] || EMBLEMS.nenhum;
    if (cfg.emblem && cfg.emblem !== 'nenhum') {
      const p = emblemPos(cfg);
      const s = p.size / 100;
      svg += `<g transform="translate(${p.cx - p.size / 2} ${p.cy - p.size / 2}) scale(${s})">${em.svg(cfg.ce)}</g>`;
    }
    if (cfg.text) {
      const fs = cfg.textSize || 34;
      const y = cfg.textPos === 'topo' ? fs + 8 : H - 14;
      svg += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-weight="700" font-size="${fs}" fill="${cfg.ct}" letter-spacing="3">${escapeXml(cfg.text)}</text>`;
    }
    svg += `<rect width="${W}" height="${H}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
    return svg + '</svg>';
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));
  }

  function svgToDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Converte qualquer imagem (dataURL) para PNG pequeno, para salvar no navegador sem estourar o limite
  function normalizeImage(src, maxW = 240, maxH = 160) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(maxW / img.width, maxH / img.height, 1) || 1;
        const w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        try { resolve(cv.toDataURL('image/png')); } catch (e) { resolve(src); }
      };
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.src = src;
    });
  }

  function sanitizeSvg(text) {
    const m = String(text).match(/<svg[\s\S]*?<\/svg>/i);
    if (!m) return null;
    let s = m[0];
    s = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/(href|xlink:href)\s*=\s*("|')\s*(javascript:|https?:)[^"']*("|')/gi, '');
    if (!/xmlns=/.test(s)) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    return s;
  }

  window.Bandeira = window.Flag = { LAYOUTS, EMBLEMS, render, svgToDataUrl, normalizeImage, sanitizeSvg, W, H };
})();
