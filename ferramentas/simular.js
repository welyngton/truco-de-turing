/**
 * @file Laboratório de Monte Carlo no terminal: oponentes jogam entre si e as estatísticas são agregadas.
 *
 * Uso: node ferramentas/simular.js [partidas] [oponente1] [oponente2] [baralho] [terreno]
 * Exemplo: node ferramentas/simular.js 300 guloso aleatorio truco oceano
 */
import { novaMao, aplicarJogada } from '../src/nucleo/partida.js';
import { escolherJogada } from '../src/nucleo/oponentes/index.js';
import { pontuarRede } from '../src/nucleo/pontuacao.js';

const [, , qtd = '300', op1 = 'guloso', op2 = 'aleatorio', baralho = 'classico', terreno = 'neutro'] = process.argv;
const N = Number(qtd);
const usaMonteCarlo = op1 === 'montecarlo' || op2 === 'montecarlo';

const agregado = { vitorias: [0, 0], quemComecaVence: 0, somas: [], turnos: [], eventos: {}, motivos: {}, erros: 0, vanishing: 0 };
const inicio = Date.now();

for (let p = 0; p < N; p++) {
  const mao = novaMao({
    baralho, terreno, inicio: 'revela-descarta', semente: p * 7919 + 13,
    jogadores: [{ nome: 'A', tipo: 'oponente', oponente: op1 }, { nome: 'B', tipo: 'oponente', oponente: op2 }],
  });
  try {
    let limite = 0;
    while (mao.fase !== 'fim' && limite++ < 400) {
      if (mao.fase === 'inicio') {
        mao.jogadores.forEach((j, i) => { if (!j.cartaInicial) aplicarJogada(mao, escolherJogada(mao, i)); });
        continue;
      }
      const jogada = escolherJogada(mao, mao.vez, usaMonteCarlo ? 40 : undefined);
      delete jogada.simulacao;
      aplicarJogada(mao, jogada);
    }
    if (mao.fase !== 'fim') throw new Error('a mão não terminou');
    for (const e of mao.eventos) agregado.eventos[e.tipo] = (agregado.eventos[e.tipo] || 0) + 1;
    agregado.vitorias[mao.resultado.vencedor]++;
    if (mao.resultado.vencedor === mao.primeiro) agregado.quemComecaVence++;
    agregado.somas.push(...mao.resultado.somas);
    agregado.turnos.push(mao.turno);
    agregado.motivos[mao.resultado.motivo] = (agregado.motivos[mao.resultado.motivo] || 0) + 1;
    if (mao.jogadores.some((_, j) => pontuarRede(mao, j).vanishing)) agregado.vanishing++;
  } catch (erro) {
    agregado.erros++;
    if (agregado.erros < 4) console.error('Erro na mão', p, erro.message);
  }
}

const media = (lista) => (lista.reduce((s, x) => s + x, 0) / lista.length).toFixed(1);
console.log(`${N} mãos ${op1} × ${op2} | baralho ${baralho} | terreno ${terreno} | ${Date.now() - inicio} ms`);
console.log('vitórias', agregado.vitorias, '| quem começa vence', ((100 * agregado.quemComecaVence) / N).toFixed(1) + '%');
console.log('soma média', media(agregado.somas), '| máxima', Math.max(...agregado.somas), '| turnos médios', media(agregado.turnos), '| vanishing', agregado.vanishing);
console.log('eventos por mão', Object.fromEntries(Object.entries(agregado.eventos).map(([k, v]) => [k, (v / N).toFixed(2)])));
console.log('motivos', agregado.motivos, '| erros', agregado.erros);
