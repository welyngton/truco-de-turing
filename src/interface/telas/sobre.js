/**
 * @file Tela "Sobre", em duas abas (issue #134): "O jogo" (a logo, a versão, a disciplina, as regras
 * originais, as estatísticas de uso, os dados da conta, o botão para reportar bugs e sugestões e a
 * licença) e "Equipe" (o professor, com a conquista final em homenagem a ele, e os autores, um
 * cartão por pessoa, issue #135).
 */
import { TEXTO_DA_CONTA } from '../../online/contas.js';
import { abrirPainel, escaparHtml } from '../paineis.js';
import { LOGO_SVG } from '../logo.js';
import { VERSAO, DATA_DA_VERSAO } from '../../versao.js';
import { EQUIPE, PROFESSOR, AUTORES, iniciaisDe } from '../../conteudo/equipe.js';
import { desenharRetratoEmMoldura } from '../../arte/retrato.js';
import { podeMedir, consentimento, definirConsentimento, TEXTO_DAS_ESTATISTICAS } from '../analise.js';

/** Situação das estatísticas de uso neste aparelho, em texto. */
function situacaoDasEstatisticas() {
  if (!podeMedir()) return 'Nesta cópia do jogo (fora do site publicado) nada é medido.';
  const escolha = consentimento();
  return escolha === 'sim' ? 'Neste aparelho: ligadas.' : escolha === 'nao' ? 'Neste aparelho: desligadas.' : 'Neste aparelho: ainda sem escolha.';
}

/** As abas da tela, na ordem: [id, nome]. */
export const ABAS_DO_SOBRE = [['jogo', 'O jogo'], ['equipe', 'Equipe']];

/** Cartão de uma pessoa da equipe: retrato (foto em moldura ou iniciais), nome, papel e mini currículo, se houver. */
function cartaoDaPessoa(pessoa) {
  const retrato = pessoa.foto
    ? '<div class="equipe-retrato com-foto" data-pessoa="' + pessoa.id + '" role="img" aria-label="Retrato de ' + escaparHtml(pessoa.nome) + ' em moldura medieval"></div>'
    : '<div class="equipe-retrato" aria-hidden="true"><span class="equipe-iniciais">' + escaparHtml(iniciaisDe(pessoa.nome)) + '</span></div>';
  return '<li class="equipe-pessoa" data-pessoa="' + pessoa.id + '">' + retrato + '<div class="equipe-texto"><b class="equipe-nome">' + escaparHtml(pessoa.nome) + '</b>' +
    '<span class="equipe-papel">' + escaparHtml(pessoa.papel) + '</span>' +
    (pessoa.miniCV ? '<p class="equipe-minicv">' + escaparHtml(pessoa.miniCV) + '</p>' : '') + '</div></li>';
}

/** Abre a tela "Sobre". */
export function abrirSobre(abaInicial = 'jogo') {
  const abaJogo = '<p>Um jogo de cartas para navegador que ensina redes neurais jogando. Cada carta é um neurônio, cada mão é uma rede construída da entrada à saída, e cada ação com as cartas (tunagem, overfit, dropout, early stop, transfer learning) é um conceito do treino de modelos. Entre dois jogadores, o truco fica por cima de tudo: tentos, pedidos de TRUCO, SEIS, NOVE e DOZE, e blefe.</p>' +
      '<h3>A disciplina</h3>' +
      '<p>Trabalho do tema 4 da disciplina Fundamentos em Pesquisa Operacional (FPO), semestre 2026/2, no Programa de Pós-Graduação em Computação Aplicada (PPCA) da Universidade de Brasília, com o prof. Peng Yaohao. O tema pede um jogo indie para ensinar conceitos de machine learning e redes neurais, a partir de uma premissa: um jogo educativo precisa, antes de tudo, ser um jogo divertido. Se o jogo for divertido e o docente tiver competência suficiente, ele pode se tornar educativo.</p>' +
      '<h3>As regras originais</h3>' +
      '<ul>' +
      '<li>Mesa com um baralho de 52 cartas: 3 neurônios na entrada, 5 camadas ocultas de 5 neurônios e 4 na saída. Cada jogador recebe 5 cartas; as 10 restantes vão para o limbo, como ruído.</li>' +
      '<li>Os jogadores se alternam ativando neurônios para ligar a entrada à saída. Vence a rede de maior soma: 2 a 10 pelo valor, Ás 11, figuras 0, com figuras iguais vizinhas valendo 10 cada (par 20, trio 30) e quadras zerando a rede (vanishing gradient).</li>' +
      '<li>Ações com a mão: tunagem, overfit, early stop, stack overflow, dropout (o GatoNet) e transfer learning. Entrada e saída são imunes.</li>' +
      '<li>Desempates em cascata e três formas de decidir quem começa.</li>' +
      '<li>Extensões propostas: baralhos com efeitos (truco, fraternidade, yin-yang, Power Bee-Ai), terrenos (montanha, pântano, oceano), coringas e conquistas em graduações de bronze a antimatéria.</li>' +
      '<li>Inspirações citadas: TensorFlow Playground, Balatro, Magic: The Gathering e Geometry Dash.</li>' +
      '</ul>' +
      '<h3>Estatísticas de uso</h3>' +
      '<p>' + TEXTO_DAS_ESTATISTICAS + '</p>' +
      '<p class="estatisticas-situacao" id="s-estatisticas">' + situacaoDasEstatisticas() + '</p>' +
      (podeMedir() ? '<div class="linha"><button class="botao pequeno" id="s-estatisticas-sim">Ligar</button><button class="botao pequeno discreto" id="s-estatisticas-nao">Desligar</button></div>' : '') +
      '<h3>Dados da conta</h3>' +
      '<p id="s-conta">' + TEXTO_DA_CONTA + '</p>' +
      '<h3>Bugs e sugestões</h3>' +
      '<p>Encontrou um erro ou tem uma ideia? Conte pelas issues do projeto no GitHub (é preciso ter uma conta lá). Dá para ver antes o que já foi relatado.</p>' +
      '<div class="linha"><a class="botao pequeno" id="s-reportar" href="https://github.com/welyngton/truco-de-turing/issues/new" target="_blank" rel="noopener">Reportar bug ou sugestão</a>' +
      '<a class="botao pequeno discreto" id="s-issues" href="https://github.com/welyngton/truco-de-turing/issues" target="_blank" rel="noopener">Ver issues abertas</a></div>' +
      '<h3>Créditos e licença</h3>' +
      '<p>Código aberto sob a licença <a href="https://github.com/welyngton/truco-de-turing#GPL-3.0-1-ov-file" target="_blank" rel="noopener">GPL-3.0</a>, no repositório <a href="https://github.com/welyngton/truco-de-turing" target="_blank" rel="noopener">github.com/welyngton/truco-de-turing</a>. Feito com Phaser 3; toda a arte das cartas é gerada por código; fontes Cinzel e Spectral.</p>';
  const abaEquipe = '<h3>O professor</h3>' +
      '<ul class="equipe-lista equipe-professor">' + cartaoDaPessoa(PROFESSOR) + '</ul>' +
      '<p class="homenagem"><b>Convergência global</b>, a conquista final do jogo, é uma homenagem ao prof. Peng: ela vem para quem desbloqueia todas as outras. No treino de uma rede, convergir para o mínimo global é chegar ao melhor ponto da função de perda, em vez de parar num mínimo local. A medalha tem uma graduação só dela, a Singularidade, acima de Antimatéria.</p>' +
      '<h3>Autores</h3>' +
      '<ul class="equipe-lista autores">' + AUTORES.map(cartaoDaPessoa).join('') + '</ul>' +
      '<p class="contribuicoes">Contribuições são bem-vindas: o código está aberto no repositório.</p>';
  const conteudo = { jogo: abaJogo, equipe: abaEquipe };
  const html = '<div class="folha sobre"><button class="fechar-x" data-fechar aria-label="Fechar">\u00d7</button>' +
      '<div class="sobre-logo">' + LOGO_SVG + '</div>' +
      '<h2>Sobre o jogo</h2>' +
      '<p class="versao">Versão ' + VERSAO + ' \u00b7 ' + DATA_DA_VERSAO.split('-').reverse().join('/') +
      ' \u00b7 <a href="https://github.com/welyngton/truco-de-turing/blob/main/CHANGELOG.md" target="_blank" rel="noopener">histórico de versões</a></p>' +
      '<nav class="abas" role="tablist" aria-label="Seções do Sobre">' + ABAS_DO_SOBRE.map(([id, nome]) =>
        '<button role="tab" id="s-aba-' + id + '" aria-controls="s-painel-' + id + '" data-aba="' + id + '" aria-selected="' + (id === abaInicial) + '" tabindex="' + (id === abaInicial ? 0 : -1) + '">' + nome + '</button>').join('') + '</nav>' +
      '<div class="sobre-abas">' + ABAS_DO_SOBRE.map(([id]) =>
        '<section class="aba" role="tabpanel" id="s-painel-' + id + '" aria-labelledby="s-aba-' + id + '" data-aba="' + id + '"' + (id === abaInicial ? '' : ' hidden') + '>' + conteudo[id] + '</section>').join('') + '</div>' +
      '<div class="linha fim" style="margin-top:14px"><button class="botao" data-fechar>Fechar</button></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true });
  const raiz = painel.elemento;
  const abas = [...raiz.querySelectorAll('.abas [data-aba]')];
  let retratoDesenhado = false;
  /* a aba da equipe desenha as fotos em moldura na primeira vez que aparece */
  const desenharRetratos = () => {
    if (retratoDesenhado) return;
    retratoDesenhado = true;
    const densidade = Math.min(3, Math.max(2, globalThis.devicePixelRatio || 1));
    for (const pessoa of EQUIPE.filter((p) => p.foto)) {
      desenharRetratoEmMoldura(pessoa.foto, densidade, 'Prof. ' + pessoa.nome, 'Professor', (canvas) => {
        const alvo = raiz.querySelector('.equipe-retrato.com-foto[data-pessoa="' + pessoa.id + '"]');
        if (alvo) alvo.appendChild(canvas);
      });
    }
  };
  const mostrarAba = (id, foco) => {
    abas.forEach((b) => { const ativa = b.dataset.aba === id; b.setAttribute('aria-selected', String(ativa)); b.tabIndex = ativa ? 0 : -1; if (ativa && foco) b.focus(); });
    raiz.querySelectorAll('section.aba').forEach((s) => { s.hidden = s.dataset.aba !== id; });
    if (id === 'equipe') desenharRetratos();
  };
  abas.forEach((b, i) => {
    b.addEventListener('click', () => mostrarAba(b.dataset.aba));
    /* teclado: setas, Home e End movem entre as abas (e selecionam, como nas abas do WAI-ARIA) */
    b.addEventListener('keydown', (e) => {
      const destino = e.key === 'ArrowRight' ? (i + 1) % abas.length : e.key === 'ArrowLeft' ? (i + abas.length - 1) % abas.length
        : e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : -1;
      if (destino < 0) return;
      e.preventDefault();
      mostrarAba(abas[destino].dataset.aba, true);
    });
  });
  mostrarAba(abaInicial);
  for (const escolha of ['sim', 'nao']) {
    const botao = raiz.querySelector('#s-estatisticas-' + escolha);
    if (botao) botao.addEventListener('click', () => {
      definirConsentimento(escolha);
      raiz.querySelector('#s-estatisticas').textContent = situacaoDasEstatisticas();
    });
  }
  return painel;
}
