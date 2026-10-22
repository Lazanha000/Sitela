# Versões e roteiro

## Esquema

- `0.MENOR` (0.1, 0.2, 0.3…): cada versão de conteúdo ou sistemas.
- `0.MENOR.PATCH` (0.1.1, 0.1.2…): só micro-atualizações (correção de bug, ajuste de calibração, texto, dado corrigido) que não mudam o formato de salvamento.
- É o SemVer usual para a fase 0.x. Há três números independentes:
  - **versão do jogo** (`package.json`, `src/simulation/version.ts`);
  - **versão do motor** (`ENGINE_VERSION`): muda quando uma regra altera resultados. A mesma semente só reproduz a mesma campanha na mesma versão do motor;
  - **esquema de salvamento** (`SCHEMA_VERSION`): muda quando o formato muda, sempre com migração em `src/migrations/`.

## Estágios

| Estágio | Critério |
|---|---|
| **Pré-alfa** (0.1) | Núcleo jogável e testado; sistemas incompletos; dados não verificados. |
| **Alfa** | Todos os sistemas do escopo 2022 da especificação presentes (educação, segurança, diplomacia, mapa por estado, ministros) e dados verificados contra fontes primárias. |
| **Beta** | Balanceamento por testes com jogadores; builds Android e desktop compilados e testados em aparelhos. |
| **1.0** | Pronto para loja, com requisitos de plataforma verificados. |

## Proposta de roteiro

**0.1.x — correções**
- Correções que surgirem nas primeiras partidas; vitest 4.

**0.2 — território e dados**
- Mapa do Brasil por estado (D3 + TopoJSON) com tabela acessível equivalente; governadores por estado.
- Importação versionada de séries do IBGE (SIDRA) e do BCB (SGS); verificação dos valores marcados.
- Metas de jogo declaradas pelo jogador e balanço final pontuado.
- Vetos e derrubada de vetos; escolha de texto em sanção.

**0.3 — Estado mais completo**
- Educação, segurança pública e diplomacia (parceiros com múltiplas dimensões).
- Nomeação de ministros com atributos; capacidade por órgão afetada pela escolha.
- Pacote Capacitor (Android) compilado e testado em emulador.

**Alfa** — o restante do escopo 2022 da especificação.
