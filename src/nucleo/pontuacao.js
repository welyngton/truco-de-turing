/**
 * @file Soma da rede de um jogador (o "forward pass" do jogo), calculada pelo motor do NeuroDeck.
 *
 * Regras da fusão (ver `src/motor/engine/decks.js`):
 *  - 2 a 10 valem o número, Ás 11, figuras 0;
 *  - figuras iguais em camadas vizinhas formam uma sequência, e a figura empilhada por tunagem
 *    conta nela. Cada figura da sequência vale 10: par 20, trio 30; quadra zera a rede (vanishing
 *    gradient);
 *  - tunagem de carta numérica soma o valor da carta empilhada.
 *
 * Exemplo do enunciado: "8-K-K-3" com tunagem num K tem três Reis (trio), logo 8 + 30 + 3 = 41.
 *
 * Este arquivo só reorganiza o resultado do motor no formato que as telas usam: os pontos de cada
 * neurônio, e as sequências de figuras ("combos") à parte, de modo que a soma dos neurônios mais
 * a soma dos combos dá o total.
 */
import * as ND from '../motor/engine.js';
import { ehFigura, PLURAL_FIGURA } from './cartas.js';
import { BARALHOS, pontosDaCarta } from './baralhos.js';
import { idDoNeuronio } from './traducao.js';

/**
 * @typedef {object} NeuronioPontuado
 * @property {object} neuronio  O neurônio da mesa.
 * @property {number} camada    Posição no caminho (0 = entrada).
 * @property {object} carta     Carta de cima da pilha.
 * @property {number} pilha     Quantas cartas estão empilhadas.
 * @property {boolean} figura
 * @property {number} pontos    Pontos depois de terreno e baralho, fora o que vem das sequências de figuras.
 * @property {string[]} notas   Explicações exibidas na interface ("tunado ×2", "+3 altitude").
 */

/**
 * @typedef {object} Pontuacao
 * @property {number} total
 * @property {NeuronioPontuado[]} neuronios
 * @property {{de:number, ate:number, valor:string, quantidade:number, pontos:number, rotulo:string}[]} combos
 * @property {boolean} vanishing  Verdadeiro se uma quadra zerou a rede.
 * @property {boolean} [saturada] Backprop: saída abaixo de 20 depois das ativações (saturação, não vanishing).
 */

const arredondar = (x) => Math.round(x * 100) / 100;

/**
 * Calcula a soma da rede do jogador `j`.
 * @param {object} mao Estado da mão (ver partida.js).
 * @param {number} j Índice do jogador.
 * @returns {Pontuacao}
 */
export function pontuarRede(mao, j) {
  const resultado = ND.score(mao.nd, j);
  if (resultado.kind === 'forward') return pontuarForward(mao, resultado);
  /* no baralho de truco as figuras valem pontos próprios e não formam par nem trio */
  const figurasValem = !!BARALHOS[mao.config.baralho].figurasValem;
  const neuronios = resultado.items.map((item, camada) => {
    const carta = mao.indiceDeCartas.tt.get(item.card.id);
    const figura = ehFigura(carta), pilha = 1 + item.stack;
    const naSequencia = figura && !figurasValem;
    const notas = item.notes.filter((nota) => !/^(par|trio)\b/.test(nota));
    if (!naSequencia && pilha > 1) notas.unshift('tunado ×' + pilha);
    return {
      neuronio: mao.neuronios[idDoNeuronio(item.slot.layer, item.slot.slotIndex)], camada, carta, pilha, figura,
      pontos: naSequencia ? arredondar(item.subtotal - item.base - item.tune) : item.subtotal, notas,
    };
  });
  /* sequências de figuras iguais em camadas vizinhas, contando as empilhadas */
  const combos = [];
  for (let k = 0; k < neuronios.length; k++) {
    const inicio = k;
    if (!neuronios[k].figura) continue;
    while (k + 1 < neuronios.length && neuronios[k + 1].figura && neuronios[k + 1].carta.valor === neuronios[inicio].carta.valor) k++;
    let quantidade = 0, pontos = 0;
    for (let i = inicio; i <= k; i++) { quantidade += neuronios[i].pilha; pontos += resultado.items[i].base + resultado.items[i].tune; }
    const valor = neuronios[inicio].carta.valor;
    if (quantidade >= 4) combos.push({ de: inicio, ate: k, valor, quantidade, pontos: 0, rotulo: 'Quadra de ' + PLURAL_FIGURA[valor] + ': vanishing gradient' });
    else if (quantidade >= 2 && !figurasValem) combos.push({ de: inicio, ate: k, valor, quantidade, pontos, rotulo: (quantidade === 2 ? 'Par' : 'Trio') + ' de ' + PLURAL_FIGURA[valor] + ' +' + pontos });
  }
  return { total: resultado.total, neuronios, combos, vanishing: !!resultado.vanishing };
}

/** Número com vírgula decimal e no máximo 2 casas ("1,2", "23,45"). */
const decimal = (x) => String(arredondar(x)).replace('.', ',');

/** Rótulo do aviso do baralho Backprop (ver `pontuarForward`). */
export const ROTULO_SAIDA_SATURADA = 'Saída saturada depois das ativações';

/**
 * Baralho Backprop: a rede vale a ativação da saída. Cada neurônio mostra a ativação depois da
 * camada dele (`pontos`) e, nas notas, o peso do naipe, o viés e a função de ativação. Não há
 * combos de figuras.
 *
 * O motor marca (no campo `vanishing`, nome que vem do NeuroDeck) a rede de 3 ou mais neurônios
 * que passou por alguma ativação não linear e terminou abaixo de 20. Sigmoide e tanh do baralho
 * vão no máximo até 20, então isso é saturação da ativação no forward pass, e não vanishing
 * gradient, que acontece no backward e que este baralho não calcula. Aqui o aviso vira
 * `saturada`, e `vanishing` fica falso: nenhum texto do Backprop fala em vanishing gradient.
 */
function pontuarForward(mao, resultado) {
  const neuronios = resultado.items.map((item, camada) => {
    const carta = mao.indiceDeCartas.tt.get(item.card.id);
    const notas = [(camada ? 'w ' + decimal(item.w) + ' · ' : '') + 'b ' + decimal(item.bias) + ' · ' + item.fn];
    if (item.stack) notas.push('tunado ×' + (1 + item.stack));
    notas.push(...item.notes);
    return {
      neuronio: mao.neuronios[idDoNeuronio(item.slot.layer, item.slot.slotIndex)], camada, carta, pilha: 1 + item.stack,
      figura: ehFigura(carta), pontos: arredondar(item.a), notas,
    };
  });
  const saturada = !!resultado.vanishing && neuronios.length > 0;
  const combos = saturada
    ? [{ de: 0, ate: neuronios.length - 1, valor: '', quantidade: neuronios.length, pontos: 0, rotulo: ROTULO_SAIDA_SATURADA }]
    : [];
  return { total: resultado.total, neuronios, combos, vanishing: false, saturada };
}

/** Média de pontos de um conjunto de cartas. */
export function mediaDePontos(mao, cartas) {
  if (!cartas.length) return 0;
  let soma = 0;
  for (const c of cartas) soma += pontosDaCarta(c, mao.config.baralho);
  return soma / cartas.length;
}
