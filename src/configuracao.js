/**
 * @file Configurações visuais compartilhadas: tamanho do mundo do jogo, cores das redes,
 * resolução de renderização e densidade das texturas.
 */

/** O mundo do jogo tem sempre 1280x720 unidades; a câmera aplica o zoom para cada tela. */
export const MUNDO = { largura: 1280, altura: 720 };

/** Cores das duas redes (padrão do TensorFlow Playground), do dourado e afins, em número (Phaser). */
export const CORES = { j0: 0x4aa3df, j1: 0xf59322, ouro: 0xd9b260, vinho: 0x7a1626, feltro: 0x0f3b2a, pergaminho: 0xefe3c6, tinta: 0x24170c };

/** As mesmas cores em texto CSS. */
export const CORES_CSS = { j0: '#4aa3df', j1: '#f59322', ouro: '#d9b260', pergaminho: '#efe3c6', tinta: '#24170c' };

/**
 * Cor da rede de cada jogador, até 5 (azul e laranja do Playground, depois verde, lilás e rosa).
 * Com 2 jogadores, ficam as duas primeiras.
 */
export const CORES_JOGADORES = [0x4aa3df, 0xf59322, 0x5cc98a, 0xb48cff, 0xff6fb1];
export const CORES_JOGADORES_CSS = ['#4aa3df', '#f59322', '#5cc98a', '#b48cff', '#ff6fb1'];

/** Fontes dos textos desenhados pelo Phaser. */
export const FONTES = { titulo: 'Cinzel, Georgia, serif', texto: 'Spectral, Georgia, serif' };

/**
 * Resolução interna: o canvas tem os pixels físicos que a tela consegue mostrar em tela cheia
 * (tamanho da tela × densidade de pixels), até 3x o mundo. Pode ser forçada com `?res=2` na URL.
 */
export const RESOLUCAO = (() => {
  try {
    const forcada = /[?&]res=([\d.]+)/.exec(location.search);
    if (forcada) return Math.max(1, Math.min(3, parseFloat(forcada[1])));
  } catch (e) { /* fora do navegador */ }
  const dpr = globalThis.devicePixelRatio || 1;
  const lado = Math.max(screen.width || 1280, screen.height || 720);
  const outro = Math.min(screen.width || 1280, screen.height || 720);
  const encaixe = Math.min(lado / MUNDO.largura, outro / MUNDO.altura);
  return Math.max(1, Math.min(3, Math.ceil(encaixe * dpr * 4) / 4));
})();

/** Densidade (fator sobre o tamanho-base) com que cada tipo de textura é gerado. */
export const DENSIDADE = {
  mesa: Math.max(1, RESOLUCAO * 0.62),     /* carta da mesa: base 120x168, exibida a 62x87 */
  mao: Math.max(1, RESOLUCAO * 0.95),      /* carta na mão: face limpa, base 120x168, exibida a 104x145 */
  inspecao: Math.max(1, RESOLUCAO * 0.95), /* carta ampliada: base 240x336, exibida a ~197x276 */
  avatar: Math.max(1, RESOLUCAO * 0.7),
};

/** Tamanho de exibição das cartas no mundo do jogo. */
export const TAMANHO_CARTA = { mesaL: 62, mesaA: 87, maoL: 104, maoA: 145, inspecaoL: 197, inspecaoA: 276 };

/** Diz se a página foi aberta pedindo o renderizador Canvas (`?renderer=canvas`), útil em testes. */
export const FORCAR_CANVAS = (() => { try { return /[?&]renderer=canvas/.test(location.search); } catch (e) { return false; } })();
