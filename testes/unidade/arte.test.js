/**
 * @file Testes de unidade da arte procedural: cada função desenha num canvas de verdade
 * (@napi-rs/canvas) e o teste confere tamanho, densidade e que algo foi pintado.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { instalarNavegadorFalso, pixelsPintados } from '../apoio/ambiente.js';

instalarNavegadorFalso();
const pincel = await import('../../src/arte/pincel.js');
const { CARTA_L, CARTA_A, MINI_L, MINI_A, PALETA_NAIPE, TINTA, FONTE_SIMBOLOS } = await import('../../src/arte/paleta.js');
const { corpoDaMoldura, placa, gema } = await import('../../src/arte/moldura.js');
const { desenharEmblema } = await import('../../src/arte/emblemas.js');
const cenarios = await import('../../src/arte/cenarios.js');
const { coroa, desenharFigura } = await import('../../src/arte/figuras.js');
const { dadosDaCarta, simboloDeColecao, desenharCartaCompleta, desenharCartaDaMesa } = await import('../../src/arte/cartas.js');
const { desenharVerso } = await import('../../src/arte/versos.js');
const { desenharCartaDeTerreno } = await import('../../src/arte/cartasDeTerreno.js');
const { desenharAvatar } = await import('../../src/arte/avatares.js');
const { desenharFeltro, desenharMesa } = await import('../../src/arte/mesas.js');
const { desenharFaisca, desenharBotao, MARGEM_BOTAO } = await import('../../src/arte/botoes.js');
const { ICONES_CONQUISTAS, ICONE_CADEADO } = await import('../../src/arte/icones.js');
const { desenharRetratoEmMoldura } = await import('../../src/arte/retrato.js');
const { FOTO_PROFESSOR } = await import('../../src/recursos/retratoProfessor.js');
const { BARALHOS } = await import('../../src/nucleo/baralhos.js');
const { baralhoPadrao, NAIPES } = await import('../../src/nucleo/cartas.js');
const { TERRENOS } = await import('../../src/nucleo/terrenos.js');
const { CONQUISTAS } = await import('../../src/conteudo/conquistas.js');

/** Tela de rascunho 200×200 na densidade 1. */
const rascunho = () => pincel.criarTela(200, 200, 1);

describe('pincel.js', () => {
  it('criarTela: tamanho multiplicado pela densidade, nunca menor que 1 pixel', () => {
    const { c } = pincel.criarTela(100, 50, 2.5);
    assert.deepEqual([c.width, c.height], [250, 125]);
    assert.deepEqual([pincel.criarTela(0.1, 0.1, 1).c.width], [1]);
  });
  it('hashDoTexto e geradorComSemente: estáveis e reprodutíveis', () => {
    assert.equal(pincel.hashDoTexto('7O'), pincel.hashDoTexto('7O'));
    assert.notEqual(pincel.hashDoTexto('7O'), pincel.hashDoTexto('7E'));
    const a = pincel.geradorComSemente(5), b = pincel.geradorComSemente(5);
    const xs = [a(), a(), a()];
    assert.deepEqual(xs, [b(), b(), b()]);
    assert.ok(xs.every((x) => x >= 0 && x < 1));
  });
  it('caminhos, degradês, texturas, sombras e brilho pintam a tela', () => {
    const { c, ctx } = rascunho(), aleatorio = pincel.geradorComSemente(1);
    pincel.caminhoArredondado(ctx, 10, 10, 80, 60, 300); /* raio maior que o lado é limitado */
    ctx.fillStyle = pincel.degradeLinear(ctx, 0, 0, 0, 100, [[0, '#000'], [1, '#fff']]); ctx.fill();
    ctx.fillStyle = pincel.degradeRadial(ctx, 150, 150, 0, 150, 150, 40, [[0, '#f00'], [1, '#00f']]); ctx.fillRect(110, 110, 80, 80);
    pincel.granulado(ctx, 0, 0, 200, 200, aleatorio, 400, 0.2);
    pincel.escovado(ctx, 0, 0, 200, 200, aleatorio, 0.2);
    pincel.sombraSuave(ctx, 6, 2, 0.5);
    assert.ok(ctx.shadowBlur > 0);
    pincel.semSombra(ctx);
    assert.equal(ctx.shadowBlur, 0);
    pincel.brilho(ctx, 100, 100, 30, '#ffffff', 0.5);
    assert.ok(pixelsPintados(c) > 0.3);
  });
  it('escreverComQuebra respeita a largura e "\\n"; ajustarFonte encolhe até caber', () => {
    const { ctx } = rascunho();
    ctx.font = '12px sans-serif';
    const linhas = pincel.escreverComQuebra(ctx, 'uma frase bem comprida que precisa quebrar\nsegunda', 0, 20, 60, 14);
    assert.ok(linhas >= 3);
    pincel.ajustarFonte(ctx, 'texto muito muito muito longo', 40, 30, '700', 'serif', 8);
    assert.match(ctx.font, /^700 \d+(\.\d+)?px serif$/);
    assert.ok(parseFloat(ctx.font.split(' ')[1]) < 30);
  });
  it('comAlfa e tonalizar', () => {
    assert.equal(pincel.comAlfa('#ff8000', 0.5), 'rgba(255,128,0,0.5)');
    assert.equal(pincel.tonalizar('#808080', 0), '#808080');
    assert.notEqual(pincel.tonalizar('#808080', 0.5), '#808080');
    assert.notEqual(pincel.tonalizar('#808080', -0.5), '#808080');
  });
});

describe('paleta.js', () => {
  it('medidas e cores por naipe', () => {
    assert.deepEqual([CARTA_L, CARTA_A, MINI_L, MINI_A], [240, 336, 120, 168]);
    assert.ok(TINTA.startsWith('#') && FONTE_SIMBOLOS);
    for (const n of NAIPES) for (const chave of ['clara', 'media', 'escura', 'gema', 'titulo', 'ceu']) assert.ok(PALETA_NAIPE[n][chave], n + chave);
  });
});

describe('moldura.js, emblemas.js, figuras.js e cenarios.js', () => {
  it('corpo da moldura (comum e lendária), placa e gema', () => {
    for (const lendaria of [false, true]) {
      const { c, ctx } = pincel.criarTela(CARTA_L, CARTA_A, 1);
      corpoDaMoldura(ctx, CARTA_L, CARTA_A, PALETA_NAIPE.O, pincel.geradorComSemente(2), lendaria);
      placa(ctx, 20, 20, 150, 30, PALETA_NAIPE.O, { escura: true });
      placa(ctx, 20, 60, 150, 30, PALETA_NAIPE.E);
      gema(ctx, 100, 200, 20, '#c33', '7', {});
      gema(ctx, 50, 200, 14, '#3c3', '', { tamanho: 10 });
      assert.ok(pixelsPintados(c) > 0.8);
    }
  });
  it('emblema de cada naipe, com e sem sombra', () => {
    for (const tipo of ['espada', 'copa', 'ouro', 'pau']) {
      for (const opcoes of [{}, { sombra: false }]) {
        const { c, ctx } = rascunho();
        desenharEmblema(ctx, tipo, 100, 100, 120, 0.2, opcoes);
        assert.ok(pixelsPintados(c) > 0.01, tipo);
      }
    }
  });
  it('coroa e figura de Valete, Dama e Rei de cada naipe', () => {
    for (const valor of ['J', 'Q', 'K']) {
      for (const naipe of NAIPES) {
        const { c, ctx } = rascunho();
        desenharFigura(ctx, valor, naipe, 100, 198, 180);
        assert.ok(pixelsPintados(c) > 0.05, valor + naipe);
      }
      const { c, ctx } = rascunho();
      ctx.translate(100, 100);
      coroa(ctx, valor, 80, '#e7b23a');
      assert.ok(pixelsPintados(c) > 0.005, 'coroa ' + valor);
    }
  });
  it('cenários de cada naipe e peças de paisagem', () => {
    for (const naipe of NAIPES) {
      const { c, ctx } = rascunho(), aleatorio = pincel.geradorComSemente(3);
      cenarios.cenarioDoNaipe(ctx, naipe, 0, 0, 200, 200, aleatorio, {});
      cenarios.cenarioDoNaipe(ctx, naipe, 0, 0, 200, 200, aleatorio, { constelacao: false, escurecer: 0.4 });
      assert.ok(pixelsPintados(c) > 0.9, naipe);
    }
    const { c, ctx } = rascunho(), aleatorio = pincel.geradorComSemente(4);
    const perfil = cenarios.perfilDeSerra(aleatorio, 16, 0.5);
    assert.ok(perfil.length >= 16 && perfil.every((v) => v >= 0 && v <= 1));
    cenarios.montanhas(ctx, 0, 100, 200, 100, aleatorio, [{ cor: '#345', base: 0.5, altura: 0.4, aspereza: 0.6, neve: true }]);
    cenarios.estrelas(ctx, 0, 0, 200, 100, aleatorio, 30, '#fff');
    cenarios.constelacao(ctx, 0, 0, 200, 100, aleatorio, '#fff');
    cenarios.vinheta(ctx, 0, 0, 200, 200, 0.5);
    cenarios.raios(ctx, 100, 100, 8, 90, 0.2, '#ff0', 0.4);
    assert.ok(pixelsPintados(c) > 0.3);
  });
});

describe('cartas.js', () => {
  it('dadosDaCarta: nome, pontos, tipo, regras, ambientação e raridade', () => {
    const zap = dadosDaCarta({ valor: '4', naipe: 'P' }, 'truco');
    assert.equal(zap.raridade, 'mitica');
    assert.match(zap.tipo, /Manilha/);
    assert.equal(dadosDaCarta({ valor: 'K', naipe: 'O' }, 'classico').raridade, 'rara');
    assert.equal(dadosDaCarta({ valor: 'A', naipe: 'O' }, 'classico').raridade, 'incomum');
    const sete = dadosDaCarta({ valor: '7', naipe: 'O' }, 'classico');
    assert.equal(sete.raridade, 'comum');
    assert.equal(sete.pontos, 7);
    assert.ok(sete.nome && sete.regras && sete.ambientacao);
  });
  it('símbolo de coleção de cada raridade', () => {
    for (const raridade of ['comum', 'incomum', 'rara', 'mitica']) {
      const { c, ctx } = rascunho();
      simboloDeColecao(ctx, 100, 100, 12, raridade);
      assert.ok(pixelsPintados(c) > 0.005, raridade);
    }
  });
  for (const baralho of Object.keys(BARALHOS)) {
    it('todas as 52 cartas do baralho ' + baralho + ' (completa e da mesa)', () => {
      for (const carta of baralhoPadrao()) {
        const completa = desenharCartaCompleta(carta, baralho, 0.5);
        assert.deepEqual([completa.width, completa.height], [CARTA_L / 2, CARTA_A / 2]);
        const mesa = desenharCartaDaMesa(carta, baralho, 0.5);
        assert.deepEqual([mesa.width, mesa.height], [MINI_L / 2, MINI_A / 2]);
      }
      const amostra = desenharCartaCompleta({ id: 'QC', valor: 'Q', naipe: 'C' }, baralho, 1);
      assert.ok(pixelsPintados(amostra) > 0.9);
    });
  }
});

describe('versos, terrenos, avatares, mesas e botões', () => {
  it('verso de cada baralho nos dois formatos', () => {
    for (const baralho of Object.keys(BARALHOS)) {
      for (const formato of ['completa', 'mesa']) {
        const c = desenharVerso(formato, 0.5, baralho);
        assert.ok(c.width > 0 && pixelsPintados(c) > 0.9, baralho + formato);
      }
    }
  });
  it('carta de cada terreno', () => {
    for (const terreno of Object.keys(TERRENOS)) assert.ok(pixelsPintados(desenharCartaDeTerreno(terreno, 0.5)) > 0.9, terreno);
  });
  it('avatar de cada oponente e dos jogadores', () => {
    for (const tipo of ['gradiente', 'mc', 'ruido', 'p1', 'p2']) {
      const c = desenharAvatar(tipo, '#4aa3df', 1);
      assert.ok(c.width > 0 && pixelsPintados(c) > 0.4, tipo);
    }
  });
  it('feltro e mesa de cada terreno', () => {
    assert.ok(pixelsPintados(desenharFeltro(320, 180, 1)) > 0.99);
    for (const terreno of Object.keys(TERRENOS)) {
      const c = desenharMesa(terreno, 320, 180, 1);
      assert.deepEqual([c.width, c.height], [320, 180]);
      assert.ok(pixelsPintados(c) > 0.99, terreno);
    }
  });
  it('faísca e botões em cada variante e estado', () => {
    assert.ok(pixelsPintados(desenharFaisca(1, '#ff0000')) > 0.05);
    for (const variante of ['ouro', 'vinho', 'pedra']) {
      for (const estado of ['normal', 'foco', 'inativo']) {
        const c = desenharBotao(120, 40, 1, variante, estado);
        assert.deepEqual([c.width, c.height], [120 + 2 * MARGEM_BOTAO, 40 + 2 * MARGEM_BOTAO]);
        assert.ok(pixelsPintados(c) > 0.5, variante + estado);
      }
    }
  });
});

describe('icones.js e retrato.js', () => {
  it('um ícone SVG válido para cada conquista, e o cadeado', () => {
    const leitor = new window.DOMParser();
    for (const conquista of CONQUISTAS) {
      const svg = ICONES_CONQUISTAS[conquista.id];
      assert.ok(svg, conquista.id);
      assert.equal(leitor.parseFromString(svg, 'image/svg+xml').querySelector('parsererror'), null, conquista.id);
    }
    assert.equal(leitor.parseFromString(ICONE_CADEADO, 'image/svg+xml').querySelector('parsererror'), null);
  });
  it('retrato do professor em moldura medieval', async () => {
    const canvas = await new Promise((resolve) => desenharRetratoEmMoldura(FOTO_PROFESSOR, 1, 'Prof. Peng', 'FPO · UnB', resolve));
    assert.deepEqual([canvas.width, canvas.height], [240, 330]);
    assert.ok(pixelsPintados(canvas) > 0.5);
  });
});
