/**
 * @file Estados de jogo prontos para os testes: mãos novas, mãos jogadas até certo ponto e
 * mesas montadas à mão com cartas escolhidas (ver também montagem.js).
 */
import { novaMao, aplicarJogada, jogadasLegais } from '../../src/nucleo/partida.js';
import { jogadaAleatoria } from '../../src/nucleo/oponentes/estrategias.js';
import { montarRede } from './montagem.js';

/** Dois jogadores genéricos. */
export const JOGADORES = [{ nome: 'Ana', tipo: 'humano' }, { nome: 'Bia', tipo: 'humano' }];

/** Mão nova, já na fase de jogo (início por sorteio). */
export function maoNova(opcoes = {}) {
  return novaMao({ semente: 7, inicio: 'sorteio', jogadores: JOGADORES, ...opcoes });
}

/** Joga `passos` jogadas aleatórias a partir de uma mão nova. */
export function maoJogada(passos, opcoes = {}) {
  const mao = maoNova(opcoes);
  for (let i = 0; i < passos && mao.fase === 'jogo'; i++) aplicarJogada(mao, jogadaAleatoria(mao, mao.vez));
  return mao;
}

/** Joga até o fim da mão. */
export function maoAteOFim(opcoes = {}) {
  const mao = maoNova(opcoes);
  for (let i = 0; i < 400 && mao.fase === 'jogo'; i++) aplicarJogada(mao, jogadaAleatoria(mao, mao.vez));
  return mao;
}

/** Procura, entre várias sementes, uma mão em que `condicao(mao, jogada)` aconteça; devolve a mão logo antes. */
export function procurarSituacao(condicao, { sementes = 400, opcoes = {} } = {}) {
  for (let semente = 1; semente <= sementes; semente++) {
    const mao = novaMao({ semente, inicio: 'sorteio', jogadores: JOGADORES, ...opcoes });
    for (let i = 0; i < 200 && mao.fase === 'jogo'; i++) {
      for (const jogada of jogadasLegais(mao, mao.vez, { comDropout: true })) {
        if (condicao(mao, jogada)) return { mao, jogada };
      }
      aplicarJogada(mao, jogadaAleatoria(mao, mao.vez));
    }
  }
  throw new Error('situação não encontrada');
}

/** Mão em que o jogador 0 tem exatamente as pilhas dadas (uma lista de [valor, naipe] por camada). */
export function redeCom(pilhas, opcoes = {}) {
  const mao = novaMao({ semente: 1, inicio: 'sorteio', ...opcoes, jogadores: [{ nome: 'A' }, { nome: 'B' }] });
  return montarRede(mao, 0, pilhas);
}
