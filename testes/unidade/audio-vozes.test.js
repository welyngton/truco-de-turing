/**
 * @file Timbres novos das trilhas (issues #144 e #148, no épico #157): violino, violoncelo, fagote,
 * xilofone e flauta-de-pã existem, ficam na faixa do instrumento e não quebram nem sem áudio.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instalarNavegadorFalso, registroDeAudio, limparRegistroDeAudio } from '../apoio/ambiente.js';

instalarNavegadorFalso();
const { contextoDeAudio } = await import('../../src/interface/som.js');
const { VOZES } = await import('../../src/interface/musica.js');

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const saidaNova = () => { limparRegistroDeAudio(); return contextoDeAudio().createGain(); };
/** Frequência de um oscilador: a automação `setValueAtTime` (notas) ou o valor direto (parciais e vibrato). */
const frequenciaDe = (o) => {
  const definida = o.frequency.eventos.find(([metodo]) => metodo === 'setValueAtTime');
  return definida ? definida[1] : o.frequency.value;
};
const frequencias = () => registroDeAudio.osciladores.map(frequenciaDe);

describe('timbres novos (#144, #148)', () => {
  it('os cinco timbres existem e cada um agenda osciladores', () => {
    assert.deepEqual(Object.keys(VOZES).sort(), ['fagote', 'flautaDePa', 'violino', 'violoncelo', 'xilofone']);
    for (const [nome, tocar] of Object.entries(VOZES)) {
      const saida = saidaNova();
      assert.doesNotThrow(() => tocar(saida, 1, 60, 0.8), nome);
      assert.ok(registroDeAudio.osciladores.length >= 2, nome);
      for (const o of registroDeAudio.osciladores) assert.ok(o.fim > o.inicio, nome + ': oscilador termina depois de começar');
    }
  });

  it('cordas e fagote: notas fora da faixa vão para a oitava certa', () => {
    const faixas = { violino: [55, 100], violoncelo: [36, 81], fagote: [34, 75] };
    for (const [nome, [minimo, maximo]] of Object.entries(faixas)) {
      for (const midi of [20, 30, 60, 90, 110]) {
        const saida = saidaNova();
        VOZES[nome](saida, 1, midi, 0.5);
        const fundamental = Math.min(...frequencias().filter((f) => f > 20));
        assert.ok(fundamental >= hz(minimo) - 0.01 && fundamental <= hz(maximo) + 0.01, `${nome} midi ${midi}: ${fundamental.toFixed(1)} Hz`);
      }
    }
  });

  it('violino é mais agudo que violoncelo e fagote para a mesma nota-alvo de cada naipe', () => {
    const fundamentalDe = (nome, midi) => { VOZES[nome](saidaNova(), 1, midi, 0.5); return Math.min(...frequencias().filter((f) => f > 20)); };
    assert.ok(fundamentalDe('violino', 40) > fundamentalDe('violoncelo', 40), 'violino sobe para a sua faixa');
    assert.ok(fundamentalDe('fagote', 36) < fundamentalDe('violino', 36));
  });

  it('xilofone é seco (decai rápido) e flauta-de-pã tem sopro e vibrato lento', () => {
    VOZES.xilofone(saidaNova(), 1, 72);
    const duracaoXilofone = Math.max(...registroDeAudio.osciladores.map((o) => o.fim - 1));
    assert.ok(duracaoXilofone < 0.6, 'xilofone: ' + duracaoXilofone);
    assert.ok(registroDeAudio.fontes.length >= 1, 'xilofone: toque da baqueta');

    VOZES.flautaDePa(saidaNova(), 1, 72, 1);
    assert.ok(registroDeAudio.fontes.length >= 1, 'flauta-de-pã: sopro no ataque');
    const lfo = registroDeAudio.osciladores.find((o) => frequenciaDe(o) < 6);
    assert.ok(lfo, 'flauta-de-pã: vibrato lento (abaixo de 5 Hz)');
  });
});
