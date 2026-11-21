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

describe('botões de ícone de som na mesa', () => {
  it('ligam e desligam efeitos e música, acompanham a janela MENU e o estado persiste ao recarregar', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'montanha', partida: '12', inicio: 'sorteio' });
      await esperarCena(pagina, "return cena.textures.exists('icone-som:efeitosLigado') && cena.textures.exists('icone-som:musicaDesligada')");
      const icones = () => naCena(pagina, 'return [cena.painel.botaoEfeitos.icone.texture.key, cena.painel.botaoMusica.icone.texture.key];');
      assert.deepEqual(await icones(), ['icone-som:efeitosLigado', 'icone-som:musicaLigada']);
      assert.equal(await musicaTocando(pagina), true, 'a trilha do terreno toca ao começar');
      /* ícone da mesa: música desliga, a trilha para */
      await apertar(pagina, 'botaoMusica');
      assert.deepEqual(await icones(), ['icone-som:efeitosLigado', 'icone-som:musicaDesligada']);
      assert.equal(await musicaTocando(pagina), false);
      /* ícone da mesa: efeitos desligam, sem mexer na música */
      await apertar(pagina, 'botaoEfeitos');
      assert.deepEqual(await icones(), ['icone-som:efeitosDesligado', 'icone-som:musicaDesligada']);
      assert.deepEqual(await estado(pagina), { mudo: true, musica: false });
      /* janela MENU: mostra o mesmo estado e, ao mudar nela, os ícones do painel acompanham */
      await apertar(pagina, 'botaoMenu');
      const som = pagina.locator('.janela-da-mesa [data-chave="som"]'), musica = pagina.locator('.janela-da-mesa [data-chave="musica"]');
      assert.match(await som.textContent(), /Som: não/);
      assert.match(await musica.textContent(), /Música: não/);
      await som.dispatchEvent('click');
      await musica.dispatchEvent('click');
      assert.match(await som.textContent(), /Som: sim/);
      assert.deepEqual(await icones(), ['icone-som:efeitosLigado', 'icone-som:musicaLigada']);
      assert.equal(await musicaTocando(pagina), true);
      await pagina.locator('.janela-da-mesa [data-fechar]').dispatchEvent('click');
      /* efeitos desligados pelo ícone, e recarrega: a mesa seguinte abre com os ícones no estado salvo */
      await apertar(pagina, 'botaoEfeitos');
      assert.deepEqual(await estado(pagina), { mudo: true, musica: true });
      await pagina.reload();
      await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'oceano', partida: '12', inicio: 'sorteio' });
      await esperarCena(pagina, "return cena.textures.exists('icone-som:efeitosDesligado') && cena.painel.botaoEfeitos.icone.visible");
      assert.deepEqual(await icones(), ['icone-som:efeitosDesligado', 'icone-som:musicaLigada']);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('não cobrem a carta de inspeção, os botões REGRAS e MENU nem o placar, em 640x360, 844x390 e 1280x800', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'neutro', partida: '12', inicio: 'sorteio' });
      await esperarCena(pagina, "return cena.textures.exists('icone-som:efeitosLigado') && cena.painel.botaoEfeitos.icone.visible");
      for (const tela of TELAS) {
        await pagina.setViewportSize(tela);
        await pagina.waitForTimeout(250);
        const caixas = await naCena(pagina, `
          /* botões: a área visível (largura x altura do botão), sem a margem transparente da sombra */
          const b = (o) => ({ x: o.x - o.width / 2, y: o.y - o.height / 2, width: o.width, height: o.height });
          const imagem = (o) => { const r = o.getBounds(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
          const p = cena.painel;
          return { efeitos: b(p.botaoEfeitos), musica: b(p.botaoMusica), inspecao: imagem(p.inspecao), regras: b(p.botaoRegras), menu: b(p.botaoMenu), truco: b(p.truco), acoes: Object.values(p.acoes).map(b) };`);
        for (const nome of ['efeitos', 'musica']) {
          for (const outro of ['inspecao', 'regras', 'menu', 'truco']) assert.ok(!retangulos(caixas[nome], caixas[outro]), `${tela.width}x${tela.height}: ${nome} cobre ${outro}`);
          for (const a of caixas.acoes) assert.ok(!retangulos(caixas[nome], a), `${tela.width}x${tela.height}: ${nome} cobre um botão de ação`);
        }
        assert.ok(!retangulos(caixas.efeitos, caixas.musica), 'os dois botões não se sobrepõem');
        assert.ok(caixas.efeitos.x >= 0 && caixas.musica.x + caixas.musica.width <= 1280, 'dentro do mundo 1280x720');
        await pagina.evaluate(() => { const avisos = document.querySelector('#avisos'); if (avisos) avisos.innerHTML = ''; }); /* o aviso de Livro de conceitos cobre o alto da mesa na captura */
        await capturar(pagina, `41-mesa-som-${tela.width}x${tela.height}`);
      }
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
