# Auditoria da especificação ("Prompt Mestre")

Leitura crítica feita antes de implementar a v0.1. O objetivo é registrar o que a especificação faz bem, onde ela é frágil e quais decisões foram tomadas onde ela é omissa.

## O que a especificação acerta

1. **Causalidade como requisito verificável** (§4). Exigir cadeia causal, defasagem e atribuição explicável é o que separa um simulador de um gerador de números. Isso virou um livro-razão em que cada variação é decomposta e reconciliada por teste.
2. **Rótulos de natureza da informação** (§2.3). Fato, observado, estimativa, abstração e contrafactual protegem o jogo de se passar por fonte histórica. Foram aplicados a notícias, dados e indicadores.
3. **Sem onipotência presidencial** (§1.1, §6, §10). O Copom decide a Selic, o Congresso vota, o STF julga, governadores cooperam ou não. Há testes para isso.
4. **Determinismo e testes de aceitação concretos** (§4.7, §26). Tornam o projeto auditável.
5. **Proibição de botões sem efeito** (§28). Foi o critério para cortar escopo: o que não tem sistema não aparece como menu.

## Onde a especificação é frágil

1. **Escopo incompatível com uma primeira versão.** A especificação pede cerca de 20 sistemas profundos (saúde, educação, segurança, diplomacia, mapas por estado, municípios…) e, ao mesmo tempo, diz para preferir "poucos sistemas completos" (§1.1.10). As duas exigências se contradizem para a v0.1. Decisão: núcleo integrado (governo, orçamento, economia, Congresso, Judiciário, opinião, eleições, imprensa) e versões mínimas de serviços e ambiente. Educação, segurança e diplomacia ficaram para depois, documentadas e sem menus vazios.
2. **Quem é o jogador?** A especificação não diz. Em 1º/jan/2022 o presidente era uma pessoa real, candidata em 2022. Simular declarações, personalidade ou intenção de voto de pessoas reais é eticamente delicado e contraria §6.3 e §18.2. Decisão: o jogador ocupa o **cargo** (a Presidência), herdando a situação institucional real (coalizão, avaliação, agenda). Candidaturas aparecem com rótulos genéricos ("candidatura do governo", "principal candidatura de oposição"). Nomes reais só aparecem em fatos históricos verificáveis (resultado do TSE), na seção de dados. Discordar disso é legítimo, mas a alternativa exige uma política explícita sobre representação de pessoas reais.
3. **"Fonte para cada parâmetro" é inalcançável.** O §4.5 exige fonte ou justificativa para cada coeficiente. Para quase todos (efeito de um pronunciamento, disposição de uma bancada) não existe parâmetro empírico. O requisito só se cumpre rotulando a maior parte do modelo como **abstração de jogo**. Isso é honesto, mas o jogador precisa entender que a física do jogo é design, não ciência. A interface repete isso.
4. **Dados históricos sem processo de coleta.** A especificação pede fontes oficiais, mas não prevê etapa de coleta e verificação. Os valores da v0.1 foram transcritos de conhecimento prévio e os incertos estão marcados como "verificar". A v0.2 deve importar séries do IBGE (SIDRA) e do BCB (SGS) com versão e data de coleta.
5. **Falta objetivo de jogo.** A especificação descreve falha e recuperação (§25.3), mas não o que é vencer. Sem objetivo, um simulador vira painel. Na v0.1 a eleição é o clímax natural e há balanço final. Um sistema de metas declaradas pelo próprio jogador (reeleição, legado fiscal, social, ambiental) é proposta para a v0.2.
6. **Alvo de calibração não declarado.** Repetir as decisões reais de 2022 deveria produzir algo perto da história? A especificação não diz. Decisão: sim, como teste de sanidade (ver `npm run simulate -- <semente> ativa`). Com decisões parecidas com as reais, o governo fica entre 43% e 49% no 2º turno (real: 49,1%). Sem agir, perde no 1º turno.
7. **Jornal como interface principal versus densidade numérica.** O jornal funciona para o "o que aconteceu"; para decidir, o jogador precisa de painéis. A v0.1 usa os dois: capa de jornal e seções de painel com o mesmo estado.
8. **Turno mensal e um único ano.** São 12 turnos no total. É curto como jogo e aperta eventos de data exata (eleição em 2/out). A v0.1 trata a eleição no fechamento de setembro e de outubro. A continuação pós-2022 precisa de definição de produto (§2.2 deixa três modos possíveis).
9. **Temas sensíveis.** Questionamento das urnas e reação à derrota são parte real de 2022. A especificação pede "consequências sem moralização simplista" e "não recompensar ataques". Implementação: essas opções existem, mobilizam a base (efeito real) e cobram em confiança eleitoral, tensão institucional, credibilidade e risco. O custo vem do mecanismo, não de um sermão.

## Decisões de produto tomadas sem consulta

| Tema | Decisão | Motivo |
|---|---|---|
| Estágio da v0.1 | **Pré-alfa** | Núcleo jogável e testado, mas calibração e dados não verificados; vários sistemas da especificação ausentes. |
| Agregações | 4 bancadas, 5 regiões, 5 grupos sociais | Granularidade mínima que preserva distribuição e conflito. |
| PEC emergencial | Começa no Senado | Foi assim em 2022 (PEC de autoria de senadores). |
| Pesquisas | Instituto fictício, rotuladas como simulação | §17.4. |
| Fontes tipográficas | Google Fonts com fallback de sistema | O jogo funciona offline com fontes do sistema. |
