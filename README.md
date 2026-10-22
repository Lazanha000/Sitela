# Simulador do Governo Brasileiro — v0.1 (pré-alfa)

Jogo de estratégia política e administração pública. Você conduz o Executivo federal de **1º de janeiro a 31 de dezembro de 2022**, sob as regras reais: Congresso bicameral, Banco Central autônomo, STF, teto de gastos, federação e lei eleitoral. A interface é um jornal (*Gazeta Federal*, fictício) gerado a partir do motor de simulação.

Especificação de referência: [`docs/especificacao/`](docs/especificacao/Prompt_Mestre_Simulador_Governo_Brasileiro.md).
Auditoria da especificação e decisões de produto: [`docs/AUDITORIA.md`](docs/AUDITORIA.md).

## Comandos

```bash
npm install          # dependências
npm run dev          # desenvolvimento (http://localhost:5173)
npm test             # testes do motor, causalidade e persistência (Vitest)
npm run build        # build web em dist/
npm run e2e          # testes de interface (Playwright; rode após o build)
npm run simulate -- <semente> <passiva|historica|ativa>   # campanha sem interface
```

## O que existe na v0.1

- **Ciclo jogável completo** de 12 turnos mensais, com eleição em dois turnos (2/out e 30/out) e posse em 1º/jan/2023.
- **Motor determinístico** (semente por campanha) e **livro-razão causal**: toda variação de indicador é decomposta por causa (decisão do governo, choque externo, instituição autônoma, atores, dinâmica, aleatoriedade), e a soma fecha exatamente. Botão “Por quê?” em todo indicador.
- **Sistemas integrados**: economia (hiato, inflação, expectativas, Copom autônomo, câmbio, desemprego, combustíveis), finanças públicas (receita, despesa, teto com bloqueios bimestrais, discricionárias com remanejamento, dívida/PIB), Congresso (4 bancadas, Câmara e Senado, MP/PL/PLP/PEC com quóruns reais, negociação com custos), Judiciário (contestação, liminar, julgamento), federação (governadores por região), opinião pública (5 grupos × 5 regiões, com defasagem), capital político em 6 dimensões, eleições, imprensa.
- **Conteúdo 2022**: 12 políticas com ficha completa, 20 acontecimentos (históricos, de calendário e emergentes), 11 ações políticas, pacote histórico com proveniência.
- **Salvamento** local (IndexedDB) automático a cada mês, com cópia de segurança, salvamento manual, validação, migrações e exportação/importação JSON.
- **29 testes** de motor/causalidade/persistência e **4 testes de interface** (desktop e celular).

Detalhes: [`docs/CAUSALIDADE.md`](docs/CAUSALIDADE.md) · [`docs/DADOS.md`](docs/DADOS.md) · [`docs/LIMITACOES.md`](docs/LIMITACOES.md) · [`docs/VERSOES.md`](docs/VERSOES.md) · [`docs/PLATAFORMAS.md`](docs/PLATAFORMAS.md) · [`CHANGELOG.md`](CHANGELOG.md)

## Arquitetura

```
src/
  simulation/   motor puro: estado, turno, ações, RNG, calendário, livro-razão causal
  systems/      regras: economy, budget, congress, judiciary, federation, opinion,
                elections, executive, public-services, events, media
  content/      dados de cenário: pacote histórico 2022, atores, políticas, eventos, ações
  persistence/  IndexedDB/memória, validação, autosave com backup, export/import
  migrations/   migrações explícitas do formato de salvamento
  app/ ui/      React: só exibe o estado e envia ações ao motor
  tests/        Vitest
e2e/            Playwright
scripts/        simulação em lote para calibração
```

O motor não depende de DOM, React ou rede: recebe estado + ação (+ semente embutida no estado) e devolve novo estado, relatório causal e ocorrências.
