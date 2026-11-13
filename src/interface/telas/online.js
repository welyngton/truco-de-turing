/**
 * @file Tela "Jogar online": conta e sala.
 *
 * - Conta: com o projeto Firebase configurado (src/online/configuracao.js), entrar com Google ou
 *   e-mail e senha guarda o progresso na conta. Sem ele, o jogo usa o nome deste aparelho.
 * - Sala: criar (com as opções do menu e quantas pessoas vão jogar) ou entrar com o código. Com o
 *   Firebase, a sala funciona pela internet; sem ele, entre abas e janelas deste navegador.
 * - Espera: o código em destaque e as cadeiras; o anfitrião começa a partida quando quiser (as
 *   vagas que sobrarem vão para o computador).
 */
import { Sala, codigoDeSala, idDeCliente } from '../../online/sala.js';
import { transporteLocal } from '../../online/transportes.js';
import { mesclarProgresso, progressoDaConta } from '../../online/contas.js';
import { firebaseConfigurado, entrarComGoogle, entrarComEmail, sairDaConta, carregarProgressoDaConta, salvarProgressoNaConta, transporteFirebase } from '../../online/firebase.js';
import { avatarDoJogador } from '../../conteudo/avatares.js';
import { abrirPainel, escaparHtml, mostrarAviso } from '../paineis.js';
import { registrarEvento, definirConta, EVENTOS } from '../analise.js';

/** Identificador deste aparelho, o mesmo depois de recarregar a aba (para voltar à cadeira). */
function clienteDaAba() {
  try {
    const salvo = sessionStorage.getItem('truco-de-turing:cliente');
    if (salvo) return salvo;
    const novo = idDeCliente();
    sessionStorage.setItem('truco-de-turing:cliente', novo);
    return novo;
  } catch (e) { return idDeCliente(); }
}

/** Conta atual nesta sessão (Firebase), ou null. */
let contaAtual = null;

/** Entrou numa conta: junta o progresso do aparelho com o da conta e passa a salvar nela. */
async function usarConta(app, conta, metodo) {
  contaAtual = conta;
  definirConta(conta.uid, metodo);
  const naConta = await carregarProgressoDaConta(conta.uid);
  app.progresso = mesclarProgresso(app.progresso, naConta);
  app.progresso.nomeOnline = app.progresso.nomeOnline || conta.nome;
  app.salvar();
  await salvarProgressoNaConta(conta.uid, progressoDaConta(app.progresso));
  /* daqui em diante, cada vez que o progresso é salvo, ele vai também para a conta */
  if (!app.salvarSoLocal) {
    app.salvarSoLocal = app.salvar;
    app.salvar = function () { this.salvarSoLocal(); if (contaAtual) salvarProgressoNaConta(contaAtual.uid, progressoDaConta(this.progresso)).catch(() => {}); };
  }
}

/** Cria o transporte da sala: Firebase com conta, senão entre abas deste navegador. */
async function transporte(codigo) {
  if (firebaseConfigurado() && contaAtual) return transporteFirebase(codigo);
  return transporteLocal(codigo);
}

/**
 * Abre a tela "Jogar online".
 * @param {object} app Aplicação (progresso, opções do menu, `online` e `jogar()`).
 */
export function abrirOnline(app) {
  const nuvem = firebaseConfigurado();
  const nome = app.progresso.nomeOnline || '';
  const maxPessoas = app.opcoes.jogadores;
  const html = '<div class="folha online"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Jogar online</h2>' +
    '<section class="online-conta"><h3>Conta</h3>' +
    (nuvem
      ? '<p id="o-conta-estado">' + (contaAtual ? 'Conectado como <b>' + escaparHtml(contaAtual.nome) + '</b>. O progresso fica na conta.' : 'Entre para guardar conquistas, avatares e progresso na conta e jogar pela internet.') + '</p>' +
        '<div class="linha"><button class="botao" id="o-google">Entrar com Google</button><button class="botao discreto" id="o-sair"' + (contaAtual ? '' : ' hidden') + '>Sair da conta</button></div>' +
        '<div class="campos-duplos"><input id="o-email" type="email" placeholder="e-mail" autocomplete="email"><input id="o-senha" type="password" placeholder="senha" autocomplete="current-password"></div>' +
        '<div class="linha"><button class="botao discreto" id="o-email-entrar">Entrar com e-mail</button><button class="botao discreto" id="o-email-criar">Criar conta</button></div>'
      : '<p class="nota">As contas na nuvem e as salas pela internet entram quando o projeto Firebase do grupo for configurado. Por enquanto o progresso fica neste navegador, e as salas funcionam entre abas e janelas dele (abra o jogo em outra janela para testar).</p>') +
    '<div class="campo"><label for="o-nome">Seu nome na mesa</label><input id="o-nome" maxlength="20" value="' + escaparHtml(nome) + '" placeholder="Como os outros vão ver você"></div>' +
    '</section>' +
    '<section class="online-sala" id="o-escolha"><h3>Sala</h3>' +
    '<p>A sala usa as opções do menu (jogadores, oponente, arquitetura, baralho, terreno e partida). Cadeiras sem pessoa ficam com o computador.</p>' +
    '<div class="campos-duplos"><div class="campo"><label for="o-pessoas">Pessoas na sala</label><select id="o-pessoas">' +
    Array.from({ length: maxPessoas - 1 }, (_, i) => '<option value="' + (i + 2) + '">' + (i + 2) + ' de ' + maxPessoas + ' cadeiras</option>').join('') +
    '</select></div><div class="campo"><label>&nbsp;</label><button class="botao vinho" id="o-criar">Criar sala</button></div></div>' +
    '<div class="campos-duplos"><div class="campo"><label for="o-codigo">Código da sala</label><input id="o-codigo" maxlength="5" placeholder="ABCDE" autocapitalize="characters"></div>' +
    '<div class="campo"><label>&nbsp;</label><button class="botao" id="o-entrar">Entrar na sala</button></div></div>' +
    '</section>' +
    '<section class="online-espera" id="o-espera" hidden><h3>Sala <span class="codigo-sala" id="o-codigo-sala"></span></h3>' +
    '<p id="o-espera-nota"></p><ol class="cadeiras" id="o-cadeiras"></ol>' +
    '<div class="linha fim"><button class="botao discreto" id="o-desistir">Sair da sala</button><button class="botao vinho" id="o-comecar" hidden>Começar partida</button></div></section>' +
    '</div>';
  let sala = null;
  const painel = abrirPainel(html, { aoFechar: () => { if (sala && !app.online) sala.sair(); } });
  const $ = (id) => painel.elemento.querySelector('#' + id);

  const eu = () => {
    const nomeMesa = ($('o-nome').value.trim() || app.progresso.nomeOnline || 'Jogador').slice(0, 20);
    if (nomeMesa !== app.progresso.nomeOnline) { app.progresso.nomeOnline = nomeMesa; app.salvar(); }
    return { cliente: clienteDaAba(), nome: nomeMesa, avatar: avatarDoJogador(app.progresso) };
  };

  /** Mostra a espera da sala e acompanha as cadeiras até a partida começar. */
  function esperar(novaSala) {
    sala = novaSala;
    $('o-escolha').hidden = true;
    $('o-espera').hidden = false;
    const desenhar = (config) => {
      if (!config) return;
      $('o-codigo-sala').textContent = config.codigo;
      const humanos = config.cadeiras.filter((c) => c.tipo === 'humano').length;
      $('o-espera-nota').textContent = sala.souAnfitriao
        ? 'Passe o código para quem vai jogar. Começe quando todos tiverem entrado (' + humanos + ' na sala).'
        : 'Você está na cadeira ' + (sala.minhaCadeira + 1) + '. Esperando o anfitrião começar.';
      $('o-cadeiras').innerHTML = config.cadeiras.map((c, j) => '<li class="' + c.tipo + '">' +
        (c.tipo === 'humano' ? escaparHtml(c.nome) + (c.cliente === sala.eu.cliente ? ' (você)' : '') + (j === 0 ? ' · anfitrião' : '') : c.tipo === 'vaga' ? 'vaga livre' : 'computador') + '</li>').join('');
      $('o-comecar').hidden = !sala.souAnfitriao;
      $('o-comecar').disabled = humanos < 2;
      if (config.iniciada) {
        app.online = { sala };
        painel.fechar();
        app.jogar();
      }
    };
    sala.on('sala', desenhar).on('aviso', (t) => mostrarAviso('Sala', t, null, 4000));
    desenhar(sala.config);
  }

  $('o-criar').addEventListener('click', async () => {
    const codigo = codigoDeSala();
    const s = new Sala(await transporte(codigo), eu());
    s.criar(codigo, { ...app.opcoes }, Number($('o-pessoas').value), Math.floor(Math.random() * 2 ** 31));
    registrarEvento(EVENTOS.salaOnline, { acao: 'criar', pessoas: Number($('o-pessoas').value), conta: contaAtual ? 1 : 0 });
    esperar(s);
  });
  $('o-entrar').addEventListener('click', async () => {
    const codigo = $('o-codigo').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(codigo)) { mostrarAviso('Código da sala', 'São 5 letras e números, como ABCDE.'); return; }
    const s = new Sala(await transporte(codigo), eu());
    esperar(s);
    $('o-espera-nota').textContent = 'Procurando a sala ' + codigo + '…';
    $('o-codigo-sala').textContent = codigo;
    s.entrar();
    registrarEvento(EVENTOS.salaOnline, { acao: 'entrar', conta: contaAtual ? 1 : 0 });
  });
  $('o-comecar').addEventListener('click', () => { if (!sala) return; registrarEvento(EVENTOS.salaOnline, { acao: 'comecar' }); sala.comecar(); });
  $('o-desistir').addEventListener('click', () => { if (sala) sala.sair(); sala = null; $('o-escolha').hidden = false; $('o-espera').hidden = true; });

  if (nuvem) {
    const mostrarConta = () => {
      $('o-conta-estado').innerHTML = contaAtual ? 'Conectado como <b>' + escaparHtml(contaAtual.nome) + '</b>. O progresso fica na conta.' : 'Entre para guardar o progresso na conta e jogar pela internet.';
      $('o-sair').hidden = !contaAtual;
      if (contaAtual && !$('o-nome').value) $('o-nome').value = contaAtual.nome;
    };
    const tentar = (acao, metodo) => async () => {
      try { await usarConta(app, await acao(), metodo); mostrarConta(); } catch (e) { mostrarAviso('Conta', e.message || String(e)); }
    };
    $('o-google').addEventListener('click', tentar(() => entrarComGoogle(), 'google'));
    $('o-email-entrar').addEventListener('click', tentar(() => entrarComEmail($('o-email').value, $('o-senha').value), 'email'));
    $('o-email-criar').addEventListener('click', tentar(() => entrarComEmail($('o-email').value, $('o-senha').value, true), 'email_novo'));
    $('o-sair').addEventListener('click', async () => { await sairDaConta(); contaAtual = null; definirConta(null); mostrarConta(); });
  }
  return painel;
}
