/**
 * @file Parte da CenaMesa: ambiente animado de cada terreno, por cima do fundo e por baixo das
 * cartas. Deixa claro onde a partida acontece sem competir com a mesa:
 *  - mesa neutra: poeira dourada flutuando na luz do abajur;
 *  - montanha: neve caindo, nuvens passando e o sol do entardecer pulsando;
 *  - pântano: neblina que se arrasta, vaga-lumes piscando e bolhas subindo;
 *  - oceano: ondas que correm na mesa, espuma e rajadas de vento.
 *
 * Tudo é desenhado por código (texturas pequenas geradas na hora). Com "reduzir movimento" no
 * sistema, o ambiente fica parado (só as camadas de luz e cor).
 */
import { MUNDO } from '../../configuracao.js';

const PROFUNDIDADE = 0.5;

/** Sistema pediu menos movimento? */
function reduzirMovimento() {
  try { return !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

export const metodosDoAmbiente = {
  /** Cria o ambiente do terreno da partida. */
  criarAmbiente(terreno) {
    this.ambiente = { terreno, objetos: [], ondas: null, parado: reduzirMovimento() };
    this.criarTexturasDoAmbiente();
    const criar = { neutro: this.ambienteNeutro, montanha: this.ambienteMontanha, pantano: this.ambientePantano, oceano: this.ambienteOceano }[terreno];
    if (criar) criar.call(this);
  },

  /** Texturas pequenas das partículas (uma vez por jogo). */
  criarTexturasDoAmbiente() {
    if (this.textures.exists('amb-ponto')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    /* ponto macio (neve, poeira, vaga-lume): círculos concêntricos com alfa crescente */
    for (let r = 8; r > 0; r--) { g.fillStyle(0xffffff, 0.12 + (8 - r) * 0.1); g.fillCircle(8, 8, r); }
    g.generateTexture('amb-ponto', 16, 16); g.clear();
    /* bolha: anel com brilho */
    g.lineStyle(1.5, 0xd8ffd0, 0.9); g.strokeCircle(8, 8, 6.5); g.fillStyle(0xffffff, 0.8); g.fillCircle(5.5, 5.5, 1.6);
    g.generateTexture('amb-bolha', 16, 16); g.clear();
    /* risco de vento */
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 40, 2, 1);
    g.generateTexture('amb-risco', 40, 2); g.clear();
    /* nuvem/neblina: elipses sobrepostas bem transparentes */
    for (let k = 0; k < 14; k++) { g.fillStyle(0xffffff, 0.07); g.fillEllipse(160 + Math.cos(k * 1.7) * 70, 60 + Math.sin(k * 2.3) * 18, 200 - k * 6, 70 - k * 2); }
    g.generateTexture('amb-nuvem', 320, 120);
    g.destroy();
  },

  /** Luz colorida por cima do fundo, para o terreno ficar mais claro e reconhecível. */
  luzDoTerreno(cor, alfa, cx = MUNDO.largura / 2, cy = MUNDO.altura * 0.4) {
    const luz = this.add.ellipse(cx, cy, MUNDO.largura * 1.3, MUNDO.altura * 1.1, cor, alfa).setDepth(PROFUNDIDADE).setBlendMode(Phaser.BlendModes.ADD);
    this.ambiente.objetos.push(luz);
    return luz;
  },

  ambienteNeutro() {
    const luz = this.luzDoTerreno(0xffe2a0, 0.06, MUNDO.largura * 0.5, MUNDO.altura * 0.45);
    if (this.ambiente.parado) return;
    this.tweens.add({ targets: luz, alpha: 0.1, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const poeira = this.add.particles(0, 0, 'amb-ponto', {
      x: { min: 0, max: MUNDO.largura }, y: { min: 0, max: MUNDO.altura }, lifespan: 9000, frequency: 450,
      speedX: { min: -6, max: 6 }, speedY: { min: -8, max: -2 }, scale: { min: 0.15, max: 0.35 },
      alpha: { start: 0, end: 0.5, ease: 'Sine.inOut', yoyo: true }, tint: 0xffe2a0, blendMode: 'ADD',
    }).setDepth(PROFUNDIDADE);
    this.ambiente.objetos.push(poeira);
  },

  ambienteMontanha() {
    /* sol do entardecer no alto à direita e luz quente na mesa */
    this.luzDoTerreno(0xff9a50, 0.1);
    const sol = this.add.circle(MUNDO.largura * 0.82, -40, 190, 0xffb070, 0.18).setDepth(PROFUNDIDADE).setBlendMode(Phaser.BlendModes.ADD);
    this.ambiente.objetos.push(sol);
    if (this.ambiente.parado) return;
    this.tweens.add({ targets: sol, alpha: 0.28, scale: 1.08, duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    for (let k = 0; k < 3; k++) {
      const nuvem = this.add.image(-200 + k * 520, 60 + k * 70, 'amb-nuvem').setDepth(PROFUNDIDADE).setAlpha(0.55).setScale(1.3 + k * 0.3).setTint(0xffe0d0);
      /* atravessa a mesa e recomeça da esquerda; cada nuvem parte de um ponto diferente */
      this.tweens.add({ targets: nuvem, x: MUNDO.largura + 260, duration: (70000 + k * 15000) * (MUNDO.largura + 260 - nuvem.x) / (MUNDO.largura + 460), onComplete: () => this.nuvemEmLaco(nuvem, 70000 + k * 15000) });
      this.ambiente.objetos.push(nuvem);
    }
    const neve = this.add.particles(0, -10, 'amb-ponto', {
      x: { min: 0, max: MUNDO.largura }, lifespan: 14000, frequency: 160,
      speedY: { min: 25, max: 55 }, speedX: { min: -18, max: 6 }, scale: { min: 0.2, max: 0.55 },
      alpha: { start: 0.85, end: 0.1 }, rotate: { min: 0, max: 360 },
    }).setDepth(PROFUNDIDADE);
    this.ambiente.objetos.push(neve);
  },

  ambientePantano() {
    this.luzDoTerreno(0x7be08a, 0.07);
    if (this.ambiente.parado) return;
    /* neblina rasteira que vai e volta */
    for (let k = 0; k < 4; k++) {
      const n = this.add.image(k * 380, 140 + k * 150, 'amb-nuvem').setDepth(PROFUNDIDADE).setScale(2.4, 1.4).setAlpha(0.5).setTint(0xc8f0c0);
      this.tweens.add({ targets: n, x: n.x + (k % 2 ? -260 : 260), alpha: 0.25, duration: 16000 + k * 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.ambiente.objetos.push(n);
    }
    const vagalumes = this.add.particles(0, 0, 'amb-ponto', {
      x: { min: 0, max: MUNDO.largura }, y: { min: 60, max: MUNDO.altura - 40 }, lifespan: { min: 3000, max: 6000 }, frequency: 260,
      speedX: { min: -14, max: 14 }, speedY: { min: -12, max: 12 }, scale: { min: 0.25, max: 0.5 },
      alpha: { start: 0, end: 1, ease: 'Sine.inOut', yoyo: true }, tint: [0xd8ff6a, 0xfff38a, 0xa8ff9a], blendMode: 'ADD',
    }).setDepth(PROFUNDIDADE);
    const bolhas = this.add.particles(0, MUNDO.altura + 10, 'amb-bolha', {
      x: { min: 0, max: MUNDO.largura }, lifespan: 7000, frequency: 700,
      speedY: { min: -40, max: -20 }, speedX: { min: -5, max: 5 }, scale: { min: 0.6, max: 1.3 }, alpha: { start: 0.55, end: 0 },
    }).setDepth(PROFUNDIDADE);
    this.ambiente.objetos.push(vagalumes, bolhas);
  },

  ambienteOceano() {
    this.luzDoTerreno(0x60c8ff, 0.08);
    /* ondas: linhas senoidais redesenhadas a cada quadro (atualizarAmbiente) */
    this.ambiente.ondas = this.add.graphics().setDepth(PROFUNDIDADE);
    this.ambiente.objetos.push(this.ambiente.ondas);
    this.desenharOndas(0);
    if (this.ambiente.parado) return;
    const espuma = this.add.particles(0, 0, 'amb-ponto', {
      x: { min: 0, max: MUNDO.largura }, y: { min: 0, max: MUNDO.altura }, lifespan: 2600, frequency: 140,
      speedX: { min: 20, max: 45 }, scale: { min: 0.12, max: 0.3 }, alpha: { start: 0, end: 0.7, ease: 'Sine.inOut', yoyo: true }, tint: 0xe8f8ff,
    }).setDepth(PROFUNDIDADE);
    this.ambiente.vento = this.add.particles(0, 0, 'amb-risco', {
      x: -40, y: { min: 40, max: MUNDO.altura - 40 }, lifespan: 2400, frequency: 380,
      speedX: { min: 520, max: 760 }, scaleX: { min: 0.8, max: 2 }, alpha: { start: 0.35, end: 0 },
    }).setDepth(PROFUNDIDADE);
    this.ambiente.objetos.push(espuma, this.ambiente.vento);
  },

  /** Nuvem que volta para a esquerda e atravessa a mesa de novo, para sempre. */
  nuvemEmLaco(nuvem, duracao) {
    if (!nuvem.active) return;
    nuvem.x = -260;
    this.tweens.add({ targets: nuvem, x: MUNDO.largura + 260, duration: duracao, repeat: -1 });
  },

  /** Ondas do oceano: seis linhas que correm devagar, mais claras perto do centro. */
  desenharOndas(tempo) {
    const g = this.ambiente.ondas;
    g.clear();
    for (let k = 0; k < 7; k++) {
      const y0 = 60 + k * 100, fase = tempo / (1600 + k * 180) + k;
      g.lineStyle(2, 0xbfe8ff, 0.09 + 0.03 * Math.sin(fase * 0.7));
      g.beginPath();
      for (let x = 0; x <= MUNDO.largura; x += 20) {
        const y = y0 + Math.sin(x / 90 + fase) * 7 + Math.sin(x / 37 - fase * 1.3) * 2.5;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    }
  },

  /** A cada quadro (CenaMesa.update): ondas do oceano. */
  atualizarAmbiente(tempo) {
    if (this.ambiente && this.ambiente.ondas && !this.ambiente.parado) this.desenharOndas(tempo);
  },
};
