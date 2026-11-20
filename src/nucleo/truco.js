/**
 * @file Camada de truco: a partida vale tentos e cada mão pode ser trucada.
 *
 * TRUCO! (3) → SEIS! (6) → NOVE! (9) → DOZE! (12). Quem corre entrega o valor atual.
 * Mão de onze: com alguém a um tento da vitória, ninguém pode trucar.
 *
 * Estado da partida: `{ alvo, tentos: [n, n, …], numeroMao, valor, aumentadoPor, pedido, encerrada, vencedor }`.
 * `pedido` é `{ por, para }` enquanto um truco espera resposta.
 *
 * O truco é de um contra um: com mais de 2 jogadores a partida continua valendo tentos (cada mão
 * vale 1 para quem vence), mas ninguém pode trucar.
 */

/** Valores possíveis de uma mão. */
export const ESCADA_TRUCO = [1, 3, 6, 9, 12];

/** O que se grita ao pedir cada valor. */
export const GRITO_TRUCO = { 3: 'TRUCO!', 6: 'SEIS!', 9: 'NOVE!', 12: 'DOZE!' };

/**
 * Cria uma partida.
 * @param {number} alvo Tentos para vencer (1 = mão única, sem truco).
 * @param {number} [jogadores=2] Com mais de 2 jogadores não há truco.
 */
export function novaPartida(alvo, jogadores = 2) {
  return { alvo, tentos: new Array(jogadores).fill(0), numeroMao: 0, valor: 1, aumentadoPor: -1, pedido: null, encerrada: false, vencedor: -1 };
}

/** A partida aceita pedidos de truco (só entre 2 jogadores e valendo mais de uma mão)? */
export function temTruco(partida) {
  return partida.alvo > 1 && partida.tentos.length === 2;
}

/** Próximo degrau da escada a partir de `valor`, ou null no topo. */
export function proximoValor(valor) {
  const i = ESCADA_TRUCO.indexOf(valor);
  return i >= 0 && i < ESCADA_TRUCO.length - 1 ? ESCADA_TRUCO[i + 1] : null;
}

/** Mão de onze: alguém está a um tento da vitória. */
export function ehMaoDeOnze(partida) {
  return partida.alvo > 1 && partida.tentos.some((t) => t === partida.alvo - 1);
}

/** Diz se o jogador pode pedir truco agora (quem aumentou por último não aumenta de novo). */
export function podeTrucar(partida, j) {
  if (partida.encerrada || !temTruco(partida) || partida.pedido) return false;
  if (partida.aumentadoPor === j) return false;
  if (ehMaoDeOnze(partida)) return false;
  return proximoValor(partida.valor) != null;
}

/** Registra um pedido de truco. Devolve falso se não for permitido. */
export function pedirTruco(partida, j) {
  if (!podeTrucar(partida, j)) return false;
  partida.pedido = { por: j, para: proximoValor(partida.valor) };
  return true;
}

/**
 * Responde ao pedido pendente.
 * @param {'aceitar'|'correr'|'aumentar'} resposta
 * @returns {{maoEncerrada: boolean, vencedor?: number, pontos?: number} | null}
 */
export function responderTruco(partida, j, resposta) {
  const pedido = partida.pedido;
  if (!pedido) return null;
  if (resposta === 'correr') {
    partida.pedido = null;
    return { maoEncerrada: true, vencedor: pedido.por, pontos: partida.valor };
  }
  partida.valor = pedido.para;
  partida.aumentadoPor = pedido.por;
  partida.pedido = null;
  if (resposta === 'aumentar') {
    const proximo = proximoValor(partida.valor);
    if (proximo) partida.pedido = { por: j, para: proximo };
  }
  return { maoEncerrada: false };
}

/** Soma os tentos da mão ao vencedor e encerra a partida se ele chegou ao alvo. Devolve os tentos ganhos. */
export function marcarTentos(partida, vencedor, pontos) {
  const ganho = pontos != null ? pontos : partida.valor;
  partida.tentos[vencedor] = Math.min(partida.alvo, partida.tentos[vencedor] + ganho);
  if (partida.tentos[vencedor] >= partida.alvo) { partida.encerrada = true; partida.vencedor = vencedor; }
  return ganho;
}

/** Prepara a próxima mão da partida. */
export function proximaMao(partida) {
  partida.numeroMao++;
  partida.valor = 1;
  partida.aumentadoPor = -1;
  partida.pedido = null;
}
