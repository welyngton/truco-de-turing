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
 * Paletas dos botões: `gradiente` (do brilho do topo à base, 4 tons; o 2º é a cor "da cara" do botão)
 * e `texto` (cor do rótulo, com contraste mínimo de 4,5:1 sobre o botão: ver o teste de arte).
 * Cada ação da mesa tem a sua cor (`COR_DA_ACAO`), para o jogador gravar cada função pela cor.
 */
export const PALETAS_DOS_BOTOES = {
  ouro: { gradiente: ['#fff1bf', '#e2bb5c', '#a3741f', '#5c3d0a'], texto: '#2a1606' },
  vinho: { gradiente: ['#f08a8a', '#c0303e', '#7a1424', '#3a0810'], texto: '#fff0e0' },
  pedra: { gradiente: ['#bcae8b', '#6f6146', '#4d4129', '#241d10'], texto: '#f6ecd6' },
  verde: { gradiente: ['#7fd99a', '#2a7d4f', '#1b5736', '#0a2616'], texto: '#ffffff' },
  laranja: { gradiente: ['#ffb26b', '#b04e0c', '#7d3a0a', '#3a1904'], texto: '#ffffff' },
  azul: { gradiente: ['#8ab8ff', '#2f5fbf', '#1f4287', '#0b1a40'], texto: '#ffffff' },
  roxo: { gradiente: ['#c9a0ff', '#7338b8', '#522a86', '#25103c'], texto: '#ffffff' },
  magenta: { gradiente: ['#ff9ae0', '#a8268f', '#7a1a68', '#3a0a32'], texto: '#ffffff' },
  turquesa: { gradiente: ['#7fe3e0', '#12727c', '#0f5a62', '#052a2e'], texto: '#ffffff' },
};

/** Variante (paleta) de cada botão de ação da mesa, uma por ação. */
export const COR_DA_ACAO = {
  tunagem: 'verde', overfit: 'laranja', earlystop: 'azul', stackoverflow: 'roxo',
  dropout: 'turquesa', transfer: 'magenta', passar: 'ouro', truco: 'vinho', limpar: 'pedra',
};

/** Cor "da cara" (CSS) de uma ação, para as dicas e a ajuda usarem a mesma cor do botão. */
export function corDaAcao(acao) {
  const p = PALETAS_DOS_BOTOES[COR_DA_ACAO[acao]];
  return p ? p.gradiente[1] : null;
}

/**
 * Textura de um botão de w × h (base).
 * @param {string} variante Uma das `PALETAS_DOS_BOTOES`: ouro (passar), vinho (truco), pedra (utilidades) ou a cor da ação.
 * @param {'normal'|'foco'|'inativo'} estado
 */
export function desenharBotao(w, h, S, variante, estado) {
  let pad = MARGEM_BOTAO, o = criarTela(w + pad * 2, h + pad * 2, S || 1), ctx = o.ctx;
  let x = pad, y = pad - 1, r = Math.min(10, h / 3.2);
  let V = (PALETAS_DOS_BOTOES[variante] || PALETAS_DOS_BOTOES.ouro).gradiente;
  /* apagado, o botão mantém um resto da sua cor (escurecida), para a cor continuar ensinando a função */
  if (estado === 'inativo') V = variante === 'ouro' || variante === 'pedra' ? ['#4a4232', '#342e22', '#262118', '#120f0a'] : V.map(function (c) { return tonalizar(c, -0.62); });
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
