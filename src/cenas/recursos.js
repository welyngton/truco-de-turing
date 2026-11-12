/**
 * @file Recursos compartilhados pelas cenas do Phaser: texto nítido, câmera ajustada à tela,
 * fundo da mesa e texturas das cartas geradas sob demanda.
 *
 * As texturas são geradas pela arte (pasta arte/) na densidade certa para cada uso e guardadas no
 * gerenciador de texturas do Phaser com chaves descritivas ('carta-mesa:truco:4P', 'verso-mao@yinyang').
 */
import { MUNDO, RESOLUCAO, DENSIDADE } from '../configuracao.js';
import { CARTA_L, CARTA_A } from '../arte/paleta.js';
import { desenharCartaCompleta, desenharCartaDaMesa } from '../arte/cartas.js';
import { desenharVerso } from '../arte/versos.js';
import { desenharMesa } from '../arte/mesas.js';
import { ICONES_DAS_ACOES } from '../arte/icones.js';

/**
 * Todo texto do Phaser nasce na resolução interna, para não borrar com o zoom da câmera.
 * A resolução vai no estilo, na criação: o renderizador Canvas só a lê nesse momento.
 * Chamada uma vez em principal.js, antes de criar o jogo.
 */
export function prepararTextoNitido() {
  const fabrica = Phaser.GameObjects.GameObjectFactory.prototype;
  const original = fabrica.text;
  fabrica.text = function (x, y, texto, estilo) {
    const objeto = original.call(this, x, y, texto, { ...(estilo || {}), resolution: RESOLUCAO });
    objeto.frame.source.resolution = RESOLUCAO;
    return objeto;
  };
}

/**
 * Ajusta a câmera para mostrar o mundo (1280x720) inteiro e centralizado em qualquer tela.
 * O Phaser, no modo EXPAND, não redimensiona a câmera ao girar o aparelho; por isso o ajuste é
 * conferido no evento de resize e a cada quadro (custo: uma comparação).
 * @param {Phaser.Scene} cena
 */
export function ajustarCamera(cena) {
  const camera = cena.cameras.main;
  const canvas = cena.sys.game.canvas;
  let ultimo = '';
  const ajustar = () => {
    const l = canvas.width, a = canvas.height;
    const chave = l + 'x' + a;
    if (chave === ultimo && camera.width === l && camera.height === a) return;
    ultimo = chave;
    camera.setSize(l, a);
    const zoom = Math.min(l / MUNDO.largura, a / MUNDO.altura);
    camera.setZoom(zoom).centerOn(MUNDO.largura / 2, MUNDO.altura / 2);
    /* o fundo cobre sempre toda a área visível, em qualquer proporção de tela */
    if (cena.fundo) {
      const f = Math.max(1, l / zoom / (MUNDO.largura * 2), a / zoom / (MUNDO.altura * 2)) * 1.02;
      cena.fundo.setDisplaySize(MUNDO.largura * 2 * f, MUNDO.altura * 2 * f);
    }
  };
  cena.reajustarCamera = () => { ultimo = ''; ajustar(); };
  ajustar();
  cena.scale.on('resize', ajustar);
  cena.events.on('update', ajustar);
  cena.events.once('shutdown', () => { cena.scale.off('resize', ajustar); cena.events.off('update', ajustar); });
}

/** Chave da textura do fundo da mesa do terreno (mantém em memória só o neutro e o atual). */
export function texturaDaMesa(cena, terreno = 'neutro') {
  const chave = 'mesa@' + terreno;
  if (!cena.textures.exists(chave)) {
    for (const k of cena.textures.getTextureKeys()) if (k.startsWith('mesa@') && k !== 'mesa@neutro') cena.textures.remove(k);
    cena.textures.addCanvas(chave, desenharMesa(terreno, MUNDO.largura * 2, MUNDO.altura * 2, Math.min(RESOLUCAO, 2) * 0.6));
  }
  return chave;
}

/** Coloca o fundo da mesa (feltro ou terreno) atrás de tudo. Fica em `cena.fundo`. */
export function colocarFundo(cena, terreno) {
  cena.fundo = cena.add.image(MUNDO.largura / 2, MUNDO.altura / 2, texturaDaMesa(cena, terreno))
    .setDisplaySize(MUNDO.largura * 2, MUNDO.altura * 2).setDepth(-10);
  cena.reajustarCamera?.();
  return cena.fundo;
}

/**
 * Chave da textura do verso do baralho.
 * @param {'inspecao'|'mao'|'mesa'} uso Tamanho em que o verso aparece.
 */
export function texturaDoVerso(cena, uso, baralho = 'classico') {
  const chave = 'verso-' + uso + '@' + baralho;
  if (!cena.textures.exists(chave)) cena.textures.addCanvas(chave, desenharVerso(uso === 'mesa' ? 'mesa' : 'completa', DENSIDADE[uso], baralho));
  return chave;
}

/**
 * Textura da carta no tamanho da mão: a face limpa (índices grandes, medalhão central e gema de
 * pontos), a mesma da mesa em densidade maior. A carta completa, com tipo e texto de regras,
 * aparece na inspeção ao passar o cursor.
 */
export function texturaDaCartaNaMao(cena, carta, baralho) {
  const chave = 'carta-mao:' + baralho + ':' + carta.valor + carta.naipe;
  if (!cena.textures.exists(chave)) cena.textures.addCanvas(chave, desenharCartaDaMesa(carta, baralho, DENSIDADE.mao));
  return chave;
}

/** Textura da carta completa em tamanho médio (cartas reveladas para decidir quem começa). */
export function texturaDaCartaMedia(cena, carta, baralho) {
  const chave = 'carta-media:' + baralho + ':' + carta.valor + carta.naipe;
  if (!cena.textures.exists(chave)) cena.textures.addCanvas(chave, desenharCartaCompleta(carta, baralho, Math.max(1, RESOLUCAO * 0.55)));
  return chave;
}

/** Textura da carta da mesa (neurônio). */
export function texturaDaCartaNaMesa(cena, carta, baralho) {
  const chave = 'carta-mesa:' + baralho + ':' + carta.valor + carta.naipe;
  if (!cena.textures.exists(chave)) cena.textures.addCanvas(chave, desenharCartaDaMesa(carta, baralho, DENSIDADE.mesa));
  return chave;
}

/** Cartas completas já desenhadas em alta densidade para a inspeção (guarda as 14 mais recentes). */
const desenhosDeInspecao = new Map();

/** Cria a textura única da inspeção, redesenhada a cada carta mostrada. */
export function criarTexturaDeInspecao(cena) {
  if (cena.textures.exists('inspecao')) return;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(CARTA_L * DENSIDADE.inspecao);
  canvas.height = Math.round(CARTA_A * DENSIDADE.inspecao);
  cena.textures.addCanvas('inspecao', canvas);
}

/** Desenha a carta na textura da inspeção e devolve a chave dela. */
export function texturaDeInspecao(cena, carta, baralho) {
  const chave = baralho + ':' + carta.valor + carta.naipe;
  let desenho = desenhosDeInspecao.get(chave);
  if (!desenho) {
    desenho = desenharCartaCompleta(carta, baralho, DENSIDADE.inspecao);
    desenhosDeInspecao.set(chave, desenho);
    if (desenhosDeInspecao.size > 14) desenhosDeInspecao.delete(desenhosDeInspecao.keys().next().value);
  }
  const textura = cena.textures.get('inspecao');
  const ctx = textura.getContext();
  ctx.clearRect(0, 0, textura.width, textura.height);
  ctx.drawImage(desenho, 0, 0, textura.width, textura.height);
  textura.refresh();
  return 'inspecao';
}

/** Libera as cartas da mão da mão anterior (memória de vídeo é limitada em celulares). */
export function liberarCartasDaMao(cena) {
  for (const k of cena.textures.getTextureKeys()) if (k.startsWith('carta-mao:')) cena.textures.remove(k);
}

/**
 * Converte um retângulo do mundo do jogo (centro x, y e tamanho l × a) em pixels da página,
 * para posicionar elementos HTML (como as dicas flutuantes) sobre o canvas.
 */
export function retanguloNaTela(cena, x, y, l, a) {
  const canvas = cena.sys.game.canvas, caixa = canvas.getBoundingClientRect(), camera = cena.cameras.main;
  const kx = caixa.width / canvas.width, ky = caixa.height / canvas.height;
  const px = (wx) => caixa.left + (wx - camera.worldView.x) * camera.zoom * kx;
  const py = (wy) => caixa.top + (wy - camera.worldView.y) * camera.zoom * ky;
  return { x: px(x - l / 2), y: py(y - a / 2), l: px(x + l / 2) - px(x - l / 2), a: py(y + a / 2) - py(y - a / 2) };
}

/**
 * Carrega os ícones das ações (SVG) como texturas `icone-acao:<id>`, em 128 px. O carregamento é
 * assíncrono; quem usa confere `textures.exists` e segue sem o ícone se ele ainda não chegou.
 */
export function carregarIconesDasAcoes(cena) {
  for (const [id, svg] of Object.entries(ICONES_DAS_ACOES)) {
    const chave = 'icone-acao:' + id;
    if (cena.textures.exists(chave) || typeof Image === 'undefined') continue;
    const imagem = new Image(128, 128);
    imagem.onload = () => { if (!cena.textures.exists(chave)) cena.textures.addImage(chave, imagem); };
    imagem.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg width="128" height="128" '));
  }
}
