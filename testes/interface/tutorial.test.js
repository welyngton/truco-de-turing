/**
 * @file Testes de interface do tutorial: abre sozinho na primeira vez que se clica em Jogar, o
 * assistente fala em balões, só vale a jogada destacada, o roteiro inteiro é jogado até o fim, dá para
 * sair e refazer, e o botão fica em Como jogar.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, naCena, esperarCena, esperarMenu, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

/** Abre o jogo, clica em Jogar e espera a mesa do tutorial, com o tempo acelerado. */
async function abrirTutorial(jogo) {
  const { pagina } = jogo;
  await esperarMenu(pagina);
  await pagina.click('#m-jogar');
  await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.tutorial && cena.mao && cena.painel');
  await naCena(pagina, 'cena.time.timeScale = 8; cena.tweens.timeScale = 8;');
}

/**
 * Faz o que o passo atual pede: "Continuar" nas falas e na vez do rival, ou a jogada destacada do
 * jogador. Confere antes que o balão mostra a fala do passo. Devolve o que fez.
 */
function fazerOPasso(pagina) {
  return naCena(pagina, `
    const passo = cena.passoDoTutorial();
    if (!passo) return 'fim';
    const fala = document.querySelector('.tutorial-balao .tutorial-fala');
    if (!fala || fala.innerHTML !== passo.fala) return 'espera';
    const continuar = document.querySelector('.tutorial-balao [data-continuar]');
    if (continuar) { continuar.click(); return 'continuar'; }
    if (passo.jogador !== 0 || !(cena.ehVezDoHumano() || cena.modo === 'inicio') || cena.ocupada) return 'espera';
    const s = passo.jogada, mao = cena.mao.jogadores[0].mao;
    const cartas = (valor, n) => mao.filter((c) => c.valor === valor).slice(0, n).map((c) => c.id);
    if (s.tipo === 'inicio') cena.aoClicarNaCarta(cartas(s.valor, 1)[0]);
    else if (s.tipo === 'ativar') cena.aoClicarNoNeuronio(s.neuronio);
    else if (s.tipo === 'passar') cena.passarAVez();
    else if (s.tipo === 'dropout') { for (const id of cartas(s.valor, s.n)) cena.aoClicarNaCarta(id); cena.acionarDropout(); }
    else { for (const id of cartas(s.valor, s.n)) cena.aoClicarNaCarta(id); cena.executarAcao(s.acao); }
    return 'jogada:' + (s.acao || s.tipo);`);
}

/** Joga o roteiro até o passo `n` (deixa a mesa esperando a jogada ou a fala desse passo). */
async function ateOPasso(pagina, n) {
  for (let k = 0; k < 800; k++) {
    if (await naCena(pagina, 'return cena.tutorial.i') >= n) break;
    await fazerOPasso(pagina);
    await pagina.waitForTimeout(40);
  }
  await esperarCena(pagina, `return cena.tutorial.i === ${n} && !!document.querySelector('.tutorial-balao .tutorial-fala') && (cena.ehVezDoHumano() || cena.modo === 'inicio' || !!document.querySelector('.tutorial-balao [data-continuar]'))`);
}

describe('tutorial (interface)', () => {
  it('abre sozinho na primeira vez em Jogar, com o Percy falando num balão e a mesa de treino', async () => {
    const jogo = await abrirJogo(servidor.url);
    const { pagina } = jogo;
    try {
      await abrirTutorial(jogo);
      assert.equal(await pagina.locator('.tutorial-balao .tutorial-nome').textContent(), 'PERCY');
      assert.match(await pagina.locator('.tutorial-balao .tutorial-fala').textContent(), /Percy/);
      assert.equal(await pagina.locator('.tutorial-balao .rosto-do-assistente').count(), 1);
      assert.ok(await pagina.locator('.tutorial-balao [data-continuar]').isVisible());
      assert.ok(await pagina.locator('.tutorial-balao [data-sair]').isVisible());
      assert.equal(await pagina.locator('.folha.regras').count(), 0, 'sem a tela de regras por cima');
      const estado = await naCena(pagina, 'return { camadas: cena.mao.camadas.length, mao: cena.mao.jogadores[0].mao.length, alvo: cena.partida.alvo, visto: app.progresso.treinoVisto, feito: app.progresso.treinoFeito }');
      assert.deepEqual(estado, { camadas: 5, mao: 8, alvo: 1, visto: true, feito: false });
      assert.equal(await naCena(pagina, 'return cena.ehVezDoHumano()'), false, 'durante a fala a mesa não responde');
      await capturar(pagina, 'tutorial-1-balao');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('só vale a jogada destacada: outras cartas, neurônios e botões são recusados e o balão treme', async () => {
    const jogo = await abrirJogo(servidor.url);
    const { pagina } = jogo;
    try {
      await abrirTutorial(jogo);
      await ateOPasso(pagina, 2); /* escolha da carta de início */
      /* carta errada: nada acontece e o balão avisa */
      await naCena(pagina, 'cena.aoClicarNaCarta(cena.mao.jogadores[0].mao.find((c) => c.valor === "10").id)');
      assert.deepEqual(await naCena(pagina, 'return [cena.tutorial.i, cena.modo, cena.mao.fase]'), [2, 'inicio', 'inicio']);
      assert.equal(await pagina.locator('.tutorial-balao.aviso-do-passo').count(), 1);
      await ateOPasso(pagina, 4); /* avançar no neurônio da entrada */
      assert.deepEqual(await naCena(pagina, 'return Object.keys(cena.alvos)'), ['C0N1'], 'só o neurônio do passo fica como alvo');
      await naCena(pagina, `
        cena.aoClicarNoNeuronio('C0N0');                                      /* outro neurônio */
        cena.executarJogada({ tipo: 'ativar', jogador: 0, neuronio: 'C0N2' }); /* jogada que não é a do passo */
        cena.passarAVez(); cena.acionarDropout(); cena.executarAcao('tunagem'); cena.fazerTransfer(); cena.pedirTrucoHumano();
        cena.aoClicarNaCarta(cena.mao.jogadores[0].mao[0].id);                /* selecionar carta num passo de avançar */`);
      assert.deepEqual(await naCena(pagina, 'return [cena.tutorial.i, cena.mao.neuronios.C0N1.revelado, cena.mao.neuronios.C0N0.dono, cena.selecao.length]'), [4, false, -1, 0]);
      await capturar(pagina, 'tutorial-2-jogada-destacada');
      /* a jogada do passo funciona */
      await naCena(pagina, 'cena.aoClicarNoNeuronio("C0N1")');
      await esperarCena(pagina, 'return cena.tutorial.i === 5');
      assert.equal(await naCena(pagina, 'return cena.mao.neuronios.C0N1.dono'), 0);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('o roteiro inteiro é jogado até o fim: dropout, overfit, tunagem, early stop, passar, e o treino fica feito sem valer conquistas', async () => {
    const jogo = await abrirJogo(servidor.url);
    const { pagina } = jogo;
    try {
      await abrirTutorial(jogo);
      const nomes = [];
      for (let k = 0; k < 1500; k++) {
        const antes = await naCena(pagina, 'return cena.tutorial.i');
        const feito = await fazerOPasso(pagina);
        if (feito === 'fim') break;
        if (feito.startsWith('jogada:')) nomes.push(feito.slice(7));
        await pagina.waitForTimeout(feito === 'espera' ? 60 : 30);
        if (k === 700) assert.fail('o roteiro travou no passo ' + antes);
      }
      assert.deepEqual([...new Set(nomes)], ['inicio', 'ativar', 'dropout', 'overfit', 'tunagem', 'passar', 'earlystop']);
      await esperarCena(pagina, 'return !!document.querySelector(".camada .botao.vinho")');
      assert.match(await pagina.locator('.camada h2, .camada h3').first().textContent(), /Treino concluído/);
      const fim = await naCena(pagina, `return { fase: cena.mao.fase, somas: cena.pontuacoes.map((p) => p.total), situacoes: cena.mao.jogadores.map((j) => j.situacao),
        feito: app.progresso.treinoFeito, maos: app.progresso.maos, conquistas: Object.keys(app.progresso.desbloqueadas).length, cemiterio: cena.mao.cemiterio.length };`);
      assert.deepEqual({ fase: fim.fase, somas: fim.somas, situacoes: fim.situacoes }, { fase: 'fim', somas: [11, 9], situacoes: ['earlystop', 'earlystop'] });
      assert.equal(fim.feito, true);
      assert.equal(fim.maos, 0, 'a mão do treino não conta nas estatísticas');
      assert.equal(fim.conquistas, 0, 'nem vale conquistas');
      await capturar(pagina, 'tutorial-3-fim');
      /* "Jogar agora": uma partida de verdade, sem tutorial */
      await pagina.locator('.camada .botao.vinho').click();
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.mao && !cena.tutorial && cena.mao.camadas.length === 7');
      assert.equal(await pagina.locator('.tutorial-balao').count(), 0);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('sair do tutorial volta ao menu, o próximo Jogar vai direto à partida e o tutorial pode ser refeito em Como jogar', async () => {
    const jogo = await abrirJogo(servidor.url);
    const { pagina } = jogo;
    try {
      await abrirTutorial(jogo);
      await ateOPasso(pagina, 4);
      await pagina.click('.tutorial-balao [data-sair]');
      await pagina.locator('.camada .botao', { hasText: 'Continuar o tutorial' }).click(); /* volta ao treino */
      assert.equal(await naCena(pagina, 'return cena.tutorial.i'), 4);
      await pagina.click('.tutorial-balao [data-sair]');
      await pagina.locator('.camada .botao.vinho', { hasText: 'Sair' }).click();
      await esperarMenu(pagina);
      assert.equal(await pagina.locator('.tutorial-balao').count(), 0);
      assert.deepEqual(await naCena(pagina, 'return [app.progresso.treinoVisto, app.progresso.treinoFeito]'), [true, false]);
      /* o menu da mesa também sai do tutorial */
      await pagina.click('#m-jogar');
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.mao && !cena.tutorial');
      assert.equal(await pagina.locator('.tutorial-balao').count(), 0, 'o Jogar seguinte é uma partida normal');
      await naCena(pagina, 'cena.abrirRegrasDaMesa()');
      await pagina.locator('[data-opcao="regras"]').click();
      assert.equal(await pagina.locator('#r-tutorial').count(), 1, 'Como jogar tem o botão do tutorial');
      await pagina.click('#r-tutorial');
      /* dentro de uma partida, pergunta antes de abandoná-la */
      await pagina.locator('.camada .botao.vinho:not(#r-tutorial)', { hasText: 'Fazer o tutorial' }).click();
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.tutorial && cena.mao');
      assert.equal(await naCena(pagina, 'return cena.tutorial.i'), 0);
      /* o menu da mesa (Sair da partida) pergunta pelo tutorial, não pela partida */
      await naCena(pagina, 'cena.perguntarSeVoltaAoMenu()');
      assert.match(await pagina.locator('.camada h2, .camada h3').first().textContent(), /Sair do tutorial/);
      await pagina.locator('.camada .botao.vinho', { hasText: 'Sair' }).click();
      await esperarMenu(pagina);
      /* do menu, o botão de Como jogar abre o tutorial direto */
      await pagina.click('#m-regras');
      await pagina.click('#r-tutorial');
      await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.tutorial && cena.mao');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('numa sala online não há tutorial: o Jogar não o abre e Como jogar não oferece o botão', async () => {
    const jogo = await abrirJogo(servidor.url);
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      const resposta = await pagina.evaluate(async () => {
        const app = globalThis.__TRUCO_DE_TURING__, { abrirRegras } = await import('/src/interface/telas/regras.js');
        const antes = { deve: app.deveFazerOTutorial() };
        app.online = { sala: {} };
        const depois = { deve: app.deveFazerOTutorial() };
        const painel = abrirRegras(app);
        const botao = painel.elemento.querySelectorAll('#r-tutorial').length;
        painel.fechar(); app.online = null;
        app.progresso.maos = 3; /* quem já jogou não vê o treino automático */
        return { antes, depois, botao, veterano: app.deveFazerOTutorial() };
      });
      assert.deepEqual(resposta, { antes: { deve: true }, depois: { deve: false }, botao: 0, veterano: false });
    } finally { await jogo.fechar(); }
  });
});
