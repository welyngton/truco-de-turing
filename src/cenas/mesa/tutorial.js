/**
 * @file Parte da CenaMesa: o modo tutorial (issues #137 a #143). Com `this.tutorial` ligado, a mesa
 * joga a partida do roteiro (`src/conteudo/roteiroDoTutorial.js`) em vez de uma mão sorteada:
 *
 *  - só a jogada esperada do passo é aceita (`tutorialPermite`, perguntado por cada entrada em
 *    entrada.js); o resto balança o balão do Percy (`tutorialRecusa`);
 *  - o rival joga o que o roteiro manda, sem passar pelo bot;
 *  - nada é registrado: nem estatísticas, nem conquistas, nem analytics, nem fim de mão (a cena não
 *    chama `encerrarMao`) e os avisos do Livro de conceitos ficam para o botão "Aprender mais";
 *  - no fim (ou ao pular), marca `progresso.tutorialVisto` e vai para o jogo ou para o menu,
 *    conforme a `origem` ('jogar' ou 'regras').
 *
 * A cena entra neste modo por `scene.start('Mesa', { tutorial: { origem } })`.
 */
import { criarTutorial } from '../../nucleo/tutorial.js';
import { ROTEIRO, CONFIG_DO_TUTORIAL, OPONENTE_DO_TUTORIAL, NOME_DO_ASSISTENTE } from '../../conteudo/roteiroDoTutorial.js';
import { TEXTOS } from '../../conteudo/textosDoTutorial.js';
import { OPONENTES } from '../../nucleo/oponentes/index.js';
import { criarAssistente } from '../../interface/assistente.js';
import { abrirGrimorio } from '../../interface/telas/grimorio.js';
import { retanguloNaTela } from '../recursos.js';
import { TABULEIRO, PAINEL_DIR, ESQ, DIR, colunaX, linhaY, cartaDaMesa } from './layout.js';
import { TAMANHO_CARTA } from '../../configuracao.js';
import { rotuloDoId } from '../../nucleo/tutorial.js';

/** Opções da mesa do tutorial (as do roteiro, com um humano e o rival mais simples). */
export const OPCOES_DO_TUTORIAL = { ...CONFIG_DO_TUTORIAL, jogadores: 2, humanos: 1, oponente: OPONENTE_DO_TUTORIAL };

export const metodosDoTutorial = {
  /** Dados com que a cena foi iniciada (`{ origem }`) quando é o tutorial; null no jogo normal. */
  dadosDoTutorial() {
    const dados = this.sys && this.sys.settings && this.sys.settings.data;
    return (dados && dados.tutorial) || null;
  },

  /** Liga o modo tutorial: cria o roteiro e o assistente. Chamado no `create` da cena. */
  prepararTutorial(dados) {
    this.dadosDoTutorial_ = dados;
    this.tutorial = criarTutorial(ROTEIRO, { textos: TEXTOS, nomes: ['Você', OPONENTES[OPONENTE_DO_TUTORIAL].nome], oponente: OPONENTE_DO_TUTORIAL });
    this.assistente = criarAssistente({
      nome: NOME_DO_ASSISTENTE,
      aoProximo: () => this.aoProximoDoTutorial && this.aoProximoDoTutorial(),
      aoPular: () => this.terminarTutorial(true),
      aoAprender: () => this.aprenderMaisDoTutorial(),
    });
    this.events.once('shutdown', () => { if (this.assistente) this.assistente.destruir(); this.assistente = null; });
  },

  /* ------------------------------------------------------------------ bloqueio */

  /** A entrada (ver `permite` em nucleo/tutorial.js) está liberada? Fora do tutorial, sempre. */
  tutorialPermite(entrada) {
    return !this.tutorial || this.tutorial.permite(entrada);
  },

  /** Entrada recusada: o balão balança e nada mais acontece. Devolve sempre `undefined`. */
  tutorialRecusa() {
    if (this.assistente) this.assistente.sacudir();
  },

  /* ------------------------------------------------------------------ fluxo */

  /** Decide o que vem agora no roteiro: fim, jogada do rival, jogada guiada ou diálogo. */
  avancarTutorial() {
    if (this.encerrada || !this.scene.isActive()) return;
    const t = this.tutorial;
    if (t.terminou) return this.terminarTutorial(false);
    const passo = t.passo;
    this.quemVe = 0;
    if (t.ehDoRival(passo)) return this.jogarRivalDoTutorial();
    const doJogador = t.ehDoJogador(passo);
    this.ocupada = !doJogador;
    this.modo = doJogador && passo.jogadaEsperada.tipo === 'inicio' ? 'inicio' : 'livre';
    this.selecao = [];
    this.acaoEscolhida = null;
    this.redesenhar();
    this.mostrarFalaDoTutorial(passo, doJogador ? null : (t.passo === t.passos[t.passos.length - 1] ? 'Concluir' : 'Próximo'),
      () => { t.proximo(); this.avancarTutorial(); });
  },

  /**
   * Mostra a fala de um passo.
   * @param {object} passo
   * @param {string|null} botao Texto do botão do balão; null nas jogadas guiadas (o jogador clica na mesa).
   * @param {() => void} aoProximo O que o botão faz.
   */
  mostrarFalaDoTutorial(passo, botao, aoProximo) {
    const t = this.tutorial;
    this.aoProximoDoTutorial = aoProximo;
    this.passoDaFala = passo;
    this.assistente.mostrar({
      texto: t.texto(passo), botao, verbete: !!(passo.verbete || passo.livro),
      alvos: () => this.retangulosDoTutorial(passo),
      escurecer: !!(t.ehDoJogador(passo) || (passo.destaque && passo.destaque.length)),
    });
  },

  /** Retângulos (em pixels da tela) do que o balão do passo aponta agora. */
  retangulosDoTutorial(passo) {
    const t = this.tutorial;
    if (t.passo !== passo && !(passo.destaque && passo.destaque.length)) return [];
    const marcadas = (this.selecao || []).map(rotuloDoId);
    const itens = t.passo === passo ? t.destaques(marcadas) : passo.destaque;
    return itens.map((item) => this.retanguloDoAlvo(item)).filter(Boolean);
  },

  /** Retângulo, em pixels da tela, de um destaque do roteiro (ver `destaque` em roteiroDoTutorial.js). */
  retanguloDoAlvo(alvo) {
    const p = this.painel, R = (cx, cy, l, a) => retanguloNaTela(this, cx, cy, l, a);
    const dosLimites = (b) => R((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, b.x1 - b.x0, b.y1 - b.y0);
    const doBotao = (botao) => { if (!botao) return null; const b = botao.getBounds(); return R(b.centerX, b.centerY, b.width, b.height); };
    if (typeof alvo === 'string') {
      switch (alvo) {
        case 'tabuleiro': return dosLimites(TABULEIRO);
        case 'mao': {
          const imgs = this.cartasDaMao || [];
          if (!imgs.length) return null;
          const x0 = Math.min(...imgs.map((i) => i.x - i.displayWidth / 2)), x1 = Math.max(...imgs.map((i) => i.x + i.displayWidth / 2));
          const y0 = Math.min(...imgs.map((i) => i.y - i.displayHeight / 2)), y1 = Math.max(...imgs.map((i) => i.y + i.displayHeight / 2));
          return dosLimites({ x0, x1, y0, y1 });
        }
        case 'limbo': case 'cemiterio': return R(p[alvo].x, p[alvo].y, ESQ.pilha.l + 10, ESQ.pilha.a + 10);
        case 'placar': {
          const primeiro = p.blocos[0], ultimo = p.blocos[p.blocos.length - 1];
          return dosLimites({ x0: PAINEL_DIR.x + 6, x1: PAINEL_DIR.x + PAINEL_DIR.l - 6, y0: primeiro.y, y1: ultimo.y + ultimo.a });
        }
        case 'placar-voce': case 'placar-rival': {
          const b = alvo === 'placar-voce' ? p.blocos[p.blocos.length - 1] : p.blocos[0];
          return dosLimites({ x0: b.x, x1: b.x + b.l, y0: b.y, y1: b.y + b.a });
        }
        case 'truco': return doBotao(p.truco);
        case 'acoes': return dosLimites({ x0: PAINEL_DIR.x + 12, x1: PAINEL_DIR.x + PAINEL_DIR.l - 12, y0: DIR.acoes - DIR.alturaAcao / 2, y1: DIR.acoes2 + DIR.alturaAcao / 2 });
        default: return null;
      }
    }
    if (alvo.neuronio) {
      const n = this.mao.neuronios[alvo.neuronio], { l, a } = cartaDaMesa();
      return n ? R(colunaX(n.camada), linhaY(n.camada, n.posicao), l + 6, a + 6) : null;
    }
    if (alvo.carta) {
      const imgs = (this.cartasDaMao || []).filter((i) => rotuloDoId(i.idCarta) === alvo.carta);
      const img = imgs.find((i) => !(this.selecao || []).includes(i.idCarta)) || imgs[0];
      return img ? R(img.x, img.y, img.displayWidth || TAMANHO_CARTA.maoL, img.displayHeight || TAMANHO_CARTA.maoA) : null;
    }
    if (alvo.acao) return doBotao(p.acoes[alvo.acao]);
    return null;
  },

  /** Jogada do jogador vinda da mesa: só a esperada passa; aplica, anima e segue o roteiro. */
  executarJogadaDoTutorial(jogada) {
    const t = this.tutorial;
    if (!t.aceita(jogada)) {
      this.selecao = [];
      if (t.passo && t.ehDoJogador() && t.passo.jogadaEsperada.tipo === 'inicio') this.modo = 'inicio';
      this.tutorialRecusa();
      this.redesenhar();
      return;
    }
    this.assistente.esconder();
    t.jogar(jogada);
    this.animarJogadaDoTutorial(jogada, () => this.avancarTutorial());
  },

  /** Anima os eventos da jogada que acabou de ser aplicada e chama `depois` quando terminam. */
  animarJogadaDoTutorial(jogada, depois) {
    this.selecao = [];
    this.acaoEscolhida = null;
    this.modo = 'livre';
    this.ocupada = true;
    const eventos = this.mao.eventos.splice(0);
    this.redesenhar();
    const espera = this.animarEventos(eventos, jogada);
    this.time.delayedCall(espera, depois);
  },

  /** O rival joga a jogada do roteiro; se o passo tem fala, o Percy comenta depois. */
  jogarRivalDoTutorial() {
    const t = this.tutorial, passo = t.passo;
    this.ocupada = true;
    this.assistente.esconder();
    this.notaDoOponente = 'pensando…';
    this.redesenhar();
    this.time.delayedCall(700, () => {
      if (this.encerrada) return;
      this.notaDoOponente = null;
      const jogada = t.jogarDoRival();
      this.animarJogadaDoTutorial(jogada, () => {
        if (!TEXTOS[passo.id]) return this.avancarTutorial();
        this.mostrarFalaDoTutorial(passo, 'Próximo', () => this.avancarTutorial());
      });
    });
  },

  /** "Aprender mais" do balão: abre o verbete do passo (ou o Livro inteiro) e volta para o roteiro. */
  aprenderMaisDoTutorial() {
    const passo = this.passoDaFala;
    if (!passo) return;
    abrirGrimorio(this.app, passo.verbete || undefined);
  },

  /**
   * Fim do tutorial, concluído ou pulado: marca como visto (para não oferecer de novo) e segue para
   * o jogo (quando veio do botão Jogar) ou volta ao menu (quando veio de Como jogar).
   */
  terminarTutorial(pulou) {
    if (this.encerrada) return;
    this.encerrada = true;
    const origem = (this.dadosDoTutorial_ || {}).origem;
    this.app.progresso.tutorialVisto = true;
    this.app.salvar();
    if (this.assistente) this.assistente.esconder();
    if (origem === 'jogar') this.app.jogar(); else this.app.irParaMenu();
    return pulou;
  },
};
