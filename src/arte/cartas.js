/**
 * @file Cartas de neurônio: dados exibidos (nome, tipo, regras, raridade), carta completa (mão e inspeção) e carta da mesa.
 *
 * Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas
 * resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.
 */
import { CARTA_A, CARTA_L, FONTE_SIMBOLOS, MINI_A, MINI_L, PALETA_NAIPE, TINTA } from './paleta.js';
import { ajustarFonte, brilho, caminhoArredondado, comAlfa, criarTela, degradeLinear, escreverComQuebra, geradorComSemente, granulado, hashDoTexto, semSombra, sombraSuave, tonalizar } from './pincel.js';
import { corpoDaMoldura, gema, placa } from './moldura.js';
import { desenharEmblema } from './emblemas.js';
import { cenarioDoNaipe, raios } from './cenarios.js';
import { desenharFigura } from './figuras.js';
import { NAIPE, VALORES, NAIPES, ehFigura } from '../nucleo/cartas.js';
import { BARALHOS, pontosDaCarta, nomeDaCarta } from '../nucleo/baralhos.js';
import { AMBIENTACAO } from '../conteudo/textos.js';

/**
 * Dados que a carta mostra.
 * @returns {{nome: string, pontos: number, figura: boolean, figuraSemPontos: boolean, manilha: string|undefined, tipo: string,
 *   regras: string, ambientacao: string, raridade: 'comum'|'incomum'|'rara'|'mitica'}}
 */
export function dadosDaCarta(carta, baralho) {
  const dadosBaralho = BARALHOS[baralho];
  const manilha = dadosBaralho.manilhas && dadosBaralho.manilhas[carta.valor + carta.naipe];
  const pontos = pontosDaCarta(carta, baralho);
  const figura = ehFigura(carta);
  const forward = !!dadosBaralho.forward;
  const tipo = manilha ? 'Manilha — Neurônio Lendário' : forward && figura ? 'Neurônio — Ativação' : figura ? 'Neurônio — Figura' : carta.valor === 'A' ? 'Neurônio — Ás' : 'Neurônio — Numérico';
  /* no truco e na nobreza as figuras valem pontos próprios; no backprop são funções de ativação */
  const figuraSemPontos = figura && !dadosBaralho.figurasValem;
  let regras;
  if (forward) {
    const peso = String(PESO_BACKPROP[carta.naipe]).replace('.', ',');
    regras = (figura ? 'Ativação ' + ATIVACAO_BACKPROP[carta.valor] + ', viés 0.' : 'Linear, viés b = ' + pontos + '.') + '\nPeso pelo naipe: w = ' + peso + '. Saída: a = f(w·a + b).';
  } else if (figuraSemPontos) {
    regras = 'Ativa com 0. Iguais vizinhas ou empilhadas:\nPar 20 · Trio 30 · Quadra zera a rede.';
  } else {
    regras = (manilha ? 'Manilha: ' : '') + 'Ativa com ' + pontos + ' pontos.\n' +
      (figura && baralho === 'nobreza' ? 'Figuras iguais vizinhas valem o dobro.' : 'Tunagem: empilhe outro ' + carta.valor + ' e some o valor dele.');
  }
  const ambientacao = (manilha && AMBIENTACAO[manilha]) || AMBIENTACAO[carta.valor];
  const raridade = manilha ? 'mitica' : figura ? 'rara' : carta.valor === 'A' ? 'incomum' : 'comum';
  return { nome: nomeDaCarta(carta, baralho), pontos, figura, figuraSemPontos, manilha, tipo, regras, ambientacao, raridade };
}

/** Baralho Backprop: peso de cada naipe e ativação de cada figura (iguais às do motor). */
const PESO_BACKPROP = { E: 1.2, C: 1.0, P: 0.8, O: 0.6 };
const ATIVACAO_BACKPROP = { J: 'ReLU', Q: 'sigmoide', K: 'tanh' };

/** Cores da gema de raridade (claro, escuro). */
const RARIDADE = { comum: ['#1a1a1a', '#5a5a5a'], incomum: ['#e9eef3', '#7a8794'], rara: ['#fff0b0', '#b98a1e'], mitica: ['#ffd27a', '#d4451c'] };

/** Símbolo de coleção (gema de raridade) à direita da linha de tipo. */
export function simboloDeColecao(ctx, x, y, s, raridade) {
  let c = RARIDADE[raridade];
  ctx.fillStyle = degradeLinear(ctx, x - s, y - s, x + s, y + s, [[0, c[0]], [1, c[1]]]);
  ctx.strokeStyle = '#0b0907'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.75); ctx.lineTo(x + s, y - s * 0.75); ctx.lineTo(x, y + s * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.4); ctx.lineTo(x + s * 0.45, y - s * 0.4); ctx.lineTo(x, y + s * 0.35); ctx.closePath(); ctx.fill();
}

/** Desenha a ilustração da janela de arte: cena com figura (J, Q, K), emblema grande (Ás e manilhas) ou emblemas repetidos (cartas numéricas). */
function ilustracaoDaCarta(ctx, carta, info, x, y, w, h, aleatorio) {
  let naipeInfo = NAIPE[carta.naipe], P = PALETA_NAIPE[carta.naipe];
  if (info.figura) {
    cenarioDoNaipe(ctx, carta.naipe, x, y, w, h, aleatorio, { escurecer: 0.18 });
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    /* cortina e trono */
    ctx.fillStyle = degradeLinear(ctx, x, 0, x + w, 0, [[0, 'rgba(60,8,12,.85)'], [0.18, 'rgba(60,8,12,0)'], [0.82, 'rgba(60,8,12,0)'], [1, 'rgba(60,8,12,.85)']]);
    ctx.fillRect(x, y, w, h);
    brilho(ctx, x + w / 2, y + h * 0.42, h * 0.55, P.brilho, 0.45);
    ctx.fillStyle = degradeLinear(ctx, 0, y + h * 0.15, 0, y + h, [[0, '#6b3a14'], [1, '#2a1406']]);
    caminhoArredondado(ctx, x + w / 2 - 34, y + h * 0.12, 68, h, 8); ctx.fill();
    ctx.strokeStyle = '#e6b84a'; ctx.lineWidth = 1.5; ctx.stroke();
    desenharFigura(ctx, carta.valor, carta.naipe, x + w / 2, y + h + 2, h * 0.98);
    ctx.font = '900 26px Cinzel, Georgia, serif'; ctx.textBaseline = 'top';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(carta.valor, x + 8, y + 6);
    ctx.fillStyle = '#fff6dc'; ctx.fillText(carta.valor, x + 8, y + 6); ctx.textBaseline = 'alphabetic';
    ctx.restore();
    return;
  }
  cenarioDoNaipe(ctx, carta.naipe, x, y, w, h, aleatorio);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (carta.valor === 'A' || info.manilha) {
    let cx = x + w / 2, cy = y + h * 0.52;
    raios(ctx, cx, cy + 40, 15, h * 1.2, 0.2, P.brilho, 0.25);
    brilho(ctx, cx, cy, h * 0.55, P.brilho, 0.7);
    ctx.strokeStyle = comAlfa(P.brilho, 0.7); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, h * 0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(cx, cy, h * 0.45, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (info.manilha && carta.valor !== 'A') {
      let n0 = parseInt(carta.valor, 10);
      posicoesDosNaipes(n0).forEach(function (p, k) { desenharEmblema(ctx, naipeInfo.emblema, x + w * p[0], y + h * p[1], n0 <= 4 ? 48 : 40, (aleatorio() - 0.5) * 0.3); });
      /* raio da manilha */
      ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 2.2; sombraSuave(ctx, 8, 0, 0.9); ctx.shadowColor = '#ffd23a';
      ctx.beginPath(); ctx.moveTo(x + w * 0.62, y + 4); ctx.lineTo(x + w * 0.52, y + h * 0.42); ctx.lineTo(x + w * 0.6, y + h * 0.44); ctx.lineTo(x + w * 0.46, y + h - 6); ctx.stroke(); semSombra(ctx);
    } else {
      desenharEmblema(ctx, naipeInfo.emblema, cx, cy, h * 0.82, 0);
    }
  } else {
    let n = parseInt(carta.valor, 10);
    let tamanho = n <= 3 ? 54 : n <= 5 ? 44 : n <= 8 ? 38 : 32;
    posicoesDosNaipes(n).forEach(function (p, k) {
      brilho(ctx, x + w * p[0], y + h * p[1], tamanho * 0.75, P.brilho, 0.35);
    });
    posicoesDosNaipes(n).forEach(function (p, k) {
      desenharEmblema(ctx, naipeInfo.emblema, x + w * p[0], y + h * p[1], tamanho, (aleatorio() - 0.5) * 0.25 + (k % 2 ? 0.08 : -0.08));
    });
  }
  ctx.restore();
}

/** Posições dos naipes numa janela de arte paisagem */
function posicoesDosNaipes(n) {
  let fileira = function (k, y, x0, x1) { let a = []; for (let i = 0; i < k; i++) a.push([k === 1 ? 0.5 : x0 + (x1 - x0) * i / (k - 1), y]); return a; };
  let L = {
    1: [[0.5, 0.5]],
    2: fileira(2, 0.5, 0.32, 0.68),
    3: [[0.22, 0.56], [0.5, 0.42], [0.78, 0.56]],
    4: fileira(2, 0.3, 0.3, 0.7).concat(fileira(2, 0.72, 0.3, 0.7)),
    5: fileira(2, 0.28, 0.24, 0.76).concat([[0.5, 0.5]], fileira(2, 0.74, 0.24, 0.76)),
    6: fileira(3, 0.3, 0.22, 0.78).concat(fileira(3, 0.72, 0.22, 0.78)),
    7: fileira(4, 0.3, 0.16, 0.84).concat(fileira(3, 0.72, 0.28, 0.72)),
    8: fileira(4, 0.3, 0.16, 0.84).concat(fileira(4, 0.72, 0.16, 0.84)),
    9: fileira(3, 0.2, 0.25, 0.75).concat(fileira(3, 0.5, 0.25, 0.75), fileira(3, 0.8, 0.25, 0.75)),
    10: fileira(5, 0.3, 0.12, 0.88).concat(fileira(5, 0.72, 0.12, 0.88)),
  };
  return L[n] || L[1];
}

/** ---------- carta completa ---------- */
export function desenharCartaCompleta(carta, baralho, S) {
  let o = criarTela(CARTA_L, CARTA_A, S || 1), ctx = o.ctx;
  let P = PALETA_NAIPE[carta.naipe];
  let info = dadosDaCarta(carta, baralho);
  let naipeInfo = NAIPE[carta.naipe];
  let aleatorio = geradorComSemente(hashDoTexto(carta.valor + carta.naipe + baralho));
  corpoDaMoldura(ctx, CARTA_L, CARTA_A, P, aleatorio, !!info.manilha);

  /* barra de nome + gemas de custo */
  placa(ctx, 15, 14, 210, 28, P);
  let gx = 211;
  gema(ctx, gx, 28, 10, P.gema, null);
  ctx.fillStyle = '#fff'; ctx.font = '700 13px ' + FONTE_SIMBOLOS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(naipeInfo.simbolo, gx, 28.5);
  gema(ctx, gx - 22, 28, 10, '#8c8378', String(info.pontos), { cor: '#fff' });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = TINTA;
  ajustarFonte(ctx, info.nome, 150, 15.5, '700', 'Cinzel, Georgia, serif', 10);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText(info.nome, 25, 29.3);
  ctx.fillStyle = TINTA; ctx.fillText(info.nome, 25, 28.5);

  /* janela de arte */
  let ax = 21, ay = 47, aw = 198, ah = 134;
  sombraSuave(ctx, 4, 2, 0.8);
  ctx.fillStyle = '#000'; ctx.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
  semSombra(ctx);
  ilustracaoDaCarta(ctx, carta, info, ax, ay, aw, ah, aleatorio);
  ctx.lineWidth = 2; ctx.strokeStyle = '#0b0907'; ctx.strokeRect(ax - 1, ay - 1, aw + 2, ah + 2);
  ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.strokeRect(ax - 2.5, ay - 2.5, aw + 5, ah + 5);

  /* linha de tipo + raridade */
  placa(ctx, 15, 186, 210, 22, P);
  ctx.fillStyle = TINTA; ctx.textBaseline = 'middle';
  ajustarFonte(ctx, info.tipo, 170, 11, '700', 'Cinzel, Georgia, serif', 7.5);
  ctx.fillText(info.tipo, 24, 197.5);
  simboloDeColecao(ctx, 211, 197, 6.5, info.raridade);

  /* caixa de texto com marca d'água */
  let tx = 22, ty = 212, tw = 196, th = 94;
  ctx.fillStyle = degradeLinear(ctx, 0, ty, 0, ty + th, [[0, '#f7efdb'], [1, '#e6d6b0']]);
  ctx.fillRect(tx, ty, tw, th);
  ctx.save(); ctx.beginPath(); ctx.rect(tx, ty, tw, th); ctx.clip();
  granulado(ctx, tx, ty, tw, th, aleatorio, 0.12, 0.08);
  ctx.globalAlpha = 0.1; desenharEmblema(ctx, naipeInfo.emblema, tx + tw / 2, ty + th / 2, 86, 0, { sombra: false }); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = tonalizar(P.media, -0.4); ctx.lineWidth = 1.2; ctx.strokeRect(tx, ty, tw, th);
  ctx.fillStyle = TINTA; ctx.font = '500 11px Spectral, Georgia, serif'; ctx.textBaseline = 'top';
  let linhasUsadas = escreverComQuebra(ctx, info.regras, tx + 8, ty + 6, tw - 16, 13.5);
  let sepY = ty + 10 + linhasUsadas * 13.5;
  ctx.strokeStyle = 'rgba(60,40,20,.35)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(tx + 30, sepY); ctx.lineTo(tx + tw - 30, sepY); ctx.stroke();
  ctx.font = 'italic 400 10.5px Spectral, Georgia, serif'; ctx.fillStyle = '#4b3a26';
  escreverComQuebra(ctx, info.ambientacao, tx + 8, sepY + 4, tw - 66, 12.5);

  /* caixa de poder */
  placa(ctx, 168, 292, 56, 26, P, { raio: 6 });
  ctx.fillStyle = TINTA; ctx.font = '800 15px Spectral, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(info.pontos), 186, 305.5);
  ctx.font = '700 14px ' + FONTE_SIMBOLOS; ctx.fillStyle = naipeInfo.vermelho ? '#a8232f' : TINTA;
  ctx.fillText(naipeInfo.simbolo, 209, 305.5);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  /* linha de colecionador */
  let numero = NAIPES.indexOf(carta.naipe) * 13 + VALORES.indexOf(carta.valor) + 1;
  ctx.font = '700 7px Spectral, Georgia, serif'; ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillText(String(numero).padStart(3, '0') + '/052 · ' + info.raridade.charAt(0).toUpperCase() + ' · TdT · PT-BR', 17, 316);
  ctx.font = '500 7px Spectral, Georgia, serif';
  ctx.fillText('Ilus. arte procedural · FPO 2026/2', 17, 325);
  return o.c;
}

/** ---------- carta da mesa ---------- */
export function desenharCartaDaMesa(carta, baralho, S) {
  let o = criarTela(MINI_L, MINI_A, S || 1), ctx = o.ctx;
  let P = PALETA_NAIPE[carta.naipe];
  let info = dadosDaCarta(carta, baralho);
  let naipeInfo = NAIPE[carta.naipe];
  let aleatorio = geradorComSemente(hashDoTexto('m' + carta.valor + carta.naipe + baralho));
  corpoDaMoldura(ctx, MINI_L, MINI_A, P, aleatorio, !!info.manilha);
  let fx = 9, fy = 9, fw = MINI_L - 18, fh = MINI_A - 18;
  ctx.fillStyle = degradeLinear(ctx, 0, fy, 0, fy + fh, [[0, '#fdf8ec'], [1, '#ecdcb8']]);
  caminhoArredondado(ctx, fx, fy, fw, fh, 7); ctx.fill();
  ctx.save(); caminhoArredondado(ctx, fx, fy, fw, fh, 7); ctx.clip(); granulado(ctx, fx, fy, fw, fh, aleatorio, 0.15, 0.07); ctx.restore();
  ctx.strokeStyle = tonalizar(P.media, -0.3); ctx.lineWidth = 1.4; caminhoArredondado(ctx, fx, fy, fw, fh, 7); ctx.stroke();
  ctx.strokeStyle = comAlfa(tonalizar(P.media, -0.2), 0.45); ctx.lineWidth = 0.8; caminhoArredondado(ctx, fx + 4, fy + 4, fw - 8, fh - 8, 5); ctx.stroke();

  let vermelho = naipeInfo.vermelho, cor = vermelho ? '#a8232f' : '#16120e';
  /* janela central */
  let wx = 29, wy = 32, ww = 62, wh = 100;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath();
  sombraSuave(ctx, 3, 1, 0.6); ctx.fillStyle = '#000'; ctx.fill(); semSombra(ctx);
  ctx.clip();
  if (info.figura) {
    cenarioDoNaipe(ctx, carta.naipe, wx, wy, ww, wh, aleatorio, { constelacao: false, escurecer: 0.15 });
    brilho(ctx, wx + ww / 2, wy + wh * 0.4, wh * 0.5, P.brilho, 0.45);
    desenharFigura(ctx, carta.valor, carta.naipe, wx + ww / 2 - 3, wy + wh + 1, wh * 0.9);
  } else {
    cenarioDoNaipe(ctx, carta.naipe, wx, wy, ww, wh, aleatorio, { constelacao: false });
    const cx = wx + ww / 2, cy = wy + wh * 0.56;
    brilho(ctx, cx, cy, ww * 0.6, P.brilho, 0.7);
    const destaque = carta.valor === 'A' || info.manilha;
    /* medalhão: anel dourado com um naipe pequeno por número da carta (2 a 10), em volta do emblema */
    const n = destaque ? 0 : Math.min(10, Number(carta.valor) || 0), r = 23;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,236,170,.85)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,170,.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.stroke();
    if (destaque) {
      for (let k = 0; k < 16; k++) {
        const a = k * Math.PI / 8;
        ctx.strokeStyle = 'rgba(255,236,170,' + (k % 2 ? 0.35 : 0.8) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8)); ctx.lineTo(cx + Math.cos(a) * (r + (k % 2 ? 11 : 15)), cy + Math.sin(a) * (r + (k % 2 ? 11 : 15))); ctx.stroke();
      }
    }
    ctx.restore();
    desenharEmblema(ctx, naipeInfo.emblema, cx, cy, destaque ? 56 : 40, 0.08);
    if (n) {
      ctx.save();
      ctx.font = '700 8px ' + FONTE_SIMBOLOS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + k * 2 * Math.PI / n, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        ctx.fillStyle = 'rgba(255,248,230,.95)'; ctx.beginPath(); ctx.arc(px, py, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = vermelho ? '#a8232f' : '#16120e'; ctx.fillText(naipeInfo.simbolo, px, py + 0.5);
      }
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#0b0907'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); ctx.stroke();

  /* índices nos cantos */
  function indice(tx, ty) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = cor;
    ctx.font = '900 ' + (carta.valor === '10' ? 17 : 21) + 'px Cinzel, Georgia, serif';
    ctx.fillText(carta.valor, tx, ty);
    ctx.font = '700 15px ' + FONTE_SIMBOLOS;
    ctx.fillText(naipeInfo.simbolo, tx, ty + 21);
  }
  indice(18, 13);
  ctx.save(); ctx.translate(MINI_L, MINI_A); ctx.rotate(Math.PI); indice(18, 13); ctx.restore();
  /* legenda curta embaixo da janela: nome da manilha (truco) ou ativação e peso (backprop) */
  const legenda = info.manilha || (BARALHOS[baralho].forward ? (info.figura ? ATIVACAO_BACKPROP[carta.valor] : 'w ' + String(PESO_BACKPROP[carta.naipe]).replace('.', ',')) : '');
  if (legenda) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 10px Cinzel, Georgia, serif';
    const lw = Math.min(ww + 4, ctx.measureText(legenda).width + 12);
    ctx.fillStyle = 'rgba(13,10,8,.82)'; caminhoArredondado(ctx, MINI_L / 2 - lw / 2, wy + wh + 3, lw, 14, 4); ctx.fill();
    ctx.fillStyle = '#f6dc8f'; ctx.fillText(legenda, MINI_L / 2, wy + wh + 10.5);
  }
  /* gema de valor (canto superior direito) */
  gema(ctx, MINI_L - 21, 22, 11.5, info.manilha ? '#e0601c' : P.gema, String(info.pontos));
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  return o.c;
}
