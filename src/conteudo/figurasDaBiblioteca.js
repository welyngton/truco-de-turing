/**
 * @file Figuras da Biblioteca de conceitos: diagramas em SVG, desenhados à mão e embutidos no
 * verbete. Usam as cores do papel das telas (tinta marrom, vinho, azul e laranja das redes) e
 * escalam com a largura do verbete.
 */

const TINTA = '#2b1608', VINHO = '#6b1a22', AZUL = '#2f6fb0', LARANJA = '#c8742a', CINZA = '#9a8c6c';

/** Abre um SVG responsivo com título acessível. */
const svg = (l, a, titulo, corpo) =>
  '<svg class="figura-svg" viewBox="0 0 ' + l + ' ' + a + '" role="img" aria-label="' + titulo + '" xmlns="http://www.w3.org/2000/svg">' +
  '<style>text{font-family:Spectral,Georgia,serif;font-size:13px;fill:' + TINTA + '}.p{font-size:11px;fill:' + CINZA + '}</style>' + corpo + '</svg>';

/** Linha de uma polilinha a partir de pontos [[x, y], ...]. */
const traco = (pontos, cor, largura = 2, extra = '') =>
  '<polyline fill="none" stroke="' + cor + '" stroke-width="' + largura + '" stroke-linejoin="round" stroke-linecap="round" ' + extra + ' points="' +
  pontos.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ') + '"/>';

/** Eixos x e y com rótulos. */
const eixos = (x0, y0, x1, y1, rx, ry) =>
  '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + TINTA + '" stroke-width="1.2"/>' +
  '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" stroke="' + TINTA + '" stroke-width="1.2"/>' +
  '<text x="' + x1 + '" y="' + (y1 + 18) + '" text-anchor="end" class="p">' + rx + '</text>' +
  '<text x="' + (x0 + 6) + '" y="' + (y0 + 4) + '" class="p">' + ry + '</text>';

/** Amostra uma função em [a, b] e devolve os pontos já na tela. */
function amostrar(f, a, b, n, paraTela) {
  const pontos = [];
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pontos.push(paraTela(x, f(x))); }
  return pontos;
}

/** Neurônio artificial: entradas, pesos, soma com viés e ativação. */
function neuronio() {
  const entradas = [[40, 40], [40, 95], [40, 150]];
  let corpo = '';
  entradas.forEach(([x, y], i) => {
    corpo += '<line x1="' + (x + 16) + '" y1="' + y + '" x2="214" y2="95" stroke="' + AZUL + '" stroke-width="' + [3.5, 1.5, 2.5][i] + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="16" fill="#fff8e6" stroke="' + TINTA + '"/>' +
      '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">x' + (i + 1) + '</text>' +
      '<text x="' + (x + 70) + '" y="' + (y + (95 - y) * 0.42 - 6) + '" class="p">w' + (i + 1) + '</text>';
  });
  corpo += '<circle cx="240" cy="95" r="28" fill="#fff8e6" stroke="' + TINTA + '" stroke-width="1.5"/><text x="240" y="101" text-anchor="middle" style="font-size:20px">Σ</text>' +
    '<text x="240" y="146" text-anchor="middle" class="p">+ viés b</text>' +
    '<line x1="268" y1="95" x2="318" y2="95" stroke="' + TINTA + '" stroke-width="1.5"/>' +
    '<rect x="318" y="72" width="64" height="46" rx="8" fill="#fff8e6" stroke="' + TINTA + '" stroke-width="1.5"/>' +
    traco([[326, 108], [350, 108], [374, 80]], VINHO, 2) +
    '<text x="350" y="134" text-anchor="middle" class="p">ativação φ</text>' +
    '<line x1="382" y1="95" x2="440" y2="95" stroke="' + TINTA + '" stroke-width="1.5" marker-end="url(#seta)"/>' +
    '<text x="452" y="100">y</text>' +
    '<defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + TINTA + '"/></marker></defs>';
  return svg(480, 180, 'Diagrama de um neurônio: entradas multiplicadas por pesos, somadas com o viés e passadas pela ativação', corpo);
}

/** As três ativações mais conhecidas lado a lado. */
function ativacoes() {
  const painel = (dx, nome, f, cor) => {
    const tela = (x, y) => [dx + 20 + (x + 4) / 8 * 120, 110 - y * 40];
    return '<line x1="' + (dx + 20) + '" y1="110" x2="' + (dx + 140) + '" y2="110" stroke="' + CINZA + '"/>' +
      '<line x1="' + (dx + 80) + '" y1="20" x2="' + (dx + 80) + '" y2="150" stroke="' + CINZA + '"/>' +
      traco(amostrar(f, -4, 4, 60, tela), cor, 2.5) + '<text x="' + (dx + 80) + '" y="172" text-anchor="middle">' + nome + '</text>';
  };
  return svg(480, 180, 'Gráficos das ativações ReLU, sigmoide e tangente hiperbólica',
    painel(0, 'ReLU', (x) => Math.min(2.2, Math.max(0, x) / 2), VINHO) +
    painel(160, 'sigmoide', (x) => 1 / (1 + Math.exp(-x)), AZUL) +
    painel(320, 'tanh', (x) => Math.tanh(x), LARANJA));
}

/** Rede densa (todas as ligações) e, por cima, o caminho de uma rede do jogo. */
function rede() {
  const camadas = [3, 5, 5, 4], xs = [50, 170, 290, 410];
  const ys = (n) => Array.from({ length: n }, (_, i) => 95 + (i - (n - 1) / 2) * 34);
  let corpo = '';
  for (let c = 0; c < camadas.length - 1; c++) {
    for (const y0 of ys(camadas[c])) for (const y1 of ys(camadas[c + 1])) corpo += '<line x1="' + xs[c] + '" y1="' + y0 + '" x2="' + xs[c + 1] + '" y2="' + y1 + '" stroke="' + CINZA + '" stroke-width="0.6" opacity="0.6"/>';
  }
  const caminho = [1, 3, 0, 2].map((i, c) => [xs[c], ys(camadas[c])[i]]);
  corpo += traco(caminho, AZUL, 4);
  camadas.forEach((n, c) => ys(n).forEach((y) => { corpo += '<circle cx="' + xs[c] + '" cy="' + y + '" r="10" fill="#fff8e6" stroke="' + TINTA + '"/>'; }));
  caminho.forEach(([x, y]) => { corpo += '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + AZUL + '"/>'; });
  ['entrada', 'oculta', 'oculta', 'saída'].forEach((r, c) => { corpo += '<text x="' + xs[c] + '" y="190" text-anchor="middle" class="p">' + r + '</text>'; });
  return svg(460, 200, 'Rede densa com todas as ligações em cinza e, em azul, o caminho de um neurônio por camada que o jogo usa', corpo);
}

/** Perda de treino e de validação ao longo das épocas, com o ponto de parada antecipada. */
function curvas() {
  const tela = (x, y) => [50 + x * 40, 30 + (1 - y) * 120];
  const treino = (t) => 0.9 * Math.exp(-t / 2.2) + 0.08;
  const validacao = (t) => 0.9 * Math.exp(-t / 2.2) + 0.14 + 0.012 * Math.max(0, t - 4.2) ** 2;
  const parada = tela(4.2, validacao(4.2));
  return svg(480, 190, 'Curvas de perda: a de treino cai sempre; a de validação cai, para e volta a subir; a parada antecipada fica no mínimo da validação',
    eixos(50, 20, 470, 150, 'épocas', 'perda') +
    traco(amostrar(treino, 0, 10, 60, tela), AZUL, 2.5) + traco(amostrar(validacao, 0, 10, 60, tela), LARANJA, 2.5) +
    '<line x1="' + parada[0] + '" y1="20" x2="' + parada[0] + '" y2="150" stroke="' + VINHO + '" stroke-dasharray="5 4"/>' +
    '<text x="' + (parada[0] + 6) + '" y="34" style="fill:' + VINHO + '">parar aqui</text>' +
    '<text x="470" y="140" text-anchor="end" style="fill:' + AZUL + '">treino</text>' +
    '<text x="470" y="' + (tela(10, validacao(10))[1] + 16) + '" text-anchor="end" style="fill:' + LARANJA + '">validação</text>');
}

/** Os mesmos pontos ajustados por uma curva simples e por uma que decora o ruído. */
function sobreajuste() {
  const pontos = [[0.5, 0.35], [1.4, 0.62], [2.2, 0.5], [3.1, 0.82], [4.0, 0.7], [4.8, 1.02], [5.7, 0.9], [6.5, 1.18], [7.4, 1.06], [8.2, 1.35]];
  const tela = (x, y) => [50 + x * 48, 160 - y * 100];
  const suave = (x) => 0.32 + 0.12 * x;
  /* interpolação de Lagrange: passa por todos os pontos e oscila entre eles */
  const decorada = (x) => pontos.reduce((s, [xi, yi], i) => s + yi * pontos.reduce((p, [xj], j) => (j === i ? p : p * (x - xj) / (xi - xj)), 1), 0);
  let corpo = eixos(50, 20, 470, 170, 'x', 'y') +
    traco(amostrar(suave, 0.3, 8.4, 40, tela), AZUL, 2.5) +
    traco(amostrar((x) => Math.max(-0.05, Math.min(1.55, decorada(x))), 0.5, 8.2, 220, tela), LARANJA, 2);
  pontos.forEach(([x, y]) => { const [a, b] = tela(x, y); corpo += '<circle cx="' + a + '" cy="' + b + '" r="4.5" fill="' + TINTA + '"/>'; });
  corpo += '<text x="60" y="34" style="fill:' + AZUL + '">generaliza</text><text x="60" y="52" style="fill:' + LARANJA + '">decora o ruído</text>';
  return svg(480, 190, 'Dez pontos com ruído: uma reta que segue a tendência e uma curva que passa por todos os pontos e oscila', corpo);
}

/** Dropout: alguns neurônios ocultos desligados e as ligações deles apagadas. */
function dropout() {
  const camadas = [3, 5, 5, 2], xs = [50, 170, 290, 410];
  const ys = (n) => Array.from({ length: n }, (_, i) => 95 + (i - (n - 1) / 2) * 34);
  const desligado = { '1:1': 1, '1:4': 1, '2:0': 1, '2:3': 1 };
  let corpo = '';
  for (let c = 0; c < camadas.length - 1; c++) {
    ys(camadas[c]).forEach((y0, i) => ys(camadas[c + 1]).forEach((y1, j) => {
      if (desligado[c + ':' + i] || desligado[c + 1 + ':' + j]) return;
      corpo += '<line x1="' + xs[c] + '" y1="' + y0 + '" x2="' + xs[c + 1] + '" y2="' + y1 + '" stroke="' + AZUL + '" stroke-width="0.9" opacity="0.7"/>';
    }));
  }
  camadas.forEach((n, c) => ys(n).forEach((y, i) => {
    const fora = desligado[c + ':' + i];
    corpo += '<circle cx="' + xs[c] + '" cy="' + y + '" r="10" fill="' + (fora ? '#e8dcc0' : '#fff8e6') + '" stroke="' + (fora ? CINZA : TINTA) + '"' + (fora ? ' stroke-dasharray="3 2"' : '') + '/>';
    if (fora) corpo += '<path d="M' + (xs[c] - 6) + ',' + (y - 6) + ' L' + (xs[c] + 6) + ',' + (y + 6) + ' M' + (xs[c] + 6) + ',' + (y - 6) + ' L' + (xs[c] - 6) + ',' + (y + 6) + '" stroke="' + VINHO + '" stroke-width="2"/>';
  }));
  corpo += '<text x="230" y="190" text-anchor="middle" class="p">a cada passo do treino, um sorteio novo de neurônios desligados</text>';
  return svg(460, 200, 'Rede com quatro neurônios ocultos desligados por dropout e as ligações deles removidas', corpo);
}

/** Tamanho do gradiente camada a camada, da saída para a entrada, com sigmoide. */
function vanishing() {
  let corpo = eixos(50, 20, 470, 160, 'camada (da saída para a entrada)', 'gradiente');
  for (let k = 0; k < 8; k++) {
    const g = Math.pow(0.25, k * 0.55), a = 130 * g, x = 70 + k * 50;
    corpo += '<rect x="' + x + '" y="' + (160 - a) + '" width="30" height="' + Math.max(1, a) + '" fill="' + (k ? AZUL : VINHO) + '" opacity="' + (1 - k * 0.07) + '"/>' +
      '<text x="' + (x + 15) + '" y="176" text-anchor="middle" class="p">' + (k ? 'L−' + k : 'L') + '</text>';
  }
  return svg(480, 190, 'Barras que encolhem a cada camada: o gradiente perde força ao voltar da saída para a entrada', corpo);
}

/** Figuras disponíveis, pelo nome usado nos verbetes. */
export const FIGURAS = { neuronio, ativacoes, rede, curvas, sobreajuste, dropout, vanishing };

/** SVG da figura `nome`, ou texto vazio se não existir. */
export function figuraDaBiblioteca(nome) {
  return FIGURAS[nome] ? FIGURAS[nome]() : '';
}
