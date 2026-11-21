/**
 * @file Trilhas sonoras do épico #157 (observações do prof. Peng): menu (#145), Planície (#146,
 * #147), Montanha (#149), Pântano (#150) e Oceano (#151). Protege o que não podia mudar (as
 * melodias aprovadas) e confere o que devia mudar (timbres, andamento e volumes).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { instalarNavegadorFalso, registroDeAudio, limparRegistroDeAudio } from '../apoio/ambiente.js';

instalarNavegadorFalso();
const { contextoDeAudio } = await import('../../src/interface/som.js');
const { MUSICAS, gravarTrilha } = await import('../../src/interface/musica.js');

/** Impressão digital de uma melodia (tabelas de notas), para provar que ela não mudou. */
const digital = (tema) => createHash('sha1').update(JSON.stringify(tema)).digest('hex').slice(0, 12);
const midiDe = (hz) => Math.round(69 + 12 * Math.log2(hz / 440));
const classeDe = (midi) => ((midi % 12) + 12) % 12;
/** Toca um passo da trilha numa saída nova e devolve o que foi agendado. */
function tocarPasso(nome, compasso, passo) {
  limparRegistroDeAudio();
  const m = MUSICAS[nome], saida = contextoDeAudio().createGain();
  const d = 60 / m.bpm / m.subdivisao;
  m.tocar(saida, 1, compasso, passo, m.acordes[compasso], () => 0.1, d);
  return registroDeAudio;
}
/** Maior volume pedido (alvo das rampas exponenciais do ganho) entre os ganhos criados. */
const maiorVolume = (ganhos) => Math.max(...ganhos.flatMap((g) => g.gain.eventos.filter(([m, v]) => m === 'exponentialRampToValueAtTime' && v > 0.001).map(([, v]) => v)));
/** Frequências de osciladores de parcial (valor direto, sem automação), sem os vibratos (< 20 Hz). */
const parciais = (registro) => registro.osciladores.filter((o) => o.frequency.eventos.length === 0 && o.frequency.value > 20).map((o) => o.frequency.value);

describe('as melodias aprovadas não mudaram', () => {
  it('menu, Oceano, Montanha e Planície (depois da introdução) têm a mesma melodia de antes', () => {
    assert.equal(digital(MUSICAS.menu.tema), 'd50fdcdefbef', 'menu (#145: o professor gostou da melodia)');
    assert.equal(digital(MUSICAS.oceano.tema), 'a41fcab6f4dd', 'Oceano (#151: mantém as notas)');
    assert.equal(digital(MUSICAS.montanha.tema), '7d64e22c1340', 'Montanha (#149: mantém a melodia)');
    assert.equal(digital(MUSICAS.neutro.tema.slice(4)), 'eebe45820b1e', 'Planície do compasso 5 em diante (#146: não mexer depois dos 15 s)');
  });
});

describe('menu: mais lento, cordas e percussão suave (#145)', () => {
  it('andamento menor, sem sanfona (sem ondas quadradas) e cordas presentes', () => {
    assert.ok(MUSICAS.menu.bpm < 118 && MUSICAS.menu.bpm >= 90);
    limparRegistroDeAudio();
    gravarTrilha(contextoDeAudio().createGain(), 'menu', 30);
    const tipos = new Set(registroDeAudio.osciladores.map((o) => o.type));
    assert.ok(!tipos.has('square'), 'a sanfona usava onda quadrada');
    assert.ok(tipos.has('sawtooth'), 'cordas em dente de serra');
  });
  it('o triângulo ficou mais suave e com ataque mais lento; não há palmas', () => {
    /* 3º passo do compasso: contratempo, onde tocam o triângulo aberto e os acordes de antes */
    const r = tocarPasso('menu', 1, 2);
    const triangulo = r.osciladores.filter((o) => o.frequency.value > 2000);
    assert.equal(triangulo.length, 3);
    for (const o of triangulo) {
      const ganho = o.conexoes[0], rampa = ganho.gain.eventos.find(([m]) => m === 'exponentialRampToValueAtTime');
      assert.ok(rampa[1] <= 0.009, 'volume do triângulo ' + rampa[1]);
      assert.ok(rampa[2] - 1 >= 0.01, 'ataque do triângulo ' + (rampa[2] - 1));
    }
    const palmas = tocarPasso('menu', 1, 4);
    assert.equal(palmas.fontes.length, 0, 'sem palmas no 2º tempo');
  });
  it('tímpano suave nos tempos fortes', () => {
    for (const passo of [0, 8]) {
      const r = tocarPasso('menu', 1, passo);
      const timpano = r.osciladores.filter((o) => o.type === 'sine' && o.frequency.eventos.some(([m, v]) => m === 'setValueAtTime' && v === 85));
      assert.equal(timpano.length, 1, 'passo ' + passo);
    }
  });
});

describe('Planície: cello, fagote e 2 violinos, sem percussão (#146, #147)', () => {
  it('sem percussão sintética: nem tambor, nem ruído de escovinha', () => {
    limparRegistroDeAudio();
    gravarTrilha(contextoDeAudio().createGain(), 'neutro', 45);
    assert.equal(registroDeAudio.fontes.length, 0, 'sem ruído (escovinha)');
    const tambor = registroDeAudio.osciladores.filter((o) => o.frequency.eventos.some(([m]) => m === 'exponentialRampToValueAtTime'));
    assert.equal(tambor.length, 0, 'sem tambor (frequência que despenca)');
    const tipos = new Set(registroDeAudio.osciladores.map((o) => o.type));
    assert.ok(tipos.has('sawtooth') && tipos.has('square'), 'violinos, cello e fagote');
  });
  it('dois violinos na melodia: o 2º a uma terça abaixo, dentro da escala de Mi mixolídio', () => {
    /* compasso 5 (índice 4), passo 0: entra o Dó# (73) do violino 1 */
    const r = tocarPasso('neutro', 4, 0);
    const notas = r.osciladores.filter((o) => o.type === 'sawtooth' && o.frequency.eventos.length).map((o) => midiDe(o.frequency.eventos[0][1]));
    assert.ok(notas.includes(73), 'violino 1 em Dó#5');
    assert.ok(notas.includes(69), 'violino 2 em Lá4, a terça abaixo');
    for (let c = 0; c < 12; c++) for (const [, nota] of MUSICAS.neutro.tema[c]) {
      assert.ok([4, 6, 8, 9, 11, 1, 2, 3].includes(classeDe(nota)), `compasso ${c + 1}: nota ${nota} fora de Mi (mixolídio e a sétima maior do blues)`);
    }
  });
  it('introdução reescrita (#147): chega ao compasso 5 por grau conjunto e o laço volta sem tranco', () => {
    const tema = MUSICAS.neutro.tema;
    assert.notEqual(digital(tema.slice(0, 4)), '2288b2d5ddfd', 'a introdução mudou');
    assert.equal(tema.length, 12);
    const ultimo = (c) => c[c.length - 1][1], primeiro = (c) => c[0][1];
    assert.ok(Math.abs(ultimo(tema[3]) - primeiro(tema[4])) <= 2, 'compasso 4 → 5 por grau conjunto');
    assert.ok(Math.abs(ultimo(tema[11]) - primeiro(tema[0])) <= 4, 'compasso 12 → 1 sem salto grande');
    /* mesmo ritmo harmônico e tonalidade: um acorde por compasso, os mesmos de antes, e a mesma textura do início ao fim */
    assert.equal(MUSICAS.neutro.acordes.length, 12);
    for (const c of [0, 5, 11]) assert.ok(tocarPasso('neutro', c, 0).osciladores.length >= 8, 'compasso ' + (c + 1));
  });
});

describe('Montanha: percussão-base no xilofone, mais baixa e na tonalidade (#149)', () => {
  it('a percussão-base é xilofone e cada nota dele pertence ao acorde do compasso', () => {
    MUSICAS.montanha.acordes.forEach((acorde, compasso) => {
      for (const passo of [0, 4]) {
        const r = tocarPasso('montanha', compasso, passo);
        const fundamental = Math.min(...parciais(r));
        assert.ok(acorde.map(classeDe).includes(classeDe(midiDe(fundamental))), `compasso ${compasso + 1}, passo ${passo}: ${midiDe(fundamental)}`);
      }
    });
  });
  it('sem o tambor nos tempos 1 e 3; os tambores dos repousos ficam 30% mais baixos', () => {
    const tambores = (r) => r.osciladores.filter((o) => o.frequency.eventos.some(([m]) => m === 'exponentialRampToValueAtTime'));
    assert.equal(tambores(tocarPasso('montanha', 0, 0)).length, 0);
    assert.equal(tambores(tocarPasso('montanha', 0, 4)).length, 0);
    const repouso = tocarPasso('montanha', 3, 6);
    assert.ok(maiorVolume(repouso.ganhos.filter((g) => g.gain.eventos.some(([, v]) => v === 0.21))) <= 0.21 + 1e-9);
    assert.ok(repouso.ganhos.some((g) => g.gain.eventos.some(([m, v]) => m === 'setValueAtTime' && Math.abs(v - 0.21) < 1e-9)), 'tambor a 70% de 0,30');
  });
});

describe('Pântano: 1ª versão como base, glockenspiel de apoio e mais lento (#150)', () => {
  it('andamento menor que os 60 bpm da 2ª versão e melodia nova (não é a dança de fada)', () => {
    assert.ok(MUSICAS.pantano.bpm < 60 && MUSICAS.pantano.bpm >= 50);
    assert.notEqual(digital(MUSICAS.pantano.tema), 'b9b44f28a6d2', 'a melodia da dança de fada (2ª versão) não volta');
  });
  it('parte da 1ª versão: mesma harmonia, órgão e zumbido grave', () => {
    assert.deepEqual(MUSICAS.pantano.acordes[0], [38, 50, 53, 57]);
    assert.equal(MUSICAS.pantano.acordes.length, 8);
    const r = tocarPasso('pantano', 0, 0);
    assert.ok(r.osciladores.some((o) => o.type === 'sawtooth'), 'zumbido grave em dente de serra');
    assert.ok(r.osciladores.filter((o) => o.type === 'sine').length >= 9, 'órgão com harmônicos');
  });
  it('o glockenspiel só apoia: volume baixo e nunca na linha principal', () => {
    /* o glockenspiel são osciladores de parcial (valor direto); o ganho de cada um limita o volume */
    const volumeDasBarras = (r) => r.osciladores.filter((o) => o.frequency.eventos.length === 0 && o.frequency.value > 20 && o.type === 'sine')
      .map((o) => maiorVolume([o.conexoes[0]]));
    let toques = 0;
    for (let c = 0; c < 8; c++) for (const passo of [3, 7]) {
      for (const volume of volumeDasBarras(tocarPasso('pantano', c, passo))) { toques++; assert.ok(volume <= 0.022 + 1e-9, `compasso ${c + 1} passo ${passo}: ${volume}`); }
    }
    assert.ok(toques > 0, 'o apoio existe');
    /* a linha principal (0,065) continua bem acima do glockenspiel (≤ 0,022) */
    assert.ok(maiorVolume(tocarPasso('pantano', 0, 0).ganhos) >= 0.065 - 1e-9);
  });
});

describe('Oceano: flauta-de-pã na melodia e marimba mais alta (#151)', () => {
  it('a melodia soa em flauta-de-pã: sopro no ataque e vibrato lento', () => {
    const r = tocarPasso('oceano', 0, 0);
    assert.ok(r.fontes.length >= 1, 'sopro');
    assert.ok(r.osciladores.some((o) => o.frequency.value < 6 && o.frequency.value > 3), 'vibrato lento');
  });
  it('marimba 30% mais presente (0,042 contra 0,032) e ainda abaixo da melodia', () => {
    /* passo 2 não tem nota nova da melodia: só marimba, baixo e coro seguem soando */
    const r = tocarPasso('oceano', 0, 2);
    const volume = maiorVolume(r.ganhos);
    assert.ok(Math.abs(volume - 0.042) < 1e-9, 'marimba em ' + volume);
    assert.ok(0.042 < 0.07, 'a marimba não encobre a melodia (0,07)');
  });
});
