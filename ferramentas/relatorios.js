/**
 * @file Roda todas as suítes de teste e escreve os relatórios em relatorios/.
 *
 * Suítes:
 * - unidade (testes/unidade): regras, conteúdo, arte, interface HTML, aplicação e ferramentas;
 * - interface (testes/interface): o jogo de verdade no Chromium (menu, partidas, ações, celular);
 * - performance (testes/performance): tempos e limites no Node e no navegador.
 *
 * Saídas (relatorios/):
 * - README.md: resumo geral (versão, commit, ambiente, totais, cobertura e destaques de performance);
 * - unidade/, interface/, performance/: README.md com cada teste e o resultado JUnit (XML);
 * - interface/capturas/: capturas de tela tiradas durante os testes de interface;
 * - performance/medidas.json: todas as medidas;
 * - cobertura/README.md e resumo.json: cobertura de linhas, ramos e funções por arquivo e a lista de
 *   todas as funções e métodos com quantas vezes foram executados nos testes (Node + navegador).
 *
 * Uso: `npm run relatorios` (todas) ou `node ferramentas/relatorios.js unidade performance`.
 */
import { spawnSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

/** Pasta do projeto. */
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'relatorios');
const temporaria = join(saida, '.tmp');
const caminho = (...partes) => join(raiz, ...partes);

/** Suítes de teste: pasta, título e descrição para o relatório. */
const SUITES = {
  unidade: { pasta: 'testes/unidade', titulo: 'Testes de unidade', descricao: 'Regras do jogo, oponentes, conteúdo (conquistas, avatares, dicas, Biblioteca de conceitos), motor do NeuroDeck e a camada de tradução, arte procedural desenhada num canvas de verdade, telas em HTML (jsdom), som e música (WebAudio de mentira), aplicação e ferramentas de linha de comando.' },
  interface: { pasta: 'testes/interface', titulo: 'Testes de interface', descricao: 'O jogo inteiro rodando no Chromium (Playwright): menu e telas (regras, ajuda das ações, Biblioteca, avatares), mãos completas contra os três oponentes, entre duas pessoas e em mesas de 3 a 5 jogadores, cada ação da mesa e os painéis de leitura, truco, modo dicas (mouse e toque), som, música, comemorações e celular (vertical e horizontal).' },
  performance: { pasta: 'testes/performance', titulo: 'Testes de performance', descricao: 'Tempos do motor de regras, dos oponentes, das dicas, da arte e do empacotamento no Node; tempo de carregamento, quadros por segundo, memória e tempo de resposta no navegador. Cada medida tem um limite; acima dele, o teste falha.' },
};

/* ======================================================================== execução */

/** Roda uma suíte com os relatores JSON, JUnit e o resumo no terminal. */
function rodarSuite(nome) {
  const suite = SUITES[nome];
  const arquivos = readdirSync(caminho(suite.pasta)).filter((a) => a.endsWith('.test.js')).sort().map((a) => join(suite.pasta, a));
  mkdirSync(join(saida, nome), { recursive: true });
  const env = {
    ...process.env,
    NODE_V8_COVERAGE: join(temporaria, 'v8'),
    RELATORIO_MEDIDAS: join(temporaria, 'medidas'),
    RELATORIO_CAPTURAS: nome === 'interface' ? join(saida, 'interface', 'capturas') : '',
  };
  if (nome === 'interface') rmSync(join(saida, 'interface', 'capturas'), { recursive: true, force: true });
  const inicio = Date.now();
  const r = spawnSync(process.execPath, [
    '--test', '--test-concurrency=' + (nome === 'performance' ? 1 : Math.max(2, Math.min(4, os.cpus().length))),
    '--test-reporter=./testes/apoio/relator.js', '--test-reporter-destination=' + join(temporaria, nome + '.json'),
    '--test-reporter=junit', '--test-reporter-destination=' + join(saida, nome, 'resultado.junit.xml'),
    '--test-reporter=spec', '--test-reporter-destination=stdout',
    ...arquivos,
  ], { cwd: raiz, env, stdio: ['ignore', 'inherit', 'inherit'] });
  const { resultados } = JSON.parse(readFileSync(join(temporaria, nome + '.json'), 'utf8'));
  return { nome, ...suite, arquivos, resultados, codigo: r.status, duracaoMs: Date.now() - inicio };
}

/** Junta a cobertura do Node e do navegador com o c8. */
function gerarCobertura() {
  const c8 = caminho('node_modules/.bin/c8');
  execSync([c8, 'report', '--temp-directory', join(temporaria, 'v8'), '--reports-dir', join(temporaria, 'c8'),
    '--reporter=json', '--reporter=json-summary', '--all', '--include', 'src/**', '--include', 'ferramentas/**',
    '--exclude', 'src/recursos/**', '--exclude', 'ferramentas/relatorios.js'].map((p) => JSON.stringify(p)).join(' '), { cwd: raiz, stdio: 'inherit' });
  return {
    resumo: JSON.parse(readFileSync(join(temporaria, 'c8', 'coverage-summary.json'), 'utf8')),
    detalhe: JSON.parse(readFileSync(join(temporaria, 'c8', 'coverage-final.json'), 'utf8')),
  };
}

/** Medidas de performance gravadas pelos testes. */
function lerMedidas() {
  const pasta = join(temporaria, 'medidas');
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((a) => readFileSync(join(pasta, a), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
}

/* ======================================================================== escrita */

const SIMBOLO = { aprovado: '✅', reprovado: '❌', pulado: '⏭️' };
const pct = (x) => (x == null ? '—' : x.toFixed(1).replace('.', ',') + '%');
const ms = (x) => (x >= 1000 ? (x / 1000).toFixed(1).replace('.', ',') + ' s' : Math.round(x) + ' ms');
const num = (x) => (Math.abs(x) >= 100 ? Math.round(x).toLocaleString('pt-BR') : x.toFixed(2).replace('.', ','));
const escapar = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Totais de uma suíte (só testes, sem as suítes que os agrupam). */
function totais(suite) {
  const testes = suite.resultados.filter((r) => r.tipo === 'test');
  const conta = (s) => testes.filter((r) => r.situacao === s).length;
  return { total: testes.length, aprovados: conta('aprovado'), reprovados: conta('reprovado'), pulados: conta('pulado') };
}

/** Relatório de uma suíte: cada arquivo, cada grupo e cada teste. */
function escreverSuite(suite, contexto, extra = '') {
  const t = totais(suite);
  let md = '# ' + suite.titulo + '\n\n' + contexto.cabecalho + '\n\n' + suite.descricao + '\n\n' +
    '| Testes | Aprovados | Reprovados | Pulados | Duração |\n|---:|---:|---:|---:|---:|\n' +
    '| ' + t.total + ' | ' + t.aprovados + ' | ' + t.reprovados + ' | ' + t.pulados + ' | ' + ms(suite.duracaoMs) + ' |\n\n' +
    'Resultado em formato JUnit (para ferramentas de CI): [`resultado.junit.xml`](resultado.junit.xml).\n\n' + extra;
  for (const arquivo of suite.arquivos) {
    const doArquivo = suite.resultados.filter((r) => r.arquivo === arquivo && r.tipo === 'test');
    if (!doArquivo.length) continue;
    md += '## `' + arquivo + '`\n\n| | Teste | Grupo | Duração |\n|---|---|---|---:|\n';
    for (const r of doArquivo) md += '| ' + SIMBOLO[r.situacao] + ' | ' + escapar(r.nome) + ' | ' + escapar(r.suite || '—') + ' | ' + ms(r.duracaoMs) + ' |\n';
    const falhas = doArquivo.filter((r) => r.erro);
    if (falhas.length) md += '\n' + falhas.map((r) => '> ❌ **' + escapar(r.nome) + '**: ' + escapar(r.erro)).join('\n\n') + '\n';
    md += '\n';
  }
  writeFileSync(join(saida, suite.nome, 'README.md'), md);
}

/** Galeria das capturas de tela dos testes de interface. */
function galeria() {
  const pasta = join(saida, 'interface', 'capturas');
  if (!existsSync(pasta)) return '';
  const fotos = readdirSync(pasta).filter((a) => a.endsWith('.jpg')).sort();
  if (!fotos.length) return '';
  return '## Capturas de tela\n\nTiradas pelo próprio teste, no momento indicado pelo nome.\n\n' +
    fotos.map((f) => '<a href="capturas/' + f + '"><img src="capturas/' + f + '" width="300" alt="' + f.replace('.jpg', '') + '"></a>').join('\n') + '\n\n';
}

/** Relatório de performance: tabela de medidas com limite e situação. */
function escreverPerformance(suite, medidas, contexto) {
  writeFileSync(join(saida, 'performance', 'medidas.json'), JSON.stringify(medidas, null, 2) + '\n');
  let tabela = '## Medidas\n\n| | Grupo | Medida | Valor | Limite | Observação |\n|---|---|---|---:|---:|---|\n';
  for (const m of medidas) {
    const ok = m.melhor === 'menor' ? m.valor <= m.limite : m.valor >= m.limite;
    tabela += '| ' + (ok ? '✅' : '❌') + ' | ' + m.grupo + ' | ' + escapar(m.nome) + ' | ' + num(m.valor) + ' ' + m.unidade + ' | ' + (m.melhor === 'menor' ? '≤ ' : '≥ ') + num(m.limite) + ' | ' + escapar(m.detalhe || '') + ' |\n';
  }
  tabela += '\nTodas as medidas em [`medidas.json`](medidas.json). O Chromium dos testes não tem placa de vídeo: o WebGL é desenhado por software, por isso os quadros por segundo em WebGL ficam muito abaixo do que um aparelho de verdade alcança; a medida em Canvas mostra que a lógica do jogo não é o gargalo.\n\n';
  escreverSuite(suite, contexto, tabela);
}

/**
 * Relatório de cobertura: totais, tabela por arquivo e a lista de funções e métodos com o número
 * de execuções (funções anônimas, como callbacks, aparecem só nos totais).
 */
function escreverCobertura(cobertura, contexto) {
  mkdirSync(join(saida, 'cobertura'), { recursive: true });
  const { resumo, detalhe } = cobertura;
  const arquivos = Object.keys(resumo).filter((k) => k !== 'total').sort();
  const rel = (abs) => relative(raiz, abs);
  const resumoRelativo = { total: resumo.total };
  for (const a of arquivos) resumoRelativo[rel(a)] = resumo[a];
  writeFileSync(join(saida, 'cobertura', 'resumo.json'), JSON.stringify(resumoRelativo, null, 2) + '\n');
  let nomeadas = 0, nomeadasExecutadas = 0, lista = '';
  for (const a of arquivos) {
    const d = detalhe[a];
    if (!d) continue;
    const funcoes = Object.entries(d.fnMap).map(([id, f]) => ({ nome: f.name, linha: f.loc.start.line, vezes: d.f[id] }))
      .filter((f) => f.nome && !/^\(anonymous/.test(f.nome));
    if (!funcoes.length) continue;
    nomeadas += funcoes.length;
    nomeadasExecutadas += funcoes.filter((f) => f.vezes > 0).length;
    lista += '\n### `' + rel(a) + '`\n\n' + funcoes.map((f) => (f.vezes > 0 ? '✅' : '❌') + ' `' + f.nome + '` (linha ' + f.linha + ') — ' + f.vezes.toLocaleString('pt-BR') + (f.vezes === 1 ? ' execução' : ' execuções')).join('  \n') + '\n';
  }
  const tot = resumo.total;
  let md = '# Cobertura dos testes\n\n' + contexto.cabecalho + '\n\n' +
    'Cobertura medida pelo V8 nos testes de unidade (Node) e nos testes de interface (Chromium, com os módulos de `src/` servidos sem empacotar), juntada pelo c8. ' +
    'Ficam fora da conta só `ferramentas/relatorios.js` (o gerador destes relatórios, que é quem roda os testes) e `src/recursos/` (a foto embutida, sem código).\n\n' +
    '| | Linhas | Instruções | Ramos | Funções |\n|---|---:|---:|---:|---:|\n' +
    '| **Total** | ' + pct(tot.lines.pct) + ' | ' + pct(tot.statements.pct) + ' | ' + pct(tot.branches.pct) + ' | ' + pct(tot.functions.pct) + ' |\n\n' +
    '**Funções e métodos com nome executados pelos testes: ' + nomeadasExecutadas + ' de ' + nomeadas + ' (' + pct((100 * nomeadasExecutadas) / Math.max(1, nomeadas)) + ').** ' +
    'A coluna "Funções" acima conta também as funções anônimas (callbacks de eventos, de animações e de `map`/`filter`).\n\n' +
    '## Por arquivo\n\n| Arquivo | Linhas | Ramos | Funções |\n|---|---:|---:|---:|\n' +
    arquivos.map((a) => '| `' + rel(a) + '` | ' + pct(resumo[a].lines.pct) + ' | ' + pct(resumo[a].branches.pct) + ' | ' + pct(resumo[a].functions.pct) + ' |').join('\n') +
    '\n\n## Funções e métodos\n\nCada função ou método com nome e quantas vezes foi executado durante os testes.\n' + lista;
  writeFileSync(join(saida, 'cobertura', 'README.md'), md);
  return { total: tot, nomeadas, nomeadasExecutadas };
}

/** Resumo geral em relatorios/README.md. */
function escreverResumo(suites, cobertura, medidas, contexto) {
  let md = '# Relatórios de testes\n\n' + contexto.cabecalho + '\n\n' +
    'Gerado por `npm run relatorios` (`ferramentas/relatorios.js`).\n\n## Resultado\n\n' +
    '| Suíte | Testes | Aprovados | Reprovados | Duração | Relatório |\n|---|---:|---:|---:|---:|---|\n';
  for (const s of suites) {
    const t = totais(s);
    md += '| ' + (t.reprovados ? '❌ ' : '✅ ') + s.titulo + ' | ' + t.total + ' | ' + t.aprovados + ' | ' + t.reprovados + ' | ' + ms(s.duracaoMs) + ' | [' + s.nome + '/](' + s.nome + '/README.md) |\n';
  }
  if (cobertura) {
    const c = cobertura.total;
    md += '\n## Cobertura\n\n| Linhas | Instruções | Ramos | Funções (todas) | Funções e métodos com nome |\n|---:|---:|---:|---:|---:|\n' +
      '| ' + pct(c.lines.pct) + ' | ' + pct(c.statements.pct) + ' | ' + pct(c.branches.pct) + ' | ' + pct(c.functions.pct) + ' | ' + cobertura.nomeadasExecutadas + ' de ' + cobertura.nomeadas + ' |\n\n' +
      'Detalhe por arquivo e por função em [cobertura/](cobertura/README.md).\n';
  }
  if (medidas.length) {
    const destaque = ['Mãos completas simuladas', 'Decisão gulosa', 'Simulações por decisão (Monte Carlo)', 'Tempo até o menu (WebGL)', 'Quadros por segundo na mesa (Canvas)', 'Tamanho do arquivo único'];
    md += '\n## Destaques de performance\n\n| Medida | Valor | Limite |\n|---|---:|---:|\n' +
      medidas.filter((m) => destaque.includes(m.nome)).map((m) => '| ' + m.nome + ' | ' + num(m.valor) + ' ' + m.unidade + ' | ' + (m.melhor === 'menor' ? '≤ ' : '≥ ') + num(m.limite) + ' |').join('\n') +
      '\n\nTodas as medidas em [performance/](performance/README.md).\n';
  }
  if (existsSync(join(saida, 'validacao', 'README.md'))) {
    md += '\n## Validação das regras de negócio\n\nTestes de aceitação RN-01 a RN-40 (dentro da suíte de unidade), testes funcionais no site e pontos de regra para validar com o professor: [validacao/](validacao/README.md).\n';
  }
  md += '\n## Como rodar\n\n```bash\nnpm run testar              # unidade\nnpm run testar:interface    # interface (Chromium)\nnpm run testar:performance  # performance\nnpm run relatorios          # tudo + relatórios e cobertura\n```\n';
  writeFileSync(join(saida, 'README.md'), md);
}

/* ======================================================================== principal */

const pedidas = process.argv.slice(2).filter((a) => SUITES[a]);
const nomes = pedidas.length ? pedidas : Object.keys(SUITES);
rmSync(temporaria, { recursive: true, force: true });
mkdirSync(temporaria, { recursive: true });

const pacote = JSON.parse(readFileSync(caminho('package.json'), 'utf8'));
let commit = '';
try {
  const git = (comando) => execSync('git ' + comando, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  commit = git('rev-parse --short HEAD') + (git('status --porcelain') ? '-dirty' : '');
} catch (e) { commit = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : ''; }
let chromium = '';
try { const { chromium: c } = await import('playwright'); const b = await c.launch(); chromium = b.version(); await b.close(); } catch (e) { chromium = 'indisponível'; }
const agora = new Date();
const contexto = {
  cabecalho: '**Versão ' + pacote.version + '**' + (commit ? ' · commit `' + commit + '`' + (commit.endsWith('-dirty') ? ' (com as mudanças ainda não registradas)' : '') : '') + ' · ' +
    agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) + ' (horário de Brasília)  \n' +
    'Ambiente: Node ' + process.version + ' · Chromium ' + chromium + ' · ' + os.type() + ' ' + os.arch() + ' · ' + os.cpus().length + ' núcleos',
};

const suites = nomes.map(rodarSuite);
const medidas = lerMedidas();
for (const s of suites) {
  if (s.nome === 'performance') escreverPerformance(s, medidas, contexto);
  else escreverSuite(s, contexto, s.nome === 'interface' ? galeria() : '');
}
let cobertura = null;
if (nomes.includes('unidade') && nomes.includes('interface')) cobertura = escreverCobertura(gerarCobertura(), contexto);
escreverResumo(suites, cobertura, medidas, contexto);
rmSync(temporaria, { recursive: true, force: true });

const falhou = suites.some((s) => s.codigo !== 0);
console.log('\nRelatórios em relatorios/' + (falhou ? ' (há testes reprovados)' : ''));
process.exit(falhou ? 1 : 0);
