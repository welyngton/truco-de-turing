/**
 * @file Versos das cartas, um por baralho: clássico (damasco), truco (baralho espanhol), nobreza (coroa em veludo), backprop (grafo de
 * computação), fraternidade (anéis), yin-yang (A e 2) e Power BI (painel de indicadores).
 *
 * Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas
 * resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.
 */
import { CARTA_A, CARTA_L, MINI_A, MINI_L } from './paleta.js';
import { ajustarFonte, brilho, caminhoArredondado, criarTela, degradeLinear, degradeRadial, geradorComSemente, granulado, hashDoTexto, semSombra, sombraSuave } from './pincel.js';
import { desenharEmblema } from './emblemas.js';

const DOURADO = [[0, '#fff1b8'], [0.3, '#c99a3a'], [0.6, '#ffe7a0'], [1, '#8a5a10']];
/** Moldura dourada dupla do verso das cartas. */
function molduraDourada(ctx, W, H, dourado) {
  ctx.strokeStyle = dourado; ctx.lineWidth = 3; caminhoArredondado(ctx, 17, 17, W - 34, H - 34, 8); ctx.stroke();
  ctx.lineWidth = 1; caminhoArredondado(ctx, 23, 23, W - 46, H - 46, 6); ctx.stroke();
  [[23, 23, 1, 1], [W - 23, 23, -1, 1], [23, H - 23, 1, -1], [W - 23, H - 23, -1, -1]].forEach(function (c) {
    ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(c[2], c[3]);
    ctx.strokeStyle = dourado; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(4, 26); ctx.bezierCurveTo(4, 8, 8, 4, 26, 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(14, 14, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = dourado; ctx.beginPath(); ctx.arc(14, 14, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}
/** Escreve o título do verso (linha a) e o subtítulo (linha b) centralizados. */
function legenda(ctx, W, y, a, b, cor, larguraMax) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cor || '#f2d488';
  if (a) { ctx.font = '700 12px Cinzel, Georgia, serif'; ctx.fillText(a, W / 2, y); }
  if (b) { ajustarFonte(ctx, b, larguraMax || 126, 16, '900', 'Cinzel, Georgia, serif', 9); ctx.fillText(b, W / 2, y + 18); }
}

/** Clássico: damasco vinho com a rede neural dourada */
function versoClassico(ctx, W, H, aleatorio) {
  ctx.save(); caminhoArredondado(ctx, 9, 9, W - 18, H - 18, 9); ctx.clip();
  ctx.fillStyle = degradeRadial(ctx, W / 2, H / 2, 20, W / 2, H / 2, H * 0.7, [[0, '#8e1c2c'], [0.6, '#5c0e1a'], [1, '#2a050c']]);
  ctx.fillRect(0, 0, W, H);
  for (let yy = 0; yy < H + 30; yy += 26) {
    for (let xx = 0; xx < W + 30; xx += 26) {
      let ox = (yy / 26) % 2 ? 13 : 0;
      ctx.save(); ctx.translate(xx + ox, yy);
      ctx.fillStyle = 'rgba(232,190,110,.13)';
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(6, -3, 0, 9); ctx.quadraticCurveTo(-6, -3, 0, -9); ctx.fill();
      ctx.fillStyle = 'rgba(232,190,110,.2)'; ctx.beginPath(); ctx.arc(0, -11, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  granulado(ctx, 9, 9, W - 18, H - 18, aleatorio, 0.06, 0.1);
  ctx.restore();
  let dourado = degradeLinear(ctx, 0, 0, W, H, DOURADO);
  molduraDourada(ctx, W, H, dourado);
  sombraSuave(ctx, 10, 3, 0.7);
  ctx.fillStyle = degradeRadial(ctx, W / 2, H / 2 - 20, 6, W / 2, H / 2, 100, [[0, '#2b1a0e'], [1, '#0e0804']]);
  ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 74, 100, 0, 0, Math.PI * 2); ctx.fill();
  semSombra(ctx);
  ctx.strokeStyle = dourado; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 67, 93, 0, 0, Math.PI * 2); ctx.stroke();
  [['espada', 0, -78], ['copa', 56, 0], ['ouro', 0, 78], ['pau', -56, 0]].forEach(function (e) {
    ctx.globalAlpha = 0.85; desenharEmblema(ctx, e[0], W / 2 + e[1], H / 2 + e[2], 22, 0, { sombra: false }); ctx.globalAlpha = 1;
  });
  let cols = [[3, -30], [4, 0], [2, 30]];
  let pts = cols.map(function (cc) { let a = []; for (let j = 0; j < cc[0]; j++) a.push([W / 2 + cc[1], H / 2 - 16 + (j - (cc[0] - 1) / 2) * 18]); return a; });
  ctx.lineWidth = 1;
  for (let a2 = 0; a2 < 2; a2++) pts[a2].forEach(function (p) { pts[a2 + 1].forEach(function (q) { ctx.strokeStyle = 'rgba(232,200,120,.6)'; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }); });
  pts.forEach(function (cor, ci) {
    cor.forEach(function (p) {
      brilho(ctx, p[0], p[1], 9, ci === 1 ? '#f59322' : '#4aa3df', 0.6);
      ctx.fillStyle = ci === 1 ? '#f59322' : '#4aa3df'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffe7a0'; ctx.lineWidth = 1; ctx.stroke();
    });
  });
  legenda(ctx, W, H / 2 + 34, 'TRUCO DE', 'TURING');
}

/** Truco: verso de baralho espanhol, margem branca, treliça azul, espada e pau cruzados */
function versoTruco(ctx, W, H, aleatorio) {
  ctx.fillStyle = '#f7f2e6'; caminhoArredondado(ctx, 6, 6, W - 12, H - 12, 10); ctx.fill();
  ctx.save(); caminhoArredondado(ctx, 16, 16, W - 32, H - 32, 6); ctx.clip();
  ctx.fillStyle = degradeLinear(ctx, 0, 16, 0, H - 16, [[0, '#2a56b8'], [1, '#132f70']]);
  ctx.fillRect(16, 16, W - 32, H - 32);
  for (let y = 10; y < H; y += 16) {
    for (let x = 8; x < W; x += 16) {
      let ox = ((y - 10) / 16) % 2 ? 8 : 0;
      let cx = x + ox, cy = y;
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 5); ctx.lineTo(cx - 5, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(230,60,70,.75)'; ctx.beginPath(); ctx.arc(cx, cy, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  granulado(ctx, 16, 16, W - 32, H - 32, aleatorio, 0.05, 0.08);
  ctx.restore();
  ctx.strokeStyle = '#c0283c'; ctx.lineWidth = 2.4; caminhoArredondado(ctx, 16, 16, W - 32, H - 32, 6); ctx.stroke();
  ctx.strokeStyle = '#f7f2e6'; ctx.lineWidth = 1.2; caminhoArredondado(ctx, 21, 21, W - 42, H - 42, 5); ctx.stroke();
  /* naipes nos cantos */
  [['copa', 36, 38], ['ouro', W - 36, 38], ['espada', 36, H - 38], ['pau', W - 36, H - 38]].forEach(function (e) {
    ctx.fillStyle = '#f7f2e6'; ctx.beginPath(); ctx.arc(e[1], e[2], 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c0283c'; ctx.lineWidth = 1.4; ctx.stroke();
    desenharEmblema(ctx, e[0], e[1], e[2], 20, 0, { sombra: false });
  });
  /* medalhão oval */
  sombraSuave(ctx, 8, 3, 0.55);
  ctx.fillStyle = '#f7f2e6'; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 70, 98, 0, 0, Math.PI * 2); ctx.fill();
  semSombra(ctx);
  ctx.strokeStyle = '#c0283c'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = '#2a56b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 63, 91, 0, 0, Math.PI * 2); ctx.stroke();
  desenharEmblema(ctx, 'espada', W / 2, H / 2 - 14, 118, 0.5, { sombra: false });
  desenharEmblema(ctx, 'pau', W / 2, H / 2 - 14, 104, -0.3, { sombra: false });
  /* fita */
  let ry = H / 2 + 58;
  ctx.fillStyle = '#8a1424';
  ctx.beginPath(); ctx.moveTo(W / 2 - 66, ry - 9); ctx.lineTo(W / 2 - 52, ry - 9); ctx.lineTo(W / 2 - 52, ry + 11); ctx.lineTo(W / 2 - 66, ry + 11); ctx.lineTo(W / 2 - 60, ry + 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W / 2 + 66, ry - 9); ctx.lineTo(W / 2 + 52, ry - 9); ctx.lineTo(W / 2 + 52, ry + 11); ctx.lineTo(W / 2 + 66, ry + 11); ctx.lineTo(W / 2 + 60, ry + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = degradeLinear(ctx, 0, ry - 12, 0, ry + 12, [[0, '#d8364a'], [1, '#9a1a2a']]);
  ctx.beginPath(); ctx.moveTo(W / 2 - 56, ry - 12); ctx.quadraticCurveTo(W / 2, ry - 18, W / 2 + 56, ry - 12); ctx.lineTo(W / 2 + 56, ry + 8); ctx.quadraticCurveTo(W / 2, ry + 2, W / 2 - 56, ry + 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#4a0a12'; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff6dc'; ctx.font = '900 13px Cinzel, Georgia, serif';
  ctx.fillText('TRUCO', W / 2, ry - 3);
}

/** Fraternidade: corrente de anéis dourados sobre verde, quatro naipes de mãos dadas */
function versoFraternidade(ctx, W, H, aleatorio) {
  ctx.save(); caminhoArredondado(ctx, 9, 9, W - 18, H - 18, 9); ctx.clip();
  ctx.fillStyle = degradeRadial(ctx, W / 2, H / 2, 20, W / 2, H / 2, H * 0.7, [[0, '#24784d'], [0.6, '#11452b'], [1, '#062014']]);
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1.4;
  for (let y = 0; y < H + 24; y += 20) {
    for (let x = 0; x < W + 24; x += 20) {
      let ox = (y / 20) % 2 ? 10 : 0;
      ctx.strokeStyle = 'rgba(240,210,130,.2)';
      ctx.beginPath(); ctx.arc(x + ox, y, 8.5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  granulado(ctx, 9, 9, W - 18, H - 18, aleatorio, 0.05, 0.08);
  ctx.restore();
  let dourado = degradeLinear(ctx, 0, 0, W, H, DOURADO);
  molduraDourada(ctx, W, H, dourado);
  sombraSuave(ctx, 10, 3, 0.7);
  ctx.fillStyle = degradeRadial(ctx, W / 2, H / 2 - 20, 6, W / 2, H / 2, 100, [[0, '#0f3a24'], [1, '#04140b']]);
  ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 74, 100, 0, 0, Math.PI * 2); ctx.fill();
  semSombra(ctx);
  ctx.strokeStyle = dourado; ctx.lineWidth = 3.5; ctx.stroke();
  /* quatro anéis entrelaçados */
  let cy = H / 2 - 16, R = 21;
  let rings = [[-24, -20, 'espada'], [24, -20, 'copa'], [-24, 20, 'pau'], [24, 20, 'ouro']];
  rings.forEach(function (r) {
    ctx.strokeStyle = '#0b0907'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.arc(W / 2 + r[0], cy + r[1], R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = dourado; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.arc(W / 2 + r[0], cy + r[1], R, 0, Math.PI * 2); ctx.stroke();
  });
  /* entrelaçado: redesenha um trecho de cada anel por cima do vizinho */
  rings.forEach(function (r, i) {
    ctx.strokeStyle = dourado; ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.arc(W / 2 + r[0], cy + r[1], R, i * Math.PI / 2 - 0.5, i * Math.PI / 2 + 0.2); ctx.stroke();
  });
  rings.forEach(function (r) { desenharEmblema(ctx, r[2], W / 2 + r[0], cy + r[1], 22, 0, { sombra: false }); });
  legenda(ctx, W, H / 2 + 44, 'BARALHO DA', 'FRATERNIDADE', null, 118);
  ctx.font = 'italic 500 10px Spectral, Georgia, serif'; ctx.fillStyle = '#d9c890';
  ctx.fillText('mesmo naipe, valor em dobro', W / 2, H / 2 + 80);
}

/** Yin-yang: campo dividido em preto e marfim, só Ás e Dois */
function simboloYinYang(ctx, cx, cy, r) {
  ctx.fillStyle = '#121010'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4ecd9'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy - r / 2, r / 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#121010'; ctx.beginPath(); ctx.arc(cx, cy + r / 2, r / 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#121010'; ctx.beginPath(); ctx.arc(cx, cy - r / 2, r / 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4ecd9'; ctx.beginPath(); ctx.arc(cx, cy + r / 2, r / 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 ' + Math.round(r / 4.2) + 'px Cinzel, Georgia, serif';
  ctx.fillStyle = '#f4ecd9'; ctx.fillText('A', cx, cy - r / 2 + 1);
  ctx.fillStyle = '#121010'; ctx.fillText('2', cx, cy + r / 2 + 1);
}
/** Verso do baralho yin-yang: metades clara e escura e o símbolo no centro. */
function versoYinYang(ctx, W, H, aleatorio) {
  let bx = function (y) { return W / 2 + Math.sin((y / H) * Math.PI * 2) * 34; };
  ctx.save(); caminhoArredondado(ctx, 9, 9, W - 18, H - 18, 9); ctx.clip();
  ctx.fillStyle = '#121010'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f4ecd9';
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let y = 0; y <= H; y += 4) ctx.lineTo(bx(y), y);
  ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.font = '700 10px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let gy = 14; gy < H; gy += 18) {
    for (let gx = 12; gx < W; gx += 18) {
      let clara = gx < bx(gy);
      let glyph = ((gx / 18 + gy / 18) | 0) % 2 ? 'A' : '2';
      ctx.fillStyle = clara ? 'rgba(18,16,16,.09)' : 'rgba(244,236,217,.1)';
      ctx.fillText(glyph, gx, gy);
    }
  }
  ctx.restore();
  let dourado = degradeLinear(ctx, 0, 0, W, H, DOURADO);
  molduraDourada(ctx, W, H, dourado);
  sombraSuave(ctx, 12, 3, 0.6);
  ctx.fillStyle = '#121010'; ctx.beginPath(); ctx.arc(W / 2, H / 2 - 12, 64, 0, Math.PI * 2); ctx.fill();
  semSombra(ctx);
  simboloYinYang(ctx, W / 2, H / 2 - 12, 60);
  ctx.strokeStyle = dourado; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(W / 2, H / 2 - 12, 63, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(W / 2, H / 2 - 12, 69, 0, Math.PI * 2); ctx.stroke();
  /* faixa do nome */
  ctx.fillStyle = 'rgba(18,16,16,.85)'; caminhoArredondado(ctx, W / 2 - 62, H / 2 + 66, 124, 26, 5); ctx.fill();
  ctx.strokeStyle = dourado; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = '#f2d488'; ctx.font = '900 14px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('YIN · YANG', W / 2, H / 2 + 79.5);
}

/** Power BI: painel de indicadores (gráficos e um botão de atualizar), que embaralha a mão */
function versoPowerBI(ctx, W, H, aleatorio) {
  let Y = '#f2c811', Y2 = '#e8a33a', T = '#3fc1c9';
  ctx.save(); caminhoArredondado(ctx, 9, 9, W - 18, H - 18, 9); ctx.clip();
  ctx.fillStyle = degradeLinear(ctx, 0, 0, 0, H, [[0, '#232838'], [1, '#0f121a']]);
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(242,200,17,.07)'; ctx.lineWidth = 0.8;
  for (let g = 9; g < W; g += 12) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.stroke(); }
  for (let g2 = 9; g2 < H; g2 += 12) { ctx.beginPath(); ctx.moveTo(0, g2); ctx.lineTo(W, g2); ctx.stroke(); }
  /* azulejos de mini gráficos */
  let tiles = [[22, 24, 60, 40, 'bar'], [92, 24, 60, 40, 'line'], [162, 24, 56, 40, 'pie'], [22, 284, 60, 30, 'line'], [92, 284, 60, 30, 'pie'], [162, 284, 56, 30, 'bar']];
  tiles.forEach(function (t) {
    ctx.fillStyle = 'rgba(255,255,255,.05)'; caminhoArredondado(ctx, t[0], t[1], t[2], t[3], 4); ctx.fill();
    ctx.strokeStyle = 'rgba(242,200,17,.25)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.globalAlpha = 0.55;
    if (t[4] === 'bar') {
      for (let b = 0; b < 5; b++) { let hh = 4 + aleatorio() * (t[3] - 14); ctx.fillStyle = b % 2 ? T : Y; ctx.fillRect(t[0] + 6 + b * 10, t[1] + t[3] - 5 - hh, 7, hh); }
    } else if (t[4] === 'line') {
      ctx.strokeStyle = Y; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let p = 0; p <= 6; p++) { let px = t[0] + 6 + p * (t[2] - 12) / 6, py = t[1] + 8 + aleatorio() * (t[3] - 16); if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke();
    } else {
      let pcx = t[0] + t[2] / 2, pcy = t[1] + t[3] / 2;
      [[0, 2.4, Y], [2.4, 4.4, T], [4.4, 6.283, Y2]].forEach(function (s) { ctx.strokeStyle = s[2]; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(pcx, pcy, Math.min(11, t[3] / 2 - 5), s[0], s[1]); ctx.stroke(); });
    }
    ctx.globalAlpha = 1;
  });
  ctx.restore();
  ctx.strokeStyle = Y; ctx.lineWidth = 2.4; caminhoArredondado(ctx, 15, 15, W - 30, H - 30, 7); ctx.stroke();
  /* painel central */
  let px0 = W / 2 - 74, py0 = H / 2 - 92, pw = 148, ph = 184;
  sombraSuave(ctx, 12, 4, 0.6);
  ctx.fillStyle = '#1b2030'; caminhoArredondado(ctx, px0, py0, pw, ph, 10); ctx.fill();
  semSombra(ctx);
  ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.stroke();
  /* KPI */
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9aa3b8'; ctx.font = '700 8px Spectral, Georgia, serif'; ctx.fillText('ACURÁCIA DA MÃO', px0 + 12, py0 + 16);
  ctx.fillStyle = Y; ctx.font = '800 22px Spectral, Georgia, serif'; ctx.fillText('?? %', px0 + 12, py0 + 36);
  /* botão de atualizar (as cartas mudam) */
  let rx = px0 + pw - 24, ry = py0 + 26;
  ctx.strokeStyle = T; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(rx, ry, 10, -0.3, Math.PI * 1.3); ctx.stroke();
  ctx.fillStyle = T; ctx.beginPath(); ctx.moveTo(rx + 12, ry - 8); ctx.lineTo(rx + 11, ry + 2); ctx.lineTo(rx + 3, ry - 4); ctx.closePath(); ctx.fill();
  /* gráfico de linha da curva de treino */
  let gx0 = px0 + 12, gy0 = py0 + 58, gw = pw - 24, gh = 52;
  ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(gx0, gy0, gw, gh);
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 0.7;
  [0.33, 0.66].forEach(function (f) { ctx.beginPath(); ctx.moveTo(gx0, gy0 + gh * f); ctx.lineTo(gx0 + gw, gy0 + gh * f); ctx.stroke(); });
  let pts = [0.9, 0.7, 0.75, 0.5, 0.42, 0.3, 0.34, 0.18];
  ctx.fillStyle = degradeLinear(ctx, 0, gy0, 0, gy0 + gh, [[0, 'rgba(242,200,17,.35)'], [1, 'rgba(242,200,17,0)']]);
  ctx.beginPath(); ctx.moveTo(gx0, gy0 + gh);
  pts.forEach(function (v, i) { ctx.lineTo(gx0 + i * gw / (pts.length - 1), gy0 + v * gh); });
  ctx.lineTo(gx0 + gw, gy0 + gh); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.beginPath();
  pts.forEach(function (v, i) { let x = gx0 + i * gw / (pts.length - 1), y = gy0 + v * gh; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.stroke();
  /* rosca + barras */
  let dcx = px0 + 36, dcy = py0 + 142;
  [[0, 3.1, Y], [3.1, 4.9, T], [4.9, 6.283, Y2]].forEach(function (s) { ctx.strokeStyle = s[2]; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(dcx, dcy, 17, s[0] - 1.57, s[1] - 1.57); ctx.stroke(); });
  [14, 26, 18, 32].forEach(function (hh, i) { ctx.fillStyle = i % 2 ? T : Y; ctx.fillRect(px0 + 74 + i * 15, py0 + 160 - hh, 10, hh); });
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(px0 + 70, py0 + 160, 66, 1);
  legenda(ctx, W, H / 2 + 84, null, 'DASHBOARD', Y, 150);
}

/** Nobreza: veludo púrpura com flores-de-lis e uma coroa dourada no medalhão */
function versoNobreza(ctx, W, H, aleatorio) {
  ctx.save(); caminhoArredondado(ctx, 9, 9, W - 18, H - 18, 9); ctx.clip();
  ctx.fillStyle = degradeRadial(ctx, W / 2, H / 2, 20, W / 2, H / 2, H * 0.72, [[0, '#5b2a86'], [0.6, '#3a1658'], [1, '#170726']]);
  ctx.fillRect(0, 0, W, H);
  granulado(ctx, 0, 0, W, H, aleatorio, 0.18, 0.08);
  /* trama de losangos com flores-de-lis pequenas */
  ctx.strokeStyle = 'rgba(242,212,136,.16)'; ctx.lineWidth = 0.8;
  for (let d = -H; d < W + H; d += 24) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d, H); ctx.lineTo(d + H, 0); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(242,212,136,.28)';
  for (let y = 12; y < H; y += 24) for (let x = (y / 24) % 2 ? 12 : 24; x < W; x += 24) florDeLis(ctx, x, y, 4.5);
  ctx.restore();
  molduraDourada(ctx, W, H, degradeLinear(ctx, 0, 0, W, H, DOURADO));
  /* medalhão com a coroa */
  const cx = W / 2, cy = H / 2 - 8;
  sombraSuave(ctx, 12, 4, 0.6);
  ctx.fillStyle = degradeRadial(ctx, cx, cy - 10, 4, cx, cy, 58, [[0, '#7a3cae'], [1, '#2a0d44']]);
  ctx.beginPath(); ctx.arc(cx, cy, 56, 0, Math.PI * 2); ctx.fill();
  semSombra(ctx);
  ctx.strokeStyle = degradeLinear(ctx, cx - 56, cy - 56, cx + 56, cy + 56, DOURADO); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 56, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.stroke();
  coroa(ctx, cx, cy + 4, 70, degradeLinear(ctx, cx - 35, cy - 30, cx + 35, cy + 30, DOURADO));
  legenda(ctx, W, H / 2 + 74, 'J · Q · K', 'NOBREZA', '#f2d488', 150);
}
/** Flor-de-lis simples, centrada em (x, y), de tamanho s. */
function florDeLis(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6); ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.4, x, y + s * 0.4); ctx.quadraticCurveTo(x - s * 0.7, y - s * 0.4, x, y - s * 1.6);
  ctx.moveTo(x - s * 0.2, y); ctx.quadraticCurveTo(x - s * 1.6, y - s * 1.2, x - s * 1.2, y + s * 0.6); ctx.quadraticCurveTo(x - s * 0.6, y + s * 0.2, x - s * 0.2, y + s * 0.3);
  ctx.moveTo(x + s * 0.2, y); ctx.quadraticCurveTo(x + s * 1.6, y - s * 1.2, x + s * 1.2, y + s * 0.6); ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.2, x + s * 0.2, y + s * 0.3);
  ctx.fill();
  ctx.fillRect(x - s * 0.9, y + s * 0.5, s * 1.8, s * 0.35);
}
/** Coroa de três pontas com gemas, de largura l, base em (cx, cy). */
function coroa(ctx, cx, cy, l, ouro) {
  const a = l * 0.62, x0 = cx - l / 2;
  ctx.fillStyle = ouro; ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, cy); ctx.lineTo(x0 - l * 0.04, cy - a * 0.75); ctx.lineTo(x0 + l * 0.22, cy - a * 0.38);
  ctx.lineTo(cx, cy - a); ctx.lineTo(x0 + l * 0.78, cy - a * 0.38); ctx.lineTo(x0 + l * 1.04, cy - a * 0.75); ctx.lineTo(x0 + l, cy);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillRect(x0 - 2, cy, l + 4, a * 0.22); ctx.strokeRect(x0 - 2, cy, l + 4, a * 0.22);
  [[x0 - l * 0.04, cy - a * 0.75, '#e8304a'], [cx, cy - a, '#3fa7e0'], [x0 + l * 1.04, cy - a * 0.75, '#e8304a']].forEach(function (g) {
    ctx.fillStyle = g[2]; ctx.beginPath(); ctx.arc(g[0], g[1], l * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
  [0.25, 0.5, 0.75].forEach(function (f, i) { ctx.fillStyle = i === 1 ? '#3fae6a' : '#e8304a'; ctx.beginPath(); ctx.arc(x0 + l * f, cy + a * 0.11, l * 0.045, 0, Math.PI * 2); ctx.fill(); });
}

/** Backprop: papel de projeto azul com o grafo de computação de um neurônio (x·w + b → f → a) */
function versoBackprop(ctx, W, H, aleatorio) {
  const TINTA = '#cfe6ff', AC = '#ffb347';
  ctx.save(); caminhoArredondado(ctx, 9, 9, W - 18, H - 18, 9); ctx.clip();
  ctx.fillStyle = degradeLinear(ctx, 0, 0, 0, H, [[0, '#123a63'], [1, '#081d33']]);
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(207,230,255,.08)'; ctx.lineWidth = 0.6;
  for (let g = 9; g < W; g += 8) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.stroke(); }
  for (let g2 = 9; g2 < H; g2 += 8) { ctx.beginPath(); ctx.moveTo(0, g2); ctx.lineTo(W, g2); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(207,230,255,.16)'; ctx.lineWidth = 0.9;
  for (let g3 = 9; g3 < W; g3 += 40) { ctx.beginPath(); ctx.moveTo(g3, 0); ctx.lineTo(g3, H); ctx.stroke(); }
  for (let g4 = 9; g4 < H; g4 += 40) { ctx.beginPath(); ctx.moveTo(0, g4); ctx.lineTo(W, g4); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = TINTA; ctx.lineWidth = 2; caminhoArredondado(ctx, 15, 15, W - 30, H - 30, 7); ctx.stroke();
  ctx.setLineDash([4, 3]); ctx.lineWidth = 1; caminhoArredondado(ctx, 21, 21, W - 42, H - 42, 5); ctx.stroke(); ctx.setLineDash([]);
  /* grafo: três entradas → Σ → f → saída, com setas do forward pass */
  const no = function (x, y, r, rotulo, cor) {
    ctx.fillStyle = '#0d2c4d'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cor || TINTA; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = cor || TINTA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(r * 0.9) + 'px Georgia, serif'; ctx.fillText(rotulo, x, y + 1);
  };
  const seta = function (x0, y0, x1, y1) {
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const ang = Math.atan2(y1 - y0, x1 - x0);
    ctx.fillStyle = TINTA; ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - 7 * Math.cos(ang - 0.4), y1 - 7 * Math.sin(ang - 0.4)); ctx.lineTo(x1 - 7 * Math.cos(ang + 0.4), y1 - 7 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
  };
  const cy = H / 2 - 18, ent = [[44, cy - 52, 'x₁'], [44, cy, 'x₂'], [44, cy + 52, 'x₃']];
  ent.forEach(function (e, i) {
    seta(e[0] + 13, e[1], 102, cy + (i - 1) * 6);
    ctx.fillStyle = AC; ctx.font = 'italic 10px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('w' + (i + 1), 74, (e[1] + cy) / 2 - 5);
    no(e[0], e[1], 13, e[2]);
  });
  no(116, cy, 17, 'Σ', AC);
  seta(133, cy, 152, cy);
  ctx.fillStyle = '#0d2c4d'; caminhoArredondado(ctx, 154, cy - 15, 30, 30, 5); ctx.fill();
  ctx.strokeStyle = AC; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.strokeStyle = AC; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(158, cy + 8); ctx.lineTo(169, cy + 8); ctx.lineTo(180, cy - 9); ctx.stroke();
  seta(184, cy, 202, cy);
  ctx.fillStyle = TINTA; ctx.font = 'italic 700 14px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('a', 210, cy + 1);
  ctx.fillStyle = AC; ctx.font = 'italic 10px Georgia, serif'; ctx.fillText('+ b', 116, cy + 30);
  /* fórmula */
  ctx.fillStyle = TINTA; ctx.font = 'italic 15px Georgia, serif'; ctx.fillText('a = f ( w · a + b )', W / 2, H / 2 + 54);
  legenda(ctx, W, H / 2 + 84, null, 'BACKPROP', TINTA, 150);
}

const VERSOS = { classico: versoClassico, truco: versoTruco, nobreza: versoNobreza, backprop: versoBackprop, fraternidade: versoFraternidade, yinyang: versoYinYang, powerbi: versoPowerBI };

/**
 * Desenha o verso do baralho.
 * @param {'completa'|'mesa'} formato Carta completa (240x336) ou carta da mesa (120x168).
 * @param {number} S Densidade.
 * @param {string} baralho Chave de BARALHOS.
 */
export function desenharVerso(formato, S, baralho) {
  let W = formato === 'mesa' ? MINI_L : CARTA_L, H = formato === 'mesa' ? MINI_A : CARTA_A;
  let o = criarTela(W, H, S || 1), ctx = o.ctx;
  let k = W / CARTA_L;
  ctx.scale(k, k);
  W = CARTA_L; H = CARTA_A;
  let aleatorio = geradorComSemente(hashDoTexto('back' + (baralho || 'classico')));
  ctx.fillStyle = '#0a0806'; caminhoArredondado(ctx, 0, 0, W, H, 13); ctx.fill();
  (VERSOS[baralho] || versoClassico)(ctx, W, H, aleatorio);
  return o.c;
}
