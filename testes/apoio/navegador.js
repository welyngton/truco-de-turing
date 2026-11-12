/**
 * @file Apoio aos testes de interface: servidor local do projeto, navegador (Playwright/Chromium)
 * e coleta de cobertura do código que roda na página.
 *
 * O jogo é servido sem empacotar (index.html + módulos de src/), para que a cobertura medida no
 * navegador caia nos mesmos arquivos medidos pelos testes de unidade. O Phaser vem do
 * node_modules (no lugar do CDN) e as fontes do Google são ignoradas (o jogo usa as reservas).
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, devices } from 'playwright';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASER = readFileSync(join(RAIZ, 'node_modules/phaser/dist/phaser.min.js'));
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const KATEX = join(RAIZ, 'node_modules/katex/dist');

/** Sobe um servidor de arquivos estáticos na raiz do projeto, numa porta livre. */
export async function subirServidor() {
  const servidor = createServer(async (pedido, resposta) => {
    const caminho = decodeURIComponent(new URL(pedido.url, 'http://x').pathname);
    try {
      const conteudo = await readFile(join(RAIZ, caminho === '/' ? 'index.html' : caminho));
      resposta.writeHead(200, { 'content-type': TIPOS[extname(caminho)] || 'application/octet-stream', 'cache-control': 'no-store' });
      resposta.end(conteudo);
    } catch (e) { resposta.writeHead(404); resposta.end(); }
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  return { url: 'http://127.0.0.1:' + servidor.address().port, fechar: () => new Promise((r) => servidor.close(r)) };
}

let contadorDeCobertura = 0;

/**
 * Abre o jogo numa página nova.
 * @param {string} base URL do servidor.
 * @param {{dispositivo?: string, consulta?: string, deitado?: boolean, viewport?: object}} [opcoes]
 *   `dispositivo`: nome de aparelho do Playwright (ex.: 'iPhone 13'); `deitado`: já na horizontal;
 *   `consulta`: parâmetros da URL (ex.: '?renderer=canvas').
 * @returns {Promise<{navegador, contexto, pagina, erros: string[], fechar: () => Promise<void>}>}
 */
export async function abrirJogo(base, opcoes = {}) {
  /* CHROMIUM_DO_SISTEMA: caminho de um Chrome/Chromium já instalado, para máquinas sem o Chromium do Playwright */
  const navegador = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'], executablePath: process.env.CHROMIUM_DO_SISTEMA || undefined });
  let config = { viewport: opcoes.viewport || { width: 1280, height: 720 } };
  if (opcoes.dispositivo) {
    config = { ...devices[opcoes.dispositivo] };
    if (opcoes.deitado) config.viewport = { width: config.viewport.height, height: config.viewport.width };
  }
  const contexto = await navegador.newContext(config);
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(String(e && e.stack || e)));
  pagina.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
  await pagina.route(/cdnjs\.cloudflare\.com/, (r) => r.fulfill({ body: PHASER, contentType: 'text/javascript' }));
  await pagina.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  /* KaTeX (fórmulas do Grimório) vem do node_modules, sem depender da rede */
  await pagina.route(/cdn\.jsdelivr\.net\/npm\/katex@[^/]+\/dist\//, async (r) => {
    const arquivo = new URL(r.request().url()).pathname.replace(/^.*\/dist\//, '');
    try { await r.fulfill({ body: await readFile(join(KATEX, arquivo)), contentType: TIPOS[extname(arquivo)] || 'application/octet-stream' }); } catch (e) { await r.fulfill({ status: 404, body: '' }); }
  });
  const medirCobertura = !!process.env.NODE_V8_COVERAGE;
  if (medirCobertura) await pagina.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousFunctions: true });
  await pagina.goto(base + '/index.html' + (opcoes.consulta || ''));
  return {
    navegador, contexto, pagina, erros,
    async fechar() {
      if (medirCobertura) await salvarCobertura(pagina, base);
      await navegador.close();
    },
  };
}

/**
 * Outra aba no mesmo navegador de `jogo` (mesmo contexto, então o BroadcastChannel liga as duas):
 * usada nos testes da sala online entre abas.
 */
export async function abrirOutraAba(jogo, base, consulta = '') {
  const pagina = await jogo.contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(String(e && e.stack || e)));
  pagina.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
  await pagina.route(/cdnjs\.cloudflare\.com/, (r) => r.fulfill({ body: PHASER, contentType: 'text/javascript' }));
  await pagina.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await pagina.goto(base + '/index.html' + consulta);
  return { pagina, erros };
}

/** Converte a cobertura do Chromium para o formato do V8 que o c8 junta com a do Node. */
async function salvarCobertura(pagina, base) {
  const entradas = await pagina.coverage.stopJSCoverage();
  const result = entradas
    .filter((e) => e.url.startsWith(base + '/src/'))
    .map((e) => ({ scriptId: e.scriptId, url: pathToFileURL(join(RAIZ, new URL(e.url).pathname)).href, functions: e.functions }));
  if (!result.length) return;
  await mkdir(process.env.NODE_V8_COVERAGE, { recursive: true });
  await writeFile(join(process.env.NODE_V8_COVERAGE, 'coverage-navegador-' + process.pid + '-' + (++contadorDeCobertura) + '.json'), JSON.stringify({ result }));
}

/** Avalia `codigo` (corpo de função que recebe `cena` = cena da mesa, `app` e `jogo`) na página. */
export function naCena(pagina, codigo, arg) {
  return pagina.evaluate(([corpo, a]) => {
    const app = globalThis.__TRUCO_DE_TURING__, jogo = app.jogo;
    const cena = jogo && jogo.scene.getScene('Mesa');
    return new Function('cena', 'app', 'jogo', 'arg', corpo)(cena, app, jogo, a);
  }, [codigo, arg]);
}

/** Espera até `condicao` (corpo de função como em `naCena`) ser verdadeira. */
export async function esperarCena(pagina, condicao, tempo = 60000) {
  await pagina.waitForFunction(([corpo]) => {
    const app = globalThis.__TRUCO_DE_TURING__, jogo = app && app.jogo;
    const cena = jogo && jogo.scene.getScene('Mesa');
    try { return !!new Function('cena', 'app', 'jogo', corpo)(cena, app, jogo); } catch (e) { return false; }
  }, [condicao], { timeout: tempo, polling: 50 });
}

/**
 * Carrega na página as funções de montagem de situações (testes/apoio/montagem.js) como `M`,
 * para o código de `naCena` montar mãos e redes no estado do motor: `M.darMao(cena.mao, 0, ['7E'])`.
 */
export const carregarMontagem = (pagina) => pagina.evaluate(async () => { globalThis.M = await import('/testes/apoio/montagem.js'); });

/** Espera o menu aparecer. */
export const esperarMenu = (pagina) => pagina.waitForSelector('#m-jogar', { timeout: 60000 });

/**
 * Configura o menu, clica em Jogar, fecha as regras (na primeira vez) e acelera o tempo da cena
 * para os testes não esperarem as animações.
 */
export async function comecarPartida(pagina, escolhas = {}) {
  await esperarMenu(pagina);
  for (const [campo, valor] of Object.entries(escolhas)) await pagina.selectOption('#m-' + campo, String(valor));
  await pagina.click('#m-jogar');
  await esperarCena(pagina, 'return cena && cena.sys.isActive() && cena.painel');
  const regras = await pagina.$('text=Entendi');
  if (regras) await regras.click();
  await naCena(pagina, 'cena.time.timeScale = 8; cena.tweens.timeScale = 8;');
  await esperarCena(pagina, 'return cena.mao');
}

/**
 * Joga pelo humano até a mão acabar, com uma política simples: escolhe a carta de início, às vezes
 * empilha cartas, senão ativa um neurônio, senão passa; responde a qualquer caixa de diálogo.
 * Devolve quantos passos foram dados.
 */
export async function jogarAteOResultado(pagina, { limite = 400, empilhar = 0.5 } = {}) {
  for (let passo = 0; passo < limite; passo++) {
    const estado = await naCena(pagina, `
      if (document.querySelector('#r-proxima')) return 'resultado';
      const vinho = document.querySelector('.camada .botao.vinho');
      if (vinho) { vinho.click(); return 'caixa'; }
      if (!cena || !cena.mao) return 'carregando';
      cena.time.timeScale = 8; cena.tweens.timeScale = 8;
      if (cena.modo === 'inicio') { cena.aoClicarNaCarta(cena.mao.jogadores[cena.quemVe].mao[0].id); return 'inicio'; }
      if (!cena.ehVezDoHumano()) return 'espera';
      if (Math.random() < arg) {
        for (const c of cena.mao.jogadores[cena.quemVe].mao) {
          cena.cancelarSelecao(); cena.aoClicarNaCarta(c.id);
          const alvos = Object.keys(cena.alvos);
          if (alvos.length) { cena.aoPassarNoNeuronio(alvos[0], true); cena.aoClicarNoNeuronio(alvos[0]); return 'empilhar'; }
        }
        cena.cancelarSelecao();
      }
      const alvos = Object.keys(cena.alvos);
      if (alvos.length) { const id = alvos[Math.floor(Math.random() * alvos.length)]; cena.aoPassarNoNeuronio(id, true); cena.aoPassarNoNeuronio(id, false); cena.aoClicarNoNeuronio(id); return 'ativar'; }
      if (cena.painel.botaoPassar.habilitado) { cena.passarAVez(); return 'passar'; }
      return 'sem-jogada';`, empilhar);
    if (estado === 'resultado') return passo;
    await pagina.waitForTimeout(estado === 'espera' || estado === 'carregando' ? 120 : 40);
  }
  throw new Error('a mão não terminou em ' + limite + ' passos');
}

/**
 * Salva uma captura de tela para o relatório de interface (só quando a variável
 * RELATORIO_CAPTURAS aponta para a pasta de destino; nos testes comuns não faz nada).
 */
export async function capturar(pagina, nome) {
  const pasta = process.env.RELATORIO_CAPTURAS;
  if (!pasta) return;
  await mkdir(pasta, { recursive: true });
  await pagina.screenshot({ path: join(pasta, nome + '.jpg'), type: 'jpeg', quality: 72 });
}
