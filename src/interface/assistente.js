/**
 * @file Assistente Percy do tutorial (issue #138): o balão de fala, o escurecimento (SVG com buracos
 * nos elementos destacados), os anéis pulsantes e o botão Pular tutorial.
 *
 * Vive em `#assistente` (fora de `#paineis`, que as janelas do jogo esvaziam). A camada escura e os
 * anéis não recebem toque (`pointer-events: none`); quem impede jogadas fora do roteiro é a própria
 * mesa (ver `src/cenas/mesa/tutorial.js`). Só o balão recebe toque.
 *
 * `posicionarBalao` é uma função pura: dados o tamanho da tela, os tamanhos possíveis do balão e os
 * retângulos destacados, escolhe onde pôr o balão sem cobrir nenhum destaque e sem sair da tela.
 */
import { desenharAvatar } from '../arte/avatares.js';
import { CORES_CSS } from '../configuracao.js';
import { escaparHtml, confirmar } from './paineis.js';
import { ajustarFontesDosBotoes } from './ajusteDeBotoes.js';

/** Distância mínima entre o balão e um destaque, e entre o balão e a borda da tela. */
const FOLGA = 8;

/** Área da interseção entre dois retângulos `{x, y, l, a}`. */
function sobreposicao(r, s) {
  const l = Math.min(r.x + r.l, s.x + s.l) - Math.max(r.x, s.x), a = Math.min(r.y + r.a, s.y + s.a) - Math.max(r.y, s.y);
  return l > 0 && a > 0 ? l * a : 0;
}

/**
 * Escolhe onde pôr o balão.
 * @param {{l: number, a: number}} tela Tamanho da tela.
 * @param {{l: number, a: number}[]} tamanhos Tamanhos possíveis do balão, do preferido ao menor.
 * @param {{x: number, y: number, l: number, a: number}[]} alvos Retângulos destacados (em pixels da tela).
 * @returns {{x: number, y: number, l: number, a: number, indice: number, livre: boolean, lado: string}}
 *   `livre` é falso quando nenhuma posição evita todos os destaques (devolve a que cobre menos).
 */
export function posicionarBalao(tela, tamanhos, alvos) {
  const dentro = (x, y, t) => x >= FOLGA && y >= FOLGA && x + t.l <= tela.l - FOLGA && y + t.a <= tela.a - FOLGA;
  const limitar = (x, y, t) => [Math.max(FOLGA, Math.min(x, tela.l - FOLGA - t.l)), Math.max(FOLGA, Math.min(y, tela.a - FOLGA - t.a))];
  const uniao = alvos.length ? {
    x: Math.min(...alvos.map((r) => r.x)), y: Math.min(...alvos.map((r) => r.y)),
    l: 0, a: 0,
  } : null;
  if (uniao) {
    uniao.l = Math.max(...alvos.map((r) => r.x + r.l)) - uniao.x;
    uniao.a = Math.max(...alvos.map((r) => r.y + r.a)) - uniao.y;
  }
  const centro = uniao ? { x: uniao.x + uniao.l / 2, y: uniao.y + uniao.a / 2 } : { x: tela.l / 2, y: tela.a / 2 };
  let melhor = null;
  tamanhos.forEach((t, indice) => {
    const candidatos = [];
    if (uniao) {
      const cx = centro.x - t.l / 2, cy = centro.y - t.a / 2;
      candidatos.push(['abaixo', cx, uniao.y + uniao.a + FOLGA], ['acima', cx, uniao.y - t.a - FOLGA],
        ['direita', uniao.x + uniao.l + FOLGA, cy], ['esquerda', uniao.x - t.l - FOLGA, cy]);
    }
    /* âncoras da tela: embaixo, em cima, nas laterais e nos cantos */
    const meio = (tela.l - t.l) / 2, centroV = (tela.a - t.a) / 2, fim = tela.l - FOLGA - t.l, base = tela.a - FOLGA - t.a;
    candidatos.push(['tela-baixo', meio, base], ['tela-cima', meio, FOLGA], ['tela-esquerda', FOLGA, centroV], ['tela-direita', fim, centroV],
      ['tela-canto-1', FOLGA, base], ['tela-canto-2', fim, base], ['tela-canto-3', FOLGA, FOLGA], ['tela-canto-4', fim, FOLGA]);
    for (const [lado, px, py] of candidatos) {
      const [x, y] = lado.startsWith('tela') ? [px, py] : limitar(px, py, t);
      if (!dentro(x, y, t)) continue;
      const caixa = { x: x - FOLGA / 2, y: y - FOLGA / 2, l: t.l + FOLGA, a: t.a + FOLGA };
      const coberto = alvos.reduce((soma, r) => soma + sobreposicao(caixa, r), 0);
      const distancia = Math.hypot(x + t.l / 2 - centro.x, y + t.a / 2 - centro.y);
      const nota = coberto * 1000 + distancia + indice * 0.5;
      if (!melhor || nota < melhor.nota) melhor = { nota, x, y, l: t.l, a: t.a, indice, livre: coberto === 0, lado };
    }
  });
  if (!melhor) { const t = tamanhos[tamanhos.length - 1]; const [x, y] = limitar(FOLGA, FOLGA, t); melhor = { x, y, l: t.l, a: t.a, indice: tamanhos.length - 1, livre: false, lado: 'tela-canto-3' }; }
  delete melhor.nota;
  return melhor;
}

/** Retrato do Percy como data URL (vazio onde não há canvas, como nos testes de unidade). */
let retratoDoPercy = null;
function retrato() {
  if (retratoDoPercy === null) { try { retratoDoPercy = desenharAvatar('percy', CORES_CSS.j0, 1.5).toDataURL(); } catch (e) { retratoDoPercy = ''; } }
  return retratoDoPercy;
}

/** Contorno `evenodd` de uma camada que cobre a tela inteira, com um buraco para cada retângulo. */
export function contornoDaCamada(tela, buracos) {
  let d = 'M0 0H' + tela.l + 'V' + tela.a + 'H0Z';
  for (const r of buracos) {
    const x = Math.round(r.x), y = Math.round(r.y), l = Math.round(r.l), a = Math.round(r.a);
    d += 'M' + x + ' ' + y + 'h' + l + 'v' + a + 'h' + -l + 'Z';
  }
  return d;
}

/**
 * Cria o assistente.
 * @param {object} opcoes
 * @param {string} opcoes.nome Nome mostrado no balão.
 * @param {() => void} opcoes.aoProximo Botão do balão.
 * @param {() => void} opcoes.aoPular O jogador confirmou que quer pular o tutorial.
 * @param {() => void} opcoes.aoAprender Link "Aprender mais".
 * @returns {{mostrar: Function, esconder: Function, sacudir: Function, destruir: Function, elemento: HTMLElement}}
 */
export function criarAssistente({ nome, aoProximo, aoPular, aoAprender }) {
  let raiz = document.getElementById('assistente');
  if (!raiz) { raiz = document.createElement('div'); raiz.id = 'assistente'; document.body.appendChild(raiz); }
  raiz.innerHTML =
    '<svg class="assistente-escuro" width="100%" height="100%" aria-hidden="true"><path fill-rule="evenodd" fill="rgba(4,8,6,.62)" d=""></path></svg><div class="assistente-aneis"></div>' +
    '<div class="assistente-balao" role="dialog" aria-label="Assistente ' + escaparHtml(nome) + '" hidden>' +
    '<span class="assistente-seta"></span>' +
    '<div class="assistente-topo"><img class="assistente-retrato" alt="" width="44" height="44"><b class="assistente-nome">' + escaparHtml(nome) + '</b>' +
    '</div>' +
    '<p class="assistente-texto" aria-live="polite"></p>' +
    '<div class="assistente-botoes"><button type="button" class="assistente-pular">Pular tutorial</button>' +
    '<button type="button" class="botao discreto pequeno assistente-aprender" hidden>Aprender mais</button>' +
    '<button type="button" class="botao pequeno assistente-proximo">Próximo</button></div></div>';
  const q = (s) => raiz.querySelector(s);
  const escuro = q('.assistente-escuro'), caminho = escuro.querySelector('path'), aneis = q('.assistente-aneis'), balao = q('.assistente-balao');
  const texto = q('.assistente-texto'), proximo = q('.assistente-proximo'), aprender = q('.assistente-aprender'), seta = q('.assistente-seta');
  const foto = q('.assistente-retrato');
  const imagem = retrato();
  if (imagem) foto.src = imagem; else foto.hidden = true;
  proximo.addEventListener('click', () => aoProximo());
  aprender.addEventListener('click', () => aoAprender());
  q('.assistente-pular').addEventListener('click', () => {
    confirmar('Pular o tutorial?', 'Você pode fazê-lo quando quiser em Como jogar, no menu inicial.', [
      { rotulo: 'Continuar o tutorial', classe: 'discreto' },
      { rotulo: 'Pular tutorial', classe: 'vinho', acao: () => aoPular() },
    ]);
  });

  let estado = null, destruido = false;
  const tela = () => ({ l: window.innerWidth, a: window.innerHeight });

  /** Redesenha escurecimento, anéis e balão com o estado atual (também ao girar ou redimensionar a tela). */
  function desenhar() {
    if (destruido || !estado) return;
    const t = tela(), alvos = (estado.alvos ? estado.alvos() : []).filter((r) => r && r.l > 0 && r.a > 0);
    const margem = 4, buracos = alvos.map((r) => ({ x: r.x - margem, y: r.y - margem, l: r.l + margem * 2, a: r.a + margem * 2 }));
    caminho.setAttribute('d', contornoDaCamada(t, buracos));
    escuro.style.opacity = estado.escurecer === false ? '0' : '1';
    aneis.innerHTML = '';
    for (const r of buracos) {
      const anel = document.createElement('div');
      anel.className = 'assistente-anel';
      anel.style.cssText = 'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.l + 'px;height:' + r.a + 'px';
      aneis.appendChild(anel);
    }
    /* balão: tenta a largura preferida e depois larguras menores, até achar um lugar que não cubra os destaques */
    const larguras = [Math.min(340, t.l - 2 * FOLGA), 260, 210, 170, 140].filter((l, i, todas) => l <= t.l - 2 * FOLGA && todas.indexOf(l) === i);
    const tamanhos = larguras.map((l) => { balao.style.width = l + 'px'; balao.style.left = '0'; balao.style.top = '0'; return { l, a: balao.offsetHeight }; });
    const pos = posicionarBalao(t, tamanhos, buracos);
    balao.style.width = pos.l + 'px';
    balao.style.left = Math.round(pos.x) + 'px';
    balao.style.top = Math.round(pos.y) + 'px';
    balao.dataset.lado = pos.lado;
    balao.dataset.livre = pos.livre ? '1' : '0';
    /* seta: aponta do balão para o primeiro destaque, quando ele está por perto */
    seta.hidden = !buracos.length || pos.lado.startsWith('tela');
    if (!seta.hidden) {
      const alvo = buracos[0], cx = Math.max(16, Math.min(pos.l - 16, alvo.x + alvo.l / 2 - pos.x));
      const cy = Math.max(16, Math.min(pos.a - 16, alvo.y + alvo.a / 2 - pos.y));
      seta.className = 'assistente-seta ' + ({ abaixo: 'para-cima', acima: 'para-baixo', direita: 'para-esquerda', esquerda: 'para-direita' }[pos.lado] || '');
      seta.style.left = /esquerda|direita/.test(seta.className) ? '' : cx + 'px';
      seta.style.top = /esquerda|direita/.test(seta.className) ? cy + 'px' : '';
    }
  }
  const aoRedimensionar = () => desenhar();
  window.addEventListener('resize', aoRedimensionar);

  return {
    elemento: raiz,
    /**
     * Mostra uma fala.
     * @param {object} d
     * @param {string} d.texto
     * @param {() => object[]} [d.alvos] Devolve os retângulos destacados (em pixels da tela); chamada a cada redesenho.
     * @param {string|null} [d.botao] Texto do botão Próximo; null para esconder (jogada guiada: o jogador clica na mesa).
     * @param {boolean} [d.verbete] Mostra o link Aprender mais.
     * @param {boolean} [d.escurecer=true] Escurece o resto da tela.
     */
    mostrar(d) {
      estado = d;
      balao.hidden = false;
      texto.textContent = d.texto;
      proximo.hidden = !d.botao;
      if (d.botao) proximo.textContent = d.botao;
      aprender.hidden = !d.verbete;
      ajustarFontesDosBotoes(balao, '.botao');
      desenhar();
      if (d.botao) proximo.focus({ preventScroll: true });
    },
    /** Redesenha com os mesmos dados (a mesa mudou: carta selecionada, tela girada). */
    atualizar() { desenhar(); },
    /** Esconde o balão e os destaques (durante as jogadas do rival e as animações). */
    esconder() {
      estado = null;
      balao.hidden = true;
      aneis.innerHTML = '';
      escuro.style.opacity = '0';
    },
    /** Toque fora do roteiro: o balão balança para chamar a atenção. */
    sacudir() {
      balao.classList.remove('sacudindo');
      void balao.offsetWidth;
      balao.classList.add('sacudindo');
    },
    destruir() {
      destruido = true;
      window.removeEventListener('resize', aoRedimensionar);
      raiz.remove();
    },
  };
}
