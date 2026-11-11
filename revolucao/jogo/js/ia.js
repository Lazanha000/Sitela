/* IA opcional. O jogo funciona inteiro sem ela; aqui só entram narração, ações livres, estratégia do governo,
   eventos inéditos, conselheiro e bandeira. A chave fica só no navegador de quem joga. */
(function () {
  const PROVEDORES = {
    nenhum: { nome: 'Nenhuma (jogo sem IA)', tipo: 'nenhum', desc: 'Tudo funciona com as regras do próprio jogo.' },
    gemini: { nome: 'Google Gemini', tipo: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', modelo: 'gemini-2.5-flash', chave: true, gratis: 'Grátis com limite diário', site: 'aistudio.google.com/apikey', desc: 'Crie a chave no Google AI Studio. Bom equilíbrio entre qualidade e cota grátis.' },
    groq: { nome: 'Groq', tipo: 'openai', base: 'https://api.groq.com/openai/v1', modelo: 'llama-3.3-70b-versatile', chave: true, gratis: 'Grátis com limite', site: 'console.groq.com/keys', desc: 'Muito rápido. Modelos Llama, Qwen e outros abertos.' },
    openrouter: { nome: 'OpenRouter', tipo: 'openai', base: 'https://openrouter.ai/api/v1', modelo: 'meta-llama/llama-3.3-70b-instruct:free', chave: true, gratis: 'Modelos terminados em ":free"', site: 'openrouter.ai/keys', desc: 'Uma chave para centenas de modelos. Os gratuitos mudam com frequência: confira a lista no site.' },
    cerebras: { nome: 'Cerebras', tipo: 'openai', base: 'https://api.cerebras.ai/v1', modelo: 'llama-3.3-70b', chave: true, gratis: 'Grátis com limite', site: 'cloud.cerebras.ai', desc: 'Inferência muito rápida de modelos abertos.' },
    mistral: { nome: 'Mistral', tipo: 'openai', base: 'https://api.mistral.ai/v1', modelo: 'mistral-small-latest', chave: true, gratis: 'Plano gratuito de testes', site: 'console.mistral.ai', desc: 'Modelos europeus; bom português.' },
    github: { nome: 'GitHub Models', tipo: 'openai', base: 'https://models.github.ai/inference', modelo: 'openai/gpt-4.1-mini', chave: true, gratis: 'Grátis com conta GitHub', site: 'github.com/settings/tokens', desc: 'Use um token pessoal com permissão "models". Dá acesso a modelos da OpenAI e outros.' },
    huggingface: { nome: 'Hugging Face', tipo: 'openai', base: 'https://router.huggingface.co/v1', modelo: 'meta-llama/Llama-3.3-70B-Instruct', chave: true, gratis: 'Créditos mensais grátis', site: 'huggingface.co/settings/tokens', desc: 'Roteador de vários provedores de modelos abertos.' },
    sambanova: { nome: 'SambaNova', tipo: 'openai', base: 'https://api.sambanova.ai/v1', modelo: 'Meta-Llama-3.3-70B-Instruct', chave: true, gratis: 'Grátis com limite', site: 'cloud.sambanova.ai', desc: 'Modelos abertos grandes e rápidos.' },
    pollinations: { nome: 'Pollinations (sem chave)', tipo: 'openai', base: 'https://text.pollinations.ai/openai', modelo: 'openai', chave: false, gratis: 'Grátis, sem cadastro', site: 'pollinations.ai', desc: 'Funciona sem chave, mas é instável e tem limite por minuto. Bom para testar.', endpointCompleto: true },
    puter: { nome: 'Puter (GPT sem chave)', tipo: 'puter', modelo: 'gpt-4o-mini', chave: false, gratis: 'Grátis para quem joga, com conta Puter', site: 'puter.com', desc: 'Usa modelos da OpenAI pela sua conta Puter: abre uma janela de login na primeira vez. Não precisa de chave de API.' },
    manual: { nome: 'Manual: copiar e colar (ChatGPT, Claude, Gemini...)', tipo: 'manual', chave: false, gratis: 'Usa sua conta de chat normal', desc: 'O jogo mostra o pedido; você cola no ChatGPT ou em outro chat aberto em outra aba e traz a resposta de volta. Funciona com qualquer assinatura, sem API.' },
    ollama: { nome: 'Ollama (no seu computador)', tipo: 'openai', base: 'http://localhost:11434/v1', modelo: 'llama3.1', chave: false, gratis: 'Grátis, roda offline', site: 'ollama.com', desc: 'Inicie com OLLAMA_ORIGINS=* para o navegador poder acessar.' },
    lmstudio: { nome: 'LM Studio (no seu computador)', tipo: 'openai', base: 'http://localhost:1234/v1', modelo: 'local-model', chave: false, gratis: 'Grátis, roda offline', site: 'lmstudio.ai', desc: 'Ative o servidor local com CORS ligado.' },
    deepseek: { nome: 'DeepSeek', tipo: 'openai', base: 'https://api.deepseek.com/v1', modelo: 'deepseek-chat', chave: true, gratis: 'Pago (muito barato)', site: 'platform.deepseek.com', desc: 'Muito barato e bom em português.' },
    openai: { nome: 'OpenAI (API)', tipo: 'openai', base: 'https://api.openai.com/v1', modelo: 'gpt-4.1-mini', chave: true, gratis: 'Pago', site: 'platform.openai.com/api-keys', desc: 'A API é cobrada à parte da assinatura do ChatGPT. Para usar a assinatura, escolha o modo Manual.', campoMax: 'max_completion_tokens' },
    anthropic: { nome: 'Anthropic Claude (API)', tipo: 'anthropic', base: 'https://api.anthropic.com/v1', modelo: 'claude-opus-5-5', chave: true, gratis: 'Pago', site: 'console.anthropic.com', desc: 'Modelo padrão: Claude Opus 5.5. Para gastar menos, troque por claude-haiku-5-5.' },
    personalizado: { nome: 'Outro compatível com OpenAI', tipo: 'openai', base: '', modelo: '', chave: true, gratis: '—', desc: 'Qualquer serviço com a rota /chat/completions (Together, Fireworks, Novita, vLLM...).' }
  };
  const RECURSOS = {
    narrador: { nome: 'Narrador do cinejornal', desc: 'Escreve a locução do fim de cada mês com base no que aconteceu.' },
    livres: { nome: 'Ações livres', desc: 'Você escreve qualquer ação; a IA avalia custo, chance e efeitos dentro de limites.' },
    governo: { nome: 'Estratégia do governo', desc: 'A IA escolhe a postura e o foco do governo; as regras executam.' },
    eventos: { nome: 'Eventos inéditos', desc: 'De vez em quando a IA cria um acontecimento novo com escolhas.' },
    conselheiro: { nome: 'Conselheiro', desc: 'Converse com um conselheiro estratégico que conhece a situação.' },
    bandeira: { nome: 'Bandeira por IA', desc: 'Descreva a bandeira e a IA desenha em SVG.' }
  };
  const CHAVE = 'revbr_ia_v1';
  let cfg = { prov: 'nenhum', chave: '', modelo: '', base: '', reserva: { prov: 'nenhum', chave: '', modelo: '', base: '' }, recursos: { narrador: true, livres: true, governo: false, eventos: false, conselheiro: true, bandeira: true }, economico: true };
  try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (s) cfg = { ...cfg, ...s, recursos: { ...cfg.recursos, ...(s.recursos || {}) }, reserva: { ...cfg.reserva, ...(s.reserva || {}) } }; } catch (e) { }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) { } }
  const ligada = () => cfg.prov !== 'nenhum';
  const ativo = r => ligada() && cfg.recursos[r];

  let manualHandler = null; // definido pela interface: (prompt) => Promise<string>
  let gasto = { chamadas: 0, caracteres: 0 };

  async function chamar(p, sistema, usuario, max, json) {
    const P = PROVEDORES[p.prov]; if (!P || P.tipo === 'nenhum') throw new Error('Nenhum provedor configurado.');
    const modelo = p.modelo || P.modelo; const base = (p.base || P.base || '').replace(/\/$/, '');
    if (P.chave && !p.chave) throw new Error(`Falta a chave de ${P.nome}.`);
    if (P.tipo === 'manual') { if (!manualHandler) throw new Error('Modo manual indisponível.'); return manualHandler(`${sistema}\n\n---\n\n${usuario}`); }
    if (P.tipo === 'puter') {
      if (!window.puter) await new Promise((ok, erro) => { const s = document.createElement('script'); s.src = 'https://js.puter.com/v2/'; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar o Puter (sem internet ou bloqueado).')); document.head.appendChild(s); });
      const r = await window.puter.ai.chat(`${sistema}\n\n${usuario}`, { model: modelo });
      const c = r && r.message ? r.message.content : r; return Array.isArray(c) ? c.map(x => x.text || '').join('') : String(c);
    }
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      if (P.tipo === 'gemini') {
        const corpo = { systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: 'user', parts: [{ text: usuario }] }], generationConfig: { maxOutputTokens: max * 3, temperature: 0.9 } };
        if (json) corpo.generationConfig.responseMimeType = 'application/json';
        if (/flash/.test(modelo)) corpo.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        let r = await fetch(`${base}/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(p.chave)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: ctrl.signal });
        if (r.status === 400 && corpo.generationConfig.thinkingConfig) { delete corpo.generationConfig.thinkingConfig; r = await fetch(`${base}/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(p.chave)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: ctrl.signal }); }
        const d = await resposta(r); return (d.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('');
      }
      if (P.tipo === 'anthropic') {
        const r = await fetch(`${base}/messages`, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'x-api-key': p.chave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: modelo, max_tokens: Math.max(1024, max * 4), system: sistema, messages: [{ role: 'user', content: usuario }], output_config: { effort: 'low' } }) });
        const d = await resposta(r); if (d.stop_reason === 'refusal') throw new Error('O modelo recusou o pedido.'); return (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
      }
      // compatível com OpenAI
      const url = P.endpointCompleto ? base : `${base}/chat/completions`;
      const corpo = { model: modelo, messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }], temperature: 0.85 };
      corpo[P.campoMax || 'max_tokens'] = max * (P.campoMax ? 4 : 1);
      const headers = { 'Content-Type': 'application/json' }; if (p.chave) headers.Authorization = 'Bearer ' + p.chave;
      if (p.prov === 'openrouter') { headers['X-Title'] = 'Revolucao - jogo'; }
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(corpo), signal: ctrl.signal });
      const d = await resposta(r); return d.choices?.[0]?.message?.content || '';
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('A IA demorou demais para responder (60 s).');
      if (e instanceof TypeError) throw new Error('Não foi possível conectar. Verifique a internet, a URL ou se o serviço permite acesso pelo navegador (CORS).');
      throw e;
    } finally { clearTimeout(timer); }
  }
  async function resposta(r) {
    let d = null; try { d = await r.json(); } catch (e) { }
    if (!r.ok) { const m = d && (d.error?.message || d.error || d.message); throw new Error(`Erro ${r.status}${m ? ': ' + (typeof m === 'string' ? m : JSON.stringify(m)).slice(0, 200) : ''}`); }
    return d || {};
  }
  async function chat(sistema, usuario, max = 400, json = false) {
    const tentativas = [cfg, cfg.reserva].filter(p => p && p.prov && p.prov !== 'nenhum');
    let ultimo;
    for (const p of tentativas) { try { const t = await chamar(p, sistema, usuario, max, json); gasto.chamadas++; gasto.caracteres += (sistema + usuario + t).length; return t; } catch (e) { ultimo = e; } }
    throw ultimo || new Error('IA desligada.');
  }
  function extrairJSON(t) {
    if (!t) throw new Error('Resposta vazia.');
    const lim = String(t).replace(/```(json)?/gi, '');
    const i = lim.indexOf('{'), j = lim.lastIndexOf('}'); if (i < 0 || j < i) throw new Error('A IA não devolveu JSON.');
    return JSON.parse(lim.slice(i, j + 1));
  }

  const BASE_SIS = 'Você é parte de um jogo de estratégia fictício sobre uma revolução no Brasil. Escreva sempre em português do Brasil. Os dados do jogo são a única fonte de fatos: não invente unidades, números ou lugares fora deles.';
  const EF_DOC = 'Chaves de efeito permitidas (números; o jogo corta excessos): apoio (pontos percentuais no estado, -8 a 8), nucleos (-2 a 2), repressao (-15 a 15), guarnicao_pct (-30 a 30), infiltracao (-2 a 2), militantes (-2000 a 2000), fundos (em R$ mil, -600 a 600), armas (-1500 a 1500), visibilidade (-20 a 20), legitimidade (-8 a 8), coesao (-10 a 10), moral (-10 a 10), apoio_internacional (-8 a 8), gov_legitimidade (-6 a 6), gov_estabilidade (-6 a 6), gov_economia (-6 a 6).';

  async function narrar(relatorio, resumo) {
    const fatos = relatorio.log.filter(l => l.imp >= 2).slice(0, 12).map(l => '- ' + l.texto).join('\n') || '- Mês sem grandes acontecimentos.';
    const sis = BASE_SIS + ' Você é o locutor de um cinejornal dos anos 1940 narrando esta guerra: tom solene, frases curtas, dramático, sem exageros falsos.';
    const usr = `Organização: ${resumo.org.nome} (${resumo.org.sigla}), ${resumo.org.vertente}.\nData: ${relatorio.data}.\nPopulação sob controle: ${resumo.populacao_controlada_pct}%. Legitimidade do governo: ${resumo.governo.legitimidade}%.\nFatos do mês:\n${fatos}\n\nEscreva a locução em ${cfg.economico ? '2 ou 3' : '3 a 5'} frases. Só o texto, sem título.`;
    return (await chat(sis, usr, cfg.economico ? 180 : 320)).trim().replace(/^["“]|["”]$/g, '');
  }
  async function avaliarAcao(texto, estado, resumo) {
    const sis = BASE_SIS + ' Você é o juiz das regras: avalia uma ação inventada pelo jogador e devolve SOMENTE um JSON. Seja realista e equilibrado: ações ousadas têm chance menor e custo maior; nada pode valer mais que 2 a 3 ações comuns do jogo.';
    const usr = `Situação: ${JSON.stringify(resumo)}\nEstado alvo: ${estado || 'nacional'}\nAção do jogador: "${texto}"\n\n${EF_DOC}\nResponda neste formato:\n{"viavel":true,"motivo":"se inviável, por quê","pa":1,"fundos":50,"chance":0.6,"efeitos":{"apoio":3},"falha":{"visibilidade":5},"narrativa":"1 frase se der certo","narrativa_falha":"1 frase se der errado"}\npa entre 1 e 3; fundos entre 0 e 500; chance entre 0.05 e 0.95.`;
    const j = extrairJSON(await chat(sis, usr, 380, true));
    j.pa = Math.round(Math.max(1, Math.min(3, +j.pa || 1))); j.fundos = Math.round(Math.max(0, Math.min(500, +j.fundos || 0))); j.chance = Math.max(0.05, Math.min(0.95, +j.chance || 0.5));
    return j;
  }
  async function governo(resumo) {
    const sis = BASE_SIS + ' Você comanda o Governo Federal contra a insurreição. Devolva SOMENTE um JSON com a estratégia do mês.';
    const usr = `Situação vista pelo governo: ${JSON.stringify(resumo)}\nFormato: {"postura":"agressiva|equilibrada|defensiva|linha_dura","foco_repressao":["UF","UF"],"alvo_ofensiva":"UF ou null","propaganda":true,"concessao":false,"declaracao":"frase do presidente na TV"}\nUse siglas de estados reais. Máximo 3 estados no foco.`;
    const j = extrairJSON(await chat(sis, usr, 220, true));
    const ufs = Mundo.states.map(s => s.id);
    return { postura: ['agressiva', 'equilibrada', 'defensiva', 'linha_dura'].includes(j.postura) ? j.postura : 'equilibrada', foco_repressao: (Array.isArray(j.foco_repressao) ? j.foco_repressao : []).map(x => String(x).toUpperCase()).filter(x => ufs.includes(x)).slice(0, 3), alvo_ofensiva: ufs.includes(String(j.alvo_ofensiva).toUpperCase()) ? String(j.alvo_ofensiva).toUpperCase() : null, propaganda: !!j.propaganda, concessao: !!j.concessao, declaracao: String(j.declaracao || '').slice(0, 220) };
  }
  async function evento(resumo) {
    const sis = BASE_SIS + ' Você cria acontecimentos plausíveis para a guerra (políticos, sociais, econômicos, internacionais). Devolva SOMENTE JSON.';
    const usr = `Situação: ${JSON.stringify(resumo)}\n${EF_DOC} Para apoio em estados específicos use "apoio_uf": {"UF": numero}.\nFormato: {"titulo":"curto","texto":"2 frases","opcoes":[{"texto":"escolha","resultado":"1 frase","efeitos":{}},{"texto":"...","resultado":"...","efeitos":{}}]}\nDê 2 ou 3 opções com prós e contras reais.`;
    const j = extrairJSON(await chat(sis, usr, 420, true));
    if (!j.titulo || !Array.isArray(j.opcoes) || j.opcoes.length < 2) throw new Error('Evento inválido.');
    return { ia: true, id: 'ia_' + Date.now(), titulo: String(j.titulo).slice(0, 80), texto: String(j.texto || '').slice(0, 400), opcoes: j.opcoes.slice(0, 3).map(o => ({ texto: String(o.texto || '').slice(0, 120), resultado: String(o.resultado || '').slice(0, 200), efeitos: o.efeitos || {} })) };
  }
  async function conselheiro(pergunta, historico, resumo) {
    const sis = BASE_SIS + ` Você é o conselheiro estratégico da direção da ${resumo.org.sigla}. Responda de forma direta e honesta, apontando riscos e erros quando houver. Conheça as mecânicas: suprimento por território conectado, cerco e rendição, pinça (+30%), rios (−30% sem travessia), terreno, levantes exigem apoio alto e núcleos, repressão derruba núcleos, governo popular rende recursos. Responda em até ${cfg.economico ? 90 : 160} palavras.`;
    const conv = historico.slice(-6).map(m => (m.eu ? 'Direção: ' : 'Conselheiro: ') + m.texto).join('\n');
    return (await chat(sis, `Situação: ${JSON.stringify(resumo)}\n${conv}\nDireção: ${pergunta}\nConselheiro:`, cfg.economico ? 260 : 450)).trim();
  }
  async function bandeira(descricao, org) {
    const sis = 'Você desenha bandeiras em SVG. Devolva SOMENTE o código SVG, sem explicações, sem scripts, sem imagens externas, sem texto pequeno.';
    const usr = `Bandeira da organização "${org.nome}" (${org.sigla}), ${org.vertente}. Pedido: ${descricao}\nUse viewBox="0 0 300 200", formas simples e cores sólidas, no estilo de bandeiras políticas reais.`;
    const t = await chat(sis, usr, 1400); const s = Bandeira.sanitizeSvg(t); if (!s) throw new Error('A IA não devolveu um SVG válido.'); return s;
  }
  async function epilogo(fim, resumo) {
    const sis = BASE_SIS + ' Você é o narrador do último cinejornal da guerra.';
    return (await chat(sis, `Final: ${fim}\nSituação final: ${JSON.stringify(resumo)}\nEscreva um epílogo de 4 a 6 frases sobre o que aconteceu com o país e com a organização nos anos seguintes.`, 380)).trim();
  }
  async function testar() { const t = await chat('Responda apenas com a palavra OK.', 'Teste de conexão.', 20); return t.trim().slice(0, 60) || '(resposta vazia)'; }

  window.IA = { PROVEDORES, RECURSOS, get cfg() { return cfg; }, set cfg(v) { cfg = v; salvar(); }, salvar, ligada, ativo, chat, testar, narrar, avaliarAcao, governo, evento, conselheiro, bandeira, epilogo, extrairJSON,
    setManual(fn) { manualHandler = fn; }, get gasto() { return gasto; } };
})();
