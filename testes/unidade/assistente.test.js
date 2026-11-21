/**
 * @file Testes do posicionamento do balão do Percy (issue #138): em telas de celular e de
 * computador, com destaques grandes e pequenos, o balão nunca sai da tela e, havendo lugar, nunca
 * cobre um destaque.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instalarNavegadorFalso } from '../apoio/ambiente.js';

instalarNavegadorFalso();
const { posicionarBalao, contornoDaCamada } = await import('../../src/interface/assistente.js');

const TELAS = [{ l: 640, a: 360 }, { l: 844, a: 390 }, { l: 1280, a: 800 }];
/** Tamanhos possíveis do balão, do preferido ao menor (altura cresce quando a largura diminui, como o texto quebra). */
const tamanhosDe = (tela, linhas = 4) => [340, 260, 210, 170, 140].filter((l) => l <= tela.l - 16).map((l) => ({ l, a: 70 + Math.ceil((linhas * 340) / l) * 17 }));
const cobre = (b, r) => b.x < r.x + r.l && b.x + b.l > r.x && b.y < r.y + r.a && b.y + b.a > r.y;
/** Destaques de exemplo, em proporção da tela (a mesa é 1280x720). */
const destaquesDe = (t) => {
  const k = t.l / 1280, ky = t.a / 720;
  const R = (x, y, l, a) => ({ x: x * k, y: y * ky, l: l * k, a: a * ky });
  return {
    'tabuleiro': [R(262, 100, 690, 468)], 'mao': [R(250, 600, 720, 110)], 'limbo e cemitério': [R(10, 380, 240, 110)],
    'placar do rival': [R(962, 64, 310, 102)], 'um neurônio': [R(520, 150, 60, 84)], 'ações': [R(962, 570, 310, 100)],
    'carta e neurônio': [R(560, 620, 62, 86), R(480, 250, 60, 84)], 'botão de ação e neurônio': [R(1100, 570, 70, 46), R(700, 330, 60, 84)],
  };
};

describe('posicionarBalao', () => {
  for (const tela of TELAS) {
    for (const [nome, alvos] of Object.entries(destaquesDe(tela))) {
      it(tela.l + 'x' + tela.a + ': ' + nome + ' (balão inteiro na tela e sem cobrir o destaque)', () => {
        for (const linhas of [2, 4, 6]) {
          const p = posicionarBalao(tela, tamanhosDe(tela, linhas), alvos);
          assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.l <= tela.l && p.y + p.a <= tela.a, 'dentro da tela: ' + JSON.stringify(p));
          assert.equal(p.livre, !alvos.some((r) => cobre(p, r)), 'livre diz a verdade');
          if (tela.l >= 844 || linhas <= 4) assert.ok(p.livre, 'havia lugar sem cobrir: ' + JSON.stringify(p) + ' linhas ' + linhas);
        }
      });
    }
  }
  it('sem destaques, vai para a tela (embaixo, no centro)', () => {
    const p = posicionarBalao({ l: 1280, a: 800 }, [{ l: 340, a: 120 }], []);
    assert.equal(p.lado, 'tela-baixo');
    assert.ok(p.livre);
  });
  it('quando nada cabe, devolve o que cobre menos e avisa com livre=false', () => {
    const tela = { l: 300, a: 200 };
    const p = posicionarBalao(tela, [{ l: 280, a: 180 }], [{ x: 0, y: 0, l: 300, a: 200 }]);
    assert.equal(p.livre, false);
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.l <= tela.l && p.y + p.a <= tela.a);
  });
  it('contornoDaCamada cobre a tela e abre um buraco por destaque', () => {
    const d = contornoDaCamada({ l: 100, a: 50 }, [{ x: 10, y: 5, l: 20, a: 10 }, { x: 60, y: 20.4, l: 10, a: 10 }]);
    assert.equal(d, 'M0 0H100V50H0ZM10 5h20v10h-20ZM60 20h10v10h-10Z');
  });
});
