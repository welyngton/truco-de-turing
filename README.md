# Truco de Turing

<!-- versao -->
**Versão 2.4.2** (2026-11-14) · [histórico de versões](CHANGELOG.md)
<!-- /versao -->

Jogo de cartas para navegador, feito em **Phaser 3**, para ensinar redes neurais e deep learning jogando.
Implementa a proposta do prof. Peng Yaohao (FPO 2026/2, PPCA/UnB, trabalho tema 4),
em card games de fantasia (moldura, tipo, caixa de regras, texto de ambientação, "poder") e no truco
(naipes espanhóis, manilhas, pedidos de TRUCO/SEIS/NOVE/DOZE e partida até 12 tentos).

## Como rodar

O código usa módulos ES; sirva a pasta por http e abra no navegador.

```bash
npm install          # esbuild (empacotador)
npm start            # http://localhost:8080  (ou: python3 -m http.server 8080)
```

Arquivo único (CSS e JS embutidos, Phaser via CDN), que abre até com duplo clique:

```bash
npm run build        # gera dist/truco-de-turing.html
```

Laboratório de Monte Carlo em Node (oponentes jogando entre si, sem interface):

```bash
node ferramentas/simular.js 500 guloso aleatorio classico neutro
node ferramentas/simular.js 60 montecarlo guloso truco oceano
```

## Documentação

- [**Manual do código**](docs/MANUAL.md): arquitetura, convenções, fluxo de uma jogada, como rodar,
  publicar e estender (novo baralho, terreno, oponente, conquista ou verbete).
- [**Referência**](docs/REFERENCIA.md): todos os módulos e funções, gerada dos comentários com `npm run docs`.

## Testes

Três suítes com o executor nativo do Node: **unidade** (regras, conteúdo, arte, telas, som e
ferramentas), **interface** (o jogo inteiro no Chromium, inclusive no celular) e **performance**
(tempos com limites). Os relatórios ficam em [`relatorios/`](relatorios/README.md): resultado de
cada teste, cobertura por arquivo e por função (Node + navegador), medidas de performance e
capturas de tela.

```bash
npm run testar              # unidade
npm run testar:interface    # interface (Chromium)
npm run testar:performance  # performance
npm run relatorios          # tudo + relatórios
```

No GitHub, cada pull request e cada push na main rodam as três suítes e publicam os relatórios
como artefato.

## Versões

Cada merge na `main` gera uma versão nova, automaticamente (GitHub Actions, `.github/workflows/versao.yml`):
o número sobe, a tela **Sobre** e este README passam a mostrá-lo, o [histórico](CHANGELOG.md) ganha uma
entrada com o título do pull request, e uma tag `vX.Y.Z` e uma release são publicadas.

| Pull request | Versão |
|---|---|
| comum (correção, ajuste) | 1.0.0 → 1.0.1 |
| título começando com `feat`, `nova` ou `novo`, ou rótulo `versao:menor` | 1.0.0 → 1.1.0 |
| título com `!:` ou "BREAKING", ou rótulo `versao:maior` | 1.0.0 → 2.0.0 |

Em cada pull request, o resumo da verificação mostra qual versão ele vai gerar.

## Estrutura

Todo o código está em português do Brasil, em camadas que só dependem das de baixo:

```
index.html                 página de desenvolvimento
src/principal.js           ponto de entrada: cria o Phaser.Game
src/aplicacao.js           opções, progresso, conquistas e navegação menu ⇄ mesa
src/configuracao.js        mundo 1280x720, cores, fontes, resolução
src/estilo.css             painéis HTML (menu, regras, biblioteca, conquistas, avatares, sobre)
src/motor/                 motor de regras do NeuroDeck (do colega Francisco): estado, ações,
                           baralhos, terrenos, desempates e bots. Ver src/motor/ORIGEM.md
src/nucleo/                camada de tradução (sem Phaser): entrega às telas a mão, as jogadas,
                           a pontuação e os oponentes no formato da interface, sobre o motor;
                           e o modo truco
src/conteudo/              Glossário, conquistas, textos e progresso salvo
src/arte/                  arte procedural em canvas: cartas, versos, mesas, avatares, ícones
src/interface/             menu, telas HTML, avisos e som (WebAudio)
src/cenas/                 cenas do Phaser: carregamento, menu e mesa
src/cenas/mesa/            a mesa dividida por assunto: cenário, desenho, entrada,
                           turnos, truco, efeitos e resultado
ferramentas/               empacotar, simular, documentar, versionar e gerar relatórios
testes/                    unidade, interface (Chromium) e performance
relatorios/                relatórios de testes, cobertura e performance
.github/workflows/         versão automática a cada merge na main
docs/                      manual e referência
```

O motor (`src/motor`) e o núcleo (`src/nucleo`) não dependem do Phaser: rodam no navegador e no Node,
o que permite testar regras e balanceamento com milhares de partidas.

### Fusão com o NeuroDeck

Por decisão do professor, o jogo unificado usa as **regras do NeuroDeck** e a **interface do Truco de
Turing**. O motor do NeuroDeck foi copiado do site publicado sem alterações (o SHA-256 de cada arquivo e
1.000 partidas com semente conferem com o site) e depois recebeu as quatro mudanças de regra decididas
em 10/11/2026; o conjunto original continua disponível com `rules: 'nd-2.0.0'` e é testado contra o
site a cada execução. `src/nucleo` virou uma camada de tradução: as telas chamam as mesmas funções de
antes e quem decide as regras é o motor. Detalhes em [`src/motor/ORIGEM.md`](src/motor/ORIGEM.md).

## Regras implementadas

São as regras do motor do NeuroDeck com as decisões da fusão: mesa 3-5-5-5-5-5-4, 5 cartas na mão, 10 no
limbo; uma carta por camada da entrada à saída; Ás 11, figuras 0; figuras iguais em camadas vizinhas
valem 10 cada (par 20, trio 30) e a quadra zera a rede; tunagem, overfit, early stop, stack overflow,
dropout (GatoNet) e transfer learning (uma vez por mão), os dois últimos sem gastar o turno; entrada e
saída imunes; desempates na ordem do enunciado; as três opções de "quem começa".

Pontos em que o enunciado deixa margem e o que ficou decidido (professor e grupo, 10/11/2026):

| Ponto | Regra |
|---|---|
| Par e trio de figuras | Cada figura da sequência vale 10: par 20, trio 30. Quatro figuras iguais causam vanishing gradient. |
| Carta empilhada (professor) | Conta na sequência de figuras, como as outras (sem bônus extra). O exemplo 8-K-K-3 com tunagem num K tem três Reis: 8 + 30 + 3 = 41. Tunar os dois Reis de um par forma quadra e zera a rede. |
| Efeito de empilhar | Decidido pelo tamanho final da pilha: 2 = tunagem (própria) ou overfit (adversário); 3 = early stop; 4 = stack overflow. Vale também na própria rede (auto early stop, auto stack overflow). |
| Dropout (professor) | Os neurônios desfeitos saem da mesa e vão para o cemitério, com as tunagens. Não gasta o turno. |
| Camada sem neurônio livre (professor) | A rede é finalizada ali ("acabou o campo") e conta a soma parcial. |
| Transfer learning (professor) | Não gasta o turno. |
| Passar a vez | Só quem teve a rede interrompida por early stop, do rival ou aplicado em si, e ainda tem cartas (atacar não é obrigatório); ou quem não tem nenhuma outra jogada. Quem não pode jogar é pulado. |
| Desempate pela carta mais alta | Compara a força da carta (Ás > K > Q > J > 10 … 2); o naipe só decide entre cartas iguais. |
| Quem começa | Padrão: cada um revela uma carta, que vai para o cemitério. No menu também há a opção em que a carta volta para a mão e o sorteio. |
| Fim da mão | Todas as redes finalizadas, ou ninguém mais tem jogada. |
| Terrenos | Montanha: +1 ponto por camada alcançada. Pântano: neurônio sem tunagem perde 1 ponto por rodada. Oceano: neurônio do naipe do vento, revelado na rodada, vale o dobro para sempre. |
| Baralho Truco | Só as cartas do truco, em 2 baralhos (mão de 10 cartas); as figuras valem pontos próprios e não formam par nem trio. |

## Proposta geral de mecânicas para gerar engajamento

- **Truco** por cima da mecânica: cada mão vale 1 tento; peça TRUCO (3), SEIS, NOVE, DOZE; correr entrega o valor atual; partida até 12; mão de onze.
- **Tensão de corrida**: chegar à saída torna a rede imune; tunar aumenta a soma, mas deixa o neurônio a uma carta do early stop.
- **Três oponentes, um por nível**:
  - *Zé do Ruído* (fácil): sorteia uma jogada válida; bom para aprender as regras.
  - *Gradiente Guloso* (médio): como a descida de gradiente, escolhe o lance que mais melhora o placar agora, sem olhar adiante.
  - *Mestre Monte Carlo* (difícil): sorteia as cartas ocultas, simula dezenas de partidas para cada lance e escolhe o que mais venceu; mostra a própria chance de vitória e truca com base nas simulações.
- **7 baralhos e 4 terrenos**: Clássico, Truco com manilhas, Nobreza, Backprop (o naipe é o peso, as figuras são ativações e a rede vale a saída do forward pass), Fraternidade, Yin-yang e Power BI; mesa neutra, Montanha, Pântano e Oceano, cada terreno com ambiente animado (sombras de nuvens e sementes ao vento na Planície; neve, névoa e rajadas na Montanha; neblina, vaga-lumes, bolhas e fogo-fátuo no Pântano; cáusticas, brilhos e vento no Oceano). As cartas da mesa são sempre opacas: por cima delas passam só partículas pequenas (flocos, sementes, bolhas, brilhos, riscos de vento); neblina, cáusticas, sombras e halos ficam por trás.
- **35 conquistas** em graduações de bronze a antimatéria, incluindo as do enunciado (Desk rejection, Marcha dos patos, Contra tudo e contra todos, Artilheiro dos gols inúteis, 100 dropouts…) e as da fusão (baralhos Nobreza e Backprop, mesas de 4 e 5 jogadores, 3 baralhos, arquiteturas).
- **9 avatares** para o jogador, 6 deles liberados por conquistas (Menu > Avatar).
- **Modo dicas**: dicas de estratégia a cada vez, sempre com o conceito de redes neurais por trás, e explicações nos botões (mouse ou segurar no celular); só usam o que está à vista e nunca dizem qual carta virada escolher. Mãos com dicas não valem conquistas.
- **Mesa pensada para o toque**: no painel esquerdo, só REGRAS (regras, ajuda das ações, Glossário e dicas) e MENU (som, música e sair); botões de ação grandes e quase quadrados.
- **Revisão da mão**: curva de treino passo a passo, momentos-chave e linha do tempo comentada com os conceitos do Glossário.
- **Trilha sonora** (ligada por padrão): baião animado no menu (sanfona, zabumba, triângulo e palmas), blues lento na Planície (mesa neutra), valsa com marimba no oceano, épica com trompa, harpa e tambores na montanha e uma dança de fada com harmônica de vidro e glockenspiel no pântano; fanfarra e confete na vitória.
- **Feedback visual**: conexões com espessura proporcional ao valor (como no Playground), curva de treino, explosões, banners, músicas e sons.

## Conteúdo educativo

Cada mecânica corresponde a um verbete do **Glossário** (antes Biblioteca de conceitos e, no começo, Grimório), que aparece como aviso na
primeira vez em que acontece: neurônio, função de ativação, saturação da ativação (o aviso "Saída saturada" do baralho
Backprop), camadas e arquiteturas, propagação direta, pesos, curva de treino, retropropagação (e por que o baralho
Backprop, que só faz o forward pass, tem esse nome), fine-tuning, overfitting, dropout, early stopping, stack overflow, vanishing gradient, transfer
learning, ruído, Monte Carlo, mudança de distribuição (terrenos como weight decay e concept drift) e decisão sob
incerteza (truco). Cada verbete traz a equação, uma figura quando ajuda, como aparece no jogo e até onde a comparação
vale. O botão "?" da mesa abre a ajuda das ações, com a regra de cada jogada e um botão "Ver o conceito".

## Estatísticas de uso

O site publicado (`https://welyngton.github.io/truco-de-turing/`) usa o **Google Analytics 4**
(ID `G-VWSGVWJK6Q`) para contar partidas, mãos, pedidos de truco, verbetes lidos e conquistas
(`src/interface/analise.js`). Só mede depois que a pessoa aceita na faixa de consentimento, e a
escolha pode ser mudada na tela "Sobre". Sinais de publicidade ficam desligados. Em `localhost`, no
arquivo único (`file://`), em forks publicados em outro endereço e nos testes automatizados nada é
carregado.

Eventos (`EVENTOS` em `analise.js`):

| Evento | Quando | Parâmetros |
|---|---|---|
| `jogo_iniciado` | botão Jogar ou partida online | baralho, terreno, oponente, arquitetura, jogadores, humanos, baralhos, alvo, online |
| `jogo_finalizado` | partida encerrada | baralho, terreno, oponente, jogadores, online, alvo, maos, tentos, venceu |
| `vitoria_do_jogador` / `derrota_jogador` | fim da partida, para quem joga no aparelho | os de `jogo_finalizado`, sem venceu |
| `jogo_abandonado` | saiu da partida antes do fim | baralho, terreno, oponente, maos, tentos, online |
| `fim_mao` | fim de cada mão | baralho, terreno, oponente, jogadores, online, venceu, completa, valor, soma, dicas |
| `acao_jogada` | cada jogada de quem está no aparelho | acao (inicio, ativar, tunagem, overfit, earlystop, stackoverflow, dropout, transfer, passar), baralho, terreno, camada, mao |
| `truco` | pedido de truco | valor, quem |
| `menu_clique` | botões do menu inicial | botao (jogar, jogar_online, como_jogar, glossario, conquistas, avatar, mods, sobre) |
| `menu_opcao` | mudança numa escolha do menu | campo, valor |
| `mesa_clique` | REGRAS e MENU da mesa e as opções deles | botao |
| `dicas` | ligou ou desligou as dicas | ligadas |
| `revisao_aberta` | revisão da mão ou da partida | escopo |
| `verbete_lido` | primeira leitura de cada verbete | verbete, lidos |
| `conquista` | conquista desbloqueada | conquista, nome, graduacao, total, maos |
| `avatar_escolhido` | troca de avatar | avatar |
| `audio_alterado` | som ou música | tipo, ligado |
| `login` / `logout` | entrar ou sair da conta | method |
| `sala_online` | criar, entrar ou começar uma sala | acao, pessoas, conta |

**Jogadores diferentes.** Cada aparelho recebe um código anônimo (`a-…`); quem entra numa conta vira
`c-<uid da conta>` e o uid vai também como `user_id`. O código e o perfil vão como propriedades do
usuário: `id_jogador`, `tipo_conta` (local, google, email), `experiencia` (novato, iniciante,
intermediario, veterano), `conquistas`, `avatar` e `verbetes_lidos`. Nome, e-mail e nome na mesa não
são enviados.

O jogo envia esses nomes direto: no Google Analytics não é preciso regra em "Criar eventos" (uma
regra que recria um evento com o próprio nome o conta em dobro). Para separar os dados por jogador,
baralho etc., cadastre em Administrador → Definições personalizadas as propriedades do usuário
(escopo **Usuário**) e os parâmetros que interessarem (escopo **Evento**) e use Explorar → Forma
livre, com "ID do jogador" nas linhas.

## Jogar online

Botão **Jogar online** no menu:

- **Conta**: entrar com Google ou e-mail e senha guarda conquistas, avatares e progresso na conta,
  que vale em qualquer aparelho; o progresso do aparelho e o da conta se juntam sem contar nada em dobro.
- **Sala**: quem cria a sala escolhe quantas pessoas vão jogar e passa o código de 5 letras; as
  cadeiras que sobrarem ficam com o computador. A sala usa as opções do menu, e o truco vale entre 2 jogadores.
- **Como funciona**: todos os aparelhos criam a mesma mão com a mesma semente e aplicam as mesmas
  ações na mesma ordem, numerada pelo anfitrião (`src/online/sala.js`). Quem cai vira computador
  no mesmo ponto em todas as telas; se o anfitrião sai, a próxima pessoa assume a sala. Quem
  recarrega a aba volta à mesma cadeira.
- **Onde roda**: pela internet, com o projeto Firebase do grupo (`src/online/configuracao.js`,
  regras em `firestore.rules`); sem login, a sala funciona entre abas e janelas do mesmo navegador.

Limite conhecido: cada aparelho tem o estado completo da mão (é assim que a sincronia funciona sem
servidor próprio), então quem abrir o console do navegador consegue ver as cartas dos outros.

## Próximos passos

Carregar mods na interface (o motor já tem o registro de baralhos, terrenos e ações).

## Licença

Distribuído sob a [GPL-3.0](https://github.com/welyngton/truco-de-turing#GPL-3.0-1-ov-file). Código-fonte: https://github.com/welyngton/truco-de-turing

Autores:
<!-- autores -->
- Peng Yaohao: especificação inicial, gerência do projeto, validação e feedbacks
- Welyngton José Vinicius Dal Prá ([@welyngton](https://github.com/welyngton)): Truco de Turing (interface, arte, sons, conquistas e modo truco)
- Diego Casagrande ([@diegocasagrande](https://github.com/diegocasagrande)): testes, validação das regras e fusão com o NeuroDeck
- Suzy Arcanjo ([@SuzyArcanjo](https://github.com/SuzyArcanjo)): verbetes das ações no Glossário
- Vinícius Chiconato ([@chiconatovini](https://github.com/chiconatovini)): correções da fusão
- 
<!-- /autores -->

Regras originais: Peng Yaohao - FPO-UNB - 2026-2
