/**
 * @file Testes de interface: mãos inteiras contra cada oponente, com baralhos, terrenos e formas
 * de início diferentes; partida entre duas pessoas no mesmo aparelho; tela de resultado, revisão
 * da mão, próxima mão, nova partida e volta ao menu.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, comecarPartida, jogarAteOResultado, naCena, esperarMenu, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

/** Confere a tela de resultado, abre a revisão e volta. */
async function conferirResultadoERevisao(pagina, prefixo) {
  await pagina.waitForSelector('#r-proxima');
  const titulo = await pagina.locator('.folha h2').first().textContent();
  assert.match(titulo, /vence|venceu|campeão/i);
  await capturar(pagina, prefixo + '-resultado');
  await pagina.click('#r-revisar');
  await pagina.waitForSelector('.revisao .curva-svg, .revisao .linha-do-tempo');
  assert.ok(await pagina.locator('.linha-do-tempo li').count() > 3);
  await capturar(pagina, prefixo + '-revisao');
  await pagina.click('.revisao .botao.vinho');
  await pagina.waitForSelector('#r-proxima');
}

const CENARIOS = [
  { nome: 'Zé do Ruído · clássico · neutro · revela e volta', escolhas: { oponente: 'aleatorio', baralho: 'classico', terreno: 'neutro', inicio: 'revela-volta', partida: '12' } },
  { nome: 'Gradiente Guloso · truco · montanha · revela e descarta', escolhas: { oponente: 'guloso', baralho: 'truco', terreno: 'montanha', inicio: 'revela-descarta', partida: '12' } },
  { nome: 'Mestre Monte Carlo · fraternidade · pântano · sorteio', escolhas: { oponente: 'montecarlo', baralho: 'fraternidade', terreno: 'pantano', inicio: 'sorteio', partida: '12' } },
];

describe('mãos completas contra o computador', () => {
  for (const [i, cenario] of CENARIOS.entries()) {
    it(cenario.nome, async () => {
      const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
      const { pagina } = jogo;
      try {
        await comecarPartida(pagina, cenario.escolhas);
        if (i === 0) await capturar(pagina, '05-mesa-inicio');
        const passos = await jogarAteOResultado(pagina);
        assert.ok(passos > 3);
        await conferirResultadoERevisao(pagina, String(6 + i * 2).padStart(2, '0') + '-' + cenario.escolhas.oponente);
        /* próxima mão da mesma partida */
        await pagina.click('#r-proxima');
        await naCena(pagina, 'cena.time.timeScale = 8; cena.tweens.timeScale = 8;');
        const numero = await naCena(pagina, 'return cena.partida.numeroMao');
        assert.ok(numero >= 1 || (await naCena(pagina, 'return cena.historicoDaPartida.length')) === 0);
        await jogarAteOResultado(pagina);
        await pagina.click('#r-menu');
        await esperarMenu(pagina);
        assert.deepEqual(jogo.erros, []);
      } finally { await jogo.fechar(); }
    });
  }
});

describe('mesa dinâmica: arquiteturas, 3 a 5 jogadores e vários baralhos', () => {
  const MESAS = [
    { nome: '4 jogadores (2 humanos e 2 Zé do Ruído), arquitetura profunda, 2 baralhos', opcoes: { jogadores: 4, humanos: 2, oponente: 'aleatorio', arquitetura: 'profunda', baralhos: 2 }, captura: '21-mesa-4-jogadores' },
    { nome: '5 jogadores contra o Gradiente Guloso, arquitetura larga', opcoes: { jogadores: 5, humanos: 1, oponente: 'guloso', arquitetura: 'larga', baralhos: 1 }, captura: '22-mesa-5-jogadores' },
    { nome: '3 jogadores, arquitetura curta, Pântano', opcoes: { jogadores: 3, humanos: 1, oponente: 'aleatorio', arquitetura: 'curta', baralhos: 1, terreno: 'pantano' }, captura: '23-mesa-3-jogadores' },
  ];
  for (const mesa of MESAS) {
    it(mesa.nome, async () => {
      const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
      const { pagina } = jogo;
      try {
        await esperarMenu(pagina);
        /* pelo menu, como o jogador faria: o menu lê os campos ao clicar em Jogar */
        await comecarPartida(pagina, { ...mesa.opcoes, partida: '12' });
        const n = mesa.opcoes.jogadores;
        const formato = await naCena(pagina, `return { jogadores: cena.mao.jogadores.length, humanos: cena.mao.jogadores.filter((j) => j.tipo === 'humano').length,
          camadas: cena.mao.camadas.length, mao: cena.mao.jogadores[0].mao.length, blocos: cena.painel.blocos.length, truco: cena.painel.truco.habilitado };`);
        assert.equal(formato.jogadores, n);
        assert.equal(formato.humanos, mesa.opcoes.humanos);
        assert.equal(formato.blocos, n);
        assert.equal(formato.camadas, mesa.opcoes.arquitetura === 'profunda' ? 9 : mesa.opcoes.arquitetura === 'curta' ? 5 : 7);
        assert.ok(formato.mao >= 4 * mesa.opcoes.baralhos);
        assert.equal(formato.truco, false); /* truco só entre 2 jogadores */
        await jogarAteOResultado(pagina, { limite: 700 });
        await capturar(pagina, mesa.captura);
        assert.equal(await pagina.locator('.resultado-grade .rede').count(), n);
        await conferirResultadoERevisao(pagina, mesa.captura);
        assert.equal(await pagina.locator('.resultado-grade .rede').count(), n);
        assert.deepEqual(jogo.erros, []);
      } finally { await jogo.fechar(); }
    });
  }
});

describe('duas pessoas e mão única', () => {
  it('duas pessoas no mesmo aparelho (yin-yang, oceano): o aparelho troca de mãos entre as vezes', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { humanos: 2, baralho: 'yinyang', terreno: 'oceano', inicio: 'revela-volta' }); /* o menu agora tem o campo "Pessoas" */
      /* conta as trocas de aparelho */
      await naCena(pagina, 'const original = cena.passarAparelho; cena.trocas = 0; cena.passarAparelho = function (...a) { this.trocas++; return original.apply(this, a); };');
      await jogarAteOResultado(pagina);
      await capturar(pagina, '12-dois-humanos-resultado');
      assert.equal(await naCena(pagina, 'return cena.variosHumanos && cena.humanos'), 2); /* o antigo "2 humanos" do menu vira humanos: 2 */
      assert.ok(await naCena(pagina, 'return cena.trocas') > 2, 'pede para passar o aparelho');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('mão única sem truco (Power BI): "Nova partida" recomeça o placar', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'powerbi', terreno: 'neutro', inicio: 'sorteio', partida: '1' });
      assert.equal(await naCena(pagina, 'return cena.painel.truco.habilitado'), false);
      await jogarAteOResultado(pagina);
      assert.match(await pagina.locator('#r-proxima').textContent(), /Nova partida/);
      await pagina.click('#r-proxima');
      await naCena(pagina, 'cena.time.timeScale = 8; cena.tweens.timeScale = 8;');
      assert.deepEqual(await naCena(pagina, 'return cena.partida.tentos'), [0, 0]);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
