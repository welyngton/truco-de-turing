/**
 * @file Parte da CenaMesa: o tutorial. Uma mão de treino com cartas combinadas de antemão
 * (nucleo/tutorial.js), um assistente (Percy) que fala em balões ao lado da mesa e um roteiro
 * (conteudo/tutorial.js) que só deixa o jogador fazer a jogada destacada em cada passo.
 *
 * Como se encaixa no fluxo da mesa (turnos.js):
 * - `this.tutorial = { i }` guarda em que passo do roteiro a mão está; sem tutorial, é null;
 * - `avancar()` chama `tutorialNaVez()` antes de tudo: um passo só de fala prende o fluxo até o
 *   jogador tocar em "Continuar"; um passo de jogada só mostra o balão;
 * - `executarJogada()` só aceita a jogada do passo (`tutorialPermite`) e depois anda o roteiro;
 * - a vez do rival espera o "Continuar" do passo e então joga a jogada combinada;
 * - o fim da mão e as conquistas, estatísticas e placar da partida ficam de fora.
 */
import { ASSISTENTE, ROTEIRO } from '../../conteudo/tutorial.js';
import { jogadaDoPasso, jogadaCombina } from '../../nucleo/tutorial.js';
import { rostoDoAssistente } from '../../arte/assistente.js';
import { confirmar } from '../../interface/paineis.js';
import { Som } from '../../interface/som.js';
import { registrarEvento, EVENTOS } from '../../interface/analise.js';
import { TAMANHO_CARTA } from '../../configuracao.js';
import { colunaX, linhaY, cartaDaMesa } from './layout.js';

/** Botão da barra de ações de cada jogada de empilhar (a chave de `painel.acoes`). */
const BOTAO_DO_EMPILHAR = { tunagem: 'tunagem', overfit: 'overfit', earlystop: 'earlystop', stackoverflow: 'stackoverflow' };

export const metodosDoTutorial = {
  /** O passo do roteiro em que a mão está, ou null (sem tutorial ou roteiro acabado). */
  passoDoTutorial() { return this.tutorial ? ROTEIRO[this.tutorial.i] || null : null; },

  /** O passo atual espera uma jogada do jogador? */
  tutorialEsperaOJogador() {
    const passo = this.passoDoTutorial();
    return !!(passo && passo.jogada && passo.jogador === 0);
  },

  /** A jogada é a que o passo atual espera? (Vale para o jogador e para o rival.) */
  tutorialPermite(jogada) {
    return jogadaCombina(this.mao, this.passoDoTutorial(), jogada);
  },

  /**
   * Primeira coisa de `avancar()` no tutorial: mostra o balão do passo atual. Devolve true quando o
   * passo é só uma fala, e então o fluxo espera o "Continuar".
   */
  tutorialNaVez() {
    const passo = this.passoDoTutorial();
    this.mostrarBalao(passo);
    if (!passo || passo.jogada) return false;
    this.ocupada = true;
    this.redesenhar();
    return true;
  },

  /** "Continuar" numa fala: anda o roteiro e retoma o fluxo. */
  continuarTutorial() {
    const passo = this.passoDoTutorial();
    if (!passo || this.encerrada) return;
    if (passo.jogada) {
      /* a jogada do rival só acontece quando o jogador manda (o balão do passo tem o botão) */
      if (passo.jogador === 1 && this.mao.vez === 1 && !this.ocupadaPeloRival) this.jogarPeloRival(passo);
      return;
    }
    this.tutorial.i++;
    this.avancar();
  },

  /** O rival faz a jogada combinada do passo. */
  jogarPeloRival(passo) {
    this.ocupadaPeloRival = true;
    this.esconderBotaoContinuar();
    this.executarJogada(jogadaDoPasso(this.mao, passo));
  },

  /** Vez do rival no tutorial: não pensa nem sorteia, espera o "Continuar" do balão. */
  vezDoRivalNoTutorial() {
    this.ocupada = true;
    this.ocupadaPeloRival = false;
    this.notaDoOponente = null;
    this.redesenhar();
  },

  /** Depois de uma jogada aceita: anda o roteiro. */
  andarNoRoteiro() {
    if (!this.tutorial) return;
    this.tutorial.i++;
    this.ocupadaPeloRival = false;
    registrarEvento(EVENTOS.tutorial, { etapa: 'passo', passo: this.tutorial.i });
  },

  /** O jogador tentou outra jogada: o balão treme e o quadro de instruções lembra a jogada do passo. */
  avisarTutorial() {
    const balao = this.balaoDoTutorial;
    if (balao) {
      balao.classList.remove('aviso-do-passo');
      void balao.offsetWidth;
      balao.classList.add('aviso-do-passo');
    }
    Som.erro && Som.erro();
    this.mostrarDica('Tutorial: faça só a jogada destacada. Siga a fala do ' + ASSISTENTE.nome + '.');
  },

  /**
   * Botão da barra liberado no passo atual? Dropout e Passar nos seus passos, e a ação de empilhar
   * do passo (tunagem, overfit, early stop). Se não, avisa e devolve false.
   */
  tutorialLibera(chave) {
    const passo = this.passoDoTutorial(), s = passo && passo.jogada;
    const libera = !!s && passo.jogador === 0 && (
      (chave === 'dropout' && s.tipo === 'dropout') || (chave === 'passar' && s.tipo === 'passar') ||
      (BOTAO_DO_EMPILHAR[chave] && s.tipo === 'empilhar' && s.acao === chave));
    if (!libera) this.avisarTutorial();
    return libera;
  },

  /** Carta da mão liberada no passo atual (valor certo, ou a revelação de início)? Se não, avisa. */
  tutorialLiberaCarta(idCarta) {
    const passo = this.passoDoTutorial(), s = passo && passo.jogada;
    const carta = this.mao.jogadores[0].mao.find((c) => c.id === idCarta);
    const libera = !!s && passo.jogador === 0 && !!s.valor && !!carta && carta.valor === s.valor;
    if (!libera) this.avisarTutorial();
    return libera;
  },

  /** Deixa só o neurônio do passo como alvo clicável (os outros alvos ficam apagados). */
  filtrarAlvosDoTutorial() {
    const passo = this.passoDoTutorial(), s = passo && passo.jogada;
    if (!s || passo.jogador !== 0 || this.modo === 'dropout' || this.modo === 'pagarDropout') return;
    for (const id of Object.keys(this.alvos)) if (id !== s.neuronio) delete this.alvos[id];
  },

  /* ------------------------------------------------------------------ balão */

  /** Mostra (ou troca) o balão do passo; sem passo, fecha. */
  mostrarBalao(passo) {
    if (!passo) { this.fecharBalao(); return; }
    const total = ROTEIRO.length, i = this.tutorial.i;
    const rival = !!passo.jogada && passo.jogador === 1, fala = !passo.jogada;
    if (!this.balaoDoTutorial) {
      this.balaoDoTutorial = document.createElement('div');
      this.balaoDoTutorial.className = 'tutorial-balao';
      this.balaoDoTutorial.setAttribute('role', 'dialog');
      this.balaoDoTutorial.setAttribute('aria-label', 'Tutorial, com ' + ASSISTENTE.nome);
      document.body.appendChild(this.balaoDoTutorial);
    }
    this.balaoDoTutorial.dataset.passo = String(i);
    this.balaoDoTutorial.innerHTML = rostoDoAssistente() +
      '<div><p class="tutorial-nome">' + ASSISTENTE.nome.toUpperCase() + '</p><p class="tutorial-fala">' + passo.fala + '</p></div>' +
      '<div class="tutorial-rodape"><span class="tutorial-passo">Passo ' + (i + 1) + ' de ' + total + '</span><span class="tutorial-botoes">' +
      '<button class="botao discreto" data-sair>Sair</button>' +
      (fala || rival ? '<button class="botao vinho" data-continuar>Continuar</button>' : '') + '</span></div>';
    this.balaoDoTutorial.querySelector('[data-sair]').addEventListener('click', () => this.sairDoTutorial());
    const continuar = this.balaoDoTutorial.querySelector('[data-continuar]');
    if (continuar) {
      continuar.addEventListener('click', () => { Som.selecionar(); this.continuarTutorial(); });
      if (!this.ocupadaPeloRival || !rival) continuar.focus({ preventScroll: true });
    }
  },

  /** Some com o botão "Continuar" (a jogada do rival já foi mandada). */
  esconderBotaoContinuar() {
    const b = this.balaoDoTutorial && this.balaoDoTutorial.querySelector('[data-continuar]');
    if (b) b.remove();
  },

  /** Tira o balão da tela. */
  fecharBalao() {
    if (this.balaoDoTutorial) { this.balaoDoTutorial.remove(); this.balaoDoTutorial = null; }
  },

  /* ------------------------------------------------------------------ início e fim */

  /** Prepara o tutorial na criação da cena (mesa de treino, balão e marcação de que o treino foi visto). */
  prepararTutorial() {
    this.tutorial = { i: 0 };
    /* camada própria, por cima das cartas da mão, para os contornos dourados do passo */
    this.camadaTutorial = this.add.graphics().setDepth(40);
    const p = this.app.progresso;
    p.treinoVisto = true;
    p.tutorialVisto = true; /* a tela de regras da primeira partida não precisa abrir depois do treino */
    this.app.salvar();
    registrarEvento(EVENTOS.tutorial, { etapa: 'iniciado' });
    this.events.once('shutdown', () => this.fecharBalao());
  },

  /** Botão "Sair" do balão (e "Sair da partida" do menu da mesa): confirma e volta ao menu. */
  sairDoTutorial() {
    confirmar('Sair do tutorial?', 'Você pode refazê-lo quando quiser, em Como jogar > Fazer o tutorial.', [
      { rotulo: 'Continuar o tutorial', classe: 'discreto' },
      { rotulo: 'Sair', classe: 'vinho', acao: () => {
        registrarEvento(EVENTOS.tutorial, { etapa: 'abandonado', passo: this.tutorial ? this.tutorial.i : -1 });
        this.fecharBalao();
        this.app.irParaMenu();
      } },
    ]);
  },

  /** O roteiro acabou: marca o treino como feito e oferece jogar de verdade. */
  terminarTutorial() {
    this.encerrada = true;
    this.ocupada = true;
    this.fecharBalao();
    this.app.progresso.treinoFeito = true;
    this.app.salvar();
    registrarEvento(EVENTOS.tutorial, { etapa: 'concluido' });
    Som.medalha();
    confirmar('Treino concluído!', 'Você jogou todas as ações: avançar, dropout, overfit, tunagem, early stop e passar. Que tal uma partida de verdade?', [
      { rotulo: 'Voltar ao menu', classe: 'discreto', acao: () => this.app.irParaMenu() },
      { rotulo: 'Jogar agora', classe: 'vinho', acao: () => this.app.jogar() },
    ]);
  },

  /* ------------------------------------------------------------------ destaques */

  /**
   * Contorno dourado pulsante no que o passo pede: as cartas da mão (ou a revelação de início), o
   * neurônio e o botão da ação, na ordem em que o jogador usa.
   */
  desenharDestaqueDoTutorial(tempo) {
    const d = this.camadaTutorial;
    d.clear();
    const passo = this.passoDoTutorial(), s = passo && passo.jogada;
    if (!s || passo.jogador !== 0 || this.encerrada || !this.mao || this.mao.fase === 'fim') return;
    if (!(this.ehVezDoHumano() || this.modo === 'inicio')) return;
    const pulso = 0.6 + 0.4 * Math.sin(tempo / 160);
    const anel = (x, y, l, a, largura = 4) => { d.lineStyle(largura, 0xffe27a, pulso); d.strokeRoundedRect(x - l / 2, y - a / 2, l, a, 10); };
    if (s.neuronio) {
      const n = this.mao.neuronios[s.neuronio], { ml, ma } = cartaDaMesa();
      anel(colunaX(n.camada), linhaY(n.camada, n.posicao), ml * 2 + 16, ma * 2 + 16);
    }
    const mao = this.mao.jogadores[0].mao;
    const precisaDeCartas = !!s.valor;
    const escolhidas = this.selecao.filter((id) => (mao.find((c) => c.id === id) || {}).valor === s.valor).length;
    const faltam = precisaDeCartas ? (s.n || 1) - escolhidas : 0;
    if (precisaDeCartas && faltam > 0) {
      for (const imagem of this.cartasDaMao) {
        const carta = mao.find((c) => c.id === imagem.idCarta);
        if (carta && carta.valor === s.valor && !this.selecao.includes(carta.id)) anel(imagem.x, imagem.y, TAMANHO_CARTA.maoL + 10, TAMANHO_CARTA.maoA + 10);
      }
      return;
    }
    const botao = s.tipo === 'empilhar' ? this.painel.acoes[BOTAO_DO_EMPILHAR[s.acao]] : s.tipo === 'dropout' ? this.painel.botaoDropout : s.tipo === 'passar' ? this.painel.botaoPassar : null;
    if (botao) anel(botao.x, botao.y, botao.width + 14, botao.height + 14);
  },
};
