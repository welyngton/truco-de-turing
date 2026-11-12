/**
 * @file Sala de jogo online: quem está na mesa, em que cadeira, e a ordem das ações.
 *
 * Modelo: **passo a passo com anfitrião** (lockstep). Todos os aparelhos criam a mesma mão com a
 * mesma semente e aplicam as mesmas ações na mesma ordem, então o estado é idêntico em todas as
 * telas sem precisar enviar o estado inteiro. Quem cria a sala é o anfitrião: ele numera as ações
 * (`seq`) e as repassa a todos, inclusive a quem pediu. Cada aparelho aplica a ação de número `n`
 * só depois da `n - 1`. Uma ação inválida é rejeitada igualmente em todas as telas, porque todas
 * têm o mesmo estado.
 *
 * O anfitrião também joga pelos oponentes do computador. Se uma pessoa some (sem sinal de vida
 * por `TEMPO_SEM_SINAL`), o anfitrião passa a cadeira dela para um oponente do computador. Se o
 * anfitrião some, a pessoa na menor cadeira assume (todos fazem a mesma conta) e continua a
 * numeração de onde parou.
 *
 * A sala não sabe nada de Phaser nem de rede: recebe um `transporte` com `enviar(msg)`,
 * `aoReceber(cb)` e `fechar()` (ver transportes.js) e avisa a interface por callbacks.
 */

/** Intervalo do sinal de vida, em ms. */
export const BATIMENTO = 3000;
/** Sem sinal de vida por este tempo, a pessoa é considerada desconectada. */
export const TEMPO_SEM_SINAL = 12000;

/** Código de sala: 5 letras sem as que se confundem (I, O, 0, 1). */
export function codigoDeSala(sortear = Math.random) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => letras[Math.floor(sortear() * letras.length)]).join('');
}

/** Identificador deste aparelho na sala. */
export function idDeCliente(sortear = Math.random) {
  return 'c' + Math.floor(sortear() * 1e9).toString(36) + Date.now().toString(36);
}

export class Sala {
  /**
   * @param {object} transporte `{ enviar(msg), aoReceber(cb), fechar() }`.
   * @param {object} eu `{ cliente, nome, avatar }`.
   * @param {object} [relogio] `{ agora(), intervalo(fn, ms), parar(id) }` (os testes trocam por um relógio falso).
   */
  constructor(transporte, eu, relogio = RELOGIO_REAL) {
    this.transporte = transporte;
    this.eu = eu;
    this.relogio = relogio;
    this.config = null;          /* { codigo, opcoes, semente, cadeiras: [{ tipo, cliente?, nome, avatar? }], iniciada } */
    this.anfitriao = null;       /* cliente do anfitrião */
    this.seq = 0;                /* última ação numerada (anfitrião) */
    this.entregue = 0;           /* última ação entregue à interface */
    this.pendentes = new Map();  /* seq → ação, à espera das anteriores */
    this.historico = [];         /* todas as ações numeradas, para quem chega atrasado */
    this.vistos = new Map();     /* cliente → último sinal de vida */
    this.ouvintes = { sala: [], acao: [], aviso: [] };
    this.desligar = transporte.aoReceber((msg) => this.receber(msg));
    this.batimento = relogio.intervalo(() => this.pulsar(), BATIMENTO);
  }

  /** Inscreve um ouvinte: 'sala' (config mudou), 'acao' (ação numerada) ou 'aviso' (texto). */
  on(evento, cb) { this.ouvintes[evento].push(cb); return this; }
  /** Cancela a inscrição de um ouvinte. */
  off(evento, cb) { this.ouvintes[evento] = this.ouvintes[evento].filter((x) => x !== cb); return this; }
  emitir(evento, valor) { for (const cb of this.ouvintes[evento]) cb(valor); }

  get souAnfitriao() { return this.anfitriao === this.eu.cliente; }

  /** Cadeira deste aparelho (-1 se ainda não sentou). */
  get minhaCadeira() { return this.config ? this.config.cadeiras.findIndex((c) => c.cliente === this.eu.cliente) : -1; }

  /* ------------------------------------------------------------------ anfitrião */

  /**
   * Cria a sala com as opções do menu. As cadeiras começam com o anfitrião na 0, vagas para
   * `pessoas - 1` pessoas e oponentes do computador no resto.
   */
  criar(codigo, opcoes, pessoas, semente) {
    const total = opcoes.jogadores;
    const cadeiras = Array.from({ length: total }, (_, j) => {
      if (j === 0) return { tipo: 'humano', cliente: this.eu.cliente, nome: this.eu.nome, avatar: this.eu.avatar };
      if (j < pessoas) return { tipo: 'vaga', nome: 'Vaga ' + (j + 1) };
      return { tipo: 'oponente', nome: '' };
    });
    this.anfitriao = this.eu.cliente;
    this.config = { codigo, opcoes, semente, cadeiras, iniciada: false };
    this.vistos.set(this.eu.cliente, this.relogio.agora());
    this.anunciarSala();
    return this.config;
  }

  /** Repassa a configuração a todos. */
  anunciarSala() {
    this.transporte.enviar({ tipo: 'sala', de: this.eu.cliente, config: this.config, seq: this.seq });
    this.emitir('sala', this.config);
  }

  /** O anfitrião começa a partida: vagas não ocupadas viram oponentes do computador. */
  comecar() {
    if (!this.souAnfitriao || this.config.iniciada) return;
    for (const c of this.config.cadeiras) if (c.tipo === 'vaga') { c.tipo = 'oponente'; c.nome = ''; }
    this.config.iniciada = true;
    this.anunciarSala();
  }

  /** Numera uma ação e a repassa a todos (só o anfitrião). */
  ordenar(acao) {
    const evento = { tipo: 'acao', de: this.eu.cliente, seq: ++this.seq, acao };
    this.historico.push(evento);
    this.transporte.enviar(evento);
    this.aceitar(evento);
  }

  /* ------------------------------------------------------------------ convidado */

  /** Pede para entrar numa sala já criada. */
  entrar() {
    this.transporte.enviar({ tipo: 'ola', de: this.eu.cliente, nome: this.eu.nome, avatar: this.eu.avatar });
  }

  /** Envia uma ação para ser numerada (direto, se for o anfitrião). */
  enviar(acao) {
    if (this.souAnfitriao) this.ordenar(acao);
    else this.transporte.enviar({ tipo: 'pedido', de: this.eu.cliente, acao });
  }

  /** Sai da sala avisando os outros. */
  sair() {
    this.transporte.enviar({ tipo: 'tchau', de: this.eu.cliente });
    this.relogio.parar(this.batimento);
    if (this.desligar) this.desligar();
    this.transporte.fechar();
  }

  /* ------------------------------------------------------------------ mensagens */

  receber(msg) {
    if (!msg || msg.de === this.eu.cliente) return;
    this.vistos.set(msg.de, this.relogio.agora());
    const metodo = this['ao_' + msg.tipo];
    if (metodo) metodo.call(this, msg);
  }

  /** Alguém quer entrar: o anfitrião dá uma vaga (ou devolve a cadeira de quem voltou). */
  ao_ola(msg) {
    if (!this.souAnfitriao) return;
    const c = this.config.cadeiras;
    let j = c.findIndex((x) => x.cliente === msg.de);
    if (j < 0 && !this.config.iniciada) j = c.findIndex((x) => x.tipo === 'vaga');
    if (j >= 0) {
      Object.assign(c[j], { tipo: 'humano', cliente: msg.de, nome: msg.nome || 'Jogador ' + (j + 1), avatar: msg.avatar });
      this.emitir('aviso', c[j].nome + ' entrou na sala.');
    }
    this.anunciarSala();
    /* quem volta no meio da partida recebe as ações que perdeu */
    for (const evento of this.historico) this.transporte.enviar({ ...evento, para: msg.de });
  }

  ao_sala(msg) {
    if (this.souAnfitriao && msg.de !== this.anfitriao) return;
    this.anfitriao = msg.de;
    this.config = msg.config;
    this.seq = Math.max(this.seq, msg.seq || 0);
    this.emitir('sala', this.config);
  }

  ao_pedido(msg) {
    if (!this.souAnfitriao) return;
    /* só aceita ações de quem está sentado e em nome da própria cadeira */
    const cadeira = this.config.cadeiras.findIndex((c) => c.cliente === msg.de);
    if (cadeira < 0 || (msg.acao && msg.acao.cadeira !== cadeira)) return;
    this.ordenar(msg.acao);
  }

  ao_acao(msg) {
    if (msg.para && msg.para !== this.eu.cliente) return;
    this.seq = Math.max(this.seq, msg.seq);
    if (!this.historico.some((e) => e.seq === msg.seq)) this.historico.push(msg);
    this.aceitar(msg);
  }

  ao_vivo() { /* só atualiza `vistos` (em receber) */ }

  ao_tchau(msg) {
    this.vistos.set(msg.de, -Infinity);
    this.verificarAusentes();
  }

  /** Entrega as ações em ordem: a de número n só sai depois da n - 1. */
  aceitar(evento) {
    if (evento.seq <= this.entregue) return;
    this.pendentes.set(evento.seq, evento.acao);
    while (this.pendentes.has(this.entregue + 1)) {
      const acao = this.pendentes.get(this.entregue + 1);
      this.pendentes.delete(++this.entregue);
      if (acao.tipo === 'substituir') this.substituir(acao.cadeira);
      this.emitir('acao', { seq: this.entregue, ...acao });
    }
  }

  /* ------------------------------------------------------------------ presença */

  pulsar() {
    this.transporte.enviar({ tipo: 'vivo', de: this.eu.cliente });
    this.vistos.set(this.eu.cliente, this.relogio.agora());
    this.verificarAusentes();
  }

  /** Está sem sinal de vida há mais de TEMPO_SEM_SINAL? */
  ausente(cliente) {
    if (cliente === this.eu.cliente) return false;
    const visto = this.vistos.has(cliente) ? this.vistos.get(cliente) : -Infinity;
    return this.relogio.agora() - visto > TEMPO_SEM_SINAL;
  }

  /**
   * O anfitrião troca quem sumiu por um oponente do computador (uma ação numerada, para todos
   * trocarem no mesmo ponto da partida). Se quem sumiu foi o anfitrião, a menor cadeira humana
   * presente assume.
   */
  verificarAusentes() {
    if (!this.config || !this.config.iniciada) return;
    const humanos = this.config.cadeiras.map((c, j) => ({ ...c, j })).filter((c) => c.tipo === 'humano');
    if (!this.souAnfitriao && this.ausente(this.anfitriao)) {
      const novo = humanos.find((c) => !this.ausente(c.cliente));
      if (novo && novo.cliente === this.eu.cliente) {
        this.emitir('aviso', 'O anfitrião saiu; este aparelho assumiu a sala.');
        this.anfitriao = this.eu.cliente;
        this.seq = Math.max(this.seq, this.entregue);
        this.anunciarSala();
      }
    }
    if (!this.souAnfitriao) return;
    for (const c of humanos) {
      if (c.cliente && this.ausente(c.cliente)) this.ordenar({ tipo: 'substituir', cadeira: c.j, nome: c.nome });
    }
  }

  /** Aplica a troca de uma cadeira por um oponente do computador (chamado por todos ao receber a ação). */
  substituir(cadeira) {
    const c = this.config.cadeiras[cadeira];
    if (c && c.tipo === 'humano') { c.tipo = 'oponente'; c.saiu = c.nome; delete c.cliente; }
  }
}

/** Relógio de verdade. */
const RELOGIO_REAL = {
  agora: () => Date.now(),
  intervalo: (fn, ms) => setInterval(fn, ms),
  parar: (id) => clearInterval(id),
};
