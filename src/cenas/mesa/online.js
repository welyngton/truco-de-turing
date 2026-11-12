/**
 * @file Parte da CenaMesa: partida online (src/online/sala.js). Cada aparelho mostra a mesa do
 * ponto de vista da própria cadeira e aplica as ações na ordem numerada pela sala:
 *
 * - jogadas, pedidos de truco e respostas deste aparelho não são aplicados na hora: vão para a
 *   sala (`enviarOnline`) e voltam numerados, como as dos outros;
 * - as ações chegam numa fila e são aplicadas uma de cada vez, quando a mesa está parada
 *   esperando (`aguardandoRede`), com as mesmas animações de uma partida local;
 * - só o anfitrião joga pelos oponentes do computador (e responde truco por eles);
 * - todos criam cada mão com a mesma semente (`sementeDaMao`), então o estado é igual em todas
 *   as telas; ações de uma mão que este aparelho ainda não abriu esperam na fila;
 * - quem cai vira oponente do computador no mesmo ponto em todas as telas (ação `substituir`).
 */
import { OPONENTES, escolherJogada } from '../../nucleo/oponentes/index.js';
import { mostrarAviso } from '../../interface/paineis.js';

export const metodosOnline = {
  /** Liga a cena à sala (se a partida for online). Chamado no início de `create`. */
  prepararOnline() {
    const online = this.app.online;
    this.online = online || null;
    if (!online) return;
    this.filaOnline = [];
    this.aguardandoRede = false;
    this.partidasOnline = 0;
    const sala = online.sala;
    const aoReceber = (acao) => { this.filaOnline.push(acao); this.processarFilaOnline(); };
    const aoAvisar = (texto) => mostrarAviso('Sala ' + sala.config.codigo, texto, null, 5000);
    sala.on('acao', aoReceber).on('aviso', aoAvisar);
    this.events.once('shutdown', () => { sala.off('acao', aoReceber).off('aviso', aoAvisar); });
  },

  /** Cadeira deste aparelho na sala. */
  cadeiraOnline() { return this.online.sala.minhaCadeira; },

  /** Este aparelho joga pelos oponentes do computador? */
  souAnfitriaoOnline() { return !!this.online && this.online.sala.souAnfitriao; },

  /** Identifica a mão atual (partida e número da mão), para separar as ações de cada mão. */
  chaveDaMao() { return this.partidasOnline + ':' + this.partida.numeroMao; },

  /** Semente da mão atual: a mesma em todos os aparelhos. */
  sementeDaMao() { return (this.online.sala.config.semente + this.partidasOnline * 1000 + this.partida.numeroMao) >>> 0; },

  /** Jogadores da partida online: as pessoas pelo nome, as outras cadeiras com o perfil escolhido. */
  jogadoresOnline() {
    const perfil = this.opcoes.oponente, cadeiras = this.online.sala.config.cadeiras;
    const bots = cadeiras.filter((c) => c.tipo !== 'humano').length;
    let k = 0;
    return cadeiras.map((c, j) => {
      if (c.tipo === 'humano') return { nome: j === this.cadeiraOnline() ? c.nome + ' (você)' : c.nome, tipo: 'humano' };
      k++;
      return { nome: c.saiu ? c.saiu + ' (computador)' : OPONENTES[perfil].nome + (bots > 1 ? ' ' + k : ''), tipo: 'oponente', oponente: perfil };
    });
  },

  /** Manda uma ação deste aparelho para a sala e espera ela voltar numerada. */
  enviarOnline(acao) {
    this.online.sala.enviar({ ...acao, mao: this.chaveDaMao() });
    this.ocupada = true;
    this.esperarRede();
  },

  /** A mesa para e espera a próxima ação da sala. */
  esperarRede() {
    this.aguardandoRede = true;
    this.redesenhar();
    this.processarFilaOnline();
  },

  /** Aplica a próxima ação da fila, se a mesa estiver esperando e a ação for da mão atual. */
  processarFilaOnline() {
    if (!this.online || !this.aguardandoRede || !this.mao || this.encerrada) return;
    while (this.filaOnline.length) {
      const acao = this.filaOnline[0];
      if (acao.tipo === 'substituir') { this.filaOnline.shift(); this.aplicarSubstituicao(acao); continue; }
      if (acao.mao !== this.chaveDaMao()) {
        /* ação de mão antiga (não deveria acontecer) sai; de mão futura espera este aparelho chegar lá */
        const [p, m] = acao.mao.split(':').map(Number), [pa, ma] = this.chaveDaMao().split(':').map(Number);
        if (p < pa || (p === pa && m < ma)) { this.filaOnline.shift(); continue; }
        return;
      }
      this.filaOnline.shift();
      this.aguardandoRede = false;
      if (acao.tipo === 'jogada') this.executarJogada(acao.jogada, true);
      else if (acao.tipo === 'truco') this.anunciarTruco(acao.cadeira, true);
      else if (acao.tipo === 'resposta') this.aplicarResposta(acao.cadeira, acao.resposta, true);
      return;
    }
  },

  /** Alguém caiu: a cadeira passa para um oponente do computador nesta mão e nas próximas. */
  aplicarSubstituicao(acao) {
    const jogador = this.mao.jogadores[acao.cadeira];
    if (jogador && jogador.tipo === 'humano') {
      Object.assign(jogador, { tipo: 'oponente', oponente: this.opcoes.oponente, nome: (acao.nome || jogador.nome) + ' (computador)' });
      mostrarAviso('Sala ' + this.online.sala.config.codigo, (acao.nome || 'Um jogador') + ' saiu; o computador joga no lugar.', null, 5000);
    }
    /* se a mesa estava parada esperando justamente essa cadeira (a vez, a carta de início ou a
       resposta ao truco), o anfitrião assume agora; nos outros casos o fluxo normal chega lá */
    this.redesenhar();
    const mao = this.mao, pedido = this.partida.pedido;
    const esperavaEla = mao.fase === 'inicio' || (pedido ? 1 - pedido.por === acao.cadeira : mao.vez === acao.cadeira);
    if (this.souAnfitriaoOnline() && this.aguardandoRede && mao.fase !== 'fim' && esperavaEla) {
      this.aguardandoRede = false;
      this.time.delayedCall(50, () => (this.partida.pedido ? this.pedirResposta() : this.avancar()));
    }
  },

  /**
   * Escolha de quem começa, online: o anfitrião manda a carta dos oponentes do computador (uma
   * vez por mão); este aparelho escolhe a própria carta; os outros escolhem nas telas deles.
   * Quando todos escolheram, as cartas aparecem juntas, como na partida local.
   */
  avancarNoInicioOnline() {
    const mao = this.mao, eu = this.cadeiraOnline();
    this.quemVe = eu;
    if (this.souAnfitriaoOnline()) {
      /* uma vez por cadeira e por mão; inclui quem caiu antes de escolher e virou computador */
      mao.jogadores.forEach((jogador, j) => {
        if (jogador.tipo !== 'oponente' || jogador.cartaInicial || this.inicioDosBotsEnviado.has(j)) return;
        this.inicioDosBotsEnviado.add(j);
        this.online.sala.enviar({ tipo: 'jogada', cadeira: j, jogada: escolherJogada(mao, j), mao: this.chaveDaMao() });
      });
    }
    if (mao.jogadores[eu].tipo === 'humano' && !mao.jogadores[eu].cartaInicial && this.modo !== 'inicio') {
      this.modo = 'inicio'; this.ocupada = false; this.redesenhar();
    }
    this.esperarRede();
  },

  /**
   * Vez de alguém que não é este aparelho: o anfitrião joga pelos oponentes do computador; nos
   * outros casos, a mesa espera a ação chegar pela sala.
   * @returns {boolean} true se a vez foi tratada aqui.
   */
  avancarOnline() {
    const mao = this.mao, vez = mao.vez, jogador = mao.jogadores[vez];
    this.quemVe = this.cadeiraOnline();
    if (jogador.tipo === 'oponente') {
      if (this.souAnfitriaoOnline()) this.vezDoOponente();
      else { this.ocupada = true; this.esperarRede(); }
      return true;
    }
    if (vez !== this.cadeiraOnline()) { this.ocupada = true; this.esperarRede(); return true; }
    return false;
  },
};
