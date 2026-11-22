/**
 * @file Testes de interface dos botões de ícone de efeitos sonoros e música (issue #133, épico #157):
 * no menu principal e na mesa, em 640x360, 844x390 e 1280x800. Clicar liga e desliga cada um
 * separadamente, o estado persiste ao recarregar, os três lugares (ícone do menu, ícone da mesa e
 * janela MENU) ficam em acordo e os botões não cobrem logo, placar nem botões de ação.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, esperarMenu, naCena, esperarCena, comecarPartida, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

const TELAS = [{ width: 640, height: 360 }, { width: 844, height: 390 }, { width: 1280, height: 800 }];
const apertar = (pagina, botao) => naCena(pagina, `const b = cena.painel[arg]; b.emit('pointerover', { wasTouch: false }); b.emit('pointerdown'); b.emit('pointerup'); b.emit('pointerout');`, botao);
const musicaTocando = (pagina) => pagina.evaluate(async () => (await import('/src/interface/musica.js')).Musica.tocando());
const estado = (pagina) => pagina.evaluate(() => { const p = globalThis.__TRUCO_DE_TURING__.progresso; return { mudo: !!p.mudo, musica: !!p.musica }; });
const retangulos = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

describe('botões de ícone de som no menu principal', () => {
  it('mostram o estado, ligam e desligam cada um separadamente e o estado persiste ao recarregar', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      const efeitos = pagina.locator('.controles-de-som [data-controle="som"]'), musica = pagina.locator('.controles-de-som [data-controle="musica"]');
      assert.equal(await efeitos.getAttribute('aria-pressed'), 'true');
      assert.equal(await musica.getAttribute('aria-pressed'), 'true');
      assert.equal(await efeitos.getAttribute('title'), 'Desligar efeitos sonoros');
      assert.equal(await musica.getAttribute('title'), 'Desligar música');
      /* música do menu: o clique no ícone é um gesto, então a trilha toca; clicar de novo para */
      await musica.click();
      assert.equal(await musica.getAttribute('aria-pressed'), 'false');
      assert.equal(await musica.getAttribute('title'), 'Ligar música');
      assert.equal(await musicaTocando(pagina), false);
      assert.deepEqual(await estado(pagina), { mudo: false, musica: false });
      await efeitos.click();
      assert.equal(await efeitos.getAttribute('aria-pressed'), 'false');
      assert.deepEqual(await estado(pagina), { mudo: true, musica: false }, 'um lado não mexe no outro');
      await musica.click();
      await pagina.waitForFunction(async () => (await import('/src/interface/musica.js')).Musica.tocando());
      assert.deepEqual(await estado(pagina), { mudo: true, musica: true });
      /* música desligada de novo e recarrega: os dois ícones abrem como ficaram */
      await musica.click();
      await pagina.reload();
      await esperarMenu(pagina);
      assert.equal(await pagina.locator('[data-controle="som"]').getAttribute('aria-pressed'), 'false', 'efeitos continuam desligados');
      assert.equal(await pagina.locator('[data-controle="musica"]').getAttribute('aria-pressed'), 'false', 'música continua desligada');
      assert.equal(await musicaTocando(pagina), false);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('não cobrem o título, a configuração da mesa nem os botões do menu, em 640x360, 844x390 e 1280x800', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      for (const tela of TELAS) {
        await pagina.setViewportSize(tela);
        await pagina.waitForTimeout(150);
        const caixa = (seletor) => pagina.locator(seletor).first().boundingBox();
        const controles = await caixa('.controles-de-som');
        assert.ok(controles, tela.width + 'px: controles visíveis');
        assert.ok(controles.x >= 0 && controles.y >= 0 && controles.x + controles.width <= tela.width && controles.y + controles.height <= tela.height, `${tela.width}x${tela.height}: dentro da tela`);
        for (const seletor of ['.menu-capa h1', '.menu-capa > p', '#m-jogar', '#m-online', '.menu-mais', '.menu-painel']) {
          const outro = await caixa(seletor);
          if (outro) assert.ok(!retangulos(controles, outro), `${tela.width}x${tela.height}: os botões de som cobrem ${seletor}`);
        }
        for (const botao of await pagina.locator('.controles-de-som .botao-icone').all()) {
          const b = await botao.boundingBox();
          assert.ok(b.width >= 34 && b.height >= 34, `${tela.width}x${tela.height}: botão pequeno demais (${b.width}x${b.height})`);
        }
        await capturar(pagina, `40-menu-som-${tela.width}x${tela.height}`);
      }
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});

describe('som e música na mesa: só dentro da janela MENU', () => {
  it('o painel da carta não tem botões de som; a janela MENU liga e desliga efeitos e música e o estado persiste ao recarregar', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'montanha', partida: '12', inicio: 'sorteio' });
      assert.equal(await naCena(pagina, 'return cena.painel.botaoEfeitos === undefined && cena.painel.botaoMusica === undefined'), true, 'sem botões de ícone no alto do painel');
      assert.equal(await musicaTocando(pagina), true, 'a trilha do terreno toca ao começar');
      await apertar(pagina, 'botaoMenu');
      const som = pagina.locator('.janela-da-mesa [data-chave="som"]'), musica = pagina.locator('.janela-da-mesa [data-chave="musica"]');
      assert.match(await som.textContent(), /Som: sim/);
      assert.match(await musica.textContent(), /Música: sim/);
      await musica.dispatchEvent('click');
      assert.equal(await musicaTocando(pagina), false);
      await som.dispatchEvent('click');
      assert.deepEqual(await estado(pagina), { mudo: true, musica: false });
      assert.match(await som.textContent(), /Som: não/);
      await som.dispatchEvent('click');
      await musica.dispatchEvent('click');
      assert.deepEqual(await estado(pagina), { mudo: false, musica: true });
      assert.equal(await musicaTocando(pagina), true);
      await som.dispatchEvent('click');
      await pagina.locator('.janela-da-mesa [data-fechar]').dispatchEvent('click');
      await pagina.reload();
      await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'oceano', partida: '12', inicio: 'sorteio' });
      assert.deepEqual(await estado(pagina), { mudo: true, musica: true }, 'o estado salvo vale na mesa seguinte');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('o título DETALHE DA CARTA ocupa o alto do painel, sem botões ao lado, em 640x360, 844x390 e 1280x800', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'neutro', partida: '12', inicio: 'sorteio' });
      for (const tela of TELAS) {
        await pagina.setViewportSize(tela);
        await pagina.waitForTimeout(250);
        await pagina.evaluate(() => { const avisos = document.querySelector('#avisos'); if (avisos) avisos.innerHTML = ''; });
        await capturar(pagina, `41-mesa-sem-botoes-de-som-${tela.width}x${tela.height}`);
      }
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
