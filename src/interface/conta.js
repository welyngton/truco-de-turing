/**
 * @file Conta conectada neste navegador (Firebase): entrar, sair e retomar a conta ao recarregar a
 * página (issue #60).
 *
 * O Firebase guarda a sessão no navegador, mas a conta só passa a valer para o jogo depois de ler
 * e gravar o progresso no Firestore (`usarConta`). Para retomar a conta sem baixar o SDK para
 * quem nunca entrou, o login grava a marca `MARCA_DE_CONTA` no `localStorage` (com o método de
 * login) e sair da conta apaga a marca. Ao abrir o jogo, `retomarConta` só carrega o Firebase se
 * a marca existir; aí espera a sessão guardada e junta o progresso da conta com o do aparelho,
 * como no login.
 *
 * Com a conta valendo, cada gravação junta o progresso do aparelho com o da conta numa transação
 * (`sincronizar`): um aparelho não apaga o que outro gravou, e o que foi ganho sem conexão sobe
 * quando ela volta (issue #57).
 *
 * O menu, a tela "Jogar online" e a tela "Conquistas" acompanham a conta por `aoMudarDeConta`.
 */
import { mesclarProgresso, juntarParaGravar, documentoDaConta } from '../online/contas.js';
import { estatisticasDe } from '../online/estatisticas.js';
import { firebaseConfigurado, contaGuardada, sairDaConta, carregarProgressoDaConta, salvarProgressoNaConta, juntarNaConta } from '../online/firebase.js';
import { explicarErroFirebase } from '../online/errosFirebase.js';
import { mostrarAviso } from './paineis.js';
import { definirConta } from './analise.js';

/** Chave no `localStorage` que diz que alguém entrou numa conta neste navegador (valor: o método de login). */
export const MARCA_DE_CONTA = 'truco-de-turing:conta';

/** Conta que vale agora (`{ uid, nome, email }`), ou null. */
let atual = null;
/** Método de login da conta que vale agora ('google', 'email'…). */
let metodoAtual = '';
/** O acesso desta abertura do jogo já foi contado na conta? (uma vez por abertura) */
let acessoContadoNaConta = false;
const ouvintes = new Set();
/** Já avisou que salvar na conta falhou? (um aviso só, até voltar a dar certo) */
let avisouFalhaAoSalvar = false;
/** Gravação na conta em andamento (uma por vez), ou null. */
let gravacao = null;
/** Alguém pediu para gravar enquanto outra gravação corria? (vira uma gravação só, logo depois) */
let gravarDeNovo = false;
/** O progresso ficou sem subir por falta de conexão? Sobe sozinho quando a conexão voltar. */
let pendente = false;

/** O erro é de falta de conexão (e vale tentar de novo quando ela voltar)? */
const semConexao = (e) => !!e && (['unavailable', 'deadline-exceeded'].includes(e.code) || /offline/i.test(e.message || ''));
/** O navegador diz que está sem conexão? */
const navegadorSemConexao = () => !!globalThis.navigator && globalThis.navigator.onLine === false;

/**
 * Sobe o progresso para a conta juntando com o que já está lá (`juntarParaGravar`, numa transação),
 * para um aparelho não apagar o que outro gravou. O que vier da conta (conquistas ganhas em outro
 * aparelho) entra também neste aparelho, sem aviso. Uma gravação por vez: pedidos que chegam no
 * meio viram uma gravação só, logo depois. Sem conexão, o progresso fica pendente, com um aviso só,
 * e sobe sozinho quando a conexão volta (evento `online`, ligado em `usarConta`).
 * @param {object} app Aplicação.
 * @returns {Promise<void>}
 */
function sincronizar(app) {
  if (!atual) return Promise.resolve();
  if (gravacao) { gravarDeNovo = true; return gravacao; }
  /* o `.finally` roda depois desta atribuição mesmo quando a gravação falha na hora (sem conexão) */
  gravacao = gravarNaConta(app, atual).finally(() => {
    gravacao = null;
    if (gravarDeNovo) { gravarDeNovo = false; sincronizar(app); }
  });
  return gravacao;
}

/** Uma gravação de `sincronizar`: junta, grava, traz o que veio da conta e avisa o que for preciso. */
async function gravarNaConta(app, conta) {
  try {
    if (navegadorSemConexao()) throw Object.assign(new Error('offline'), { code: 'unavailable' });
    const gravado = await juntarNaConta(conta.uid, (naConta) => documentoDaConta(juntarParaGravar(app.progresso, naConta), conta, metodoAtual));
    if (atual !== conta) return;
    app.progresso = juntarParaGravar(app.progresso, gravado);
    app.salvarSoLocal();
    if (pendente) mostrarAviso('Conta', 'A conexão voltou: o progresso deste aparelho subiu para a conta.', null, 5000);
    pendente = false;
    avisouFalhaAoSalvar = false;
  } catch (e) {
    const offline = navegadorSemConexao() || semConexao(e);
    if (offline) pendente = true;
    if (avisouFalhaAoSalvar) return;
    avisouFalhaAoSalvar = true;
    mostrarAviso('Conta', offline ? 'Sem conexão: o progresso fica neste aparelho e sobe para a conta quando a conexão voltar.'
      : 'O progresso ficou só neste aparelho. ' + (explicarErroFirebase(e) || ''), null, 7000);
  }
}

/** Conta conectada agora (`{ uid, nome, email }`), ou null. */
export function contaAtual() { return atual; }

/** Avisa `cb(conta | null)` quando a conta muda. Devolve a função que para de ouvir. */
export function aoMudarDeConta(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); }

function mudar(conta) {
  atual = conta;
  for (const cb of [...ouvintes]) cb(conta);
}

/** Alguém entrou numa conta neste navegador e não saiu? (a conta em si só vale depois de retomada) */
export function haMarcaDeConta() { return !!lerMarca(); }

const lerMarca = () => { try { return globalThis.localStorage?.getItem(MARCA_DE_CONTA) || null; } catch (e) { return null; } };
const gravarMarca = (metodo) => { try { globalThis.localStorage?.setItem(MARCA_DE_CONTA, metodo || 'conta'); } catch (e) { /* sem armazenamento: só não retoma */ } };
const apagarMarca = () => { try { globalThis.localStorage?.removeItem(MARCA_DE_CONTA); } catch (e) { /* idem */ } };

/**
 * Passa a usar a conta: junta o progresso do aparelho com o da conta e passa a salvar nela. A
 * conta só vale depois de ler e gravar no Firestore; se isso falhar, o erro sobe para quem chamou
 * e o jogo continua com o progresso do aparelho, sem fingir que salvou na nuvem.
 * @param {object} app Aplicação (progresso e `salvar()`).
 * @param {{uid: string, nome: string, email: string}} conta
 * @param {string} metodo 'google', 'email' ou 'email_novo' (o da marca, na retomada).
 * @param {{retomada?: boolean}} [opcoes] `retomada`: a conta voltou ao recarregar a página (não conta como login novo nas estatísticas).
 */
export async function usarConta(app, conta, metodo, { retomada = false } = {}) {
  const naConta = await carregarProgressoDaConta(conta.uid);
  const mesclado = mesclarProgresso(app.progresso, naConta);
  mesclado.nomeOnline = mesclado.nomeOnline || conta.nome;
  /* A mescla fica com o maior número de acessos. Se a conta já tinha tantos ou mais que este
     aparelho, a abertura de agora sumiria: ela conta mais um na conta, uma vez por abertura. */
  const jaNaConta = naConta && naConta.estatisticas ? naConta.estatisticas.acessos || 0 : 0;
  const estatisticas = estatisticasDe(mesclado);
  if (!acessoContadoNaConta) estatisticas.acessos = Math.max(estatisticas.acessos, jaNaConta + 1);
  await salvarProgressoNaConta(conta.uid, documentoDaConta(mesclado, conta, metodo));
  acessoContadoNaConta = true;
  metodoAtual = metodo;
  app.progresso = mesclado;
  avisouFalhaAoSalvar = false;
  gravarMarca(metodo);
  definirConta(conta.uid, metodo, { retomada });
  mudar(conta);
  /* daqui em diante, cada vez que o progresso é salvo, ele vai também para a conta, juntando com o
     que já está lá; o que ficou pendente sem conexão sobe quando ela voltar */
  if (!app.salvarSoLocal) {
    app.salvarSoLocal = app.salvar;
    app.salvar = function () {
      this.salvarSoLocal();
      sincronizar(this);
    };
    globalThis.addEventListener?.('online', () => { if (pendente && atual) sincronizar(app); });
  }
  app.salvar();
}

/** Sai da conta: o progresso continua no aparelho, e a próxima visita não tenta retomar a conta. */
export async function sairDaContaAtual() {
  await sairDaConta();
  apagarMarca();
  definirConta(null);
  mudar(null);
}

/**
 * Ao abrir o jogo, retoma a conta de quem já entrou neste navegador. Sem a marca do login (ou sem
 * o Firebase configurado), não faz nada e não baixa o SDK. Com a marca, espera a sessão que o
 * Firebase guardou:
 * - sessão encerrada (saiu em outro lugar, expirou): apaga a marca e segue sem conta;
 * - sessão válida: junta o progresso como no login e volta a salvar na conta;
 * - falha ao ler ou gravar a conta: avisa, segue com o progresso do aparelho e mantém a marca,
 *   para tentar de novo na próxima visita.
 * @param {object} app Aplicação.
 * @returns {Promise<object|null>} A conta retomada, ou null.
 */
export async function retomarConta(app) {
  if (!firebaseConfigurado()) return null;
  const metodo = lerMarca();
  if (!metodo) return null;
  let conta;
  try { conta = await contaGuardada(); } catch (e) { return null; /* SDK fora do ar: tenta na próxima visita */ }
  if (!conta) { apagarMarca(); return null; }
  /* entrou pela tela "Jogar online" enquanto o Firebase lia a sessão */
  if (atual) return atual;
  try {
    await usarConta(app, conta, metodo, { retomada: true });
    return conta;
  } catch (e) {
    mostrarAviso('Conta', 'Não deu para retomar a conta de ' + conta.nome + '; o progresso fica neste aparelho até você entrar de novo. ' + (explicarErroFirebase(e) || ''), null, 8000);
    return null;
  }
}
