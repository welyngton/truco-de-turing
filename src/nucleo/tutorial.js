/**
 * @file Mão do tutorial: a mesa e as mãos combinadas de antemão (conteudo/tutorial.js) e a conferência
 * das jogadas do roteiro. Sem sorteio: o roteiro joga a mesma mão sempre, e cada jogada é validada
 * pelo motor como numa partida de verdade.
 */
import { novaMao, atualizarVisao } from './partida.js';
import { rankDoValor, cartaParaTT } from './traducao.js';
import { MESA_DO_TUTORIAL } from '../conteudo/tutorial.js';

const NAIPE_MOTOR = { E: 'S', C: 'H', P: 'C', O: 'D' };
const NAIPES = ['E', 'C', 'P', 'O'];

/** Semente fixa só para o motor ter o que embaralhar; as cartas da mesa e das mãos são trocadas em seguida. */
const SEMENTE_DO_TUTORIAL = 20260;

/**
 * Cria a mão do tutorial: o motor monta a mesa e as cartas de cada neurônio e de cada mão são trocadas
 * pelas do roteiro (como `testes/apoio/montagem.js`, que faz o mesmo para montar situações).
 * @param {{nome:string, tipo?:string, oponente?:string}[]} jogadores Os dois jogadores (humano e rival).
 */
export function novaMaoDoTutorial(jogadores) {
  const mao = novaMao({ arquitetura: MESA_DO_TUTORIAL.arquitetura, baralho: 'classico', terreno: 'neutro', inicio: 'revela-descarta', semente: SEMENTE_DO_TUTORIAL, jogadores });
  const estado = mao.estadoMotor, indice = mao.indiceDeCartas;
  let n = 0;
  const criar = (valor) => {
    indice.proximo = (indice.proximo || 100000) + 1;
    const carta = { id: indice.proximo, rank: rankDoValor(valor), suit: NAIPE_MOTOR[NAIPES[n++ % NAIPES.length]] };
    const visao = cartaParaTT(carta, true);
    indice.tt.set(carta.id, visao);
    indice.estadoMotor.set(visao.id, carta.id);
    return carta;
  };
  MESA_DO_TUTORIAL.camadas.forEach((valores, c) => valores.forEach((valor, p) => {
    Object.assign(estado.layers[c][p], { card: criar(valor), stack: [] });
  }));
  MESA_DO_TUTORIAL.maos.forEach((cartas, j) => { estado.hands[j] = cartas.map(criar); });
  return atualizarVisao(mao);
}

/** Ids das primeiras `n` cartas de valor `valor` na mão do jogador `j`. */
function cartasDoValor(mao, j, valor, n) {
  return mao.jogadores[j].mao.filter((c) => c.valor === valor).slice(0, n).map((c) => c.id);
}

/**
 * A jogada de um passo do roteiro, com os ids de carta da mão atual.
 * @param {object} mao
 * @param {{jogador:number, jogada:object}} passo Passo com jogada.
 * @returns {object} Jogada no formato de `aplicarJogada`.
 */
export function jogadaDoPasso(mao, passo) {
  const s = passo.jogada, jogador = passo.jogador;
  if (s.tipo === 'inicio') return { tipo: 'inicio', jogador, carta: cartasDoValor(mao, jogador, s.valor, 1)[0] };
  if (s.tipo === 'ativar') return { tipo: 'ativar', jogador, neuronio: s.neuronio };
  if (s.tipo === 'empilhar') return { tipo: 'empilhar', jogador, neuronio: s.neuronio, cartas: cartasDoValor(mao, jogador, s.valor, s.n) };
  if (s.tipo === 'dropout') return { tipo: 'dropout', jogador, n: s.n, pagamento: cartasDoValor(mao, jogador, s.valor, s.n) };
  return { tipo: 'passar', jogador };
}

/** A carta que o rival revela na escolha de quem começa. */
export function inicioDoRival(mao) {
  return { tipo: 'inicio', jogador: 1, carta: cartasDoValor(mao, 1, MESA_DO_TUTORIAL.inicioDoRival, 1)[0] };
}

/**
 * A jogada feita é a do passo? Compara o tipo, o neurônio e as cartas (pelo valor e pela quantidade,
 * não pelo id: a mão tem cartas de naipes diferentes de mesmo valor).
 */
export function jogadaCombina(mao, passo, jogada) {
  if (!passo || !passo.jogada || passo.jogador !== jogada.jogador) return false;
  const s = passo.jogada;
  if (s.tipo !== jogada.tipo) return false;
  const valoresIguais = (ids, valor, n) => {
    const cartas = mao.jogadores[jogada.jogador].mao;
    return ids.length === n && ids.every((id) => (cartas.find((c) => c.id === id) || {}).valor === valor);
  };
  if (s.tipo === 'ativar') return jogada.neuronio === s.neuronio;
  if (s.tipo === 'empilhar') return jogada.neuronio === s.neuronio && valoresIguais(jogada.cartas || [], s.valor, s.n);
  if (s.tipo === 'dropout') return jogada.n === s.n && valoresIguais(jogada.pagamento || [], s.valor, s.n);
  if (s.tipo === 'inicio') return valoresIguais([jogada.carta], s.valor, 1);
  return true;
}
