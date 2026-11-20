/**
 * @file Fundos da mesa: feltro verde (neutro) e um fundo por terreno (montanha, pântano, oceano).
 *
 * Convenção da arte: cada função desenha em coordenadas-base e recebe `S` (densidade). O canvas
 * resultante tem (tamanho-base × S) pixels, o que mantém a arte nítida em qualquer tela.
 */
import { brilho, criarTela, degradeLinear, degradeRadial, geradorComSemente, hashDoTexto } from './pincel.js';
import { desenharEmblema } from './emblemas.js';
import { montanhas } from './cenarios.js';

/** Feltro verde da mesa neutra, com fibras e vinheta. */
export function desenharFeltro(W, H, S) {
  let o = criarTela(W, H, S || 1), ctx = o.ctx;
  let aleatorio = geradorComSemente(4242);
  ctx.fillStyle = degradeRadial(ctx, W * 0.49, H * 0.48, 40, W * 0.5, H * 0.5, W * 0.6, [[0, '#17573f'], [0.4, '#103f2d'], [0.75, '#0a2a1d'], [1, '#04120b']]);
  ctx.fillRect(0, 0, W, H);
  /* fibras do feltro */
  ctx.lineWidth = 0.5;
  for (let i = 0; i < W * H / 90; i++) {
    let x = aleatorio() * W, y = aleatorio() * H, a = aleatorio() * Math.PI, l = 1.5 + aleatorio() * 3;
    ctx.strokeStyle = aleatorio() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.08)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  /* marca d'água: naipes e rede */
  ctx.globalAlpha = 0.045;
  desenharEmblema(ctx, 'espada', W * 0.485, H * 0.485, H * 0.36, 0.2, { sombra: false });
  ctx.globalAlpha = 1;
  ctx.fillStyle = degradeRadial(ctx, W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.6)']]);
  ctx.fillRect(0, 0, W, H);
  return o.c;
}

/* ---------------------------------------------------------------- mesas por terreno
 * W x H é o dobro do mundo do jogo (2560x1440); a faixa visível em telas 16:9 é o centro
 * (x 640..1920, y 360..1080). Desenhos discretos, para não competir com as cartas. */
function vinhetaDaMesa(ctx, W, H, a) {
  ctx.fillStyle = degradeRadial(ctx, W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,' + (a || 0.6) + ')']]);
  ctx.fillRect(0, 0, W, H);
}
/** Fibras do tecido: `n` riscos curtos alternando a cor clara e a escura. */
function fibras(ctx, W, H, aleatorio, n, clara, escura) {
  ctx.lineWidth = 0.5;
  for (let i = 0; i < n; i++) {
    let x = aleatorio() * W, y = aleatorio() * H, a = aleatorio() * Math.PI, l = 1.5 + aleatorio() * 3;
    ctx.strokeStyle = aleatorio() < 0.5 ? clara : escura;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}

/** Fundo da mesa no terreno montanha: céu de entardecer, cordilheira e trilha subindo. */
function mesaMontanha(ctx, W, H, aleatorio) {
  ctx.fillStyle = degradeRadial(ctx, W * 0.5, H * 0.46, 40, W * 0.5, H * 0.5, W * 0.62, [[0, '#5a3a26'], [0.45, '#3e2618'], [0.8, '#24150c'], [1, '#100804']]);
  ctx.fillRect(0, 0, W, H);
  /* brilho de pôr do sol no alto */
  ctx.fillStyle = degradeLinear(ctx, 0, H * 0.18, 0, H * 0.5, [[0, 'rgba(255,140,70,.22)'], [1, 'rgba(255,140,70,0)']]);
  ctx.fillRect(0, 0, W, H);
  fibras(ctx, W, H, aleatorio, W * H / 140, 'rgba(255,220,180,.035)', 'rgba(0,0,0,.08)');
  /* curvas de nível de um mapa topográfico */
  let peaks = [[0.28, 0.3], [0.7, 0.36], [0.46, 0.7], [0.86, 0.74], [0.14, 0.72]];
  peaks.forEach(function (pk, pi) {
    let cx = W * pk[0], cy = H * pk[1];
    let ph1 = aleatorio() * 6, ph2 = aleatorio() * 6, ph3 = aleatorio() * 6;
    for (let k = 1; k <= 16; k++) {
      let base = 26 + k * 34;
      ctx.strokeStyle = k % 5 === 0 ? 'rgba(255,214,160,.16)' : 'rgba(255,214,160,.075)';
      ctx.lineWidth = k % 5 === 0 ? 2 : 1.2;
      ctx.beginPath();
      for (let s = 0; s <= 96; s++) {
        let a = (s / 96) * Math.PI * 2;
        let r = base * (1 + 0.16 * Math.sin(3 * a + ph1 + k * 0.08) + 0.08 * Math.sin(5 * a + ph2) + 0.05 * Math.sin(9 * a + ph3 + k * 0.2));
        let x = cx + Math.cos(a) * r * 1.25, y = cy + Math.sin(a) * r;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    /* marco do cume */
    ctx.fillStyle = 'rgba(255,214,160,.22)';
    ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 8, cy + 6); ctx.lineTo(cx - 8, cy + 6); ctx.closePath(); ctx.fill();
  });
  /* trilha pontilhada subindo a mesa */
  ctx.strokeStyle = 'rgba(255,230,170,.18)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]);
  ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.95); ctx.bezierCurveTo(W * 0.3, H * 0.8, W * 0.35, H * 0.55, W * 0.5, H * 0.5); ctx.bezierCurveTo(W * 0.62, H * 0.45, W * 0.66, H * 0.3, W * 0.7, H * 0.36); ctx.stroke();
  ctx.setLineDash([]);
  /* cordilheira nas bordas */
  montanhas(ctx, 0, H * 0.72, W, H * 0.28, aleatorio, [
    { preenchimento: 'rgba(40,20,12,.55)', base: 0.75, amplitude: 0.7, neve: true },
    { preenchimento: 'rgba(18,9,5,.8)', base: 0.95, amplitude: 0.5 },
  ]);
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = '#ffe0b0';
  ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - 230); ctx.lineTo(W / 2 + 270, H / 2 + 170); ctx.lineTo(W / 2 - 270, H / 2 + 170); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  vinhetaDaMesa(ctx, W, H, 0.62);
}

/** Desenha uma vitória-régia (folha flutuante) no pântano. */
function vitoriaRegia(ctx, x, y, r, rot, aleatorio) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.62);
  ctx.fillStyle = 'rgba(70,120,50,.38)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, 0.25, Math.PI * 2 - 0.25); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,200,110,.22)'; ctx.lineWidth = 1.5;
  for (let v = 0; v < 7; v++) { let a = 0.5 + v * 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.stroke(); }
  ctx.restore();
  if (aleatorio() < 0.25) {
    ctx.fillStyle = 'rgba(240,160,190,.45)';
    for (let p = 0; p < 6; p++) { let pa = p / 6 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(pa) * 5, y - 4 + Math.sin(pa) * 3, 5, 2.6, pa, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,230,120,.6)'; ctx.beginPath(); ctx.arc(x, y - 4, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}
/** Fundo da mesa no terreno pântano: água escura, névoa, vitórias-régias e vaga-lumes. */
function mesaPantano(ctx, W, H, aleatorio) {
  ctx.fillStyle = degradeRadial(ctx, W * 0.5, H * 0.48, 40, W * 0.5, H * 0.5, W * 0.62, [[0, '#3a4430'], [0.45, '#283222'], [0.8, '#161c11'], [1, '#080a06']]);
  ctx.fillRect(0, 0, W, H);
  fibras(ctx, W, H, aleatorio, W * H / 160, 'rgba(210,230,170,.03)', 'rgba(0,0,0,.09)');
  /* ondulações na água parada */
  for (let i = 0; i < 26; i++) {
    let x = aleatorio() * W, y = aleatorio() * H;
    for (let k = 1; k <= 4; k++) {
      ctx.strokeStyle = 'rgba(200,220,170,' + (0.07 - k * 0.012) + ')'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(x, y, k * 18, k * 7, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  /* vitórias-régias */
  for (let p = 0; p < 70; p++) vitoriaRegia(ctx, aleatorio() * W, aleatorio() * H, 14 + aleatorio() * 26, aleatorio() * 6.28, aleatorio);
  /* raízes e juncos nas bordas */
  ctx.strokeStyle = 'rgba(10,14,8,.6)'; ctx.lineCap = 'round';
  for (let r = 0; r < 80; r++) {
    let edge = r % 2 ? 0 : 1, rx = edge ? W * (0.72 + aleatorio() * 0.28) : W * aleatorio() * 0.28, ry = H * (0.55 + aleatorio() * 0.45);
    ctx.lineWidth = 2 + aleatorio() * 3;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + (aleatorio() - 0.5) * 30, ry - 60, rx + (aleatorio() - 0.5) * 40, ry - 90 - aleatorio() * 90); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  /* névoa */
  for (let f = 0; f < 22; f++) {
    let fx = aleatorio() * W, fy = H * (0.2 + aleatorio() * 0.7), fw = 220 + aleatorio() * 340, fh = 30 + aleatorio() * 40;
    ctx.fillStyle = degradeRadial(ctx, fx, fy, 0, fx, fy, fw, [[0, 'rgba(210,225,190,.06)'], [1, 'rgba(210,225,190,0)']]);
    ctx.beginPath(); ctx.ellipse(fx, fy, fw, fh, 0, 0, Math.PI * 2); ctx.fill();
  }
  /* vagalumes */
  for (let v = 0; v < 40; v++) brilho(ctx, aleatorio() * W, aleatorio() * H, 6 + aleatorio() * 6, '#d8ff8a', 0.55);
  vinhetaDaMesa(ctx, W, H, 0.65);
}

/** Desenha uma rosa dos ventos de raio R. */
function rosaDosVentos(ctx, cx, cy, R, cor) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 2;
  [1, 0.82, 0.3].forEach(function (f) { ctx.beginPath(); ctx.arc(0, 0, R * f, 0, Math.PI * 2); ctx.stroke(); });
  for (let t = 0; t < 72; t++) { let a = t / 72 * Math.PI * 2, l = t % 9 === 0 ? 0.12 : 0.05; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a) * R * (1 - l), Math.sin(a) * R * (1 - l)); ctx.stroke(); }
  for (let p = 0; p < 8; p++) {
    let ang = p / 8 * Math.PI * 2 - Math.PI / 2, comprimento = p % 2 ? R * 0.55 : R * 0.95, wd = p % 2 ? R * 0.06 : R * 0.09;
    ctx.beginPath(); ctx.moveTo(Math.cos(ang) * comprimento, Math.sin(ang) * comprimento);
    ctx.lineTo(Math.cos(ang + Math.PI / 2) * wd, Math.sin(ang + Math.PI / 2) * wd);
    ctx.lineTo(0, 0);
    ctx.lineTo(Math.cos(ang - Math.PI / 2) * wd, Math.sin(ang - Math.PI / 2) * wd);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/** Fundo da mesa no terreno oceano: ondas, espuma e rosa dos ventos. */
function mesaOceano(ctx, W, H, aleatorio) {
  ctx.fillStyle = degradeRadial(ctx, W * 0.5, H * 0.46, 40, W * 0.5, H * 0.5, W * 0.62, [[0, '#1d6a8c'], [0.45, '#11455f'], [0.8, '#082a3c'], [1, '#03131d']]);
  ctx.fillRect(0, 0, W, H);
  /* cáusticas: rede de luz no fundo do mar */
  ctx.lineWidth = 1.6;
  for (let c = 0; c < 900; c++) {
    let x = aleatorio() * W, y = aleatorio() * H, a = aleatorio() * Math.PI * 2, l = 14 + aleatorio() * 26;
    ctx.strokeStyle = 'rgba(170,230,255,' + (0.03 + aleatorio() * 0.05) + ')';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 1) * l * 0.6, y + Math.sin(a + 1) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  /* ondas */
  for (let fileira = 0; fileira < H; fileira += 26) {
    let ph = aleatorio() * 6, amp = 4 + aleatorio() * 5, fr = 0.012 + aleatorio() * 0.008;
    ctx.strokeStyle = 'rgba(190,235,255,' + (0.04 + aleatorio() * 0.05) + ')'; ctx.lineWidth = 1.4 + aleatorio() * 1.2;
    ctx.beginPath();
    for (let x2 = 0; x2 <= W; x2 += 8) ctx.lineTo(x2, fileira + Math.sin(x2 * fr + ph) * amp);
    ctx.stroke();
  }
  /* espuma */
  for (let s = 0; s < 260; s++) { ctx.fillStyle = 'rgba(230,248,255,' + (0.05 + aleatorio() * 0.08) + ')'; ctx.beginPath(); ctx.arc(aleatorio() * W, aleatorio() * H, 1 + aleatorio() * 2.5, 0, Math.PI * 2); ctx.fill(); }
  rosaDosVentos(ctx, W / 2, H / 2, 300, 'rgba(220,240,255,.06)');
  vinhetaDaMesa(ctx, W, H, 0.6);
}

/** Desenha o fundo da mesa do terreno (W×H unidades na densidade S). */
export function desenharMesa(terreno, W, H, S) {
  if (!terreno || terreno === 'neutro') return desenharFeltro(W, H, S);
  let o = criarTela(W, H, S || 1), ctx = o.ctx;
  let aleatorio = geradorComSemente(hashDoTexto('table' + terreno));
  ({ montanha: mesaMontanha, pantano: mesaPantano, oceano: mesaOceano })[terreno](ctx, W, H, aleatorio);
  return o.c;
}
