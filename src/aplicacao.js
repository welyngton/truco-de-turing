/**
 * @file Estado da aplicação fora da partida: opções do menu, progresso salvo, conquistas,
 * som e navegação entre o menu e a mesa.
 *
 * É um objeto único (`Aplicacao`) compartilhado pelas cenas e pelas telas HTML.
 */
import { carregarProgresso, salvarProgresso } from './conteudo/progresso.js';
import { CONQUISTAS, VALEM_SEM_MAO_COMPLETA } from './conteudo/conquistas.js';
import { VERBETES } from './conteudo/grimorio.js';
import { Som } from './interface/som.js';
import { Musica } from './interface/musica.js';
import { fecharTodos, mostrarAviso } from './interface/paineis.js';

/**
 * Opções usadas na primeira visita. `jogadores` é o total na mesa (2 a 5), `humanos` quantos deles
 * jogam no mesmo aparelho (os outros são oponentes do perfil `oponente`), `arquitetura` é uma das
 * arquiteturas do NeuroDeck e `baralhos` quantos baralhos entram na partida.
 */
export const OPCOES_PADRAO = {
  oponente: 'guloso', baralho: 'classico', terreno: 'neutro', inicio: 'revela-descarta', alvo: 12,
  jogadores: 2, humanos: 1, arquitetura: 'padrao', baralhos: 1,
};

/**
 * Normaliza as opções do menu: completa as que faltam (progresso de versões antigas) e converte
 * o antigo oponente "2 humanos no mesmo aparelho" em `humanos: 2`.
 */
export function normalizarOpcoes(opcoes) {
  const o = { ...OPCOES_PADRAO, ...(opcoes || {}) };
  if (o.oponente === 'doisHumanos') { o.oponente = OPCOES_PADRAO.oponente; o.humanos = Math.max(2, Number(o.humanos) || 2); }
  o.jogadores = Math.max(2, Math.min(5, Number(o.jogadores) || 2));
  o.humanos = Math.max(1, Math.min(o.jogadores, Number(o.humanos) || 1));
  o.baralhos = Math.max(1, Math.min(4, Number(o.baralhos) || 1));
  return o;
}

export const Aplicacao = {
  /** Progresso salvo no navegador (ver conteudo/progresso.js). */
  progresso: carregarProgresso(),
  /** Escolhas do menu: oponente, baralho, terreno, inicio, alvo, jogadores, humanos, arquitetura, baralhos. */
  opcoes: null,
  /** Verbetes da Biblioteca de conceitos já mostrados como aviso nesta sessão. */
  verbetesAvisados: {},
  /** Instância do Phaser.Game (definida em principal.js). */
  jogo: null,
  /** Dicas ligadas nesta sessão (mãos jogadas com dicas não valem conquistas). */
  dicasLigadas: false,
  /** Partida online em andamento: `{ sala }` (ver src/online/sala.js), ou null. */
  online: null,

  /** Carrega opções e preferência de som. */
  iniciar() {
    /* a música começa ligada até a pessoa escolher (progressos antigos guardavam "desligada" sem escolha) */
    if (!this.progresso.musicaEscolhida) this.progresso.musica = true;
    this.opcoes = normalizarOpcoes(this.progresso.opcoes);
    Som.definirMudo(!!this.progresso.mudo);
  },

  /** Grava o progresso. */
  salvar() { salvarProgresso(this.progresso); },

  /** Grava as escolhas do menu para a próxima visita. */
  salvarOpcoes() { this.progresso.opcoes = this.opcoes; this.salvar(); },

  /** Liga ou desliga o som e lembra a escolha. */
  alternarSom() {
    this.progresso.mudo = !Som.estaMudo();
    Som.definirMudo(this.progresso.mudo);
    this.salvar();
  },

  /**
   * Liga ou desliga a música de fundo e lembra a escolha.
   * @param {string} [terreno] Terreno da mesa atual, para já começar a música certa.
   */
  alternarMusica(terreno) {
    this.progresso.musica = !this.progresso.musica;
    this.progresso.musicaEscolhida = true;
    this.salvar();
    if (this.progresso.musica && terreno) Musica.tocar(terreno); else Musica.parar();
  },

  /** Sai do menu e abre a mesa. */
  jogar() {
    fecharTodos();
    this.modoImersivo();
    document.body.classList.add('em-partida');
    this.jogo.scene.stop('Menu');
    this.jogo.scene.start('Mesa');
  },

  /** Volta da mesa para o menu. */
  irParaMenu() {
    fecharTodos();
    /* sair da mesa online sai da sala (os outros veem a cadeira passar para o computador) */
    if (this.online) { try { this.online.sala.sair(); } catch (e) { /* já fechada */ } this.online = null; }
    document.body.classList.remove('em-partida');
    this.jogo.scene.stop('Mesa');
    this.jogo.scene.start('Menu');
  },

  /**
   * Em celulares e tablets: tela cheia e trava na horizontal, onde o navegador permite
   * (Chrome no Android). No iPhone isso não existe; ali vale o aviso para girar o aparelho.
   */
  modoImersivo() {
    const toque = globalThis.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (!toque) return;
    const raiz = document.documentElement;
    try {
      if (!document.fullscreenElement && raiz.requestFullscreen) {
        raiz.requestFullscreen({ navigationUI: 'hide' })
          .then(() => screen.orientation?.lock?.('landscape'))
          .catch(() => { /* sem tela cheia: segue normalmente */ });
      }
    } catch (e) { /* ignora */ }
  },

  /**
   * Registra o fim de uma mão contra o computador e devolve as conquistas novas.
   * @param {object} ctx Contexto descrito em conteudo/conquistas.js (sem `progresso`, que é preenchido aqui).
   */
  registrarMao(ctx) {
    const p = this.progresso;
    const jogador = ctx.mao.jogadores[ctx.eu];
    p.maos++;
    p.dropouts += jogador.dropouts;
    if (ctx.venceu) {
      p.vitorias++;
      if (ctx.completa && jogador.acoesUsadas === 0) p.vitoriasZen++;
      if (ctx.completa) {
        p.terrenos[ctx.mao.config.terreno] = true; p.baralhos[ctx.mao.config.baralho] = true;
        p.arquiteturas = p.arquiteturas || {}; p.arquiteturas[ctx.mao.config.arquitetura || 'padrao'] = true;
      }
    }
    ctx.progresso = p;
    const novas = [];
    for (const conquista of CONQUISTAS) {
      if (p.desbloqueadas[conquista.id]) continue;
      if (!ctx.completa && !VALEM_SEM_MAO_COMPLETA.has(conquista.id)) continue;
      let ok = false;
      try { ok = !!conquista.teste(ctx); } catch (e) { ok = false; }
      if (ok) { p.desbloqueadas[conquista.id] = Date.now(); novas.push(conquista); }
    }
    this.salvar();
    if (novas.length) Som.medalha();
    return novas;
  },

  /** Marca um verbete como lido e concede "Bibliotecário" quando todos foram lidos. */
  marcarVerbeteLido(id) {
    const p = this.progresso;
    if (p.lidos[id]) return;
    p.lidos[id] = true;
    p.verbetesLidos = Object.keys(p.lidos).length;
    if (!p.desbloqueadas.biblio && p.verbetesLidos >= VERBETES.length) {
      p.desbloqueadas.biblio = Date.now();
      const conquista = CONQUISTAS.find((c) => c.id === 'biblio');
      mostrarAviso('Conquista: ' + conquista.nome, conquista.descricao, 'medalha-aviso');
      Som.medalha();
    }
    this.salvar();
  },
};
