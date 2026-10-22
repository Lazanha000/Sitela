# PROMPT MESTRE --- SIMULADOR DO GOVERNO BRASILEIRO

## Especificação profunda de produto, mecânicas, causalidade, conteúdo histórico e arquitetura multiplataforma

> **Instrução principal para a IA que receber este documento:** trate
> este arquivo como a especificação de produto e de simulação. Não o
> reduza a um protótipo visual nem substitua suas regras por descrições
> genéricas. Leia tudo antes de implementar, transforme os requisitos em
> sistemas testáveis e desenvolva o projeto por etapas. O escopo jogável
> inicial é **2022**. As expansões para 2023--2026 e 2026--2030 devem
> ser preparadas arquiteturalmente, mas **não devem ser implementadas
> agora**.

------------------------------------------------------------------------

# 1. PAPEL, OBJETIVO E PADRÃO DE QUALIDADE

Você é responsável por conceber e implementar um jogo de estratégia
política e administração pública de profundidade sistêmica, ambientado
no Brasil. O jogador deve sentir que governa um país complexo, com
instituições que têm regras próprias, recursos escassos, atores com
interesses divergentes, informação incompleta, consequências atrasadas e
crises que se propagam entre áreas.

O jogo deve ser interessante por causa das decisões e de suas
consequências --- não apenas por números subindo e descendo, textos
aleatórios ou menus bonitos. Uma decisão precisa ter contexto, custo,
restrições, beneficiários, grupos prejudicados, riscos, incerteza,
efeitos imediatos e efeitos de longo prazo. As consequências devem
emergir de mecanismos coerentes e ser explicáveis ao jogador.

O produto deve ser concebido como uma aplicação comercial de longo
prazo, inicialmente jogável localmente e preparada para futuras
distribuições: - Web, para desenvolvimento, testes e eventual versão de
navegador. - Android, com preparação para empacotamento e distribuição
pela Google Play Store. - Desktop, com preparação para instaladores e
distribuição em lojas de aplicativos.

Não afirme que um aplicativo está pronto para publicação em uma loja sem
compilar, testar e verificar os requisitos reais da plataforma. Não
implemente mecanismos de monetização, contas, telemetria ou anúncios sem
uma solicitação específica.

## 1.1 Princípios inegociáveis

1.  **Causalidade antes de decoração:** toda variável importante deve
    ser afetada por regras explícitas.
2.  **Instituições reais, jogo contrafactual:** use a estrutura
    constitucional e institucional brasileira como base; permita que as
    decisões do jogador criem uma trajetória alternativa dentro da
    simulação.
3.  **História verificável:** diferencie fatos históricos, dados
    observados, estimativas, abstrações de jogo e resultados
    contrafactuais.
4.  **Sem onipotência presidencial:** o jogador não pode ordenar
    diretamente que o Congresso vote a favor, que o STF decida como
    deseja, que os estados obedeçam sem resistência ou que a economia
    produza o resultado desejado.
5.  **Conflitos legítimos:** atores não precisam concordar com o
    jogador. Eles reagem a incentivos, ideologias, interesses
    eleitorais, compromissos, reputação, capacidade institucional e
    contexto.
6.  **Consequências com defasagem:** políticas podem demorar para
    produzir efeitos, e efeitos podem persistir depois que a política
    muda.
7.  **Sistemas conectados:** economia, orçamento, popularidade,
    Congresso, federação, serviços públicos, meio ambiente e diplomacia
    precisam interagir.
8.  **Transparência suficiente:** o jogador deve conseguir compreender
    por que algo ocorreu, mesmo quando não consegue prever exatamente o
    resultado.
9.  **Persistência confiável:** campanhas devem ser salvas e carregadas
    sem perder o estado.
10. **Implementação incremental real:** prefira poucos sistemas
    completos e integrados a muitos sistemas falsos ou meramente
    decorativos.

------------------------------------------------------------------------

# 2. ESCOPO HISTÓRICO E CRONOLOGIA

## 2.1 Campanha inicial

A campanha principal começa em **1º de janeiro de 2022**, no contexto
histórico do Brasil daquele momento. A configuração inicial deve
representar o quadro institucional, político, econômico e social de 2022
usando dados históricos confiáveis, com a data de referência indicada
para cada conjunto de dados.

A primeira versão deve cobrir 2022 como um período jogável, incluindo os
principais temas e eventos daquele ano que forem relevantes à
experiência: governo federal, Congresso, orçamento, cenário econômico,
tensões institucionais, eleições gerais de 2022, campanha eleitoral,
votação, transição e consequências de decisões do jogador. A
implementação deve respeitar a cronologia real, mas não obrigar a
trajetória simulada a reproduzir os mesmos resultados caso as ações do
jogador alterem o curso da campanha.

A data inicial não pode ser substituída silenciosamente pela data atual
do sistema. A data da campanha deve ser parte explícita do estado do
jogo.

## 2.2 Escopo das futuras expansões

As versões futuras estão fora do escopo jogável inicial:

-   **Expansão histórica 2023--2026:** incorporar dados, alterações
    institucionais e acontecimentos reais verificados dos anos
    seguintes.
-   **Expansão 2026--2030:** criar um cenário próprio que começa em 2026
    e simula o período de governo até 2030, com fatos confirmados
    incorporados conforme forem ocorrendo.

Na versão inicial, faça apenas o trabalho arquitetural necessário para
permitir cenários e pacotes de dados separados por período. Não invente
nem implemente antecipadamente os acontecimentos dessas expansões. Não
apresente projeções sobre o futuro como fatos. Uma futura atualização
poderá oferecer uma campanha histórica de 2022 atualizada
retrospectivamente, uma continuação da mesma campanha ou um cenário novo
de 2026; esses modos precisam ser conceitualmente distintos.

## 2.3 História observada versus história simulada

O sistema deve rotular informações conforme sua natureza:

-   **Fato histórico:** ocorreu no mundo real e tem fonte verificável.
-   **Dado observado:** indicador publicado por uma instituição, com
    período de referência.
-   **Estimativa:** valor estimado por uma fonte identificada ou pelo
    modelo de simulação.
-   **Abstração de jogo:** simplificação deliberada para tornar o
    sistema jogável.
-   **Evento contrafactual:** resultado que surge das decisões do
    jogador e não deve ser apresentado como fato histórico real.
-   **Projeção:** resultado condicional baseado em hipóteses, sempre
    identificado como tal.

Uma campanha alternativa pode divergir da história real. A interface e
as notícias precisam acompanhar a história interna da campanha, não
forçar resultados reais incompatíveis com as decisões tomadas.

------------------------------------------------------------------------

# 3. PILARES DA EXPERIÊNCIA

## 3.1 Fantasia central do jogador

O jogador deve sentir que está tentando governar o Brasil sob limites
reais. Ele precisa priorizar problemas, negociar com instituições,
escolher onde gastar recursos políticos e fiscais, lidar com
consequências imprevistas e explicar suas decisões à sociedade.

O jogador não deve receber sempre uma opção "boa" e outra "má". Decisões
difíceis devem envolver trade-offs. Uma política pode melhorar um
indicador e piorar outro; pode beneficiar o longo prazo e gerar custo
político imediato; pode ser tecnicamente eficiente, mas
institucionalmente inviável; pode ser popular, mas fiscalmente
insustentável.

## 3.2 Ciclo principal de jogo

Cada turno deve seguir um ciclo compreensível e consistente:

1.  **Fechamento do período anterior:** consolidar resultados, atrasos,
    despesas, votações, eventos e mudanças já ocorridas.
2.  **Relatório de situação:** apresentar os indicadores relevantes,
    notícias, riscos, alertas e explicações causais.
3.  **Definição de prioridades:** o jogador escolhe quais problemas
    pretende enfrentar e quais riscos aceita tolerar.
4.  **Preparação das decisões:** formular medidas, negociar apoio,
    selecionar instrumentos legais, alocar orçamento e definir a ordem
    de execução.
5.  **Resolução institucional:** verificar competência legal, recursos,
    apoio político, oposição, capacidade administrativa e possíveis
    contestações.
6.  **Resolução econômica e social:** calcular efeitos diretos,
    indiretos, atrasados e efeitos colaterais.
7.  **Reação dos atores:** atualizar comportamentos de partidos,
    parlamentares, governos estaduais, grupos sociais, empresas,
    sindicatos, imprensa e instituições.
8.  **Geração de acontecimentos:** verificar eventos históricos
    programados e eventos emergentes elegíveis.
9.  **Cobertura jornalística:** produzir manchetes e matérias coerentes
    com os resultados e com diferentes perspectivas editoriais.
10. **Resumo causal:** explicar o que mudou, por quê, quais decisões
    contribuíram e quais efeitos ainda estão pendentes.
11. **Salvamento:** registrar o estado completo e avançar a data do
    jogo.

A ordem exata pode ser ajustada por razões de implementação, mas precisa
ser determinística e documentada. Não se deve aplicar uma política duas
vezes por erro de ordem nem usar um valor de popularidade desatualizado
para resolver uma decisão.

## 3.3 Escala temporal

Use uma escala de turnos adequada à complexidade política. A preferência
inicial é por turnos mensais, com eventos específicos em datas
determinadas e mecanismos que permitam acompanhar votações ou crises
dentro de um mês quando necessário. Se uma ação exigir vários passos
institucionais, represente esse tempo de tramitação; não resolva toda
política complexa em um clique.

A simulação deve distinguir: - Data civil da campanha. - Período
contábil dos indicadores. - Data de anúncio de uma política. - Data de
aprovação legal. - Data de implementação. - Período em que os efeitos
começam a aparecer. - Data de divulgação de dados estatísticos.

Um indicador publicado em março pode descrever fevereiro ou o trimestre
anterior. Não confunda a data de publicação com o período medido.

------------------------------------------------------------------------

# 4. MODELO GERAL DE CAUSALIDADE

Esta seção é central. A IA implementadora não pode tratar causalidade
como um adjetivo: deve existir um modelo formal de como o estado do país
muda.

## 4.1 Estado do mundo

A cada turno, o jogo mantém um estado estruturado com, no mínimo: - Data
e identificador da campanha. - Indicadores macroeconômicos e fiscais. -
Estado do orçamento e fluxo de caixa público. - Capacidade
administrativa de cada órgão relevante. - Popularidade, confiança e
legitimidade. - Composição e comportamento do Congresso. - Estado das
relações federativas. - Condições de serviços públicos. - Segurança
pública e percepção de segurança. - Situação ambiental. - Relações
diplomáticas e comerciais. - Estado dos processos legislativos e
judiciais. - Políticas ativas, compromissos e projetos em andamento. -
Eventos pendentes e efeitos atrasados. - Opinião e prioridades dos
grupos sociais. - Estado da imprensa simulada. - Histórico de decisões,
resultados e explicações. - Estado de cada salvamento e versão dos dados
utilizados.

A interface nunca deve ser a fonte da verdade do jogo. Ela exibe uma
representação do estado mantido pelo motor de simulação.

## 4.2 Variáveis, fluxos e estoques

Diferencie **estoques** de **fluxos**.

Estoques são estados acumulados: dívida pública, infraestrutura
disponível, capacidade hospitalar, confiança institucional, capital
político, estoque de conhecimento escolar, desmatamento acumulado ou
capacidade administrativa.

Fluxos são mudanças por unidade de tempo: receitas, despesas, novos
investimentos, crescimento do PIB, contratações, emissões, novos
processos ou perda de confiança.

Exemplo: construir uma escola não aumenta instantaneamente o aprendizado
nacional. Primeiro existe gasto e obra; depois a escola entra em
operação; então são necessários professores, materiais, gestão e tempo
para que o acesso melhore; os resultados educacionais surgem com
defasagem. Se faltar pessoal ou manutenção, a capacidade física pode
existir sem gerar o resultado esperado.

A mesma lógica deve valer para outros sistemas. O estoque de dívida muda
pelo déficit, pelo custo dos juros, por ajustes contábeis e pelo
crescimento nominal da economia. A popularidade pode reagir a notícias
do mês, mas a confiança acumulada tende a mudar mais lentamente.

## 4.3 Cadeias causais

Cada política ou evento deve ter uma cadeia causal identificável:

**Decisão → instrumento legal e administrativo → custo e capacidade de
execução → mecanismo intermediário → resultado direto → efeitos
indiretos → reação dos atores → efeitos de segunda ordem → consequências
tardias.**

Exemplo de política de investimento em infraestrutura: 1. O governo
anuncia uma obra. 2. O anúncio pode gerar expectativa e reação política,
mas não produz imediatamente a obra. 3. A equipe prepara projeto,
licença, orçamento, licitação e contrato. 4. A obra enfrenta riscos de
atraso, aumento de custo, contestação e baixa capacidade de execução. 5.
Durante a construção, há gasto público e demanda por trabalho e insumos.
6. Após a conclusão, o ativo pode reduzir custos logísticos ou ampliar
acesso. 7. A produtividade pode melhorar se houver manutenção,
conectividade e demanda. 8. O efeito fiscal depende do custo inicial, do
financiamento, da manutenção e dos ganhos econômicos. 9. Os benefícios
se distribuem de forma desigual entre regiões e grupos. 10. A opinião
pública pode reagir ao anúncio, aos atrasos, aos custos e aos
resultados, em momentos diferentes.

Não é obrigatório que todos os efeitos apareçam em cada política, mas a
estrutura do modelo deve permitir essas etapas. Os efeitos devem ser
parametrizados e testáveis.

## 4.4 Tipos de causalidade que devem existir

### A. Efeito direto

Consequência próxima do instrumento. Exemplo: aumentar uma alíquota
legalmente aplicável pode elevar a obrigação tributária de determinado
grupo.

### B. Efeito mediado

A decisão atua por meio de uma variável intermediária. Exemplo:
investimento em formação profissional pode aumentar competências, o que
pode melhorar produtividade e empregabilidade ao longo do tempo.

### C. Efeito indireto

Uma consequência aparece em outro sistema. Exemplo: atraso de obras pode
reduzir a confiança empresarial, alterar investimento e afetar emprego
regional.

### D. Efeito de segunda ordem

A consequência de uma consequência. Exemplo: redução de investimento
pode diminuir crescimento; crescimento menor pode reduzir receitas;
receitas menores podem forçar contingenciamento; contingenciamento pode
atrasar serviços e agravar insatisfação.

### E. Efeito de equilíbrio ou retroalimentação

O resultado modifica as condições que influenciam o resultado futuro.
Exemplo: inflação maior pode levar a juros maiores; juros maiores podem
reduzir crédito e demanda; demanda mais fraca pode reduzir pressão
inflacionária, com defasagens e custos para emprego e atividade.

### F. Efeito de sinalização

O anúncio ou a credibilidade da política pode mudar expectativas antes
de haver implementação material. A sinalização não substitui a execução
e pode se inverter se o governo perder credibilidade.

### G. Efeito de antecipação

Atores podem agir antes da data formal. Empresas podem antecipar
compras, parlamentares podem negociar antes de uma votação, consumidores
podem adiantar consumo diante de uma mudança tributária anunciada.

### H. Efeito de composição e distribuição

A média nacional pode esconder diferenças. Uma política pode beneficiar
alguns estados e prejudicar outros, aumentar a renda de um grupo e
reduzir a de outro, ou melhorar um indicador agregado sem melhorar
igualmente o bem-estar.

### I. Efeito de limiar

Alguns resultados mudam de natureza quando a variável cruza um limite.
Uma unidade de atraso pode ser administrável; atrasos sucessivos podem
romper um contrato, interromper serviço ou desencadear crise de
confiança. Evite limiares arbitrários e documente os usados.

### J. Efeito de saturação

A mesma intervenção pode render menos conforme o sistema se aproxima de
um limite. Mais leitos sem profissionais, mais fiscalização sem
investigação qualificada ou mais investimento sem projetos maduros não
geram ganhos proporcionais indefinidamente.

### K. Efeito irreversível ou de reversão lenta

Desmatamento, perda de confiança, formação educacional interrompida,
dívida acumulada ou deterioração de infraestrutura não desaparecem
imediatamente quando a política muda. Modele recuperação gradual quando
pertinente.

### L. Efeito de choque externo

Eventos fora do controle do governo podem alterar os resultados: demanda
internacional, preço de commodities, condições climáticas, crises
globais ou decisões de parceiros. O governo pode mitigar, adaptar-se ou
amplificar esses efeitos, mas não controlar o evento externo
diretamente.

### M. Efeito de implementação incompleta

Uma lei aprovada pode não produzir o resultado previsto se faltar
regulamentação, orçamento, servidores, coordenação federativa, sistemas
de informação ou fiscalização.

### N. Efeito de reação estratégica

Atores mudam de comportamento quando percebem a estratégia do governo.
Uma fiscalização pode reduzir infrações, mas também deslocá-las para
outras regiões; uma negociação pode obter votos agora e elevar o custo
de futuras negociações; uma política eleitoralmente popular pode levar
adversários a formar uma coalizão de oposição.

### O. Efeito de seleção e viés de observação

Os dados disponíveis podem refletir apenas parte da realidade. Aumento
de registros de crime pode significar mais crimes, maior confiança na
denúncia ou melhoria da capacidade de registro. O jogo não deve inferir
automaticamente a realidade a partir de um único indicador sem
considerar a qualidade da medição.

## 4.5 Força, sinal, atraso e confiança causal

Cada relação causal deve declarar: - Variável de origem. - Variável
afetada. - Direção esperada do efeito. - Intensidade ou coeficiente. -
Defasagem mínima e distribuição temporal. - Condições que ampliam ou
reduzem o efeito. - Possíveis efeitos concorrentes. - Limites, saturação
ou limiares. - Grau de confiança ou qualidade da evidência. - Fonte ou
justificativa do parâmetro. - Testes que verificam se a relação se
comporta como esperado.

Evite fórmulas que impliquem precisão científica inexistente. Em áreas
nas quais não há parâmetros empíricos confiáveis, use abstrações de jogo
explicitamente documentadas, calibradas para plausibilidade e
equilíbrio.

## 4.6 Atribuição causal e explicabilidade

Quando um indicador mudar, o motor deve manter um registro dos
principais fatores que contribuíram para a mudança. O registro pode
decompor a variação em contribuições estimadas: política A, choque
externo B, defasagem de política C, comportamento de atores D e ruído
aleatório controlado E.

Não atribua toda mudança à decisão mais recente. Se a inflação subiu, a
explicação pode incluir demanda, oferta, câmbio, preços externos,
expectativas e política monetária, conforme os mecanismos implementados.
Se a popularidade caiu, o sistema deve considerar resultados materiais,
expectativas, escândalos, polarização, cobertura da imprensa e variações
regionais.

A explicação ao jogador deve separar: - O que aconteceu. - Quais fatores
contribuíram. - O que o governo controlava. - O que veio de fora. -
Quais hipóteses são incertas. - Quais efeitos ainda estão pendentes.

## 4.7 Aleatoriedade e determinismo

O motor deve ser reproduzível. Use um gerador pseudoaleatório com
semente por campanha, ou mecanismo equivalente. O mesmo estado inicial,
as mesmas decisões, a mesma versão do motor e a mesma semente devem
produzir o mesmo resultado.

A aleatoriedade pode representar incerteza real: resultado de
negociação, atraso de obra, reação de mercado ou ocorrência de evento
elegível. Ela nunca deve servir como desculpa para ignorar causalidade.
Registre as sementes e os resultados relevantes para depuração.

Não use chamadas aleatórias independentes na interface. A aleatoriedade
pertence ao motor de simulação.

------------------------------------------------------------------------

# 5. CONSEQUÊNCIAS: CATEGORIAS, INTENSIDADE E DISTRIBUIÇÃO

Toda ação importante deve ter uma ficha de consequências. Não basta
exibir "+5 popularidade" ou "−3 economia". As consequências precisam ser
contextualizadas e rastreáveis.

## 5.1 Categorias de consequência

Cada consequência pode pertencer a uma ou várias destas categorias:

1.  **Fiscal:** receita, despesa, déficit, dívida, custo de juros,
    obrigação futura e risco de execução orçamentária.
2.  **Macroeconômica:** inflação, atividade econômica, emprego, crédito,
    câmbio, investimento e expectativas.
3.  **Administrativa:** capacidade de execução, qualidade da gestão,
    burocracia, coordenação, pessoal, sistemas e cumprimento de metas.
4.  **Legislativa:** apoio, oposição, agenda, concessões, tramitação,
    emendas, comissões e probabilidade de aprovação.
5.  **Jurídica e constitucional:** competência, conformidade legal,
    risco de judicialização, decisões judiciais e necessidade de
    regulamentação.
6.  **Federativa:** cooperação ou conflito com estados e municípios,
    transferências, repartição de competências e desigualdade regional.
7.  **Social e distributiva:** renda, acesso, pobreza, desigualdade,
    grupos beneficiados e grupos prejudicados.
8.  **Serviços públicos:** cobertura, qualidade, tempo de espera,
    acesso, continuidade e capacidade.
9.  **Segurança e justiça criminal:** prevenção, investigação,
    policiamento, violência, sistema prisional, direitos e confiança
    institucional.
10. **Ambiental e territorial:** emissões, desmatamento, fiscalização,
    licenciamento, uso do solo, riscos climáticos e biodiversidade.
11. **Diplomática e geopolítica:** confiança externa, comércio, acordos,
    cooperação, sanções, influência e exposição a riscos internacionais.
12. **Eleitoral:** aprovação, mobilização, alianças, rejeição,
    competitividade e confiança no processo eleitoral.
13. **Comunicacional e reputacional:** credibilidade, percepção de
    competência, enquadramento midiático e capacidade de explicar
    resultados.
14. **Institucional:** autonomia, estabilidade, legitimidade, respeito
    às regras, previsibilidade e qualidade das relações entre Poderes.
15. **Ética e integridade:** conflito de interesses, transparência,
    controles, risco de corrupção e responsabilização.
16. **Territorial:** efeitos específicos por estado, região, área urbana
    ou rural.
17. **Temporal:** efeitos imediatos, de curto, médio e longo prazo.
18. **Sistêmica:** efeitos indiretos, externalidades, retroalimentações
    e riscos de contágio entre sistemas.
19. **Informacional:** qualidade, atraso, cobertura e confiabilidade dos
    dados disponíveis.
20. **De oportunidade:** recursos, tempo e capital político que deixam
    de estar disponíveis para outra prioridade.

## 5.2 Horizonte temporal

Classifique as consequências por horizonte: - **Imediato:** anúncio,
reação política, custo inicial, expectativa ou evento do próprio
turno. - **Curto prazo:** efeitos em um ou poucos turnos. - **Médio
prazo:** resultados que dependem de execução, adaptação e maturação. -
**Longo prazo:** efeitos estruturais em produtividade, educação,
infraestrutura, saúde, dívida, ambiente e instituições.

O horizonte deve ser específico para cada mecanismo. Não aplique o mesmo
atraso a todas as políticas.

## 5.3 Sinal e intensidade

Uma consequência pode ser positiva, negativa, mista, condicional ou
incerta. "Positiva" não significa universalmente boa: uma alta de juros
pode reduzir pressões inflacionárias e ao mesmo tempo encarecer o
crédito. O sistema deve representar ambos os lados.

Use intensidades interpretáveis, como muito baixa, baixa, moderada, alta
e muito alta, quando valores numéricos precisos não forem apropriados.
Internamente, use unidades e magnitudes consistentes. Não misture uma
escala arbitrária de popularidade com percentuais reais sem deixar clara
a diferença.

## 5.4 Distribuição de efeitos

Toda política significativa deve responder: - Quem recebe o benefício? -
Quem paga o custo? - Em qual região? - Em qual período? - O efeito
depende de renda, setor, idade, localização ou acesso a serviços? - Há
efeitos diferentes no curto e no longo prazo? - Há grupos que não
conseguem acessar o benefício? - Existem compensações, transições ou
efeitos de deslocamento?

Uma média nacional não deve apagar a distribuição. O sistema pode
apresentar uma visão agregada e uma visão por grupos ou regiões.

## 5.5 Consequências pretendidas e não pretendidas

Registre separadamente: - Objetivo declarado. - Resultado esperado. -
Resultado efetivamente calculado. - Efeitos colaterais previsíveis. -
Efeitos inesperados gerados pelas interações. - Condições que
falharam. - Possibilidade de correção.

Consequências inesperadas devem emergir de regras ou eventos elegíveis,
não de arbitrariedade narrativa.

## 5.6 Custos de oportunidade

Recursos são limitados. Dinheiro usado em uma política não pode ser
usado simultaneamente em outra, salvo se houver financiamento ou
alteração de receita explicitamente modelada. O tempo parlamentar, a
capacidade administrativa e o capital político também são escassos.

Se o governo prioriza uma grande reforma, pode atrasar projetos menores.
Se usa capital político para uma votação difícil, fica com menos margem
para negociar outras medidas no curto prazo. O jogo deve tornar essas
trocas visíveis.

------------------------------------------------------------------------

# 6. GOVERNO FEDERAL, PRESIDÊNCIA E CAPACIDADE DE EXECUÇÃO

## 6.1 Presidência não é poder absoluto

O jogador define prioridades, escolhe instrumentos dentro das
competências do Executivo, nomeia autoridades conforme as regras
aplicáveis, negocia com outros Poderes e coordena a administração
federal. Não controla diretamente decisões autônomas do Congresso, do
Judiciário, de governos estaduais, de agentes econômicos ou da
sociedade.

Cada ação deve verificar: - Competência legal do Executivo. -
Instrumento jurídico adequado. - Necessidade de lei, crédito
orçamentário, regulamentação ou autorização. - Recursos disponíveis. -
Capacidade administrativa. - Apoio político necessário. - Possibilidade
de contestação. - Prazo realista de implementação.

Se o jogador tentar uma ação juridicamente inviável, explique o problema
e ofereça caminhos institucionais possíveis quando existirem.

## 6.2 Agenda presidencial

O governo possui uma agenda limitada. O jogador escolhe prioridades e
organiza medidas por importância, urgência, custo e viabilidade. Uma
agenda muito extensa sobrecarrega equipes, aumenta atrasos e diminui a
qualidade da implementação.

Cada proposta pode ter: - Objetivo mensurável. - Órgão responsável. -
Instrumento jurídico. - Custo estimado. - Fonte de financiamento. -
Prazo de preparação. - Prazo de implementação. - Dependências. -
Indicadores de resultado. - Riscos e grupos afetados. - Requisitos de
coordenação.

## 6.3 Ministérios e equipe

Ministérios devem ter competências, recursos, capacidade técnica,
prioridades e relações políticas. A escolha de um ministro pode melhorar
coordenação, conhecimento técnico, relacionamento com uma bancada ou
confiança de um grupo, mas também pode gerar conflito, desgaste ou custo
de coalizão.

Características sugeridas para autoridades: - Competência técnica
relevante. - Experiência administrativa. - Capacidade de coordenação. -
Confiança política. - Relações com partidos e grupos. - Integridade e
risco reputacional. - Capacidade de comunicação. - Compatibilidade com
prioridades presidenciais. - Dependência de apoio legislativo ou
federativo.

Evite converter pessoas reais em caricaturas ou atribuir acusações não
verificadas. Use dados públicos confiáveis e deixe explícitas as
abstrações de jogo. Se não houver informação suficiente, use atributos
genéricos em vez de inventar fatos.

## 6.4 Capacidade administrativa

A capacidade administrativa determina quanto da política anunciada é
efetivamente entregue. Ela depende de orçamento, equipe, sistemas,
coordenação, qualidade de projetos, compras, fiscalização, estabilidade
organizacional e experiência.

Uma política pode ser aprovada, financiada e ainda assim ter execução
baixa. O jogo deve representar: - Atraso de regulamentação. - Falta de
pessoal. - Gargalos de contratação. - Projetos imaturos. -
Descoordenação entre órgãos. - Falta de dados. - Corrupção ou fraude
como riscos tratados com cuidado e sem automatismo. - Mudanças de
prioridade. - Dependência de terceiros.

A capacidade pode melhorar por investimento em gestão, treinamento,
simplificação, digitalização e estabilidade, mas tais melhorias também
custam tempo e recursos.

## 6.5 Capital político

Capital político é a capacidade de mobilizar apoio, negociar, persuadir
e sustentar decisões. Não é sinônimo de popularidade.

Ele pode aumentar com vitórias legislativas, credibilidade, cumprimento
de compromissos e coalizões estáveis. Pode cair com derrotas, promessas
descumpridas, crises, conflitos desnecessários, perda de confiança ou
uso excessivo de concessões.

Capital político deve ter dimensões distintas: - Apoio social. -
Confiança de aliados. - Capacidade de negociação. - Credibilidade
institucional. - Coesão da coalizão. - Capacidade de mobilização.

Um presidente popular pode não ter maioria parlamentar; um presidente
impopular pode ainda ter uma coalizão legislativa funcional. Não colapse
todas as dimensões em um único número.

------------------------------------------------------------------------

# 7. CONGRESSO NACIONAL E NEGOCIAÇÃO LEGISLATIVA

## 7.1 Estrutura institucional

Represente Câmara dos Deputados e Senado Federal como casas distintas,
com composição, regras, mandatos, liderança, comissões e processos
próprios. Respeite o bicameralismo e os procedimentos constitucionais
pertinentes. Não transforme o Congresso em uma barra única de apoio.

A base de dados deve registrar partidos, bancadas, lideranças e
características públicas relevantes, com data de referência. Como o foco
inicial é 2022, a composição e as posições iniciais precisam refletir
aquele contexto histórico, sem importar silenciosamente a composição de
outro ano.

## 7.2 Posição de parlamentares e partidos

A posição de cada ator legislativo deve derivar de fatores como: -
Ideologia e prioridades programáticas. - Interesses regionais. -
Orientação partidária. - Relação com o Executivo. - Benefícios e custos
da proposta para sua base. - Compromissos assumidos. - Pressão de
eleitores e grupos organizados. - Custo eleitoral de apoiar ou
rejeitar. - Reputação e credibilidade do governo. - Relevância da
matéria para o partido. - Conflitos internos. - Negociações anteriores e
confiança acumulada.

Partidos não devem votar sempre em bloco perfeito. É possível modelar
disciplina partidária com variação individual. A disciplina pode
depender do tema, da liderança, da coesão e do contexto eleitoral.

## 7.3 Caminho de um projeto

Uma proposta legislativa deve percorrer estados como: 1. Rascunho e
preparação. 2. Escolha de instrumento e autoria adequada. 3. Protocolo.
4. Distribuição e análise em comissão, quando aplicável. 5. Relatoria,
parecer e emendas. 6. Negociação de texto. 7. Inclusão ou não na pauta.
8. Votação em uma casa. 9. Revisão pela outra casa, quando aplicável.
10. Sanção, veto ou promulgação, conforme o tipo de matéria. 11.
Possível análise de veto e demais etapas previstas. 12. Regulamentação e
execução administrativa.

Nem toda proposta precisa passar exatamente pelo mesmo fluxo. O motor
deve codificar caminhos de tramitação por tipo de matéria e evitar
atalhos juridicamente incorretos.

## 7.4 Negociação

Negociar deve ser um sistema de escolhas, não um botão "comprar votos".
O jogador pode: - Ajustar o texto. - Fazer concessões programáticas. -
Priorizar demandas regionais legalmente cabíveis. - Negociar relatorias
e agenda conforme as regras. - Construir compromissos públicos. -
Investir tempo em diálogo. - Buscar apoio multipartidário. - Aceitar
emendas. - Adiar a votação. - Retirar ou reformular a proposta.

Toda concessão tem custo fiscal, programático, reputacional,
administrativo ou de oportunidade. Uma concessão pode aumentar a
probabilidade de aprovação, mas gerar resistência em aliados, perda de
coerência programática ou dificuldade de implementar a versão final.

## 7.5 Probabilidade e resultado

A aprovação deve resultar de fatores observáveis no estado do jogo:
composição, apoio individual, disciplina, texto, agenda, custo político,
contexto, negociação e regras de votação. O jogo pode usar
probabilidades e incerteza, mas precisa exibir os principais motivos da
estimativa.

Antes de votar, o jogador deve conseguir consultar: - Apoio provável. -
Oposição provável. - Indecisos. - Quórum ou requisito relevante. -
Riscos de emendas. - Consequências de uma derrota. - Custos de adiar a
matéria.

Não revele informação perfeita se o governo não tiver meios de obtê-la.
Use faixas ou estimativas quando necessário.

## 7.6 Consequências políticas de votações

Aprovar uma medida pode fortalecer o governo, cumprir uma promessa e
melhorar um resultado material. Também pode desgastar a coalizão,
desagradar grupos, exigir concessões e criar obrigações futuras.

Uma derrota pode: - Reduzir credibilidade. - Fortalecer a oposição. -
Adiar benefícios de uma política. - Mostrar limites da agenda. -
Incentivar revisão de texto ou estratégia. - Aumentar a coesão da
oposição. - Ou, em certas condições, reduzir o custo de uma proposta
impopular que deixou de ser aprovada.

Não aplique penalidade automática idêntica a toda derrota. O efeito
depende da importância da proposta, da expectativa pública, do placar,
da narrativa e da capacidade do governo de reagir.

------------------------------------------------------------------------

# 8. ORÇAMENTO, FINANÇAS PÚBLICAS E POLÍTICA FISCAL

## 8.1 Orçamento como restrição real

O orçamento não é uma carteira ilimitada. O jogador deve lidar com
receitas, despesas obrigatórias, despesas discricionárias,
investimentos, transferências, dívida, juros, contingenciamento e
limites institucionais.

Diferencie: - Dotação autorizada. - Empenho. - Liquidação. -
Pagamento. - Restos a pagar. - Despesa recorrente. - Despesa
temporária. - Investimento. - Renúncia de receita. - Garantia e
obrigação contingente.

Não é necessário reproduzir toda a contabilidade pública em detalhe na
primeira versão, mas a abstração escolhida deve preservar as diferenças
que alteram decisões e consequências.

## 8.2 Fontes de receita

As receitas podem responder a: - Atividade econômica. - Emprego e
renda. - Lucros e consumo. - Alíquotas e bases tributárias. -
Cumprimento tributário e fiscalização. - Comércio exterior. -
Transferências e receitas extraordinárias. - Mudanças legais e
defasagens de arrecadação.

Uma elevação de alíquota não deve gerar receita infinita. A base
tributária pode responder ao comportamento econômico, à evasão, à
substituição de consumo, ao planejamento tributário e à capacidade de
fiscalização. Os parâmetros devem ser documentados e não apresentados
como previsões científicas exatas.

## 8.3 Despesas e rigidez

Classifique despesas conforme sua flexibilidade e função. Algumas podem
ser alteradas rapidamente; outras dependem de lei, contratos,
benefícios, regras constitucionais ou prazos administrativos. O jogador
não deve cortar arbitrariamente qualquer despesa sem consequência legal
ou operacional.

Cortes podem reduzir o déficit no curto prazo, mas também afetar
manutenção, serviços, investimento, emprego ou capacidade futura. A
expansão de gastos pode melhorar serviços e demanda, mas aumentar o
déficit ou deslocar outras prioridades.

## 8.4 Déficit, dívida e juros

O modelo deve distinguir resultado primário, despesa com juros e
dinâmica da dívida. A dívida pode aumentar quando o governo financia
déficits, quando o custo de juros supera o crescimento nominal relevante
ou quando ocorrem ajustes. A razão dívida/PIB depende tanto da dívida
quanto do PIB nominal.

Aumentar dívida não deve produzir automaticamente colapso. O risco
depende de trajetória, custo de financiamento, credibilidade,
crescimento, estrutura de vencimentos, moeda, contexto externo e
capacidade institucional. Da mesma forma, reduzir o déficit não deve
produzir automaticamente prosperidade. O efeito depende de como o ajuste
é feito, do ciclo econômico e da qualidade do gasto.

## 8.5 Contingenciamento e execução

Quando receitas ficam abaixo do esperado ou restrições legais exigem
ajuste, o governo pode precisar limitar a execução. O contingenciamento
deve atingir despesas conforme regras configuradas, afetando cronogramas
e resultados. Não use uma redução abstrata de "orçamento" sem indicar
quais políticas e serviços serão afetados.

## 8.6 Política fiscal e distribuição

Tributos e gastos têm efeitos distributivos. Um subsídio pode favorecer
determinado setor ou região; um benefício pode reduzir vulnerabilidade;
uma renúncia fiscal pode estimular investimento em algumas condições e
apenas transferir renda em outras. Modele beneficiários, custos,
incentivos e efeitos de substituição quando relevante.

------------------------------------------------------------------------

# 9. ECONOMIA: MACROECONOMIA, EXPECTATIVAS E CHOQUES

## 9.1 Princípios

A economia deve ser um sistema interligado, não uma sequência de bônus.
O modelo inicial pode ser simplificado, mas precisa explicar como
atividade, inflação, emprego, juros, câmbio, crédito, investimento,
contas públicas e setor externo se influenciam.

Diferencie indicadores observados da realidade econômica simulada. Os
valores históricos de início podem vir de fontes públicas, mas as
trajetórias posteriores na campanha alternativa são resultados do modelo
de jogo.

## 9.2 Atividade econômica e PIB

A atividade pode depender de consumo, investimento, gastos públicos,
exportações líquidas, produtividade, confiança, crédito e condições
externas. Não é necessário modelar cada setor com um sistema
econométrico completo, mas a decomposição escolhida deve permitir que o
jogador entenda os canais.

Investimento público pode elevar demanda durante a execução e capacidade
produtiva no futuro. Se a obra for mal selecionada, atrasar ou não tiver
manutenção, o ganho pode ser menor. Cortes abruptos podem reduzir
demanda no curto prazo, mas efeitos futuros dependem do que foi cortado
e da reação de outros componentes.

## 9.3 Inflação

A inflação deve refletir uma combinação plausível de pressões de
demanda, custos, câmbio, expectativas, oferta, preços administrados e
choques externos, conforme o nível de detalhe adotado. Não atribua toda
inflação a um único fator.

O jogo deve separar nível de preços e taxa de inflação. Se a inflação
anual cai, isso não significa necessariamente que os preços voltaram ao
nível anterior. Choques temporários e persistentes precisam ter
tratamento diferente.

## 9.4 Juros e Banco Central

O Banco Central deve ser modelado conforme sua estrutura institucional e
autonomia aplicável. O presidente não deve controlar diretamente a taxa
básica de juros por decreto.

A política monetária reage ao cenário de inflação, atividade,
expectativas e riscos, conforme uma regra de jogo documentada e
simplificada. A comunicação e a credibilidade importam, mas não devem
transformar o sistema em um mecanismo arbitrário.

Juros maiores podem ajudar a conter pressões inflacionárias e
expectativas, mas também encarecem crédito, investimento e serviço da
dívida, podendo reduzir atividade e emprego com defasagem. Juros menores
podem apoiar demanda e crédito, mas aumentar pressões de preços ou
cambiais em determinadas condições. Os efeitos dependem do contexto e
não são instantâneos.

## 9.5 Câmbio e setor externo

O câmbio deve reagir a condições externas, diferencial de juros, risco
percebido, fluxo comercial, expectativas, commodities e credibilidade,
com simplificações explícitas. O governo pode influenciar parte do
contexto, mas não escolher livremente uma taxa de câmbio estável.

A depreciação pode favorecer exportadores e encarecer importações e
insumos; pode contribuir para inflação e alterar balanços de empresas
endividadas em moeda estrangeira. A apreciação pode baratear importações
e reduzir pressões de custo, mas pressionar alguns setores exportadores.
Distribua efeitos por setor.

## 9.6 Emprego, renda e produtividade

Emprego depende de atividade, composição setorial, produtividade,
custos, crédito, qualificação e condições institucionais. Programas de
formação têm defasagem; incentivos mal desenhados podem subsidiar
contratações que ocorreriam de qualquer forma; proteção social pode
melhorar bem-estar sem necessariamente produzir efeito imediato no
emprego.

Não faça a taxa de desemprego reagir de forma instantânea a toda mudança
do PIB. Modele atrasos, participação na força de trabalho e diferenças
entre quantidade e qualidade do emprego quando viável.

## 9.7 Choques e incerteza

O motor deve permitir choques exógenos configuráveis, como variações de
preços internacionais, eventos climáticos, interrupções logísticas ou
desaceleração global. Cada choque precisa indicar quais variáveis afeta,
por quais canais, com que duração e quais políticas podem mitigar os
efeitos.

------------------------------------------------------------------------

# 10. POLÍTICA MONETÁRIA, REGULAÇÃO E AUTONOMIA INSTITUCIONAL

O jogo deve representar que diferentes instituições têm mandatos,
instrumentos e limites próprios. O Executivo pode dialogar, propor leis
e reagir aos resultados, mas não pode simplesmente comandar toda
instituição autônoma.

Quando uma decisão depender de agência reguladora, Banco Central,
tribunal, órgão de controle ou outra entidade com competências próprias,
represente: - Mandato legal. - Competência e instrumento. - Capacidade e
recursos. - Processo decisório. - Incentivos institucionais. - Pressões
externas legítimas e ilegítimas. - Transparência e responsabilização. -
Possibilidade de revisão judicial ou administrativa.

A influência política pode existir como contexto, mas não deve apagar as
regras legais. Tentativas de interferência indevida devem gerar
consequências institucionais, reputacionais e jurídicas conforme a
gravidade e a reação dos atores.

------------------------------------------------------------------------

# 11. JUDICIÁRIO, CONSTITUIÇÃO E ESTADO DE DIREITO

## 11.1 Competência e processo

O Judiciário não é um botão de aprovação ou rejeição do governo.
Decisões judiciais decorrem de processos, competência, argumentos,
precedentes, composição, procedimentos e prazos.

Para cada medida relevante, o jogo deve avaliar risco de contestação com
base em: - Competência do órgão que editou a medida. - Compatibilidade
com normas superiores. - Procedimento adotado. - Direitos afetados. -
Precedentes ou entendimentos configurados. - Qualidade da
fundamentação. - Legitimidade dos requerentes e caminho processual
abstrato. - Contexto de conflito institucional.

Não simule detalhes jurídicos inexistentes como se fossem aconselhamento
legal real. A abstração deve ser educativa e coerente.

## 11.2 Processo judicial

Uma contestação pode passar por ajuizamento, análise inicial, decisão
provisória, contraditório, julgamento, recurso e cumprimento, quando o
fluxo aplicável assim exigir. Prazos podem variar e devem ser modelados
como faixas ou etapas, não como certeza universal.

Uma liminar pode suspender temporariamente uma política; uma decisão
posterior pode mantê-la, anulá-la parcialmente ou alterar sua execução.
A decisão deve afetar o estado administrativo e gerar notícias
consistentes.

## 11.3 Consequências institucionais

Respeitar decisões pode ter custo político, mas preservar
previsibilidade e estabilidade institucional. Descumprir decisões pode
desencadear sanções, crise, insegurança jurídica, reação de outros
Poderes e perda de confiança.

Não recompense automaticamente ataques às instituições como estratégia
eficiente. O jogo pode permitir decisões de alto risco, mas deve
representar os custos e as consequências com seriedade e sem moralização
simplista.

## 11.4 Direitos e devido processo

Políticas de segurança, vigilância, protestos, imigração, privacidade e
justiça devem considerar legalidade, proporcionalidade, direitos,
fiscalização e mecanismos de responsabilização. Não trate violações de
direitos como simples modificadores de popularidade. Elas podem afetar
vítimas, confiança institucional, litigância, cooperação comunitária e
legitimidade.

------------------------------------------------------------------------

# 12. FEDERAÇÃO: ESTADOS, MUNICÍPIOS E DIFERENÇAS REGIONAIS

## 12.1 Competências e cooperação

O Brasil é uma federação. A União não controla diretamente todas as
políticas executadas nos estados e municípios. O jogo deve distinguir
competências, financiamento, execução e coordenação.

O governo federal pode usar transferências, programas pactuados, normas
nacionais quando cabíveis, financiamento, cooperação técnica, convênios
e negociação política. Cada instrumento tem condições, custos, limites
legais e riscos de execução.

## 12.2 Governadores e prefeitos

Governadores e prefeitos devem ter prioridades, incentivos eleitorais,
capacidades e alinhamentos diferentes. Um aliado pode cooperar em
determinadas áreas e discordar em outras. Um adversário pode cooperar se
houver benefício público ou regional relevante.

A cooperação depende de: - Alinhamento partidário e programático. -
Necessidade fiscal local. - Benefícios regionais. - Confiança e
histórico de acordos. - Opinião pública local. - Capacidade
administrativa. - Competência constitucional. - Condições de
transferência e contrapartidas.

Não trate alinhamento partidário como obediência automática.

## 12.3 Heterogeneidade regional

Estados e regiões devem diferir em população, estrutura produtiva,
renda, infraestrutura, urbanização, exposição a riscos, capacidade
fiscal e necessidades de serviços. Use dados confiáveis quando possível.
Onde a primeira versão não tiver detalhe suficiente, agrupe regiões com
transparência e mantenha a arquitetura preparada para granularidade
maior.

Uma política nacional pode produzir resultados diferentes conforme a
região. Uma obra pode beneficiar um corredor logístico específico; um
programa de saúde pode enfrentar falta de profissionais em determinadas
áreas; uma política ambiental pode ter custos concentrados e benefícios
distribuídos.

## 12.4 Transferências e incentivos

Transferências federais devem distinguir recursos vinculados,
transferências com critérios, convênios e outros instrumentos
simplificados. Os incentivos podem melhorar execução, mas também criar
dependência, conflito distributivo, disputa política e dificuldade de
sustentabilidade.

O sistema deve mostrar quem recebe, quem executa, quais contrapartidas
existem e quais resultados são esperados.

------------------------------------------------------------------------

# 13. POLÍTICAS PÚBLICAS E SERVIÇOS ESSENCIAIS

Toda política pública deve ser representada por uma cadeia de entrega,
não apenas por um anúncio.

## 13.1 Ficha padrão de política

Cada política deve conter: - Nome e objetivo. - Problema que pretende
enfrentar. - População-alvo. - Órgão responsável. - Instrumento
jurídico. - Custo de implantação. - Custo recorrente. - Fonte de
financiamento. - Requisitos de pessoal e infraestrutura. - Prazo de
preparação. - Prazo de execução. - Dependências de outros órgãos ou
entes federativos. - Indicadores de processo. - Indicadores de
resultado. - Efeitos esperados por grupo e região. - Riscos e efeitos
colaterais. - Evidência e fonte, quando houver. - Grau de abstração do
modelo. - Condições de encerramento, revisão ou ampliação.

## 13.2 Saúde

Saúde deve envolver financiamento, atenção primária, hospitais,
profissionais, medicamentos, vacinação, prevenção, vigilância, gestão e
distribuição territorial.

Aumentar orçamento pode melhorar resultados, mas depende de execução,
compras, pessoal, infraestrutura, coordenação e prioridades. Expandir
capacidade física sem equipe não garante atendimento. Prevenção pode
custar agora e reduzir custos ou danos futuros. Filas e resultados podem
responder com atraso.

Indicadores possíveis: acesso, cobertura, espera, capacidade,
continuidade, prevenção e resultados agregados. Evite representar saúde
como um único número de "qualidade".

## 13.3 Educação

Educação deve distinguir acesso, permanência, aprendizagem,
infraestrutura, formação de professores, gestão, alimentação e
desigualdades regionais. Obras e contratação têm prazos. Aprendizagem
depende de continuidade, contexto familiar, condições escolares, gestão
e formação; não muda integralmente em um turno.

Uma política pode melhorar matrícula sem melhorar imediatamente a
aprendizagem. A avaliação deve considerar distribuição regional e grupos
com necessidades distintas.

## 13.4 Infraestrutura e logística

Projetos devem passar por planejamento, licenciamento, financiamento,
contratação, construção e manutenção. Podem atrasar, exceder custos ou
não atingir o resultado previsto. O benefício depende da localização,
conexão com outras redes, demanda e operação.

A obra gera atividade econômica durante a construção e pode gerar ganhos
de produtividade depois de entrar em operação. Os dois efeitos devem ser
separados.

## 13.5 Assistência social e redução da pobreza

Programas de transferência de renda, serviços e proteção devem ter
elegibilidade, cobertura, valor, custo, capacidade cadastral, risco de
exclusão, risco de fraude e interação com emprego e renda.

Os efeitos podem incluir redução de pobreza e insegurança, aumento de
consumo local e mudanças nos incentivos, mas dependem do desenho e do
contexto. Não presuma automaticamente que qualquer programa causa
dependência ou que qualquer transferência resolve problemas estruturais.

## 13.6 Habitação e saneamento

Habitação e saneamento dependem de terrenos, infraestrutura,
financiamento, licenças, coordenação local, operação e manutenção.
Construir unidades sem acesso a transporte, emprego ou serviços pode
reduzir o benefício real. Saneamento pode melhorar saúde e ambiente com
defasagem e efeitos territoriais.

## 13.7 Ciência, tecnologia e inovação

Pesquisa e inovação exigem continuidade, capital humano, instituições,
financiamento, cooperação e tempo. Cortes ou expansões podem ter
consequências que aparecem anos depois. O sistema deve representar
capacidade científica como estoque acumulado, não apenas como gasto do
ano.

------------------------------------------------------------------------

# 14. SEGURANÇA PÚBLICA, JUSTIÇA CRIMINAL E DIREITOS

## 14.1 Sistema distribuído

A segurança pública envolve diferentes níveis de governo, instituições
policiais, investigação, justiça, sistema prisional, prevenção e
políticas sociais. O governo federal possui competências e instrumentos
específicos; não deve controlar todas as forças estaduais como se fossem
departamentos federais.

## 14.2 Tipos de intervenção

Diferencie prevenção social, policiamento, investigação, inteligência
dentro dos limites legais, combate a mercados ilícitos, proteção de
vítimas, melhoria de perícia, gestão prisional e reintegração. Cada
intervenção tem mecanismos e efeitos diferentes.

Mais efetivo policial pode aumentar presença e capacidade de resposta,
mas resultados dependem de distribuição, treinamento, supervisão,
informação, confiança comunitária e coordenação. Uma operação pode
reduzir uma ameaça local e deslocar atividade para outra região.
Investigações podem ter resultados atrasados. Prisões sem capacidade
adequada podem agravar superlotação e problemas de gestão.

## 14.3 Indicadores e interpretação

Distinga incidência real estimada, ocorrências registradas, denúncias,
investigações, esclarecimento, vitimização e percepção de segurança. Uma
alta nos registros não significa necessariamente que a criminalidade
aumentou na mesma proporção.

## 14.4 Direitos, confiança e responsabilização

Violência estatal, corrupção, abusos e falta de responsabilização podem
prejudicar confiança, cooperação e legitimidade, além de produzir danos
diretos. Políticas que respeitam direitos podem melhorar confiança e
qualidade da informação, embora os efeitos não sejam instantâneos.

Não transforme direitos humanos em penalidade cosmética nem em simples
"bônus de popularidade". Modele consequências institucionais, sociais e
jurídicas relevantes.

------------------------------------------------------------------------

# 15. MEIO AMBIENTE, CLIMA E USO DO TERRITÓRIO

O sistema ambiental deve integrar fiscalização, licenciamento, uso do
solo, atividade econômica, agricultura, infraestrutura, clima,
comunidades e biodiversidade.

## 15.1 Estoques e fluxos ambientais

Diferencie: - Desmatamento ou degradação ocorrida no período. - Área
degradada acumulada. - Cobertura vegetal remanescente. - Emissões
anuais. - Emissões acumuladas. - Capacidade de fiscalização. - Pressões
econômicas sobre o território. - Restauração e recuperação.

O dano acumulado não desaparece quando o fluxo de desmatamento diminui.
A recuperação pode exigir tempo e investimento.

## 15.2 Fiscalização

A fiscalização depende de orçamento, pessoal, logística, tecnologia,
acesso territorial, coordenação e segurança dos agentes. Anunciar uma
operação não equivale a executar fiscalização. Uma fiscalização efetiva
pode reduzir infrações, mas os agentes econômicos podem mudar de
comportamento ou deslocar a atividade para áreas menos fiscalizadas.

## 15.3 Trade-offs e distribuição

Restrições ambientais podem impor custos a determinados setores ou
regiões no curto prazo, enquanto preservação pode reduzir riscos,
proteger serviços ecossistêmicos, favorecer compromissos internacionais
e gerar benefícios de longo prazo. Políticas de transição, compensação e
alternativas econômicas influenciam a viabilidade e a justiça
distributiva.

## 15.4 Choques climáticos

Secas, enchentes, ondas de calor e outros choques podem afetar produção,
saúde, infraestrutura, preços, energia e orçamento. A exposição depende
da região, da infraestrutura e da preparação. Mitigação e adaptação
reduzem alguns riscos, mas têm custos e efeitos com defasagem.

------------------------------------------------------------------------

# 16. DIPLOMACIA, COMÉRCIO E GEOPOLÍTICA

## 16.1 Relações externas

Cada país ou organização representada deve ter interesses, relações,
temas de cooperação, divergências, peso econômico e contexto. Não reduza
a diplomacia a uma barra única de amizade.

As relações podem incluir comércio, investimento, defesa, clima,
ciência, direitos, organismos multilaterais e cooperação regional. Uma
decisão pode melhorar a relação em um tema e piorá-la em outro.

## 16.2 Instrumentos diplomáticos

O jogador pode, conforme a competência e o escopo: - Negociar acordos. -
Fazer visitas e reuniões. - Apresentar propostas de cooperação. -
Ajustar prioridades comerciais. - Participar de fóruns multilaterais. -
Responder a crises. - Emitir declarações. - Coordenar posições com
parceiros. - Investir em relações técnicas e econômicas.

Cada instrumento tem custos, prazos e limites. Um anúncio não garante
acordo. A outra parte também possui objetivos e pode recusar, exigir
contrapartidas ou responder estrategicamente.

## 16.3 Comércio e dependências

Exportações e importações dependem de demanda externa, preços,
logística, câmbio, acordos, barreiras e capacidade produtiva. Sanções,
disputas ou rupturas podem produzir custos em determinados setores. A
diversificação pode reduzir dependência, mas exige tempo, investimento e
acesso a mercados.

## 16.4 Credibilidade externa

A credibilidade depende de consistência, previsibilidade, cumprimento de
compromissos, estabilidade institucional e contexto. Uma mudança de
posição pode ser legítima, mas tem custos de negociação. Não faça toda
declaração gerar uma mudança instantânea e enorme na economia.

------------------------------------------------------------------------

# 17. ELEIÇÕES, PARTIDOS, CAMPANHA E LEGITIMIDADE

## 17.1 Contexto de 2022

A campanha inicial deve incluir a eleição geral de 2022 na cronologia
correta, com calendário, regras gerais e fatos históricos verificados. O
sistema deve permitir que a trajetória contrafactual se altere conforme
as decisões do jogador, mas deve distinguir o histórico real do
resultado simulado.

## 17.2 Opinião pública multidimensional

Não use apenas uma porcentagem de aprovação. Mantenha dimensões como: -
Avaliação econômica. - Percepção de competência. - Confiança. -
Aprovação por área de política. - Rejeição. - Identificação
partidária. - Polarização. - Participação e mobilização. - Avaliação
regional e por grupo. - Expectativas futuras. - Percepção de integridade
e respeito às instituições.

A aprovação nacional é uma agregação ponderada e imperfeita. Ela não
deve explicar sozinha todo o comportamento eleitoral.

## 17.3 Formação de opinião

A opinião pública reage a: - Experiência econômica e social. -
Resultados concretos de políticas. - Expectativas e promessas. - Eventos
de alta saliência. - Cobertura da imprensa. - Comunicação oficial. -
Mobilização de partidos e grupos. - Identidade política. - Experiências
regionais. - Confiança nas fontes de informação. - Tempo decorrido desde
a decisão.

Os grupos podem interpretar o mesmo acontecimento de forma diferente.
Uma política pode ser popular entre seus beneficiários e impopular entre
grupos que arcam com o custo.

## 17.4 Campanha eleitoral

A campanha deve envolver agenda, alianças, debates, propostas,
comunicação, recursos e resposta a acontecimentos. Não transforme
campanha em uma única escolha de slogan. O desempenho eleitoral pode
depender da avaliação do governo, da força partidária, de candidatos, de
coalizões, de temas prioritários, da distribuição regional e de choques.

Não invente pesquisas históricas reais. Pesquisas simuladas devem ser
identificadas como simulações, com incerteza e metodologia abstrata. Os
resultados não devem ser determinados apenas pela aprovação do
presidente.

## 17.5 Legitimidade e confiança eleitoral

O sistema deve diferenciar disputa política legítima, contestação
institucional, desinformação, confiança no processo e cumprimento das
regras. A legitimidade eleitoral não é apenas uma variável de
popularidade. Ataques infundados às instituições podem produzir efeitos
sobre confiança, polarização e estabilidade, representados de forma
contextualizada.

------------------------------------------------------------------------

# 18. IMPRENSA, JORNAL E SISTEMA DE NOTÍCIAS

A interface jornalística é a principal forma de apresentar o estado do
país. O jornal não deve ser uma camada de textos estáticos desconectada
do motor.

## 18.1 Editorias

Organize a publicação em editorias, por exemplo: - Política nacional. -
Congresso. - Economia e mercado. - Estados e municípios. - Saúde e
educação. - Segurança e justiça. - Meio ambiente. - Diplomacia. -
Eleições. - Análises e opinião. - Dados e prestação de contas.

## 18.2 Tipos de conteúdo

Diferencie: - Notícia factual sobre um evento do jogo. - Reportagem de
consequências. - Explicação de indicador. - Editorial com perspectiva
identificável. - Entrevista ou declaração, quando houver base para
isso. - Nota de serviço ou agenda. - Relatório institucional. - Análise
contrafactual da trajetória simulada.

Não invente citações de pessoas reais. Quando a geração de texto não
tiver uma declaração registrada, use paráfrase narrativa claramente
fictícia ou personagens institucionais genéricos.

## 18.3 Geração causal de notícias

Uma notícia deve ser produzida a partir de um evento, de uma mudança
relevante ou de um conflito real dentro do estado da campanha. A matéria
precisa refletir: - O fato gerador. - A data. - Os atores envolvidos. -
A dimensão afetada. - A magnitude. - A incerteza. - O contexto
anterior. - As possíveis consequências. - A perspectiva editorial,
quando aplicável.

Se o Congresso rejeitou uma proposta, a notícia deve usar o resultado
real da votação simulada. Se o orçamento foi contingenciado, a matéria
deve refletir os setores afetados e a justificativa registrada. Se a
popularidade subiu, não atribua a mudança a um evento sem relação causal
plausível.

## 18.4 Perspectivas editoriais

Diferentes publicações ou colunas podem priorizar valores e
interpretações diferentes, mas devem compartilhar os mesmos fatos
centrais do jogo. A divergência editorial pode aparecer na seleção de
contexto, ênfase, avaliação e previsão, não na fabricação de fatos
incompatíveis.

## 18.5 Jornal como interface funcional

O jornal deve funcionar como navegação: - Manchete principal leva ao
acontecimento e aos indicadores relacionados. - Notícias permitem abrir
a ficha causal. - Editorias filtram eventos. - Gráficos mostram a
evolução dos indicadores. - A agenda destaca decisões pendentes. -
Alertas identificam riscos e prazos. - Uma área de dados mostra fontes,
datas e limitações.

A estética deve ser editorial, legível e responsiva. Não use tipografia
minúscula para imitar papel impresso.

------------------------------------------------------------------------

# 19. EVENTOS HISTÓRICOS, CRISES E ACONTECIMENTOS EMERGENTES

## 19.1 Eventos históricos programados

Eventos reais relevantes podem ter data ou janela temporal,
pré-condições, atores, opções de resposta e consequências. Os eventos
precisam estar documentados e ligados ao cenário de 2022.

Um evento histórico não deve forçar automaticamente o mesmo resultado
quando as condições da campanha divergem da realidade. Separe: -
Ocorrência externa inevitável ou altamente independente. - Decisão
institucional com resultado condicionado. - Resultado eleitoral ou
político que pode mudar. - Evento dependente de uma decisão anterior do
jogador.

## 19.2 Eventos emergentes

Eventos emergentes devem ser selecionados por regras de elegibilidade,
contexto e peso. Não devem ocorrer apenas para criar drama a cada turno.

Cada evento emergente deve especificar: - Condições de entrada. -
Condições de exclusão. - Probabilidade ou regra de disparo. -
Pré-requisitos. - Atores afetados. - Opções disponíveis. - Custos
imediatos. - Consequências esperadas e incertas. - Efeitos atrasados. -
Possibilidade de resolução, escalada ou repetição. - Critérios para
evitar repetição excessiva.

## 19.3 Crises

Uma crise pode ter fases: sinal inicial, agravamento, reconhecimento
público, resposta, estabilização e consequências posteriores. A fase
depende da resposta do governo, da capacidade de execução, da exposição,
da confiança e dos fatores externos.

Responder tarde pode aumentar danos, mas responder rapidamente sem
informação pode gerar erros. O sistema deve oferecer escolhas entre
rapidez, precisão, transparência, custo e coordenação.

## 19.4 Evitar eventos arbitrários

Não faça um escândalo aparecer sem qualquer gatilho apenas porque o
jogador está indo bem. Eventos adversos devem ter causas, pré-condições
ou origem externa declarada. O jogo pode incluir incerteza, mas deve ser
capaz de explicar a lógica do evento depois que ele ocorre.

------------------------------------------------------------------------

# 20. MAPAS E DADOS TERRITORIAIS

O projeto deve prever mapas interativos, especialmente do Brasil por
estado, com possibilidade de expansão para municípios e mapas
internacionais.

## 20.1 Funções

Os mapas podem apresentar: - Indicadores socioeconômicos. - Resultados
eleitorais. - Distribuição de investimentos. - Indicadores de
serviços. - Riscos ambientais. - Ocorrências e capacidade de segurança,
quando apropriado. - Relações federativas. - Diferenças regionais na
execução de políticas.

## 20.2 Interação

Ao selecionar um estado, o jogador deve conseguir ver seus indicadores,
prioridades, contexto político, capacidade administrativa e relação com
políticas federais. O mapa precisa reagir aos dados do jogo. Uma cor de
mapa não pode ser puramente decorativa.

## 20.3 Tecnologia e acessibilidade

Use uma solução compatível com React e TypeScript, como D3.js e
TopoJSON, ou alternativa tecnicamente justificada. Considere desempenho
em celulares. Ofereça tabela ou lista acessível como alternativa ao mapa
e não dependa exclusivamente de cores para comunicar valores.

------------------------------------------------------------------------

# 21. DADOS HISTÓRICOS, FONTES E PROVENIÊNCIA

## 21.1 Fontes

Priorize fontes oficiais ou primárias conforme o assunto, por exemplo: -
IBGE para estatísticas demográficas e econômicas. - Banco Central para
indicadores monetários e financeiros. - Tesouro Nacional e órgãos
orçamentários para dados fiscais. - TSE para eleições e dados
eleitorais. - Câmara dos Deputados e Senado Federal para composição e
tramitação legislativa. - STF e outros órgãos judiciais para informações
institucionais públicas. - Ministérios, autarquias e órgãos técnicos
conforme a área. - Organizações internacionais reconhecidas para
comparações quando necessário.

Fontes jornalísticas confiáveis podem ajudar a contextualizar
acontecimentos, mas não substituem automaticamente a fonte primária para
dados oficiais.

## 21.2 Registro de dados

Cada conjunto de dados deve registrar, quando aplicável: - Identificador
e nome. - Valor e unidade. - Período de referência. - Data de
publicação. - Data de coleta. - Fonte e URL. - Metodologia. - Revisões
conhecidas. - Limitações. - Tipo: fato, observação, estimativa,
abstração ou valor simulado. - Versão do pacote histórico.

Não faça o aplicativo depender de scraping frágil de páginas sem
estrutura. Prefira APIs oficiais, arquivos publicados e importações
versionadas. Trate indisponibilidade de rede e mudança de formato.

## 21.3 Atualizações futuras

As futuras atualizações históricas devem ser pacotes separados, com
changelog e regras de compatibilidade. Atualizar os dados-base não deve
alterar silenciosamente uma campanha salva. O jogador pode iniciar uma
campanha com um pacote novo ou continuar com o pacote original, conforme
a política de compatibilidade definida.

## 21.4 Integridade factual

Nunca invente um valor histórico para preencher uma lacuna sem marcar a
estimativa. Se um dado não estiver disponível, use uma aproximação
documentada ou omita-o. Não apresente valores de simulação como
estatísticas oficiais.

------------------------------------------------------------------------

# 22. SALVAMENTO, CAMPANHAS E VERSIONAMENTO

## 22.1 Conteúdo do salvamento

Um salvamento deve registrar: - Identificador único da campanha. - Data
do jogo. - Cenário e versão do pacote histórico. - Versão do motor de
simulação. - Semente aleatória. - Estado econômico, fiscal e
institucional. - Políticas ativas e etapas de implementação. - Projetos,
votações e processos pendentes. - Relações entre atores. - Eventos já
ocorridos, ativos e resolvidos. - Efeitos atrasados. - Histórico de
decisões. - Estado de notícias e notificações relevantes. -
Configurações da campanha. - Registro de migração, quando aplicável.

## 22.2 Salvamento robusto

Implemente: - Salvamento automático em pontos seguros. - Salvamento
manual. - Carregamento. - Lista de campanhas com data, cenário e
resumo. - Tratamento de falha de gravação. - Validação do formato antes
de carregar. - Recuperação ou cópia de segurança quando possível. -
Migrações explícitas entre versões.

Não apague salvamentos antigos durante uma atualização sem
consentimento. Não misture estado do motor com estado visual temporário.

## 22.3 Pausar, retomar e reiniciar

A campanha deve poder ser pausada e retomada. Reiniciar deve exigir
confirmação. A exclusão de uma campanha deve ser distinta da atualização
de conteúdo. O jogo não deve depender de uma conexão de internet para
carregar um salvamento local.

------------------------------------------------------------------------

# 23. TECNOLOGIA E ARQUITETURA MULTIPLATAFORMA

## 23.1 Stack preferencial

-   React + TypeScript + Vite para a aplicação.
-   Capacitor para preparar a versão Android.
-   Tauri para preparar a versão desktop.
-   IndexedDB para persistência local.
-   D3.js/TopoJSON ou solução equivalente para mapas.
-   Vitest para testes unitários e de integração.
-   Playwright para testes de fluxo de interface, quando o ambiente
    permitir.

Justifique qualquer alteração importante de stack. Não migre para
tecnologia mais complexa sem benefício claro.

## 23.2 Separação de camadas

Mantenha separação entre: - Motor de simulação. - Regras
institucionais. - Modelos e estado. - Dados históricos. - Definições de
eventos. - Persistência e migração. - Interface e navegação. -
Apresentação jornalística. - Mapas e visualizações. - Integrações
externas.

O motor não deve depender do DOM, de componentes React, de APIs do
navegador ou de serviços remotos. Ele deve receber estado, ação,
parâmetros e semente; devolver novo estado e um registro de eventos e
explicações.

## 23.3 Estrutura sugerida

``` text
src/
  app/
  ui/
  newspaper/
  simulation/
    engine/
    state/
    causality/
    time/
    random/
  systems/
    executive/
    congress/
    budget/
    economy/
    judiciary/
    federation/
    public-services/
    security/
    environment/
    diplomacy/
    elections/
    media/
  content/
    scenarios/
    historical-data/
    events/
    policies/
    actors/
  maps/
  persistence/
  migrations/
  data-sources/
  tests/
```

A estrutura pode mudar se houver motivo, mas os limites entre
responsabilidades precisam continuar claros.

## 23.4 Distribuição

Prepare configurações e documentação para: - Executar localmente durante
o desenvolvimento. - Gerar build web. - Gerar projeto e build Android
com Capacitor. - Empacotar desktop com Tauri. - Gerenciar ícones,
identificadores, permissões e metadados de distribuição.

Não declare que a publicação está concluída se não houver credenciais,
ferramentas ou ambiente para concluir os processos oficiais. Documente
as pendências reais.

## 23.5 Offline-first

O jogo central deve funcionar offline após a instalação. Conteúdo
essencial, regras e dados de cenário precisam estar disponíveis
localmente. Recursos online devem ser complementares: atualização de
pacotes históricos, consulta de fontes e download de conteúdo novo.

Se a atualização falhar, preserve o jogo e os salvamentos. Nunca
bloqueie a campanha inteira por indisponibilidade de uma API de dados.

------------------------------------------------------------------------

# 24. DESIGN DE INTERFACE E EXPERIÊNCIA DO JOGADOR

## 24.1 Identidade visual

O estilo deve lembrar um jornal clássico e uma publicação de análise
política, sem sacrificar legibilidade moderna. Use hierarquia
tipográfica, manchetes, colunas, separadores, tabelas e gráficos de
maneira disciplinada. O resultado não deve parecer um dashboard
empresarial genérico nem uma página antiga difícil de usar.

## 24.2 Navegação principal

A navegação deve oferecer acesso claro a: - Primeira página do jornal. -
Governo e agenda. - Economia e orçamento. - Congresso. - Instituições e
Judiciário. - Estados e mapas. - Serviços públicos. - Segurança e
ambiente. - Diplomacia. - Eleições e opinião pública. - Histórico e
relatórios. - Salvamentos e configurações.

No celular, prefira navegação compacta, menus adequados ao toque e telas
que não exijam rolagem horizontal desnecessária.

## 24.3 Decisões compreensíveis

Antes de confirmar uma decisão relevante, mostre: - Objetivo. -
Instrumento. - Custo provável. - Prazo. - Requisitos. - Principais
beneficiários e afetados. - Consequências plausíveis. - Incertezas. -
Dependências e riscos. - O que pode impedir a execução.

Não revele resultados futuros com certeza quando houver incerteza.
Mostre faixas e riscos, não falsas garantias.

## 24.4 Relatório pós-turno

Após avançar o turno, mostre um relatório que permita entender: - O que
mudou. - Por que mudou. - Quais ações contribuíram. - Quais
acontecimentos externos influenciaram. - O que foi executado
parcialmente. - O que ficou pendente. - Quais riscos aumentaram ou
diminuíram. - Quais decisões agora exigem atenção.

O jogador deve poder abrir a explicação detalhada de cada mudança
importante.

## 24.5 Acessibilidade e desempenho

Use contraste adequado, tamanhos legíveis, estados de foco, suporte a
teclado quando aplicável, rótulos acessíveis e alternativas textuais
para mapas e gráficos. Evite animações excessivas e cargas pesadas. A
interface deve continuar responsiva em celulares Android de desempenho
intermediário.

------------------------------------------------------------------------

# 25. BALANCEAMENTO, DIFICULDADE E LIBERDADE DE ESTRATÉGIA

O jogo não deve prescrever uma ideologia como estratégia sempre
vencedora. Políticas diferentes podem funcionar em contextos diferentes
e apresentar custos, riscos e benefícios próprios.

## 25.1 Dificuldade

A dificuldade pode alterar: - Margem fiscal inicial. - Intensidade de
choques. - Disponibilidade de informação. - Complexidade de
negociação. - Tolerância a atrasos. - Pressão política e eleitoral. -
Velocidade de deterioração ou recuperação. - Capacidade de absorver
crises.

Não altere secretamente as regras de causalidade de modo que uma decisão
idêntica tenha resultado arbitrário só porque o jogador está vencendo.

## 25.2 Estratégias e trade-offs

O sistema deve permitir estratégias fiscais, sociais,
desenvolvimentistas, ambientais, institucionais e diplomáticas
distintas, respeitando limites e consequências. Nenhuma estratégia
precisa ser igualmente eficaz em todas as circunstâncias. O objetivo é
que cada uma tenha lógica interna e riscos reconhecíveis.

## 25.3 Falha e recuperação

A campanha não deve terminar automaticamente por uma queda pequena de
popularidade. Derrotas, crises e resultados ruins podem criar desafios,
mudar o conjunto de opções e exigir adaptação. Condições de
encerramento, impeachment ou outras rupturas institucionais devem exigir
condições e processos plausíveis, não um gatilho numérico isolado.

------------------------------------------------------------------------

# 26. TESTES E CRITÉRIOS DE ACEITAÇÃO

A implementação só pode ser considerada funcional quando passar por
testes de regras, causalidade, persistência e interface.

## 26.1 Testes do motor

Teste pelo menos: - Mesmo estado, ação, versão e semente produzem o
mesmo resultado. - Avançar um turno aplica cada política uma única
vez. - Efeitos atrasados ocorrem no período correto. - Uma política sem
orçamento suficiente não executa integralmente. - Uma proposta
legislativa não é aprovada sem cumprir os requisitos configurados. - Uma
medida judicialmente suspensa não continua sendo executada como se nada
tivesse ocorrido. - Uma política federal que exige cooperação local não
ignora a capacidade ou a recusa do ente responsável. - Choques externos
são registrados separadamente das decisões do governo. - A notícia
gerada corresponde ao evento e ao estado resultante. - A decomposição
causal reconcilia, dentro das tolerâncias do modelo, a mudança dos
indicadores. - O salvamento e o carregamento preservam o estado. - A
migração de versão não descarta campos essenciais.

## 26.2 Testes de causalidade

Crie cenários controlados para verificar relações esperadas, sem exigir
resultados exagerados: - Uma obra financiada não produz capacidade
física antes de ser executada. - Atraso de execução posterga parte dos
benefícios. - Um gasto recorrente permanece no orçamento enquanto a
política estiver ativa. - Uma mudança de imposto afeta apenas as bases
configuradas e respeita o atraso de arrecadação. - Um choque de preço
externo afeta variáveis conectadas conforme os parâmetros definidos. -
Uma mudança de popularidade não altera automaticamente todos os votos
legislativos. - Uma decisão presidencial não controla diretamente a taxa
de juros definida pelo sistema monetário. - Uma mudança em registros de
crime não é automaticamente interpretada como mudança idêntica na
incidência real. - Um evento climático afeta regiões de forma compatível
com a exposição modelada. - Um acordo diplomático não se torna válido
apenas porque o jogador o anunciou.

## 26.3 Testes de interface

Teste: - Nova campanha inicia na data correta de 2022. - O jogador
consegue avançar turno. - O jornal atualiza com os eventos ocorridos. -
Decisões têm validação e resposta visível. - Indicadores e explicações
correspondem ao motor. - Salvamentos podem ser criados, listados,
carregados e excluídos com confirmação. - A interface funciona em
largura de celular e desktop. - O jogo continua abrindo offline com
conteúdo local. - Erros de rede não apagam nem corrompem a campanha.

## 26.4 Critério de conclusão da primeira versão

A primeira versão deve ser considerada pronta para avaliação interna
apenas quando: 1. O projeto compila. 2. O jogo inicia em 1º de janeiro
de 2022. 3. Existe um ciclo jogável de decisões e avanço de turnos. 4.
Pelo menos os sistemas essenciais de governo, orçamento, economia,
Congresso e notícias interagem. 5. Os efeitos têm explicações e atrasos
quando aplicável. 6. O salvamento persiste após fechar e reabrir a
aplicação. 7. Os testes básicos passam. 8. As limitações e os sistemas
ainda incompletos estão documentados.

------------------------------------------------------------------------

# 27. PLANO DE IMPLEMENTAÇÃO

Implemente em etapas, mas não pare na documentação.

## Etapa 1 --- Inspeção e base técnica

-   Verifique o ambiente e suas limitações.
-   Crie o projeto React + TypeScript + Vite.
-   Configure qualidade de código, testes e estrutura modular.
-   Documente comandos de execução.
-   Crie um estado mínimo de campanha versionado.

## Etapa 2 --- Motor central

-   Defina o estado do mundo.
-   Implemente o relógio e o avanço de turnos.
-   Implemente semente aleatória reproduzível.
-   Crie eventos de mudança e explicações causais.
-   Adicione testes de determinismo e transição de estado.

## Etapa 3 --- Ciclo jogável

-   Crie nova campanha em 1º de janeiro de 2022.
-   Implemente orçamento básico, indicadores econômicos, agenda
    executiva e ações.
-   Faça políticas terem custos, prazos e resultados.
-   Implemente o relatório pós-turno.

## Etapa 4 --- Congresso e instituições

-   Crie atores e bancadas configuráveis.
-   Implemente tramitação, negociação, votação e consequências.
-   Adicione limites institucionais e primeiras contestações jurídicas.

## Etapa 5 --- Jornal e conteúdo histórico

-   Conecte notícias ao registro de eventos.
-   Crie editorias, manchetes e relatórios.
-   Insira dados históricos de 2022 com fonte e data de referência.
-   Diferencie fatos reais e eventos contrafactuais.

## Etapa 6 --- Persistência e interface responsiva

-   Implemente salvamento, carregamento e migrações.
-   Ajuste a experiência para celular e desktop.
-   Adicione navegação, acessibilidade e estados de erro.

## Etapa 7 --- Sistemas adicionais

-   Amplie federação, serviços públicos, segurança, ambiente,
    diplomacia, eleições e mapas, sem quebrar o núcleo já testado.
-   Dê prioridade a sistemas conectados, não a menus sem efeito.

## Etapa 8 --- Verificação

-   Execute testes e build.
-   Corrija erros reais.
-   Documente o estado da implementação.
-   Prepare a configuração de empacotamento multiplataforma e descreva o
    que foi efetivamente verificado.

------------------------------------------------------------------------

# 28. O QUE NÃO FAZER

-   Não transformar o projeto em um único arquivo HTML monolítico.
-   Não substituir a simulação por textos que apenas descrevem o que
    deveria acontecer.
-   Não criar botões sem comportamento real.
-   Não usar um único indicador de "estabilidade" para representar todo
    o país.
-   Não fazer toda decisão mudar imediatamente todos os indicadores.
-   Não atribuir automaticamente toda mudança à última decisão do
    jogador.
-   Não tratar o presidente como controlador de todas as instituições.
-   Não ignorar orçamento, capacidade de execução, competências legais e
    prazos.
-   Não inventar fatos históricos ou citações de pessoas reais.
-   Não misturar fatos reais com resultados contrafactuais sem rótulo.
-   Não começar em 2026.
-   Não implementar agora a expansão histórica completa de 2023--2026
    nem a campanha 2026--2030.
-   Não afirmar que a versão está pronta para a Play Store ou lojas
    desktop sem testes e compilação adequados.
-   Não esconder sistemas incompletos atrás de uma interface visualmente
    sofisticada.
-   Não encerrar o trabalho depois de apresentar um plano.

------------------------------------------------------------------------

# 29. ENTREGA FINAL ESPERADA

Ao concluir a primeira etapa de desenvolvimento, entregue:

1.  Código-fonte funcional e organizado.
2.  Projeto que possa ser executado no ambiente disponível.
3.  Campanha inicial em 1º de janeiro de 2022.
4.  Ciclo de jogo real com decisões, efeitos, notícias e avanço
    temporal.
5.  Sistemas essenciais integrados e com causalidade documentada.
6.  Salvamento e carregamento persistentes.
7.  Testes automatizados básicos.
8.  Dados históricos utilizados com fontes, datas e limitações.
9.  Instruções claras para instalar dependências, executar, testar e
    compilar.
10. Relatório honesto do que funciona, do que é simplificado e do que
    ficou pendente.
11. Arquitetura preparada para futuras expansões históricas e
    empacotamento Android/desktop.

## Ordem final

Leia toda a especificação. Depois, inspecione o ambiente, escolha as
implementações técnicas necessárias e comece a programar. Tome decisões
razoáveis de produto sem pedir autorização para cada detalhe. Se o
ambiente não permitir concluir alguma parte, implemente o máximo
funcional possível e registre a limitação específica.

**A meta não é fingir que existe um simulador completo. A meta é
construir, desde a base, um simulador que possa crescer sem perder
coerência, com decisões que tenham custos reais, consequências
distribuídas, efeitos atrasados, conflitos institucionais, causalidade
explicável e uma campanha inicial historicamente situada em 2022.**
