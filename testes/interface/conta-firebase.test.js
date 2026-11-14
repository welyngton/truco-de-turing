/**
 * @file Conta pelo Firebase no navegador (issue #40), com um SDK falso servido no lugar do CDN:
 * cada caso de configuração que falta no console vira um aviso que diz onde mexer, a conta só
 * passa a valer depois de ler e gravar no Firestore, e a falha ao salvar é avisada uma vez.
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
 * `login` e `banco` ('ok' ou um código de erro) e `docs` (o que foi gravado no Firestore).
 */
const SDK = {
  'firebase-app.js': 'export const initializeApp = (config) => ({ config });',
  'firebase-auth.js': `
    const f = () => globalThis.__FIREBASE_FALSO__; const erro = ${erro};
    const usuario = { uid: 'uid-teste', displayName: 'Ada', email: 'ada@exemplo.com' };
    const entrar = async () => { if (f().login !== 'ok') throw erro(f().login); return { user: usuario }; };
    export const getAuth = () => ({});
    export class GoogleAuthProvider {}
    export const signInWithPopup = entrar, signInWithEmailAndPassword = entrar, createUserWithEmailAndPassword = entrar;
    export const signOut = async () => {};
    export const onAuthStateChanged = () => () => {};`,
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

/** Abre o jogo com o SDK falso e a tela "Jogar online". */
async function abrirConta(estado) {
  const jogo = await abrirJogo(servidor.url);
  const { pagina } = jogo;
  await pagina.route(/www\.gstatic\.com\/firebasejs\//, (r) => {
    const arquivo = new URL(r.request().url()).pathname.split('/').pop();
    return r.fulfill({ body: SDK[arquivo] || '', contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
  });
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
