/**
 * @file Tela "Jogar online": conta e sala.
 *
 * - Conta: com o projeto Firebase configurado (src/online/configuracao.js), entrar com Google ou
 *   e-mail e senha guarda o progresso na conta (interface/conta.js, que também retoma a conta ao
 *   recarregar a página). Sem ele, o jogo usa o nome deste aparelho.
 * - Sala: criar (com as opções do menu e quantas pessoas vão jogar) ou entrar com o código. Com o
 *   Firebase, a sala funciona pela internet; sem ele, entre abas e janelas deste navegador.
 * - Espera: o código em destaque (com botão de copiar), as cadeiras e o estado da sala sempre
 *   escrito: "aguardando o(s) outro(s) jogador(es)", quem entrou, sala não encontrada ou falha
 *   de conexão. O anfitrião começa quando houver pelo menos mais uma pessoa (as vagas que
 *   sobrarem vão para o computador); antes disso, o botão explica o que falta.
 * - Erros do Firebase aparecem em português, dizendo o que fazer (online/errosFirebase.js).
 */
import { Sala, codigoDeSala, idDeCliente } from '../../online/sala.js';
import { transporteLocal } from '../../online/transportes.js';
import { firebaseConfigurado, entrarComGoogle, entrarComEmail, transporteFirebase, limparMensagensVencidas, ehAdministrador } from '../../online/firebase.js';
import { abrirJogadores } from './jogadores.js';
import { TEXTO_DA_CONTA } from '../../online/contas.js';
import { explicarErroFirebase } from '../../online/errosFirebase.js';
import { avatarDoJogador } from '../../conteudo/avatares.js';
import { abrirPainel, escaparHtml, mostrarAviso } from '../paineis.js';
import { registrarEvento, EVENTOS } from '../analise.js';
import { contaAtual, aoMudarDeConta, usarConta, sairDaContaAtual } from '../conta.js';

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

/** Tempo sem resposta do anfitrião até a tela dizer que não achou a sala. */
export const ESPERA_PELA_SALA = 8000;

/** A sala deste aparelho vai pela internet (Firebase configurado e conta conectada)? */
const pelaInternet = () => firebaseConfigurado() && !!contaAtual();

/** Já limpou as mensagens vencidas do Firestore nesta visita? (uma vez só; ver firebase.js) */
let limpouSalas = false;

/**
 * Cria o transporte da sala: Firebase com conta, senão entre abas deste navegador. Na primeira
 * sala pela internet da visita, apaga em segundo plano as mensagens vencidas das salas antigas.
 */
async function transporte(codigo) {
  if (!pelaInternet()) return transporteLocal(codigo);
  if (!limpouSalas) { limpouSalas = true; limparMensagensVencidas().catch(() => { /* fica para a próxima visita */ }); }
  return transporteFirebase(codigo);
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
      ? '<p id="o-conta-estado">' + (contaAtual() ? 'Conectado como <b>' + escaparHtml(contaAtual().nome) + '</b>. O progresso fica na conta.' : 'Entre para guardar conquistas, avatares e progresso na conta e jogar pela internet.') + '</p>' +
        '<div class="linha"><button class="botao" id="o-google">Entrar com Google</button><button class="botao discreto" id="o-sair"' + (contaAtual() ? '' : ' hidden') + '>Sair da conta</button><button class="botao discreto" id="o-jogadores" hidden>Jogadores</button></div>' +
        '<div class="campos-duplos"><input id="o-email" type="email" placeholder="e-mail" autocomplete="email"><input id="o-senha" type="password" placeholder="senha" autocomplete="current-password"></div>' +
        '<div class="linha"><button class="botao discreto" id="o-email-entrar">Entrar com e-mail</button><button class="botao discreto" id="o-email-criar">Criar conta</button></div>' +
        '<p class="nota" id="o-conta-dados">' + TEXTO_DA_CONTA + '</p>'
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
    '<section class="online-espera" id="o-espera" hidden><h3>Sala <span class="codigo-sala" id="o-codigo-sala"></span>' +
    '<button class="botao discreto pequeno" id="o-copiar" type="button">Copiar código</button></h3>' +
    '<p class="espera-estado" id="o-espera-nota" role="status" aria-live="polite"></p><ol class="cadeiras" id="o-cadeiras"></ol>' +
    '<p class="nota" id="o-espera-alcance"></p>' +
    '<div class="linha fim"><button class="botao discreto" id="o-desistir">Sair da sala</button><button class="botao vinho" id="o-comecar" hidden>Começar partida</button></div></section>' +
    '</div>';
  let sala = null;
  let procurando = null; /* relógio de "sala não encontrada" de quem entrou com o código */
  let pararDeOuvirConta = () => {};
  const painel = abrirPainel(html, { aoFechar: () => { clearTimeout(procurando); pararDeOuvirConta(); if (sala && !app.online) sala.sair(); } });
  const $ = (id) => painel.elemento.querySelector('#' + id);

  const eu = () => {
    const nomeMesa = ($('o-nome').value.trim() || app.progresso.nomeOnline || 'Jogador').slice(0, 20);
    if (nomeMesa !== app.progresso.nomeOnline) { app.progresso.nomeOnline = nomeMesa; app.salvar(); }
    /* pela internet, a sala amarra a cadeira à conta (ver sala.js) */
    return { cliente: clienteDaAba(), nome: nomeMesa, avatar: avatarDoJogador(app.progresso), uid: pelaInternet() ? contaAtual().uid : undefined };
  };

  /** Quantas pessoas estão sentadas na sala. */
  const pessoasNaSala = () => (sala && sala.config ? sala.config.cadeiras.filter((c) => c.tipo === 'humano').length : 0);
  /** Estado da espera, por escrito (e com a classe que dá a cor: 'aguardando', 'pronta' ou 'erro'). */
  const estadoDaEspera = (texto, classe) => { const nota = $('o-espera-nota'); nota.textContent = texto; nota.className = 'espera-estado ' + classe; };

  /** Abre a sala com o transporte certo e mostra na tela as falhas de conexão do Firestore. */
  async function abrirSala(codigo) {
    const t = await transporte(codigo);
    if (t.aoFalhar) {
      let avisou = false;
      t.aoFalhar((erro) => {
        const texto = 'A sala perdeu a conexão. ' + (explicarErroFirebase(erro) || '');
        if ($('o-espera-nota')) estadoDaEspera(texto, 'erro');
        if (!avisou) { avisou = true; mostrarAviso('Sala', texto, null, 8000); }
      });
    }
    return new Sala(t, eu());
  }

  /** Mostra a espera da sala e acompanha as cadeiras até a partida começar. */
  function esperar(novaSala) {
    sala = novaSala;
    $('o-escolha').hidden = true;
    $('o-espera').hidden = false;
    $('o-espera-alcance').textContent = pelaInternet()
      ? 'Sala pela internet: quem entrar precisa estar conectado numa conta.'
      : firebaseConfigurado()
        ? 'Sem conta, esta sala só funciona entre abas e janelas deste navegador. Para jogar pela internet, saia da sala e entre numa conta.'
        : 'Esta sala funciona entre abas e janelas deste navegador.';
    const desenhar = (config) => {
      if (!config) return;
      clearTimeout(procurando);
      $('o-codigo-sala').textContent = config.codigo;
      const humanos = config.cadeiras.filter((c) => c.tipo === 'humano').length;
      if (sala.souAnfitriao && humanos < 2) estadoDaEspera('Aguardando o(s) outro(s) jogador(es). O código da sala é ' + config.codigo + ': passe para quem vai jogar.', 'aguardando');
      else if (sala.souAnfitriao) estadoDaEspera(humanos + ' pessoas na sala. Comece quando todos tiverem entrado; as vagas que sobrarem ficam com o computador.', 'pronta');
      else if (sala.minhaCadeira < 0) estadoDaEspera('A sala ' + config.codigo + ' não tem vaga livre ou a partida já começou.', 'erro');
      else estadoDaEspera('Você está na cadeira ' + (sala.minhaCadeira + 1) + '. Aguardando o anfitrião começar a partida.', 'aguardando');
      $('o-cadeiras').innerHTML = config.cadeiras.map((c, j) => '<li class="' + c.tipo + '">' +
        (c.tipo === 'humano' ? escaparHtml(c.nome) + (c.cliente === sala.eu.cliente ? ' (você)' : '') + (j === 0 ? ' · anfitrião' : '') : c.tipo === 'vaga' ? 'vaga livre' : 'computador') + '</li>').join('');
      $('o-comecar').hidden = !sala.souAnfitriao;
      /* sem `disabled`: o botão continua respondendo ao clique, para explicar o que falta */
      $('o-comecar').setAttribute('aria-disabled', String(humanos < 2));
      $('o-comecar').classList.toggle('inativo', humanos < 2);
      if (config.iniciada) {
        app.online = { sala };
        painel.fechar();
        app.jogar();
      }
    };
    sala.on('sala', desenhar).on('aviso', (t) => mostrarAviso('Sala', t, null, 4000));
    desenhar(sala.config);
  }

  /** Abrir a sala falhou (sem conexão, Firestore fora do ar): diz o que houve. */
  const falhaAoAbrir = (erro) => mostrarAviso('Sala', 'Não deu para abrir a sala. ' + (explicarErroFirebase(erro) || ''), null, 8000);

  $('o-criar').addEventListener('click', async () => {
    const codigo = codigoDeSala();
    let s;
    try { s = await abrirSala(codigo); } catch (e) { falhaAoAbrir(e); return; }
    s.criar(codigo, { ...app.opcoes }, Number($('o-pessoas').value), Math.floor(Math.random() * 2 ** 31));
    registrarEvento(EVENTOS.salaOnline, { acao: 'criar', pessoas: Number($('o-pessoas').value), conta: contaAtual() ? 1 : 0 });
    esperar(s);
    mostrarAviso('Sala ' + codigo + ' criada', 'Aguardando o(s) outro(s) jogador(es). O código da sala é ' + codigo + '.', null, 8000);
  });
  $('o-entrar').addEventListener('click', async () => {
    const codigo = $('o-codigo').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(codigo)) { mostrarAviso('Código da sala', 'São 5 letras e números, como ABCDE.'); return; }
    let s;
    try { s = await abrirSala(codigo); } catch (e) { falhaAoAbrir(e); return; }
    esperar(s);
    estadoDaEspera('Procurando a sala ' + codigo + '…', 'aguardando');
    $('o-codigo-sala').textContent = codigo;
    s.entrar();
    /* o anfitrião responde em instantes; sem resposta, o código está errado ou a sala fechou */
    clearTimeout(procurando);
    procurando = setTimeout(() => {
      if (sala !== s || s.config) return;
      estadoDaEspera('Não achei a sala ' + codigo + '. Confira o código e se quem criou a sala continua com ela aberta' +
        (pelaInternet() ? '.' : firebaseConfigurado() ? '. Sem conta, só dá para entrar em salas abertas neste navegador.' : ' neste navegador.'), 'erro');
    }, ESPERA_PELA_SALA);
    registrarEvento(EVENTOS.salaOnline, { acao: 'entrar', conta: contaAtual() ? 1 : 0 });
  });
  $('o-comecar').addEventListener('click', () => {
    if (!sala) return;
    if (pessoasNaSala() < 2) {
      mostrarAviso('Aguardando jogadores', 'Ainda não entrou mais ninguém. O código da sala é ' + sala.config.codigo + ': a partida começa quando outra pessoa entrar.', null, 7000);
      return;
    }
    registrarEvento(EVENTOS.salaOnline, { acao: 'comecar' });
    sala.comecar();
  });
  $('o-copiar').addEventListener('click', async () => {
    const codigo = $('o-codigo-sala').textContent.trim();
    try { await navigator.clipboard.writeText(codigo); mostrarAviso('Código copiado', 'Sala ' + codigo + '.', null, 2500); }
    catch (e) { mostrarAviso('Código da sala', codigo + ' (não deu para copiar sozinho; anote ou selecione o código).', null, 6000); }
  });
  $('o-desistir').addEventListener('click', () => { clearTimeout(procurando); if (sala) sala.sair(); sala = null; $('o-escolha').hidden = false; $('o-espera').hidden = true; });

  if (nuvem) {
    const mostrarConta = () => {
      const conta = contaAtual();
      $('o-conta-estado').innerHTML = conta ? 'Conectado como <b>' + escaparHtml(conta.nome) + '</b>. O progresso fica na conta.' : 'Entre para guardar o progresso na conta e jogar pela internet.';
      $('o-sair').hidden = !conta;
      if (conta && !$('o-nome').value) $('o-nome').value = conta.nome;
      /* a lista de jogadores só é oferecida a quem as regras do Firestore deixam ler as contas */
      $('o-jogadores').hidden = true;
      if (conta) ehAdministrador(conta.uid).then((sim) => { const b = $('o-jogadores'); if (b && contaAtual() && contaAtual().uid === conta.uid) b.hidden = !sim; });
    };
    $('o-jogadores').addEventListener('click', () => abrirJogadores());
    mostrarConta();
    /* a conta pode voltar (retomada ao recarregar) ou mudar com a tela aberta */
    pararDeOuvirConta = aoMudarDeConta(() => { if (painel.elemento.isConnected) mostrarConta(); else pararDeOuvirConta(); });
    const tentar = (acao, metodo) => async () => {
      try { await usarConta(app, await acao(), metodo); } catch (e) {
        /* quem fechou a janela do Google desistiu: sem aviso */
        const texto = explicarErroFirebase(e);
        if (texto) mostrarAviso('Conta', texto, null, 8000);
      }
    };
    $('o-google').addEventListener('click', tentar(() => entrarComGoogle(), 'google'));
    $('o-email-entrar').addEventListener('click', tentar(() => entrarComEmail($('o-email').value, $('o-senha').value), 'email'));
    $('o-email-criar').addEventListener('click', tentar(() => entrarComEmail($('o-email').value, $('o-senha').value, true), 'email_novo'));
    $('o-sair').addEventListener('click', async () => {
      try { await sairDaContaAtual(); } catch (e) { const texto = explicarErroFirebase(e); if (texto) mostrarAviso('Conta', texto, null, 8000); }
    });
  }
  return painel;
}
