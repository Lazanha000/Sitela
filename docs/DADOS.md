# Dados históricos da campanha 2022

Fonte única no código: `src/content/historical-data/pack2022.ts` (pacote `brasil-2022@0.1.0`). A mesma tabela aparece no jogo, em **Dados e fontes**.

## Natureza das informações

| Rótulo | Uso |
|---|---|
| Fato histórico | Datas institucionais, leis, calendário eleitoral e do Copom, composição constitucional do Congresso. |
| Dado observado | Selic, IPCA 2021, câmbio, desemprego, dívida, PIB 2021, Brent. |
| Estimativa | Teto 2022, expectativa inicial, avaliação inicial do governo, participação regional na população. |
| Abstração de jogo | Bancadas, grupos sociais, índices de capacidade, fila do SUS, fiscalização, commodities. |
| Simulado (contrafactual) | Tudo o que acontece a partir do fechamento de janeiro de 2022. |

## Itens a verificar contra a fonte primária

Os valores marcados "verificar" foram transcritos de conhecimento prévio, não coletados de API nesta versão:

- IPCA mensal de 2021 (IBGE/SIDRA 1737).
- PTAX de 31/12/2021.
- Desocupação set–nov/2021.
- DBGG de dez/2021 (% do PIB e valor).
- Primário do Governo Central em 2021 e 2022.
- Número da Lei da LDO 2022.
- Brent mensal de 2022 (EIA).
- PRODES 2021 e 2022.

## Datas de publicação vs. período de referência

O jogo distingue o valor do modelo (fim do mês anterior) do **último dado divulgado**. IPCA sai com 1 mês de defasagem; desemprego e atividade, com 2. Uma greve pode atrasar a divulgação. Ver a seção Economia.

## Atualizações futuras

Pacotes novos devem ter versão própria. Um salvamento guarda `dataPackVersion` e não é alterado por atualização de dados: a campanha continua com o pacote original.
