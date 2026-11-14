/**
 * @file Ponto de entrada do jogo: prepara o texto nítido, carrega as opções e cria o Phaser.Game
 * com as três cenas (Carregamento → Menu → Mesa). Num celular na vertical, o jogo só é criado
 * depois que o aparelho é girado; até lá aparece o aviso #girar (index.html).
 *
 * O Phaser vem do CDN como variável global `Phaser` (ver index.html).
 */
import { MUNDO, RESOLUCAO, FORCAR_CANVAS } from './configuracao.js';
import { Aplicacao } from './aplicacao.js';
import { prepararTextoNitido } from './cenas/recursos.js';
import { CenaCarregamento } from './cenas/CenaCarregamento.js';
import { CenaMenu } from './cenas/CenaMenu.js';
import { CenaMesa } from './cenas/mesa/CenaMesa.js';
import { iniciarAnalise, registrarEvento, EVENTOS } from './interface/analise.js';
import { retomarConta, haMarcaDeConta } from './interface/conta.js';

/** Celular na vertical (o aviso para girar aparece no lugar do jogo; ver #girar em estilo.css). */
const celularEmPe = globalThis.matchMedia ? matchMedia('(orientation: portrait) and (max-width: 600px)') : null;

/** Quantos dedos o Phaser acompanha ao mesmo tempo. */
export const TOQUES_SIMULTANEOS = 4;

/**
 * Ao entrar ou sair da tela cheia (e ao girar), o canvas muda de tamanho e de posição em etapas.
 * Remede algumas vezes, para que os toques nunca caiam no lugar antigo dos botões.
 */
function remedirAposMudarATela() {
  for (const espera of [50, 250, 600, 1200]) {
    setTimeout(() => { if (Aplicacao.jogo) Aplicacao.jogo.scale.refresh(); }, espera);
  }
}

/** Cria o Phaser.Game com as três cenas. */
function criarJogo() {
  Aplicacao.jogo = new Phaser.Game({
    type: FORCAR_CANVAS ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'jogo',
    width: Math.round(MUNDO.largura * RESOLUCAO),
    height: Math.round(MUNDO.altura * RESOLUCAO),
    backgroundColor: '#06180f',
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    /* cliques nos painéis HTML não vazam para o canvas. Vários toques simultâneos: em tela cheia
     * o polegar que segura o celular costuma encostar na borda da tela, e com um só ponteiro
     * de toque o Phaser ignorava o toque seguinte (nos botões de ação). */
    input: { windowEvents: false, activePointers: TOQUES_SIMULTANEOS },
    scene: [CenaCarregamento, CenaMenu, CenaMesa],
  });
  document.addEventListener('fullscreenchange', remedirAposMudarATela);
  document.addEventListener('webkitfullscreenchange', remedirAposMudarATela);
  globalThis.screen?.orientation?.addEventListener?.('change', remedirAposMudarATela);
}

/** Cria o jogo agora ou, num celular em pé, assim que ele for girado para a horizontal. */
function iniciarJogo() {
  if (Aplicacao.jogo) return;
  if (!celularEmPe || !celularEmPe.matches) return criarJogo();
  const aoGirar = () => {
    if (celularEmPe.matches) return;
    removeEventListener('resize', aoGirar);
    removeEventListener('orientationchange', aoGirar);
    setTimeout(iniciarJogo, 150); /* espera o navegador terminar de redimensionar */
  };
  addEventListener('resize', aoGirar);
  addEventListener('orientationchange', aoGirar);
}

prepararTextoNitido();
Aplicacao.iniciar();
iniciarJogo();
/* quem já entrou numa conta neste navegador continua conectado depois de recarregar (#60) */
retomarConta(Aplicacao);
/* estatísticas de uso: só no site publicado e com consentimento (ver interface/analise.js) */
iniciarAnalise();
/* a abertura já foi contada nas estatísticas do jogador (Aplicacao.iniciar); aqui vai para o Analytics */
registrarEvento(EVENTOS.acesso, { numero: Aplicacao.progresso.estatisticas.acessos, conta: haMarcaDeConta() ? 1 : 0 });

/* acesso para testes automatizados e depuração no console */
globalThis.__TRUCO_DE_TURING__ = Aplicacao;
