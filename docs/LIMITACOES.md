# Limitações conhecidas da v0.1

## Fora do escopo desta versão (sem menus vazios)

- Educação, segurança pública e justiça criminal, diplomacia como sistema (há só eventos pontuais).
- Mapas interativos e estados/municípios individuais (federação em 5 regiões).
- Parlamentares individuais, comissões nominais, vetos e derrubada de vetos, destaques, emendas de plenário.
- Nomeação de ministros e atributos de autoridades.
- Setores produtivos, crédito, balança comercial, contas de estados.
- Metas de jogo declaradas e pontuação final.
- Continuação após 1º/jan/2023 (expansões 2023–2026 e 2026–2030 só preparadas na arquitetura: pacote de dados versionado, `scenarioId`, esquema de salvamento).

## Simplificações deliberadas

- Os dois turnos de votação de uma PEC acontecem no mesmo mês.
- Sanção é automática (sem escolha de vetos).
- Pautas muito populares em ano eleitoral podem ter prazos de comissão dispensados por acordo de líderes, como ocorreu com a PEC 1/2022.
- O deflator do PIB é aproximado pelo IPCA.
- A dívida bruta usa fluxos só do Governo Central.

## Verificação

- Não foi feita a verificação contra fontes primárias dos valores marcados "verificar" em `src/content/historical-data/pack2022.ts`.
- O teste "abre offline" cobre continuar jogando sem rede depois de a página ter carregado. Abrir do zero sem rede exige empacotamento (Capacitor/Tauri) ou service worker. Nada disso foi feito.
- Não há teste de causalidade para registros de crime nem para acordos diplomáticos (§26.2), porque esses sistemas ainda não existem.
- Calibração verificada só por simulação em lote (`npm run simulate`), sem análise de sensibilidade sistemática.

## Ferramentas de desenvolvimento

- O `npm audit` aponta vulnerabilidades em `vitest@3` e `tinypool`. Ambos são usados apenas para testes locais e não vão para o build. A correção exige vitest 4.1.12, publicado há menos de duas semanas (out/2026). Atualizar na v0.1.1 ou v0.2.
