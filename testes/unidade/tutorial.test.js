import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarTutorial, formatarTexto, rotuloDoId } from '../../src/nucleo/tutorial.js';
import { ROTEIRO, PASSOS, TODOS_OS_BLOQUEIOS } from '../../src/conteudo/roteiroDoTutorial.js';
import { TEXTOS } from '../../src/conteudo/textosDoTutorial.js';

const novo = () => criarTutorial(ROTEIRO, { textos: TEXTOS, nomes: ['Você', 'Zé do Ruído'] });

test('o roteiro inteiro roda por código e termina com 29 x 4', () => {
  const t = novo();
  const ids = t.rodarTudo();
  assert.equal(ids.length, PASSOS.length);
  assert.ok(t.terminou);
  assert.deepEqual(t.somas, [29, 4]);
  assert.equal(t.mao.resultado.vencedor, 0);
});

test('toda fala do roteiro formata sem erro em qualquer momento', () => {
  const t = novo();
  while (!t.terminou) {
    for (const id of Object.keys(TEXTOS)) assert.doesNotThrow(() => t.texto({ id }), id);
    if (t.ehDialogo()) t.proximo(); else if (t.ehDoRival()) t.jogarDoRival(); else t.jogar(t.jogadaDoPasso());
  }
});

test('as somas das falas batem com o que acontece (tunagem e overfit)', () => {
  const t = novo();
  while (t.passo.id !== 'tunagem-depois') t.ehDoRival() ? t.jogarDoRival() : t.ehDialogo() ? t.proximo() : t.jogar(t.jogadaDoPasso());
  assert.ok(t.somas[0] > t.somasAntes[0]);
  assert.match(t.texto(), new RegExp('de ' + t.somasAntes[0] + ' para ' + t.somas[0]));
  while (t.passo.id !== 'overfit-depois') t.ehDoRival() ? t.jogarDoRival() : t.ehDialogo() ? t.proximo() : t.jogar(t.jogadaDoPasso());
  assert.ok(t.somas[1] < t.somasAntes[1]);
  assert.match(t.texto(), new RegExp('de ' + t.somasAntes[1] + ' para ' + t.somas[1]));
});

test('todo passo tem fala, exceto as jogadas do rival sem comentário', () => {
  for (const p of PASSOS) assert.ok(p.id in TEXTOS, p.id);
  for (const [id, texto] of Object.entries(TEXTOS)) {
    assert.ok(PASSOS.some((p) => p.id === id), 'texto sem passo: ' + id);
    if (texto) assert.ok((texto.match(/[.!?](\s|$)/g) || []).length <= 3, id);
  }
});

test('jogada fora do roteiro é recusada e nada muda', () => {
  const t = novo();
  while (t.passo.id !== 'revelar') t.proximo();
  const antes = JSON.stringify(t.mao);
  const errada = { tipo: 'inicio', jogador: 0, carta: t.mao.jogadores[0].mao.find((c) => rotuloDoId(c.id) !== '5O').id };
  assert.equal(t.aceita(errada), false);
  assert.throws(() => t.jogar(errada), /Fora do roteiro/);
  assert.throws(() => t.jogar({ tipo: 'passar', jogador: 0 }), /Fora do roteiro/);
  assert.equal(JSON.stringify(t.mao), antes);
  assert.equal(t.passo.id, 'revelar');
});

test('permite: só libera o que a jogada esperada pede', () => {
  const t = novo();
  while (t.passo.id !== 'tunagem') t.ehDoRival() ? t.jogarDoRival() : t.ehDialogo() ? t.proximo() : t.jogar(t.jogadaDoPasso());
  assert.equal(t.permite({ tipo: 'carta', id: '10C' }), true);
  assert.equal(t.permite({ tipo: 'carta', id: 'QE' }), false);
  assert.equal(t.permite({ tipo: 'neuronio', id: 'C1N0' }), true);
  assert.equal(t.permite({ tipo: 'neuronio', id: 'C1N1' }), false);
  assert.equal(t.permite({ tipo: 'acao', id: 'tunagem' }), true);
  assert.equal(t.permite({ tipo: 'acao', id: 'overfit' }), false);
  assert.equal(t.permite({ tipo: 'acao', id: 'limpar' }), true);
  assert.equal(t.permite({ tipo: 'truco' }), false);
  assert.equal(t.permite({ tipo: 'regras' }), false);
  assert.deepEqual(t.destaques(), [{ carta: '10C' }]);
  assert.deepEqual(t.destaques(['10C']), [{ acao: 'tunagem' }, { neuronio: 'C1N0' }]);
});

test('em diálogo nada da mesa é liberado e o destaque vem do passo', () => {
  const t = novo();
  for (const e of [{ tipo: 'carta', id: '5O' }, { tipo: 'neuronio', id: 'C0N0' }, { tipo: 'acao', id: 'passar' }]) assert.equal(t.permite(e), false);
  assert.equal(t.proximo(), true);
  assert.deepEqual(t.passo.destaque, ['tabuleiro']);
  assert.deepEqual(t.destaques(), ['tabuleiro']);
  assert.ok(TODOS_OS_BLOQUEIOS.includes('regras'));
});

test('o rival só joga no passo dele e o avanço avisa os ouvintes', () => {
  const t = novo();
  assert.throws(() => t.jogarDoRival(), /Fora do roteiro/);
  const vistos = [];
  t.aoMudar((e) => vistos.push(e.tipo === 'fim' ? 'fim' : e.passo.id));
  t.rodarTudo();
  assert.equal(vistos.length, PASSOS.length);
  assert.equal(vistos.at(-1), 'fim');
});

test('formatarTexto preenche somas, rival e carta', () => {
  const t = novo();
  assert.equal(formatarTexto('{rival} tem {soma:1}', t), 'Zé do Ruído tem 0');
  assert.match(formatarTexto('{carta:10C}', t), /10/);
  assert.equal(formatarTexto('{antes:0} -> {soma:0}', t), '0 -> 0');
});

test('o tutorial não importa nada que grave estatística, conquista ou analytics', async () => {
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('../../src/nucleo/tutorial.js', import.meta.url), 'utf8');
  for (const linha of fonte.split('\n').filter((l) => /^import /.test(l))) assert.doesNotMatch(linha, /estatisticas|conquistas|analise|online|progresso/);
});
