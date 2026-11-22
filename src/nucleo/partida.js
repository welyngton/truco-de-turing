/**
 * @file Uma mão do jogo, vista pela interface do Truco de Turing e jogada pelo motor.
 *
 * Este arquivo é a **camada de tradução** da fusão: as telas e os testes continuam chamando as
 * mesmas funções de antes (`novaMao`, `jogadasLegais`, `aplicarJogada`…), mas as regras agora são
 * as do motor em `src/motor/` (ver `src/motor/MOTOR.md`). Nenhuma regra é decidida aqui.
 *
 * ## Como funciona
 * A mão guarda o estado do motor em `mao.estadoMotor` e uma **visão** dele no formato que a interface
 * conhece (os campos abaixo). Cada jogada é traduzida (`traducao.js`), aplicada pelo motor e, em
 * seguida, a visão é refeita por `atualizarVisao`. Os eventos de animação e as linhas do registro
 * são gerados aqui, comparando o antes e o depois.
 *
 * ## Visão da mão
 * ```
 * {
 *   config: { baralho, terreno, inicio, arquitetura, baralhos },  // opções escolhidas no menu
 *   semente,                                   // aleatoriedade reproduzível
 *   estadoMotor,                                        // estado do motor (fonte da verdade)
 *   indiceDeCartas,                            // cartas da interface por id do motor, e vice-versa
 *   camadas: Neuronio[][],                     // a mesa, camada a camada
 *   neuronios: { [id]: Neuronio },             // índice dos neurônios por id
 *   jogadores: Jogador[],
 *   limbo: Carta[], cemiterio: Carta[],
 *   vez, primeiro, rodada, turno, vento,
 *   fase: 'inicio' | 'jogo' | 'fim',
 *   eventos: Evento[],                         // fila consumida pela interface para animar
 *   registro: string[],                        // texto do histórico de jogadas
 *   historico: number[][],                     // soma de cada rede a cada jogada (curva de treino)
 *   lances: Lance[],                           // o que cada jogador fez, em ordem (ver "Lances" abaixo)
 *   resultado: { somas, vencedor, motivo, travados } | null,
 *   simulacao: boolean,                        // em simulações, não gera eventos nem textos
 * }
 * ```
 * Neurônio: `{ id, camada, posicao, cartas, revelado, dono, removido, conhecido, rodadaRevelada }`.
 * Jogador: `{ indice, nome, tipo: 'humano'|'oponente', oponente, mao, caminho, situacao, dropouts,
 * acoesUsadas, transferUsado, cartaInicial, estatisticas }`. `situacao` é 'construindo',
 * 'concluida', 'earlystop', 'overflow' ou 'travada' (ficou sem neurônio livre na camada seguinte).
 *
 * ## Lances
 * Cada jogada aplicada vira um lance em `mao.lances` (fora das simulações), para as conquistas lerem o que
 * aconteceu na mão: `{ tipo, jogador, camada, alvo, proprio, cartas, consomeVez, valor, camadas, revelouMaior }`.
 * `tipo` é 'ativar', 'tunagem', 'overfit', 'earlystop', 'stackoverflow', 'dropout', 'transfer', 'passar' ou
 * 'travada' (rede finalizada por falta de neurônio livre; não é jogada de ninguém). `camada` é a do neurônio
 * (na travada, a camada que faltou), `alvo` o dono da rede atingida (o próprio jogador na tunagem), `cartas` quantas
 * cartas da mão a jogada gastou, `valor` os pontos do neurônio ativado depois de todos os bônus, `camadas`
 * as camadas desfeitas pelo dropout e `revelouMaior` se o neurônio ativado depois dele vale mais que o desfeito.
 *
 * ## Jogadas
 * `{ tipo: 'inicio', jogador, carta }`, `{ tipo: 'ativar', jogador, neuronio }`,
 * `{ tipo: 'empilhar', jogador, neuronio, cartas }`, `{ tipo: 'dropout', jogador, n, pagamento }`,
 * `{ tipo: 'transfer', jogador, cartas }`, `{ tipo: 'passar', jogador }`.
 *
 * ## O que mudou nas regras com o motor
 *  - dropout: o neurônio desfeito vai para o cemitério e sai da mesa (antes voltava virado);
 *  - quem fica sem neurônio livre na camada seguinte tem a rede finalizada ('travada');
 *  - transfer learning não gasta a vez;
 *  - só passa a vez quem teve a rede interrompida por early stop (com cartas na mão) ou quem não
 *    tem nenhuma outra jogada; quem não pode jogar é pulado automaticamente;
 *  - pontuação, terrenos e desempates: ver `pontuacao.js` e `src/motor/engine/`.
 */
import * as motor from '../motor/engine.js';
import { sementeNova } from './aleatorio.js';
import { rotuloCarta } from './cartas.js';
import { ehOculta, nomeCamada, tamanhosDaMesa, ARQUITETURAS } from './rede.js';
import {
  BARALHO_MOTOR, TERRENO_MOTOR, INICIO_MOTOR, ATAQUE_PELO_TAMANHO,
  cartaParaTT, naipeParaTT, idDoNeuronio, lugarDoNeuronio, situacaoDaRede, motivoDaVitoria,
} from './traducao.js';

/** Formas de decidir quem começa (seção "Inicialização" da especificação). A primeira é o padrão. */
export const FORMAS_DE_INICIO = {
  'revela-descarta': 'Cada um revela uma carta da mão; a maior começa e as duas vão para o cemitério',
  'revela-volta': 'Cada um revela uma carta da mão; a maior começa e as duas voltam para a mão',
  sorteio: 'Par ou ímpar: sorteio simples',
};

/** Nome de cada efeito de empilhamento, para a interface. */
export const NOME_EFEITO = { tunagem: 'Tunagem', overfit: 'Overfit', earlystop: 'Early stop', stackoverflow: 'Stack overflow' };

/* ======================================================================== criação */

/** Cria o objeto de um jogador no começo da mão. */
function novoJogador(dados, indice) {
  return {
    indice, nome: dados.nome, tipo: dados.tipo || 'humano', oponente: dados.oponente || null,
    mao: [], caminho: [], situacao: 'construindo', dropouts: 0, acoesUsadas: 0,
    transferUsado: false, cartaInicial: null,
    estatisticas: { ativacoes: 0, tunagens: 0, overfits: 0, earlyStops: 0, overflows: 0, autoParadas: 0, sofridos: 0, transfer: 0 },
  };
}

/** Todas as cartas da partida no estado do motor, onde quer que estejam. */
function todasAsCartas(estadoMotor) {
  const cartas = [];
  for (const camada of estadoMotor.layers) for (const slot of camada) cartas.push(slot.card, ...slot.stack);
  for (const mao of estadoMotor.hands) cartas.push(...mao);
  return cartas.concat(estadoMotor.limbo, estadoMotor.unused || [], estadoMotor.graveyard);
}

/**
 * Converte as cartas do motor para o formato da interface, uma vez por partida.
 * @returns {{ tt: Map<number, object>, estadoMotor: Map<string, number> }} carta da interface por id do
 *   motor, e id do motor por id da interface.
 */
function indexarCartas(estadoMotor) {
  const cartas = todasAsCartas(estadoMotor);
  const vezes = {};
  for (const c of cartas) vezes[c.rank + c.suit] = (vezes[c.rank + c.suit] || 0) + 1;
  const indice = { tt: new Map(), estadoMotor: new Map() };
  for (const c of cartas) {
    if (indice.tt.has(c.id)) continue;
    const carta = cartaParaTT(c, vezes[c.rank + c.suit] > 1);
    indice.tt.set(c.id, carta);
    indice.estadoMotor.set(carta.id, c.id);
  }
  return indice;
}

/**
 * Monta a visão da interface em volta de um estado do motor.
 * @param {object} estadoMotor Estado do motor (`newGame`, `cloneState` ou `determinize`).
 * @param {object} config `{ baralho, terreno, inicio }`.
 * @param {object[]} jogadores Jogadores no formato da interface.
 * @param {boolean} simulacao Mãos de simulação não geram eventos, registro nem histórico.
 * @param {object} [cartas] Índice de cartas de outra visão da mesma partida.
 */
function montar(estadoMotor, config, jogadores, simulacao, cartas) {
  const mao = {
    config, semente: estadoMotor.seed, estadoMotor, indiceDeCartas: cartas || indexarCartas(estadoMotor),
    camadas: [], neuronios: {}, jogadores,
    limbo: [], cemiterio: [],
    vez: 0, primeiro: 0, rodada: 1, turno: 0, vento: null,
    fase: 'inicio', eventos: [], registro: [], historico: [], lances: [], dropoutsPendentes: {}, resultado: null, simulacao,
  };
  estadoMotor.layers.forEach((camada, c) => {
    mao.camadas.push(camada.map((_, p) => {
      const neuronio = { id: idDoNeuronio(c, p), camada: c, posicao: p, cartas: [], revelado: false, dono: -1, removido: false, conhecido: false, rodadaRevelada: 0 };
      mao.neuronios[neuronio.id] = neuronio;
      return neuronio;
    }));
  });
  return atualizarVisao(mao);
}

/**
 * Limites que cada baralho impõe à mesa (issue #130). O Yin-yang só tem Ás e 2: com mais de um
 * baralho ou com a arquitetura longa, faltariam cartas distintas para montar a rede. Por isso ele
 * só joga com 1 baralho e a arquitetura curta.
 * TEMPORÁRIO: sai quando existirem os coringas, que completam o Yin-yang em qualquer mesa.
 * O aviso na tela e a trava dos campos do menu são da issue #131 (fora do núcleo).
 */
export const LIMITES_DO_BARALHO = {
  yinyang: { baralhos: 1, arquitetura: 'curta' },
};

/**
 * Devolve uma cópia da configuração (ou das opções do menu: `baralho`, `baralhos`, `arquitetura`)
 * com os `LIMITES_DO_BARALHO` aplicados. Os outros baralhos passam sem mudança. Toda criação de
 * partida passa por aqui, dentro de `novaMao`: partida local, sorteio, sala online (cada aparelho
 * monta a mesa com as opções da sala) e tutorial. As opções salvas do menu não são alteradas, para
 * que trocar de baralho depois não deixe a arquitetura ou a quantidade de baralhos "presas".
 * @param {{baralho?: string, baralhos?: number, arquitetura?: string}} config
 */
export function normalizarConfiguracao(config) {
  const limites = LIMITES_DO_BARALHO[config && config.baralho];
  return limites ? { ...config, ...limites } : { ...config };
}

/**
 * Cria uma mão nova: o motor embaralha, monta a mesa, distribui as cartas e separa o limbo.
 * @param {object} opcoes
 * @param {string} [opcoes.baralho='classico']
 * @param {string} [opcoes.terreno='neutro']
 * @param {string} [opcoes.inicio='revela-descarta']
 * @param {string} [opcoes.arquitetura='padrao'] Uma das `ARQUITETURAS` (padrão, curta, larga, profunda).
 * @param {number} [opcoes.baralhos=1] Quantos baralhos: a mão e o limbo crescem junto (5 e 10 cartas por baralho).
 * @param {number} [opcoes.semente] Para partidas reproduzíveis.
 * @param {{nome:string, tipo?:string, oponente?:string}[]} opcoes.jogadores De 2 a 5.
 */
export function novaMao(opcoes) {
  const config = normalizarConfiguracao({
    baralho: opcoes.baralho || 'classico', terreno: opcoes.terreno || 'neutro', inicio: opcoes.inicio || 'revela-descarta',
    arquitetura: opcoes.arquitetura || 'padrao', baralhos: Math.max(1, Math.min(4, Number(opcoes.baralhos) || 1)),
  });
  if (!BARALHO_MOTOR[config.baralho]) throw new Error('Baralho desconhecido: ' + config.baralho);
  if (!TERRENO_MOTOR[config.terreno]) throw new Error('Terreno desconhecido: ' + config.terreno);
  if (!INICIO_MOTOR[config.inicio]) throw new Error('Forma de início desconhecida: ' + config.inicio);
  if (!ARQUITETURAS[config.arquitetura]) throw new Error('Arquitetura desconhecida: ' + config.arquitetura);
  const n = opcoes.jogadores.length;
  if (n < 2 || n > motor.MAX_PLAYERS) throw new Error('A mesa aceita de 2 a ' + motor.MAX_PLAYERS + ' jogadores');
  const semente = opcoes.semente != null ? opcoes.semente | 0 : sementeNova();
  const estadoMotor = motor.newGame({
    deck: BARALHO_MOTOR[config.baralho], terrain: TERRENO_MOTOR[config.terreno], firstRule: INICIO_MOTOR[config.inicio],
    seed: semente, players: n, copies: config.baralhos, layers: tamanhosDaMesa(config.arquitetura, n),
  });
  const mao = montar(estadoMotor, config, opcoes.jogadores.map(novoJogador), false);
  mao.semente = semente;
  if (mao.fase === 'jogo') emitir(mao, { tipo: 'inicio', jogador: mao.primeiro, como: 'sorteio' });
  anotarHistorico(mao);
  return mao;
}

/**
 * Cópia leve da mão para simulações (sem eventos, textos ou histórico).
 * @param {object} mao
 * @param {object} [estadoMotor] Estado do motor a usar na cópia (por padrão, um clone do estado da mão).
 * @returns {object}
 */
export function copiarMao(mao, estadoMotor = motor.cloneState(mao.estadoMotor)) {
  const jogadores = mao.jogadores.map((j) => ({ ...j, estatisticas: { ...j.estatisticas } }));
  return montar(estadoMotor, mao.config, jogadores, true, mao.indiceDeCartas);
}

/**
 * Refaz a visão da interface a partir do estado do motor (`mao.estadoMotor`). É chamada depois de cada
 * jogada; ferramentas e testes que mexem direto em `mao.estadoMotor` também precisam chamá-la.
 * @returns {object} a própria mão
 */
export function atualizarVisao(mao) {
  const estadoMotor = mao.estadoMotor;
  const carta = (c) => mao.indiceDeCartas.tt.get(c.id);
  mao.vez = estadoMotor.turn;
  mao.primeiro = estadoMotor.firstPlayer;
  mao.rodada = estadoMotor.round + 1;
  mao.turno = estadoMotor.turnCount;
  mao.vento = estadoMotor.terrainData.wind ? naipeParaTT(estadoMotor.terrainData.wind) : null;
  mao.fase = estadoMotor.over ? 'fim' : estadoMotor.phase === 'reveal' ? 'inicio' : 'jogo';
  estadoMotor.layers.forEach((camada, c) => camada.forEach((slot, p) => {
    const n = mao.camadas[c][p];
    const revelado = slot.revealed && !slot.removed;
    if (revelado && !n.revelado) n.rodadaRevelada = mao.rodada;
    n.removido = slot.removed;
    n.cartas = slot.removed ? [] : [slot.card, ...slot.stack].map(carta);
    n.revelado = revelado;
    n.conhecido = revelado;
    n.dono = slot.owner === null ? -1 : slot.owner;
  }));
  mao.jogadores.forEach((jogador, j) => {
    const rede = estadoMotor.nets[j];
    jogador.mao = estadoMotor.hands[j].map(carta);
    jogador.caminho = rede.path.map((r) => idDoNeuronio(r.layer, r.slotIndex));
    jogador.situacao = situacaoDaRede(rede);
    jogador.dropouts = rede.dropouts;
    jogador.transferUsado = estadoMotor.transferUsed[j];
    jogador.cartaInicial = estadoMotor.reveal[j] != null ? mao.indiceDeCartas.tt.get(estadoMotor.reveal[j]) : null;
  });
  mao.limbo = estadoMotor.limbo.map(carta);
  mao.cemiterio = estadoMotor.graveyard.map(carta);
  return mao;
}

/* ======================================================================== avisos */

/** Coloca um evento na fila da interface (ignorado em simulação). */
function emitir(mao, evento) {
  if (!mao.simulacao) mao.eventos.push(evento);
}

/** Acrescenta uma linha ao registro de jogadas (ignorado em simulação). */
function anotar(mao, texto) {
  if (!mao.simulacao) mao.registro.push(texto);
}

/** Soma atual da rede de cada jogador, pelo motor. */
function somas(mao) {
  return mao.jogadores.map((_, j) => motor.score(mao.estadoMotor, j).total);
}

/** Guarda um lance da mão para as conquistas (ignorado em simulação). Devolve o lance. */
function lance(mao, dados) {
  const l = { camada: -1, alvo: -1, proprio: false, cartas: 0, consomeVez: true, ...dados };
  if (!mao.simulacao) mao.lances.push(l);
  return l;
}

/** Guarda a soma atual de cada rede para a curva de treino. */
function anotarHistorico(mao) {
  if (!mao.simulacao) mao.historico.push(somas(mao));
}

/* ======================================================================== consultas */

/** Total de camadas da mesa desta mão. */
export function totalDeCamadas(mao) { return mao.camadas.length; }

/** Último neurônio do caminho do jogador (a "fronteira"), ou null. */
export function fronteira(mao, j) {
  const caminho = mao.jogadores[j].caminho;
  return caminho.length ? mao.neuronios[caminho[caminho.length - 1]] : null;
}

/** Neurônios livres que o jogador pode ativar na próxima camada da sua rede. */
export function alvosDeAtivacao(mao, j) {
  const jogador = mao.jogadores[j];
  if (jogador.situacao !== 'construindo') return [];
  const proxima = jogador.caminho.length;
  if (proxima >= mao.camadas.length) return [];
  return mao.camadas[proxima].filter((n) => !n.removido && n.dono === -1);
}

/** Neurônios que aceitam cartas empilhadas: a fronteira oculta das redes ainda em construção. */
export function alvosDeEmpilhamento(mao) {
  const alvos = [];
  mao.jogadores.forEach((jogador, j) => {
    if (jogador.situacao !== 'construindo') return;
    const f = fronteira(mao, j);
    if (f && ehOculta(f.camada, mao.camadas.length) && f.cartas.length < 4) alvos.push(f);
  });
  return alvos;
}

/**
 * Efeito de empilhar `n` cartas no neurônio, pelo tamanho final da pilha:
 * 2 = tunagem (própria) ou overfit (adversário); 3 = early stop; 4 = stack overflow.
 * @returns {{tipo: string, proprio: boolean} | null}
 */
export function efeitoDoEmpilhamento(mao, j, neuronio, n) {
  const tamanho = neuronio.cartas.length + n;
  const proprio = neuronio.dono === j;
  if (tamanho === 2) return { tipo: proprio ? 'tunagem' : 'overfit', proprio };
  if (tamanho === 3) return { tipo: 'earlystop', proprio };
  if (tamanho === 4) return { tipo: 'stackoverflow', proprio };
  return null;
}

/** Diz se o jogador pode empilhar essas cartas da mão nesse neurônio (quem decide é o motor). */
export function podeEmpilhar(mao, j, idNeuronio, idsCartas) {
  if (mao.fase !== 'jogo' || mao.vez !== j || !idsCartas.length) return false;
  try {
    return motor.validate(mao.estadoMotor, j, jogadaParaMotor(mao, { tipo: 'empilhar', jogador: j, neuronio: idNeuronio, cartas: idsCartas })) === true;
  } catch (erro) {
    return false;
  }
}

/** Quantas camadas ocultas o jogador pode desfazer com dropout. */
export function camadasDesfaziveis(mao, j) {
  const jogador = mao.jogadores[j];
  if (jogador.situacao !== 'construindo' || jogador.caminho.length < 2) return 0;
  return jogador.caminho.length - 1;
}

/** Valor que o jogador tem quatro vezes na mão (para transfer learning), ou null. */
export function valorParaTransfer(mao, j) {
  const jogador = mao.jogadores[j];
  if (jogador.transferUsado) return null;
  const conta = {};
  for (const c of jogador.mao) conta[c.valor] = (conta[c.valor] || 0) + 1;
  for (const valor in conta) if (conta[valor] >= 4) return valor;
  return null;
}

/**
 * Passar a vez: só quem teve a rede interrompida por early stop e ainda tem cartas (atacar não é
 * obrigatório), ou quem não tem nenhuma outra jogada que gaste a vez.
 */
export function podePassar(mao, j) {
  return mao.fase === 'jogo' && mao.vez === j && motor.canPass(mao.estadoMotor, j);
}

/**
 * Lista as jogadas legais do jogador, geradas pelo motor.
 * @param {object} mao
 * @param {number} j
 * @param {{comDropout?: boolean}} [opcoes] `comDropout` inclui dropouts baratos (usado pelos oponentes).
 */
export function jogadasLegais(mao, j, opcoes = {}) {
  if (mao.fase === 'fim' || (mao.fase === 'jogo' && mao.vez !== j)) return [];
  return motor.legalMoves(mao.estadoMotor, j, { maxDropout: 2 })
    .filter((m) => opcoes.comDropout || m.type !== 'dropout')
    .map((m) => jogadaParaTT(mao, j, m));
}

/* ======================================================================== tradução de jogadas */

/** Ids do motor das cartas da mão do jogador, a partir dos ids da interface. */
function idsNoMotor(mao, j, ids) {
  if (!Array.isArray(ids)) throw new Error('Jogada sem cartas');
  const naMao = new Set(mao.estadoMotor.hands[j].map((c) => c.id));
  return ids.map((id) => {
    const idMotor = mao.indiceDeCartas.estadoMotor.get(id);
    if (idMotor === undefined || !naMao.has(idMotor)) throw new Error('Carta fora da mão: ' + id);
    return idMotor;
  });
}

/**
 * Traduz uma jogada da interface para um movimento do motor. Lança erro se a jogada estiver
 * malformada; a validade pelas regras é conferida pelo motor.
 */
export function jogadaParaMotor(mao, jogada) {
  const j = jogada.jogador, estadoMotor = mao.estadoMotor;
  switch (jogada.tipo) {
    case 'inicio':
      return { type: 'reveal', cardId: idsNoMotor(mao, j, [jogada.carta])[0] };
    case 'ativar': {
      const lugar = lugarDoNeuronio(jogada.neuronio);
      if (!lugar || lugar.camada !== estadoMotor.nets[j].path.length) throw new Error('Neurônio indisponível');
      return { type: 'advance', slotIndex: lugar.posicao };
    }
    case 'empilhar': {
      const alvo = mao.neuronios[jogada.neuronio];
      /* as ações só valem no último neurônio da rede de alguém */
      if (!alvo || alvo.dono < 0 || fronteira(mao, alvo.dono) !== alvo) throw new Error('Empilhamento inválido');
      const cardIds = idsNoMotor(mao, j, jogada.cartas);
      if (alvo.dono === j) return { type: 'tune', cardIds };
      const type = ATAQUE_PELO_TAMANHO[alvo.cartas.length + cardIds.length];
      if (!type) throw new Error('Empilhamento inválido');
      return { type, cardIds, target: alvo.dono };
    }
    case 'dropout':
      return { type: 'dropout', layers: jogada.n, cardIds: idsNoMotor(mao, j, jogada.pagamento) };
    case 'transfer': {
      const cardIds = idsNoMotor(mao, j, jogada.cartas);
      if (cardIds.length !== 4) throw new Error('Transfer learning indisponível');
      return { type: 'transfer', rank: estadoMotor.hands[j].find((c) => c.id === cardIds[0]).rank };
    }
    case 'passar':
      return { type: 'pass' };
    default:
      throw new Error('Jogada desconhecida: ' + jogada.tipo);
  }
}

/** Traduz um movimento do motor (de `legalMoves` ou dos bots) para uma jogada da interface. */
export function jogadaParaTT(mao, j, movimento) {
  const estadoMotor = mao.estadoMotor;
  const ids = (cardIds) => cardIds.map((id) => mao.indiceDeCartas.tt.get(id).id);
  const ultimo = (p) => { const s = motor.lastSlot(estadoMotor, p); return idDoNeuronio(s.layer, s.slotIndex); };
  switch (movimento.type) {
    case 'reveal': return { tipo: 'inicio', jogador: j, carta: ids([movimento.cardId])[0] };
    case 'advance': return { tipo: 'ativar', jogador: j, neuronio: idDoNeuronio(estadoMotor.nets[j].path.length, movimento.slotIndex) };
    case 'tune': return { tipo: 'empilhar', jogador: j, neuronio: ultimo(j), cartas: ids(movimento.cardIds) };
    case 'overfit': case 'earlystop': case 'stackoverflow':
      return { tipo: 'empilhar', jogador: j, neuronio: ultimo(motor.attackTarget(estadoMotor, j, movimento)), cartas: ids(movimento.cardIds) };
    case 'dropout': return { tipo: 'dropout', jogador: j, n: movimento.layers, pagamento: ids(movimento.cardIds) };
    case 'transfer': return { tipo: 'transfer', jogador: j, cartas: ids(estadoMotor.hands[j].filter((c) => c.rank === movimento.rank).slice(0, 4).map((c) => c.id)) };
    case 'pass': return { tipo: 'passar', jogador: j };
    default: throw new Error('Movimento desconhecido do motor: ' + movimento.type);
  }
}

/* ======================================================================== aplicação de jogadas */

/** Mensagem de erro de cada tipo de jogada recusada pelo motor. */
const RECUSA = {
  inicio: 'Carta inicial inválida',
  ativar: 'Neurônio indisponível',
  empilhar: 'Empilhamento inválido',
  dropout: 'Dropout inválido',
  transfer: 'Transfer learning indisponível',
  passar: 'Só passa a vez quem teve a rede interrompida por early stop ou não tem outra jogada',
};

/** Depois que todos revelaram a carta: quem começa. */
function anunciarInicio(mao) {
  const estadoMotor = mao.estadoMotor;
  const entrada = estadoMotor.log.find((e) => e.type === 'first') || {};
  const cartas = mao.jogadores.map((j) => j.cartaInicial);
  emitir(mao, { tipo: 'inicio', jogador: mao.primeiro, como: 'revela', cartas, empate: !!entrada.tie, descarta: mao.config.inicio === 'revela-descarta' });
  anotar(mao, mao.jogadores[mao.primeiro].nome + ' começa' + (entrada.tie ? ' (empate decidido no sorteio)' : '') + '.');
}

/** Efeitos de uma ativação: evento, registro e, na camada de saída, a rede completa. */
function narrarAtivacao(mao, jogada) {
  const j = jogada.jogador, jogador = mao.jogadores[j], neuronio = mao.neuronios[jogada.neuronio];
  jogador.estatisticas.ativacoes++;
  emitir(mao, { tipo: 'ativacao', jogador: j, neuronio: neuronio.id, carta: neuronio.cartas[0] });
  anotar(mao, jogador.nome + ' ativou ' + rotuloCarta(neuronio.cartas[0]) + ' na camada ' + nomeCamada(neuronio.camada, mao.camadas.length) + '.');
  if (jogador.situacao === 'concluida') {
    emitir(mao, { tipo: 'completa', jogador: j });
    anotar(mao, jogador.nome + ' chegou à camada de saída!');
  }
}

/** Efeitos de um empilhamento: tunagem, overfit, early stop ou stack overflow. */
function narrarEmpilhamento(mao, jogada, antes) {
  const j = jogada.jogador, jogador = mao.jogadores[j];
  const { efeito, dono, jogadas, pilha, maoDaVitima, somaAntes } = antes;
  const vitima = mao.jogadores[dono];
  jogador.acoesUsadas++;
  if (efeito.tipo === 'tunagem') {
    jogador.estatisticas.tunagens++;
    const ganho = motor.score(mao.estadoMotor, j).total - somaAntes;
    emitir(mao, { tipo: 'tunagem', jogador: j, dono, neuronio: jogada.neuronio, cartas: jogadas, ganho });
    anotar(mao, jogador.nome + ' tunou ' + rotuloCarta(pilha[0]) + ' com ' + jogadas.map(rotuloCarta).join(' ') + '.');
    return;
  }
  /* o neurônio atingido vai inteiro para o cemitério e a rede da vítima recua uma camada */
  const removidas = pilha.concat(jogadas);
  vitima.estatisticas.sofridos++;
  if (efeito.proprio) jogador.estatisticas.autoParadas++;
  if (efeito.tipo === 'overfit') {
    jogador.estatisticas.overfits++;
    anotar(mao, jogador.nome + ' aplicou OVERFIT em ' + rotuloCarta(removidas[0]) + ' de ' + vitima.nome + '.');
  } else if (efeito.tipo === 'earlystop') {
    if (!efeito.proprio) jogador.estatisticas.earlyStops++;
    anotar(mao, jogador.nome + ' aplicou EARLY STOP' + (efeito.proprio ? ' na própria rede' : ' em ' + vitima.nome) + '.');
  } else {
    if (!efeito.proprio) jogador.estatisticas.overflows++;
    anotar(mao, 'STACK OVERFLOW! ' + vitima.nome + ' perdeu a rede e ' + maoDaVitima + ' carta(s) da mão.');
  }
  emitir(mao, { tipo: efeito.tipo, jogador: j, dono, neuronio: jogada.neuronio, cartas: removidas, proprio: efeito.proprio });
}

/** Lance de uma ativação; se vinha de um dropout, diz se o neurônio novo vale mais que o desfeito. */
function guardarAtivacao(mao, jogada) {
  if (mao.simulacao) return;
  const j = jogada.jogador, neuronio = mao.neuronios[jogada.neuronio];
  const item = motor.score(mao.estadoMotor, j).items[neuronio.camada];
  const valor = item ? item.subtotal : 0;
  lance(mao, { tipo: 'ativar', jogador: j, camada: neuronio.camada, alvo: j, valor });
  const pendente = mao.dropoutsPendentes[j];
  if (pendente && pendente.camada === neuronio.camada) pendente.lance.revelouMaior = valor > pendente.valor;
  delete mao.dropoutsPendentes[j];
}

/** Lance de uma tunagem ou de um ataque (overfit, early stop ou stack overflow, no outro ou em si). */
function guardarEmpilhamento(mao, jogada, antes) {
  if (mao.simulacao || !antes.efeito) return;
  const { efeito, dono, jogadas } = antes;
  lance(mao, {
    tipo: efeito.tipo, jogador: jogada.jogador, alvo: dono,
    camada: mao.neuronios[jogada.neuronio].camada, proprio: efeito.proprio, cartas: jogadas.length,
  });
}

/** Lance de um dropout, que fica pendente até o jogador ativar um neurônio no lugar do desfeito. */
function guardarDropout(mao, jogada, antes) {
  if (mao.simulacao) return;
  const j = jogada.jogador;
  const camadas = antes.desfeitos.map((id) => mao.neuronios[id].camada).sort((a, b) => a - b);
  const l = lance(mao, { tipo: 'dropout', jogador: j, alvo: j, camada: camadas[0], camadas, cartas: jogada.n, consomeVez: false, revelouMaior: false });
  mao.dropoutsPendentes[j] = { lance: l, camada: camadas[0], valor: antes.valores[camadas[0]] };
}

/** Fim da mão: resultado no formato da interface. */
function encerrar(mao) {
  const estadoMotor = mao.estadoMotor;
  const [a, b] = estadoMotor.ranking;
  const n = Math.min(estadoMotor.hands[a].length, estadoMotor.hands[b].length);
  mao.resultado = {
    somas: estadoMotor.scores.slice(), vencedor: estadoMotor.winner, motivo: motivoDaVitoria(estadoMotor.tiebreak, n),
    travados: estadoMotor.nets.map((rede) => rede.reason === 'stuck'),
  };
  emitir(mao, { tipo: 'fim', resultado: mao.resultado });
  anotar(mao, 'Fim da mão: ' + mao.jogadores[estadoMotor.winner].nome + ' vence (' + mao.resultado.motivo + ').');
}

/**
 * Encerra a mão agora, com as redes como estão: o motor apura o vencedor pelos desempates.
 * Serve para o limite de jogadas das simulações e para testes que montam a situação final.
 * @returns {object} a própria mão
 */
export function finalizarMao(mao) {
  if (mao.fase === 'fim' && mao.resultado) return mao;
  motor.endGame(mao.estadoMotor);
  atualizarVisao(mao);
  encerrar(mao);
  return mao;
}

/**
 * Aplica uma jogada: traduz, entrega ao motor e refaz a visão. Lança erro se a jogada for inválida
 * (o estado não muda nesse caso).
 * @param {object} mao
 * @param {object} jogada Ver tipos no topo do arquivo.
 * @returns {object} a própria mão
 */
export function aplicarJogada(mao, jogada) {
  const estadoMotor = mao.estadoMotor, j = jogada.jogador, jogador = mao.jogadores[j];
  if (!jogador) throw new Error('Jogador inexistente: ' + j);
  if (jogada.tipo === 'inicio') {
    if (mao.fase !== 'inicio') throw new Error('A mão já começou');
  } else {
    if (mao.fase !== 'jogo') throw new Error('A mão não está em andamento');
    if (mao.vez !== j) throw new Error('Não é a vez de ' + jogador.nome);
  }
  if (!RECUSA[jogada.tipo]) throw new Error('Jogada desconhecida: ' + jogada.tipo);

  /* o que a narração precisa saber de antes da jogada */
  const carta = (id) => jogador.mao.find((c) => c.id === id);
  const antes = { rodada: estadoMotor.round, linhas: estadoMotor.log.length, finalizadas: estadoMotor.nets.map((rede) => rede.finished) };
  if (jogada.tipo === 'empilhar') {
    const alvo = mao.neuronios[jogada.neuronio];
    if (alvo && alvo.dono >= 0 && Array.isArray(jogada.cartas)) {
      Object.assign(antes, {
        efeito: efeitoDoEmpilhamento(mao, j, alvo, jogada.cartas.length), dono: alvo.dono, pilha: alvo.cartas.slice(),
        jogadas: jogada.cartas.map(carta), maoDaVitima: mao.jogadores[alvo.dono].mao.length, somaAntes: mao.simulacao ? 0 : motor.score(estadoMotor, j).total,
      });
    }
  } else if (jogada.tipo === 'dropout') {
    antes.pagas = (jogada.pagamento || []).map(carta);
    antes.desfeitos = jogador.caminho.slice(-jogada.n).reverse();
    /* pontos de cada neurônio da rede antes do dropout, para comparar com o que entra no lugar (conquistas) */
    if (!mao.simulacao) antes.valores = motor.score(estadoMotor, j).items.map((item) => item.subtotal);
  } else if (jogada.tipo === 'transfer') {
    antes.saem = (jogada.cartas || []).map(carta);
    antes.maoAntes = jogador.mao.length;
  }

  let movimento;
  try {
    movimento = jogadaParaMotor(mao, jogada);
    motor.applyMove(estadoMotor, j, movimento);
  } catch (erro) {
    throw new Error(/^(Carta fora|Jogada)/.test(erro.message) ? erro.message : RECUSA[jogada.tipo]);
  }
  atualizarVisao(mao);

  switch (jogada.tipo) {
    case 'inicio':
      if (mao.fase !== 'inicio') anunciarInicio(mao);
      return mao;
    case 'ativar': narrarAtivacao(mao, jogada); guardarAtivacao(mao, jogada); break;
    case 'empilhar': narrarEmpilhamento(mao, jogada, antes); guardarEmpilhamento(mao, jogada, antes); break;
    case 'dropout':
      guardarDropout(mao, jogada, antes);
      jogador.acoesUsadas++;
      emitir(mao, { tipo: 'dropout', jogador: j, neuronios: antes.desfeitos, pagas: antes.pagas });
      anotar(mao, jogador.nome + ' fez dropout (GatoNet) de ' + jogada.n + ' camada(s): os neurônios foram para o cemitério.');
      break;
    case 'transfer': {
      const entram = jogador.mao.length - (antes.maoAntes - 4);
      jogador.acoesUsadas++;
      jogador.estatisticas.transfer++;
      lance(mao, { tipo: 'transfer', jogador: j, cartas: 4, consomeVez: false });
      emitir(mao, { tipo: 'transfer', jogador: j, saem: antes.saem, entram });
      anotar(mao, jogador.nome + ' fez TRANSFER LEARNING: trocou quatro ' + antes.saem[0].valor + ' por ' + entram + ' carta(s) do limbo.');
      break;
    }
    case 'passar':
      lance(mao, { tipo: 'passar', jogador: j });
      emitir(mao, { tipo: 'passe', jogador: j });
      anotar(mao, jogador.nome + ' passou a vez.');
      break;
  }

  /* acontecimentos que o motor decide sozinho depois da jogada */
  if (!mao.simulacao) {
    for (const entrada of estadoMotor.log.slice(antes.linhas)) if (entrada.type === 'deck') emitir(mao, { tipo: 'powerbi', jogador: entrada.p });
  }
  mao.jogadores.forEach((outro, i) => {
    if (outro.situacao !== 'travada' || antes.finalizadas[i]) return;
    lance(mao, { tipo: 'travada', jogador: i, camada: outro.caminho.length, consomeVez: false });
    emitir(mao, { tipo: 'travada', jogador: i, camada: outro.caminho.length });
    anotar(mao, outro.nome + ' ficou sem neurônio livre na camada ' + nomeCamada(outro.caminho.length, mao.camadas.length) + ': a rede foi finalizada.');
  });
  if (mao.config.terreno === 'oceano' && estadoMotor.round > antes.rodada && mao.fase === 'jogo') emitir(mao, { tipo: 'vento', naipe: mao.vento });
  anotarHistorico(mao);
  if (mao.fase === 'fim') encerrar(mao);
  return mao;
}
