/**
 * @file Gera docs/REFERENCIA.md: a lista de módulos e funções do projeto, montada a partir dos
 * comentários JSDoc do código (o `@file` de cada arquivo e o comentário `/** ... *\/` logo acima
 * de cada função, constante ou método).
 *
 * Assim a referência nunca fica desatualizada: basta documentar o código e rodar `npm run docs`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pasta do projeto. `TRUCO_RAIZ` permite rodar sobre uma cópia (usado nos testes). */
const raiz = process.env.TRUCO_RAIZ || join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lista recursiva dos arquivos .js de uma pasta, em ordem alfabética. */
function arquivosJs(pasta) {
  return readdirSync(pasta).sort().flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosJs(caminho);
    return nome.endsWith('.js') ? [caminho] : [];
  });
}

/** Texto limpo de um bloco de comentário JSDoc (sem `*` e sem as tags @param/@returns). */
function limparComentario(bloco) {
  return bloco
    .replace(/^\/\*\*|\*\/$/g, '')
    .split('\n')
    .map((linha) => linha.replace(/^\s*\* ?/, '').trimEnd())
    .filter((linha) => !/^@(param|returns?|property|typedef)/.test(linha.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrai a descrição do arquivo e os itens documentados. */
function lerModulo(caminho) {
  const codigo = readFileSync(caminho, 'utf8');
  const arquivo = (/\/\*\*\s*\n?\s*\*?\s*@file([\s\S]*?)\*\//.exec(codigo) || [, ''])[1];
  let descricao = limparComentario('/**' + arquivo + '*/');
  /* arquivos sem @file (o motor do NeuroDeck, em src/motor/): usa o primeiro parágrafo dos comentários `//` do topo */
  if (!descricao) {
    const topo = (/^(?:\/\/.*\n)+/.exec(codigo) || [''])[0].split('\n').map((linha) => linha.replace(/^\/\/ ?/, ''));
    const fim = topo.findIndex((linha) => !linha.trim());
    descricao = topo.slice(0, fim < 0 ? topo.length : fim).join(' ').replace(/\s+/g, ' ').trim();
  }
  const itens = [];
  /* comentário seguido de declaração: função, classe, const/let exportada ou método de objeto */
  const padrao = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*\n\s*(export\s+)?(?:(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)|class\s+(\w+)|(?:const|let)\s+(\w+)|(\w+)\s*\(([^)]*)\)\s*\{)/g;
  let m;
  while ((m = padrao.exec(codigo))) {
    if (m[1].includes('@file')) continue;
    const nome = m[3] || m[5] || m[6] || m[7];
    const parametros = m[3] ? m[4] : m[7] ? m[8] : null;
    const tipo = m[3] ? 'função' : m[5] ? 'classe' : m[6] ? 'constante' : 'método';
    itens.push({ nome, parametros, tipo, exportado: !!m[2], texto: limparComentario('/**' + m[1] + '*/') });
  }
  return { descricao, itens };
}

let saida = '# Referência do código\n\n' +
  '> Gerado por `npm run docs` (ferramentas/documentar.js) a partir dos comentários do código. Não edite à mão.\n\n';
const pastas = ['src', 'ferramentas'];
for (const pasta of pastas) {
  for (const caminho of arquivosJs(join(raiz, pasta))) {
    const { descricao, itens } = lerModulo(caminho);
    /* caminho sempre com "/", também no Windows, para a referência sair igual em qualquer sistema */
    saida += '## `' + relative(raiz, caminho).split(sep).join('/') + '`\n\n' + (descricao ? descricao + '\n\n' : '');
    if (!itens.length) continue;
    saida += '| Nome | Tipo | Descrição |\n|---|---|---|\n';
    for (const item of itens) {
      const assinatura = item.parametros != null ? item.nome + '(' + item.parametros.replace(/\s+/g, ' ').trim() + ')' : item.nome;
      saida += '| `' + assinatura.replace(/\|/g, '\\|') + '` | ' + item.tipo + (item.exportado ? ' (exportada)' : '') + ' | ' + item.texto.replace(/\|/g, '\\|') + ' |\n';
    }
    saida += '\n';
  }
}
mkdirSync(join(raiz, 'docs'), { recursive: true });
writeFileSync(join(raiz, 'docs/REFERENCIA.md'), saida);
console.log('docs/REFERENCIA.md', saida.split('\n').length + ' linhas');
