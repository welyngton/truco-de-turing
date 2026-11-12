/**
 * @file Testes de interface: ambiente animado de cada terreno. Confere que há efeitos na camada da
 * frente (por cima das cartas da mesa), que eles se mexem de verdade e que, com "reduzir
 * movimento" no sistema, o ambiente fica parado.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, comecarPartida, naCena, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

/** Retrato do ambiente: posição, transparência e quantidade de partículas de cada objeto. */
const RETRATO = `
  const a = cena.ambiente;
  return {
    parado: a.parado,
    frente: a.objetos.filter((o) => o.depth > 4 && o.depth < 5).length,
    estado: a.objetos.map((o) => [Math.round(o.x || 0), Math.round(o.y || 0), Math.round((o.alpha ?? 1) * 100), Math.round(o.angle || 0),
      o.getAliveParticleCount ? o.getAliveParticleCount() : -1, Math.round(o.tilePositionX || 0)].join(',')),
    fundo: [Math.round(cena.fundo.x), Math.round(cena.fundo.scaleX * 1000)].join(','),
  };`;

describe('ambiente dos terrenos', () => {
  for (const terreno of ['neutro', 'montanha', 'pantano', 'oceano']) {
    it(terreno + ': efeitos por cima da mesa que se mexem', async () => {
      const jogo = await abrirJogo(servidor.url, { consulta: '?res=1&renderer=canvas' });
      const { pagina } = jogo;
      try {
        await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'classico', terreno, inicio: 'sorteio' });
        await pagina.waitForTimeout(2500);
        const antes = await naCena(pagina, RETRATO);
        assert.equal(antes.parado, false);
        assert.ok(antes.frente >= 2, terreno + ': ' + antes.frente + ' efeitos na frente');
        await pagina.waitForTimeout(1500);
        const depois = await naCena(pagina, RETRATO);
        const mudaram = antes.estado.filter((e, k) => e !== depois.estado[k]).length;
        assert.ok(mudaram >= Math.min(3, antes.estado.length), terreno + ': só ' + mudaram + ' efeitos mudaram');
        assert.notEqual(antes.fundo, depois.fundo, terreno + ': a pintura do terreno respira');
        await capturar(pagina, '30-ambiente-' + terreno);
        assert.deepEqual(jogo.erros, []);
      } finally { await jogo.fechar(); }
    });
  }

  it('com "reduzir movimento" o ambiente fica parado (só luz e cor)', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1&renderer=canvas' });
    const { pagina } = jogo;
    try {
      await pagina.emulateMedia({ reducedMotion: 'reduce' });
      await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'classico', terreno: 'pantano', inicio: 'sorteio' });
      await pagina.waitForTimeout(1000);
      const antes = await naCena(pagina, RETRATO);
      assert.equal(antes.parado, true);
      assert.equal(antes.frente, 0);
      await pagina.waitForTimeout(1200);
      const depois = await naCena(pagina, RETRATO);
      assert.deepEqual(depois.estado, antes.estado);
      assert.equal(depois.fundo, antes.fundo);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
