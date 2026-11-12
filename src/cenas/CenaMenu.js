/**
 * @file Cena do menu: fundo animado (uma rede neural pulsando e cartas flutuando) atrás do
 * painel HTML do menu.
 */
import { CORES } from '../configuracao.js';
import { BARALHOS } from '../nucleo/baralhos.js';
import { embaralhar } from '../nucleo/aleatorio.js';
import { Aplicacao } from '../aplicacao.js';
import { abrirMenu } from '../interface/menu.js';
import { fecharTodos } from '../interface/paineis.js';
import { Musica } from '../interface/musica.js';
import { Som } from '../interface/som.js';
import { ajustarCamera, colocarFundo, texturaDaCartaNaMesa } from './recursos.js';

/** Neurônios por coluna da rede decorativa. */
const COLUNAS = [3, 5, 5, 5, 4];

export class CenaMenu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    ajustarCamera(this);
    colocarFundo(this);
    this.rede = this.add.graphics();
    this.pontos = COLUNAS.map((n, c) => Array.from({ length: n }, (_, i) => ({ x: 120 + c * 260, y: 360 + (i - (n - 1) / 2) * 120 })));
    this.espalharCartas();
    fecharTodos();
    abrirMenu(Aplicacao);
    this.tocarMusicaDoMenu();
  }

  /**
   * Trilha do menu. O navegador só libera som depois de um gesto: se ainda não liberou, a música
   * começa no primeiro toque ou clique na página (sem pedir nada à pessoa).
   */
  tocarMusicaDoMenu() {
    if (!Aplicacao.progresso.musica) return;
    if (Som.liberado()) { Musica.tocar('menu'); return; }
    const aoTocar = () => {
      document.removeEventListener('pointerdown', aoTocar, true);
      if (!this.sys.isActive() || !Aplicacao.progresso.musica) return;
      Som.desbloquear();
      Musica.tocar('menu');
    };
    document.addEventListener('pointerdown', aoTocar, true);
    this.events.once('shutdown', () => document.removeEventListener('pointerdown', aoTocar, true));
  }

  /** Nove cartas semitransparentes flutuando devagar. */
  espalharCartas() {
    const cartas = embaralhar(BARALHOS.classico.montar(), { semente: 99 });
    const sorteio = Phaser.Math.Between;
    for (const carta of cartas.slice(0, 9)) {
      const imagem = this.add.image(sorteio(60, 1220), sorteio(60, 660), texturaDaCartaNaMesa(this, carta, 'classico'))
        .setDisplaySize(68, 95).setAlpha(0.28).setAngle(sorteio(-25, 25));
      this.tweens.add({ targets: imagem, y: imagem.y - sorteio(20, 60), angle: imagem.angle + sorteio(-10, 10), duration: sorteio(3000, 6000), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  /** Redesenha a rede com conexões que pulsam (azul e laranja, como no TensorFlow Playground). */
  update(tempo) {
    const g = this.rede;
    g.clear();
    const p = this.pontos;
    for (let c = 0; c < p.length - 1; c++) {
      p[c].forEach((a, i) => {
        p[c + 1].forEach((b, j) => {
          const espessura = 0.5 + 2.5 * Math.abs(Math.sin(i * 1.7 + j * 2.3 + c + tempo / 2400));
          g.lineStyle(espessura, (i + j + c) % 2 ? CORES.j0 : CORES.j1, 0.18);
          g.lineBetween(a.x, a.y, b.x, b.y);
        });
      });
    }
    for (const coluna of p) for (const ponto of coluna) { g.fillStyle(0xd9b260, 0.25); g.fillCircle(ponto.x, ponto.y, 9); }
  }
}
