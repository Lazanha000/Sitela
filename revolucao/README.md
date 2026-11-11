# Revolução — jogo de estratégia no Brasil

Fase atual: escolha da direção de arte. Em `prototipos/` há cinco protótipos visuais,
todos com a mesma geografia real e o mesmo cenário de exemplo:

| # | Arquivo | Direção |
|---|---------|---------|
| 1 | `p1-cinejornal.html` | Documentário de guerra em película (a referência enviada) |
| 2 | `p2-estado-maior.html` | Carta topográfica militar, lápis e símbolos OTAN |
| 3 | `p3-sala-de-guerra.html` | Terminal vetorial de fósforo verde com linha de comando |
| 4 | `p4-grande-estrategia.html` | Jogo de estratégia moderno com terreno e modos de mapa |
| 5 | `p5-cordel.html` | Xilogravura de cordel em duas tintas |

Abra `prototipos/index.html` no navegador para comparar. Não precisa de servidor nem de build.

## Estrutura

- `prototipos/base/geo.js` — geografia pré-processada do Natural Earth (domínio público):
  países vizinhos, estados, rios, lagos, cidades e regiões de relevo, em projeção
  azimutal equivalente de Lambert centrada em 54°O 15°S.
- `prototipos/base/cenario.js` — motor comum: grade de território, contorno das frentes
  (marching squares), cenário de exemplo, simulação de turno e câmera (arrastar, zoom, pinça).
- `prototipos/base/dados.js` — textos de exemplo (organização, recursos, ordens, despachos).
