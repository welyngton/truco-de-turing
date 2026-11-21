/**
 * @file Música de fundo sintetizada com WebAudio: uma trilha para o menu e uma para cada terreno.
 *
 * | Trilha              | Estilo                                                        | Andamento    |
 * |---------------------|---------------------------------------------------------------|--------------|
 * | menu                | baião épico em Sol: cordas, tímpano, zabumba e triângulo suaves; refrão que convida a jogar | 100 bpm |
 * | neutro (Planície)   | blues lento em Mi: dois violinos no tema, violoncelo e fagote no apoio | 72 bpm     |
 * | oceano              | valsa em Sol: flauta-de-pã no tema, marimba ao fundo, coro nos repousos | 63 bpm (3/4) |
 * | montanha            | épica em Lá menor: trompa, harpa ao fundo, xilofone na base e tambores nos repousos | 84 bpm |
 * | pantano             | lamento sombrio em Ré menor: órgão, zumbido grave, sino e glockenspiel de apoio | 54 bpm |
 *
 * Cada trilha é um laço de compassos com acordes, baixo, acompanhamento, melodia e percussão. As
 * melodias são compostas (uma tabela de notas por compasso), então o laço sempre se repete igual e
 * o tema fica na cabeça. Um agendador olha 0,4 s à frente e marca as notas no relógio do WebAudio.
 */
import { contextoDeAudio } from './som.js';

/** Volume geral da música (baixo, para não brigar com os efeitos). */
const VOLUME = 0.55;
/** Quanto tempo à frente as notas são agendadas, em segundos. */
const ANTECEDENCIA = 0.4;

/** Frequência de uma nota MIDI (69 = Lá 440 Hz). */
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** Gerador reprodutível (mesmo compasso, mesma melodia). */
function sorteador(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ======================================================================== vozes */

/**
 * Toca uma nota com envelope (ataque, sustentação, liberação), filtro passa-baixa opcional e
 * vibrato opcional.
 */
function voz(saida, tempo, midi, duracao, { forma = 'triangle', volume = 0.1, ataque = 0.01, liberacao = 0.15, filtro = 0, vibrato = 0, desafinar = 0, vibratoHz = 5 } = {}) {
  const a = saida.context;
  const osc = a.createOscillator(), ganho = a.createGain();
  osc.type = forma;
  osc.frequency.setValueAtTime(hz(midi), tempo);
  osc.detune.setValueAtTime(desafinar, tempo);
  let no = osc;
  if (filtro) {
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro; f.Q.value = 0.7;
    osc.connect(f); no = f;
  }
  if (vibrato) {
    const lfo = a.createOscillator(), profundidade = a.createGain();
    lfo.frequency.value = vibratoHz; profundidade.gain.value = vibrato;
    lfo.connect(profundidade); profundidade.connect(osc.detune);
    lfo.start(tempo); lfo.stop(tempo + duracao + liberacao + 0.05);
  }
  ganho.gain.setValueAtTime(0.0001, tempo);
  ganho.gain.exponentialRampToValueAtTime(volume, tempo + ataque);
  ganho.gain.setValueAtTime(volume, tempo + Math.max(ataque, duracao - 0.02));
  ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + duracao + liberacao);
  no.connect(ganho); ganho.connect(saida);
  osc.start(tempo); osc.stop(tempo + duracao + liberacao + 0.05);
}

/** Ruído filtrado: chimbal, prato, ondas do mar. */
function chiado(saida, tempo, duracao, { volume = 0.05, filtro = 8000, tipo = 'highpass', ataque = 0.002 } = {}) {
  const a = saida.context;
  const buffer = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * duracao)), a.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
  const fonte = a.createBufferSource(); fonte.buffer = buffer;
  const f = a.createBiquadFilter(); f.type = tipo; f.frequency.value = filtro;
  const ganho = a.createGain();
  ganho.gain.setValueAtTime(0.0001, tempo);
  ganho.gain.exponentialRampToValueAtTime(volume, tempo + ataque);
  ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + duracao);
  fonte.connect(f); f.connect(ganho); ganho.connect(saida);
  fonte.start(tempo); fonte.stop(tempo + duracao + 0.02);
}

/** Tambor grave (bumbo, taiko): seno que despenca de frequência. */
function tambor(saida, tempo, { volume = 0.35, de = 110, para = 42, duracao = 0.45 } = {}) {
  const a = saida.context;
  const osc = a.createOscillator(), ganho = a.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(de, tempo);
  osc.frequency.exponentialRampToValueAtTime(para, tempo + duracao * 0.8);
  ganho.gain.setValueAtTime(volume, tempo);
  ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + duracao);
  osc.connect(ganho); ganho.connect(saida);
  osc.start(tempo); osc.stop(tempo + duracao + 0.05);
}

/** Sino: parciais inarmônicas que somem devagar. */
function sino(saida, tempo, midi, volume = 0.06) {
  for (const [razao, peso, dur] of [[1, 1, 3.5], [2.76, 0.5, 2.2], [5.4, 0.25, 1.2], [0.5, 0.4, 4]]) {
    const a = saida.context, osc = a.createOscillator(), ganho = a.createGain();
    osc.type = 'sine'; osc.frequency.value = hz(midi) * razao;
    ganho.gain.setValueAtTime(0.0001, tempo);
    ganho.gain.exponentialRampToValueAtTime(volume * peso, tempo + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + dur);
    osc.connect(ganho); ganho.connect(saida);
    osc.start(tempo); osc.stop(tempo + dur + 0.05);
  }
}

/** Harpa: corda dedilhada que soa e some devagar. */
function harpa(saida, tempo, midi, volume = 0.04) {
  voz(saida, tempo, midi, 0.04, { forma: 'triangle', volume, ataque: 0.004, liberacao: 1.3, filtro: 3000 });
  voz(saida, tempo, midi + 12, 0.03, { forma: 'sine', volume: volume * 0.3, ataque: 0.004, liberacao: 0.8 });
}

/** Glockenspiel e caixinha de música: barra de metal, ataque seco e brilho agudo. */
function glockenspiel(saida, tempo, midi, volume = 0.05) {
  for (const [razao, peso, dur] of [[1, 1, 1.3], [2.0, 0.18, 0.5], [3.9, 0.22, 0.25]]) {
    const a = saida.context, osc = a.createOscillator(), ganho = a.createGain();
    osc.type = 'sine'; osc.frequency.value = hz(midi) * razao;
    ganho.gain.setValueAtTime(0.0001, tempo);
    ganho.gain.exponentialRampToValueAtTime(volume * peso, tempo + 0.004);
    ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + dur);
    osc.connect(ganho); ganho.connect(saida);
    osc.start(tempo); osc.stop(tempo + dur + 0.05);
  }
}

/** Marimba: tecla de madeira, grave arredondado e um harmônico que some rápido. */
function marimba(saida, tempo, midi, volume = 0.05) {
  voz(saida, tempo, midi, 0.02, { forma: 'sine', volume, ataque: 0.003, liberacao: 0.45 });
  voz(saida, tempo, midi + 24, 0.01, { forma: 'sine', volume: volume * 0.25, ataque: 0.002, liberacao: 0.1 });
}

/** Triângulo do forró: barra de metal aguda; fechado é um toque curto, aberto soa mais. */
function triangulo(saida, tempo, aberto, volume = 0.02, ataque = 0.002) {
  const dur = aberto ? 0.35 : 0.06;
  for (const [freq, peso] of [[2637, 1], [6900, 0.45], [9100, 0.25]]) {
    const a = saida.context, osc = a.createOscillator(), ganho = a.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    ganho.gain.setValueAtTime(0.0001, tempo);
    ganho.gain.exponentialRampToValueAtTime(volume * peso * (aberto ? 1 : 0.6), tempo + ataque);
    ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + dur);
    osc.connect(ganho); ganho.connect(saida);
    osc.start(tempo); osc.stop(tempo + dur + 0.05);
  }
}

/** Palmas: estalo de ruído em banda média, com um eco curtinho. */
function palmas(saida, tempo, volume = 0.05) {
  chiado(saida, tempo, 0.09, { volume, filtro: 1400, tipo: 'bandpass' });
  chiado(saida, tempo + 0.012, 0.07, { volume: volume * 0.6, filtro: 1800, tipo: 'bandpass' });
}

/** Coro (pad): acorde de senoides que entra e sai devagar e passa um pouco do compasso. */
function coro(saida, tempo, notas, duracao, volume = 0.018) {
  for (const n of notas) voz(saida, tempo, n, duracao, { forma: 'sine', volume, ataque: duracao * 0.3, liberacao: duracao * 0.35, vibrato: 3 });
}

/** Leva a nota para dentro da faixa do instrumento, subindo ou descendo oitavas inteiras. */
function naFaixa(midi, minimo, maximo) {
  while (midi < minimo) midi += 12;
  while (midi > maximo) midi -= 12;
  return midi;
}

/**
 * Violino: arco sobre corda, dente de serra suavizado, ataque lento, vibrato leve e duas cordas
 * levemente desafinadas (o "coro" de um naipe). Faixa de Sol3 a Mi7.
 */
function violino(saida, tempo, midi, duracao, volume = 0.04, ataque = 0.09) {
  const nota = naFaixa(midi, 55, 100);
  const base = { forma: 'sawtooth', ataque, liberacao: 0.22, filtro: 3400, vibrato: 14, vibratoHz: 5.5 };
  voz(saida, tempo, nota, duracao, { ...base, volume, desafinar: -6 });
  voz(saida, tempo + 0.012, nota, duracao, { ...base, volume: volume * 0.7, desafinar: 7 });
}

/**
 * Violoncelo: arco largo, mais grave e escuro que o violino, ataque mais lento e vibrato fundo.
 * Faixa de Dó2 a Lá5.
 */
function violoncelo(saida, tempo, midi, duracao, volume = 0.06, ataque = 0.13) {
  const nota = naFaixa(midi, 36, 81);
  voz(saida, tempo, nota, duracao, { forma: 'sawtooth', volume, ataque, liberacao: 0.3, filtro: 1500, vibrato: 10, vibratoHz: 4.8, desafinar: -4 });
  voz(saida, tempo, nota, duracao, { forma: 'triangle', volume: volume * 0.6, ataque, liberacao: 0.3, desafinar: 4 });
}

/**
 * Fagote: palheta dupla, timbre de madeira "nasalado" e redondo, sem vibrato. Faixa de Sib1 a Mib5.
 * Dente de serra bem filtrado mais um quadrado uma oitava abaixo, que dá o corpo oco.
 */
function fagote(saida, tempo, midi, duracao, volume = 0.05) {
  const nota = naFaixa(midi, 34, 75);
  voz(saida, tempo, nota, duracao, { forma: 'sawtooth', volume, ataque: 0.06, liberacao: 0.18, filtro: 950 });
  voz(saida, tempo, nota, duracao, { forma: 'square', volume: volume * 0.32, ataque: 0.07, liberacao: 0.18, filtro: 700, desafinar: 3 });
}

/**
 * Xilofone: barra de madeira dura, ataque seco, brilho médio e decaimento rápido. Mais agudo e
 * seco que a marimba e sem o metal do glockenspiel: parciais em 1, 3 e 6 vezes a fundamental.
 */
function xilofone(saida, tempo, midi, volume = 0.05) {
  for (const [razao, peso, dur] of [[1, 1, 0.42], [3, 0.38, 0.2], [6, 0.12, 0.08]]) {
    const a = saida.context, osc = a.createOscillator(), ganho = a.createGain();
    osc.type = 'sine'; osc.frequency.value = hz(midi) * razao;
    ganho.gain.setValueAtTime(0.0001, tempo);
    ganho.gain.exponentialRampToValueAtTime(volume * peso, tempo + 0.002);
    ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + dur);
    osc.connect(ganho); ganho.connect(saida);
    osc.start(tempo); osc.stop(tempo + dur + 0.05);
  }
  chiado(saida, tempo, 0.015, { volume: volume * 0.35, filtro: 3200, tipo: 'bandpass', ataque: 0.001 }); /* o "toc" da baqueta */
}

/**
 * Flauta-de-pã: tubo fechado, tom suave e arredondado, sopro no ataque, vibrato lento e saída
 * macia. Faixa de Dó4 a Dó7.
 */
function flautaDePa(saida, tempo, midi, duracao, volume = 0.06) {
  const nota = naFaixa(midi, 60, 96);
  voz(saida, tempo, nota, duracao, { forma: 'sine', volume, ataque: 0.07, liberacao: 0.4, vibrato: 9, vibratoHz: 4 });
  voz(saida, tempo, nota + 12, duracao, { forma: 'sine', volume: volume * 0.12, ataque: 0.09, liberacao: 0.3 });
  chiado(saida, tempo, Math.min(0.22, duracao), { volume: volume * 0.28, filtro: hz(nota) * 2, tipo: 'bandpass', ataque: 0.04 }); /* sopro */
}

/** Timbres de orquestra e de percussão de teclas, para as trilhas e para os testes. */
export const VOZES = { violino, violoncelo, fagote, xilofone, flautaDePa };

/**
 * A nota `graus` degraus abaixo de `midi` dentro da escala dada (classes de altura 0 a 11). Usada
 * para o segundo violino da Planície, que faz a terça abaixo da melodia sem sair da tonalidade.
 */
function abaixoNaEscala(midi, escala, graus = 2) {
  let nota = midi, restante = graus;
  while (restante > 0) { nota--; if (escala.includes(((nota % 12) + 12) % 12)) restante--; }
  return nota;
}

/** Toca a nota da melodia composta que começa neste passo, se houver. Tabela: [passo, midi, passos]. */
function melodia(tabela, compasso, passo, tocarNota, d) {
  for (const [p, midi, n] of tabela[compasso % tabela.length]) if (p === passo) tocarNota(midi, d * n);
}

/* ======================================================================== músicas */

/*
 * Cada música define: `bpm`, `tempos` por compasso, `subdivisao` (passos por tempo),
 * `balanco` (atraso dos contratempos, para o shuffle), `acordes` (um por compasso, em notas MIDI:
 * [fundamental, ...]) e `tocar(saida, t, compasso, passo, acorde, sortear, duracaoDoPasso)`,
 * chamada a cada passo.
 */
export const MUSICAS = {
  /* Menu: baião épico em Sol (com o Fá natural do mixolídio na parte B), para chamar para a mesa.
     A: G G C D G Em D G · B: C D G Em C D F D. A melodia é a mesma de sempre (agora nos violinos,
     com o violoncelo dobrando uma oitava abaixo no refrão), em andamento menor (100 bpm). No lugar
     da sanfona, um colchão de cordas que respira por compasso (acorde aberto nos violinos, baixo no
     violoncelo, mais forte na parte B); tímpano suave nos tempos fortes, zabumba só no contratempo
     do 3+3+2, triângulo discreto e sem palmas. */
  menu: {
    bpm: 100, tempos: 4, subdivisao: 4, balanco: 0.08,
    acordes: [
      [43, 59, 62, 67], [43, 59, 62, 67], [48, 60, 64, 67], [50, 57, 62, 66],
      [43, 59, 62, 67], [40, 59, 64, 67], [50, 57, 62, 66], [43, 59, 62, 67],
      [48, 60, 64, 67], [50, 57, 62, 66], [43, 59, 62, 67], [40, 59, 64, 67],
      [48, 60, 64, 67], [50, 57, 62, 66], [41, 57, 60, 65], [50, 57, 62, 66],
    ],
    tema: [
      /* A */
      [[0, 67, 3], [3, 71, 3], [6, 74, 2], [8, 74, 2], [10, 76, 2], [12, 74, 4]],
      [[0, 71, 3], [3, 74, 3], [6, 79, 2], [8, 78, 4], [12, 74, 4]],
      [[0, 76, 3], [3, 76, 3], [6, 79, 2], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
      [[0, 74, 3], [3, 72, 3], [6, 71, 2], [8, 69, 4], [12, 66, 2], [14, 69, 2]],
      [[0, 67, 3], [3, 71, 3], [6, 74, 2], [8, 74, 2], [10, 76, 2], [12, 74, 4]],
      [[0, 71, 3], [3, 74, 3], [6, 79, 2], [8, 83, 4], [12, 79, 4]],
      [[0, 81, 3], [3, 79, 3], [6, 78, 2], [8, 76, 2], [10, 74, 2], [12, 72, 2], [14, 69, 2]],
      [[0, 71, 3], [3, 74, 3], [6, 67, 6], [14, 74, 2]],
      /* B: o refrão, mais agudo e com o Fá natural no penúltimo compasso */
      [[0, 79, 2], [2, 79, 2], [4, 79, 2], [6, 76, 2], [8, 79, 4], [12, 84, 4]],
      [[0, 83, 3], [3, 81, 3], [6, 78, 2], [8, 81, 6], [14, 78, 2]],
      [[0, 79, 3], [3, 74, 3], [6, 71, 2], [8, 74, 4], [12, 79, 4]],
      [[0, 76, 3], [3, 79, 3], [6, 83, 2], [8, 81, 4], [12, 79, 4]],
      [[0, 79, 2], [2, 79, 2], [4, 79, 2], [6, 76, 2], [8, 79, 4], [12, 84, 4]],
      [[0, 86, 3], [3, 84, 3], [6, 83, 2], [8, 81, 4], [12, 78, 4]],
      [[0, 84, 3], [3, 81, 3], [6, 77, 2], [8, 81, 2], [10, 84, 2], [12, 81, 4]],
      [[0, 78, 3], [3, 81, 3], [6, 86, 4], [10, 84, 2], [12, 81, 2], [14, 78, 2]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const [r, a, b, c] = acorde;
      const meio = passo % 8;
      /* dinâmica: o refrão (parte B) entra com mais corpo */
      const refrao = compasso % 16 >= 8, forca = refrao ? 1.25 : 1;
      /* colchão de cordas: acorde aberto nos violinos (com a oitava acima, mais fraca) e a fundamental no violoncelo */
      if (passo === 0) {
        for (const n of [a, b, c]) { violino(s, t, n, d * 15.5, 0.016 * forca, 0.45); violino(s, t, n + 12, d * 15.5, 0.007 * forca, 0.6); }
        violoncelo(s, t, r, d * 15.5, 0.085 * forca, 0.2);
      }
      /* tímpano suave nos tempos fortes (1º e 3º), mais forte na volta de cada parte, no lugar do tum da zabumba */
      if (meio === 0) tambor(s, t, passo === 0 && compasso % 8 === 0 ? { volume: 0.34, de: 80, para: 32, duracao: 1.1 } : { volume: passo === 0 ? 0.22 : 0.18, de: 85, para: 38, duracao: 0.8 });
      /* zabumba só no contratempo do 3+3+2 (tum no passo 3), com o baixo no tá (passo 6) */
      if (meio === 3) { tambor(s, t, { volume: 0.1, de: 95, para: 45, duracao: 0.25 }); voz(s, t, r, d * 2.6, { forma: 'triangle', volume: 0.07, ataque: 0.01, liberacao: 0.08 }); }
      if (meio === 6) voz(s, t, passo < 8 ? r + 7 : r + 12, d * 1.8, { forma: 'triangle', volume: 0.08, ataque: 0.01, liberacao: 0.06 });
      /* triângulo discreto (menos da metade do volume de antes, ataque mais lento): marca tempos e contratempos */
      if (passo % 4 === 0) triangulo(s, t, false, 0.008, 0.012); else if (passo % 4 === 2) triangulo(s, t, true, 0.009, 0.012);
      /* virada da zabumba antes de recomeçar cada parte */
      if (compasso % 8 === 7 && passo >= 12) tambor(s, t, { volume: 0.12 + (passo - 12) * 0.04, de: 160 - (passo - 12) * 15, para: 70, duracao: 0.18 });
      if (compasso % 8 === 0 && passo === 0) chiado(s, t, 1.8, { volume: 0.03, filtro: 6000 }); /* prato na volta */
      melodia(this.tema, compasso, passo, (nota, dur) => {
        violino(s, t, nota, dur * 0.95, 0.05 * forca);
        if (refrao) violoncelo(s, t, nota - 12, dur * 0.95, 0.03);
      }, d);
    },
  },

  /* Planície (id `neutro`): blues lento em Mi, 12 compassos, todo acústico e bucólico. O tema vai em
     dois violinos (o 2º faz a terça abaixo, na escala de Mi mixolídio) sobre violoncelo em mínimas
     e fagote de apoio nos contratempos; sem percussão e com a mesma textura do 1º ao último
     compasso. A introdução (compassos 1 a 4, uns 13 s) foi reescrita (#147): começa calma no Sol#,
     sobe em arco pelas notas do próprio tema e desce em escala até o Si, de onde o compasso 5 (que
     o professor aprovou, e segue igual) sobe para o Dó#. O Si longo do compasso 12 também desce
     em terça para o Sol# do início, sem tranco na volta do laço. Clima de bosque calmo com cordas
     como referência geral, sem copiar nota, melodia, progressão ou ritmo de nenhuma obra. */
  neutro: {
    bpm: 72, tempos: 4, subdivisao: 2, balanco: 0.22, /* mesmo balanço de antes: o ritmo da melodia aprovada não muda */
    acordes: [40, 40, 40, 40, 45, 45, 40, 40, 47, 45, 40, 47].map((r) => [r, r + 4, r + 7, r + 10]),
    tema: [
      /* introdução (nova) */
      [[0, 68, 6], [6, 71, 2]], [[0, 73, 4], [4, 71, 2], [6, 68, 2]],
      [[0, 66, 3], [3, 68, 1], [4, 71, 4]], [[0, 76, 2], [2, 74, 2], [4, 73, 2], [6, 71, 2]],
      /* do compasso 5 em diante: a melodia que o professor aprovou, sem mudanças */
      [[0, 73, 3], [3, 76, 1], [4, 73, 2], [6, 69, 2]], [[0, 69, 6], [6, 68, 2]],
      [[0, 68, 3], [3, 71, 1], [4, 68, 2], [6, 66, 2]], [[0, 64, 8]],
      [[0, 71, 3], [3, 73, 1], [4, 75, 2], [6, 71, 2]], [[0, 73, 3], [3, 69, 1], [4, 68, 2], [6, 66, 2]],
      [[0, 68, 4], [4, 64, 4]], [[0, 66, 4], [4, 71, 4]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const r = acorde[0];
      /* violoncelo: raiz e quinta em notas longas, do primeiro ao último compasso */
      if (passo === 0 || passo === 4) violoncelo(s, t, (passo ? r + 7 : r) + 12, d * 3.6, 0.1);
      /* fagote: apoio na terça e na sétima do acorde nos contratempos */
      if (passo === 2 || passo === 6) fagote(s, t, acorde[passo === 2 ? 2 : 3], d * 1.8, 0.04);
      /* melodia: violino 1 na nota, violino 2 uma terça abaixo (Mi mixolídio: Mi Fá# Sol# Lá Si Dó# Ré) */
      melodia(this.tema, compasso, passo, (nota, dur) => {
        violino(s, t, nota, dur * 0.97, 0.06);
        violino(s, t + 0.015, abaixoNaEscala(nota, [4, 6, 8, 9, 11, 1, 2]), dur * 0.97, 0.042);
      }, d);
    },
  },

  /* Valsa em Sol, 3/4: baixo e coro ligados de um compasso ao outro (os repousos ficam cheios),
     marimba ao fundo, tema na flauta-de-pã (timbre suave, com sopro) e o mar */
  oceano: {
    bpm: 63, tempos: 3, subdivisao: 2, balanco: 0,
    acordes: [[43, 55, 59, 62], [40, 55, 59, 64], [36, 55, 60, 64], [38, 54, 57, 62], [43, 55, 59, 62], [47, 54, 59, 62], [36, 55, 60, 64], [38, 54, 57, 60]],
    tema: [
      [[0, 74, 3], [3, 71, 1], [4, 74, 2]], [[0, 76, 4], [4, 74, 1], [5, 71, 1]],
      [[0, 72, 3], [3, 76, 1], [4, 72, 2]], [[0, 69, 6]],
      [[0, 71, 3], [3, 74, 1], [4, 79, 2]], [[0, 78, 4], [4, 74, 2]],
      [[0, 76, 3], [3, 72, 1], [4, 69, 2]], [[0, 72, 3], [3, 69, 1], [4, 66, 2]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const [r, a, b, c] = acorde;
      if (passo === 0) {
        voz(s, t, r, d * 6.4, { forma: 'sine', volume: 0.16, ataque: 0.04, liberacao: 0.9 });
        coro(s, t, [a, b, c], d * 6.8, 0.016);
        if (compasso % 2 === 0) chiado(s, t, d * 10, { volume: 0.022, filtro: 600, tipo: 'lowpass', ataque: d * 4 }); /* onda */
      }
      if (passo >= 2) marimba(s, t, [a, b, c, b][passo - 2] + 12, 0.042); /* marimba 30% mais presente (era 0,032) */
      melodia(this.tema, compasso, passo, (nota, dur) => flautaDePa(s, t, nota, dur * 0.98, 0.07), d);
    },
  },

  /* Épica em Lá menor: tema na trompa (macia, sem o ataque espetado da flauta), harpa ao fundo,
     cordas em ostinato, metais sustentados, xilofone na percussão-base (sempre em notas do acorde,
     para ficar na tonalidade) e tambores mais baixos que marcam os repousos do tema */
  montanha: {
    bpm: 84, tempos: 4, subdivisao: 2, balanco: 0,
    acordes: [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]],
    tema: [
      [[0, 69, 6], [6, 71, 1], [7, 72, 1]], [[0, 72, 4], [4, 69, 4]],
      [[0, 67, 3], [3, 72, 1], [4, 76, 4]], [[0, 74, 6]],
      [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 71, 2]], [[0, 72, 4], [4, 77, 4]],
      [[0, 74, 3], [3, 72, 1], [4, 71, 4]], [[0, 68, 6]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const [r, a, b, c] = acorde;
      voz(s, t, (passo % 2 ? r + 7 : r) + 12, d * 0.85, { forma: 'sawtooth', volume: 0.026, filtro: 800, liberacao: 0.06 });
      harpa(s, t, [a, b, c, a + 12, b + 12, c + 12, a + 24, c + 12][passo], 0.026);
      if (passo === 0) {
        for (const n of acorde.slice(1)) voz(s, t, n, d * 7.5, { forma: 'sawtooth', volume: 0.016, filtro: 1200, ataque: 0.3, liberacao: 0.4 });
        voz(s, t, r - 12, d * 7.5, { forma: 'triangle', volume: 0.15, ataque: 0.05, liberacao: 0.3 });
        xilofone(s, t, r + 24, 0.05); /* a percussão-base agora é de xilofone, na fundamental do acorde */
      }
      if (passo === 4) xilofone(s, t, a + 12, 0.034); /* e na terça do acorde no 3º tempo, mais baixo */
      /* repousos do tema (fim das frases): os tambores respondem, um pouco mais baixos (70%) */
      if (compasso % 4 === 3 && passo >= 6) { tambor(s, t, { volume: 0.21, de: 150, para: 60, duracao: 0.35 }); tambor(s, t + d / 2, { volume: 0.17, de: 170, para: 70, duracao: 0.25 }); }
      if (compasso % 8 === 0 && passo === 0) chiado(s, t, 2.2, { volume: 0.04, filtro: 5000 }); /* prato */
      melodia(this.tema, compasso, passo, (nota, dur) => {
        voz(s, t, nota, dur * 0.95, { forma: 'sawtooth', volume: 0.03, filtro: 1100, ataque: 0.09, liberacao: 0.35, vibrato: 5 });
        voz(s, t, nota, dur * 0.95, { forma: 'triangle', volume: 0.035, ataque: 0.07, liberacao: 0.35 });
      }, d);
    },
  },

  /* Pântano, reconstruído a partir da 1ª versão (órgão, zumbido grave, sino, lamento e tambor
     distante; Ré menor harmônico) em vez da dança de fada da 2ª, que lembrava demais a peça de
     Tchaikovsky citada pelo professor. Mais lenta que as duas (54 bpm; a 1ª tinha 56 e a 2ª, 60). A
     linha principal é um lamento de notas longas, com vibrato fundo e o Dó# sensível que nunca
     resolve sozinho (misterioso, não "invasivo"); o glockenspiel virou apoio: só pontua o acorde ao
     fundo, bem baixo; o tambor grave aparece de longe em longe */
  pantano: {
    bpm: 54, tempos: 4, subdivisao: 2, balanco: 0,
    acordes: [[38, 50, 53, 57], [34, 50, 53, 58], [31, 50, 55, 58], [33, 49, 52, 57], [38, 50, 53, 57], [34, 50, 53, 58], [36, 48, 52, 55], [33, 49, 52, 57]],
    tema: [
      [[0, 69, 4], [4, 67, 2], [6, 65, 2]], [[0, 65, 3], [3, 67, 1], [4, 70, 4]],
      [[0, 67, 4], [4, 65, 2], [6, 62, 2]], [[0, 64, 2], [2, 67, 2], [4, 73, 4]],
      [[0, 74, 6], [6, 73, 2]], [[0, 70, 4], [4, 69, 2], [6, 67, 2]],
      [[0, 64, 4], [4, 67, 2], [6, 72, 2]], [[0, 69, 2], [2, 65, 2], [4, 64, 2], [6, 73, 2]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const [r, a, b, c] = acorde;
      if (passo === 0) {
        /* órgão: cada nota do acorde com o 2º e o 3º harmônicos, subindo devagar */
        for (const n of [a, b, c]) {
          for (const [oitava, vol] of [[0, 0.03], [12, 0.012], [19, 0.006]]) voz(s, t, n + oitava, d * 7.6, { forma: 'sine', volume: vol, ataque: 0.8, liberacao: 0.9, desafinar: oitava ? 4 : 0 });
        }
        voz(s, t, r, d * 7.8, { forma: 'sawtooth', volume: 0.04, filtro: 300, ataque: 0.9, liberacao: 0.9 }); /* zumbido grave */
        if (compasso % 2 === 0) sino(s, t, 62, 0.05);
      }
      /* tambor de longe, só no fim de cada volta de quatro compassos */
      if (compasso % 4 === 3 && passo === 4) tambor(s, t, { volume: 0.16, de: 70, para: 35, duracao: 1.2 });
      /* glockenspiel de apoio: bem baixo, pontua o acorde nos contratempos (nunca conduz a melodia) */
      if ((passo === 3 || passo === 7) && sortear() < 0.55) glockenspiel(s, t, [a, b, c][Math.floor(sortear() * 3)] + 24, 0.022);
      /* a linha principal: o lamento */
      melodia(this.tema, compasso, passo, (nota, dur) => {
        voz(s, t, nota, dur * 0.95, { forma: 'triangle', volume: 0.065, ataque: 0.2, liberacao: 1.0, vibrato: 14 });
        voz(s, t, nota - 12, dur * 0.95, { forma: 'sine', volume: 0.018, ataque: 0.25, liberacao: 1.0, vibrato: 10 });
      }, d);
    },
  },
};

/**
 * Toca `segundos` da trilha `nome` numa saída qualquer (por exemplo, um OfflineAudioContext) a
 * partir do tempo 0. Usado para gravar amostras das trilhas e nos testes.
 */
export function gravarTrilha(saida, nome, segundos) {
  const m = MUSICAS[nome];
  const d = 60 / m.bpm / m.subdivisao, passosPorCompasso = m.tempos * m.subdivisao;
  let tempo = 0.05, passo = 0, compasso = 0;
  while (tempo < segundos) {
    const c = compasso % m.acordes.length;
    const atraso = m.balanco && passo % 2 === 1 ? d * m.balanco : 0;
    m.tocar(saida, tempo + atraso, c, passo, m.acordes[c], sorteador(c * 7919 + passo * 31 + 1), d);
    tempo += d; passo++;
    if (passo >= passosPorCompasso) { passo = 0; compasso++; }
  }
}

/** Nomes das trilhas: menu e terrenos. */
export const TRILHAS = Object.keys(MUSICAS);

/* ======================================================================== agendador */

let atual = null;       /* { musica, saida, compasso, passo, proximo, laco } */
let temporizador = null;

/** Agenda as notas que caem nos próximos ANTECEDENCIA segundos. */
function agendar() {
  if (!atual) return;
  const a = atual.saida.context, m = atual.musica;
  const duracaoDoTempo = 60 / m.bpm, d = duracaoDoTempo / m.subdivisao;
  const passosPorCompasso = m.tempos * m.subdivisao;
  /* se a aba ficou em segundo plano, retoma do agora em vez de despejar as notas atrasadas */
  if (atual.proximo < a.currentTime) atual.proximo = a.currentTime + 0.05;
  while (atual.proximo < a.currentTime + ANTECEDENCIA) {
    const compasso = atual.compasso % m.acordes.length;
    const sortear = sorteador(compasso * 7919 + atual.passo * 31 + 1);
    const atraso = m.balanco && atual.passo % 2 === 1 ? d * m.balanco : 0;
    m.tocar(atual.saida, atual.proximo + atraso, compasso, atual.passo, m.acordes[compasso], sortear, d);
    atual.proximo += d;
    atual.passo++;
    if (atual.passo >= passosPorCompasso) { atual.passo = 0; atual.compasso++; }
  }
}

/** Música de fundo: tocar a do terreno, parar, ligar e desligar. */
export const Musica = {
  /** Começa (ou troca para) a música do terreno, com entrada suave. */
  tocar(terreno) {
    const a = contextoDeAudio();
    if (!a) return;
    const musica = MUSICAS[terreno] || MUSICAS.neutro;
    if (atual && atual.musica === musica) return;
    this.parar();
    const saida = a.createGain();
    saida.gain.setValueAtTime(0.0001, a.currentTime);
    saida.gain.exponentialRampToValueAtTime(VOLUME, a.currentTime + 1.5);
    saida.connect(a.destination);
    atual = { musica, saida, compasso: 0, passo: 0, proximo: a.currentTime + 0.1 };
    agendar();
    temporizador = setInterval(agendar, 100);
  },

  /** Para a música com saída suave. */
  parar() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
    if (!atual) return;
    const { saida } = atual, a = saida.context;
    saida.gain.cancelScheduledValues(a.currentTime);
    saida.gain.setValueAtTime(Math.max(0.0001, saida.gain.value), a.currentTime);
    saida.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.6);
    setTimeout(() => saida.disconnect(), 900);
    atual = null;
  },

  /** Está tocando? */
  tocando() { return !!atual; },
};
