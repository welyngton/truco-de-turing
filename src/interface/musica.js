/**
 * @file Música de fundo sintetizada com WebAudio: uma trilha para o menu e uma para cada terreno.
 *
 * | Trilha              | Estilo                                                        | Andamento    |
 * |---------------------|---------------------------------------------------------------|--------------|
 * | menu                | canção de ninar em Fá: harpa, caixinha de música e um coro suave | 76 bpm     |
 * | neutro (Planície)   | blues lento em Mi, tema cantado com notas longas e poucos saltos | 72 bpm     |
 * | oceano              | valsa em Sol: marimba ao fundo, coro que preenche os repousos | 63 bpm (3/4) |
 * | montanha            | épica em Lá menor: trompa, harpa ao fundo e tambores nos repousos | 84 bpm   |
 * | pantano             | dança de fada em Ré menor: harmônica de vidro, glockenspiel e pizzicato | 60 bpm |
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
function voz(saida, tempo, midi, duracao, { forma = 'triangle', volume = 0.1, ataque = 0.01, liberacao = 0.15, filtro = 0, vibrato = 0, desafinar = 0 } = {}) {
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
    lfo.frequency.value = 5; profundidade.gain.value = vibrato;
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

/** Harmônica de vidro: senoides puras com entrada macia e um leve tremor. */
function harmonicaDeVidro(saida, tempo, midi, duracao, volume = 0.05) {
  voz(saida, tempo, midi, duracao, { forma: 'sine', volume, ataque: 0.05, liberacao: 0.45, vibrato: 7 });
  voz(saida, tempo, midi + 12, duracao, { forma: 'sine', volume: volume * 0.22, ataque: 0.08, liberacao: 0.35 });
  voz(saida, tempo, midi + 19, duracao * 0.6, { forma: 'sine', volume: volume * 0.07, ataque: 0.1, liberacao: 0.25 });
}

/** Marimba: tecla de madeira, grave arredondado e um harmônico que some rápido. */
function marimba(saida, tempo, midi, volume = 0.05) {
  voz(saida, tempo, midi, 0.02, { forma: 'sine', volume, ataque: 0.003, liberacao: 0.45 });
  voz(saida, tempo, midi + 24, 0.01, { forma: 'sine', volume: volume * 0.25, ataque: 0.002, liberacao: 0.1 });
}

/** Pizzicato: corda beliscada, curta e abafada. */
function pizzicato(saida, tempo, midi, volume = 0.08) {
  voz(saida, tempo, midi, 0.03, { forma: 'triangle', volume, ataque: 0.004, liberacao: 0.22, filtro: 1000 });
}

/** Coro (pad): acorde de senoides que entra e sai devagar e passa um pouco do compasso. */
function coro(saida, tempo, notas, duracao, volume = 0.018) {
  for (const n of notas) voz(saida, tempo, n, duracao, { forma: 'sine', volume, ataque: duracao * 0.3, liberacao: duracao * 0.35, vibrato: 3 });
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
  /* Menu: canção de ninar em Fá (F Dm B♭ C F Am B♭ C), harpa em arpejo, coro e caixinha de música */
  menu: {
    bpm: 76, tempos: 4, subdivisao: 2, balanco: 0,
    acordes: [[41, 53, 57, 60], [38, 53, 57, 62], [34, 53, 58, 62], [36, 52, 55, 60], [41, 53, 57, 60], [33, 52, 57, 60], [34, 53, 58, 62], [36, 52, 55, 58]],
    tema: [
      [[0, 72, 3], [3, 69, 1], [4, 72, 2], [6, 74, 2]], [[0, 77, 4], [4, 76, 2], [6, 74, 2]],
      [[0, 74, 3], [3, 70, 1], [4, 74, 2], [6, 77, 2]], [[0, 76, 6], [6, 72, 2]],
      [[0, 72, 3], [3, 69, 1], [4, 72, 2], [6, 77, 2]], [[0, 76, 4], [4, 72, 2], [6, 69, 2]],
      [[0, 70, 3], [3, 74, 1], [4, 72, 2], [6, 70, 2]], [[0, 67, 4], [4, 72, 4]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const [r, a, b, c] = acorde;
      harpa(s, t, [a, b, c, a + 12, b + 12, c + 12, b + 12, a + 12][passo], 0.03);
      if (passo === 0) { voz(s, t, r, d * 7.6, { forma: 'sine', volume: 0.12, ataque: 0.05, liberacao: 0.8 }); coro(s, t, [a, b, c], d * 8.5, 0.012); }
      melodia(this.tema, compasso, passo, (nota, dur) => {
        glockenspiel(s, t, nota + 12, 0.035);
        voz(s, t, nota, dur * 0.95, { forma: 'sine', volume: 0.045, ataque: 0.03, liberacao: 0.4, vibrato: 4 });
      }, d);
    },
  },

  /* Planície (mesa neutra): blues lento em Mi, 12 compassos; o tema é cantado, com notas longas e
     passos curtos, sobre baixo em mínimas, acordes macios e escovinha */
  neutro: {
    bpm: 72, tempos: 4, subdivisao: 2, balanco: 0.22,
    acordes: [40, 40, 40, 40, 45, 45, 40, 40, 47, 45, 40, 47].map((r) => [r, r + 4, r + 7, r + 10]),
    tema: [
      [[0, 68, 3], [3, 71, 1], [4, 73, 2], [6, 71, 2]], [[0, 68, 4], [4, 66, 2], [6, 64, 2]],
      [[0, 68, 3], [3, 71, 1], [4, 73, 2], [6, 76, 2]], [[0, 74, 4], [4, 73, 2], [6, 71, 2]],
      [[0, 73, 3], [3, 76, 1], [4, 73, 2], [6, 69, 2]], [[0, 69, 6], [6, 68, 2]],
      [[0, 68, 3], [3, 71, 1], [4, 68, 2], [6, 66, 2]], [[0, 64, 8]],
      [[0, 71, 3], [3, 73, 1], [4, 75, 2], [6, 71, 2]], [[0, 73, 3], [3, 69, 1], [4, 68, 2], [6, 66, 2]],
      [[0, 68, 4], [4, 64, 4]], [[0, 66, 4], [4, 71, 4]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const r = acorde[0];
      if (passo === 0 || passo === 4) voz(s, t, passo ? r + 7 : r, d * 3.6, { forma: 'triangle', volume: 0.12, ataque: 0.02, liberacao: 0.3 });
      if (passo === 2 || passo === 6) {
        for (const n of acorde.slice(1)) voz(s, t, n + 12, d * 1.6, { forma: 'sine', volume: 0.016, ataque: 0.03, liberacao: 0.4, vibrato: 3 });
      }
      if (passo % 2 === 1) chiado(s, t, 0.08, { volume: 0.012, filtro: 6000 });
      if (passo === 0) tambor(s, t, { volume: 0.07, de: 80, para: 48, duracao: 0.3 });
      melodia(this.tema, compasso, passo, (nota, dur) => {
        voz(s, t, nota, dur * 0.95, { forma: 'sine', volume: 0.065, ataque: 0.03, liberacao: 0.35, vibrato: 5 });
        voz(s, t, nota, dur * 0.95, { forma: 'triangle', volume: 0.02, ataque: 0.03, liberacao: 0.3, filtro: 1800 });
      }, d);
    },
  },

  /* Valsa em Sol, 3/4: baixo e coro ligados de um compasso ao outro (os repousos ficam cheios),
     marimba ao fundo, tema cantado e o mar */
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
      if (passo >= 2) marimba(s, t, [a, b, c, b][passo - 2] + 12, 0.032);
      melodia(this.tema, compasso, passo, (nota, dur) => voz(s, t, nota, dur * 0.98, { forma: 'sine', volume: 0.07, ataque: 0.05, liberacao: 0.7, vibrato: 7 }), d);
    },
  },

  /* Épica em Lá menor: tema na trompa (macia, sem o ataque espetado da flauta), harpa ao fundo,
     cordas em ostinato, metais sustentados e tambores que marcam os repousos do tema */
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
        tambor(s, t, { volume: 0.32, de: 120, para: 40, duracao: 0.6 });
      }
      if (passo === 4) tambor(s, t, { volume: 0.2, de: 120, para: 40, duracao: 0.5 });
      /* repousos do tema (fim das frases): os tambores respondem */
      if (compasso % 4 === 3 && passo >= 6) { tambor(s, t, { volume: 0.3, de: 150, para: 60, duracao: 0.35 }); tambor(s, t + d / 2, { volume: 0.24, de: 170, para: 70, duracao: 0.25 }); }
      if (compasso % 8 === 0 && passo === 0) chiado(s, t, 2.2, { volume: 0.04, filtro: 5000 }); /* prato */
      melodia(this.tema, compasso, passo, (nota, dur) => {
        voz(s, t, nota, dur * 0.95, { forma: 'sawtooth', volume: 0.03, filtro: 1100, ataque: 0.09, liberacao: 0.35, vibrato: 5 });
        voz(s, t, nota, dur * 0.95, { forma: 'triangle', volume: 0.035, ataque: 0.07, liberacao: 0.35 });
      }, d);
    },
  },

  /* Ré menor, no espírito da "Dança da Fada Açucarada" (Tchaikovsky), mais lenta: tema curto e
     saltitante na harmônica de vidro, glockenspiel dobrando, pizzicato no baixo, órgão bem baixo e
     um sino a cada quatro compassos */
  pantano: {
    bpm: 60, tempos: 4, subdivisao: 2, balanco: 0,
    acordes: [[38, 50, 53, 57], [33, 49, 52, 55], [38, 50, 53, 57], [43, 50, 55, 58], [43, 50, 55, 58], [38, 50, 53, 57], [33, 49, 52, 55], [38, 50, 53, 57]],
    tema: [
      [[0, 69, 1], [2, 65, 1], [3, 69, 1], [4, 68, 1], [6, 64, 2]], [[0, 65, 1], [2, 64, 1], [3, 62, 1], [4, 61, 2], [6, 62, 2]],
      [[0, 69, 1], [2, 65, 1], [3, 69, 1], [4, 68, 1], [6, 64, 2]], [[0, 70, 1], [2, 69, 1], [3, 67, 1], [4, 65, 2], [6, 64, 2]],
      [[0, 74, 1], [2, 70, 1], [3, 74, 1], [4, 73, 1], [6, 69, 2]], [[0, 70, 1], [2, 69, 1], [3, 67, 1], [4, 65, 2], [6, 67, 2]],
      [[0, 69, 1], [2, 73, 1], [3, 76, 1], [4, 73, 2], [6, 69, 2]], [[0, 74, 2], [2, 69, 1], [3, 65, 1], [4, 62, 4]],
    ],
    tocar(s, t, compasso, passo, acorde, sortear, d) {
      const [r, a, b] = acorde;
      if (passo % 2 === 0) pizzicato(s, t, passo % 4 ? r + 7 : r, 0.13);
      if (passo === 0) {
        for (const n of acorde.slice(1)) voz(s, t, n, d * 7.6, { forma: 'sine', volume: 0.02, ataque: 0.5, liberacao: 0.8 });
        if (compasso % 4 === 0) sino(s, t, 62, 0.035);
      }
      if (passo === 3 || passo === 7) pizzicato(s, t, a + 12, 0.05);
      melodia(this.tema, compasso, passo, (nota, dur) => {
        harmonicaDeVidro(s, t, nota + 12, Math.min(dur, d * 1.6) * 0.8, 0.1);
        glockenspiel(s, t, nota + 24, passo % 4 === 0 ? 0.07 : 0.045);
      }, d);
      if (passo === 6 && compasso % 2 === 1) voz(s, t, b - 12, d * 1.8, { forma: 'sawtooth', volume: 0.02, filtro: 500, ataque: 0.05, liberacao: 0.3 }); /* fagote */
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
