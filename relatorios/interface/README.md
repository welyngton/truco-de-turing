# Testes de interface

**Versão 1.3.1** · commit `0b63147-dirty` (com as mudanças ainda não registradas) · 11/11/2026, 23:28 (horário de Brasília)  
Ambiente: Node v22.23.4 · Chromium 153.0.8010.12 · Linux x64 · 2 núcleos

O jogo inteiro rodando no Chromium (Playwright): menu e telas (regras, ajuda das ações, Biblioteca, avatares), mãos completas contra os três oponentes, entre duas pessoas e em mesas de 3 a 5 jogadores, cada ação da mesa e os painéis de leitura, truco, modo dicas (mouse e toque), som, música, comemorações e celular (vertical e horizontal).

| Testes | Aprovados | Reprovados | Pulados | Duração |
|---:|---:|---:|---:|---:|
| 23 | 23 | 0 | 0 | 1040,6 s |

Resultado em formato JUnit (para ferramentas de CI): [`resultado.junit.xml`](resultado.junit.xml).

## Capturas de tela

Tiradas pelo próprio teste, no momento indicado pelo nome.

<a href="capturas/01-menu.jpg"><img src="capturas/01-menu.jpg" width="300" alt="01-menu"></a>
<a href="capturas/01b-grimorio-formulas.jpg"><img src="capturas/01b-grimorio-formulas.jpg" width="300" alt="01b-grimorio-formulas"></a>
<a href="capturas/02-conquistas.jpg"><img src="capturas/02-conquistas.jpg" width="300" alt="02-conquistas"></a>
<a href="capturas/03-celular-vertical.jpg"><img src="capturas/03-celular-vertical.jpg" width="300" alt="03-celular-vertical"></a>
<a href="capturas/04-celular-horizontal.jpg"><img src="capturas/04-celular-horizontal.jpg" width="300" alt="04-celular-horizontal"></a>
<a href="capturas/05-mesa-inicio.jpg"><img src="capturas/05-mesa-inicio.jpg" width="300" alt="05-mesa-inicio"></a>
<a href="capturas/06-aleatorio-resultado.jpg"><img src="capturas/06-aleatorio-resultado.jpg" width="300" alt="06-aleatorio-resultado"></a>
<a href="capturas/06-aleatorio-revisao.jpg"><img src="capturas/06-aleatorio-revisao.jpg" width="300" alt="06-aleatorio-revisao"></a>
<a href="capturas/08-guloso-resultado.jpg"><img src="capturas/08-guloso-resultado.jpg" width="300" alt="08-guloso-resultado"></a>
<a href="capturas/08-guloso-revisao.jpg"><img src="capturas/08-guloso-revisao.jpg" width="300" alt="08-guloso-revisao"></a>
<a href="capturas/10-montecarlo-resultado.jpg"><img src="capturas/10-montecarlo-resultado.jpg" width="300" alt="10-montecarlo-resultado"></a>
<a href="capturas/10-montecarlo-revisao.jpg"><img src="capturas/10-montecarlo-revisao.jpg" width="300" alt="10-montecarlo-revisao"></a>
<a href="capturas/12-dois-humanos-resultado.jpg"><img src="capturas/12-dois-humanos-resultado.jpg" width="300" alt="12-dois-humanos-resultado"></a>
<a href="capturas/13-tunagem.jpg"><img src="capturas/13-tunagem.jpg" width="300" alt="13-tunagem"></a>
<a href="capturas/14-stack-overflow.jpg"><img src="capturas/14-stack-overflow.jpg" width="300" alt="14-stack-overflow"></a>
<a href="capturas/15-dropout.jpg"><img src="capturas/15-dropout.jpg" width="300" alt="15-dropout"></a>
<a href="capturas/16-truco.jpg"><img src="capturas/16-truco.jpg" width="300" alt="16-truco"></a>
<a href="capturas/17-dica-de-jogo.jpg"><img src="capturas/17-dica-de-jogo.jpg" width="300" alt="17-dica-de-jogo"></a>
<a href="capturas/18-dica-do-botao.jpg"><img src="capturas/18-dica-do-botao.jpg" width="300" alt="18-dica-do-botao"></a>
<a href="capturas/19-vitoria.jpg"><img src="capturas/19-vitoria.jpg" width="300" alt="19-vitoria"></a>
<a href="capturas/20-menu-da-mesa.jpg"><img src="capturas/20-menu-da-mesa.jpg" width="300" alt="20-menu-da-mesa"></a>
<a href="capturas/21-mesa-4-jogadores-resultado.jpg"><img src="capturas/21-mesa-4-jogadores-resultado.jpg" width="300" alt="21-mesa-4-jogadores-resultado"></a>
<a href="capturas/21-mesa-4-jogadores-revisao.jpg"><img src="capturas/21-mesa-4-jogadores-revisao.jpg" width="300" alt="21-mesa-4-jogadores-revisao"></a>
<a href="capturas/21-mesa-4-jogadores.jpg"><img src="capturas/21-mesa-4-jogadores.jpg" width="300" alt="21-mesa-4-jogadores"></a>
<a href="capturas/22-mesa-5-jogadores-resultado.jpg"><img src="capturas/22-mesa-5-jogadores-resultado.jpg" width="300" alt="22-mesa-5-jogadores-resultado"></a>
<a href="capturas/22-mesa-5-jogadores-revisao.jpg"><img src="capturas/22-mesa-5-jogadores-revisao.jpg" width="300" alt="22-mesa-5-jogadores-revisao"></a>
<a href="capturas/22-mesa-5-jogadores.jpg"><img src="capturas/22-mesa-5-jogadores.jpg" width="300" alt="22-mesa-5-jogadores"></a>
<a href="capturas/23-mesa-3-jogadores-resultado.jpg"><img src="capturas/23-mesa-3-jogadores-resultado.jpg" width="300" alt="23-mesa-3-jogadores-resultado"></a>
<a href="capturas/23-mesa-3-jogadores-revisao.jpg"><img src="capturas/23-mesa-3-jogadores-revisao.jpg" width="300" alt="23-mesa-3-jogadores-revisao"></a>
<a href="capturas/23-mesa-3-jogadores.jpg"><img src="capturas/23-mesa-3-jogadores.jpg" width="300" alt="23-mesa-3-jogadores"></a>
<a href="capturas/24-mods.jpg"><img src="capturas/24-mods.jpg" width="300" alt="24-mods"></a>
<a href="capturas/25-placar-por-camada.jpg"><img src="capturas/25-placar-por-camada.jpg" width="300" alt="25-placar-por-camada"></a>
<a href="capturas/26-regras-baralhos-e-terrenos.jpg"><img src="capturas/26-regras-baralhos-e-terrenos.jpg" width="300" alt="26-regras-baralhos-e-terrenos"></a>
<a href="capturas/27-ajuda-das-acoes.jpg"><img src="capturas/27-ajuda-das-acoes.jpg" width="300" alt="27-ajuda-das-acoes"></a>
<a href="capturas/28-biblioteca-dropout.jpg"><img src="capturas/28-biblioteca-dropout.jpg" width="300" alt="28-biblioteca-dropout"></a>
<a href="capturas/29-avatares.jpg"><img src="capturas/29-avatares.jpg" width="300" alt="29-avatares"></a>
<a href="capturas/30-sala-online.jpg"><img src="capturas/30-sala-online.jpg" width="300" alt="30-sala-online"></a>
<a href="capturas/31-online-resultado.jpg"><img src="capturas/31-online-resultado.jpg" width="300" alt="31-online-resultado"></a>

## `testes/interface/acoes.test.js`

| | Teste | Grupo | Duração |
|---|---|---|---:|
| ✅ | inspeção, seleção, Esc, tunagem, overfit, stack overflow e early stop na própria rede | ações da mesa | 85,3 s |
| ✅ | barra de ações do NeuroDeck: botões acendem pela seleção, selo de tunagem, pontos por neurônio e painéis de leitura | ações da mesa | 33,5 s |
| ✅ | dropout (escolher camadas e pagar), cancelar, transfer learning, passar a vez e vanishing gradient | ações da mesa | 41,1 s |
| ✅ | truco: pedir, responder (aumentar, aceitar, correr) e a mão terminada por corrida | ações da mesa | 51,8 s |
| ✅ | truco com duas pessoas no aparelho: quem responde pega o aparelho antes de ver o pedido | ações da mesa | 37,0 s |
| ✅ | dicas: aviso de conquistas, dica de jogo a cada vez, dicas dos botões com o mouse e desligar | ações da mesa | 37,3 s |
| ✅ | celular: segurar um botão mostra a dica sem executar a ação; toque rápido executa | ações da mesa | 22,5 s |
| ✅ | celular em tela cheia: botão responde mesmo com o polegar apoiado na borda da tela | ações da mesa | 17,3 s |
| ✅ | som, música, comemorações, derrota e voltar ao menu | ações da mesa | 63,7 s |

## `testes/interface/menu-e-telas.test.js`

| | Teste | Grupo | Duração |
|---|---|---|---:|
| ✅ | carrega, mostra o menu com as escolhas e abre Regras (abas, ajuda das ações), Biblioteca de conceitos, Conquistas, Mods e Sobre | menu e telas | 53,2 s |
| ✅ | celular na vertical: só o aviso para girar; ao girar, o jogo é criado e o menu aparece | menu e telas | 36,4 s |
| ✅ | renderizador Canvas e resolução forçados pela URL | menu e telas | 2,5 s |

## `testes/interface/online.test.js`

| | Teste | Grupo | Duração |
|---|---|---|---:|
| ✅ | criar, entrar pelo código, jogar uma mão com truco e terminar igual nas duas telas | partida online entre abas | 161,2 s |
| ✅ | quem fecha a aba no meio da mão vira computador e a outra tela termina a mão | partida online entre abas | 107,2 s |
| ✅ | quem fecha a aba antes de escolher a carta de quem começa vira computador e a outra tela termina a mão | partida online entre abas | 118,5 s |

## `testes/interface/partidas.test.js`

| | Teste | Grupo | Duração |
|---|---|---|---:|
| ✅ | Zé do Ruído · clássico · neutro · revela e volta | mãos completas contra o computador | 126,9 s |
| ✅ | Gradiente Guloso · truco · montanha · revela e descarta | mãos completas contra o computador | 75,8 s |
| ✅ | Mestre Monte Carlo · fraternidade · pântano · sorteio | mãos completas contra o computador | 117,3 s |
| ✅ | 4 jogadores (2 humanos e 2 Zé do Ruído), arquitetura profunda, 2 baralhos | mesa dinâmica: arquiteturas, 3 a 5 jogadores e vários baralhos | 60,5 s |
| ✅ | 5 jogadores contra o Gradiente Guloso, arquitetura larga | mesa dinâmica: arquiteturas, 3 a 5 jogadores e vários baralhos | 115,7 s |
| ✅ | 3 jogadores, arquitetura curta, Pântano | mesa dinâmica: arquiteturas, 3 a 5 jogadores e vários baralhos | 53,3 s |
| ✅ | duas pessoas no mesmo aparelho (yin-yang, oceano): o aparelho troca de mãos entre as vezes | duas pessoas e mão única | 48,3 s |
| ✅ | mão única sem truco (Power BI): "Nova partida" recomeça o placar | duas pessoas e mão única | 51,6 s |

