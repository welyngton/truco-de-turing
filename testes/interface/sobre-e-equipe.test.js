/**
 * @file Testes de interface da tela Sobre em duas abas (issue #134) e da aba Equipe (issue #135):
 * abre em "O jogo", troca de aba com clique e com o teclado, a altura não pula, a rolagem funciona,
 * o professor aparece em moldura só na Equipe e o quadro de Conquistas ficou sem o retrato, em
 * 640x360, 844x390 e 1280x800.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, esperarMenu, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

const TELAS = [{ width: 640, height: 360 }, { width: 844, height: 390 }, { width: 1280, height: 800 }];
const folha = (pagina) => pagina.locator('.camada:not(.transparente) .folha.sobre');

describe('tela Sobre em abas', () => {
  it('abre em "O jogo", troca de aba por clique e teclado, mantém a altura e rola, em 3 tamanhos', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      for (const tela of TELAS) {
        await pagina.setViewportSize(tela);
        await pagina.click('#m-sobre');
        await pagina.waitForSelector('.folha.sobre');
        assert.equal(await pagina.locator('.sobre [role=tab][aria-selected=true]').textContent(), 'O jogo');
        assert.equal(await pagina.locator('.sobre .autores').isVisible(), false, 'autores só na Equipe');
        const alturaJogo = await folha(pagina).evaluate((f) => f.getBoundingClientRect().height);
        await capturar(pagina, `44-sobre-o-jogo-${tela.width}x${tela.height}`);
        /* seta para a direita na aba focada abre a Equipe e leva o foco junto */
        await pagina.locator('.sobre [role=tab][aria-selected=true]').focus();
        await pagina.keyboard.press('ArrowRight');
        assert.equal(await pagina.locator('.sobre [role=tab][aria-selected=true]').textContent(), 'Equipe');
        assert.equal(await pagina.evaluate(() => document.activeElement.textContent), 'Equipe');
        await pagina.waitForSelector('.equipe-retrato.com-foto canvas');
        assert.equal(await pagina.locator('.equipe-pessoa').count(), 5);
        assert.equal(await pagina.locator('.sobre .autores').isVisible(), true);
        assert.equal(await pagina.locator('section.aba[data-aba=jogo]').isVisible(), false);
        const alturaEquipe = await folha(pagina).evaluate((f) => f.getBoundingClientRect().height);
        assert.ok(Math.abs(alturaJogo - alturaEquipe) < 2, `${tela.width}x${tela.height}: a altura pulou (${alturaJogo} → ${alturaEquipe})`);
        await capturar(pagina, `45-sobre-equipe-${tela.width}x${tela.height}`);
        /* a folha rola até o fim da aba e o botão Fechar fica alcançável */
        await folha(pagina).evaluate((f) => { f.scrollTop = f.scrollHeight; });
        assert.equal(await pagina.locator('.camada:not(.transparente) .folha.sobre >> text=Fechar').last().isVisible(), true);
        await pagina.keyboard.press('Home');
        assert.equal(await pagina.locator('.sobre [role=tab][aria-selected=true]').textContent(), 'O jogo');
        await pagina.keyboard.press('End');
        assert.equal(await pagina.locator('.sobre [role=tab][aria-selected=true]').textContent(), 'Equipe');
        /* fechar */
        await pagina.click('.camada:not(.transparente) .folha.sobre [data-fechar] >> nth=-1');
        await pagina.waitForSelector('.folha.sobre', { state: 'detached' });
      }
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('Conquistas não mostra mais o retrato do professor e a lista usa toda a largura', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      for (const tela of TELAS) {
        await pagina.setViewportSize(tela);
        await pagina.click('#m-conquistas');
        await pagina.waitForSelector('.conquistas-lista .conquista');
        assert.equal(await pagina.locator('.retrato, #c-retrato, .guilda').count(), 0);
        const { lista, folha: larguraDaFolha } = await pagina.evaluate(() => ({
          lista: document.querySelector('.conquistas-principal').getBoundingClientRect().width,
          folha: document.querySelector('.folha.larga').getBoundingClientRect().width,
        }));
        assert.ok(lista > larguraDaFolha * 0.8, `${tela.width}x${tela.height}: a lista deveria ocupar a folha (${lista} de ${larguraDaFolha})`);
        await capturar(pagina, `46-conquistas-sem-retrato-${tela.width}x${tela.height}`);
        await pagina.click('.camada:not(.transparente) [data-fechar] >> nth=0');
      }
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
