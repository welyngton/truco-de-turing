/**
 * @file Partida online entre duas abas do mesmo navegador (sala pelo BroadcastChannel): criar a
 * sala, entrar pelo código, começar, jogar uma mão inteira com truco e conferir que as duas
 * telas terminam com o mesmo estado; depois, uma aba fecha e a outra termina contra o computador.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, abrirOutraAba, esperarMenu, naCena, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

/** Prepara o menu: sem tutorial, opções fixas. */
async function prepararMenu(pagina) {
  await esperarMenu(pagina);
  await pagina.evaluate(() => {
    const app = globalThis.__TRUCO_DE_TURING__;
    app.progresso.tutorialVisto = true;
    Object.assign(app.opcoes, { jogadores: 2, humanos: 1, oponente: 'aleatorio', baralho: 'classico', terreno: 'neutro', inicio: 'revela-volta', alvo: 12, arquitetura: 'padrao', baralhos: 1 });
  });
}

/**
 * Um passo do jogador desta aba: escolhe a carta de início, responde caixas (truco), ativa o
 * primeiro neurônio possível ou passa. `trucar` pede truco uma vez na primeira vez dele.
 */
const PASSO = `
  if (!cena || !cena.mao) return 'carregando';
  cena.time.timeScale = 6; cena.tweens.timeScale = 6;
  if (document.querySelector('#r-proxima')) return 'fim';
  const vinho = document.querySelector('.camada .botao.vinho');
  if (vinho) { vinho.click(); return 'caixa'; }
  if (cena.mao.fase === 'inicio' && cena.modo === 'inicio') { cena.aoClicarNaCarta(cena.mao.jogadores[cena.quemVe].mao[0].id); return 'inicio'; }
  if (!cena.ehVezDoHumano()) return 'espera';
  if (arg && !cena.jaTrucou && cena.painel.truco.habilitado) { cena.jaTrucou = true; cena.pedirTrucoHumano(); return 'truco'; }
  const alvos = Object.keys(cena.alvos);
  if (alvos.length) { cena.aoClicarNoNeuronio(alvos[0]); return 'ativou'; }
  if (cena.painel.botaoPassar.habilitado) { cena.passarAVez(); return 'passou'; }
  return 'nada';`;

/** Diagnóstico de uma aba: onde a mesa está parada. */
const DIAGNOSTICO = `return { fase: cena.mao.fase, vez: cena.mao.vez, tipos: cena.mao.jogadores.map((j) => j.tipo), ocupada: cena.ocupada,
  aguardandoRede: cena.aguardandoRede, fila: cena.filaOnline.map((a) => a.tipo + '@' + a.mao), entregue: app.online && app.online.sala.entregue,
  pedido: cena.partida.pedido, modo: cena.modo, caixas: [...document.querySelectorAll('.camada h2')].map((h) => h.textContent) };`;

/**
 * Joga nas abas até todas mostrarem o resultado. A máquina dos testes pode estar lenta (as outras
 * suítes rodam ao mesmo tempo), então o limite é de progresso: falha se nenhuma ação nova chegar
 * por 60 s, com o diagnóstico de cada aba.
 */
async function jogarAteOFim(paginas, trucar = []) {
  let ultimo = -1, desde = Date.now();
  for (;;) {
    const estados = [];
    for (const [k, p] of paginas.entries()) estados.push(await naCena(p, PASSO, !!trucar[k]));
    if (estados.every((e) => e === 'fim')) return;
    const entregue = await naCena(paginas[0], 'return app.online ? app.online.sala.entregue : 0;');
    if (entregue !== ultimo) { ultimo = entregue; desde = Date.now(); }
    if (Date.now() - desde > 60000) {
      const diag = [];
      for (const p of paginas) diag.push(await naCena(p, DIAGNOSTICO));
      throw new Error('a mão online não terminou: ' + JSON.stringify(diag));
    }
    await paginas[0].waitForTimeout(120);
  }
}

/** Estado do motor visto por uma aba. */
const estado = (p) => naCena(p, 'return JSON.stringify({ redes: cena.mao.nd.nets, mesa: cena.mao.nd.layers, somas: cena.mao.resultado && cena.mao.resultado.somas, valor: cena.partida.valor });');

describe('partida online entre abas', () => {
  it('criar, entrar pelo código, jogar uma mão com truco e terminar igual nas duas telas', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    try {
      const a = jogo.pagina;
      await prepararMenu(a);
      const b = (await abrirOutraAba(jogo, servidor.url, '?res=1'));
      await prepararMenu(b.pagina);
      /* Ana cria a sala */
      await a.click('#m-online');
      await a.fill('#o-nome', 'Ana');
      await a.click('#o-criar');
      await a.waitForSelector('#o-espera:not([hidden])');
      const codigo = (await a.locator('#o-codigo-sala').textContent()).trim();
      assert.match(codigo, /^[A-Z0-9]{5}$/);
      assert.equal(await a.locator('#o-comecar').isDisabled(), true);
      /* Beto entra com o código */
      await b.pagina.click('#m-online');
      await b.pagina.fill('#o-nome', 'Beto');
      await b.pagina.fill('#o-codigo', codigo);
      await b.pagina.click('#o-entrar');
      await a.waitForFunction(() => document.querySelectorAll('#o-cadeiras li.humano').length === 2);
      await b.pagina.waitForSelector('#o-cadeiras li.humano >> nth=1');
      await capturar(a, '30-sala-online');
      await a.click('#o-comecar');
      for (const p of [a, b.pagina]) await p.waitForFunction(() => { const c = globalThis.__TRUCO_DE_TURING__.jogo.scene.getScene('Mesa'); return c && c.sys.isActive() && c.mao; });
      assert.deepEqual(await naCena(a, 'return [cena.cadeiraOnline(), cena.mao.jogadores.map((j) => j.nome)]'), [0, ['Ana (você)', 'Beto']]);
      assert.deepEqual(await naCena(b.pagina, 'return [cena.cadeiraOnline(), cena.mao.jogadores.map((j) => j.nome)]'), [1, ['Ana', 'Beto (você)']]);
      /* as duas telas criaram a mesma mão */
      assert.equal(await naCena(a, 'return JSON.stringify(cena.mao.nd.layers)'), await naCena(b.pagina, 'return JSON.stringify(cena.mao.nd.layers)'));
      await jogarAteOFim([a, b.pagina], [true, false]);
      await capturar(a, '31-online-resultado');
      assert.equal(await estado(a), await estado(b.pagina));
      assert.deepEqual(jogo.erros, []);
      assert.deepEqual(b.erros, []);
    } finally { await jogo.fechar(); }
  });

  for (const [nome, arg_antes] of [['no meio da mão', false], ['antes de escolher a carta de quem começa', true]]) {
  it('quem fecha a aba ' + nome + ' vira computador e a outra tela termina a mão', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    try {
      const a = jogo.pagina;
      await prepararMenu(a);
      const b = await abrirOutraAba(jogo, servidor.url, '?res=1');
      await prepararMenu(b.pagina);
      await a.click('#m-online'); await a.fill('#o-nome', 'Ana'); await a.click('#o-criar');
      await a.waitForSelector('#o-espera:not([hidden])');
      const codigo = (await a.locator('#o-codigo-sala').textContent()).trim();
      await b.pagina.click('#m-online'); await b.pagina.fill('#o-nome', 'Beto'); await b.pagina.fill('#o-codigo', codigo); await b.pagina.click('#o-entrar');
      await a.waitForFunction(() => document.querySelectorAll('#o-cadeiras li.humano').length === 2);
      await a.click('#o-comecar');
      for (const p of [a, b.pagina]) await p.waitForFunction(() => { const c = globalThis.__TRUCO_DE_TURING__.jogo.scene.getScene('Mesa'); return c && c.mao; });
      if (arg_antes) { /* cai antes de escolher a carta de quem começa */ } else {
        for (let i = 0; i < 6; i++) { await naCena(a, PASSO, false); await naCena(b.pagina, PASSO, false); await a.waitForTimeout(150); }
      }
      await b.pagina.close();
      /* sem sinal de vida por 12 s, a cadeira do Beto passa para o computador */
      await a.waitForFunction(() => globalThis.__TRUCO_DE_TURING__.jogo.scene.getScene('Mesa').mao.jogadores[1].tipo === 'oponente', null, { timeout: 30000 });
      await jogarAteOFim([a]);
      assert.match(await naCena(a, 'return cena.mao.jogadores[1].nome'), /Beto \(computador\)/);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
  }
});
