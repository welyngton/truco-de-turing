/**
 * @file Firebase: contas (Google ou e-mail e senha), progresso na conta e o transporte das salas
 * pela internet (Firestore). O SDK só é baixado do CDN quando o projeto está configurado
 * (configuracao.js) e alguém usa uma dessas funções; sem configuração, nada aqui é carregado.
 *
 * Dados no Firestore (ver firestore.rules):
 * - `contas/{uid}`: o progresso da conta (ver contas.js, `progressoDaConta`);
 * - `salas/{codigo}/mensagens/{id}`: as mensagens da sala (sala.js), em ordem de chegada ao
 *   servidor. A ordem das ações do jogo não depende disso: o anfitrião numera cada ação.
 */
import { FIREBASE, VERSAO_FIREBASE } from './configuracao.js';

let sdk = null;

/** O projeto Firebase do grupo está configurado? */
export function firebaseConfigurado() { return !!FIREBASE; }

/** Baixa e inicia o SDK (uma vez). */
async function carregar() {
  if (sdk) return sdk;
  if (!FIREBASE) throw new Error('O projeto Firebase ainda não foi configurado (src/online/configuracao.js).');
  const base = 'https://www.gstatic.com/firebasejs/' + VERSAO_FIREBASE + '/';
  const [app, auth, fs] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js']
    .map((arquivo) => import(/* @vite-ignore */ base + arquivo)));
  const aplicativo = app.initializeApp(FIREBASE);
  sdk = { auth, fs, autenticacao: auth.getAuth(aplicativo), banco: fs.getFirestore(aplicativo) };
  return sdk;
}

/* ------------------------------------------------------------------ contas */

/** Entra com a conta Google (janela do Google). Devolve `{ uid, nome, email }`. */
export async function entrarComGoogle() {
  const { auth, autenticacao } = await carregar();
  const { user } = await auth.signInWithPopup(autenticacao, new auth.GoogleAuthProvider());
  return conta(user);
}

/** Entra com e-mail e senha; com `criar`, cria a conta antes. */
export async function entrarComEmail(email, senha, criar = false) {
  const { auth, autenticacao } = await carregar();
  const fazer = criar ? auth.createUserWithEmailAndPassword : auth.signInWithEmailAndPassword;
  const { user } = await fazer(autenticacao, email, senha);
  return conta(user);
}

/** Sai da conta. */
export async function sairDaConta() {
  const { auth, autenticacao } = await carregar();
  await auth.signOut(autenticacao);
}

/** Avisa `cb(conta | null)` quando alguém entra ou sai. Devolve a função que para de ouvir. */
export async function aoMudarConta(cb) {
  const { auth, autenticacao } = await carregar();
  return auth.onAuthStateChanged(autenticacao, (user) => cb(user ? conta(user) : null));
}

const conta = (user) => ({ uid: user.uid, nome: user.displayName || (user.email || '').split('@')[0] || 'Jogador', email: user.email || '' });

/** Progresso salvo na conta, ou null. */
export async function carregarProgressoDaConta(uid) {
  const { fs, banco } = await carregar();
  const doc = await fs.getDoc(fs.doc(banco, 'contas', uid));
  return doc.exists() ? doc.data() : null;
}

/** Salva o progresso na conta. */
export async function salvarProgressoNaConta(uid, progresso) {
  const { fs, banco } = await carregar();
  await fs.setDoc(fs.doc(banco, 'contas', uid), JSON.parse(JSON.stringify(progresso)));
}

/* ------------------------------------------------------------------ salas */

/**
 * Transporte de sala pelo Firestore: cada mensagem vira um documento em
 * `salas/{codigo}/mensagens`; todos ouvem a coleção e recebem os documentos novos.
 * `aoFalhar(cb)` avisa quando o Firestore recusa ler ou gravar (regras, conexão), para a tela
 * dizer ao jogador em vez de a sala ficar parada em silêncio.
 */
export async function transporteFirebase(codigo) {
  const { fs, banco } = await carregar();
  const colecao = fs.collection(banco, 'salas', codigo, 'mensagens');
  const ouvintes = new Set();
  const vistos = new Set();
  const falhas = new Set();
  const falhou = (erro) => { for (const cb of falhas) cb(erro); };
  const parar = fs.onSnapshot(fs.query(colecao, fs.orderBy('em')), (instantaneo) => {
    for (const mudanca of instantaneo.docChanges()) {
      if (mudanca.type !== 'added' || vistos.has(mudanca.doc.id)) continue;
      vistos.add(mudanca.doc.id);
      const { em, ...msg } = mudanca.doc.data();
      for (const cb of ouvintes) cb(msg);
    }
  }, falhou);
  return {
    /* JSON tira os `undefined`, que o Firestore recusa */
    enviar: (msg) => { Promise.resolve(fs.addDoc(colecao, { ...JSON.parse(JSON.stringify(msg)), em: fs.serverTimestamp() })).catch(falhou); },
    aoReceber: (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    aoFalhar: (cb) => { falhas.add(cb); return () => falhas.delete(cb); },
    fechar: () => { ouvintes.clear(); falhas.clear(); parar(); },
  };
}
