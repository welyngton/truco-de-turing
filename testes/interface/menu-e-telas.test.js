/**
 * @file Testes de interface (navegador de verdade): carregamento, menu, telas do menu, versão,
 * celular na vertical (aviso para girar) e renderizador Canvas.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, esperarMenu, naCena, capturar, comecarPartida, esperarCena, RAIZ } from '../apoio/navegador.js';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

describe('menu e telas', () => {
  it('carrega, mostra o menu com as escolhas e abre Regras (abas, ajuda das ações), Livro de conceitos, Conquistas, Mods e Sobre', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      await capturar(pagina, '01-menu');
      /* os seis botões de baixo do menu têm o mesmo tamanho e o texto cabe neles, no desktop e no celular deitado */
      for (const tela of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 667, height: 375 }]) {
        await pagina.setViewportSize(tela);
        await pagina.waitForFunction(() => document.querySelector('#m-avatar-img')?.complete);
        const botoes = await pagina.locator('.menu-mais .botao').evaluateAll((bs) => bs.map((b) => {
          const r = b.getBoundingClientRect();
          return { id: b.id, l: Math.round(r.width), a: Math.round(r.height), cabe: b.scrollWidth <= b.clientWidth + 1 };
        }));
        assert.equal(botoes.length, 6);
        for (const b of botoes) {
          assert.deepEqual([b.l, b.a], [botoes[0].l, botoes[0].a], tela.width + 'px: ' + b.id);
          assert.ok(b.cabe, tela.width + 'px: texto de ' + b.id + ' não cabe');
        }
      }
      await pagina.setViewportSize({ width: 1280, height: 720 });
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
      /* Yin-yang fixa 1 baralho e a arquitetura curta (com explicação) e, ao sair dele, as escolhas voltam */
      await pagina.selectOption('#m-arquitetura', 'larga');
      await pagina.selectOption('#m-baralhos', '3');
      await pagina.selectOption('#m-baralho', 'yinyang');
      assert.equal(await pagina.locator('#m-arquitetura').inputValue(), 'curta');
      assert.equal(await pagina.locator('#m-baralhos').inputValue(), '1');
      assert.ok(await pagina.locator('#m-arquitetura').isDisabled() && await pagina.locator('#m-baralhos').isDisabled());
      assert.match(await pagina.locator('#m-mesa-dica').textContent(), /Yin-yang só tem 2 e Ás/);
      await pagina.selectOption('#m-baralho', 'classico');
      assert.equal(await pagina.locator('#m-arquitetura').inputValue(), 'larga');
      assert.equal(await pagina.locator('#m-baralhos').inputValue(), '3');
      assert.ok(await pagina.locator('#m-arquitetura').isEnabled() && await pagina.locator('#m-baralhos').isEnabled());
      await pagina.selectOption('#m-arquitetura', 'padrao');
      await pagina.selectOption('#m-baralhos', '1');
      await pagina.selectOption('#m-terreno', 'oceano');
      await pagina.waitForSelector('.miniatura img');
      for (const [botao, texto] of [['#m-regras', 'Regras'], ['#m-grimorio', 'Livro de conceitos'], ['#m-conquistas', 'Conquistas'], ['#m-mods', 'Mods'], ['#m-sobre', 'Sobre']]) {
        await pagina.click(botao);
        await pagina.waitForSelector('.camada:not(.transparente) h2');
        assert.match(await pagina.locator('.camada:not(.transparente) h2').first().textContent(), new RegExp(texto));
        if (botao === '#m-regras') {
          /* abas do manual de regras, com a arte dos baralhos e terrenos */
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
          /* fecha o Livro de conceitos e a ajuda; as regras continuam abertas */
          await pagina.locator('.camada:not(.transparente) [data-fechar] >> nth=-1').click();
          await pagina.locator('.ajuda-acoes [data-fechar] >> nth=0').click();
        }
        if (botao === '#m-grimorio') {
          await pagina.click('#g-lista button >> nth=3');
          assert.equal(await pagina.locator('#g-lista .lido').count(), 3); /* dropout (lido pela ajuda das ações), o primeiro e o quarto */
          await pagina.click('#g-lista button[data-id="overfit"]');
          await pagina.waitForSelector('#g-verbete .aprofundar .formula math');
          assert.match(await pagina.locator('#g-verbete').textContent(), /Para se aprofundar/);
          assert.ok(await pagina.locator('#g-verbete .aprofundar .formula math').evaluate((m) => m.getBoundingClientRect().height > 20));
          await capturar(pagina, '01b-grimorio-formulas');
        }
        if (botao === '#m-conquistas') {
          /* o retrato do professor saiu daqui (foi para o cartão dele, na aba Equipe do Sobre) */
          await pagina.waitForSelector('.conquistas-lista');
          assert.equal(await pagina.locator('#c-retrato, .guilda, .conquistas-salao canvas').count(), 0);
          await capturar(pagina, '02-conquistas');
        }
        if (botao === '#m-sobre') {
          assert.match(await pagina.locator('.versao').textContent(), /Versão \d+\.\d+\.\d+/);
          /* duas abas: "O jogo" (aberta) e "Equipe" (um cartão por pessoa; a foto do professor no cartão dele) */
          assert.deepEqual(await pagina.locator('.folha.sobre .abas [role="tab"]').allTextContents(), ['O jogo', 'Equipe']);
          assert.match(await pagina.locator('section.aba[data-aba="jogo"]').textContent(), /Yu-Gi-Oh!, UNO e Geometry Dash/);
          assert.equal(await pagina.locator('section.aba[data-aba="equipe"]').isHidden(), true);
          await pagina.click('.abas [data-aba="equipe"]');
          assert.equal(await pagina.locator('.pessoa-cartao').count(), 5);
          await pagina.waitForSelector('.pessoa-cartao[data-pessoa="peng"] .pessoa-foto canvas');
          assert.equal(await pagina.locator('.pessoa-cartao canvas').count(), 1, 'só o professor tem foto por enquanto');
          assert.equal(await pagina.locator('.pessoa-cartao[data-pessoa="diego"] .iniciais').textContent(), 'DC');
          assert.equal(await pagina.locator('.pessoa-cartao .a-caminho').count(), 4, 'os mini-CVs que faltam avisam que vão chegar');
          assert.equal(await pagina.locator('section.aba[data-aba="jogo"]').isHidden(), true);
          await capturar(pagina, '02b-sobre-equipe');
        }
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

  it('ícones de som e música: sempre à vista no menu e na mesa, com estado, alvo de 44 px, lembrados e em sincronia', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      const som = pagina.getByRole('button', { name: 'Efeitos sonoros' }), musica = pagina.getByRole('button', { name: 'Música', exact: true });
      for (const botao of [som, musica]) {
        assert.equal(await botao.getAttribute('aria-pressed'), 'true', 'começam ligados');
        const caixa = await botao.boundingBox();
        assert.ok(caixa.width >= 44 && caixa.height >= 44, 'alvo de toque: ' + JSON.stringify(caixa));
      }
      /* desligar: o estado, o ícone e a escolha (salva no progresso) mudam */
      const cheio = await som.innerHTML();
      await som.click();
      assert.equal(await som.getAttribute('aria-pressed'), 'false');
      assert.notEqual(await som.innerHTML(), cheio, 'o ícone troca (cortado quando desligado)');
      await musica.click();
      assert.equal(await musica.getAttribute('aria-pressed'), 'false');
      const salvo = () => pagina.evaluate(() => globalThis.__TRUCO_DE_TURING__.progresso);
      assert.deepEqual([(await salvo()).mudo, (await salvo()).musica], [true, false]);
      /* a mesa abre com o mesmo estado e tem os seus próprios ícones, sobre o canvas */
      await comecarPartida(pagina, { oponente: 'aleatorio' });
      const naMesa = pagina.locator('.controles-som.na-mesa .icone-som');
      assert.equal(await naMesa.count(), 2);
      assert.deepEqual(await naMesa.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-pressed'))), ['false', 'false']);
      for (const caixa of await naMesa.evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }))) {
        assert.ok(caixa.w >= 40 && caixa.h >= 40 && caixa.l >= 0 && caixa.t >= 0, 'ícone da mesa dentro da tela e com bom tamanho: ' + JSON.stringify(caixa));
      }
      /* ligar na mesa vale para tudo: progresso, o outro conjunto e a janela MENU */
      await naMesa.nth(0).click();
      assert.equal((await salvo()).mudo, false);
      await naMesa.nth(1).click();
      assert.equal((await salvo()).musica, true);
      await pagina.waitForFunction(async () => (await import('/src/interface/musica.js')).Musica.tocando());
      await naCena(pagina, 'cena.abrirMenuDaMesa();');
      assert.equal((await pagina.locator('[data-chave="som"]').textContent()), 'Som: sim');
      await pagina.locator('[data-chave="som"]').click();
      assert.deepEqual(await naMesa.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-pressed'))), ['false', 'true'], 'o botão do MENU também repinta os ícones');
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

  it('arquivo único sem rede: as fórmulas do "Para se aprofundar" aparecem desenhadas (#43)', async () => {
    /* empacota uma cópia do projeto e abre dist/truco-de-turing.html recusando tudo que vem de fora (menos o Phaser) */
    const copia = mkdtempSync(join(tmpdir(), 'truco-offline-'));
    for (const item of ['src', 'index.html', 'package.json']) cpSync(join(RAIZ, item), join(copia, item), { recursive: true });
    execFileSync(process.execPath, [join(RAIZ, 'ferramentas/empacotar.js')], { env: { ...process.env, TRUCO_RAIZ: copia } });
    const local = await subirServidor(copia);
    const jogo = await abrirJogo(local.url, { pagina: '/dist/truco-de-turing.html', semRede: true });
    const { pagina } = jogo;
    const recusados = [];
    pagina.on('requestfailed', (r) => recusados.push(new URL(r.url()).hostname));
    try {
      await esperarMenu(pagina);
      await pagina.click('#m-grimorio');
      for (const id of ['overfit', 'stackoverflow', 'transfer']) {
        await pagina.click('#g-lista button[data-id="' + id + '"]');
        await pagina.waitForSelector('#g-verbete .aprofundar .formula math');
        const medidas = await pagina.locator('#g-verbete .aprofundar math').evaluateAll((ms) => ms.map((m) => {
          const r = m.getBoundingClientRect();
          return { bloco: m.getAttribute('display') === 'block', altura: r.height, largura: r.width };
        }));
        assert.ok(medidas.some((m) => m.bloco && m.altura > 12 && m.largura > 60), id + ': fórmula em destaque desenhada');
        assert.ok(medidas.some((m) => !m.bloco && m.largura > 0), id + ': fórmula na linha desenhada');
        assert.doesNotMatch(await pagina.locator('#g-verbete').textContent(), /\\[a-z]+|\$/, id + ': sobrou LaTeX cru');
      }
      await capturar(pagina, '01c-grimorio-formulas-sem-rede');
      assert.ok(!recusados.some((h) => /jsdelivr/.test(h)), 'não pediu nada ao CDN do KaTeX');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); await local.fechar(); rmSync(copia, { recursive: true, force: true }); }
  });
});
