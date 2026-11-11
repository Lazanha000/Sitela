# Revolução — jogo de estratégia no Brasil

## Jogo final: `jogo/`

Abra `jogo/index.html` no navegador. Não precisa de servidor, instalação nem build.
Direção de arte escolhida: **Cinejornal** (protótipo 1).

- `js/geo.js` — geografia Natural Earth pré-processada
- `js/mundo.js` — grade de território, adjacência, rios-fronteira, suprimento, contornos, câmera
- `js/regras.js` — estado da partida, ações políticas, ordens e combate, governo, rivais, eventos, teses, finais
- `js/render.js` — mapa no estilo cinejornal e a animação do turno
- `js/ia.js` — IA opcional (desligada por padrão) com vários provedores e modo manual
- `js/ui.js` — telas, criação da organização, fichas, modais, salvamento
- `js/bandeira.js` — construtor de bandeiras em SVG

A IA é opcional. Chamadas a provedores externos funcionam quando o jogo é aberto
pelo arquivo local ou por um site próprio (ex.: GitHub Pages); dentro do visualizador
de artifacts do Claude só o modo Manual (copiar e colar) funciona.

## Protótipos de arte: `prototipos/`

Em `prototipos/` há cinco protótipos visuais,
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
