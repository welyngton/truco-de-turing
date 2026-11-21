/**
 * @file Testes de interface do tutorial (issues #137 a #143): a oferta na primeira vez (aceitar e
 * pular), o botão em Como jogar, o roteiro inteiro de ponta a ponta com o balão do Percy, o
 * bloqueio de jogadas fora do roteiro, a garantia de que nada é gravado e o posicionamento do
 * balão em 640x360, 844x390 e 1280x800.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, esperarMenu, naCena, esperarCena, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

/** Espera a mesa do tutorial pronta e acelera o tempo dela. */
async function esperarTutorial(pagina) {
  await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.tutorial && cena.assistente && cena.mao');
  await naCena(pagina, 'cena.time.timeScale = 10; cena.tweens.timeScale = 10;');
}

/** Espera o balão do Percy aparecer (ou o tutorial acabar) e devolve o que ele mostra. */
async function esperarBalao(pagina) {
  await pagina.waitForFunction(() => {
    const c = globalThis.__TRUCO_DE_TURING__.jogo.scene.getScene('Mesa');
    return !c.tutorial || c.tutorial.terminou || !document.querySelector('.assistente-balao').hidden;
  }, null, { timeout: 60000 });
  return naCena(pagina, `
    const t = cena.tutorial; if (!t || t.terminou) return null;
    const b = document.querySelector('.assistente-balao'), r = b.getBoundingClientRect();
    const aneis = [...document.querySelectorAll('.assistente-anel')].map((a) => a.getBoundingClientRect()).map((x) => ({ x: x.x, y: x.y, l: x.width, a: x.height }));
    return { id: cena.passoDaFala.id, atual: t.passo.id, dialogo: t.ehDialogo(), jogada: t.ehDoJogador() && cena.passoDaFala === t.passo,
      caixa: { x: r.x, y: r.y, l: r.width, a: r.height }, aneis, livre: b.dataset.livre, tela: { l: innerWidth, a: innerHeight },
      botao: !document.querySelector('.assistente-proximo').hidden, texto: document.querySelector('.assistente-texto').textContent };`);
}

/** Faz a jogada que o passo atual espera, pela mesa (cartas e botões, como o jogador faria). */
const jogarOPasso = (pagina) => naCena(pagina, `
  const t = cena.tutorial, e = t.passo.jogadaEsperada;
  const minha = (r) => cena.mao.jogadores[0].mao.find((c) => c.id.split('#')[0] === r && !cena.selecao.includes(c.id)).id;
  if (e.tipo === 'inicio') cena.aoClicarNaCarta(minha(e.carta));
  else if (e.tipo === 'ativar') cena.aoClicarNoNeuronio(e.neuronio);
  else if (e.tipo === 'empilhar') { for (const r of e.cartas) cena.aoClicarNaCarta(minha(r)); cena.executarAcao(t.acaoEsperada()); }
  else if (e.tipo === 'dropout') { for (const r of e.pagamento) cena.aoClicarNaCarta(minha(r)); cena.acionarDropout(); }
  else if (e.tipo === 'passar') cena.passarAVez();`);

/**
 * Percorre o tutorial inteiro (Próximo nos diálogos, jogadas guiadas pela mesa) e devolve a lista
 * dos passos vistos. `aoVer(estado)` roda a cada fala, com o balão já na tela; devolver 'parar'
 * interrompe o percurso nessa fala.
 */
async function percorrer(pagina, aoVer) {
  const vistos = [];
  for (let i = 0; i < 120; i++) {
    const st = await esperarBalao(pagina);
    if (!st) break;
    vistos.push(st.id);
    if (aoVer && (await aoVer(st)) === 'parar') break;
    if (!st.jogada) await pagina.click('.assistente-proximo'); else await jogarOPasso(pagina);
    await pagina.waitForFunction((id) => {
      const c = globalThis.__TRUCO_DE_TURING__.jogo.scene.getScene('Mesa');
      return !c.tutorial || c.tutorial.terminou || c.passoDaFala.id !== id;
    }, st.id, { timeout: 60000 });
  }
  return vistos;
}

/** Abre o jogo no menu e deixa o aparelho como se fosse a primeira visita. */
async function abrirNoMenu(opcoes) {
  const jogo = await abrirJogo(servidor.url, opcoes);
  await esperarMenu(jogo.pagina);
  return jogo;
}

describe('tutorial: oferta na primeira vez e botão em Como jogar (#143)', () => {
  it('Jogar na primeira vez oferece o tutorial; aceitar roda o roteiro inteiro e depois começa a partida de verdade', async () => {
    const jogo = await abrirNoMenu();
    const { pagina } = jogo;
    try {
      await pagina.evaluate(async () => {
        globalThis.eventos = [];
        const analise = await import('/src/interface/analise.js');
        analise.aoRegistrarEvento((nome) => globalThis.eventos.push(nome));
      });
      const progresso = () => pagina.evaluate(() => { const { tutorialVisto, ...resto } = globalThis.__TRUCO_DE_TURING__.progresso; return JSON.stringify(resto); });
      await pagina.click('#m-jogar');
      assert.match(await pagina.textContent('.camada:last-child'), /Primeira vez por aqui/);
      await pagina.click('.camada .botao:has-text("Fazer o tutorial")');
      await esperarTutorial(pagina);
      const antes = await progresso();
      let naDespedida = null;
      const vistos = await percorrer(pagina, async (st) => { if (st.id === 'despedida') naDespedida = await progresso(); });
      assert.equal(naDespedida, antes, 'durante o tutorial inteiro, estatísticas, conquistas e verbetes não mudaram');
      assert.ok(vistos.length >= 29, 'o roteiro inteiro passou: ' + vistos.length);
      assert.deepEqual(vistos.slice(0, 2), ['boas-vindas', 'objetivo']);
      assert.equal(vistos.at(-1), 'despedida');
      /* terminou: a mesa nova é uma partida normal (sem tutorial) e o tutorial ficou como visto */
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && !cena.tutorial && cena.mao && cena.painel');
      assert.equal(await pagina.evaluate(() => globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto), true);
      assert.equal(await pagina.$('#assistente'), null, 'o assistente saiu da tela');
      /* só a partida de verdade gerou evento */
      const eventos = await pagina.evaluate(() => globalThis.eventos);
      assert.deepEqual(eventos.filter((e) => !e.startsWith('menu')), ['jogo_iniciado'], 'só a partida real conta: ' + eventos);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('pular na oferta marca como visto, começa a partida e não oferece de novo', async () => {
    const jogo = await abrirNoMenu();
    const { pagina } = jogo;
    try {
      await pagina.click('#m-jogar');
      await pagina.click('.camada .botao:has-text("Pular tutorial")');
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && !cena.tutorial && cena.mao');
      assert.equal(await pagina.evaluate(() => globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto), true);
      assert.equal(await naCena(pagina, 'return document.querySelector(".camada") === null'), true, 'sem Regras abrindo sozinha');
      await naCena(pagina, 'cena.app.irParaMenu();');
      await esperarMenu(pagina);
      await pagina.click('#m-jogar');
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.mao && cena.painel');
      assert.equal(await pagina.$('.camada .botao:has-text("Fazer o tutorial")'), null, 'segunda vez sem oferta');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('Como jogar tem o botão Fazer o tutorial (mesmo já visto); terminar volta ao menu; na mesa não há o botão', async () => {
    const jogo = await abrirNoMenu();
    const { pagina } = jogo;
    try {
      await pagina.evaluate(() => { globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto = true; });
      await pagina.click('#m-regras');
      await pagina.click('#r-tutorial');
      await esperarTutorial(pagina);
      assert.equal(await naCena(pagina, 'return cena.dadosDoTutorial().origem'), 'regras');
      await percorrer(pagina);
      await esperarMenu(pagina);
      assert.equal(await naCena(pagina, 'return !cena || !cena.sys.isActive()'), true, 'voltou ao menu');
      /* na mesa, a janela de regras não oferece o tutorial */
      await pagina.click('#m-jogar');
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.mao && cena.painel');
      await naCena(pagina, 'cena.abrirRegrasDaMesa();');
      await pagina.click('.camada [data-opcao="regras"]');
      assert.equal(await pagina.$('#r-tutorial'), null);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('pular durante o tutorial pede confirmação, marca como visto e segue para a partida', async () => {
    const jogo = await abrirNoMenu();
    const { pagina } = jogo;
    try {
      await pagina.click('#m-jogar');
      await pagina.click('.camada .botao:has-text("Fazer o tutorial")');
      await esperarTutorial(pagina);
      await esperarBalao(pagina);
      await pagina.click('.assistente-pular');
      await pagina.click('.camada .botao:has-text("Continuar o tutorial")');
      assert.equal(await naCena(pagina, 'return !!cena.tutorial && !cena.encerrada'), true, 'continuar mantém o tutorial');
      await pagina.click('.assistente-pular');
      await pagina.click('.camada .botao.vinho');
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && !cena.tutorial && cena.mao && cena.painel');
      assert.equal(await pagina.evaluate(() => globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto), true);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});

describe('tutorial: a mesa só aceita o que o roteiro pede (#137)', () => {
  it('cliques fora do roteiro são recusados; nada muda e o balão balança', async () => {
    const jogo = await abrirNoMenu();
    const { pagina } = jogo;
    try {
      await pagina.click('#m-jogar');
      await pagina.click('.camada .botao:has-text("Fazer o tutorial")');
      await esperarTutorial(pagina);
      /* num diálogo, nada da mesa responde */
      await esperarBalao(pagina);
      assert.equal(await naCena(pagina, `
        const antes = JSON.stringify(cena.mao);
        for (const c of cena.mao.jogadores[0].mao) cena.aoClicarNaCarta(c.id);
        cena.aoClicarNoNeuronio('C0N0'); cena.pedirTrucoHumano(); cena.abrirRegrasDaMesa(); cena.abrirMenuDaMesa(); cena.passarAVez();
        return antes === JSON.stringify(cena.mao) && !document.querySelector('.camada') && !cena.partida.pedido && cena.tutorial.passo.id === 'boas-vindas';`), true);
      /* na jogada guiada, só a esperada passa */
      await percorrer(pagina, (st) => (st.id === 'primeira-jogada' ? 'parar' : undefined));
      await pagina.waitForFunction(() => globalThis.__TRUCO_DE_TURING__.jogo.scene.getScene('Mesa').ehVezDoHumano());
      assert.equal(await naCena(pagina, `
        cena.aoClicarNoNeuronio('C0N0'); cena.aoClicarNoNeuronio('C0N2');
        const intacta = !cena.mao.neuronios.C0N0.revelado && !cena.mao.neuronios.C0N2.revelado && cena.tutorial.passo.id === 'primeira-jogada';
        cena.aoClicarNaCarta(cena.mao.jogadores[0].mao[0].id);
        return intacta && cena.selecao.length === 0;`), true, 'carta e neurônios errados recusados');
      assert.equal(await pagina.evaluate(() => document.querySelector('.assistente-balao').classList.contains('sacudindo')), true, 'o balão balançou');
      await naCena(pagina, 'cena.aoClicarNoNeuronio("C0N1");');
      await esperarBalao(pagina);
      assert.equal(await naCena(pagina, 'return cena.mao.neuronios.C0N1.revelado'), true, 'o neurônio certo passa');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});

describe('tutorial: o balão do Percy não cobre o que destaca (#138)', () => {
  for (const [nome, viewport] of [['celular 640x360', { width: 640, height: 360 }], ['celular 844x390', { width: 844, height: 390 }], ['computador 1280x800', { width: 1280, height: 800 }]]) {
    it(nome + ': em todos os passos o balão fica dentro da tela e longe dos destaques', async () => {
      const jogo = await abrirNoMenu({ viewport });
      const { pagina } = jogo;
      try {
        await pagina.evaluate(() => { globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto = true; });
        await pagina.click('#m-regras');
        await pagina.click('#r-tutorial');
        await esperarTutorial(pagina);
        const vistos = await percorrer(pagina, async (st) => {
          const { caixa, tela, aneis } = st;
          assert.ok(caixa.x >= 0 && caixa.y >= 0 && caixa.x + caixa.l <= tela.l + 1 && caixa.y + caixa.a <= tela.a + 1, st.id + ': balão dentro da tela ' + JSON.stringify(caixa));
          assert.equal(st.livre, '1', st.id + ': havia lugar sem cobrir os destaques');
          for (const r of aneis) assert.ok(!(caixa.x < r.x + r.l && caixa.x + caixa.l > r.x && caixa.y < r.y + r.a && caixa.y + caixa.a > r.y), st.id + ': balão cobre um destaque');
          assert.ok(st.texto.length > 20, st.id + ': tem fala');
          await pagina.waitForTimeout(250);
          await capturar(pagina, 'tutorial-' + st.id + '-' + viewport.width + 'x' + viewport.height);
        });
        assert.ok(vistos.length >= 29);
        assert.deepEqual(jogo.erros, []);
      } finally { await jogo.fechar(); }
    });
  }
});
