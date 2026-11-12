/**
 * @file Cena de carregamento: espera as fontes e gera as texturas fixas (verso clássico, cartas de
 * terreno, avatares, faísca e a textura da inspeção). Depois abre o menu.
 */
import { MUNDO, DENSIDADE, RESOLUCAO, CORES_CSS } from '../configuracao.js';
import { TERRENOS } from '../nucleo/terrenos.js';
import { desenharCartaDeTerreno } from '../arte/cartasDeTerreno.js';
import { desenharAvatar } from '../arte/avatares.js';
import { AVATARES_DO_JOGADOR } from '../conteudo/avatares.js';
import { desenharFaisca } from '../arte/botoes.js';
import { ajustarCamera, texturaDaMesa, texturaDoVerso, criarTexturaDeInspecao } from './recursos.js';

/** Fontes usadas pelo canvas; precisam estar carregadas antes de desenhar as cartas. */
const FONTES_NECESSARIAS = [
  '900 30px Cinzel', '700 15px Cinzel', '600 15px Cinzel', '400 13px Spectral', '500 12px Spectral',
  '600 12px Spectral', '700 13px Spectral', '800 15px Spectral', 'italic 400 12px Spectral', 'italic 500 12px Spectral',
];

/** Avatares gerados: chave → cor do aro. */
const AVATARES = { gradiente: CORES_CSS.j1, mc: CORES_CSS.j1, ruido: CORES_CSS.j1, p1: CORES_CSS.j0, p2: CORES_CSS.j1 };

export class CenaCarregamento extends Phaser.Scene {
  constructor() { super('Carregamento'); }

  create() {
    ajustarCamera(this);
    const aviso = this.add.text(MUNDO.largura / 2, MUNDO.altura / 2, 'Embaralhando neurônios…', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#d9b260' }).setOrigin(0.5);
    const fontes = document.fonts ? Promise.all(FONTES_NECESSARIAS.map((f) => document.fonts.load(f).catch(() => {}))) : Promise.resolve();
    const limite = new Promise((r) => setTimeout(r, 3000));
    Promise.race([fontes, limite]).then(() => {
      aviso.destroy();
      this.gerarTexturas();
      this.scene.start('Menu');
    });
  }

  /** Gera as texturas que não dependem da partida. */
  gerarTexturas() {
    const adicionar = (chave, canvas) => {
      if (this.textures.exists(chave)) this.textures.remove(chave);
      this.textures.addCanvas(chave, canvas);
    };
    texturaDaMesa(this, 'neutro');
    for (const uso of ['inspecao', 'mao', 'mesa']) texturaDoVerso(this, uso, 'classico');
    for (const terreno of Object.keys(TERRENOS)) adicionar('terreno-' + terreno, desenharCartaDeTerreno(terreno, DENSIDADE.inspecao));
    for (const [tipo, cor] of Object.entries(AVATARES)) adicionar('avatar-' + tipo, desenharAvatar(tipo, cor, DENSIDADE.avatar));
    /* avatares extras do jogador (os liberados por conquistas também, para trocar sem recarregar) */
    for (const a of AVATARES_DO_JOGADOR) if (!AVATARES[a.id]) adicionar('avatar-' + a.id, desenharAvatar(a.id, CORES_CSS.j0, DENSIDADE.avatar));
    adicionar('faisca', desenharFaisca(Math.min(RESOLUCAO, 2), '#ffffff'));
    criarTexturaDeInspecao(this);
  }
}
