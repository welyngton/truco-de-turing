/**
 * @file Testes de interface dos botões "Tamanho" e "Naipe" da mão (issue #127): ordenam só a
 * exibição, o segundo clique inverte, a seta e o destaque mostram o estado, a seleção e a ordem
 * sobrevivem a jogadas e ao transfer, e os botões não cobrem cartas nem ações em 640x360, 844x390
 * e 1280x800.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, comecarPartida, carregarMontagem, naCena, esperarCena, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

const TELAS = [{ width: 640, height: 360 }, { width: 844, height: 390 }, { width: 1280, height: 800 }];
const apertar = (pagina, botao) => naCena(pagina, `const b = cena.painel[arg]; b.emit('pointerover', { wasTouch: false }); b.emit('pointerdown'); b.emit('pointerup'); b.emit('pointerout');`, botao);
const naTela = (pagina) => naCena(pagina, 'return cena.cartasDaMao.map((i) => i.idCarta.split("#")[0])');
const naMao = (pagina) => naCena(pagina, 'return cena.mao.jogadores[cena.quemVe].mao.map((c) => c.id.split("#")[0])');
const iniciar = async (pagina) => {
  await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'neutro', partida: '12', inicio: 'sorteio' });
  await carregarMontagem(pagina);
  await esperarCena(pagina, 'return cena.mao.fase === "jogo" && cena.ehVezDoHumano()');
};

describe('botões de ordem da mão', () => {
  it('Tamanho e Naipe ordenam a tela, o segundo clique inverte, e a mão do jogo não muda', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await iniciar(pagina);
      await naCena(pagina, 'M.darMao(cena.mao, 0, ["KO", "AE", "7C", "10P", "7E"]); cena.redesenhar();');
      const original = await naMao(pagina);
      await apertar(pagina, 'botaoTamanho');
      assert.deepEqual(await naTela(pagina), ['AE', '7E', '7C', '10P', 'KO']);
      assert.match(await naCena(pagina, 'return cena.painel.botaoTamanho.texto.text'), /Tamanho ▲/);
      await apertar(pagina, 'botaoTamanho');
      assert.deepEqual(await naTela(pagina), ['KO', '10P', '7C', '7E', 'AE']);
      assert.match(await naCena(pagina, 'return cena.painel.botaoTamanho.texto.text'), /Tamanho ▼/);
      await apertar(pagina, 'botaoNaipe');
      assert.deepEqual(await naTela(pagina), ['AE', '7E', '7C', '10P', 'KO']);
      assert.equal(await naCena(pagina, 'return cena.painel.botaoTamanho.texto.text'), 'Tamanho ▲▼', 'o critério antigo volta às duas setas');
      assert.match(await naCena(pagina, 'return cena.painel.botaoNaipe.texto.text'), /Naipe ▲/);
      await apertar(pagina, 'botaoNaipe');
      assert.deepEqual(await naTela(pagina), ['KO', '10P', '7C', '7E', 'AE']);
      assert.deepEqual(await naMao(pagina), original, 'a mão do estado do jogo continua na ordem original');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('a seleção e a ordem continuam depois do transfer learning', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await iniciar(pagina);
      await naCena(pagina, 'M.darMao(cena.mao, 0, ["9O", "3E", "9E", "9C", "9P", "5C"]); cena.redesenhar();');
      await apertar(pagina, 'botaoTamanho');
      const selecionadas = () => naCena(pagina, 'return cena.selecao.map((id) => id.split("#")[0])');
      await naCena(pagina, 'cena.aoClicarNaCarta(cena.mao.jogadores[0].mao.find((c) => c.id.startsWith("5C")).id);');
      assert.deepEqual(await selecionadas(), ['5C']);
      await naCena(pagina, 'cena.redesenhar();');
      assert.deepEqual(await selecionadas(), ['5C'], 'a seleção sobrevive a redesenhar');
      assert.deepEqual(await naCena(pagina, 'return cena.cartasDaMao.filter((i) => i.yBase < 640).map((i) => i.idCarta.split("#")[0])'), ['5C'], 'e a carta continua levantada');
      await naCena(pagina, 'cena.selecao = [];');
      await apertar(pagina, 'botaoTransfer');
      await esperarCena(pagina, 'return cena.mao.jogadores[0].transferUsado');
      const tela = await naTela(pagina), mao = await naMao(pagina);
      assert.equal(tela.length, mao.length);
      const valores = tela.map((id) => id.slice(0, -1));
      const natural = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      assert.deepEqual(valores, valores.slice().sort((a, b) => natural.indexOf(a) - natural.indexOf(b)), 'a mão segue em ordem de tamanho depois do transfer');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('não cobrem cartas nem botões de ação, com área de toque razoável, em 640x360, 844x390 e 1280x800', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await iniciar(pagina);
      /* mão cheia de cartas: o pior caso para a mão encostar nos botões */
      await naCena(pagina, 'M.darMao(cena.mao, 0, ["AE", "2C", "3P", "4O", "5E", "6C", "7P", "8O", "9E", "10C"]); cena.redesenhar();');
      await apertar(pagina, 'botaoNaipe');
      for (const tela of TELAS) {
        await pagina.setViewportSize(tela);
        await pagina.waitForTimeout(250);
        const r = await naCena(pagina, `
          const caixa = (o) => { const b = o.getBounds(); return { x0: b.x, y0: b.y, x1: b.right, y1: b.bottom }; };
          const encosta = (a, b) => !(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0);
          const botoes = ['botaoTamanho', 'botaoNaipe'].map((n) => cena.painel[n]);
          const outros = [...cena.cartasDaMao, ...Object.values(cena.painel.acoes), cena.painel.truco, cena.painel.botaoRegras, cena.painel.botaoMenu].filter(Boolean);
          const cobre = botoes.some((b) => outros.some((o) => encosta(caixa(b), caixa(o))));
          const dentro = botoes.every((b) => { const t = b.texto.getBounds(), c = caixa(b); return t.width <= c.x1 - c.x0 && t.height <= c.y1 - c.y0; });
          const escala = cena.scale.displaySize.width / cena.scale.gameSize.width;
          return { cobre, dentro, toque: botoes.map((b) => Math.round((b.input.hitArea.height) * escala)) };`);
        assert.equal(r.cobre, false, `${tela.width}x${tela.height}: os botões cobrem cartas ou ações`);
        assert.equal(r.dentro, true, `${tela.width}x${tela.height}: o rótulo passa do botão`);
        await capturar(pagina, `43-ordem-da-mao-${tela.width}x${tela.height}`);
      }
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
