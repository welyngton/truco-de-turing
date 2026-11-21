/**
 * @file Modo guiado do tutorial (issue #137): uma partida **determinística** conduzida por um
 * roteiro, sem Phaser e sem interface. Quem desenha a mesa e o assistente (a cena da mesa e o
 * balão do Percy) só pergunta a este módulo o que vem agora, o que o jogador pode tocar e se a
 * jogada dele é a esperada.
 *
 * ## O que ele garante
 *  - a partida nasce da semente fixa do roteiro: mesa, mãos e baralho são sempre os mesmos;
 *  - a mesa **só aceita a jogada esperada** do passo atual (`aceita`, `jogar`); qualquer outra é
 *    recusada e nada muda;
 *  - a jogada do adversário também vem do roteiro (`jogarDoRival`), sem passar pelo bot
 *    (`src/motor/bot.js`);
 *  - cada passo concluído avança o roteiro e avisa quem ouve (`aoMudar`), para a interface trocar
 *    a fala e o destaque;
 *  - nada é gravado: o módulo não importa estatísticas, conquistas, analytics nem a sala online.
 *    A cena da mesa também pula esses registros enquanto o tutorial está ativo.
 *
 * ## Uso
 * ```js
 * const tutorial = criarTutorial(ROTEIRO, { textos: TEXTOS });
 * tutorial.passo;                       // passo atual
 * tutorial.jogar(jogada);               // jogada do jogador (lança erro se não for a esperada)
 * tutorial.jogarDoRival();              // jogada do passo do rival, aplicada na partida
 * tutorial.proximo();                   // passa um diálogo
 * ```
 * O formato do roteiro está em `src/conteudo/roteiroDoTutorial.js`.
 */
import { novaMao, aplicarJogada, efeitoDoEmpilhamento } from './partida.js';
import { pontuarRede } from './pontuacao.js';
import { rotuloCarta } from './cartas.js';

/** Tudo o que um passo bloqueia quando o roteiro não diz o contrário. */
const BLOQUEIOS_PADRAO = ['cartas', 'neuronios', 'acoes', 'truco', 'regras'];

/** Categoria de bloqueio de cada tipo de entrada da mesa. */
const CATEGORIA_DA_ENTRADA = { carta: 'cartas', neuronio: 'neuronios', acao: 'acoes', truco: 'truco', regras: 'regras' };

/** Rótulo `valor + naipe` de uma carta pelo id ('10C#42' vira '10C'). */
export function rotuloDoId(id) {
  return String(id).split('#')[0];
}

/** Os mesmos rótulos, em ordem, para comparar listas de cartas sem se importar com a ordem. */
function rotulosOrdenados(ids) {
  return ids.map(rotuloDoId).sort();
}

/** Cartas `a` e `b` (listas de rótulos) são as mesmas, em qualquer ordem? */
function mesmasCartas(a, b) {
  const x = rotulosOrdenados(a), y = rotulosOrdenados(b);
  return x.length === y.length && x.every((r, i) => r === y[i]);
}

/**
 * Preenche as marcas de uma fala: `{soma:0}` (soma atual da rede), `{antes:0}` (soma antes da última
 * jogada), `{rival}` (nome do adversário) e `{carta:10C}` (rótulo da carta, '10♣').
 * @param {string} texto
 * @param {{somas: number[], somasAntes: number[], nomes: string[]}} estado
 */
export function formatarTexto(texto, estado) {
  return String(texto).replace(/\{(soma|antes|rival|carta)(?::([^}]+))?\}/g, (_, marca, arg) => {
    if (marca === 'rival') return estado.nomes[1];
    if (marca === 'carta') return rotuloCarta({ valor: arg.slice(0, -1), naipe: arg.slice(-1) });
    return String(Math.round((marca === 'soma' ? estado.somas : estado.somasAntes)[Number(arg)]));
  });
}

/**
 * Cria um tutorial.
 * @param {{semente: number, config?: object, passos: object[]}} roteiro Ver `conteudo/roteiroDoTutorial.js`.
 * @param {object} [opcoes]
 * @param {string[]} [opcoes.nomes] Nomes do jogador e do rival.
 * @param {string} [opcoes.oponente] Perfil do rival (só para a interface escolher o avatar).
 * @param {Object<string, string|null>} [opcoes.textos] Fala de cada passo, pelo id.
 */
export function criarTutorial(roteiro, opcoes = {}) {
  const nomes = opcoes.nomes || ['Você', 'Rival'], textos = opcoes.textos || {};
  const passos = roteiro.passos;
  const mao = novaMao({
    ...(roteiro.config || {}), semente: roteiro.semente,
    jogadores: [{ nome: nomes[0], tipo: 'humano' }, { nome: nomes[1], tipo: 'oponente', oponente: opcoes.oponente || 'aleatorio' }],
  });
  const ouvintes = new Set();
  const somasAgora = () => mao.jogadores.map((_, j) => pontuarRede(mao, j).total);
  const tutorial = {
    mao, passos, nomes,
    /** Posição do passo atual (igual a `passos.length` quando acabou). */
    indice: 0,
    /** Soma de cada rede antes da última jogada e agora (para mostrar o que mudou). */
    somasAntes: somasAgora(), somas: somasAgora(),

    /** Passo atual, ou null quando o roteiro acabou. */
    get passo() { return passos[this.indice] || null; },
    /** O roteiro acabou? */
    get terminou() { return this.indice >= passos.length; },

    /** O passo é uma jogada (do jogador ou do rival), e não um diálogo? */
    ehJogada(passo = this.passo) { return !!(passo && passo.jogadaEsperada); },
    /** O passo é uma jogada guiada, que o jogador faz? */
    ehDoJogador(passo = this.passo) { return this.ehJogada(passo) && passo.jogador === 0; },
    /** O passo é uma jogada que o roteiro faz pelo rival? */
    ehDoRival(passo = this.passo) { return this.ehJogada(passo) && passo.jogador === 1; },
    /** O passo é só uma fala do assistente? */
    ehDialogo(passo = this.passo) { return !!passo && !passo.jogadaEsperada; },

    /** Fala do passo (com as marcas preenchidas), ou '' quando ele não tem fala. */
    texto(passo = this.passo) {
      const texto = passo && textos[passo.id];
      return texto ? formatarTexto(texto, this) : '';
    },

    /** Avisa `ouvinte(evento)` a cada passo novo (`{tipo:'passo', indice, passo}`) e no fim (`{tipo:'fim'}`). Devolve quem cancela. */
    aoMudar(ouvinte) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },

    /**
     * A jogada concreta (com os ids das cartas na mão) do passo de jogada, pronta para a partida.
     * @returns {object|null} null quando o passo é um diálogo.
     */
    jogadaDoPasso(passo = this.passo) {
      if (!this.ehJogada(passo)) return null;
      const e = passo.jogadaEsperada, j = passo.jogador;
      const ids = (rotulos) => {
        const usadas = new Set();
        return rotulos.map((rotulo) => {
          const carta = mao.jogadores[j].mao.find((c) => rotuloDoId(c.id) === rotulo && !usadas.has(c.id));
          if (!carta) throw new Error('Tutorial "' + passo.id + '": a carta ' + rotulo + ' não está na mão de ' + nomes[j]);
          usadas.add(carta.id);
          return carta.id;
        });
      };
      switch (e.tipo) {
        case 'inicio': return { tipo: 'inicio', jogador: j, carta: ids([e.carta])[0] };
        case 'ativar': return { tipo: 'ativar', jogador: j, neuronio: e.neuronio };
        case 'empilhar': return { tipo: 'empilhar', jogador: j, neuronio: e.neuronio, cartas: ids(e.cartas) };
        case 'dropout': return { tipo: 'dropout', jogador: j, n: e.n, pagamento: ids(e.pagamento) };
        case 'passar': return { tipo: 'passar', jogador: j };
        default: throw new Error('Tutorial "' + passo.id + '": jogada desconhecida ' + e.tipo);
      }
    },

    /** A jogada é a esperada no passo atual? Só vale para passos do jogador. */
    aceita(jogada) {
      const passo = this.passo;
      if (!this.ehDoJogador(passo) || !jogada || jogada.jogador !== passo.jogador) return false;
      const e = passo.jogadaEsperada;
      if (jogada.tipo !== e.tipo) return false;
      switch (e.tipo) {
        case 'inicio': return rotuloDoId(jogada.carta) === e.carta;
        case 'ativar': return jogada.neuronio === e.neuronio;
        case 'empilhar': return jogada.neuronio === e.neuronio && mesmasCartas(jogada.cartas || [], e.cartas);
        case 'dropout': return jogada.n === e.n && mesmasCartas(jogada.pagamento || [], e.pagamento);
        case 'passar': return true;
        default: return false;
      }
    },

    /**
     * Ação (botão da barra) que leva à jogada esperada: 'tunagem', 'overfit', 'earlystop',
     * 'stackoverflow', 'dropout' ou 'passar'. null quando o passo não é uma jogada do jogador
     * ou a jogada não passa por um botão.
     */
    acaoEsperada(passo = this.passo) {
      if (!this.ehDoJogador(passo)) return null;
      const e = passo.jogadaEsperada;
      if (e.tipo === 'dropout' || e.tipo === 'passar') return e.tipo;
      if (e.tipo !== 'empilhar') return null;
      const efeito = efeitoDoEmpilhamento(mao, passo.jogador, mao.neuronios[e.neuronio], e.cartas.length);
      return efeito ? efeito.tipo : null;
    },

    /**
     * Esta entrada da mesa está liberada no passo atual? A mesa pergunta antes de agir.
     * Entradas: `{tipo:'carta', id}`, `{tipo:'neuronio', id}`, `{tipo:'acao', id}` (botões da barra),
     * `{tipo:'truco'}` e `{tipo:'regras'}` (REGRAS e MENU). Entrada de uma categoria que o passo não
     * bloqueia está liberada; nas bloqueadas, só vale o que a jogada esperada pede. Limpar a seleção
     * nunca é bloqueado.
     */
    permite(entrada) {
      const passo = this.passo;
      if (!passo) return false;
      if (entrada.tipo === 'acao' && entrada.id === 'limpar') return true;
      const bloqueios = passo.bloqueios || BLOQUEIOS_PADRAO;
      if (!bloqueios.includes(CATEGORIA_DA_ENTRADA[entrada.tipo])) return true;
      if (!this.ehDoJogador(passo)) return false;
      const e = passo.jogadaEsperada;
      switch (entrada.tipo) {
        case 'carta': {
          const rotulo = rotuloDoId(entrada.id);
          return e.tipo === 'inicio' ? rotulo === e.carta : e.tipo === 'empilhar' ? e.cartas.includes(rotulo) : e.tipo === 'dropout' ? e.pagamento.includes(rotulo) : false;
        }
        case 'neuronio': return (e.tipo === 'ativar' || e.tipo === 'empilhar') && entrada.id === e.neuronio;
        case 'acao': return entrada.id === this.acaoEsperada(passo);
        default: return false;
      }
    },

    /**
     * O que o balão do passo aponta agora. Nos diálogos, é o `destaque` do passo. Nas jogadas
     * guiadas, primeiro as cartas que faltam selecionar; depois, o botão e o neurônio do alvo.
     * @param {string[]} [selecionadas] Rótulos das cartas já selecionadas na mão.
     * @returns {(string|object)[]} Itens como os do campo `destaque` do roteiro.
     */
    destaques(selecionadas = []) {
      const passo = this.passo;
      if (!passo) return [];
      if (!this.ehDoJogador(passo)) return passo.destaque || [];
      const e = passo.jogadaEsperada;
      const faltam = (rotulos) => {
        const feitas = selecionadas.map(rotuloDoId).slice();
        return rotulos.filter((r) => { const i = feitas.indexOf(r); if (i >= 0) { feitas.splice(i, 1); return false; } return true; });
      };
      switch (e.tipo) {
        case 'inicio': return [{ carta: e.carta }];
        case 'ativar': return [{ neuronio: e.neuronio }];
        case 'empilhar': { const f = faltam(e.cartas); return f.length ? f.map((carta) => ({ carta })) : [{ acao: this.acaoEsperada(passo) }, { neuronio: e.neuronio }]; }
        case 'dropout': { const f = faltam(e.pagamento); return f.length ? f.map((carta) => ({ carta })) : [{ acao: 'dropout' }]; }
        default: return [{ acao: 'passar' }];
      }
    },

    /** Avança um passo e avisa os ouvintes. */
    avancarPasso() {
      this.indice++;
      for (const ouvinte of [...ouvintes]) ouvinte(this.terminou ? { tipo: 'fim' } : { tipo: 'passo', indice: this.indice, passo: this.passo });
    },

    /** Aplica na partida uma jogada que o roteiro autoriza, guardando as somas de antes e de depois. */
    aplicar(jogada) {
      this.somasAntes = somasAgora();
      aplicarJogada(mao, jogada);
      this.somas = somasAgora();
    },

    /**
     * Jogada do jogador: só passa a esperada do passo atual; qualquer outra é recusada e nada muda.
     * Aplica na partida e avança o roteiro.
     * @returns {object} A mão, depois da jogada.
     */
    jogar(jogada) {
      if (!this.aceita(jogada)) throw new Error('Fora do roteiro: ' + (this.passo ? 'o passo "' + this.passo.id + '" não espera essa jogada' : 'o tutorial acabou'));
      this.aplicar(jogada);
      this.avancarPasso();
      return mao;
    },

    /**
     * Jogada do rival, a do passo atual do roteiro (sem passar pelo bot).
     * @returns {object} A jogada aplicada.
     */
    jogarDoRival() {
      if (!this.ehDoRival()) throw new Error('Fora do roteiro: o passo atual não é uma jogada do rival');
      const jogada = this.jogadaDoPasso();
      this.aplicar(jogada);
      this.avancarPasso();
      return jogada;
    },

    /** Passa um diálogo (botão Próximo). Devolve false se o passo atual não for um diálogo. */
    proximo() {
      if (!this.ehDialogo()) return false;
      this.avancarPasso();
      return true;
    },

    /** Roda o roteiro inteiro por código, na ordem. Serve aos testes. Devolve os ids dos passos percorridos. */
    rodarTudo() {
      const percorridos = [];
      while (!this.terminou) {
        const passo = this.passo;
        percorridos.push(passo.id);
        if (this.ehDialogo(passo)) this.proximo();
        else if (this.ehDoRival(passo)) this.jogarDoRival();
        else this.jogar(this.jogadaDoPasso(passo));
      }
      return percorridos;
    },
  };
  return tutorial;
}
