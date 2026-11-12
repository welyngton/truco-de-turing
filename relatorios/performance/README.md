# Testes de performance

**Versão 1.3.1** · commit `0b63147-dirty` (com as mudanças ainda não registradas) · 11/11/2026, 23:28 (horário de Brasília)  
Ambiente: Node v22.23.4 · Chromium 153.0.8010.12 · Linux x64 · 2 núcleos

Tempos do motor de regras, dos oponentes, das dicas, da arte e do empacotamento no Node; tempo de carregamento, quadros por segundo, memória e tempo de resposta no navegador. Cada medida tem um limite; acima dele, o teste falha.

| Testes | Aprovados | Reprovados | Pulados | Duração |
|---:|---:|---:|---:|---:|
| 12 | 12 | 0 | 0 | 22,6 s |

Resultado em formato JUnit (para ferramentas de CI): [`resultado.junit.xml`](resultado.junit.xml).

## Medidas

| | Grupo | Medida | Valor | Limite | Observação |
|---|---|---|---:|---:|---|
| ✅ | Navegador | Tempo até o menu (WebGL) | 815 ms | ≤ 15.000 |  |
| ✅ | Navegador | Tempo até a mesa pronta (WebGL) | 5.776 ms | ≤ 15.000 |  |
| ✅ | Navegador | Quadros por segundo na mesa (WebGL) | 4,99 qps | ≥ 3,00 | WebGL por software (sem GPU no teste) |
| ✅ | Navegador | Memória JavaScript em uso (WebGL) | 35,57 MB | ≤ 400 |  |
| ✅ | Navegador | Resposta a uma jogada (WebGL) | 45,60 ms | ≤ 300 |  |
| ✅ | Navegador | Tempo até o menu (Canvas) | 298 ms | ≤ 15.000 |  |
| ✅ | Navegador | Tempo até a mesa pronta (Canvas) | 783 ms | ≤ 15.000 |  |
| ✅ | Navegador | Quadros por segundo na mesa (Canvas) | 59,65 qps | ≥ 20,00 | Chromium sem GPU |
| ✅ | Navegador | Memória JavaScript em uso (Canvas) | 26,32 MB | ≤ 400 |  |
| ✅ | Navegador | Resposta a uma jogada (Canvas) | 45,30 ms | ≤ 300 |  |
| ✅ | Node | pontuarRede | 6,77 µs por chamada | ≤ 200 |  |
| ✅ | Node | jogadasLegais | 11,54 µs por chamada | ≤ 300 |  |
| ✅ | Node | Mãos completas simuladas | 1.872 mãos/s | ≥ 150 |  |
| ✅ | Node | copiarMao | 45,13 µs por chamada | ≤ 300 |  |
| ✅ | Node | determinizar | 63,96 µs por chamada | ≤ 600 |  |
| ✅ | Node | Decisão gulosa | 0,03 ms | ≤ 60,00 | p95 0.1 ms |
| ✅ | Node | Simulações por decisão (Monte Carlo) | 280 partidas | ≥ 80,00 |  |
| ✅ | Node | Decisão do Monte Carlo | 52,09 ms | ≤ 1.500 | p95 66.4 ms |
| ✅ | Node | chanceDeVitoria (40 simulações) | 10,60 ms | ≤ 150 |  |
| ✅ | Node | escolherDicaDeJogo | 14,11 µs por chamada | ≤ 500 |  |
| ✅ | Node | Carta completa (densidade 2) | 16,26 ms | ≤ 120 |  |
| ✅ | Node | Carta da mesa (densidade 1,25) | 5,34 ms | ≤ 60,00 |  |
| ✅ | Node | Verso (densidade 2) | 0,31 ms | ≤ 120 |  |
| ✅ | Node | Fundo da mesa 1280×720 | 16,49 ms | ≤ 400 |  |
| ✅ | Node | Empacotamento (esbuild) | 192 ms | ≤ 8.000 |  |
| ✅ | Node | Tamanho do arquivo único | 598 KB | ≤ 700 |  |

Todas as medidas em [`medidas.json`](medidas.json). O Chromium dos testes não tem placa de vídeo: o WebGL é desenhado por software, por isso os quadros por segundo em WebGL ficam muito abaixo do que um aparelho de verdade alcança; a medida em Canvas mostra que a lógica do jogo não é o gargalo.

## `testes/performance/navegador.test.js`

| | Teste | Grupo | Duração |
|---|---|---|---:|
| ✅ | WebGL (padrão) | jogo no navegador | 12,9 s |
| ✅ | Canvas 2D | jogo no navegador | 5,3 s |

## `testes/performance/nucleo-e-arte.test.js`

| | Teste | Grupo | Duração |
|---|---|---|---:|
| ✅ | pontuar uma rede no meio da mão | motor de regras | 44 ms |
| ✅ | listar as jogadas legais | motor de regras | 64 ms |
| ✅ | mãos inteiras por segundo (jogadas aleatórias) | motor de regras | 1,5 s |
| ✅ | copiar e determinizar uma mão | motor de regras | 222 ms |
| ✅ | decisão do Gradiente Guloso | oponentes e dicas | 3 ms |
| ✅ | decisão do Mestre Monte Carlo (40 partidas simuladas por jogada) | oponentes e dicas | 420 ms |
| ✅ | chance de vitória com 40 simulações (dica do truco) | oponentes e dicas | 122 ms |
| ✅ | escolher a dica de jogo | oponentes e dicas | 31 ms |
| ✅ | desenhar cartas, versos e a mesa | arte procedural e empacotamento | 482 ms |
| ✅ | tempo de empacotamento e tamanho do arquivo único | arte procedural e empacotamento | 213 ms |

