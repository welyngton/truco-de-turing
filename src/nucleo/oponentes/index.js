/**
 * @file Ponto de entrada dos oponentes: perfis (nome, nível, estilo), escolha de jogada e
 * decisões de truco. As jogadas vêm dos bots do NeuroDeck (ver estrategias.js); as decisões de
 * truco são do Truco de Turing e usam a chance de vitória estimada por simulação.
 */
import { pontosDaCarta } from '../baralhos.js';
import { FORCA_VALOR, ORDEM_NAIPE } from '../cartas.js';
import { chanceDeVitoria } from './comum.js';
import { jogadaAleatoria, jogadaGulosa, jogadaMonteCarlo } from './estrategias.js';

export { chanceDeVitoria } from './comum.js';

/** Perfis exibidos no menu e na mesa. `avatar` é a chave da arte em arte/avatares.js. */
export const OPONENTES = {
  aleatorio: {
    nome: 'Zé do Ruído', nivel: 'Fácil', metodo: 'aleatório', avatar: 'ruido',
    estilo: 'Sorteia uma jogada válida, sem olhar o placar. Ativa neurônios às cegas, ataca quando calha e responde ao truco no cara ou coroa. Bom para aprender as regras.',
  },
  guloso: {
    nome: 'Gradiente Guloso', nivel: 'Médio', metodo: 'busca gulosa', avatar: 'gradiente',
    estilo: 'Como a descida de gradiente, sempre dá o passo que mais melhora o placar agora: compara a diferença de pontos depois de cada jogada. Tuna neurônios fortes e aplica overfit nos fortes do adversário, mas não planeja além do próximo lance. Pede truco quando se vê bem à frente.',
  },
  montecarlo: {
    nome: 'Mestre Monte Carlo', nivel: 'Difícil', metodo: 'simulação de Monte Carlo', avatar: 'mc',
    estilo: 'Sorteia as cartas que não vê, joga dezenas de partidas simuladas até o fim para cada lance e escolhe o que mais venceu. Guarda ataques para a hora certa, mostra a própria chance de vitória e truca (às vezes blefando) com base nas simulações.',
  },
};

/** Carta que o oponente revela para decidir quem começa. */
function cartaDeInicio(mao, j) {
  const cartas = mao.jogadores[j].mao.slice();
  const baralho = mao.config.baralho;
  if (mao.config.inicio === 'revela-descarta') {
    /* a carta revelada vai para o cemitério: entrega a menos útil */
    cartas.sort((a, b) => pontosDaCarta(a, baralho) - pontosDaCarta(b, baralho) || FORCA_VALOR[a.valor] - FORCA_VALOR[b.valor]);
    return cartas[0];
  }
  const forca = (c) => FORCA_VALOR[c.valor] * 10 + ORDEM_NAIPE[c.naipe];
  cartas.sort((a, b) => forca(b) - forca(a));
  return cartas[0];
}

/**
 * Escolhe a jogada do oponente `j` conforme o seu perfil.
 * @param {object} mao
 * @param {number} j
 * @param {number} [simulacoes] Partidas simuladas por jogada no Monte Carlo (por padrão, o número do motor).
 */
export function escolherJogada(mao, j, simulacoes) {
  const perfil = mao.jogadores[j].oponente;
  if (mao.fase === 'inicio') return { tipo: 'inicio', jogador: j, carta: cartaDeInicio(mao, j).id };
  if (perfil === 'aleatorio') return jogadaAleatoria(mao, j);
  if (perfil === 'montecarlo') return jogadaMonteCarlo(mao, j, simulacoes);
  return jogadaGulosa(mao, j);
}

/** Simulações usadas para estimar a chance de vitória em cada perfil. */
const SIMULACOES_TRUCO = { guloso: 24, montecarlo: 60 };

/** Decide se o oponente pede truco antes da sua jogada. */
export function querTrucar(mao, j, perfil) {
  if (mao.fase !== 'jogo') return false;
  if (perfil === 'aleatorio') return Math.random() < 0.06;
  const chance = chanceDeVitoria(mao, j, SIMULACOES_TRUCO[perfil] || 24);
  if (chance > 0.72) return Math.random() < 0.8;
  if (chance > 0.4 && Math.random() < 0.05) return true; /* blefe */
  return false;
}

/**
 * Resposta do oponente a um pedido de truco.
 * @returns {'aceitar'|'correr'|'aumentar'}
 */
export function responderAoTruco(mao, j, perfil, valorPedido, podeAumentar) {
  if (perfil === 'aleatorio') {
    const r = Math.random();
    return r < 0.55 ? 'aceitar' : r < 0.85 ? 'correr' : podeAumentar ? 'aumentar' : 'aceitar';
  }
  const chance = chanceDeVitoria(mao, j, SIMULACOES_TRUCO[perfil] || 24);
  if (podeAumentar && chance > 0.8) return 'aumentar';
  const limiar = 0.3 + Math.min(0.15, valorPedido * 0.012);
  if (chance >= limiar) return 'aceitar';
  if (Math.random() < 0.08) return 'aceitar'; /* teimosia */
  return 'correr';
}
