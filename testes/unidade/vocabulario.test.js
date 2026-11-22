/**
 * @file Testes do vocabulário final do jogo (issues #118 a #121, épico do tutorial e do menu):
 * Planície no lugar de "Mesa neutra", Livro de conceitos no lugar de "Glossário", "Aprender mais"
 * no lugar de "Ver o conceito" e "Detalhe da carta" no lugar de "Inspeção", e o ajuste de fonte
 * dos botões que não cabem.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TERRENOS } from '../../src/nucleo/terrenos.js';
import { novaMao } from '../../src/nucleo/partida.js';
import { NOME_DA_BIBLIOTECA } from '../../src/conteudo/grimorio.js';
import { ajustarFonteDoBotao, FONTE_MINIMA_DO_BOTAO } from '../../src/interface/ajusteDeBotoes.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Todos os arquivos de texto de uma pasta, sem entrar em node_modules. */
function arquivos(pasta, extensoes) {
  const achados = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) { if (nome !== 'node_modules') achados.push(...arquivos(caminho, extensoes)); continue; }
    if (extensoes.some((e) => nome.endsWith(e))) achados.push(caminho);
  }
  return achados;
}

describe('Planície (#118)', () => {
  it('o terreno de id `neutro` se chama Planície e o resumo combina com o nome', () => {
    assert.equal(TERRENOS.neutro.nome, 'Planície');
    assert.match(TERRENOS.neutro.resumo, /^Sem efeito\./);
    assert.match(TERRENOS.neutro.resumo, /Planície/);
  });
  it('o id interno `neutro` continua valendo para partidas e salas', () => {
    assert.equal(novaMao({ terreno: 'neutro', semente: 1, jogadores: [{ nome: 'A' }, { nome: 'B' }] }).config.terreno, 'neutro');
  });
});

describe('texto antigo fora do código, dos testes e dos manuais', () => {
  const textos = [...arquivos(join(RAIZ, 'src'), ['.js', '.css']), ...arquivos(join(RAIZ, 'testes'), ['.js']), join(RAIZ, 'README.md'), join(RAIZ, 'docs', 'MANUAL.md')]
    .filter((f) => !f.endsWith('vocabulario.test.js'));
  for (const [nome, regex] of [['"Mesa neutra"', /mesa neutra/i], ['"Glossário"', /glossário/i], ['"Ver o conceito"', /ver o conceito/i]]) {
    it('nenhum arquivo cita ' + nome + ' (o id de analytics `glossario` não tem acento e fica)', () => {
      const achados = textos.filter((f) => regex.test(readFileSync(f, 'utf8')));
      assert.deepEqual(achados.map((f) => f.slice(RAIZ.length)), []);
    });
  }
  it('o título do painel da carta ampliada é "Detalhe da carta", e "Inspeção" não aparece como texto da tela', () => {
    const cenario = readFileSync(join(RAIZ, 'src/cenas/mesa/cenario.js'), 'utf8');
    assert.match(cenario, /TITULO_DO_DETALHE = 'DETALHE DA CARTA'/);
    assert.doesNotMatch(cenario, /'INSPEÇÃO'/);
    assert.doesNotMatch(readFileSync(join(RAIZ, 'src/cenas/mesa/turnos.js'), 'utf8'), /inspecioná-la/);
  });
});

describe('Livro de conceitos (#120)', () => {
  it('o nome da tela é Livro de conceitos', () => assert.equal(NOME_DA_BIBLIOTECA, 'Livro de conceitos'));
});

describe('ajustarFonteDoBotao (#121)', () => {
  /** Botão de mentira: o texto tem `largura` px e cabe quando a fonte vezes `larguraPorPixel` é no máximo `clientWidth`. */
  function botaoFalso({ clientWidth, fonte, larguraPorPixel }) {
    const botao = {
      isConnected: true, clientWidth, style: { fontSize: '' },
      get scrollWidth() { return Math.max(clientWidth, parseFloat(this.style.fontSize || fonte) * larguraPorPixel); },
    };
    return botao;
  }
  it('reduz a fonte até o texto caber e nunca passa do mínimo', () => {
    globalThis.getComputedStyle = (b) => ({ fontSize: (b.style.fontSize || '13px') });
    const largo = botaoFalso({ clientWidth: 100, fonte: '13px', larguraPorPixel: 10 });
    const tamanho = ajustarFonteDoBotao(largo);
    assert.ok(tamanho <= 10 && tamanho > 9, 'cabe a 10 px: ' + tamanho);
    assert.ok(largo.scrollWidth <= largo.clientWidth + 1);
    const impossivel = botaoFalso({ clientWidth: 20, fonte: '13px', larguraPorPixel: 10 });
    assert.equal(ajustarFonteDoBotao(impossivel), FONTE_MINIMA_DO_BOTAO);
    const cabe = botaoFalso({ clientWidth: 200, fonte: '13px', larguraPorPixel: 10 });
    assert.equal(ajustarFonteDoBotao(cabe), 13);
    assert.equal(cabe.style.fontSize, '', 'o botão que já cabe não recebe fonte própria');
    assert.equal(ajustarFonteDoBotao({ isConnected: false }), 0, 'botão fora da página é ignorado');
    delete globalThis.getComputedStyle;
  });
});

describe('transfer learning (issue #122)', () => {
  it('o botão da barra se chama "Transfer learning" (em duas linhas, como "Early stop")', async () => {
    /* o layout importa a configuração do navegador, então o teste lê o texto do arquivo */
    const layout = readFileSync(join(RAIZ, 'src/cenas/mesa/layout.js'), 'utf8');
    assert.match(layout, /\['transfer', 'Transfer\\nlearning', 1\]/);
    assert.match(layout, /transfer: 'Transfer learning'/);
  });

  it('os textos dizem "uma vez por partida", como o motor (transferUsed), e nunca "por mão"', () => {
    for (const arquivo of ['src/cenas/mesa/entrada.js', 'src/cenas/mesa/dicas.js', 'src/conteudo/textosDoTutorial.js', 'src/interface/telas/ajudaDasAcoes.js']) {
      const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
      assert.ok(!/transfer[^\n]*(por mão|nesta mão)/i.test(texto), arquivo + ' ainda fala em "por mão"');
    }
    assert.match(readFileSync(join(RAIZ, 'src/cenas/mesa/dicas.js'), 'utf8'), /Uma vez por partida; não gasta o turno/);
  });
});

describe('baralho Power Bee-Ai (issues #128 e #129)', () => {
  it('o nome é "Power Bee-Ai" na interface e no motor, mas o id interno continua powerbi', async () => {
    const { BARALHOS } = await import('../../src/nucleo/baralhos.js');
    const decks = await import('../../src/motor/engine/decks.js');
    assert.equal(BARALHOS.powerbi.nome, 'Power Bee-Ai');
    assert.equal(decks.powerbi.id, 'powerbi');
    assert.equal(decks.powerbi.name, 'Power Bee-Ai');
  });

  it('nenhum texto do jogo, da documentação ou dos testes cita "Power BI" (a marca de outra empresa)', () => {
    const achados = [];
    for (const pasta of ['src', 'docs', 'testes']) {
      for (const arquivo of arquivos(join(RAIZ, pasta), ['.js', '.md', '.html', '.json'])) {
        if (/power bi/i.test(readFileSync(arquivo, 'utf8'))) achados.push(arquivo.replace(RAIZ, ''));
      }
    }
    if (/power bi/i.test(readFileSync(join(RAIZ, 'README.md'), 'utf8'))) achados.push('/README.md');
    /* este arquivo cita o nome antigo de propósito, ao procurá-lo */
    assert.deepEqual(achados.filter((a) => !a.endsWith('vocabulario.test.js')), []);
  });

  it('o aviso do baralho não fala em "dashboard" e o verso é desenhado por versoPowerBeeAi, sem a palavra DASHBOARD', () => {
    const efeitos = readFileSync(join(RAIZ, 'src/cenas/mesa/efeitos.js'), 'utf8');
    assert.ok(!/dashboard/i.test(efeitos));
    const versos = readFileSync(join(RAIZ, 'src/arte/versos.js'), 'utf8');
    assert.match(versos, /function versoPowerBeeAi\(/);
    assert.ok(!/versoPowerBI|DASHBOARD/.test(versos));
    assert.match(versos, /POWER BEE-AI/);
  });
});
