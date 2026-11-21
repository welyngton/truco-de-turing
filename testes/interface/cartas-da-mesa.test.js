/**
 * @file Testes de interface: as cartas da mesa ficam inteiras e no lugar.
 *
 * Bug da v2.22.0: com o cursor (ou o dedo, no celular) sobre o lugar onde uma carta da mesa caía
 * durante a distribuição, o realce do cursor interrompia a animação de entrada. A carta ficava
 * transparente e deslocada para cima, "afundada" atrás da vizinha (aparecia na última carta da
 * coluna Entrada). Estes testes passam o cursor sobre as cartas enquanto elas são distribuídas e
 * conferem que todas terminam opacas, na posição e na profundidade certas.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, esperarMenu, esperarCena, naCena, jogarAteOResultado } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

/** Lista as cartas da mesa que não estão opacas, no lugar e na profundidade de descanso. */
const cartasForaDoLugar = (pagina) => naCena(pagina, `
  const erradas = [];
  for (const camada of cena.mao.camadas) for (const n of camada) {
    if (n.removido) continue;
    const v = cena.visuais[n.id], { x, y } = cena.posicaoDoNeuronio(n.id), img = v.imagem;
    const profundidade = v.realcado ? 9 : 3;
    if (Math.abs(img.alpha - 1) > 0.001 || Math.abs(img.x - x) > 0.5 || Math.abs(img.y - y) > 0.5 || img.depth !== profundidade)
      erradas.push({ camada: n.camada, posicao: n.posicao, alpha: +img.alpha.toFixed(2), dy: +(img.y - y).toFixed(1), depth: img.depth });
  }
  return erradas;`);

/**
 * Espera nenhuma animação estar mexendo nas cartas da mesa. O CI é bem mais lento que uma máquina
 * comum, então um tempo fixo não serve. Uma carta presa no meio da distribuição não tem animação
 * ativa, então continua sendo pega pela conferência logo depois.
 */
const esperarCartasParadas = (pagina) => esperarCena(pagina,
  'return Object.values(cena.visuais).every((v) => !cena.tweens.isTweening(v.imagem))', 30000);

/** Abre uma partida e espera a mesa, sem acelerar o tempo (as animações correm na velocidade real). */
async function abrirMesa(jogo, antesDeDistribuir) {
  const { pagina } = jogo;
  await esperarMenu(pagina);
  await pagina.evaluate(() => { globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto = true; }); /* sem a oferta do tutorial */
  await pagina.click('#m-jogar');
  await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.painel');
  if (antesDeDistribuir) await naCena(pagina, antesDeDistribuir.codigo, antesDeDistribuir.arg);
  await esperarCena(pagina, 'return cena.mao && cena.visuais && Object.keys(cena.visuais).length');
}

describe('cartas da mesa inteiras e no lugar', () => {
  /* em vários momentos da distribuição: antes de a carta começar a cair, no meio e no fim */
  for (const atraso of [0, 20, 60, 120, 220]) {
    it('cursor sobre a última carta da Entrada ' + atraso + ' ms depois de a mão começar', async () => {
      const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
      try {
        await abrirMesa(jogo, { arg: atraso, codigo: `
          const original = cena.criarNeuronios;
          cena.criarNeuronios = function () {
            original.call(this);
            const entrada = this.mao.camadas[0], id = entrada[entrada.length - 1].id;
            setTimeout(() => this.aoPassarNoNeuronio(id, true), arg);
            setTimeout(() => this.aoPassarNoNeuronio(id, false), arg + 150);
          };` });
        await jogo.pagina.waitForTimeout(400);
        await esperarCartasParadas(jogo.pagina);
        assert.deepEqual(await cartasForaDoLugar(jogo.pagina), []);
        assert.deepEqual(jogo.erros, []);
      } finally { await jogo.fechar(); }
    });
  }

  it('cursor passeando pela coluna Entrada com o mouse durante a distribuição da próxima mão', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await abrirMesa(jogo);
      await jogarAteOResultado(pagina);
      /* posição na página de cada carta da Entrada (a próxima mão usa a mesma arquitetura) */
      const pontos = await naCena(pagina, `
        const tela = jogo.canvas.getBoundingClientRect(), cam = cena.cameras.main;
        const ex = tela.width / jogo.scale.width, ey = tela.height / jogo.scale.height;
        return cena.mao.camadas[0].map((n) => {
          const { x, y } = cena.posicaoDoNeuronio(n.id);
          return { x: tela.left + (cam.x + (x - cam.scrollX) * cam.zoom) * ex, y: tela.top + (cam.y + (y - cam.scrollY) * cam.zoom) * ey };
        });`);
      await pagina.mouse.move(5, 5);
      /* Próxima mão pelo DOM, sem tirar o mouse do lugar; logo depois o cursor sobe e desce a coluna */
      await pagina.evaluate(() => document.querySelector('#r-proxima').click());
      const fim = Date.now() + 700;
      for (let i = 0; Date.now() < fim; i++) {
        const p = pontos[i % pontos.length];
        await pagina.mouse.move(p.x + (i % 3) - 1, p.y + (i % 5) - 2, { steps: 2 });
      }
      await pagina.mouse.move(5, 5);
      await pagina.waitForTimeout(400);
      await esperarCartasParadas(pagina);
      assert.deepEqual(await cartasForaDoLugar(pagina), []);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('a mão inteira jogada com o cursor passando nas cartas termina sem carta fora do lugar', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    try {
      await abrirMesa(jogo);
      await naCena(jogo.pagina, 'cena.time.timeScale = 8; cena.tweens.timeScale = 8;');
      await jogarAteOResultado(jogo.pagina);
      await esperarCartasParadas(jogo.pagina);
      assert.deepEqual(await cartasForaDoLugar(jogo.pagina), []);
    } finally { await jogo.fechar(); }
  });
});
