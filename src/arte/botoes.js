/**
 * @file Texturas dos botões da mesa e da faísca das explosões. São imagens próprias porque o renderizador Canvas do Phaser não tem degradês nem tint.
 *
 * Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas
 * resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.
 */
import { brilho, caminhoArredondado, criarTela, degradeLinear, geradorComSemente, granulado, hashDoTexto, semSombra, sombraSuave, tonalizar } from './pincel.js';

/** Faísca radial (32x32 base) usada nas explosões de partículas, na cor pedida. */
export function desenharFaisca(S, cor) {
  let o = criarTela(32, 32, S || 1), ctx = o.ctx;
  brilho(ctx, 16, 16, 16, cor || '#ffffff', 1);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16, 16, 3.5, 0, Math.PI * 2); ctx.fill();
  return o.c;
}

/** Margem em volta do botão, reservada para a sombra. */
export const MARGEM_BOTAO = 5;

/**
 * Textura de um botão de w × h (base).
 * @param {'ouro'|'vinho'|'pedra'} variante Dourado (ações), vinho (truco) ou pedra (utilidades).
 * @param {'normal'|'foco'|'inativo'} estado
 */
export function desenharBotao(w, h, S, variante, estado) {
  let pad = MARGEM_BOTAO, o = criarTela(w + pad * 2, h + pad * 2, S || 1), ctx = o.ctx;
  let x = pad, y = pad - 1, r = Math.min(10, h / 3.2);
  let V = {
    ouro: ['#fff1bf', '#e2bb5c', '#a3741f', '#5c3d0a'],
    vinho: ['#f08a8a', '#c0303e', '#7a1424', '#3a0810'],
    pedra: ['#cbbd9a', '#8a7a5a', '#5a4c32', '#2a2214'],
  }[variante] || [];
  if (estado === 'inativo') V = variante === 'vinho' ? ['#5a2a30', '#3e1a1f', '#2c1015', '#160709'] : ['#4a4232', '#342e22', '#262118', '#120f0a'];
  if (estado === 'foco') V = V.map(function (c) { return tonalizar(c, 0.18); });
  sombraSuave(ctx, 5, 2.5, estado === 'inativo' ? 0.35 : 0.6);
  ctx.fillStyle = '#0b0907'; caminhoArredondado(ctx, x, y + 1.5, w, h, r); ctx.fill();
  semSombra(ctx);
  ctx.fillStyle = degradeLinear(ctx, 0, y, 0, y + h, [[0, V[0]], [0.12, V[1]], [0.75, V[2]], [1, V[3]]]);
  caminhoArredondado(ctx, x, y, w, h, r); ctx.fill();
  ctx.save(); caminhoArredondado(ctx, x, y, w, h, r); ctx.clip();
  if (estado !== 'inativo') {
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y - h * 0.15, w * 0.62, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  granulado(ctx, x, y, w, h, geradorComSemente(hashDoTexto(variante + w + h)), 0.06, 0.08);
  ctx.restore();
  ctx.lineWidth = 1.4; ctx.strokeStyle = '#0b0907'; caminhoArredondado(ctx, x, y, w, h, r); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = estado === 'inativo' ? 'rgba(217,178,96,.22)' : 'rgba(255,255,255,.45)';
  caminhoArredondado(ctx, x + 1.6, y + 1.6, w - 3.2, h - 3.2, r - 1.5); ctx.stroke();
  return o.c;
}
