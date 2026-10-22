# Modelo causal da v0.1

Todos os coeficientes são **abstrações de jogo** calibradas para plausibilidade com a trajetória de 2022. Não são estimativas econométricas.

## Ordem do turno (determinística)

Ver `src/simulation/engine/turn.ts`:

0. Decisões pendentes recebem a opção padrão.
1. Congresso: comissões, pauta, votações, validade de MPs.
2. Judiciário: contestações, liminares, julgamentos.
3. Execução de políticas: taxa = orçamento × capacidade do órgão × sobrecarga × cooperação estadual × restrições eleitorais × (0 se suspensa). Efeitos são agendados com defasagem.
4. Economia. 5. Finanças públicas. 6. Serviços e ambiente. 7. Efeitos defasados que vencem no mês.
8. Federação. 9. Opinião. 10. Atores e capital político. 11. Eleições.
12. Registro de séries, relatório causal e jornal. 13. Novo mês e acontecimentos.

Ações do jogador durante o mês geram efeitos imediatos (sinalização, custos de negociação) registrados no mesmo livro-razão do mês.

## Livro-razão

`src/simulation/causality/ledger.ts`. Toda alteração de indicador passa por `add`/`setDerived` com uma causa (`politica`, `acao`, `evento`, `choque_externo`, `ator`, `instituicao`, `dinamica`, `ruido`). Indicadores derivados registram as partes e um resíduo explícito ("interações"), então a soma sempre fecha. Há teste para isso.

## Economia (`src/systems/economy/economy.ts`)

| Relação | Forma | Defasagem |
|---|---|---|
| Hiato | h' = 0,85h + reabertura − 0,03·(juro real defasado − 4,5) + 0,004·(commodities − 100) + 0,003·(confiança − 100) + Σ impulsos fiscais + choques | juro real médio de 3 a 6 meses antes |
| Impulso fiscal | 0,06 × multiplicador × gasto / PIB mensal × 100 | mesmo mês |
| IPCA mensal | 0,4·m₋₁ + 0,6·E/12 + 0,05·h + 0,06·Δ%câmbio + 0,08·Δ%combustíveis + sazonalidade + choques + efeitos diretos | câmbio com 1 mês |
| Expectativas | convergem 20%/mês a 0,35·IPCA12 + 0,65·meta + risco + credibilidade | — |
| Copom | alvo = 4,5 + E + (E − 3,25) + 0,3h; passo = 60% da distância, máx. ±1,5 p.p., em múltiplos de 0,25 | só nas datas reais do Copom |
| Câmbio | converge 25%/mês ao equilíbrio (diferencial Selic–Fed, commodities, prêmio de risco) | — |
| Desemprego | converge 18%/mês a (taxa natural declinante 10,5 → 7,7) − 0,5h | gradual |
| Combustíveis | 65% refinaria (repasse de 35%/mês da paridade petróleo × câmbio) + 10% tributos federais + 25% ICMS | — |

## Finanças (`src/systems/budget/fiscal.ts`)

- Receita = 126 × preços × atividade^1,2 + petróleo + commodities − renúncias + extraordinárias.
- Despesa = obrigatórias (129 + 0,1/mês) + custeio discricionário + programas + emendas + créditos extraordinários.
- Teto: projeção anual vs. limite; nos relatórios bimestrais (mar, mai, jul, set, nov), projeção acima do limite gera bloqueio de discricionárias.
- Remanejamento: programas discricionários usam até 45% do disponível no mês; o resto comprime o custeio-base, o que piora a fila do SUS e a capacidade dos órgãos.
- Juros = dívida × (2,5 + 0,35·Selic + 0,15·IPCA)/12. Dívida' = dívida + juros − primário. Dívida/PIB decomposta em numerador e denominador.

## Congresso (`src/systems/congress/congress.ts`)

Disposição de cada bancada (logit) = afinidade programática + relação/30 + pressão eleitoral (sensibilidade × popularidade da pauta × 2 antes da eleição) − custo fiscal + viabilidade do governo (aliados) + credibilidade (centro) + negociações. Os votos são sorteados individualmente com disciplina imperfeita e presença menor em campanha. A estimativa exibida ao jogador é uma faixa cuja largura cresce quando a confiança dos aliados é baixa.

## Opinião (`src/systems/opinion/opinion.ts`)

Cada grupo tem estoques por fonte (inflação, emprego, combustíveis, filas, conflito institucional, desmatamento, cada política, cada evento). Fontes com alvo convergem com a velocidade do fator; choques decaem. Região = mistura de grupos + inclinação regional + eventos locais. A agregação é linear, então o saldo nacional se decompõe exatamente por fonte.

## Eleições (`src/systems/elections/elections.ts`)

Voto por região: governo ≈ ótimo/bom + 0,45 × regular (sucessor herda menos), ajustado por mobilização, campanha regional e tempo de TV; oposição ≈ 0,85 × ruim/péssimo + 0,38 × regular. No 2º turno, terceira via e outros se redistribuem (40/60 e 45/55). No dia da eleição há um erro aleatório de pesquisa (σ = 1,2 p.p.).

## Limiares documentados

- MP caduca após 4 turnos sem votação final (≈ 120 dias).
- PEC: 308/49 em dois turnos; PLP: 257/41; PL/MP: maioria simples com quórum de 257/41.
- Bloqueio quando a folga projetada no teto é negativa em mês de relatório bimestral.
- Agenda: no máximo 4 iniciativas legislativas em tramitação/preparação.
