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
    const autenticacao = { get currentUser() { return f().sessao ? usuario : null; } };
    export const getAuth = () => autenticacao;
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
    /* transação: lê uma cópia e só grava no fim, como a de verdade (ver juntarNaConta) */
    export const runTransaction = async (_b, fn) => {
      banco(); const escritas = [];
      const r = await fn({ get: async (c) => { banco(); const d = f().docs[c]; return { exists: () => !!d, data: () => JSON.parse(JSON.stringify(d)) }; }, set: (c, dados) => { escritas.push([c, dados]); } });
      banco(); for (const [c, dados] of escritas) f().docs[c] = dados; f().transacoes = (f().transacoes || 0) + 1;
      return r;
    };
    export const collection = (_b, ...partes) => partes.join('/');
    export const collectionGroup = (_b, nome) => 'grupo:' + nome;
    export const query = (c) => c, orderBy = () => null, where = () => null, limit = () => null, serverTimestamp = () => 0;
    export const Timestamp = { fromMillis: (ms) => ({ ms }) };
    export const onSnapshot = () => () => {};
    /* mensagens enviadas às salas ficam em \`enviadas\` */
    export const addDoc = async (c, dados) => { banco(); (f().enviadas = f().enviadas || []).push({ c, dados }); };
    /* a limpeza acha as mensagens de \`vencidas\` e as apagadas vão para \`apagadas\` */
    export const getDocs = async (c) => {
      banco();
      /* a lista de contas (tela Jogadores) só sai para quem está em \`admins/\`, como nas regras */
      if (c === 'contas') {
        if (!f().docs['admins/uid-teste']) throw erro('permission-denied');
        return { docs: Object.keys(f().docs).filter((k) => k.startsWith('contas/')).map((k) => ({ id: k.slice(7), data: () => f().docs[k] })) };
      }
      /* o placar global (#154): todos os documentos de \`placar/\`, legíveis por quem está conectado */
      if (c === 'placar') return { docs: Object.keys(f().docs).filter((k) => k.startsWith('placar/')).map((k) => ({ id: k.slice(7), data: () => f().docs[k] })) };
      f().buscas = (f().buscas || 0) + 1; return { docs: (f().vencidas || []).map((ref) => ({ ref })) };
    };
    export const writeBatch = () => { const lote = []; return { delete: (ref) => lote.push(ref), commit: async () => { banco(); f().apagadas = (f().apagadas || []).concat(lote); } }; };`,
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
      /* o banco passa a recusar por falta de conexão: um aviso só, mesmo com vários salvamentos */
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.banco = 'unavailable'; globalThis.__TRUCO_DE_TURING__.salvar(); });
      assert.match(await aviso(pagina), /Sem conexão.*sobe para a conta quando a conexão voltar/);
      await pagina.evaluate(() => { document.querySelector('#avisos').innerHTML = ''; const app = globalThis.__TRUCO_DE_TURING__; app.salvar(); app.salvar(); });
      await pagina.waitForTimeout(800);
      assert.equal(await pagina.locator('#avisos .aviso').count(), 0);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});

describe('conquistas globais (#154)', () => {
  /** Fecha o que estiver aberto e abre o painel "Conquistas globais" pelo quadro de conquistas. */
  async function abrirGlobais(pagina) {
    await pagina.locator('.folha.online [data-fechar]').first().click();
    await pagina.click('#m-conquistas');
    await pagina.click('#c-globais');
  }

  it('com conta: publica o placar anônimo e mostra a posição entre os jogadores e a raridade das conquistas', async () => {
    const outros = {
      'placar/outro1': { conquistas: 5, maos: 100, maosVencidas: 60, tempo: 36000, ids: ['fio', 'uno', 'bias', 'primeira', 'dez'], atualizado: 1 },
      'placar/outro2': { conquistas: 1, maos: 3, maosVencidas: 1, tempo: 60, ids: ['fio'], atualizado: 1 },
    };
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { ...outros } });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      await pagina.evaluate(() => {
        const app = globalThis.__TRUCO_DE_TURING__;
        app.progresso.desbloqueadas = { fio: 1, primeira: 2 }; app.progresso.vitorias = 8; app.progresso.maos = 20;
        app.salvar();
      });
      await abrirGlobais(pagina);
      await pagina.waitForSelector('#g-estatisticas');
      const texto = await pagina.locator('.conquistas-globais').textContent();
      assert.match(texto, /entre 3 jogadores.*2º em conquistas.*à frente de 50%/s);
      assert.match(texto, /Raridade das conquistas/);
      assert.match(await pagina.locator('[data-conquista="fio"]').textContent(), /você tem.*100%.*3 jogadores de 3/s);
      assert.match(await pagina.locator('[data-conquista="bias"]').textContent(), /33,3%.*1 jogador de 3/s);
      const doc = await pagina.evaluate(() => globalThis.__FIREBASE_FALSO__.docs['placar/uid-teste']);
      assert.equal(doc.conquistas, 2);
      assert.deepEqual(doc.ids.sort(), ['fio', 'primeira']);
      assert.equal(doc.maosVencidas, 8);
      assert.ok(!JSON.stringify(doc).includes('Ada') && !JSON.stringify(doc).includes('exemplo.com'), 'o placar não leva nome nem e-mail');
      assert.ok(!texto.includes('outro1'), 'os outros jogadores são anônimos');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('regras sem a coleção placar: o painel explica o erro e o resto do jogo segue', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: {} });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.banco = 'permission-denied'; });
      await abrirGlobais(pagina);
      await pagina.waitForFunction(() => /firestore\.rules/.test(document.querySelector('.global-conteudo').textContent));
      assert.equal(await pagina.locator('#g-estatisticas').count(), 0);
      await pagina.click('.conquistas-globais [data-fechar]');
      assert.equal(await pagina.locator('#c-estatisticas').isVisible(), true, 'o quadro de conquistas continua');
    } finally { await jogo.fechar(); }
  });

  it('sem conta: convida a entrar em Jogar online; a página de estatísticas abre mesmo assim', async () => {
    const jogo = await abrirJogo(servidor.url);
    const { pagina } = jogo;
    try {
      await esperarMenu(pagina);
      await pagina.evaluate(() => { globalThis.__TRUCO_DE_TURING__.progresso.tutorialVisto = true; });
      await pagina.click('#m-conquistas');
      await pagina.click('#c-estatisticas');
      await pagina.waitForSelector('.estatisticas-secao');
      assert.equal(await pagina.locator('.estatisticas-secao').count(), 7);
      await pagina.click('.folha.estatisticas [data-fechar]');
      await pagina.click('#c-globais');
      const texto = await pagina.locator('.global-conteudo').textContent();
      assert.match(texto, /Jogar online|não está configurado/);
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
      const avatarDoAparelho = await pagina.locator('#m-avatar-img').getAttribute('src');
      await entrar(pagina);
      assert.equal(await marca(pagina), 'google');
      assert.match(await pagina.locator('#m-conta').textContent(), /Conectado como Ada/, 'o menu mostra quem entrou');
      /* outro aparelho avança o progresso da conta e troca o avatar enquanto esta aba está fechada */
      await pagina.evaluate(() => { const d = globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste']; d.lidos.backprop = true; d.avatar = 'robo'; });
      await recarregar(jogo);
      await pagina.waitForSelector('#m-conta:not([hidden])');
      assert.match(await pagina.locator('#m-conta').textContent(), /Conectado como Ada/);
      assert.equal(await pagina.evaluate(() => globalThis.__TRUCO_DE_TURING__.progresso.avatar), 'robo');
      assert.notEqual(await pagina.locator('#m-avatar-img').getAttribute('src'), avatarDoAparelho, 'o botão Avatar mostra o avatar da conta');
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

describe('sala pela internet com conta (#62)', () => {
  it('cada mensagem leva o uid da conta e a validade; a primeira sala da visita limpa as mensagens vencidas', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', vencidas: ['salas/VELHA/mensagens/m1', 'salas/VELHA/mensagens/m2'] });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      await pagina.click('#o-criar');
      await pagina.waitForFunction(() => (globalThis.__FIREBASE_FALSO__.enviadas || []).length > 0);
      const { enviadas, apagadas, buscas } = await pagina.evaluate(() => globalThis.__FIREBASE_FALSO__);
      const agora = Date.now(), seisHoras = 6 * 3600 * 1000;
      for (const { c, dados } of enviadas) {
        assert.match(c, /^salas\/[A-Z2-9]{5}\/mensagens$/);
        assert.equal(dados.uid, 'uid-teste', 'a mensagem leva o uid da conta');
        assert.ok(Math.abs(dados.expira.ms - agora - seisHoras) < 60000, 'vence em 6 horas');
      }
      const sala = enviadas.find((m) => m.dados.tipo === 'sala');
      assert.equal(sala.dados.config.cadeiras[0].uid, 'uid-teste', 'a cadeira do anfitrião guarda o uid');
      await pagina.waitForFunction(() => (globalThis.__FIREBASE_FALSO__.apagadas || []).length === 2);
      assert.equal(buscas, 1);
      assert.deepEqual(apagadas, ['salas/VELHA/mensagens/m1', 'salas/VELHA/mensagens/m2']);
      /* outra sala na mesma visita não limpa de novo */
      await pagina.click('#o-desistir');
      await pagina.click('#o-criar');
      await pagina.waitForTimeout(500);
      assert.equal(await pagina.evaluate(() => globalThis.__FIREBASE_FALSO__.buscas), 1);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('rastreio (#66): a conta guarda perfil, acessos, partidas e resumo; cada abertura conta um acesso', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok' });
    const { pagina } = jogo;
    const doc = () => pagina.evaluate(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste']);
    try {
      assert.match(await pagina.locator('#o-conta-dados').textContent(), /nome, e-mail, conquistas/, 'a tela diz o que fica guardado na conta');
      await entrar(pagina);
      let d = await doc();
      assert.deepEqual(d.perfil, { nome: 'Ada', email: 'ada@exemplo.com', metodo: 'google' });
      assert.equal(d.estatisticas.acessos, 1);
      assert.ok(d.estatisticas.primeiroAcesso > 0 && d.estatisticas.ultimoAcesso >= d.estatisticas.primeiroAcesso);
      assert.equal(d.estatisticas.aparelho, 'computador');
      assert.match(d.estatisticas.versao, /^\d+\.\d+\.\d+$/);
      /* os eventos do jogo viram contadores na conta, mesmo sem medição do Analytics (testes não medem) */
      await pagina.evaluate(async () => {
        const { registrarEvento, EVENTOS } = await import('/src/interface/analise.js');
        registrarEvento(EVENTOS.jogoIniciado, { oponente: 'guloso', online: 0 });
        registrarEvento(EVENTOS.truco, { valor: 3, quem: 'humano', meu: 1 });
        registrarEvento(EVENTOS.truco, { valor: 6, quem: 'computador', meu: 0 });
        registrarEvento(EVENTOS.fimDaMao, { baralho: 'backprop', terreno: 'oceano', venceu: 1 });
        registrarEvento(EVENTOS.jogoFinalizado, { oponente: 'guloso', online: 0, venceu: 1 });
        globalThis.__TRUCO_DE_TURING__.progresso.desbloqueadas.primeira = 1;
        globalThis.__TRUCO_DE_TURING__.salvar();
      });
      await pagina.waitForFunction(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].resumo.conquistas === 1);
      d = await doc();
      assert.deepEqual(d.estatisticas.partidas, { iniciadas: 1, terminadas: 1, vencidas: 1, abandonadas: 0 });
      assert.deepEqual(d.estatisticas.maos, { jogadas: 1, vencidas: 1 });
      assert.deepEqual(d.estatisticas.trucos, { pedidos: 1 });
      assert.deepEqual(d.estatisticas.porOponente, { guloso: { jogadas: 1, vencidas: 1 } });
      assert.deepEqual(d.estatisticas.porBaralho, { backprop: { jogadas: 1, vencidas: 1 } });
      assert.deepEqual({ ...d.resumo, ultimoAcesso: 0 }, { conquistas: 1, verbetesLidos: 0, acessos: 1, ultimoAcesso: 0, partidas: 1, vitorias: 1, maos: 1 });
      /* nova abertura com a conta retomada: mais um acesso, sem perder os contadores */
      await recarregar(jogo);
      await pagina.waitForFunction(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].estatisticas.acessos === 2);
      d = await doc();
      assert.equal(d.estatisticas.partidas.vencidas, 1);
      /* outro aparelho já acessou mais vezes: esta abertura soma uma à conta, não some na mescla */
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].estatisticas.acessos = 40; });
      await recarregar(jogo);
      await pagina.waitForFunction(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].estatisticas.acessos === 41);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('rastreio (#66): só o administrador vê o botão Jogadores; a lista mostra as contas e baixa o CSV', async () => {
    const outra = { perfil: { nome: 'Bia', email: 'bia@exemplo.com', metodo: 'email' }, desbloqueadas: { primeira: 1, dez: 2 }, verbetesLidos: 4,
      estatisticas: { acessos: 9, primeiroAcesso: 1794000000000, ultimoAcesso: 1794600000000, partidas: { iniciadas: 5, terminadas: 4, vencidas: 3, abandonadas: 1 }, maos: { jogadas: 30, vencidas: 17 } } };
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { 'contas/uid-bia': outra, 'contas/uid-antiga': { maos: 12, vitorias: 5 } } });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      await pagina.waitForTimeout(400);
      assert.equal(await pagina.locator('#o-jogadores').isHidden(), true, 'conta comum não vê o botão');
      /* vira administradora (documento em admins/, criado no console) e reabre a tela */
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.docs['admins/uid-teste'] = { desde: 1 }; });
      await pagina.click('.folha.online [data-fechar]');
      await pagina.click('#m-online');
      await pagina.waitForSelector('#o-jogadores:not([hidden])');
      await pagina.click('#o-jogadores');
      await pagina.waitForSelector('.jogadores-lista tbody tr');
      const linhas = await pagina.locator('.jogadores-lista tbody tr').allTextContents();
      assert.equal(linhas.length, 3);
      assert.match(await pagina.locator('#j-estado').textContent(), /^3 contas, 1 com conquistas/);
      assert.match(linhas[0], /^Ada/, 'último acesso mais recente primeiro');
      assert.match(linhas[1], /^Bia.*9.*2.*4.*3.*30$/);
      assert.match(linhas[2], /^\(sem nome\).*12$/, 'conta gravada antes das estatísticas aparece com o que tem');
      const [baixado] = await Promise.all([pagina.waitForEvent('download'), pagina.click('#j-csv')]);
      assert.match(baixado.suggestedFilename(), /^truco-de-turing-jogadores-\d{4}-\d{2}-\d{2}\.csv$/);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});

/** Fecha a tela "Jogar online" que `abrirConta` deixa aberta (o menu continua). */
const fecharTelas = (pagina) => pagina.locator('.folha.online [data-fechar]').click();

describe('conquistas na conta (#57)', () => {
  it('chegam da conta sem aviso, o quadro diz de quem são, e o que foi ganho sem conexão sobe quando ela volta, sem apagar o de outro aparelho', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { 'contas/uid-teste': { desbloqueadas: { zap: 1 } } } });
    const { pagina, contexto } = jogo;
    try {
      await entrar(pagina);
      /* a conquista da conta veio para o aparelho, sem aviso */
      assert.equal(await pagina.evaluate(() => !!globalThis.__TRUCO_DE_TURING__.progresso.desbloqueadas.zap), true);
      await pagina.waitForTimeout(500);
      assert.equal(await pagina.locator('#avisos .aviso').count(), 0, 'nenhum aviso pelas conquistas que chegam da conta');
      /* o quadro diz de quem são */
      await fecharTelas(pagina);
      await pagina.click('#m-conquistas');
      assert.match(await pagina.locator('.conquistas-origem').textContent(), /da conta de Ada/);
      /* sem conexão, este aparelho ganha "Big data"; enquanto isso, outro aparelho grava "Ensemble" na conta */
      await contexto.setOffline(true);
      await pagina.evaluate(() => { const app = globalThis.__TRUCO_DE_TURING__; app.progresso.desbloqueadas.bigdata = Date.now(); app.salvar(); });
      assert.match(await aviso(pagina), /Sem conexão.*sobe para a conta quando a conexão voltar/);
      await pagina.evaluate(() => { globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].desbloqueadas.ensemble = 5; });
      assert.equal(await pagina.evaluate(() => !!globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].desbloqueadas.bigdata), false, 'sem conexão, nada sobe');
      /* a conexão volta: sobe sozinho, junto com o que o outro aparelho gravou */
      await pagina.evaluate(() => { document.querySelector('#avisos').innerHTML = ''; });
      await contexto.setOffline(false);
      await pagina.waitForFunction(() => !!globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].desbloqueadas.bigdata);
      const naConta = await pagina.evaluate(() => globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].desbloqueadas);
      assert.deepEqual(Object.keys(naConta).sort(), ['bigdata', 'ensemble', 'zap'], 'nada se perde: nem o deste aparelho, nem o do outro');
      assert.equal(await pagina.evaluate(() => !!globalThis.__TRUCO_DE_TURING__.progresso.desbloqueadas.ensemble), true, 'e o do outro aparelho chega a este');
      assert.match(await aviso(pagina), /A conexão voltou/);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('o quadro de conquistas aberto se atualiza quando a conta entra', async () => {
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { 'contas/uid-teste': { desbloqueadas: { zap: 1 } } } });
    const { pagina } = jogo;
    try {
      await fecharTelas(pagina);
      await pagina.click('#m-conquistas');
      assert.match(await pagina.locator('.conquistas-origem').textContent(), /só deste aparelho/);
      const antes = await pagina.locator('.conquista:not(.bloqueada)').count();
      await pagina.evaluate(async () => {
        const { usarConta } = await import('/src/interface/conta.js');
        await usarConta(globalThis.__TRUCO_DE_TURING__, { uid: 'uid-teste', nome: 'Ada', email: 'ada@exemplo.com' }, 'google');
      });
      await pagina.waitForFunction(() => /da conta de Ada/.test(document.querySelector('.conquistas-origem').textContent));
      assert.equal(await pagina.locator('.conquista:not(.bloqueada)').count(), antes + 1, 'a conquista da conta aparece no quadro');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('as conquistas da conta completam as outras: a final chega na hora, com aviso só dela, e sobe para a conta', async () => {
    const todas = (await import('../../src/conteudo/conquistas.js')).CONQUISTAS.map((c) => c.id).filter((id) => id !== 'convergencia');
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { 'contas/uid-teste': { desbloqueadas: Object.fromEntries(todas.map((id) => [id, 1])) } } });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      assert.equal(await pagina.evaluate(() => !!globalThis.__TRUCO_DE_TURING__.progresso.desbloqueadas.convergencia), true, 'a final chegou ao entrar');
      await pagina.waitForSelector('#avisos .aviso-conquista');
      assert.equal(await pagina.locator('#avisos .aviso-conquista').count(), 1, 'um aviso só: o da final, não o das que vieram da conta');
      assert.match(await pagina.locator('#avisos .aviso-conquista').textContent(), /Conquista final/);
      await pagina.waitForFunction(() => !!globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].desbloqueadas.convergencia);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('a última conquista veio de outro aparelho durante uma gravação: a final é concedida e sobe', async () => {
    const todas = (await import('../../src/conteudo/conquistas.js')).CONQUISTAS.map((c) => c.id).filter((id) => id !== 'convergencia');
    const faltando = todas.pop();
    const jogo = await abrirConta({ login: 'ok', banco: 'ok', docs: { 'contas/uid-teste': { desbloqueadas: Object.fromEntries(todas.map((id) => [id, 1])) } } });
    const { pagina } = jogo;
    try {
      await entrar(pagina);
      assert.equal(await pagina.evaluate(() => !!globalThis.__TRUCO_DE_TURING__.progresso.desbloqueadas.convergencia), false, 'faltando uma, sem final');
      /* outro aparelho grava a que faltava; este aparelho grava e a recebe junto com a final */
      await pagina.evaluate((id) => { const f = globalThis.__FIREBASE_FALSO__; f.docs['contas/uid-teste'].desbloqueadas[id] = 9; globalThis.__TRUCO_DE_TURING__.salvar(); }, faltando);
      await pagina.waitForFunction(() => !!globalThis.__TRUCO_DE_TURING__.progresso.desbloqueadas.convergencia);
      await pagina.waitForFunction(() => !!globalThis.__FIREBASE_FALSO__.docs['contas/uid-teste'].desbloqueadas.convergencia);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
