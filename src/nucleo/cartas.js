/**
 * @file Cartas do baralho: valores, naipes e nomes.
 *
 * Uma carta é um objeto simples `{ id, valor, naipe }`:
 *  - `valor`: 'A', '2'…'10', 'J' (valete), 'Q' (dama) ou 'K' (rei);
 *  - `naipe`: 'E' (espadas), 'C' (copas), 'P' (paus) ou 'O' (ouros);
 *  - `id`: identificador único dentro da partida (ex.: 'KC', '2E#7').
 */

/** Valores do baralho, do Ás ao Rei. */
export const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Naipes na ordem de desempate da especificação: espadas > copas > paus > ouros. */
export const NAIPES = ['E', 'C', 'P', 'O'];

/** Dados de exibição de cada naipe. `emblema` é o desenho do naipe espanhol usado na arte. */
export const NAIPE = {
  E: { nome: 'Espadas', simbolo: '♠', vermelho: false, emblema: 'espada' },
  C: { nome: 'Copas', simbolo: '♥', vermelho: true, emblema: 'copa' },
  P: { nome: 'Paus', simbolo: '♣', vermelho: false, emblema: 'pau' },
  O: { nome: 'Ouros', simbolo: '♦', vermelho: true, emblema: 'ouro' },
};

/** Peso de cada naipe no desempate. */
export const ORDEM_NAIPE = { E: 4, C: 3, P: 2, O: 1 };

/** Nome por extenso de cada valor. */
export const NOME_VALOR = {
  A: 'Ás', 2: 'Dois', 3: 'Três', 4: 'Quatro', 5: 'Cinco', 6: 'Seis', 7: 'Sete',
  8: 'Oito', 9: 'Nove', 10: 'Dez', J: 'Valete', Q: 'Dama', K: 'Rei',
};

/** Plural das figuras, usado nos nomes de combos ("Trio de Reis"). */
export const PLURAL_FIGURA = { J: 'Valetes', Q: 'Damas', K: 'Reis' };

/** Força de cada valor para decidir quem começa e para desempates (Ás é a mais alta). */
export const FORCA_VALOR = { A: 14, K: 13, Q: 12, J: 11, 10: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2 };

/** Diz se a carta é uma figura (valete, dama ou rei). */
export function ehFigura(carta) {
  return carta.valor === 'J' || carta.valor === 'Q' || carta.valor === 'K';
}

/** Rótulo curto da carta, ex.: '10♠'. */
export function rotuloCarta(carta) {
  return carta.valor + NAIPE[carta.naipe].simbolo;
}

/** Baralho padrão de 52 cartas, sem coringas. */
export function baralhoPadrao() {
  const cartas = [];
  for (const naipe of NAIPES) for (const valor of VALORES) cartas.push({ id: valor + naipe, valor, naipe });
  return cartas;
}

/** Critérios de ordenação da mão e as direções aceitas por `ordenarMao`. */
export const CRITERIOS_DE_ORDEM = ['tamanho', 'naipe'];
export const DIRECOES_DE_ORDEM = ['asc', 'desc'];

/**
 * Ordena uma mão só para exibição (issue #126): devolve uma cópia e nunca altera `cartas` nem o
 * estado da partida.
 *  - `'tamanho'`: ordem natural do baralho (Ás, 2 a 10, Valete, Dama, Rei), desempate por naipe
 *    na ordem de `NAIPES` (espadas, copas, paus, ouros);
 *  - `'naipe'`: naipes na ordem de `NAIPES`, desempate pelo tamanho natural.
 *  `'asc'` segue essa ordem; `'desc'` a inverte por inteiro. Cartas idênticas (baralhos repetidos)
 *  mantêm a ordem em que vieram, nas duas direções (ordenação estável).
 * @param {{valor: string, naipe: string}[]} cartas
 * @param {'tamanho'|'naipe'} criterio
 * @param {'asc'|'desc'} [direcao]
 */
export function ordenarMao(cartas, criterio, direcao = 'asc') {
  if (!CRITERIOS_DE_ORDEM.includes(criterio)) throw new RangeError('critério de ordem desconhecido: ' + criterio);
  if (!DIRECOES_DE_ORDEM.includes(direcao)) throw new RangeError('direção de ordem desconhecida: ' + direcao);
  const tamanho = (c) => VALORES.indexOf(c.valor), naipe = (c) => NAIPES.indexOf(c.naipe);
  const chave = criterio === 'tamanho' ? (c) => [tamanho(c), naipe(c)] : (c) => [naipe(c), tamanho(c)];
  const sinal = direcao === 'desc' ? -1 : 1;
  return cartas.slice().sort((a, b) => {
    const [a1, a2] = chave(a), [b1, b2] = chave(b);
    return sinal * (a1 - b1 || a2 - b2);
  });
}
