/* Conteúdo de exemplo comum aos cinco protótipos */
window.DADOS = {
  org: {
    sigla: 'UPR', nome: 'União Popular Revolucionária', tipo: 'Frente armada', vertente: 'Socialismo popular · linha de massas',
    doutrina: 'Guerra popular prolongada', lema: 'Terra, pão e poder ao povo', lider: 'Comitê Central (7 membros)'
  },
  recursos: [
    { k: 'militantes', rot: 'Militantes', v: '18.420', d: '+1.130' },
    { k: 'combatentes', rot: 'Combatentes', v: '9.650', d: '+410' },
    { k: 'fundos', rot: 'Fundos', v: 'R$ 3,2 mi', d: '−0,4' },
    { k: 'armas', rot: 'Armamento', v: '11.200', d: '+900' },
    { k: 'apoio', rot: 'Apoio popular', v: '23%', d: '+2' },
    { k: 'coesao', rot: 'Coesão interna', v: '71%', d: '−3' },
    { k: 'legit', rot: 'Legitimidade do governo', v: '38%', d: '−5' }
  ],
  ordens: [
    { k: 'ofensiva', rot: 'Ofensiva frontal', desc: 'Ataque direto. Perdas altas, ganho rápido de terreno.', custo: '2 PA' },
    { k: 'pinca', rot: 'Manobra em pinça', desc: 'Duas colunas convergem para cercar o inimigo. Exige 2 unidades.', custo: '3 PA' },
    { k: 'cerco', rot: 'Manter cerco', desc: 'Corta o suprimento do bolsão. Moral inimiga cai a cada turno.', custo: '1 PA' },
    { k: 'guerrilha', rot: 'Guerrilha e emboscada', desc: 'Desgasta sem disputar terreno. Forte em mata e sertão.', custo: '1 PA' },
    { k: 'sabotagem', rot: 'Sabotar suprimento', desc: 'Ataca estradas e pontes atrás da linha inimiga.', custo: '1 PA' },
    { k: 'travessia', rot: 'Forçar travessia', desc: 'Cruza o rio sob fogo. Precisa de engenharia ou surpresa.', custo: '2 PA' },
    { k: 'fortificar', rot: 'Fortificar posição', desc: 'Trincheiras: defesa +40% depois de 2 turnos parado.', custo: '1 PA' },
    { k: 'elastica', rot: 'Defesa elástica', desc: 'Cede terreno para preservar a força e contra-atacar.', custo: '1 PA' },
    { k: 'artilharia', rot: 'Barragem de artilharia', desc: 'Reduz a defesa inimiga antes do assalto.', custo: '1 PA' },
    { k: 'retirada', rot: 'Retirada estratégica', desc: 'Recua para a base mais próxima sem perder a unidade.', custo: '0 PA' }
  ],
  politicas: ['Agitação e propaganda', 'Fundar célula', 'Greve geral', 'Ocupação de terras', 'Infiltrar quartéis', 'Expropriação', 'Rádio clandestina', 'Congresso da organização'],
  despachos: [
    { t: 'Frente do Tocantins', x: 'Colunas da UPR alcançam a margem do rio em Miracema. A 8ª Divisão segura a Linha Tocantins.' },
    { t: 'Cerco de Imperatriz', x: 'A 23ª Brigada está sem suprimento há 3 turnos. Moral em colapso; há relatos de deserções.' },
    { t: 'Recife', x: 'Fuzileiros navais desembarcam ao norte da cidade. A Milícia Operária resiste no centro.' },
    { t: 'Sul', x: 'A Liga Federalista marcha sobre Porto Alegre. O governo desloca reservas para o Sul.' },
    { t: 'Tapajós', x: 'Destacamento isolado: rota de suprimento cortada. Recomenda-se retirada ou reforço aéreo.' }
  ]
};
