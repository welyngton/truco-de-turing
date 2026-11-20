/**
 * @file Empacota o jogo num único arquivo HTML (CSS e JavaScript embutidos; Phaser e fontes via CDN).
 *
 * Saídas:
 * - dist/truco-de-turing.html: página completa, para abrir direto ou hospedar em qualquer lugar;
 * - dist/artifact.html: o mesmo conteúdo sem <html>/<head>/<body>, para publicar como artifact.
 *
 * Uso: `npm run build`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

/** Pasta do projeto. `TRUCO_RAIZ` permite rodar sobre uma cópia (usado nos testes). */
const raiz = process.env.TRUCO_RAIZ || join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => readFileSync(join(raiz, arquivo), 'utf8');

/* 1. junta todos os módulos de src/ num só script (IIFE); `Phaser` continua global */
const { outputFiles } = await build({
  entryPoints: [join(raiz, 'src/principal.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari14'],
  minify: false,
  sourcemap: process.env.MAPA ? 'inline' : false,
  legalComments: 'none',
  write: false,
});
const script = outputFiles[0].text.replace(/<\/script/g, '<\\/script');

/* 2. troca o CSS e o módulo de entrada pelos conteúdos embutidos */
const pagina = ler('index.html')
  .replace('<link rel="stylesheet" href="src/estilo.css">', () => '<style>\n' + ler('src/estilo.css') + '\n</style>')
  .replace('<script type="module" src="src/principal.js"></script>', () => '<script>\n' + script + '\n</script>');

/* 3. versão para artifact: só o miolo do cabeçalho e do corpo */
const trecho = (nome) => pagina.split('<!-- empacotar:' + nome + ' -->')[1].split('<!-- /empacotar:' + nome + ' -->')[0];
const artifact = trecho('cabecalho').replace('<title>', '<meta name="claude:viewport-fit-sides" content="cover">\n<title>') + trecho('corpo');

mkdirSync(join(raiz, 'dist'), { recursive: true });
writeFileSync(join(raiz, 'dist/truco-de-turing.html'), pagina);
writeFileSync(join(raiz, 'dist/artifact.html'), artifact);
console.log('dist/truco-de-turing.html', (pagina.length / 1024).toFixed(0) + ' KB');
