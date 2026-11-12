/**
 * @file Parte da CenaMesa: animações e falas. Traduz os eventos das regras (ver nucleo/partida.js)
 * em giros de carta, cartas voando, faíscas, faixas de texto, tremidas de câmera, balão de fala do
 * oponente e avisos da Biblioteca de conceitos.
 */
import { MUNDO, RESOLUCAO, FONTES, TAMANHO_CARTA } from '../../configuracao.js';
import { NAIPE, ehFigura } from '../../nucleo/cartas.js';
import { pontosDaCarta, nomeDaCarta } from '../../nucleo/baralhos.js';
import { VERBETES } from '../../conteudo/grimorio.js';
import { provocar } from '../../conteudo/textos.js';
import { desenharFaisca } from '../../arte/botoes.js';
import { Som } from '../../interface/som.js';
import { mostrarAviso } from '../../interface/paineis.js';
import { texturaDaCartaNaMesa, texturaDaCartaMedia, texturaDeInspecao } from '../recursos.js';
import { colunaX, linhaY, COR_JOGADOR_CSS, PAINEL_DIR, TABULEIRO, cartaDaMesa, ajustarLinha } from './layout.js';

/** Cor e título de cada ataque. */
const ATAQUES = {
  overfit: { cor: 0xffa24a, titulo: 'OVERFIT!' },
  earlystop: { cor: 0xff4d5e, titulo: 'EARLY STOP!' },
  stackoverflow: { cor: 0xff4dd2, titulo: 'STACK OVERFLOW!' },
};

/** Número de cor 0xRRGGBB para texto CSS. */
const corCss = (cor) => '#' + cor.toString(16).padStart(6, '0');

export const metodosDeEfeitos = {
  /** Centro do neurônio na tela. */
  posicaoDoNeuronio(id) {
    const n = this.mao.neuronios[id];
    return { x: colunaX(n.camada), y: linhaY(n.camada, n.posicao) };
  },

  /** Ponto de onde saem as cartas jogadas por `j` (a mão de baixo ou o leque dele no alto). */
  origemDasCartas(j) {
    if (j === this.jogadorDeBaixo()) return { x: 610, y: 646 };
    const outros = this.outrosJogadores();
    return { x: this.posicaoDaMaoDeCima(Math.max(0, outros.indexOf(j)), outros.length).x, y: 40 };
  },

  /**
   * Anima uma lista de eventos das regras.
   * @param {object[]} eventos
   * @param {object} [jogada] Jogada que gerou os eventos (para saber quantas cartas voaram).
   * @returns {number} Milissegundos até as animações terminarem.
   */
  animarEventos(eventos, jogada) {
    let espera = 350;
    for (const evento of eventos) {
      const animar = this['animar_' + evento.tipo];
      if (animar) espera = Math.max(espera, animar.call(this, evento, jogada) || 0);
    }
    espera = Math.max(espera, this.verificarVanishing());
    if (this.mao.historico.length > 3) this.avisarVerbete('perda');
    return espera;
  },

  /** Neurônio revelado: gira a carta e mostra os pontos ganhos. */
  animar_ativacao(evento) {
    const mao = this.mao, baralho = mao.config.baralho;
    const imagem = this.visuais[evento.neuronio].imagem;
    imagem.scaleX = 0;
    this.tweens.add({ targets: imagem, scaleX: imagem.escalaBaseX, duration: 200, ease: 'Sine.out' });
    Som.virarCarta();
    const { x, y } = this.posicaoDoNeuronio(evento.neuronio);
    const pontuado = this.pontuacoes[evento.jogador].neuronios.find((n) => n.neuronio.id === evento.neuronio);
    this.textoFlutuante(x, y - 50, '+' + (pontuado ? pontuado.pontos : 0), COR_JOGADOR_CSS[evento.jogador], 22);
    this.inspecionar(texturaDeInspecao(this, evento.carta, baralho), mao.jogadores[evento.jogador].nome + ' ativou ' + nomeDaCarta(evento.carta, baralho) + '.');
    this.avisarVerbete('neuronio');
    const tamanho = mao.jogadores[evento.jogador].caminho.length;
    if (tamanho >= 2) this.avisarVerbete('forward');
    if (tamanho >= 3) this.avisarVerbete('pesos');
    return 450;
  },

  /** Tunagem: cartas voam para o neurônio e somam pontos. */
  animar_tunagem(evento) {
    const baralho = this.mao.config.baralho;
    const { x, y } = this.posicaoDoNeuronio(evento.neuronio);
    const origem = this.origemDasCartas(evento.jogador);
    evento.cartas.forEach((c, i) => this.voarCarta(c, origem.x, origem.y, x, y, i * 120));
    /* quanto a soma da rede subiu (a figura empilhada entra na sequência de figuras) */
    const soma = evento.ganho != null ? evento.ganho : evento.cartas.reduce((t, c) => t + (ehFigura(c) ? 10 : pontosDaCarta(c, baralho)), 0);
    this.time.delayedCall(320, () => {
      Som.tunagem(); this.textoFlutuante(x, y - 50, '+' + soma, '#7fe08a', 20); this.explodir(x, y, 0x7fe08a, 14);
      this.faixa('TUNAGEM +' + soma, '#7fe08a', 40, 'tunagem');
    });
    this.avisarVerbete('tunagem');
    return 800;
  },

  /** Ataques (overfit, early stop, stack overflow): cartas voam, o neurônio treme e some. */
  animar_ataque(evento, jogada) {
    const mao = this.mao, baralho = mao.config.baralho;
    const { x, y } = this.posicaoDoNeuronio(evento.neuronio);
    const origem = this.origemDasCartas(evento.jogador);
    const jogadas = jogada && jogada.cartas ? jogada.cartas.length : 1;
    for (let k = 0; k < jogadas; k++) {
      const carta = evento.cartas[evento.cartas.length - 1 - k];
      if (carta) this.voarCarta(carta, origem.x, origem.y, x, y, k * 110);
    }
    const carta = cartaDaMesa();
    const fantasma = this.add.image(x, y, texturaDaCartaNaMesa(this, evento.cartas[0], baralho))
      .setDisplaySize(carta.l, carta.a).setDepth(15);
    this.tweens.add({ targets: fantasma, x: '+=6', yoyo: true, repeat: 4, duration: 50, delay: 300 });
    this.tweens.add({
      targets: fantasma, alpha: 0, displayWidth: carta.l * 1.5, displayHeight: carta.a * 1.5, angle: 25,
      duration: 500, delay: 560, onComplete: () => fantasma.destroy(),
    });
    const { cor, titulo } = ATAQUES[evento.tipo];
    const explosao = evento.tipo === 'stackoverflow';
    this.time.delayedCall(420, () => {
      this.explodir(x, y, cor, explosao ? 50 : 26);
      if (explosao) { Som.explosao(); this.cameras.main.shake(450, 0.012); }
      else { Som.golpe(); this.cameras.main.shake(220, evento.tipo === 'earlystop' ? 0.007 : 0.003); }
      this.faixa(titulo + (evento.proprio ? ' (na própria rede)' : ''), corCss(cor), explosao ? 58 : 50, evento.tipo);
    });
    if (!evento.proprio) {
      if (mao.jogadores[evento.jogador].tipo === 'oponente') this.falar(provocar(evento.tipo), evento.jogador);
      else if (mao.jogadores[evento.dono].tipo === 'oponente') this.falar(provocar(evento.tipo === 'overfit' ? 'sofreuOverfit' : 'sofreuParada'), evento.dono);
    }
    this.avisarVerbete(evento.tipo);
    if (evento.tipo !== 'overfit') this.avisarVerbete('overfit');
    return 1250;
  },
  animar_overfit(evento, jogada) { return this.animar_ataque(evento, jogada); },
  animar_earlystop(evento, jogada) { return this.animar_ataque(evento, jogada); },
  animar_stackoverflow(evento, jogada) { return this.animar_ataque(evento, jogada); },

  /** Dropout: os neurônios desfeitos saem da mesa e vão para o cemitério. */
  animar_dropout(evento) {
    evento.neuronios.forEach((id, i) => {
      const { x, y } = this.posicaoDoNeuronio(id);
      this.time.delayedCall(i * 120, () => this.explodir(x, y, 0x6fe7ff, 12));
    });
    Som.dropout();
    this.faixa('GatoNet! Dropout ×' + evento.neuronios.length, '#6fe7ff', 40, 'dropout');
    this.avisarVerbete('dropout');
    return 700;
  },

  /** Transfer learning. */
  animar_transfer() {
    Som.medalha();
    this.faixa('TRANSFER LEARNING', '#9fe3e0', 46, 'transfer');
    this.avisarVerbete('transfer');
    this.avisarVerbete('ruido');
    return 1000;
  },

  /** Rede chegou à camada de saída. */
  animar_completa(evento) {
    Som.medalha();
    this.textoFlutuante(colunaX(this.mao.camadas.length - 1), 590, 'Rede completa!', COR_JOGADOR_CSS[evento.jogador], 22);
    return 600;
  },

  /** Terreno oceano: o vento mudou de naipe. */
  animar_vento(evento) {
    const naipe = NAIPE[evento.naipe];
    this.textoFlutuante(610, 120, 'O vento virou: ' + naipe.simbolo + ' ' + naipe.nome + ' revelado agora vale dobro', '#bfe7f4', 20);
    return 0;
  },

  /** Baralho Power BI: as cartas da mão foram trocadas. */
  animar_powerbi(evento) {
    mostrarAviso('Power BI', this.mao.jogadores[evento.jogador].nome + ' atualizou o dashboard: as cartas da mão mudaram.', null, 3500);
    return 0;
  },

  /** Rede finalizada porque não sobrou neurônio livre na camada seguinte. */
  animar_travada(evento) {
    const nome = this.mao.jogadores[evento.jogador].nome;
    this.faixa('Sem neurônio livre: rede de ' + nome + ' finalizada', COR_JOGADOR_CSS[evento.jogador], 30);
    return 1300;
  },

  /** Alguém passou a vez. */
  animar_passe(evento) {
    const embaixo = evento.jogador === this.jogadorDeBaixo(), origem = this.origemDasCartas(evento.jogador);
    this.textoFlutuante(origem.x, embaixo ? 570 : 90, this.mao.jogadores[evento.jogador].nome + ' passou', '#efe3c6', 18);
    return 0;
  },

  /** Quem começa: mostra as cartas reveladas (ou anuncia o sorteio). */
  animar_inicio(evento) {
    const mao = this.mao, baralho = mao.config.baralho;
    const nome = mao.jogadores[evento.jogador].nome, cor = COR_JOGADOR_CSS[evento.jogador];
    if (!evento.cartas) {
      this.faixa(nome + ' começa (sorteio)', cor, 36);
      return 900;
    }
    /* as cartas reveladas lado a lado no centro do tabuleiro; com muitos jogadores, menores */
    const n = evento.cartas.length, passo = Math.min(180, (TABULEIRO.x1 - TABULEIRO.x0 - 40) / n), escala = Math.min(1, passo / 150);
    evento.cartas.forEach((carta, i) => {
      if (!carta) return;
      const cx = TABULEIRO.centroX + (i - (n - 1) / 2) * passo;
      const imagem = this.add.image(cx, 330, texturaDaCartaMedia(this, carta, baralho)).setDisplaySize(120 * escala, 168 * escala).setDepth(25).setAlpha(0);
      this.tweens.add({ targets: imagem, alpha: 1, duration: 200 });
      const rotulo = this.add.text(cx, 330 + 84 * escala + 16, mao.jogadores[i].nome, { fontFamily: FONTES.titulo, fontStyle: '700', fontSize: '16px', color: COR_JOGADOR_CSS[i] }).setOrigin(0.5).setDepth(25);
      ajustarLinha(rotulo, rotulo.text, 16, passo - 8, 9);
      this.time.delayedCall(1700, () => this.tweens.add({ targets: [imagem, rotulo], alpha: 0, duration: 300, onComplete: () => { imagem.destroy(); rotulo.destroy(); } }));
    });
    this.time.delayedCall(700, () => this.faixa(nome + ' começa' + (evento.empate ? ' (empate: sorteio)' : ''), cor, 36));
    return 2100;
  },

  /** Avisa quando uma rede acaba de formar uma quadra de figuras (vanishing gradient). */
  verificarVanishing() {
    let espera = 0;
    this.mao.jogadores.forEach((_, j) => {
      const pontuacao = this.pontuacoes[j];
      if (pontuacao.vanishing && !this.vanishingAvisado[j]) {
        this.vanishingAvisado[j] = true;
        this.time.delayedCall(500, () => { Som.explosao(); this.faixa('VANISHING GRADIENT', '#ff6b7a', 52, 'vanishing'); this.falar(provocar('vanishing'), j); });
        this.avisarVerbete('vanishing');
        espera = 1400;
      } else if (!pontuacao.vanishing) this.vanishingAvisado[j] = false;
      if (pontuacao.combos.length) this.avisarVerbete('vanishing');
    });
    return espera;
  },

  /* ------------------------------------------------------------------ efeitos básicos */

  /** Uma carta voa de (x0, y0) até (x1, y1) e some. */
  voarCarta(carta, x0, y0, x1, y1, atraso = 0) {
    const imagem = this.add.image(x0, y0, texturaDaCartaNaMesa(this, carta, this.mao.config.baralho)).setDisplaySize(72, 101).setDepth(16);
    const { l, a } = cartaDaMesa();
    this.tweens.add({
      targets: imagem, x: x1 + 8, y: y1 - 8, displayWidth: l, displayHeight: a, angle: 8,
      duration: 320, delay: atraso, ease: 'Cubic.out', onComplete: () => imagem.destroy(),
    });
  },

  /** Explosão de `quantidade` faíscas da cor dada. A faísca colorida é uma textura própria (Canvas não tem tint). */
  explodir(x, y, cor, quantidade) {
    const hex = corCss(cor), chave = 'faisca-' + hex;
    const densidade = Math.min(RESOLUCAO, 2);
    if (!this.textures.exists(chave)) this.textures.addCanvas(chave, desenharFaisca(densidade, hex));
    const emissor = this.add.particles(x, y, chave, {
      speed: { min: 80, max: 260 }, lifespan: 650, scale: { start: 13 / (32 * densidade), end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(18);
    emissor.explode(quantidade);
    this.time.delayedCall(900, () => emissor.destroy());
  },

  /** Texto que sobe e desaparece. */
  textoFlutuante(x, y, texto, cor = '#fff', tamanho = 20) {
    const t = this.add.text(x, y, texto, { fontFamily: FONTES.titulo, fontStyle: '900', fontSize: tamanho + 'px', color: cor, stroke: '#0d0a08', strokeThickness: 5 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 1200, ease: 'Cubic.out', onComplete: () => t.destroy() });
  },

  /** Faixa grande no centro do tabuleiro (gritos de truco, ataques). */
  faixa(texto, cor = '#f6dc8f', tamanho = 48, icone = null) {
    const y = MUNDO.altura * 0.46;
    const t = this.add.text(610, y, texto, { fontFamily: FONTES.titulo, fontStyle: '900', fontSize: tamanho + 'px', color: cor, stroke: '#0d0a08', strokeThickness: 8, align: 'center' })
      .setOrigin(0.5).setDepth(40).setScale(0.6).setAlpha(0);
    const alvos = [t];
    /* ícone da ação acima do nome, num disco escuro para destacar da mesa */
    const chave = icone && 'icone-acao:' + icone;
    if (chave && this.textures.exists(chave)) {
      const lado = Math.round(tamanho * 1.7), iy = y - tamanho * 0.5 - lado * 0.62;
      const disco = this.add.circle(610, iy, lado * 0.62, 0x0d0a08, 0.72).setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(cor).color).setDepth(40);
      const img = this.add.image(610, iy, chave).setDisplaySize(lado, lado).setDepth(41);
      for (const o of [disco, img]) { o.setAlpha(0); o.setScale(o.scaleX * 0.6, o.scaleY * 0.6); }
      this.tweens.add({ targets: disco, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
      this.tweens.add({ targets: img, scaleX: lado / img.width, scaleY: lado / img.height, alpha: 1, duration: 220, ease: 'Back.out' });
      alvos.push(disco, img);
    }
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: alvos, alpha: 0, y: '-=30', duration: 380, delay: 1050, onComplete: () => alvos.forEach((o) => o.destroy()) });
  },

  /**
   * Balão de fala de um oponente. Fica à esquerda do placar, na altura do bloco dele, com a ponta
   * virada para o avatar.
   * @param {string} texto
   * @param {number} [quem] Jogador que fala; por padrão, o primeiro oponente do computador.
   */
  falar(texto, quem) {
    if (!texto) return;
    const ordem = this.ordemDoPlacar(), jogadores = this.mao.jogadores;
    if (quem == null || !jogadores[quem] || jogadores[quem].tipo !== 'oponente') quem = ordem.find((j) => jogadores[j].tipo === 'oponente');
    if (quem == null) return;
    const p = this.painel, g = p.fundoBalao;
    p.textoBalao.setText(texto);
    const l = Math.min(250, p.textoBalao.width + 28), a = p.textoBalao.height + 18;
    g.clear();
    g.fillStyle(0xefe3c6, 1); g.fillRoundedRect(-l / 2, -a / 2, l, a, 10);
    g.fillTriangle(l / 2 - 10, -6, l / 2 + 14, 0, l / 2 - 10, 8);
    g.lineStyle(2, 0x0d0a08, 1); g.strokeRoundedRect(-l / 2, -a / 2, l, a, 10);
    const avatar = p.blocos[Math.max(0, ordem.indexOf(quem))].avatar;
    p.balao.setPosition(PAINEL_DIR.x - 18 - l / 2, Math.max(a / 2 + 6, avatar.y - 30)).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(p.balao);
    this.tweens.add({ targets: p.balao, alpha: 0, delay: 2600, duration: 400, onComplete: () => p.balao.setVisible(false) });
  },

  /**
   * Impacto do grito de truco: tapa na mesa, flash e tremor de tela mais fortes que o do stack
   * overflow, crescendo a cada degrau (TRUCO 3, SEIS 6, NOVE 9, DOZE 12).
   */
  impactoDoTruco(valor) {
    const forca = [3, 6, 9, 12].indexOf(valor) + 1; /* 1 a 4 */
    Som.truco(forca);
    const camera = this.cameras.main;
    camera.shake(600 + forca * 80, 0.016 + forca * 0.004);
    camera.flash(180, 255, 210, 120);
  },

  /** Mostra uma vez por sessão o resumo do verbete da Biblioteca de conceitos ligado ao que aconteceu. */
  avisarVerbete(id) {
    const avisados = this.app.verbetesAvisados;
    if (avisados[id]) return;
    avisados[id] = true;
    const verbete = VERBETES.find((v) => v.id === id);
    if (verbete) mostrarAviso('Biblioteca · ' + verbete.titulo, verbete.noJogo, null, 6500);
  },
};
