/**
 * @file Tela de regras, com o conteúdo do manual do NeuroDeck e as decisões da fusão, em abas:
 * Como jogar, Ações, Pontuação, Baralhos e terrenos (com a arte do Truco de Turing) e Dicas e
 * estratégias. As abas "Cartas" e "Decisões de regra" do NeuroDeck ficaram de fora a pedido do
 * professor; as decisões estão no repositório (docs e testes).
 */
import { BARALHOS } from '../../nucleo/baralhos.js';
import { TERRENOS } from '../../nucleo/terrenos.js';
import { DICAS_GERAIS } from '../../conteudo/dicasDeJogo.js';
import { VERBETES, NOME_DA_BIBLIOTECA } from '../../conteudo/grimorio.js';
import { desenharVerso } from '../../arte/versos.js';
import { desenharCartaCompleta } from '../../arte/cartas.js';
import { desenharCartaDeTerreno } from '../../arte/cartasDeTerreno.js';
import { abrirPainel, escaparHtml } from '../paineis.js';
import { abrirAjudaDasAcoes, ACOES_DA_AJUDA } from './ajudaDasAcoes.js';
import { abrirGrimorio } from './grimorio.js';

/** Carta de amostra de cada baralho (a que melhor mostra a arte dele). */
const AMOSTRA = {
  classico: { valor: 'K', naipe: 'C' }, truco: { valor: '4', naipe: 'P' }, nobreza: { valor: 'K', naipe: 'E' }, backprop: { valor: 'Q', naipe: 'C' }, fraternidade: { valor: 'Q', naipe: 'O' },
  yinyang: { valor: 'A', naipe: 'E' }, powerbi: { valor: '7', naipe: 'C' },
};

/** Abas da tela, na ordem. */
export const ABAS_DAS_REGRAS = [
  ['jogar', 'Como jogar'], ['acoes', 'Ações'], ['pontuacao', 'Pontuação'], ['extensoes', 'Baralhos e terrenos'], ['dicas', 'Dicas e estratégias'],
];

const COMO_JOGAR =
  '<p>De 2 a 5 jogadores disputam quem constrói a rede neural de maior soma. Cada coluna da mesa é uma <b>camada</b> e cada carta virada é um <b>neurônio</b>. A sua rede liga a camada de <b>entrada</b> à de <b>saída</b> com um neurônio por camada, e cada rede tem a sua cor: a sua é <span class="selo azul">azul</span>.</p>' +
  '<h3>A mesa</h3>' +
  '<ul><li>Um baralho de 52 cartas, sem coringas (o menu deixa jogar com até 3 baralhos). Na arquitetura padrão ficam viradas 3 cartas na entrada, 5 em cada uma das 5 camadas ocultas e 4 na saída; cada jogador além do segundo acrescenta um neurônio por camada. O menu tem também as arquiteturas curta, profunda e larga.</li>' +
  '<li>Cada jogador recebe 5 cartas na mão por baralho (10 no baralho Truco, que usa 2). Elas <b>não são repostas</b>: são toda a sua munição na mão.</li>' +
  '<li>As que sobram vão para o <b>limbo</b> sem ninguém ver (ruído). Só voltam por transfer learning. Carta que vai para o <b>cemitério</b> não volta.</li>' +
  '<li>Entrada e saída são imunes: as ações com cartas só valem nas camadas ocultas.</li></ul>' +
  '<h3>Quem começa</h3>' +
  '<p>Por padrão, cada jogador revela uma carta da mão e a mais forte começa (Ás, K, Q, J, 10 … 2; no empate, o naipe: espadas, copas, paus, ouros). A carta revelada vai para o cemitério; revele uma que você não pretende usar. O menu também tem "revela e volta para a mão" e o sorteio.</p>' +
  '<h3>Sua vez</h3>' +
  '<p>O movimento normal é <b>avançar</b>: clique num neurônio virado da próxima camada da sua rede (eles ficam destacados). Ele é revelado e passa a ser seu; cada neurônio pertence a um só jogador e as redes podem se cruzar. Em vez de avançar, você pode usar cartas da mão numa ação (aba Ações).</p>' +
  '<p>Enquanto a sua rede estiver aberta você é obrigado a jogar. <b>Passar</b> só existe para quem teve a rede interrompida por early stop (do rival ou aplicado em si) e ainda tem cartas, ou para quem não tem nenhuma jogada.</p>' +
  '<h3>Fim da mão e desempates</h3>' +
  '<p>Uma rede termina quando chega à saída, quando sofre early stop ou stack overflow, ou quando não sobra neurônio livre na próxima camada. A mão acaba quando todas as redes terminam ou ninguém mais tem jogada. Vence a maior soma. No empate: menos dropouts; depois a maior soma das melhores cartas da mão; depois a carta mais alta da mão; depois o naipe dela; por fim, quem jogou primeiro. Nunca termina empatado.</p>' +
  '<h3>Truco</h3>' +
  '<p>Entre 2 jogadores, na partida até 12 tentos, cada mão vale 1. Na sua vez, peça <b>TRUCO</b> (3). O outro aceita, corre (você leva o valor atual) ou aumenta: SEIS, NOVE, DOZE. Com alguém a um tento da vitória é <b>mão de onze</b> e ninguém truca. Com 3 ou mais jogadores o truco fica desligado e cada mão vale 1 tento.</p>';

const PONTUACAO =
  '<table class="tabela-partida"><thead><tr><th>Carta</th><th>Pontos</th></tr></thead><tbody>' +
  '<tr><td>2 a 10</td><td>o número da carta</td></tr><tr><td>Ás</td><td>11</td></tr><tr><td>J, Q e K sozinhos</td><td>0</td></tr></tbody></table>' +
  '<h3>Figuras</h3>' +
  '<p>Figuras iguais em camadas vizinhas formam uma sequência, e as cartas empilhadas por tunagem contam nela. Cada figura da sequência vale 10:</p>' +
  '<table class="tabela-partida"><tbody><tr><td>Par (K e K lado a lado)</td><td>20</td></tr><tr><td>Trio</td><td>30</td></tr><tr><td>Quadra</td><td>a rede inteira vale 0 (<b>vanishing gradient</b>)</td></tr></tbody></table>' +
  '<p>Exemplo: a rede 8-K-K-3 vale 8 + 20 + 3 = 31. Com uma tunagem num dos Reis ela tem três Reis e soma 8 + (trio de Reis 30) + 3 = <b>41</b>. Tunar os dois Reis formaria uma quadra e zeraria a rede.</p>' +
  '<h3>Tunagem</h3>' +
  '<p>Cada carta empilhada no seu neurônio soma o valor dela à rede: um 6 sobre um 6 passa a valer 12. O selo ⚡ mostra quantas cartas foram empilhadas, e o chip no canto de cada neurônio mostra quanto ele vale agora.</p>' +
  '<h3>Placar</h3>' +
  '<p>Clique no placar, à direita da mesa, para ver a soma de cada rede camada por camada, e no registro para ver todas as jogadas da mão. Baralhos e terrenos mudam a pontuação (próxima aba).</p>';

/** Linha "nome: resumo" de cada ação, com o botão da ajuda. */
function abaDeAcoes() {
  return '<p>Selecione cartas da mão e acendem só os botões das jogadas possíveis com elas; passe o cursor num botão para ler o efeito antes de confirmar. A carta usada precisa ter o mesmo valor da carta da mesa (o naipe não importa), sempre sobre o último neurônio oculto de uma rede. As cartas usadas vão para o cemitério.</p>' +
    '<table class="tabela-partida"><tbody>' +
    ACOES_DA_AJUDA.map((a) => '<tr><td><b>' + escaparHtml(a.nome) + '</b></td><td>' + escaparHtml(a.resumo) + '</td></tr>').join('') +
    '</tbody></table>' +
    '<div class="linha" style="margin-top:12px"><button class="botao" id="r-ajuda-acoes">Ajuda de cada ação</button></div>';
}

/** Baralhos e terrenos com a arte do jogo (verso, carta de amostra e carta de terreno). */
function abaDeExtensoes() {
  const baralhos = Object.entries(BARALHOS).map(([chave, b]) =>
    '<div class="extensao"><div class="extensao-arte" data-baralho="' + chave + '"></div><div><b>' + escaparHtml(b.nome) + '</b><p>' + escaparHtml(b.resumo) + '</p></div></div>').join('');
  const terrenos = Object.entries(TERRENOS).map(([chave, t]) =>
    '<div class="extensao"><div class="extensao-arte" data-terreno="' + chave + '"></div><div><b>' + escaparHtml(t.nome) + '</b><p>' + escaparHtml(t.resumo) + '</p></div></div>').join('');
  return '<h3>Baralhos</h3><div class="extensoes">' + baralhos + '</div><h3>Terrenos</h3><div class="extensoes">' + terrenos + '</div>';
}

const DICAS =
  '<ul>' +
  '<li><b>Guarde pares.</b> Duas cartas iguais na mão viram um early stop no momento certo.</li>' +
  '<li><b>Revele no início a carta mais solitária</b>, a que não tem par na mão.</li>' +
  '<li><b>Fique de olho no último neurônio de cada rival.</b> Se ele tiver o valor de uma carta sua, há um ataque possível.</li>' +
  '<li><b>Figura sozinha vale 0.</b> Se a sua rede pegou uma, pense num dropout, ou torça por outra figura igual na camada seguinte.</li>' +
  '<li><b>Não tune com duas cartas de uma vez:</b> a pilha chega a 3 e encerra a sua própria rede.</li>' +
  '<li><b>Leia o quadro de instruções</b>, à esquerda da mesa: ele diz o que você pode fazer a cada vez.</li>' +
  '</ul><h3>Estratégia e conceitos</h3><ul>' +
  DICAS_GERAIS.map((d) => {
    const v = VERBETES.find((x) => x.id === d.verbete);
    return '<li><b>' + escaparHtml(d.titulo) + '.</b> ' + escaparHtml(d.texto) +
      (v ? ' <button class="link" data-verbete="' + v.id + '">' + escaparHtml(v.titulo) + '</button>' : '') + '</li>';
  }).join('') + '</ul>' +
  '<p>Ligue o modo dicas (botão REGRAS da mesa) para receber uma dica de jogo a cada vez. Mãos jogadas com dicas não contam para as conquistas.</p>';

/** Desenha a arte de uma aba de extensões uma vez (fica guardada como imagem). */
function desenharArte(raiz) {
  raiz.querySelectorAll('.extensao-arte:not([data-pronta])').forEach((caixa) => {
    caixa.setAttribute('data-pronta', '1');
    try {
      const telas = caixa.dataset.baralho
        ? [desenharVerso('mesa', 1.2, caixa.dataset.baralho), desenharCartaCompleta(AMOSTRA[caixa.dataset.baralho] || AMOSTRA.yinyang, caixa.dataset.baralho, 0.5)]
        : [desenharCartaDeTerreno(caixa.dataset.terreno, 0.5)];
      for (const tela of telas) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = tela.toDataURL();
        caixa.appendChild(img);
      }
    } catch (e) { /* sem canvas (testes no Node): fica só o texto */ }
  });
}

/**
 * Abre a tela de regras. Na primeira partida ela abre sozinha; ao fechar, chama `aoFechar`.
 * @param {object|null} app Aplicação (marca o tutorial como visto e guarda os verbetes lidos), ou null.
 * @param {() => void} [aoFechar]
 * @param {string} [abaInicial] Uma das chaves de ABAS_DAS_REGRAS.
 */
export function abrirRegras(app, aoFechar, abaInicial = 'jogar') {
  const conteudo = { jogar: COMO_JOGAR, acoes: abaDeAcoes(), pontuacao: PONTUACAO, extensoes: abaDeExtensoes(), dicas: DICAS };
  const html = '<div class="folha regras"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
      '<h2>Regras</h2>' +
      '<nav class="abas" role="tablist">' + ABAS_DAS_REGRAS.map(([id, nome]) =>
        '<button role="tab" data-aba="' + id + '" aria-selected="' + (id === abaInicial) + '">' + nome + '</button>').join('') + '</nav>' +
      ABAS_DAS_REGRAS.map(([id]) => '<section class="aba" role="tabpanel" data-aba="' + id + '"' + (id === abaInicial ? '' : ' hidden') + '>' + conteudo[id] + '</section>').join('') +
      '<p class="nota-regras">Os conceitos de redes neurais por trás de cada jogada estão no ' + NOME_DA_BIBLIOTECA + '.</p>' +
      '<div class="linha fim" style="margin-top:14px"><button class="botao discreto" id="r-biblioteca">' + NOME_DA_BIBLIOTECA + '</button><button class="botao" data-fechar>Entendi</button></div></div>';
  if (app) { app.progresso.tutorialVisto = true; app.salvar(); }
  const painel = abrirPainel(html, { fechaAoClicarFora: true, aoFechar });
  const raiz = painel.elemento;
  const mostrarAba = (id) => {
    raiz.querySelectorAll('.abas [data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === id)));
    raiz.querySelectorAll('section.aba').forEach((s) => { s.hidden = s.dataset.aba !== id; });
    if (id === 'extensoes') desenharArte(raiz);
  };
  raiz.querySelectorAll('.abas [data-aba]').forEach((b) => b.addEventListener('click', () => mostrarAba(b.dataset.aba)));
  mostrarAba(abaInicial);
  /* o Glossário e a ajuda abrem por cima; as regras continuam abertas embaixo */
  const appDaBiblioteca = app || { progresso: { lidos: {} }, marcarVerbeteLido() {} };
  raiz.querySelector('#r-ajuda-acoes').addEventListener('click', () => abrirAjudaDasAcoes(appDaBiblioteca));
  raiz.querySelector('#r-biblioteca').addEventListener('click', () => abrirGrimorio(appDaBiblioteca));
  raiz.querySelectorAll('[data-verbete]').forEach((b) => b.addEventListener('click', () => abrirGrimorio(appDaBiblioteca, b.dataset.verbete)));
  return painel;
}
