/**
 * @file Parte da CenaMesa: o fluxo da mão. Começar a mão, executar jogadas, decidir quem joga a
 * seguir, passar o aparelho no modo de dois jogadores e a vez do oponente do computador.
 *
 * O ciclo é: `avancar()` olha o estado e entrega a vez (humano, oponente ou troca de aparelho);
 * cada jogada passa por `executarJogada()`, que aplica as regras, anima os eventos e chama
 * `avancar()` de novo quando a animação termina.
 */
import { avatarDoJogador } from '../../conteudo/avatares.js';
import { novaMao, aplicarJogada, jogadasLegais, camadasDesfaziveis } from '../../nucleo/partida.js';
import { podeTrucar } from '../../nucleo/truco.js';
import { OPONENTES, escolherJogada, querTrucar } from '../../nucleo/oponentes/index.js';
import { mostrarAviso, confirmar } from '../../interface/paineis.js';
import { liberarCartasDaMao, texturaDoVerso } from '../recursos.js';
import { colunaX, linhaY, ajustarCartaDaMesa, ajustarBloco, cartaDaMesa, PAINEL_ESQ } from './layout.js';
import { FONTES } from '../../configuracao.js';

export const metodosDeTurnos = {
  /* ------------------------------------------------------------------ consultas rápidas */

  /** Chave da textura do verso do baralho em uso. */
  verso(uso) { return texturaDoVerso(this, uso, this.opcoes.baralho); },

  /** Jogador mostrado embaixo (quem está vendo; o 0 enquanto o aparelho troca de mãos). */
  jogadorDeBaixo() { return this.quemVe < 0 ? 0 : this.quemVe; },

  /** Os outros jogadores, na ordem em que jogam depois de quem está embaixo (mãos de cima, da esquerda para a direita). */
  outrosJogadores() {
    const n = this.mao ? this.mao.jogadores.length : this.numJogadores, baixo = this.jogadorDeBaixo();
    return Array.from({ length: n - 1 }, (_, k) => (baixo + 1 + k) % n);
  },

  /** Ordem dos blocos do placar, de cima para baixo: os outros jogadores e, por último, quem está vendo. */
  ordemDoPlacar() { return [...this.outrosJogadores(), this.jogadorDeBaixo()]; },

  /**
   * Textura do avatar do jogador. O primeiro humano usa o avatar escolhido (tela de avatares); os
   * outros humanos do aparelho usam o truqueiro que sobrar.
   */
  avatarDe(j) {
    const jogador = this.mao.jogadores[j];
    if (jogador.tipo === 'oponente') return 'avatar-' + OPONENTES[jogador.oponente].avatar;
    const escolhido = avatarDoJogador(this.app.progresso);
    if (j === 0) return 'avatar-' + escolhido;
    return escolhido === 'p2' ? 'avatar-p1' : 'avatar-p2';
  },

  /**
   * Jogadores da mão: os humanos primeiro ("Você", ou "Jogador 1", "Jogador 2"… quando há mais de
   * um), depois os oponentes do computador, numerados quando há mais de um do mesmo perfil.
   */
  montarJogadores() {
    if (this.online) return this.jogadoresOnline();
    const perfil = this.opcoes.oponente, bots = this.numJogadores - this.humanos;
    return Array.from({ length: this.numJogadores }, (_, j) => {
      if (j < this.humanos) return { nome: this.variosHumanos ? 'Jogador ' + (j + 1) : 'Você', tipo: 'humano' };
      const k = j - this.humanos;
      return { nome: OPONENTES[perfil].nome + (bots > 1 ? ' ' + (k + 1) : ''), tipo: 'oponente', oponente: perfil };
    });
  },

  /** O jogador humano que está vendo a tela pode jogar agora? */
  ehVezDoHumano() {
    const mao = this.mao;
    return !this.ocupada && !this.encerrada && mao.fase === 'jogo' && mao.jogadores[mao.vez].tipo === 'humano' &&
      mao.vez === this.quemVe && !this.partida.pedido;
  },

  /* ------------------------------------------------------------------ mão nova */

  /** Distribui uma mão nova: cria o estado, os neurônios na tela e começa o fluxo. */
  iniciarMao() {
    this.encerrada = false;
    this.ocupada = true;
    this.modo = 'livre';
    this.selecao = [];
    this.dicaDoCursor = null;
    this.vanishingAvisado = new Array(this.numJogadores).fill(false);
    this.trucoConsideradoNoTurno = -1;
    this.oponenteCorreu = false;
    this.dicaAtual = null;
    this.dicasNaMao = this.app.dicasLigadas;
    this.linhaDoTempo = [];
    this.linhasRegistradas = 0;
    for (const objeto of this.objetosDoTabuleiro || []) objeto.destroy();
    for (const c of this.cartasDaMao || []) c.destroy();
    for (const c of this.cartasDoAdversario || []) c.destroy();
    this.objetosDoTabuleiro = [];
    this.cartasDaMao = [];
    this.cartasDoAdversario = [];
    liberarCartasDaMao(this);

    const o = this.opcoes;
    this.mao = novaMao({
      baralho: o.baralho, terreno: o.terreno, inicio: o.inicio, arquitetura: o.arquitetura, baralhos: o.baralhos,
      jogadores: this.montarJogadores(),
      /* online: a mesma semente em todos os aparelhos (ver online.js) */
      ...(this.online ? { semente: this.sementeDaMao() } : {}),
    });
    this.quemVe = this.online ? this.cadeiraOnline() : 0;
    this.inicioDosBotsEnviado = new Set();
    this.criarNeuronios();
    this.painel.inspecao.setTexture('terreno-' + this.opcoes.terreno);
    ajustarBloco(this.painel.notaInspecao, 'Passe o cursor ou toque numa carta para inspecioná-la.', 12, PAINEL_ESQ.l - 30, 40, 9.5);
    this.mao.eventos.splice(0);
    this.redesenhar();
    if (this.opcoes.terreno !== 'neutro') this.avisarVerbete('terrenos');
    this.time.delayedCall(700, () => this.avancar());
  },

  /** Cria uma imagem clicável para cada neurônio, com a animação de distribuição. */
  criarNeuronios() {
    this.visuais = {};
    const { ml, ma, l } = cartaDaMesa(), escala = Math.max(0.75, l / 62);
    /* selo de tunagem (canto de cima, dourado) e pontos do neurônio na rede (canto de baixo, na cor do dono) */
    const etiqueta = { fontFamily: FONTES.texto, fontStyle: '800', fontSize: Math.round(12 * escala) + 'px', color: '#24170c', backgroundColor: '#f6dc8f', padding: { x: 4, y: 1 } };
    const ponto = { fontFamily: FONTES.titulo, fontStyle: '800', fontSize: Math.round(12 * escala) + 'px', color: '#0d0a08', padding: { x: 4, y: 1 } };
    const lembranca = { fontFamily: FONTES.texto, fontStyle: '700', fontSize: Math.round(11 * escala) + 'px', color: '#f6dc8f', backgroundColor: 'rgba(0,0,0,.65)', padding: { x: 3, y: 1 } };
    for (const camada of this.mao.camadas) {
      for (const n of camada) {
        const x = colunaX(n.camada), y = linhaY(n.camada, n.posicao);
        const imagem = ajustarCartaDaMesa(this.add.image(x, y, this.verso('mesa')).setDepth(3).setInteractive({ useHandCursor: true }));
        imagem.on('pointerdown', () => this.aoClicarNoNeuronio(n.id));
        imagem.on('pointerover', () => this.aoPassarNoNeuronio(n.id, true));
        imagem.on('pointerout', () => this.aoPassarNoNeuronio(n.id, false));
        const pilha = this.add.text(x + ml * 0.62, y - ma * 0.78, '', etiqueta).setOrigin(0.5).setDepth(4);
        const pontos = this.add.text(x + ml * 0.62, y + ma * 0.8, '', ponto).setOrigin(0.5).setDepth(4).setVisible(false);
        const memoria = this.add.text(x, y + ma * 0.74, '', lembranca).setOrigin(0.5).setDepth(4);
        this.visuais[n.id] = { imagem, pilha, memoria, pontos };
        this.objetosDoTabuleiro.push(imagem, pilha, memoria, pontos);
        imagem.setAlpha(0).y -= 30;
        this.tweens.add({ targets: imagem, alpha: 1, y, duration: 260, delay: n.camada * 40 + n.posicao * 25, ease: 'Back.out' });
      }
    }
  },

  /* ------------------------------------------------------------------ jogadas */

  /** Aplica uma jogada (de qualquer jogador), anima os eventos e segue o fluxo. */
  executarJogada(jogada, daRede = false) {
    /* online: a jogada vai para a sala e volta numerada (online.js) */
    if (this.online && !daRede) return this.enviarOnline({ tipo: 'jogada', cadeira: jogada.jogador, jogada });
    try {
      aplicarJogada(this.mao, jogada);
    } catch (erro) {
      mostrarAviso('Jogada inválida', erro.message);
      this.redesenhar();
      /* online: a ação recusada é recusada em todas as telas; a mesa segue esperando a próxima */
      if (daRede) this.time.delayedCall(30, () => this.avancar());
      return;
    }
    this.selecao = [];
    this.acaoEscolhida = null;
    if (this.modo !== 'inicio') this.modo = 'livre';
    const eventos = this.mao.eventos.splice(0);
    this.ocupada = true;
    this.redesenhar();
    this.anotarNaLinhaDoTempo(jogada, eventos);
    const espera = this.animarEventos(eventos, jogada);
    this.time.delayedCall(espera, () => this.avancar());
  },

  /** Decide o próximo passo: fim da mão, escolha de quem começa, vez do humano ou do oponente. */
  avancar() {
    if (this.encerrada || !this.scene.isActive()) return;
    const mao = this.mao;
    if (this.partida.pedido) return;
    if (mao.fase === 'fim') return this.encerrarMao(null);
    if (mao.fase === 'inicio') return this.avancarNoInicio();
    const vez = mao.vez, jogador = mao.jogadores[vez];
    if (this.online && this.avancarOnline()) return;
    if (jogador.tipo === 'oponente') return this.vezDoOponente();
    if (this.variosHumanos && this.quemVe !== vez) return this.passarAparelho(vez, () => { this.quemVe = vez; this.avancar(); });
    this.quemVe = vez;
    this.ocupada = false;
    this.modo = 'livre';
    const jogadas = jogadasLegais(mao, vez);
    const soPassar = jogadas.length === 1 && jogadas[0].tipo === 'passar';
    if (soPassar && (camadasDesfaziveis(mao, vez) === 0 || jogador.mao.length === 0)) {
      /* nada a fazer: passa sozinho, com aviso */
      this.ocupada = true;
      this.redesenhar();
      this.mostrarDica('Nenhuma jogada possível: passando a vez.');
      this.time.delayedCall(900, () => this.executarJogada({ tipo: 'passar', jogador: vez }));
      return;
    }
    this.darDicaDoTurno();
    this.redesenhar();
  },

  /**
   * Guarda um passo da mão para a revisão didática do fim (interface/telas/revisao.js):
   * quem jogou, o que aconteceu (texto do registro e tipos de evento) e as somas depois da jogada.
   * @param {object|null} jogada Jogada aplicada, ou null para acontecimentos de fora das regras (truco).
   * @param {object[]} eventos Eventos emitidos, ou `[{ tipo }]` para o truco.
   * @param {string} [texto] Descrição; por padrão, as linhas novas do registro da mão.
   */
  anotarNaLinhaDoTempo(jogada, eventos, texto) {
    const mao = this.mao;
    const novas = mao.registro.slice(this.linhasRegistradas || 0);
    this.linhasRegistradas = mao.registro.length;
    const tipos = eventos.map((e) => e.tipo).filter((t) => t !== 'fim');
    if (jogada && jogada.tipo === 'inicio' && !tipos.includes('inicio')) return; /* escolha ainda escondida */
    this.linhaDoTempo.push({
      numero: this.linhaDoTempo.length + 1,
      jogador: jogada ? jogada.jogador : eventos[0].jogador,
      tipo: jogada ? jogada.tipo : eventos[0].tipo,
      eventos: tipos,
      texto: texto || novas.join(' '),
      somas: this.pontuacoes.map((p) => p.total),
    });
  },

  /** Fase de início: oponentes escolhem a carta; humanos escolhem um de cada vez. */
  avancarNoInicio() {
    const mao = this.mao;
    if (this.online) return this.avancarNoInicioOnline();
    mao.jogadores.forEach((jogador, j) => {
      if (jogador.tipo === 'oponente' && !jogador.cartaInicial) aplicarJogada(mao, escolherJogada(mao, j));
    });
    const esperando = mao.jogadores.findIndex((jogador) => jogador.tipo === 'humano' && !jogador.cartaInicial);
    if (esperando < 0) {
      const eventos = mao.eventos.splice(0);
      this.redesenhar();
      this.time.delayedCall(this.animarEventos(eventos), () => this.avancar());
      return;
    }
    const comecar = () => { this.quemVe = esperando; this.modo = 'inicio'; this.ocupada = false; this.redesenhar(); };
    const alguemEscolheu = mao.jogadores.some((jogador) => !!jogador.cartaInicial);
    if (this.variosHumanos && (alguemEscolheu || this.quemVe !== esperando)) return this.passarAparelho(esperando, comecar);
    comecar();
  },

  /** Modo de dois jogadores: esconde a mão e pede para passar o aparelho. */
  passarAparelho(j, continuar) {
    this.quemVe = -1;
    this.ocupada = true;
    this.redesenhar();
    confirmar('Vez de ' + this.mao.jogadores[j].nome, 'Passe o aparelho. A mão fica escondida até você confirmar.', [
      { rotulo: 'Estou pronto', classe: 'vinho', acao: () => { this.quemVe = j; continuar(); } },
    ]);
  },

  /**
   * Vez do oponente do computador: talvez pede truco, depois escolhe e executa a jogada.
   * `this.notaDoOponente` substitui a linha de nível no painel ("pensando…", resultado da simulação).
   */
  vezDoOponente() {
    const mao = this.mao, vez = mao.vez, perfil = mao.jogadores[vez].oponente;
    /* uma decisão por vez: chamadas repetidas para a mesma vez (online, quando alguém cai) não jogam duas vezes */
    const chave = mao.turno + ':' + vez + ':' + mao.registro.length;
    if (this.oponenteDecidindo === chave) return;
    this.oponenteDecidindo = chave;
    this.ocupada = true;
    this.notaDoOponente = perfil === 'montecarlo' ? 'simulando partidas…' : 'pensando…';
    this.redesenhar();
    this.time.delayedCall(perfil === 'montecarlo' ? 350 : 650, () => {
      if (this.encerrada || mao !== this.mao) return;
      this.notaDoOponente = null;
      if (this.trucoConsideradoNoTurno !== mao.turno && podeTrucar(this.partida, vez)) {
        this.trucoConsideradoNoTurno = mao.turno;
        if (querTrucar(mao, vez, perfil)) { this.oponenteDecidindo = null; return this.anunciarTruco(vez); }
      }
      const jogada = escolherJogada(mao, vez);
      if (jogada.simulacao) {
        const s = jogada.simulacao;
        this.notaDoOponente = 'simulou ' + s.partidas + ' partidas \u00b7 ' + Math.round(s.taxaDeVitoria * 100) + '% de vitória';
        this.avisarVerbete('montecarlo');
        delete jogada.simulacao;
      }
      this.executarJogada(jogada);
    });
  },
};
