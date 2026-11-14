/**
 * @file Conta pelo Firebase no navegador (issues #40 e #60), com um SDK falso servido no lugar do
 * CDN: cada caso de configuração que falta no console vira um aviso que diz onde mexer, a conta só
 * passa a valer depois de ler e gravar no Firestore, a falha ao salvar é avisada uma vez, e a
 * conta volta sozinha ao recarregar a página, sem baixar o SDK para quem nunca entrou.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, esperarMenu } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

const erro = `(codigo) => Object.assign(new Error('Firebase: Error (' + codigo + ').'), { code: codigo })`;

/**
 * SDK falso, controlado por `globalThis.__FIREBASE_FALSO__`:
 * `login` e `banco` ('ok' ou um código de erro), `docs` (o que foi gravado no Firestore) e
 * `sessao` (a sessão que o Firebase guardou no navegador: entrar liga, sair desliga).
 */
const SDK = {
  'firebase-app.js': 'export const initializeApp = (config) => ({ config });',
  'firebase-auth.js': `
    const f = () => globalThis.__FIREBASE_FALSO__; const erro = ${erro};
    const usuario = { uid: 'uid-teste', displayName: 'Ada', email: 'ada@exemplo.com' };
    const entrar = async () => { if (f().login !== 'ok') throw erro(f().login); f().sessao = true; return { user: usuario }; };
    export const getAuth = () => ({});
    export class GoogleAuthProvider {}
    export const signInWithPopup = entrar, signInWithEmailAndPassword = entrar, createUserWithEmailAndPassword = entrar;
    export const signOut = async () => { f().sessao = false; };
    /* como o de verdade: avisa a sessão guardada depois de lê-la (aqui, um instante depois) */
    export const onAuthStateChanged = (_a, cb) => { const t = setTimeout(() => cb(f().sessao ? usuario : null), 150); return () => clearTimeout(t); };`,
  'firebase-firestore.js': `
    const f = () => globalThis.__FIREBASE_FALSO__; const erro = ${erro};
    const banco = () => { if (f().banco !== 'ok') throw erro(f().banco); };
    export const getFirestore = () => ({});
    export const doc = (_b, ...partes) => partes.join('/');
    export const getDoc = async (c) => { banco(); const d = f().docs[c]; return { exists: () => !!d, data: () => d }; };
    export const setDoc = async (c, dados) => { banco(); f().docs[c] = dados; };
    export const collection = (_b, ...partes) => partes.join('/');
    export const query = (c) => c, orderBy = () => null, serverTimestamp = () => 0;
    export const onSnapshot = () => () => {};
    export const addDoc = async () => { banco(); };`,
};

/**
 * Serve o SDK falso no lugar do CDN e conta quantos arquivos dele a página pediu
 * (`jogo.pedidosDoSdk`). Ao recarregar, o estado do SDK falso volta de `sessionStorage` (as contas
 * e a sessão guardada continuam, como no Firebase de verdade; ver `recarregar`).
 */
async function servirSdkFalso(jogo) {
  jogo.pedidosDoSdk = 0;
  await jogo.pagina.route(/www\.gstatic\.com\/firebasejs\//, (r) => {
    jogo.pedidosDoSdk++;
    const arquivo = new URL(r.request().url()).pathname.split('/').pop();
    return r.fulfill({ body: SDK[arquivo] || '', contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
  });
  await jogo.pagina.addInitScript(() => {
    try { const salvo = sessionStorage.getItem('__firebase_falso__'); if (salvo) globalThis.__FIREBASE_FALSO__ = JSON.parse(salvo); } catch (e) { /* primeira carga */ }
  });
}

/** Recarrega a página guardando o estado do SDK falso e espera o menu; zera `jogo.pedidosDoSdk`. */
async function recarregar(jogo) {
  const { pagina } = jogo;
  await pagina.evaluate(() => { if (globalThis.__FIREBASE_FALSO__) sessionStorage.setItem('__firebase_falso__', JSON.stringify(globalThis.__FIREBASE_FALSO__)); });
  jogo.pedidosDoSdk = 0;
  await pagina.reload();
  await esperarMenu(pagina);
}

/** Marca de conta no localStorage (ver src/interface/conta.js). */
const marca = (pagina) => pagina.evaluate(() => localStorage.getItem('truco-de-turing:conta'));

/** Entra com o Google na tela "Jogar online" e espera a conta valer. */
async function entrar(pagina) {
  await pagina.click('#o-google');
  await pagina.waitForFunction(() => /Conectado como/.test(document.querySelector('#o-conta-estado').textContent));
}

/** Abre o jogo com o SDK falso e a tela "Jogar online". */
async function abrirConta(estado) {
  const jogo = await abrirJogo(servidor.url);
  const { pagina } = jogo;
  await servirSdkFalso(jogo);
  await esperarMenu(pagina);
  await pagina.evaluate((e) => {
    globalThis.__FIREBASE_FALSO__ = { docs: {}, ...e };
    globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto = true;
  }, estado);
  await pagina.click('#m-online');
  await pagina.waitForSelector('#o-google');
  return jogo;
}

/** Texto do aviso que aparecer (espera até `ms`). */
async function aviso(pagina, ms = 5000) {
  await pagina.waitForSelector('#avisos .aviso', { timeout: ms });
  return pagina.locator('#avisos .aviso').textContent();
}

describe('conta pelo Firebase (#40)', () => {
  it('login desativado no console: o aviso aponta o Método de login e a conta não entra', async () => {
    const jogo = await abrirConta({ login: 'auth/operation-not-allowed', banco: 'ok' });
    const { pagina } = jogo;
    try {
      await pagina.click('#o-google');
      assert.match(await aviso(pagina), /ainda não está ativado.*Método de login/);
      assert.match(await pagina.locator('#o-conta-estado').textContent(), /^Entre para/);
      assert.equal(await pagina.locator('#o-sair').isHidden(), true);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('quem fecha a janela do Google não recebe aviso de erro', async () => {
    const jogo = await abrirConta({ login: 'auth/popup-closed-by-user', banco: 'ok' });
    const { pagina } = jogo;
    try {
      await pagina.click('#o-google');
      await pagina.waitForTimeout(800);
      assert.equal(await pagina.locator('#avisos .aviso').count(), 0);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('regras do Firestore não publicadas: o aviso aponta firestore.rules e a conta não finge que salvou', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'permission-denied' });
    const { pagina } = jogo;
    try {
      await pagina.fill('#o-email', 'ada@exemplo.com');
      await pagina.fill('#o-senha', 'segredo123');
      await pagina.click('#o-email-entrar');
      assert.match(await aviso(pagina), /firestore\.rules/);
      assert.match(await pagina.locator('#o-conta-estado').textContent(), /^Entre para/);
      assert.equal(await pagina.locator('#o-sair').isHidden(), true);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('tudo configurado: entra, junta o progresso com o da conta e avisa uma vez só se salvar falhar', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { 'contas/uid-teste': { lidos: { overfit: true }, verbetesLidos: 1 } } });
    const { pagina } = jogo;
    try {
      await pagina.click('#o-google');
      await pagina.waitForFunction(() => /Conectado como/.test(document.querySelector('#o-conta-estado').textContent));
      assert.match(await pagina.locator('#o-conta-estado').textContent(), /Conectado como Ada/);
      const gravado = await pagina.evaluate(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste']);
      assert.deepEqual(gravado.lidos, { overfit: true }, 'o que estava na conta continua lá');
      assert.equal(await pagina.evaluate(() => !!globalThis.__TRUCO_DE_TURING__.progresso.lidos.overfit), true, 'e veio para o aparelho');
      /* salvar dá certo em silêncio */
      await pagina.evaluate(() => { const app = globalThis.__TRUCO_DE_TURING__; app.progresso.lidos.dropout = true; app.salvar(); });
      await pagina.waitForFunction(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].lidos.dropout);
      assert.equal(await pagina.locator('#avisos .aviso').count(), 0);
      /* o banco passa a recusar: um aviso só, mesmo com vários salvamentos */
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.banco = 'unavailable'; globalThis.__TRUCO_DE_TURING__.salvar(); });
      assert.match(await aviso(pagina), /ficou só neste aparelho.*Sem conexão/);
      await pagina.evaluate(() => { document.querySelector('#avisos').innerHTML = ''; const app = globalThis.__TRUCO_DE_TURING__; app.salvar(); app.salvar(); });
      await pagina.waitForTimeout(800);
      assert.equal(await pagina.locator('#avisos .aviso').count(), 0);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});

describe('conta retomada ao recarregar a página (#60)', () => {
  it('quem nunca entrou numa conta: abrir o jogo não baixa o SDK do Firebase', async () => {
    const jogo = await abrirJogo(servidor.url);
    const { pagina } = jogo;
    try {
      await servirSdkFalso(jogo);
      await recarregar(jogo);
      await pagina.waitForTimeout(1000);
      assert.equal(jogo.pedidosDoSdk, 0);
      assert.equal(await pagina.locator('#m-conta').isHidden(), true);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('entrar, recarregar e continuar conectado, com o progresso indo para a conta', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { 'contas/uid-teste': { lidos: { overfit: true }, verbetesLidos: 1 } } });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      assert.equal(await marca(pagina), 'google');
      assert.match(await pagina.locator('#m-conta').textContent(), /Conectado como Ada/, 'o menu mostra quem entrou');
      /* outro aparelho avança o progresso da conta enquanto esta aba está fechada */
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].lidos.backprop = true; });
      await recarregar(jogo);
      await pagina.waitForSelector('#m-conta:not([hidden])');
      assert.match(await pagina.locator('#m-conta').textContent(), /Conectado como Ada/);
      const lidos = await pagina.evaluate(() => globalThis.__TRUCO_DE_TURING__.progresso.lidos);
      assert.equal(lidos.overfit && lidos.backprop, true, 'a retomada junta o progresso da conta com o do aparelho');
      /* depois da retomada, salvar continua indo para a conta */
      await pagina.evaluate(() => { const app = globalThis.__TRUCO_DE_TURING__; app.progresso.lidos.dropout = true; app.salvar(); });
      await pagina.waitForFunction(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].lidos.dropout);
      /* e a tela "Jogar online" já abre conectada, com a sala pela internet */
      await pagina.click('#m-online');
      await pagina.waitForSelector('#o-conta-estado');
      assert.match(await pagina.locator('#o-conta-estado').textContent(), /Conectado como Ada/);
      assert.equal(await pagina.locator('#o-sair').isVisible(), true);
      assert.equal(await pagina.locator('#avisos .aviso').count(), 0);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('sair da conta apaga a marca: depois de recarregar, nem o SDK é baixado', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok' });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      await pagina.click('#o-sair');
      await pagina.waitForFunction(() => /^Entre para/.test(document.querySelector('#o-conta-estado').textContent));
      assert.equal(await marca(pagina), null);
      assert.equal(await pagina.locator('#m-conta').isHidden(), true, 'o menu deixa de mostrar a conta');
      await recarregar(jogo);
      await pagina.waitForTimeout(1000);
      assert.equal(jogo.pedidosDoSdk, 0);
      assert.equal(await pagina.locator('#m-conta').isHidden(), true);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('sessão encerrada fora do jogo: apaga a marca e segue sem conta, sem aviso', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok' });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.sessao = false; });
      await recarregar(jogo);
      await pagina.waitForFunction(() => localStorage.getItem('truco-de-turing:conta') === null);
      assert.equal(await pagina.locator('#m-conta').isHidden(), true);
      assert.equal(await pagina.locator('#avisos .aviso').count(), 0);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('Firestore fora do ar na retomada: avisa, segue com o progresso do aparelho e tenta de novo na próxima visita', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok' });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.banco = 'unavailable'; });
      await recarregar(jogo);
      assert.match(await aviso(pagina), /Não deu para retomar a conta de Ada.*Sem conexão/);
      assert.equal(await marca(pagina), 'google');
      assert.equal(await pagina.locator('#m-conta').isHidden(), true);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
