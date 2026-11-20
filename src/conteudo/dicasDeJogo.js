/**
 * @file Dicas de jogo do modo "dicas": como jogar bem e o conceito de redes neurais por trás.
 *
 * Regra de ouro: as dicas usam **só informação pública** — as cartas da mão de quem pede a dica, os
 * neurônios já revelados na mesa, as somas e o placar. Nunca apontam qual neurônio oculto ativar
 * nem dizem o que há embaixo de uma carta virada; isso seria trapaça, não dica.
 *
 * `escolherDicaDeJogo` olha a situação e devolve a dica mais útil agora (oportunidades e riscos
 * primeiro), ou uma dica geral de estratégia ligada a um verbete do Glossário. Não depende do Phaser:
 * roda também no Node (testes).
 */
import { ehFigura, PLURAL_FIGURA, NAIPE } from '../nucleo/cartas.js';
import { pontosDaCarta } from '../nucleo/baralhos.js';
import { ehOculta } from '../nucleo/rede.js';
import { fronteira, valorParaTransfer } from '../nucleo/partida.js';
import { pontuarRede } from '../nucleo/pontuacao.js';
import { podeTrucar } from '../nucleo/truco.js';

/**
 * Dicas gerais de estratégia, usadas quando nenhuma situação especial aparece. Cada uma liga uma
 * boa prática do jogo a um verbete do Glossário (`verbete`).
 */
export const DICAS_GERAIS = [
  { id: 'geral-mao', verbete: 'pesos', titulo: 'Sua mão é o seu orçamento',
    texto: 'As cartas da mão não são repostas durante a mão. Cada tunagem, ataque ou dropout gasta recursos que você não recupera; escolha onde investir.' },
  { id: 'geral-camadas', verbete: 'forward', titulo: 'Uma camada de cada vez',
    texto: 'Sua rede só cresce para a camada seguinte, como o sinal no forward pass. Pense dois passos à frente: quais cartas da mão combinam com o que pode vir?' },
  { id: 'geral-figuras', verbete: 'vanishing', titulo: 'Figuras: alto risco, alta recompensa',
    texto: 'J, Q e K valem 0 sozinhos, mas iguais e vizinhos valem 10 cada: par 20, trio 30. As empilhadas contam, e quatro zeram a rede inteira.' },
  { id: 'geral-saida', verbete: 'camadas', titulo: 'Corrida até a saída',
    texto: 'Ao chegar à camada de saída a rede fica protegida: ninguém mais ataca os seus neurônios. Às vezes vale avançar antes de tunar.' },
  { id: 'geral-curva', verbete: 'perda', titulo: 'Olhe a curva de treino',
    texto: 'O gráfico no painel mostra a soma de cada rede a cada turno. Quedas bruscas indicam ataques sofridos; um adversário que dispara merece atenção.' },
  { id: 'geral-limbo', verbete: 'ruido', titulo: 'O limbo é ruído',
    texto: 'Dez cartas ficam no limbo sem ninguém ver. Elas tornam a mesa imprevisível, como o ruído nos dados de treino: não conte com nenhuma carta específica.' },
  { id: 'geral-incerteza', verbete: 'montecarlo', titulo: 'Decida pelo valor esperado',
    texto: 'Neurônios virados podem ser bons ou ruins. Em média, uma carta do baralho clássico vale cerca de 5 pontos; compare isso com o que uma tunagem ou um ataque garantem agora.' },
  { id: 'geral-tunar-protege', verbete: 'tunagem', titulo: 'Tunar tem custo de exposição',
    texto: 'Uma tunagem deixa a pilha com 2 cartas: mais uma do mesmo valor nas mãos do adversário vira early stop na sua rede. Tune mais perto da saída.' },
];

/** Contagem de cartas da mão por valor. */
function contarValores(mao) {
  const conta = {};
  for (const c of mao) conta[c.valor] = (conta[c.valor] || 0) + 1;
  return conta;
}

/**
 * Escolhe a dica de jogo para o jogador `j` agora.
 * @param {object} mao Estado da mão (nucleo/partida.js).
 * @param {number} j Quem recebe a dica.
 * @param {object} partida Placar do truco (nucleo/truco.js).
 * @param {string[]} [recentes] Ids das dicas mostradas por último (para não repetir).
 * @returns {{id: string, titulo: string, texto: string, verbete: string}}
 */
export function escolherDicaDeJogo(mao, j, partida, recentes = []) {
  const eu = mao.jogadores[j];
  const baralho = mao.config.baralho, total = mao.camadas.length;
  const conta = contarValores(eu.mao);
  /* com mais de 2 jogadores, o rival das dicas é quem dá para atacar agora; senão, quem lidera */
  const rivais = mao.jogadores.map((_, k) => k).filter((k) => k !== j);
  const soma = (k) => pontuarRede(mao, k).total;
  const podeAtacar = (k) => { const f = fronteira(mao, k); return !!f && ehOculta(f.camada, total) && f.cartas.length < 4 && mao.jogadores[k].situacao === 'construindo' && !!conta[f.cartas[0].valor]; };
  const r = rivais.find(podeAtacar) ?? rivais.reduce((a, b) => (soma(b) > soma(a) ? b : a));
  const outro = mao.jogadores[r];
  const minha = fronteira(mao, j), dele = fronteira(mao, r);
  const somas = [soma(j), soma(r)];
  const candidatas = [];
  const dica = (id, verbete, titulo, texto) => candidatas.push({ id, verbete, titulo, texto });
  const atacavel = (n) => n && ehOculta(n.camada, total) && n.cartas.length < 4 && outro.situacao === 'construindo';

  /* 1. oportunidades de ataque na fronteira do adversário (carta revelada, cartas na sua mão) */
  if (atacavel(dele) && conta[dele.cartas[0].valor]) {
    const valor = dele.cartas[0].valor, tenho = conta[valor], pilha = dele.cartas.length;
    if (pilha + tenho >= 4) dica('ataque-overflow', 'stackoverflow', 'Stack overflow à vista',
      'O último neurônio do adversário tem ' + pilha + ' carta(s) ' + valor + ' e você tem ' + tenho + '. Completar a pilha de 4 derruba a rede dele e as cartas da mão dele.');
    else if (pilha + tenho >= 3 && somas[1] >= somas[0]) dica('ataque-earlystop', 'earlystop', 'Early stop no adversário',
      'Com ' + (3 - pilha) + ' carta(s) ' + valor + ' sobre o último neurônio dele, a rede adversária é finalizada agora e perde esse neurônio. Ótimo quando ele está na frente.');
    else if (pilha === 1 && (pontosDaCarta(dele.cartas[0], baralho) >= 7 || ehFigura(dele.cartas[0]))) dica('ataque-overfit', 'overfit', 'Overfit vale a pena',
      'O último neurônio do adversário (' + valor + ') é forte e você tem um ' + valor + '. Um overfit tira esse neurônio e faz a rede dele recuar uma camada.');
  }

  /* 2. riscos na sua própria rede */
  const reveladas = eu.caminho.map((id) => mao.neuronios[id].cartas[0]);
  const ultimas = reveladas.slice(-2);
  if (ultimas.length === 2 && ehFigura(ultimas[0]) && ultimas[0].valor === ultimas[1].valor) {
    dica('risco-vanishing', 'vanishing', 'Cuidado com a quadra de ' + PLURAL_FIGURA[ultimas[0].valor],
      'Suas duas últimas camadas são ' + ultimas[0].valor + '. Um terceiro dá trio (30), mas quatro (contando as empilhadas) zeram a rede: vanishing gradient.');
  }
  if (minha && ehOculta(minha.camada, total) && minha.cartas.length >= 2 && eu.situacao === 'construindo' && outro.mao.length) {
    dica('risco-tunado', 'earlystop', 'Seu neurônio tunado está exposto',
      'O último neurônio da sua rede tem ' + minha.cartas.length + ' cartas. Mais uma do mesmo valor, vinda do adversário, aplica early stop em você. Avançar a rede o protege.');
  }

  /* 3. tunagem na sua fronteira */
  if (minha && ehOculta(minha.camada, total) && minha.cartas.length === 1 && eu.situacao === 'construindo' && conta[minha.cartas[0].valor]) {
    const valor = minha.cartas[0].valor;
    dica('tunagem', 'tunagem', 'Hora de tunar?',
      'Você tem outro ' + valor + ' na mão, igual ao seu último neurônio. Empilhar ' + (ehFigura(minha.cartas[0]) ? 'põe mais uma figura na sequência (cada uma vale 10; quatro zeram a rede)' : 'soma ' + pontosDaCarta(minha.cartas[0], baralho) + ' pontos') +
      ', mas deixa a pilha a uma carta do early stop.');
  }

  /* 4. corrida e placar */
  if (outro.situacao === 'construindo' && outro.caminho.length >= total - 1 && somas[1] > somas[0]) {
    dica('corrida', 'camadas', 'O adversário está perto da saída',
      'Na camada de saída a rede dele fica imune. Se você tem cartas para atacá-lo, a hora é agora.');
  }
  if (partida && partida.alvo > 1 && podeTrucar(partida, j) && somas[0] - somas[1] >= 12) {
    dica('truco', 'truco', 'Você está bem à frente',
      'Sua rede soma ' + somas[0] + ' contra ' + somas[1] + '. Um truco agora pode multiplicar o que esta mão vale; segure o botão TRUCO para ver a sua chance estimada.');
  }

  /* 5. economia da mão */
  const valorTransfer = valorParaTransfer(mao, j);
  if (valorTransfer) dica('transfer', 'transfer', 'Quatro iguais na mão',
    'Você tem quatro ' + valorTransfer + '. Se eles não servem para tunar nem atacar, o transfer learning troca todos por cartas novas do limbo.');
  if (eu.mao.length > 0 && eu.mao.length <= 2 && eu.situacao === 'construindo') dica('mao-curta', 'dropout', 'Poucas cartas na mão',
    'Restam ' + eu.mao.length + ' carta(s). Guarde-as para pagar um dropout se a rede entrar num caminho ruim, ou para um ataque decisivo.');

  /* 6. terreno */
  const terreno = mao.config.terreno;
  if (terreno === 'pantano') dica('terreno-pantano', 'terrenos', 'Pântano: o tempo corrói',
    'Neurônios sem tunagem perdem 1 ponto por rodada, como o weight decay. Tunar mantém o neurônio à tona; uma mão curta perde menos.');
  if (terreno === 'montanha') dica('terreno-montanha', 'terrenos', 'Montanha: camadas fundas valem mais',
    'Cada neurônio vale 1 ponto a mais por camada alcançada. Perder um neurônio do fim da rede custa mais; proteja as camadas altas.');
  if (terreno === 'oceano' && mao.vento) dica('terreno-oceano', 'terrenos', 'Oceano: siga o vento',
    'Nesta rodada, neurônios de ' + NAIPE[mao.vento].nome + ' revelados valem o dobro para sempre. O vento muda a cada rodada, como uma distribuição de dados que se desloca (concept drift).');

  /* a primeira dica que não foi mostrada há pouco; senão, uma dica geral em rodízio */
  const nova = candidatas.find((d) => !recentes.includes(d.id));
  if (nova) return nova;
  return DICAS_GERAIS.find((d) => !recentes.includes(d.id)) || DICAS_GERAIS[0];
}
