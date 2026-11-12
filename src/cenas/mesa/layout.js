/**
 * @file Geometria da mesa e utilitários de texto que se ajusta ao espaço.
 *
 * Tudo em coordenadas do mundo (1280x720). Painel esquerdo: inspeção, pilhas e dica.
 * Centro: as camadas da rede e as mãos. Painel direito: placar, truco, curva e ações.
 *
 * A geometria do tabuleiro depende da mesa (arquitetura e número de jogadores): `definirMesa`
 * calcula, uma vez por partida, o espaço entre colunas e linhas e o tamanho das cartas da mesa,
 * e `colunaX`, `linhaY` e `cartaDaMesa` passam a responder para essa mesa.
 * Os botões são grandes (≥ 52 de altura) para o toque no celular, e a área de toque
 * passa um pouco da borda desenhada (`FOLGA_DE_TOQUE`).
 */
import { TAMANHOS_CAMADAS } from '../../nucleo/rede.js';
import { CORES, CORES_CSS, TAMANHO_CARTA, CORES_JOGADORES, CORES_JOGADORES_CSS } from '../../configuracao.js';

/** Painel esquerdo (inspeção, pilhas e dica). */
export const PAINEL_ESQ = { x: 8, y: 8, l: 244, a: 704 };
/** Painel direito (placar, curva, registro e ações). */
export const PAINEL_DIR = { x: 962, y: 8, l: 310, a: 704 };

/**
 * Posições verticais dentro do painel esquerdo, de cima para baixo.
 * `pilha` é o tamanho das cartas do limbo e do cemitério.
 */
export const ESQ = {
  titulo: 26, inspecao: 182, nota: 326, divisoria1: 374,
  pilhas: 428, pilha: { l: 66, a: 92 }, rotulosPilha: 482, terreno: 500, divisoria2: 538, dica: 548,
  /* botões REGRAS e MENU: grandes e quase quadrados, longe da borda de baixo (gestos do celular) */
  botoes: 648, alturaBotao: 64,
};

/**
 * Posições verticais dentro do painel direito. Os blocos de placar ficam empilhados a partir de
 * `blocos`, cada um com altura `alturaBloco`; o botão de truco fica logo acima das ações.
 */
export const DIR = {
  tituloMao: 28, subtitulo: 49, blocos: 64, alturaBloco: 102, passoBloco: 108, avatar: 58,
  rotuloCurva: 292, curva: 304, alturaCurva: 64, registro: 380, alturaRegistro: 132,
  truco: 540, alturaTruco: 40,
  /*
   * Ações como no NeuroDeck: duas linhas de quatro botões. Em cima, as que empilham cartas
   * (tunagem e os três ataques); embaixo, dropout, transfer, passar e limpar a seleção.
   * Só acendem os botões das jogadas possíveis com as cartas selecionadas.
   */
  acoes: 594, acoes2: 648, alturaAcao: 46,
};

/** Nome de cada ação da barra, para dicas e explicações. */
export const NOME_DA_ACAO = {
  tunagem: 'Tunagem', overfit: 'Overfit', earlystop: 'Early stop', stackoverflow: 'Stack overflow',
  dropout: 'Dropout', transfer: 'Transfer learning', passar: 'Passar a vez', limpar: 'Limpar a seleção',
};

/** Ações da barra, na ordem: [id, rótulo, linha]. O id é o tipo de alvo (ver calcularAlvos) ou a ação. */
export const BARRA_DE_ACOES = [
  ['tunagem', 'Tunagem', 0], ['overfit', 'Overfit', 0], ['earlystop', 'Early\nstop', 0], ['stackoverflow', 'Stack\noverflow', 0],
  ['dropout', 'Dropout', 1], ['transfer', 'Transfer', 1], ['passar', 'Passar', 1], ['limpar', 'Limpar', 1],
];

/**
 * Posição dos blocos do placar. Com 2 jogadores, os dois blocos grandes de sempre; com mais,
 * blocos compactos dividindo o mesmo espaço (do topo dos blocos até a curva de treino).
 * @returns {{compacto: boolean, altura: number, posicoes: number[]}}
 */
export function blocosDoPlacar(n) {
  if (n <= 2) return { compacto: false, altura: DIR.alturaBloco, posicoes: Array.from({ length: n }, (_, i) => DIR.blocos + i * DIR.passoBloco) };
  const espaco = DIR.rotuloCurva - 12 - DIR.blocos, passo = espaco / n;
  return { compacto: true, altura: passo - 4, posicoes: Array.from({ length: n }, (_, i) => DIR.blocos + i * passo) };
}

/** Quanto a área de toque de um botão passa da borda desenhada, de cada lado. */
export const FOLGA_DE_TOQUE = 4;

/**
 * Área do tabuleiro: entre os painéis, abaixo dos nomes das camadas e acima da mão de baixo.
 * Na mesa padrão (7 camadas de até 5 neurônios) as colunas ficam a 97 e as linhas a 95, com as
 * cartas no tamanho cheio; mesas maiores encolhem espaço e cartas para caber.
 */
export const TABULEIRO = { x0: 262, x1: 952, y0: 100, y1: 568, centroX: 609, centroY: 334 };
const COLUNA_MAX = 97, LINHA_MAX = 95, FOLGA_LINHA = 1.08;

/** Geometria da mesa em uso (ver `definirMesa`). Começa pela mesa padrão. */
const mesa = { tamanhos: TAMANHOS_CAMADAS.slice(), coluna: COLUNA_MAX, linha: LINHA_MAX, escala: 1 };

/**
 * Calcula a geometria do tabuleiro para os tamanhos de camada da mesa.
 * @param {number[]} tamanhos Neurônios por camada, da entrada à saída.
 * @returns {{tamanhos: number[], coluna: number, linha: number, escala: number}}
 */
export function definirMesa(tamanhos) {
  const camadas = tamanhos.length, maior = Math.max(...tamanhos);
  const largura = TABULEIRO.x1 - TABULEIRO.x0, altura = TABULEIRO.y1 - TABULEIRO.y0;
  const coluna = Math.min(COLUNA_MAX, largura / camadas);
  /* altura: a carta mais (maior - 1) espaços entre linhas, cada um com uma folga de 8% da carta */
  const cartaPelaAltura = altura / (1 + FOLGA_LINHA * (maior - 1));
  const escala = Math.min(1, cartaPelaAltura / TAMANHO_CARTA.mesaA, (coluna - 35) / TAMANHO_CARTA.mesaL);
  const linha = maior > 1 ? Math.min(LINHA_MAX, (altura - TAMANHO_CARTA.mesaA * escala) / (maior - 1)) : LINHA_MAX;
  Object.assign(mesa, { tamanhos: tamanhos.slice(), coluna, linha, escala });
  return mesa;
}

/** Geometria da mesa em uso. */
export const geometria = () => mesa;

/** Número de camadas da mesa em uso. */
export const totalDeCamadasDaMesa = () => mesa.tamanhos.length;

/** X do centro da coluna da camada. */
export const colunaX = (camada) => TABULEIRO.centroX + (camada - (mesa.tamanhos.length - 1) / 2) * mesa.coluna;
/** Y do centro do neurônio `posicao` na camada. */
export const linhaY = (camada, posicao) => TABULEIRO.centroY + (posicao - (mesa.tamanhos[camada] - 1) / 2) * mesa.linha;

/** Tamanho de exibição de uma carta da mesa (`l` x `a`) e as metades, para contornos e ligações. */
export function cartaDaMesa() {
  const l = TAMANHO_CARTA.mesaL * mesa.escala, a = TAMANHO_CARTA.mesaA * mesa.escala;
  return { l, a, ml: l / 2, ma: a / 2 };
}

/** Cor de cada jogador (até 5), em número (Phaser) e em texto (CSS). */
export const COR_JOGADOR = CORES_JOGADORES;
export const COR_JOGADOR_CSS = CORES_JOGADORES_CSS;

/** Cor do contorno que destaca cada tipo de alvo. */
export const COR_DO_ALVO = { ativar: 0xf6dc8f, tunagem: 0x7fe08a, overfit: 0xffa24a, earlystop: 0xff4d5e, stackoverflow: 0xff4dd2, dropout: 0x6fe7ff };

/** Texto da situação de cada rede. */
export const NOME_SITUACAO = { construindo: 'em construção', concluida: 'chegou à saída', earlystop: 'early stop', overflow: 'stack overflow', travada: 'sem neurônio livre' };

/** Ajusta a imagem de um neurônio ao tamanho da carta da mesa e guarda a escala-base (para animar o giro). */
export function ajustarCartaDaMesa(imagem) {
  const { l, a } = cartaDaMesa();
  imagem.setDisplaySize(l, a);
  imagem.escalaBaseX = imagem.scaleX;
  return imagem;
}

/**
 * Texto de uma linha que encolhe até caber em `larguraMax`; se ainda não couber, corta com "…".
 * Não refaz o cálculo se nada mudou.
 */
export function ajustarLinha(texto, conteudo, tamanho, larguraMax, minimo) {
  const chave = conteudo + '|' + tamanho + '|' + larguraMax;
  if (texto.ajusteAtual === chave) return texto;
  texto.ajusteAtual = chave;
  texto.setText(conteudo);
  let t = tamanho;
  texto.setFontSize(t);
  while (texto.width > larguraMax && t > minimo) { t -= 0.5; texto.setFontSize(t); }
  if (texto.width > larguraMax) {
    let corte = conteudo;
    while (corte.length > 1 && texto.width > larguraMax) { corte = corte.slice(0, -1); texto.setText(corte.trimEnd() + '…'); }
  }
  return texto;
}

/** Bloco de texto com quebra de linha que encolhe até caber na altura. */
export function ajustarBloco(texto, conteudo, tamanho, larguraMax, alturaMax, minimo) {
  const chave = conteudo + '|' + tamanho + '|' + larguraMax + '|' + alturaMax;
  if (texto.ajusteAtual === chave) return texto;
  texto.ajusteAtual = chave;
  let t = tamanho;
  texto.setWordWrapWidth(larguraMax);
  texto.setFontSize(t);
  texto.setText(conteudo);
  while (texto.height > alturaMax && t > minimo) { t -= 0.5; texto.setFontSize(t); }
  return texto;
}
