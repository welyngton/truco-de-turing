/**
 * @file Testes de interface (navegador de verdade): carregamento, menu, telas do menu, versão,
 * celular na vertical (aviso para girar) e renderizador Canvas.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, esperarMenu, naCena, capturar, comecarPartida, esperarCena } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

describe('menu e telas', () => {
  it('carrega, mostra o menu com as escolhas e abre Regras (abas, ajuda das ações), Biblioteca de conceitos, Conquistas, Mods e Sobre', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      await capturar(pagina, '01-menu');
      assert.equal(await pagina.locator('#m-oponente option').count(), 3);
      assert.equal(await pagina.locator('#m-jogadores option').count(), 4);
      assert.equal(await pagina.locator('#m-arquitetura option').count(), 4);
      assert.equal(await pagina.locator('#m-baralho option').count(), 7);
      assert.equal(await pagina.locator('#m-terreno option').count(), 4);
      /* trilha do menu: começa no primeiro toque na página (o navegador só libera som depois de um gesto) */
      const musicaDoMenu = () => pagina.evaluate(async () => (await import('/src/interface/musica.js')).Musica.tocando());
      await pagina.mouse.click(5, 5);
      await pagina.waitForFunction(async () => (await import('/src/interface/musica.js')).Musica.tocando());
      assert.equal(await musicaDoMenu(), true);
      await pagina.selectOption('#m-terreno', 'oceano');
      await pagina.waitForSelector('.miniatura img');
      for (const [botao, texto] of [['#m-regras', 'Regras'], ['#m-grimorio', 'Biblioteca de conceitos'], ['#m-conquistas', 'Conquistas'], ['#m-mods', 'Mods'], ['#m-sobre', 'Sobre']]) {
        await pagina.click(botao);
        await pagina.waitForSelector('.camada:not(.transparente) h2');
        assert.match(await pagina.locator('.camada:not(.transparente) h2').first().textContent(), new RegExp(texto));
        if (botao === '#m-regras') {
          /* abas do manual do NeuroDeck, com a arte dos baralhos e terrenos */
          await pagina.click('.abas [data-aba="extensoes"]');
          await pagina.waitForSelector('.extensao-arte img');
          await capturar(pagina, '26-regras-baralhos-e-terrenos');
          await pagina.click('.abas [data-aba="acoes"]');
          await pagina.click('#r-ajuda-acoes');
          await pagina.waitForSelector('.cartao-acao');
          await capturar(pagina, '27-ajuda-das-acoes');
          await pagina.click('.cartao-acao[data-acao="dropout"] [data-verbete]');
          await pagina.waitForSelector('#g-verbete .equacao math');
          assert.match(await pagina.locator('#g-verbete h2').textContent(), /Dropout/);
          /* a equação é desenhada (MathML com altura de verdade, não texto cru) */
          assert.ok(await pagina.locator('#g-verbete .equacao math').evaluate((m) => m.getBoundingClientRect().height > 20));
          await capturar(pagina, '28-biblioteca-dropout');
          /* fecha a Biblioteca e a ajuda; as regras continuam abertas */
          await pagina.locator('.camada:not(.transparente) [data-fechar] >> nth=-1').click();
          await pagina.locator('.ajuda-acoes [data-fechar] >> nth=0').click();
        }
        if (botao === '#m-grimorio') {
          await pagina.click('#g-lista button >> nth=3');
          assert.equal(await pagina.locator('#g-lista .lido').count(), 3); /* dropout (lido pela ajuda das ações), o primeiro e o quarto */
          await pagina.click('#g-lista button[data-id="overfit"]');
          await pagina.waitForSelector('#g-verbete .katex-display');
          assert.match(await pagina.locator('#g-verbete').textContent(), /Para se aprofundar/);
          await capturar(pagina, '01b-grimorio-formulas');
        }
        if (botao === '#m-conquistas') { await pagina.waitForSelector('#c-retrato canvas'); await capturar(pagina, '02-conquistas'); }
        if (botao === '#m-sobre') assert.match(await pagina.locator('.versao').textContent(), /Versão \d+\.\d+\.\d+/);
        if (botao === '#m-mods') await capturar(pagina, '24-mods');
        await pagina.click('.camada:not(.transparente) [data-fechar] >> nth=0');
      }
      /* avatar: troca para um liberado; o botão do menu mostra o retrato novo */
      const antes = await pagina.locator('#m-avatar-img').getAttribute('src');
      await pagina.click('#m-avatar');
      await pagina.waitForSelector('.avatar-opcao img');
      assert.equal(await pagina.locator('.avatar-opcao.bloqueado').count(), 6);
      await pagina.click('.avatar-opcao[data-avatar="robo"]');
      await capturar(pagina, '29-avatares');
      await pagina.locator('.avatares [data-fechar] >> nth=0').click();
      assert.equal(await pagina.evaluate(() => globalThis.__TRUCO_DE_TURING__.progresso.avatar), 'robo');
      assert.notEqual(await pagina.locator('#m-avatar-img').getAttribute('src'), antes);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('celular na vertical: só o aviso para girar; ao girar, o jogo é criado e o menu aparece', async () => {
    const jogo = await abrirJogo(servidor.url, { dispositivo: 'iPhone 13' });
    const { pagina } = jogo;
    try {
      await pagina.waitForTimeout(800);
      assert.equal(await pagina.evaluate(() => getComputedStyle(document.querySelector('#girar')).display), 'grid');
      assert.equal(await pagina.evaluate(() => !!globalThis.__TRUCO_DE_TURING__.jogo), false);
      await capturar(pagina, '03-celular-vertical');
      await pagina.setViewportSize({ width: 844, height: 390 });
      await esperarMenu(pagina);
      assert.equal(await pagina.evaluate(() => getComputedStyle(document.querySelector('#girar')).display), 'none');
      await comecarPartida(pagina);
      await esperarCena(pagina, 'return cena.modo === "inicio"');
      await capturar(pagina, '04-celular-horizontal');
      /* o jogo pediu tela cheia ao começar (celular): sai dela para poder girar a janela */
      await pagina.evaluate(() => document.fullscreenElement && document.exitFullscreen());
      await pagina.waitForTimeout(200);
      await pagina.setViewportSize({ width: 390, height: 844 });
      await pagina.waitForTimeout(300);
      assert.equal(await pagina.evaluate(() => getComputedStyle(document.querySelector('#girar')).display), 'grid');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('renderizador Canvas e resolução forçados pela URL', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?renderer=canvas&res=1.5' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      const tipo = await naCena(pagina, 'return jogo.config.renderType === Phaser.CANVAS');
      assert.equal(tipo, true);
      assert.equal(await naCena(pagina, 'return jogo.config.width'), 1920);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
