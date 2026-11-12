/**
 * @file Parte da CenaMesa: ambiente animado de cada terreno. Tem duas camadas:
 *  - **fundo** (profundidade 0,5): por cima da pintura do terreno e por baixo de tudo; aparece nas
 *    bordas, entre as colunas e através dos painéis translúcidos;
 *  - **frente** (profundidade 4,5): por cima das cartas da mesa e por baixo dos destaques, dos
 *    painéis e da mão. Só leva **partículas pequenas** (flocos, sementes, bolhas, brilhos, riscos
 *    de vento, vaga-lumes): as cartas continuam opacas em relação ao fundo. Véus que cobrem uma
 *    área grande (neblina, sombras de nuvem, raios de sol, cáusticas, halos) ficam sempre no fundo,
 *    por trás das cartas — por cima delas, deixavam o terreno "aparecer através" das cartas.
 *
 * | Terreno  | Fundo                                                            | Frente                                   |
 * |----------|------------------------------------------------------------------|------------------------------------------|
 * | Planície | luz quente que respira, raios de sol, sombras de nuvens, pólen   | sementes de dente-de-leão, pólen fino    |
 * | Montanha | sol do entardecer, nuvens, névoa rasteira, neve grossa           | neve fina, rajadas de vento              |
 * | Pântano  | neblina, halos dos vaga-lumes e do fogo-fátuo, bolhas subindo    | vaga-lumes, bolhas, fogo-fátuo que vagueia |
 * | Oceano   | ondas que correm, cáusticas (a luz dançando no fundo do mar), espuma | brilhos e vento                      |
 *
 * Em todos, a pintura do terreno se aproxima e se afasta devagar. Tudo é desenhado por código
 * (texturas pequenas geradas na hora). Com "reduzir movimento" no sistema, o ambiente fica parado:
 * só as camadas de luz e cor.
 */
import { MUNDO } from '../../configuracao.js';
import { PAINEL_ESQ, PAINEL_DIR } from './layout.js';

/** Profundidade da camada de fundo (por cima da pintura do terreno). */
const FUNDO = 0.5;
/** Profundidade da camada da frente (por cima das cartas da mesa, por baixo dos destaques): só partículas pequenas. */
const FRENTE = 4.5;
/** Área da mesa entre os dois painéis. */
const MESA = { x: PAINEL_ESQ.x + PAINEL_ESQ.l, l: PAINEL_DIR.x - PAINEL_ESQ.x - PAINEL_ESQ.l };

/** Sistema pediu menos movimento? */
function reduzirMovimento() {
  try { return !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

export const metodosDoAmbiente = {
  /** Cria o ambiente do terreno da partida. */
  criarAmbiente(terreno) {
    this.ambiente = { terreno, objetos: [], ondas: null, causticas: [], parado: reduzirMovimento() };
    this.criarTexturasDoAmbiente();
    const criar = { neutro: this.ambienteNeutro, montanha: this.ambienteMontanha, pantano: this.ambientePantano, oceano: this.ambienteOceano }[terreno];
    if (criar) criar.call(this);
    if (!this.ambiente.parado) this.respirarFundo();
  },

  /** A pintura do terreno se aproxima e se afasta devagar (dá vida até às bordas da tela). */
  respirarFundo() {
    const f = this.fundo;
    if (!f) return;
    this.tweens.add({ targets: f, scaleX: f.scaleX * 1.05, scaleY: f.scaleY * 1.05, x: f.x + 18, y: f.y - 10, duration: 20000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  },

  /** Texturas pequenas das partículas (uma vez por jogo). */
  criarTexturasDoAmbiente() {
    if (this.textures.exists('amb-ponto')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    /* ponto macio (neve, poeira, vaga-lume): círculos concêntricos com alfa crescente */
    for (let r = 8; r > 0; r--) { g.fillStyle(0xffffff, 0.12 + (8 - r) * 0.1); g.fillCircle(8, 8, r); }
    g.generateTexture('amb-ponto', 16, 16); g.clear();
    /* halo largo e bem suave (brilho dos vaga-lumes e do fogo-fátuo) */
    for (let r = 32; r > 0; r -= 2) { g.fillStyle(0xffffff, 0.035); g.fillCircle(32, 32, r); }
    g.generateTexture('amb-halo', 64, 64); g.clear();
    /* bolha: anel com brilho */
    g.lineStyle(1.5, 0xd8ffd0, 0.9); g.strokeCircle(8, 8, 6.5); g.fillStyle(0xffffff, 0.8); g.fillCircle(5.5, 5.5, 1.6);
    g.generateTexture('amb-bolha', 16, 16); g.clear();
    /* risco de vento */
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 40, 2, 1);
    g.generateTexture('amb-risco', 40, 2); g.clear();
    /* brilho de quatro pontas (reflexo do sol na água) */
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(8, 0, 9.4, 8, 6.6, 8); g.fillTriangle(8, 16, 9.4, 8, 6.6, 8);
    g.fillTriangle(0, 8, 8, 6.6, 8, 9.4); g.fillTriangle(16, 8, 8, 6.6, 8, 9.4);
    g.fillCircle(8, 8, 1.8);
    g.generateTexture('amb-brilho', 16, 16); g.clear();
    /* semente de dente-de-leão: haste e penacho */
    g.lineStyle(1, 0xffffff, 0.9); g.lineBetween(8, 9, 8, 16);
    for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; g.lineBetween(8, 9, 8 + Math.cos(a) * 7, 9 + Math.sin(a) * 7); }
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 9, 1.2);
    g.generateTexture('amb-semente', 16, 16); g.clear();
    /* nuvem/neblina: elipses sobrepostas bem transparentes */
    const nuvem = (cor, alfa) => { for (let k = 0; k < 14; k++) { g.fillStyle(cor, alfa); g.fillEllipse(160 + Math.cos(k * 1.7) * 70, 60 + Math.sin(k * 2.3) * 18, 200 - k * 6, 70 - k * 2); } };
    nuvem(0xffffff, 0.07);
    g.generateTexture('amb-nuvem', 320, 120); g.clear();
    /* sombra de nuvem: a mesma forma, escura (o Canvas não tinge texturas) */
    nuvem(0x000000, 0.05);
    g.generateTexture('amb-sombra', 320, 120); g.clear();
    /* raio de sol: faixa que esmaece nas pontas */
    for (let k = 0; k < 20; k++) { g.fillStyle(0xffffff, 0.05); g.fillRect(k * 3, 0, 120 - k * 6, 1000); }
    g.generateTexture('amb-raio', 120, 1000);
    g.destroy();
    this.criarTexturaDeCausticas();
  },

  /**
   * Cáusticas: rede de linhas claras e onduladas que emenda nas bordas (a textura se repete sem
   * costura quando rola). Cada linha é uma senoide com número inteiro de ondas na largura.
   */
  criarTexturaDeCausticas() {
    const L = 256, tela = this.textures.createCanvas('amb-causticas', L, L);
    if (!tela) return;
    const ctx = tela.getContext();
    ctx.clearRect(0, 0, L, L);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = 6;
    const linha = (vertical, base, ondas, amp, fase) => {
      ctx.beginPath();
      for (let t = 0; t <= L; t += 4) {
        const d = base + Math.sin((t / L) * Math.PI * 2 * ondas + fase) * amp + Math.sin((t / L) * Math.PI * 2 * (ondas + 1) + fase * 1.7) * amp * 0.4;
        if (vertical) { if (t === 0) ctx.moveTo(d, t); else ctx.lineTo(d, t); } else if (t === 0) ctx.moveTo(t, d); else ctx.lineTo(t, d);
      }
      ctx.stroke();
    };
    for (let k = 0; k < 6; k++) {
      for (const desloc of [0, L]) {
        linha(false, (k * L) / 6 + 12 - desloc, 2, 14, k * 1.3);
        linha(true, (k * L) / 6 + 30 - desloc, 2, 14, k * 0.9 + 2);
      }
    }
    tela.refresh();
  },

  /** Guarda um objeto do ambiente (para os testes contarem e para destruir junto com a mesa). */
  guardar(...objetos) { this.ambiente.objetos.push(...objetos); return objetos[0]; },

  /** Luz colorida por cima do fundo, para o terreno ficar mais claro e reconhecível. */
  luzDoTerreno(cor, alfa, cx = MUNDO.largura / 2, cy = MUNDO.altura * 0.4) {
    return this.guardar(this.add.ellipse(cx, cy, MUNDO.largura * 1.3, MUNDO.altura * 1.1, cor, alfa).setDepth(FUNDO).setBlendMode(Phaser.BlendModes.ADD));
  },

  /** Nuvem (ou sombra, ou neblina) que atravessa a tela da esquerda para a direita, para sempre. */
  atravessar(objeto, duracao, desde = objeto.x) {
    const ate = MUNDO.largura + objeto.displayWidth / 2 + 20, inicio = -objeto.displayWidth / 2 - 20;
    this.tweens.add({
      targets: objeto, x: ate, duration: duracao * (ate - desde) / (ate - inicio),
      onComplete: () => { if (!objeto.active) return; objeto.x = inicio; this.tweens.add({ targets: objeto, x: ate, duration: duracao, repeat: -1 }); },
    });
  },

  /* ------------------------------------------------------------------ Planície */
  ambienteNeutro() {
    const luz = this.luzDoTerreno(0xffe2a0, 0.1, MUNDO.largura * 0.5, MUNDO.altura * 0.45);
    if (this.ambiente.parado) return;
    this.tweens.add({ targets: luz, alpha: 0.2, duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    /* raios de sol entrando pela esquerda, balançando devagar */
    for (let k = 0; k < 3; k++) {
      const raio = this.add.image(120 + k * 210, -120, 'amb-raio').setOrigin(0.5, 0).setAngle(-28 + k * 4).setDepth(FUNDO)
        .setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe6a8).setAlpha(0.18).setScale(1 + k * 0.4, 1);
      this.tweens.add({ targets: raio, angle: raio.angle + 6, alpha: 0.3, duration: 6000 + k * 1700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.guardar(raio);
    }
    /* sombras de nuvens que passam pela mesa (por trás das cartas) */
    for (let k = 0; k < 3; k++) {
      const sombra = this.add.image(MESA.x + k * 380, 140 + k * 210, 'amb-sombra').setDepth(FUNDO).setAlpha(0.9).setScale(3.4, 2.4);
      this.atravessar(sombra, 46000 + k * 9000);
      this.guardar(sombra);
    }
    /* pólen dourado (fundo), sementes de dente-de-leão levadas pelo vento e pólen fino (frente) */
    const polen = this.add.particles(0, 0, 'amb-ponto', {
      x: { min: 0, max: MUNDO.largura }, y: { min: 0, max: MUNDO.altura }, lifespan: 8000, frequency: 110,
      speedX: { min: -10, max: 14 }, speedY: { min: -14, max: -3 }, scale: { min: 0.25, max: 0.6 },
      alpha: { start: 0, end: 0.85, ease: 'Sine.inOut', yoyo: true }, tint: 0xffe08a, blendMode: 'ADD',
    }).setDepth(FUNDO);
    const sementes = this.add.particles(-10, 0, 'amb-semente', {
      y: { min: 40, max: MUNDO.altura - 60 }, lifespan: 16000, frequency: 1100,
      speedX: { min: 60, max: 110 }, speedY: { min: -18, max: 10 }, scale: { min: 0.9, max: 1.6 }, rotate: { start: -20, end: 40 },
      alpha: { start: 0.85, end: 0.5 },
    }).setDepth(FRENTE);
    const polenFino = this.add.particles(0, 0, 'amb-ponto', {
      x: { min: MESA.x, max: MESA.x + MESA.l }, y: { min: 40, max: MUNDO.altura - 40 }, lifespan: 6000, frequency: 260,
      speedX: { min: -8, max: 12 }, speedY: { min: -12, max: -2 }, scale: { min: 0.14, max: 0.3 },
      alpha: { start: 0, end: 0.75, ease: 'Sine.inOut', yoyo: true }, tint: 0xffe08a, blendMode: 'ADD',
    }).setDepth(FRENTE);
    this.guardar(polen, sementes, polenFino);
  },

  /* ------------------------------------------------------------------ Montanha */
  ambienteMontanha() {
    /* sol do entardecer no alto à direita e luz quente na mesa */
    this.luzDoTerreno(0xff9a50, 0.14);
    const sol = this.guardar(this.add.circle(MUNDO.largura * 0.82, -40, 200, 0xffb070, 0.26).setDepth(FUNDO).setBlendMode(Phaser.BlendModes.ADD));
    if (this.ambiente.parado) return;
    this.tweens.add({ targets: sol, alpha: 0.42, scale: 1.12, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    for (let k = 0; k < 3; k++) {
      const nuvem = this.add.image(-200 + k * 520, 60 + k * 70, 'amb-nuvem').setDepth(FUNDO).setAlpha(0.8).setScale(1.4 + k * 0.3).setTint(0xffe0d0);
      this.atravessar(nuvem, 60000 + k * 15000);
      this.guardar(nuvem);
    }
    /* névoa rasteira no pé da mesa (por trás das cartas) */
    for (let k = 0; k < 2; k++) {
      const nevoa = this.add.image(MESA.x + k * 520, MUNDO.altura - 150 + k * 40, 'amb-nuvem').setDepth(FUNDO).setAlpha(0.55).setScale(3.2, 1.5).setTint(0xf4f0ff);
      this.atravessar(nevoa, 52000 + k * 12000);
      this.guardar(nevoa);
    }
    /* neve grossa no fundo e neve fina por cima da mesa */
    const neve = this.add.particles(0, -10, 'amb-ponto', {
      x: { min: 0, max: MUNDO.largura }, lifespan: 14000, frequency: 90,
      speedY: { min: 30, max: 60 }, speedX: { min: -20, max: 6 }, scale: { min: 0.35, max: 0.75 },
      alpha: { start: 0.95, end: 0.2 },
    }).setDepth(FUNDO);
    const neveFina = this.add.particles(0, -10, 'amb-ponto', {
      x: { min: MESA.x - 100, max: MESA.x + MESA.l + 100 }, lifespan: 11000, frequency: 75,
      speedY: { min: 45, max: 95 }, speedX: { min: -30, max: 8 }, scale: { min: 0.14, max: 0.32 },
      alpha: { start: 0.8, end: 0.15 },
    }).setDepth(FRENTE);
    this.guardar(neve, neveFina);
    /* rajadas: de tempos em tempos o vento varre a neve para o lado, com riscos brancos */
    const riscos = this.guardar(this.add.particles(0, 0, 'amb-risco', {
      x: -40, y: { min: 30, max: MUNDO.altura - 30 }, lifespan: 1800, speedX: { min: 700, max: 1000 }, scaleX: { min: 1, max: 3 },
      alpha: { start: 0.55, end: 0 }, emitting: false,
    }).setDepth(FRENTE));
    const rajada = () => {
      riscos.explode(26);
      /* a gravidade lateral empurra também os flocos que já estão na tela, e depois some */
      for (const e of [neve, neveFina]) {
        this.tweens.add({ targets: e, gravityX: 220, duration: 500, yoyo: true, hold: 900, ease: 'Sine.inOut' });
      }
    };
    this.ambiente.rajada = this.time.addEvent({ delay: 8000, loop: true, callback: rajada });
  },

  /* ------------------------------------------------------------------ Pântano */
  ambientePantano() {
    this.luzDoTerreno(0x7be08a, 0.1);
    if (this.ambiente.parado) return;
    /* neblina rasteira no fundo e entre as colunas da mesa, indo e voltando (por trás das cartas) */
    for (let k = 0; k < 4; k++) {
      const n = this.add.image(k * 380, 140 + k * 150, 'amb-nuvem').setDepth(FUNDO).setScale(2.6, 1.5).setAlpha(0.8).setTint(0xc8f0c0);
      this.tweens.add({ targets: n, x: n.x + (k % 2 ? -300 : 300), alpha: 0.4, duration: 14000 + k * 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.guardar(n);
    }
    for (let k = 0; k < 3; k++) {
      const n = this.add.image(MESA.x + 120 + k * 260, 200 + k * 170, 'amb-nuvem').setDepth(FUNDO).setScale(2.4, 1.3).setAlpha(0.5).setTint(0xd6f5d0);
      this.tweens.add({ targets: n, x: n.x + (k % 2 ? 240 : -240), alpha: 0.22, duration: 11000 + k * 2500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.guardar(n);
    }
    /* vaga-lumes: o ponto aceso passa por cima da mesa; o halo, largo, fica por trás das cartas */
    const config = (escala, alfa) => ({
      x: { min: MESA.x - 40, max: MESA.x + MESA.l + 40 }, y: { min: 60, max: MUNDO.altura - 40 }, lifespan: { min: 3500, max: 6500 }, frequency: 170,
      speedX: { min: -16, max: 16 }, speedY: { min: -14, max: 14 }, scale: escala,
      alpha: { start: 0, end: alfa, ease: 'Sine.inOut', yoyo: true }, tint: [0xd8ff6a, 0xfff38a, 0xa8ff9a], blendMode: 'ADD',
    });
    const vagalumes = this.add.particles(0, 0, 'amb-ponto', config({ min: 0.3, max: 0.6 }, 1)).setDepth(FRENTE);
    const halos = this.add.particles(0, 0, 'amb-halo', config({ min: 0.5, max: 0.9 }, 0.6)).setDepth(FUNDO);
    const bolhas = this.add.particles(0, MUNDO.altura + 10, 'amb-bolha', {
      x: { min: 0, max: MUNDO.largura }, lifespan: 7000, frequency: 380,
      speedY: { min: -50, max: -25 }, speedX: { min: -6, max: 6 }, scale: { min: 0.8, max: 1.7 }, alpha: { start: 0.8, end: 0 },
    }).setDepth(FUNDO);
    /* algumas bolhas pequenas sobem também por cima da mesa */
    const bolhasDaMesa = this.add.particles(0, MUNDO.altura + 10, 'amb-bolha', {
      x: { min: MESA.x, max: MESA.x + MESA.l }, lifespan: 6500, frequency: 900,
      speedY: { min: -60, max: -30 }, speedX: { min: -6, max: 6 }, scale: { min: 0.6, max: 1.1 }, alpha: { start: 0.7, end: 0 },
    }).setDepth(FRENTE);
    this.guardar(vagalumes, halos, bolhas, bolhasDaMesa);
    this.fogoFatuo();
  },

  /** Fogo-fátuo: uma luz azulada que aparece, vagueia pela mesa deixando rastro e some (o halo fica por trás das cartas). */
  fogoFatuo() {
    const luz = this.guardar(this.add.image(MESA.x + 80, 300, 'amb-halo').setDepth(FUNDO).setTint(0x8ff0ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0));
    const nucleo = this.guardar(this.add.image(luz.x, luz.y, 'amb-ponto').setDepth(FRENTE).setTint(0xe6ffff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0));
    const rastro = this.guardar(this.add.particles(0, 0, 'amb-ponto', {
      follow: nucleo, lifespan: 900, frequency: 40, scale: { start: 0.45, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: 0x9ff4ff, blendMode: 'ADD', emitting: false,
    }).setDepth(FRENTE));
    const passeio = () => {
      if (!luz.active) return;
      const pontos = Array.from({ length: 4 }, () => ({ x: MESA.x + 40 + Math.random() * (MESA.l - 80), y: 110 + Math.random() * 420 }));
      luz.setPosition(pontos[0].x, pontos[0].y); nucleo.setPosition(pontos[0].x, pontos[0].y);
      rastro.start();
      this.tweens.add({ targets: [luz, nucleo], alpha: { from: 0, to: 0.95 }, duration: 1200 });
      this.tweens.chain({
        targets: [luz, nucleo],
        tweens: pontos.slice(1).map((p) => ({ x: p.x, y: p.y, duration: 2600, ease: 'Sine.inOut' })).concat([{ alpha: 0, duration: 1400 }]),
        onComplete: () => { rastro.stop(); this.time.delayedCall(4000 + Math.random() * 5000, passeio); },
      });
    };
    this.time.delayedCall(2500, passeio);
  },

  /* ------------------------------------------------------------------ Oceano */
  ambienteOceano() {
    this.luzDoTerreno(0x60c8ff, 0.12);
    /* ondas: linhas senoidais redesenhadas a cada quadro (atualizarAmbiente) */
    this.ambiente.ondas = this.guardar(this.add.graphics().setDepth(FUNDO));
    this.desenharOndas(0);
    if (this.ambiente.parado) return;
    /* cáusticas: duas redes de luz rolando em direções diferentes, por trás das cartas */
    for (const [alfa, escala] of [[0.16, 1.6], [0.11, 2.3]]) {
      const c = this.add.tileSprite(MESA.x + MESA.l / 2, MUNDO.altura / 2, MESA.l, MUNDO.altura, 'amb-causticas')
        .setDepth(FUNDO).setBlendMode(Phaser.BlendModes.ADD).setAlpha(alfa).setTint(0xbfeaff).setTileScale(escala, escala);
      this.ambiente.causticas.push(c);
      this.guardar(c);
    }
    const espuma = this.add.particles(0, 0, 'amb-ponto', {
      x: { min: 0, max: MUNDO.largura }, y: { min: 0, max: MUNDO.altura }, lifespan: 2600, frequency: 90,
      speedX: { min: 20, max: 45 }, scale: { min: 0.15, max: 0.35 }, alpha: { start: 0, end: 0.8, ease: 'Sine.inOut', yoyo: true }, tint: 0xe8f8ff,
    }).setDepth(FUNDO);
    const brilhos = this.add.particles(0, 0, 'amb-brilho', {
      x: { min: MESA.x, max: MESA.x + MESA.l }, y: { min: 40, max: MUNDO.altura - 40 }, lifespan: { min: 700, max: 1400 }, frequency: 110,
      scale: { min: 0.4, max: 0.9 }, rotate: { min: 0, max: 45 }, alpha: { start: 0, end: 0.85, ease: 'Sine.inOut', yoyo: true }, tint: 0xffffff, blendMode: 'ADD',
    }).setDepth(FRENTE);
    this.ambiente.vento = this.add.particles(0, 0, 'amb-risco', {
      x: -40, y: { min: 40, max: MUNDO.altura - 40 }, lifespan: 2400, frequency: 300,
      speedX: { min: 520, max: 760 }, scaleX: { min: 0.8, max: 2.2 }, alpha: { start: 0.5, end: 0 },
    }).setDepth(FRENTE);
    this.guardar(espuma, brilhos, this.ambiente.vento);
  },

  /** Ondas do oceano: nove linhas que correm devagar. */
  desenharOndas(tempo) {
    const g = this.ambiente.ondas;
    g.clear();
    for (let k = 0; k < 9; k++) {
      const y0 = 40 + k * 82, fase = tempo / (1500 + k * 170) + k;
      g.lineStyle(3, 0xbfe8ff, 0.18 + 0.06 * Math.sin(fase * 0.7));
      g.beginPath();
      for (let x = 0; x <= MUNDO.largura; x += 20) {
        const y = y0 + Math.sin(x / 90 + fase) * 9 + Math.sin(x / 37 - fase * 1.3) * 3;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    }
  },

  /** A cada quadro (CenaMesa.update): ondas e cáusticas do oceano. */
  atualizarAmbiente(tempo) {
    if (!this.ambiente || this.ambiente.parado) return;
    if (this.ambiente.ondas) this.desenharOndas(tempo);
    this.ambiente.causticas.forEach((c, k) => {
      c.tilePositionX = tempo * (k ? -0.011 : 0.017);
      c.tilePositionY = tempo * (k ? 0.008 : 0.012);
    });
  },
};
