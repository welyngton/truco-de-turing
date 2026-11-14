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
 * O menu e a tela "Jogar online" acompanham a conta por `aoMudarDeConta`.
 */
import { mesclarProgresso, progressoDaConta } from '../online/contas.js';
import { firebaseConfigurado, contaGuardada, sairDaConta, carregarProgressoDaConta, salvarProgressoNaConta } from '../online/firebase.js';
import { explicarErroFirebase } from '../online/errosFirebase.js';
import { mostrarAviso } from './paineis.js';
import { definirConta } from './analise.js';

/** Chave no `localStorage` que diz que alguém entrou numa conta neste navegador (valor: o método de login). */
export const MARCA_DE_CONTA = 'truco-de-turing:conta';

/** Conta que vale agora (`{ uid, nome, email }`), ou null. */
let atual = null;
const ouvintes = new Set();
/** Já avisou que salvar na conta falhou? (um aviso só, até voltar a dar certo) */
let avisouFalhaAoSalvar = false;

/** Conta conectada agora (`{ uid, nome, email }`), ou null. */
export function contaAtual() { return atual; }

/** Avisa `cb(conta | null)` quando a conta muda. Devolve a função que para de ouvir. */
export function aoMudarDeConta(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); }

function mudar(conta) {
  atual = conta;
  for (const cb of [...ouvintes]) cb(conta);
}

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
  await salvarProgressoNaConta(conta.uid, progressoDaConta(mesclado));
  app.progresso = mesclado;
  avisouFalhaAoSalvar = false;
  gravarMarca(metodo);
  definirConta(conta.uid, metodo, { retomada });
  mudar(conta);
  /* daqui em diante, cada vez que o progresso é salvo, ele vai também para a conta */
  if (!app.salvarSoLocal) {
    app.salvarSoLocal = app.salvar;
    app.salvar = function () {
      this.salvarSoLocal();
      if (!atual) return;
      salvarProgressoNaConta(atual.uid, progressoDaConta(this.progresso)).then(() => { avisouFalhaAoSalvar = false; }, (e) => {
        if (avisouFalhaAoSalvar) return;
        avisouFalhaAoSalvar = true;
        mostrarAviso('Conta', 'O progresso ficou só neste aparelho. ' + (explicarErroFirebase(e) || ''), null, 7000);
      });
    };
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
