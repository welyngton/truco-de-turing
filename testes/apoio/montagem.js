/**
 * @file Montagem de situações para os testes: mãos, redes e finais escolhidos carta a carta.
 *
 * As regras são do motor do NeuroDeck, e a mão da interface é só uma visão do estado dele
 * (`mao.nd`, ver src/nucleo/partida.js). Por isso os testes não mexem na visão: estas funções
 * alteram o estado do motor e refazem a visão. Também rodam no navegador (testes de interface),
 * carregadas pela página como módulo.
 */
import { atualizarVisao, finalizarMao } from '../../src/nucleo/partida.js';
import { rankDoValor, cartaParaTT } from '../../src/nucleo/traducao.js';

const NAIPE_ND = { E: 'S', C: 'H', P: 'C', O: 'D' };

/**
 * Cria uma carta nova na partida, fora do baralho, e a registra no índice de cartas da mão.
 * @returns {object} a carta no formato do motor (`{ id, rank, suit }`)
 */
export function criarCarta(mao, valor, naipe = 'E') {
  const indice = mao.indiceDeCartas;
  indice.proximo = (indice.proximo || 100000) + 1;
  const carta = { id: indice.proximo, rank: rankDoValor(valor), suit: NAIPE_ND[naipe] };
  const visao = cartaParaTT(carta, true);
  indice.tt.set(carta.id, visao);
  indice.nd.set(visao.id, carta.id);
  return carta;
}

/** Lê uma carta escrita como 'K', 'KO' ou ['K', 'O'] (valor e naipe; o naipe padrão é espadas). */
function lerCarta(texto) {
  if (Array.isArray(texto)) return texto;
  const m = /^(10|[2-9AJQK])([ECPO])?$/.exec(texto);
  if (!m) throw new Error('carta inválida: ' + texto);
  return [m[1], m[2] || 'E'];
}

/**
 * Troca a mão do jogador `j` pelas cartas dadas.
 * @param {(string|string[])[]} cartas Ex.: ['KO', '3C'] ou [['K', 'O'], ['3', 'C']].
 * @returns {object[]} as cartas no formato da interface (para usar os ids nas jogadas)
 */
export function darMao(mao, j, cartas) {
  mao.nd.hands[j] = cartas.map((c) => criarCarta(mao, ...lerCarta(c)));
  atualizarVisao(mao);
  return mao.jogadores[j].mao;
}

/**
 * Monta a rede do jogador `j`: uma pilha por camada, a partir da entrada. Cada pilha é a carta do
 * neurônio seguida das cartas empilhadas por tunagem.
 * @param {(string|string[])[][]} pilhas Ex.: [['8'], ['K', 'KC'], ['K'], ['3']].
 */
export function montarRede(mao, j, pilhas) {
  const nd = mao.nd, rede = nd.nets[j];
  for (const r of rede.path) Object.assign(nd.layers[r.layer][r.slotIndex], { owner: null, revealed: false, stack: [] });
  rede.path = pilhas.map((pilha, camada) => {
    const slot = nd.layers[camada].find((s) => s.owner === null && !s.removed);
    const [carta, ...empilhadas] = pilha.map((c) => criarCarta(mao, ...lerCarta(c)));
    Object.assign(slot, { card: carta, stack: empilhadas, owner: j, revealed: true });
    return { layer: camada, slotIndex: slot.slotIndex };
  });
  return atualizarVisao(mao);
}

/** Dá a rede do jogador `j` por finalizada: 'output', 'earlystop', 'auto-earlystop', 'stackoverflow', 'stuck'… */
export function finalizarRede(mao, j, motivo = 'output') {
  Object.assign(mao.nd.nets[j], { finished: true, reason: motivo });
  return atualizarVisao(mao);
}

/** Reabre a rede do jogador `j` (desfaz um fim de rede), para continuar montando a situação. */
export function reabrirRede(mao, j) {
  Object.assign(mao.nd.nets[j], { finished: false, reason: null });
  return atualizarVisao(mao);
}

/** Ajusta dados soltos do estado: `{ dropouts: [a, b], primeiro, vez }`. */
export function ajustar(mao, { dropouts, primeiro, vez } = {}) {
  if (dropouts) dropouts.forEach((n, j) => { mao.nd.nets[j].dropouts = n; });
  if (primeiro != null) mao.nd.firstPlayer = primeiro;
  if (vez != null) mao.nd.turn = vez;
  return atualizarVisao(mao);
}

/** Tira da mesa os neurônios livres da camada (a camada fica sem neurônio para ativar). */
export function esvaziarCamada(mao, camada) {
  for (const slot of mao.nd.layers[camada]) if (slot.owner === null) slot.removed = true;
  return atualizarVisao(mao);
}

/** Encerra a mão agora e devolve o resultado (vencedor e motivo pelos desempates). */
export function encerrar(mao) {
  return finalizarMao(mao).resultado;
}
