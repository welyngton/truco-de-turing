/**
 * @file Firebase: contas (Google ou e-mail e senha), progresso na conta e o transporte das salas
 * pela internet (Firestore). O SDK só é baixado do CDN quando o projeto está configurado
 * (configuracao.js) e alguém usa uma dessas funções; sem configuração, nada aqui é carregado.
 *
 * Dados no Firestore (ver firestore.rules):
 * - `contas/{uid}`: o progresso da conta (ver contas.js, `progressoDaConta`);
 * - `salas/{codigo}/mensagens/{id}`: as mensagens da sala (sala.js), em ordem de chegada ao
 *   servidor. A ordem das ações do jogo não depende disso: o anfitrião numera cada ação. Cada
 *   mensagem leva o `uid` de quem enviou (as regras conferem) e vence em `expira`; mensagens
 *   vencidas são apagadas por `limparMensagensVencidas` (issue #62).
 */
import { FIREBASE, VERSAO_FIREBASE } from './configuracao.js';

/**
 * Validade das mensagens das salas, em ms. Depois disso qualquer conta pode apagá-las (as regras
 * aceitam até 1 dia). Seis horas cobrem com folga uma partida até 12 tentos.
 */
export const VALIDADE_DAS_MENSAGENS = 6 * 60 * 60 * 1000;

/** Quantas mensagens vencidas cada limpeza apaga, no máximo (um lote do Firestore aceita 500). */
export const LIMPEZA_POR_VEZ = 200;

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

/**
 * Conta da sessão que o Firebase guardou neste navegador (quem entrou e não saiu), ou null. Espera
 * o Firebase terminar de ler a sessão: o primeiro aviso de `onAuthStateChanged`.
 */
export async function contaGuardada() {
  const { auth, autenticacao } = await carregar();
  return new Promise((resolver) => {
    let parar = null, lida = false;
    parar = auth.onAuthStateChanged(autenticacao, (user) => {
      if (lida) return;
      lida = true;
      if (parar) parar();
      resolver(user ? conta(user) : null);
    });
    /* o aviso pode chegar antes de onAuthStateChanged devolver a função que para de ouvir */
    if (lida) parar();
  });
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
 * Cada mensagem enviada leva o `uid` da conta conectada (as regras recusam outro) e a data em que
 * vence (`expira`); a sala recebe o `uid` junto e o usa para saber quem é quem (sala.js).
 * `aoFalhar(cb)` avisa quando o Firestore recusa ler ou gravar (regras, conexão), para a tela
 * dizer ao jogador em vez de a sala ficar parada em silêncio.
 */
export async function transporteFirebase(codigo) {
  const { fs, banco, autenticacao } = await carregar();
  const usuario = autenticacao.currentUser;
  if (!usuario) throw new Error('Entre numa conta para jogar pela internet.');
  const uid = usuario.uid;
  const colecao = fs.collection(banco, 'salas', codigo, 'mensagens');
  const ouvintes = new Set();
  const vistos = new Set();
  const falhas = new Set();
  const falhou = (erro) => { for (const cb of falhas) cb(erro); };
  const parar = fs.onSnapshot(fs.query(colecao, fs.orderBy('em')), (instantaneo) => {
    for (const mudanca of instantaneo.docChanges()) {
      if (mudanca.type !== 'added' || vistos.has(mudanca.doc.id)) continue;
      vistos.add(mudanca.doc.id);
      const { em, expira, ...msg } = mudanca.doc.data();
      for (const cb of ouvintes) cb(msg);
    }
  }, falhou);
  return {
    /* JSON tira os `undefined`, que o Firestore recusa */
    enviar: (msg) => {
      const doc = { ...JSON.parse(JSON.stringify(msg)), uid, em: fs.serverTimestamp(), expira: fs.Timestamp.fromMillis(Date.now() + VALIDADE_DAS_MENSAGENS) };
      Promise.resolve(fs.addDoc(colecao, doc)).catch(falhou);
    },
    aoReceber: (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    aoFalhar: (cb) => { falhas.add(cb); return () => falhas.delete(cb); },
    fechar: () => { ouvintes.clear(); falhas.clear(); parar(); },
  };
}

/**
 * Apaga mensagens vencidas (`expira` no passado) de todas as salas, até `limite` por vez. As
 * regras deixam qualquer conta achar e apagar só as vencidas. O Firestore do plano gratuito não
 * tem a limpeza automática (TTL), então o jogo faz isso quando alguém abre uma sala pela internet.
 * A margem de 10 minutos cobre o relógio do aparelho adiantado em relação ao do servidor.
 * @returns {Promise<number>} Quantas mensagens foram apagadas.
 */
export async function limparMensagensVencidas(limite = LIMPEZA_POR_VEZ) {
  const { fs, banco } = await carregar();
  const antes = fs.Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
  const consulta = fs.query(fs.collectionGroup(banco, 'mensagens'), fs.where('expira', '<', antes), fs.limit(limite));
  const { docs } = await fs.getDocs(consulta);
  if (!docs.length) return 0;
  const lote = fs.writeBatch(banco);
  for (const d of docs) lote.delete(d.ref);
  await lote.commit();
  return docs.length;
}
