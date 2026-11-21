/**
 * @file Estado da aplicação fora da partida: opções do menu, progresso salvo, conquistas,
 * som e navegação entre o menu e a mesa.
 *
 * É um objeto único (`Aplicacao`) compartilhado pelas cenas e pelas telas HTML.
 */
import { carregarProgresso, salvarProgresso } from './conteudo/progresso.js';
import { CONQUISTAS, GRADUACOES, VALEM_SEM_MAO_COMPLETA, VALEM_NA_HORA, CONQUISTA_FINAL, progressoDaFinal } from './conteudo/conquistas.js';
import { VERBETES } from './conteudo/grimorio.js';
import { pontuarRede } from './nucleo/pontuacao.js';
import { Som } from './interface/som.js';
import { Musica } from './interface/musica.js';
import { fecharTodos, avisarConquista } from './interface/paineis.js';
import { medalhaHtml } from './interface/medalha.js';
import { registrarEvento, atualizarJogador, aoRegistrarEvento, EVENTOS } from './interface/analise.js';
import { estatisticasDe, registrarAcesso, contarEvento, tipoDeAparelho } from './online/estatisticas.js';
import { VERSAO } from './versao.js';

/**
 * Opções usadas na primeira visita. `jogadores` é o total na mesa (2 a 5), `humanos` quantos deles
 * jogam no mesmo aparelho (os outros são oponentes do perfil `oponente`), `arquitetura` é uma das
 * arquiteturas do motor e `baralhos` quantos baralhos entram na partida.
 */
export const OPCOES_PADRAO = {
  oponente: 'guloso', baralho: 'classico', terreno: 'neutro', inicio: 'revela-descarta', alvo: 12,
  jogadores: 2, humanos: 1, arquitetura: 'padrao', baralhos: 1,
};

/** Faixa de experiência do jogador pelo número de mãos jogadas (propriedade `experiencia`). */
export function faixaDeExperiencia(maos) {
  const n = Number(maos) || 0;
  return n === 0 ? 'novato' : n < 10 ? 'iniciante' : n < 50 ? 'intermediario' : 'veterano';
}

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
  /** Verbetes do Glossário já mostrados como aviso nesta sessão. */
  verbetesAvisados: {},
  /** Instância do Phaser.Game (definida em principal.js). */
  jogo: null,
  /** Dicas ligadas nesta sessão (mãos jogadas com dicas não valem conquistas). */
  dicasLigadas: false,
  /** Partida online em andamento: `{ sala }` (ver src/online/sala.js), ou null. */
  online: null,
  /** Quem quer saber quando efeitos ou música ligam e desligam (botões de ícone, janela MENU). */
  ouvintesDeAudio: new Set(),

  /** Carrega opções e preferência de som. */
  iniciar() {
    /* a música começa ligada até a pessoa escolher (progressos antigos guardavam "desligada" sem escolha) */
    if (!this.progresso.musicaEscolhida) this.progresso.musica = true;
    this.opcoes = normalizarOpcoes(this.progresso.opcoes);
    Som.definirMudo(!!this.progresso.mudo);
    /* estatísticas do jogador (#66): conta esta abertura e passa a contar partidas, mãos, truco e
       salas pelos mesmos eventos que vão para o Google Analytics */
    registrarAcesso(this.progresso, { versao: VERSAO, aparelho: tipoDeAparelho() });
    this.salvar();
    if (this.pararDeContar) this.pararDeContar();
    this.pararDeContar = aoRegistrarEvento((nome, dados) => {
      if (!contarEvento(this.progresso, nome, dados)) return;
      this.salvar();
      this.atualizarJogadorNasEstatisticas();
    });
    this.atualizarJogadorNasEstatisticas();
    /* quem completou as conquistas antes de existir a final recebe a final ao abrir o jogo */
    this.conferirConquistaFinal();
  },

  /** Passa às estatísticas de uso a experiência, as conquistas, o avatar, os verbetes lidos, os acessos e as partidas. */
  atualizarJogadorNasEstatisticas() {
    const p = this.progresso, e = estatisticasDe(p);
    atualizarJogador({
      experiencia: faixaDeExperiencia(p.maos), conquistas: Object.keys(p.desbloqueadas || {}).length,
      avatar: p.avatar || 'padrao', verbetes_lidos: p.verbetesLidos || 0,
      acessos: e.acessos, partidas: e.partidas.terminadas, vitorias: e.partidas.vencidas,
    });
  },

  /** Grava o progresso. */
  salvar() { salvarProgresso(this.progresso); },

  /** Grava as escolhas do menu para a próxima visita. */
  salvarOpcoes() { this.progresso.opcoes = this.opcoes; this.salvar(); },

  /**
   * Passa a ser avisado quando os efeitos sonoros ou a música ligam ou desligam, de onde vier a
   * mudança (ícone do menu, ícone da mesa ou janela MENU). Devolve a função que cancela o aviso.
   * @param {() => void} ouvinte
   */
  aoMudarAudio(ouvinte) {
    this.ouvintesDeAudio.add(ouvinte);
    return () => this.ouvintesDeAudio.delete(ouvinte);
  },

  /** Avisa os ouvintes de que o estado do áudio mudou (um que falhe não impede os outros). */
  avisarMudancaDeAudio() {
    for (const ouvinte of [...this.ouvintesDeAudio]) { try { ouvinte(); } catch (e) { /* uma tela fechada não pode travar o som */ } }
  },

  /** Liga ou desliga o som e lembra a escolha. */
  alternarSom() {
    this.progresso.mudo = !Som.estaMudo();
    Som.definirMudo(this.progresso.mudo);
    this.salvar();
    registrarEvento(EVENTOS.audio, { tipo: 'som', ligado: this.progresso.mudo ? 0 : 1 });
    this.avisarMudancaDeAudio();
  },

  /**
   * Liga ou desliga a música de fundo e lembra a escolha.
   * @param {string} [terreno] Terreno da mesa atual, para já começar a música certa.
   */
  alternarMusica(terreno) {
    this.progresso.musica = !this.progresso.musica;
    this.progresso.musicaEscolhida = true;
    this.salvar();
    registrarEvento(EVENTOS.audio, { tipo: 'musica', ligado: this.progresso.musica ? 1 : 0 });
    if (this.progresso.musica && terreno) Musica.tocar(terreno); else Musica.parar();
    this.avisarMudancaDeAudio();
  },

  /** Sai do menu e abre a mesa. */
  jogar() {
    const o = this.opcoes || OPCOES_PADRAO;
    registrarEvento(EVENTOS.jogoIniciado, {
      baralho: o.baralho, terreno: o.terreno, oponente: o.oponente, arquitetura: o.arquitetura,
      jogadores: o.jogadores, humanos: o.humanos, baralhos: o.baralhos, alvo: o.alvo, online: this.online ? 1 : 0,
    });
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
    /* "Diga meu nome": a soma da rede de cada mão entra no total de pontos de todas as mãos */
    p.pontos = (p.pontos || 0) + Math.round(pontuarRede(ctx.mao, ctx.eu).total);
    if (ctx.venceu) {
      p.vitorias++;
      if (ctx.completa && jogador.acoesUsadas === 0) p.vitoriasZen++;
      if (ctx.completa) {
        p.terrenos[ctx.mao.config.terreno] = true; p.baralhos[ctx.mao.config.baralho] = true;
        p.arquiteturas = p.arquiteturas || {}; p.arquiteturas[ctx.mao.config.arquitetura || 'padrao'] = true;
      }
    }
    ctx.progresso = p;
    const novas = this.desbloquear(conquistasNovas(CONQUISTAS.filter((c) => ctx.completa || VALEM_SEM_MAO_COMPLETA.has(c.id)), ctx, p));
    this.salvar();
    this.atualizarJogadorNasEstatisticas();
    return novas;
  },

  /**
   * Confere, logo depois de uma jogada, as conquistas que valem na hora (`VALEM_NA_HORA`: ações e
   * dropouts) e devolve as novas. Não mexe nos contadores, que só contam a mão quando ela acaba.
   * @param {{mao: object, eu: number, opcoes: object}} ctx Mão em andamento e a cadeira de quem joga neste aparelho.
   */
  registrarJogada(ctx) {
    const p = this.progresso;
    const jogador = ctx.mao.jogadores[ctx.eu];
    /* os dropouts da mão em andamento só entram em `p.dropouts` quando ela acaba (registrarMao) */
    const contexto = { ...ctx, progresso: { ...p, dropouts: p.dropouts + (jogador ? jogador.dropouts : 0) } };
    const novas = conquistasNovas(CONQUISTAS.filter((c) => VALEM_NA_HORA.has(c.id)), contexto, p);
    if (!novas.length) return novas;
    const desbloqueadas = this.desbloquear(novas);
    this.salvar();
    this.atualizarJogadorNasEstatisticas();
    return desbloqueadas;
  },

  /**
   * Desbloqueia conquistas: marca a data, avisa no alto da tela (uma medalha por vez, com o som) e
   * registra cada uma nas estatísticas de uso. Se com elas todas as outras estiverem desbloqueadas,
   * a conquista final (`CONQUISTA_FINAL`) entra também, por último. Quem chama grava o progresso.
   * @param {object[]} conquistas Conquistas ainda bloqueadas (ver conteudo/conquistas.js).
   * @returns {object[]} As desbloqueadas agora, com a final no fim, se for o caso.
   */
  desbloquear(conquistas) {
    const p = this.progresso, agora = Date.now();
    const lista = conquistas.slice();
    for (const conquista of lista) p.desbloqueadas[conquista.id] = agora;
    const { feitas, total: outras } = progressoDaFinal(p.desbloqueadas);
    if (!p.desbloqueadas[CONQUISTA_FINAL] && feitas === outras) {
      const final = CONQUISTAS.find((c) => c.id === CONQUISTA_FINAL);
      p.desbloqueadas[final.id] = agora;
      lista.push(final);
    }
    const total = Object.keys(p.desbloqueadas).length;
    for (const conquista of lista) {
      const graduacao = GRADUACOES[conquista.graduacao], ehFinal = conquista.id === CONQUISTA_FINAL;
      avisarConquista({
        rotulo: (ehFinal ? 'Conquista final · ' : 'Conquista · ') + graduacao.nome, titulo: conquista.nome, texto: conquista.descricao,
        medalha: medalhaHtml(conquista, true), classe: graduacao.especial ? 'especial' : '',
        duracaoMs: graduacao.especial ? 8000 : undefined,
        aoMostrar: () => (graduacao.especial ? Som.campeao() : Som.medalha()),
      });
      registrarEvento(EVENTOS.conquista, { conquista: conquista.id, nome: conquista.nome, graduacao: conquista.graduacao, total, maos: p.maos });
    }
    return lista;
  },

  /**
   * Concede a conquista final a quem já tem todas as outras e ainda não a recebeu (por exemplo, quem
   * completou as conquistas antes de ela existir). Devolve as desbloqueadas agora.
   */
  conferirConquistaFinal() {
    const novas = this.progresso.desbloqueadas[CONQUISTA_FINAL] ? [] : this.desbloquear([]);
    if (novas.length) { this.salvar(); this.atualizarJogadorNasEstatisticas(); }
    return novas;
  },

  /** Marca um verbete como lido e concede "Bibliotecário" quando todos foram lidos. */
  marcarVerbeteLido(id) {
    const p = this.progresso;
    if (p.lidos[id]) return;
    p.lidos[id] = true;
    p.verbetesLidos = Object.keys(p.lidos).length;
    registrarEvento(EVENTOS.verbeteLido, { verbete: id, lidos: p.verbetesLidos });
    if (!p.desbloqueadas.biblio && p.verbetesLidos >= VERBETES.length) this.desbloquear([CONQUISTAS.find((c) => c.id === 'biblio')]);
    this.salvar();
    this.atualizarJogadorNasEstatisticas();
  },
};

/**
 * Conquistas de `candidatas` que ainda estão bloqueadas e cujo teste passa no contexto `ctx`. Um teste
 * que dá erro conta como não cumprido.
 */
function conquistasNovas(candidatas, ctx, progresso) {
  return candidatas.filter((conquista) => {
    if (progresso.desbloqueadas[conquista.id]) return false;
    try { return !!conquista.teste(ctx); } catch (e) { return false; }
  });
}
