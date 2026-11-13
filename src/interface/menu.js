/**
 * @file Menu principal: apresentação do jogo, botões das telas e configuração da mesa.
 *
 * A mesa reúne as configurações do NeuroDeck (jogadores, humanos no aparelho, oponentes do
 * computador, arquitetura da rede e número de baralhos) com as do Truco de Turing (baralho,
 * terreno, quem começa e tipo de partida).
 */
import { MUNDO } from '../configuracao.js';
import { BARALHOS } from '../nucleo/baralhos.js';
import { TERRENOS } from '../nucleo/terrenos.js';
import { OPONENTES } from '../nucleo/oponentes/index.js';
import { ARQUITETURAS, tamanhosDaMesa } from '../nucleo/rede.js';
import { normalizarOpcoes } from '../aplicacao.js';
import { desenharVerso } from '../arte/versos.js';
import { desenharMesa } from '../arte/mesas.js';
import { abrirPainel, escaparHtml } from './paineis.js';
import { Som } from './som.js';
import { abrirRegras } from './telas/regras.js';
import { abrirGrimorio } from './telas/grimorio.js';
import { abrirConquistas } from './telas/conquistas.js';
import { abrirSobre } from './telas/sobre.js';
import { abrirMods } from './telas/mods.js';
import { abrirAvatares, retratoDoAvatar } from './telas/avatares.js';
import { abrirOnline } from './telas/online.js';
import { avatarDoJogador } from '../conteudo/avatares.js';

/** Opções da lista de oponentes do computador (todos os oponentes da mesa têm o mesmo perfil). */
const ESCOLHAS_OPONENTE = {
  montecarlo: 'Mestre Monte Carlo · difícil',
  guloso: 'Gradiente Guloso · médio',
  aleatorio: 'Zé do Ruído · fácil',
};
/** Jogadores na mesa (2 a 5, como no NeuroDeck). */
const ESCOLHAS_JOGADORES = { 2: '2 jogadores', 3: '3 jogadores', 4: '4 jogadores', 5: '5 jogadores' };
/** Baralhos na partida: a mão e o limbo crescem junto. */
const ESCOLHAS_BARALHOS = { 1: '1 baralho', 2: '2 baralhos', 3: '3 baralhos' };
const ESCOLHAS_INICIO = {
  'revela-descarta': 'Revela carta da mão (vai para o cemitério)',
  'revela-volta': 'Revela carta da mão (volta para a mão)',
  sorteio: 'Par ou ímpar (sorteio)',
};
const ESCOLHAS_PARTIDA = { 12: 'Partida até 12 tentos, com truco', 1: 'Mão única, sem truco' };

/** Opções da lista "Humanos no aparelho" para uma mesa de `n` jogadores. */
function escolhasDeHumanos(n) {
  const escolhas = { 1: '1 (você)' };
  for (let h = 2; h <= n; h++) escolhas[h] = h + (h === n ? ' (sem computador)' : '') + ', revezando';
  return escolhas;
}

/** Miniaturas do verso e da mesa já desenhadas (evita redesenhar a cada troca). */
const miniaturas = {};

/** Mostra a miniatura `chave` dentro do elemento, desenhando-a na primeira vez com `desenhar()`. */
function mostrarMiniatura(elemento, chave, desenhar) {
  if (!elemento) return;
  if (!miniaturas[chave]) { try { miniaturas[chave] = desenhar().toDataURL(); } catch (e) { return; } }
  const img = elemento.querySelector('img') || elemento.appendChild(document.createElement('img'));
  img.alt = '';
  img.src = miniaturas[chave];
}

/** Gera as `<option>` de uma lista. `rotulos` mapeia valor → texto (ou objeto com `nome`). */
function opcoesHtml(rotulos, selecionado) {
  return Object.keys(rotulos).map((valor) => {
    const rotulo = typeof rotulos[valor] === 'string' ? rotulos[valor] : rotulos[valor].nome;
    return '<option value="' + valor + '"' + (valor === String(selecionado) ? ' selected' : '') + '>' + escaparHtml(rotulo) + '</option>';
  }).join('');
}

/** HTML do menu. */
function htmlDoMenu(opcoes) {
  return '<div class="menu">' +
    '<section class="menu-capa">' +
    '<h1>TRUCO DE TURING</h1>' +
    '<p>Monte uma rede neural carta por carta, da entrada à saída. Tune seus neurônios, aplique overfit no adversário, fuja do vanishing gradient e, quando sentir a mão boa, grite TRUCO.</p>' +
    '<div class="legenda"><span><i class="ponto" style="background:var(--azul)"></i><b>Azul</b> é a sua rede</span><span><i class="ponto" style="background:var(--laranja)"></i><b>Laranja</b>, verde, lilás e rosa, as dos adversários</span></div>' +
    '<div class="menu-acoes">' +
    '<div class="jogar-linha"><button class="botao vinho jogar" id="m-jogar" autofocus>Jogar</button>' +
    '<button class="botao jogar-online" id="m-online">Jogar online</button></div>' +
    '<div class="menu-mais">' +
    '<button class="botao" id="m-regras">Como jogar</button>' +
    '<button class="botao" id="m-grimorio">Glossário</button>' +
    '<button class="botao" id="m-conquistas">Conquistas</button>' +
    '<button class="botao botao-avatar" id="m-avatar"><img alt="" id="m-avatar-img">Avatar</button>' +
    '<button class="botao" id="m-mods">Mods</button>' +
    '<button class="botao" id="m-sobre">Sobre</button>' +
    '</div></div>' +
    '<div class="creditos">Regras originais: prof. Peng Yaohao (FPO 2026/2, PPCA/UnB). Regras do NeuroDeck com a interface do Truco de Turing. Feito com Phaser. Código aberto sob a licença <a href="https://github.com/welyngton/truco-de-turing#GPL-3.0-1-ov-file" target="_blank" rel="noopener">GPL-3.0</a>.</div>' +
    '</section>' +
    '<section class="folha menu-painel">' +
    '<h3 style="margin-top:0">Configurar a mesa</h3>' +
    '<div class="campos-duplos">' +
    '<div class="campo"><label for="m-jogadores">Jogadores</label><select id="m-jogadores">' + opcoesHtml(ESCOLHAS_JOGADORES, opcoes.jogadores) + '</select></div>' +
    '<div class="campo"><label for="m-humanos">Humanos no aparelho</label><select id="m-humanos">' + opcoesHtml(escolhasDeHumanos(opcoes.jogadores), opcoes.humanos) + '</select></div>' +
    '</div>' +
    '<div class="campo" id="m-campo-oponente"><label for="m-oponente" id="m-oponente-rotulo">Oponente</label><select id="m-oponente">' + opcoesHtml(ESCOLHAS_OPONENTE, opcoes.oponente) + '</select><div class="dica" id="m-oponente-dica"></div></div>' +
    '<div class="campos-duplos">' +
    '<div class="campo"><label for="m-arquitetura">Arquitetura</label><select id="m-arquitetura">' + opcoesHtml(ARQUITETURAS, opcoes.arquitetura) + '</select></div>' +
    '<div class="campo"><label for="m-baralhos">Baralhos</label><select id="m-baralhos">' + opcoesHtml(ESCOLHAS_BARALHOS, opcoes.baralhos) + '</select></div>' +
    '</div>' +
    '<div class="dica dica-da-mesa" id="m-mesa-dica"></div>' +
    '<div class="campo"><label for="m-baralho">Baralho</label><div class="campo-linha"><select id="m-baralho">' + opcoesHtml(BARALHOS, opcoes.baralho) + '</select><span class="miniatura verso" id="m-baralho-img"></span></div><div class="dica" id="m-baralho-dica"></div></div>' +
    '<div class="campo"><label for="m-terreno">Terreno</label><div class="campo-linha"><select id="m-terreno">' + opcoesHtml(TERRENOS, opcoes.terreno) + '</select><span class="miniatura mesa" id="m-terreno-img"></span></div><div class="dica" id="m-terreno-dica"></div></div>' +
    '<div class="campos-duplos">' +
    '<div class="campo" style="margin-bottom:0"><label for="m-inicio">Quem começa</label><select id="m-inicio">' + opcoesHtml(ESCOLHAS_INICIO, opcoes.inicio) + '</select></div>' +
    '<div class="campo" style="margin-bottom:0"><label for="m-partida">Partida</label><select id="m-partida">' + opcoesHtml(ESCOLHAS_PARTIDA, opcoes.alvo) + '</select></div>' +
    '</div>' +
    '</section></div>';
}

/**
 * Abre o menu principal.
 * @param {object} app A aplicação (ver aplicacao.js).
 */
export function abrirMenu(app) {
  app.opcoes = normalizarOpcoes(app.opcoes);
  const painel = abrirPainel(htmlDoMenu(app.opcoes), { transparente: true });
  const elemento = painel.elemento;
  const campo = (id) => elemento.querySelector('#' + id);

  /** Atualiza descrições, listas dependentes e miniaturas conforme as escolhas. */
  function atualizarDicas() {
    const n = Number(campo('m-jogadores').value);
    /* humanos: de 1 até o número de jogadores */
    const humanos = Math.min(n, Number(campo('m-humanos').value) || 1);
    campo('m-humanos').innerHTML = opcoesHtml(escolhasDeHumanos(n), humanos);
    const bots = n - humanos;
    campo('m-campo-oponente').hidden = bots === 0;
    campo('m-oponente-rotulo').textContent = bots > 1 ? 'Oponentes (' + bots + ', do mesmo nível)' : 'Oponente';
    const perfil = OPONENTES[campo('m-oponente').value];
    campo('m-oponente-dica').textContent = 'Nível ' + perfil.nivel.toLowerCase() + ', ' + perfil.metodo + '. ' + perfil.estilo +
      (humanos > 1 ? ' Os humanos se revezam no aparelho; a mão de quem não joga fica escondida.' : '');
    /* tamanho da mesa e da mão para as escolhas atuais */
    const camadas = tamanhosDaMesa(campo('m-arquitetura').value, n);
    const minimo = campo('m-baralho').value === 'truco' ? 2 : 1, baralhos = Math.max(minimo, Number(campo('m-baralhos').value));
    campo('m-mesa-dica').textContent = 'Mesa ' + camadas.join('-') + ' (' + camadas.reduce((a, b) => a + b, 0) + ' neurônios, ' + (camadas.length - 2) + ' camadas ocultas)' +
      (n > 2 ? ', com um neurônio a mais por camada para cada jogador além de 2' : '') + '. Mão de ' + 5 * baralhos + ' cartas' +
      (Number(campo('m-baralhos').value) < minimo ? ' (o baralho Truco usa no mínimo 2 baralhos)' : '') + '.';
    /* o truco é de um contra um; a opção de 12 tentos é a segunda da lista (chaves numéricas saem em ordem crescente) */
    campo('m-partida').querySelector('option[value="12"]').textContent = n === 2 ? ESCOLHAS_PARTIDA[12] : 'Partida até 12 tentos (truco só com 2)';
    const baralho = campo('m-baralho').value, terreno = campo('m-terreno').value;
    campo('m-baralho-dica').textContent = BARALHOS[baralho].resumo;
    campo('m-terreno-dica').textContent = TERRENOS[terreno].resumo;
    mostrarMiniatura(campo('m-baralho-img'), 'verso:' + baralho, () => desenharVerso('mesa', 1.2, baralho));
    mostrarMiniatura(campo('m-terreno-img'), 'mesa:' + terreno, () => desenharMesa(terreno, MUNDO.largura * 2, MUNDO.altura * 2, 0.07));
  }

  /** Guarda as escolhas atuais na aplicação (as opções que não estão nesta tela continuam como estavam). */
  function lerEscolhas() {
    app.opcoes = normalizarOpcoes({
      ...app.opcoes,
      oponente: campo('m-oponente').value, baralho: campo('m-baralho').value, terreno: campo('m-terreno').value,
      inicio: campo('m-inicio').value, alvo: Number(campo('m-partida').value),
      jogadores: Number(campo('m-jogadores').value), humanos: Number(campo('m-humanos').value),
      arquitetura: campo('m-arquitetura').value, baralhos: Number(campo('m-baralhos').value),
    });
    app.salvarOpcoes();
  }

  elemento.querySelectorAll('select').forEach((s) => s.addEventListener('change', atualizarDicas));
  atualizarDicas();
  campo('m-jogar').addEventListener('click', () => { Som.desbloquear(); lerEscolhas(); painel.fechar(); app.jogar(); });
  campo('m-regras').addEventListener('click', () => { lerEscolhas(); abrirRegras(app); });
  campo('m-grimorio').addEventListener('click', () => { lerEscolhas(); abrirGrimorio(app); });
  campo('m-conquistas').addEventListener('click', () => { lerEscolhas(); abrirConquistas(app); });
  campo('m-mods').addEventListener('click', () => { lerEscolhas(); abrirMods(); });
  campo('m-online').addEventListener('click', () => { Som.desbloquear(); lerEscolhas(); abrirOnline(app); });
  /* avatar: o retrato atual no botão; a tela de escolha troca e atualiza o botão */
  const mostrarAvatar = () => { const img = campo('m-avatar-img'), src = retratoDoAvatar(avatarDoJogador(app.progresso)); if (img && src) img.src = src; };
  mostrarAvatar();
  campo('m-avatar').addEventListener('click', () => { lerEscolhas(); abrirAvatares(app, mostrarAvatar); });
  campo('m-sobre').addEventListener('click', () => { lerEscolhas(); abrirSobre(); });
  return painel;
}
