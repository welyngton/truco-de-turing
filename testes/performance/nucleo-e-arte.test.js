/**
 * @file Testes de performance no Node: motor de regras, oponentes, dicas, arte procedural e
 * empacotamento. Os limites são folgados (máquinas de CI variam); os valores medidos vão para o
 * relatório de performance.
 */
import { describe, it } from 'node:test';
import { execFileSync } from 'node:child_process';
import { statSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { cronometrar, registrarMedida } from '../apoio/medidas.js';
import { instalarNavegadorFalso } from '../apoio/ambiente.js';
import { maoNova, maoJogada } from '../apoio/estados.js';
import { aplicarJogada, jogadasLegais, copiarMao } from '../../src/nucleo/partida.js';
import { pontuarRede } from '../../src/nucleo/pontuacao.js';
import { determinizar, chanceDeVitoria } from '../../src/nucleo/oponentes/comum.js';
import { jogadaAleatoria, jogadaGulosa, jogadaMonteCarlo } from '../../src/nucleo/oponentes/estrategias.js';
import { escolherDicaDeJogo } from '../../src/conteudo/dicasDeJogo.js';
import { novaPartida } from '../../src/nucleo/truco.js';

instalarNavegadorFalso();
const { desenharCartaCompleta, desenharCartaDaMesa } = await import('../../src/arte/cartas.js');
const { desenharMesa } = await import('../../src/arte/mesas.js');
const { desenharVerso } = await import('../../src/arte/versos.js');

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const grupo = 'Node';

describe('motor de regras', () => {
  it('pontuar uma rede no meio da mão', () => {
    const mao = maoJogada(10);
    const t = cronometrar(() => pontuarRede(mao, 0), { repeticoes: 5000 });
    registrarMedida({ grupo, nome: 'pontuarRede', valor: t.media * 1000, unidade: 'µs por chamada', limite: 200, melhor: 'menor' });
  });
  it('listar as jogadas legais', () => {
    const mao = maoJogada(10);
    const t = cronometrar(() => jogadasLegais(mao, mao.vez, { comDropout: true }), { repeticoes: 5000 });
    registrarMedida({ grupo, nome: 'jogadasLegais', valor: t.media * 1000, unidade: 'µs por chamada', limite: 300, melhor: 'menor' });
  });
  it('mãos inteiras por segundo (jogadas aleatórias)', () => {
    const inicio = performance.now();
    let maos = 0;
    while (performance.now() - inicio < 1500) {
      const mao = maoNova({ semente: maos + 1 });
      while (mao.fase === 'jogo') aplicarJogada(mao, jogadaAleatoria(mao, mao.vez));
      maos++;
    }
    registrarMedida({ grupo, nome: 'Mãos completas simuladas', valor: maos / ((performance.now() - inicio) / 1000), unidade: 'mãos/s', limite: 150, melhor: 'maior' });
  });
  it('copiar e determinizar uma mão', () => {
    const mao = maoJogada(8);
    registrarMedida({ grupo, nome: 'copiarMao', valor: cronometrar(() => copiarMao(mao), { repeticoes: 2000 }).media * 1000, unidade: 'µs por chamada', limite: 300, melhor: 'menor' });
    registrarMedida({ grupo, nome: 'determinizar', valor: cronometrar(() => determinizar(mao, 0), { repeticoes: 2000 }).media * 1000, unidade: 'µs por chamada', limite: 600, melhor: 'menor' });
  });
});

describe('oponentes e dicas', () => {
  it('decisão do Gradiente Guloso', () => {
    const mao = maoJogada(6);
    const t = cronometrar(() => jogadaGulosa(mao, mao.vez), { repeticoes: 40 });
    registrarMedida({ grupo, nome: 'Decisão gulosa', valor: t.media, unidade: 'ms', limite: 60, melhor: 'menor', detalhe: 'p95 ' + t.p95.toFixed(1) + ' ms' });
  });
  it('decisão do Mestre Monte Carlo (40 partidas simuladas por jogada)', () => {
    const mao = maoJogada(6);
    const jogada = jogadaMonteCarlo(mao, mao.vez);
    registrarMedida({ grupo, nome: 'Simulações por decisão (Monte Carlo)', valor: jogada.simulacao ? jogada.simulacao.partidas : 400, unidade: 'partidas', limite: 80, melhor: 'maior' });
    const t = cronometrar(() => jogadaMonteCarlo(mao, mao.vez), { repeticoes: 5, aquecimento: 1 });
    registrarMedida({ grupo, nome: 'Decisão do Monte Carlo', valor: t.media, unidade: 'ms', limite: 1500, melhor: 'menor', detalhe: 'p95 ' + t.p95.toFixed(1) + ' ms' });
  });
  it('chance de vitória com 40 simulações (dica do truco)', () => {
    const mao = maoJogada(6);
    const t = cronometrar(() => chanceDeVitoria(mao, 0, 40), { repeticoes: 10, aquecimento: 2 });
    registrarMedida({ grupo, nome: 'chanceDeVitoria (40 simulações)', valor: t.media, unidade: 'ms', limite: 150, melhor: 'menor' });
  });
  it('escolher a dica de jogo', () => {
    const mao = maoJogada(8), partida = novaPartida(12);
    const t = cronometrar(() => escolherDicaDeJogo(mao, mao.vez, partida), { repeticoes: 2000 });
    registrarMedida({ grupo, nome: 'escolherDicaDeJogo', valor: t.media * 1000, unidade: 'µs por chamada', limite: 500, melhor: 'menor' });
  });
});

describe('arte procedural e empacotamento', () => {
  it('desenhar cartas, versos e a mesa', () => {
    const carta = { id: 'KO', valor: 'K', naipe: 'O' };
    registrarMedida({ grupo, nome: 'Carta completa (densidade 2)', valor: cronometrar(() => desenharCartaCompleta(carta, 'classico', 2), { repeticoes: 15, aquecimento: 2 }).media, unidade: 'ms', limite: 120, melhor: 'menor' });
    registrarMedida({ grupo, nome: 'Carta da mesa (densidade 1,25)', valor: cronometrar(() => desenharCartaDaMesa(carta, 'truco', 1.25), { repeticoes: 15, aquecimento: 2 }).media, unidade: 'ms', limite: 60, melhor: 'menor' });
    registrarMedida({ grupo, nome: 'Verso (densidade 2)', valor: cronometrar(() => desenharVerso('completa', 2, 'powerbi'), { repeticoes: 10, aquecimento: 2 }).media, unidade: 'ms', limite: 120, melhor: 'menor' });
    registrarMedida({ grupo, nome: 'Fundo da mesa 1280×720', valor: cronometrar(() => desenharMesa('pantano', 1280, 720, 1), { repeticoes: 5, aquecimento: 1 }).media, unidade: 'ms', limite: 400, melhor: 'menor' });
  });
  it('tempo de empacotamento e tamanho do arquivo único', () => {
    const copia = mkdtempSync(join(tmpdir(), 'truco-perf-'));
    for (const item of ['src', 'index.html']) cpSync(join(raiz, item), join(copia, item), { recursive: true });
    const inicio = performance.now();
    execFileSync(process.execPath, [join(raiz, 'ferramentas/empacotar.js')], { env: { ...process.env, TRUCO_RAIZ: copia } });
    registrarMedida({ grupo, nome: 'Empacotamento (esbuild)', valor: performance.now() - inicio, unidade: 'ms', limite: 8000, melhor: 'menor' });
    registrarMedida({ grupo, nome: 'Tamanho do arquivo único', valor: statSync(join(copia, 'dist/truco-de-turing.html')).size / 1024, unidade: 'KB', limite: 700, melhor: 'menor' });
    rmSync(copia, { recursive: true, force: true });
  });
});
