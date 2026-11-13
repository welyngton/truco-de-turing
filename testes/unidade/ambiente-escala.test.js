/**
 * @file Testes de unidade do tamanho das partículas da frente do ambiente: numa tela pequena
 * (celular) elas crescem para manter o tamanho aparente do desktop; no desktop, nada muda.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instalarNavegadorFalso } from '../apoio/ambiente.js';

instalarNavegadorFalso();
const { escalaDaTela, ampliarParticulas } = await import('../../src/cenas/mesa/ambiente.js');

const cenaCom = (largura) => ({ scale: { displaySize: { width: largura } } });

describe('escala das partículas da frente', () => {
  it('desktop (mesa exibida com 1280 px ou mais): sem ampliação', () => {
    assert.equal(escalaDaTela(cenaCom(1280)), 1);
    assert.equal(escalaDaTela(cenaCom(1920)), 1);
    assert.equal(escalaDaTela({}), 1);
  });

  it('celular deitado: amplia na proporção da tela, até 1,8', () => {
    assert.ok(Math.abs(escalaDaTela(cenaCom(853)) - 1.5) < 0.01);
    assert.equal(escalaDaTela(cenaCom(640)), 1.8);
    assert.equal(escalaDaTela(cenaCom(400)), 1.8);
  });

  it('amplia scale, scaleX e scaleY (número, min/max e start/end) sem mexer no resto', () => {
    const base = { scale: { min: 0.5, max: 1 }, frequency: 90, alpha: { start: 0, end: 0.9 }, x: { min: 10, max: 20 } };
    const nova = ampliarParticulas(base, 2);
    assert.deepEqual(nova.scale, { min: 1, max: 2 });
    assert.deepEqual(nova.alpha, base.alpha);
    assert.deepEqual(nova.x, base.x);
    assert.equal(nova.frequency, 90);
    assert.deepEqual(base.scale, { min: 0.5, max: 1 }, 'não altera a configuração original');
    assert.deepEqual(ampliarParticulas({ scale: { start: 0.45, end: 0 } }, 2).scale, { start: 0.9, end: 0 });
    assert.equal(ampliarParticulas({ scale: 0.3 }, 2).scale, 0.6);
  });

  it('riscos só com scaleX ganham também espessura (scaleY)', () => {
    const nova = ampliarParticulas({ scaleX: { min: 1, max: 3 } }, 1.5);
    assert.deepEqual(nova.scaleX, { min: 1.5, max: 4.5 });
    assert.equal(nova.scaleY, 1.5);
    assert.deepEqual(ampliarParticulas({ scaleX: { min: 1, max: 2 }, scaleY: { min: 1, max: 1.2 } }, 2).scaleY, { min: 2, max: 2.4 });
  });

  it('com escala 1 devolve a mesma configuração', () => {
    const base = { scale: 1 };
    assert.equal(ampliarParticulas(base, 1), base);
  });
});
