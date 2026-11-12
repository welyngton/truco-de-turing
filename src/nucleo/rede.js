/**
 * @file Arquitetura da rede neural montada na mesa.
 *
 * Na arquitetura padrão, a camada 0 é a entrada (3 neurônios), 1 a 5 são ocultas (5 cada) e 6 é a
 * saída (4). As arquiteturas do NeuroDeck (curta, larga, profunda) mudam o número e o tamanho das
 * camadas; com mais de 2 jogadores, cada camada ganha um neurônio por jogador a mais (ver
 * `tamanhosDaMesa`). Por isso as funções abaixo recebem o total de camadas da mesa em uso.
 * Cada jogador recebe `TAMANHO_MAO` cartas por baralho; o que sobra vai para o limbo.
 */
import { ARCHITECTURES, scaleLayers } from '../motor/engine.js';

/** Neurônios por camada da arquitetura padrão, da entrada à saída. */
export const TAMANHOS_CAMADAS = [3, 5, 5, 5, 5, 5, 4];

/** Arquiteturas oferecidas no menu (as do NeuroDeck), com o nome para a interface. */
export const ARQUITETURAS = Object.fromEntries(Object.entries(ARCHITECTURES).map(([id, a]) => [id, { nome: a.name, camadas: a.layers.slice() }]));

/**
 * Tamanho de cada camada da mesa para a arquitetura e o número de jogadores: com mais de 2
 * jogadores, cada camada ganha um neurônio por jogador a mais (regra do NeuroDeck).
 * @param {string} [arquitetura='padrao']
 * @param {number} [jogadores=2]
 * @returns {number[]}
 */
export function tamanhosDaMesa(arquitetura = 'padrao', jogadores = 2) {
  const base = ARQUITETURAS[arquitetura];
  if (!base) throw new Error('Arquitetura desconhecida: ' + arquitetura);
  return scaleLayers(base.camadas, jogadores);
}

/** Quantidade de camadas (7). */
export const TOTAL_CAMADAS = TAMANHOS_CAMADAS.length;

/** Índice da camada de saída (6). */
export const CAMADA_SAIDA = TOTAL_CAMADAS - 1;

/** Cartas na mão de cada jogador no início. */
export const TAMANHO_MAO = 5;

/**
 * Diz se a camada é oculta (só nelas valem as ações com cartas).
 * @param {number} camada
 * @param {number} [total] Total de camadas da mesa (padrão: 7).
 */
export function ehOculta(camada, total = TOTAL_CAMADAS) {
  return camada > 0 && camada < total - 1;
}

/**
 * Nome da camada para a interface: 'Entrada', 'Oculta 3', 'Saída'.
 * @param {number} camada
 * @param {number} [total] Total de camadas da mesa (padrão: 7).
 */
export function nomeCamada(camada, total = TOTAL_CAMADAS) {
  if (camada === 0) return 'Entrada';
  if (camada === total - 1) return 'Saída';
  return 'Oculta ' + camada;
}
