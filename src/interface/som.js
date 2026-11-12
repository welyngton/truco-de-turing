/**
 * @file Efeitos sonoros sintetizados com WebAudio (nenhum arquivo de áudio).
 *
 * O navegador só libera som depois de um clique; `Som.desbloquear()` é chamado no botão "Jogar".
 */

let contexto = null;
let mudo = false;

/** Cria (ou retoma) o contexto de áudio. Devolve null se o navegador não tiver WebAudio. */
export function contextoDeAudio() { return audio(); }

/** Contexto de áudio compartilhado com a música (interface/musica.js). */
function audio() {
  if (!contexto) {
    const Contexto = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Contexto) return null;
    contexto = new Contexto();
  }
  if (contexto.state === 'suspended') contexto.resume();
  return contexto;
}

/**
 * Toca uma nota curta.
 * @param {number} frequencia Hz.
 * @param {number} duracao Segundos.
 * @param {OscillatorType} [forma='sine']
 * @param {number} [volume=0.15]
 * @param {number} [atraso=0] Segundos até começar.
 * @param {number} [deslize] Frequência final, para notas que sobem ou descem.
 */
function nota(frequencia, duracao, forma, volume, atraso, deslize) {
  const a = audio();
  if (!a || mudo) return;
  const t = a.currentTime + (atraso || 0);
  const osc = a.createOscillator(), ganho = a.createGain();
  osc.type = forma || 'sine';
  osc.frequency.setValueAtTime(frequencia, t);
  if (deslize) osc.frequency.exponentialRampToValueAtTime(deslize, t + duracao);
  ganho.gain.setValueAtTime(0.0001, t);
  ganho.gain.exponentialRampToValueAtTime(volume || 0.15, t + 0.01);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  osc.connect(ganho); ganho.connect(a.destination);
  osc.start(t); osc.stop(t + duracao + 0.02);
}

/** Toca um chiado filtrado (cartas, impactos). */
function ruido(duracao, volume, atraso, filtro) {
  const a = audio();
  if (!a || mudo) return;
  const t = a.currentTime + (atraso || 0);
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * duracao), a.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / dados.length);
  const fonte = a.createBufferSource(); fonte.buffer = buffer;
  const passaBaixa = a.createBiquadFilter(); passaBaixa.type = 'lowpass'; passaBaixa.frequency.value = filtro || 3000;
  const ganho = a.createGain(); ganho.gain.value = volume || 0.2;
  fonte.connect(passaBaixa); passaBaixa.connect(ganho); ganho.connect(a.destination);
  fonte.start(t);
}

/** Efeitos sonoros do jogo, um por acontecimento. */
export const Som = {
  desbloquear() { audio(); },
  /** O navegador já liberou o som (houve um clique e o contexto está rodando)? Não cria o contexto. */
  liberado() { return !!contexto && contexto.state === 'running'; },
  definirMudo(valor) { mudo = valor; },
  estaMudo() { return mudo; },
  virarCarta() { ruido(0.06, 0.18, 0, 5000); nota(880, 0.05, 'triangle', 0.05, 0.02); },
  colocarCarta() { ruido(0.09, 0.25, 0, 900); },
  selecionar() { nota(660, 0.05, 'triangle', 0.06); },
  tunagem() { [523, 659, 784].forEach((f, i) => nota(f, 0.16, 'triangle', 0.08, i * 0.06)); },
  golpe() { nota(220, 0.25, 'sawtooth', 0.09, 0, 90); ruido(0.2, 0.2, 0, 1200); },
  explosao() { nota(110, 0.6, 'sawtooth', 0.14, 0, 40); ruido(0.6, 0.35, 0, 600); },
  dropout() { nota(740, 0.12, 'square', 0.04); nota(990, 0.12, 'square', 0.04, 0.08); },
  /**
   * Grito de truco: tapa na mesa (baque grave e estalo), depois a fanfarra do pedido.
   * @param {number} [forca=1] 1 = TRUCO, 2 = SEIS, 3 = NOVE, 4 = DOZE; cada degrau é mais alto e longo.
   */
  truco(forca = 1) {
    const f = Math.max(1, Math.min(4, forca));
    nota(90, 0.5 + f * 0.08, 'sine', 0.22 + f * 0.03, 0, 32);   /* baque da mão na mesa */
    ruido(0.35 + f * 0.05, 0.38 + f * 0.05, 0, 500);           /* madeira estalando */
    ruido(0.08, 0.3, 0, 4000);                                 /* tapa */
    const base = [392, 440, 494, 523][f - 1];                  /* o grito sobe a cada degrau */
    [1, 1.26, 1.5].forEach((m) => nota(base * m, 0.32 + f * 0.05, 'square', 0.05, 0.12));
    nota(base * 2, 0.45 + f * 0.06, 'sawtooth', 0.05, 0.3);
  },
  vitoria() { [523, 659, 784, 1047].forEach((f, i) => nota(f, 0.22, 'triangle', 0.09, i * 0.1)); },
  /**
   * Fanfarra de vitória da mão, no espírito dos fins de fase dos jogos de 8 bits dos anos 80
   * (melodia original): escalas rápidas em onda quadrada subindo por três acordes, um rufar e o
   * acorde final sustentado com o baixo.
   */
  fanfarra() {
    const passo = 0.075;
    const subidas = [[392, 523, 659, 784], [440, 554, 659, 880], [494, 622, 740, 988]]; /* Dó, Lá, Si */
    subidas.forEach((acorde, k) => {
      acorde.forEach((f, i) => nota(f, 0.12, 'square', 0.07, (k * 5 + i) * passo));
      nota(acorde[0] / 2, 0.3, 'triangle', 0.12, k * 5 * passo);
    });
    const fim = 15 * passo;
    for (let i = 0; i < 6; i++) ruido(0.05, 0.12, fim + i * 0.045, 2500);          /* rufar */
    [1047, 1319, 1568, 2093].forEach((f) => nota(f, 1.1, 'square', 0.045, fim + 0.3)); /* acorde final */
    nota(262, 1.1, 'triangle', 0.16, fim + 0.3);
    nota(131, 1.2, 'sawtooth', 0.06, fim + 0.3);
    [1568, 2093].forEach((f, i) => nota(f, 0.08, 'square', 0.05, fim + 1.45 + i * 0.09)); /* floreio */
  },
  /** Vitória da partida: a fanfarra seguida de um hino mais longo, com tambores. */
  campeao() {
    Som.fanfarra();
    const t0 = 2.0, tempo = 0.24;
    const melodia = [523, 659, 784, 1047, 988, 784, 880, 1047, 1175, 1319, 1175, 1568];
    melodia.forEach((f, i) => {
      nota(f, tempo * 1.6, 'square', 0.055, t0 + i * tempo);
      if (i % 2 === 0) { nota(70, 0.25, 'sine', 0.22, t0 + i * tempo, 40); ruido(0.12, 0.18, t0 + i * tempo, 700); }
    });
    [523, 659, 784, 1047].forEach((f) => nota(f, 1.8, 'sawtooth', 0.04, t0 + melodia.length * tempo));
    nota(131, 2, 'triangle', 0.18, t0 + melodia.length * tempo);
    ruido(1.4, 0.2, t0 + melodia.length * tempo, 6000); /* prato */
  },
  derrota() { [392, 330, 262].forEach((f, i) => nota(f, 0.3, 'triangle', 0.08, i * 0.14)); },
  medalha() { [880, 1175].forEach((f, i) => nota(f, 0.18, 'sine', 0.08, i * 0.09)); },
};
