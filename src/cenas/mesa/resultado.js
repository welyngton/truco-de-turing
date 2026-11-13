/**
 * @file Parte da CenaMesa: fim da mão. Marca os tentos, registra conquistas e mostra a tela de
 * resultado com a soma detalhada de cada rede.
 */
import { rotuloCarta } from '../../nucleo/cartas.js';
import { pontuarRede } from '../../nucleo/pontuacao.js';
import { marcarTentos, novaPartida, proximaMao } from '../../nucleo/truco.js';
import { GRADUACOES } from '../../conteudo/conquistas.js';
import { provocar } from '../../conteudo/textos.js';
import { Som } from '../../interface/som.js';
import { abrirPainel, escaparHtml } from '../../interface/paineis.js';
import { medalhaHtml } from '../../interface/telas/conquistas.js';
import { avataresDaConquista } from '../../conteudo/avatares.js';
import { abrirRevisao } from '../../interface/telas/revisao.js';
import { registrarEvento, EVENTOS } from '../../interface/analise.js';
import { COR_JOGADOR_CSS, NOME_SITUACAO } from './layout.js';

/** Troféu desenhado em SVG para a tela de vitória. */
const TROFEU = '<svg viewBox="0 0 64 64" width="72" height="72"><defs><linearGradient id="ouro-trofeu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#e7b23a"/><stop offset="1" stop-color="#8a5a10"/></linearGradient></defs>' +
  '<path d="M18 8h28v10c0 10-6 17-14 17S18 28 18 18z" fill="url(#ouro-trofeu)" stroke="#3a2406" stroke-width="2"/>' +
  '<path d="M18 12H9c0 9 5 14 11 15M46 12h9c0 9-5 14-11 15" fill="none" stroke="#c99a3a" stroke-width="3"/>' +
  '<path d="M28 35h8v9h-8z" fill="#c99a3a" stroke="#3a2406" stroke-width="2"/><path d="M20 44h24v7H20z" fill="url(#ouro-trofeu)" stroke="#3a2406" stroke-width="2"/>' +
  '<path d="M16 51h32v6H16z" fill="#6b1a22" stroke="#3a2406" stroke-width="2"/><path d="M32 14l2.4 5 5.5.6-4.1 3.8 1.1 5.4L32 26l-4.9 2.8 1.1-5.4-4.1-3.8 5.5-.6z" fill="#fff6d0"/></svg>';

export const metodosDoResultado = {
  /**
   * Encerra a mão.
   * @param {{vencedor: number, pontos: number} | null} corrida Resultado de alguém ter corrido do
   *   truco, ou null quando a mão foi jogada até o fim.
   */
  encerrarMao(corrida) {
    if (this.encerrada) return;
    this.encerrada = true;
    this.ocupada = true;
    this.dicaAtual = null;
    const mao = this.mao, partida = this.partida;
    const completa = !corrida;
    const vencedor = completa ? mao.resultado.vencedor : corrida.vencedor;
    const valorDaMao = completa ? partida.valor : corrida.pontos;
    const ganho = marcarTentos(partida, vencedor, completa ? null : corrida.pontos);
    this.redesenhar();
    this.historicoDaPartida.push({
      numero: partida.numeroMao + 1, vencedor, ganho, valor: valorDaMao, completa,
      somas: this.pontuacoes.map((p) => p.total), tentos: partida.tentos.slice(),
    });
    /* mãos com dicas e partidas entre duas pessoas não valem conquistas */
    const valeConquistas = !this.variosHumanos && !this.dicasNaMao;
    const novas = valeConquistas ? this.app.registrarMao({
      mao, eu: 0, venceu: vencedor === 0, completa, partida,
      venceuPartida: partida.encerrada && partida.vencedor === 0, valorDaMao,
      oponenteCorreu: this.oponenteCorreu, opcoes: this.opcoes,
    }) : [];
    this.oponenteCorreu = false;
    const humanoVenceu = mao.jogadores[vencedor].tipo === 'humano';
    const venceuAPartida = humanoVenceu && partida.encerrada && partida.alvo > 1;
    this.registrarEstatisticas(vencedor, humanoVenceu, completa, valorDaMao);
    let espera = completa ? 1100 : 300;
    if (humanoVenceu) espera = this.comemorar(venceuAPartida ? 'partida' : 'mao', mao.jogadores[vencedor].nome);
    else { Som.derrota(); this.falar(provocar('venceu'), vencedor); }
    if (humanoVenceu && !this.variosHumanos) this.time.delayedCall(400, () => this.falar(provocar('perdeu')));
    this.ultimoResultado = { vencedor, ganho, completa, novas, valeConquistas, humanoVenceu };
    this.time.delayedCall(espera, () => this.mostrarResultado());
  },

  /**
   * Estatísticas de uso do fim da mão (interface/analise.js): `fim_mao` sempre e, se a partida
   * acabou, `jogo_finalizado` mais `vitoria_do_jogador` ou `derrota_jogador`. "Jogador" é quem joga
   * neste aparelho: a cadeira dele na partida online, ou qualquer humano no jogo local.
   */
  registrarEstatisticas(vencedor, humanoVenceu, completa, valorDaMao) {
    const mao = this.mao, partida = this.partida, config = mao.config;
    const eu = this.online ? this.cadeiraOnline() : this.quemVe >= 0 ? this.quemVe : 0;
    const venceu = this.online ? vencedor === eu : humanoVenceu;
    const resumo = {
      baralho: config.baralho, terreno: config.terreno, oponente: this.opcoes ? this.opcoes.oponente : '',
      jogadores: mao.jogadores.length, online: this.online ? 1 : 0,
    };
    registrarEvento(EVENTOS.fimDaMao, {
      ...resumo, venceu: venceu ? 1 : 0, completa: completa ? 1 : 0, valor: valorDaMao,
      soma: this.pontuacoes[eu] ? this.pontuacoes[eu].total : 0, dicas: this.dicasNaMao ? 1 : 0,
    });
    if (!partida.encerrada) return;
    const final = { ...resumo, alvo: partida.alvo, maos: partida.numeroMao + 1, tentos: partida.tentos[eu] || 0 };
    registrarEvento(EVENTOS.jogoFinalizado, { ...final, venceu: venceu ? 1 : 0 });
    registrarEvento(venceu ? EVENTOS.vitoria : EVENTOS.derrota, final);
  },

  /**
   * Comemoração da vitória: fanfarra, clarão dourado, faixa grande, fogos e chuva de confete.
   * @param {'mao'|'partida'} nivel A vitória da partida é maior e mais longa.
   * @returns {number} Milissegundos até abrir a tela de resultado.
   */
  comemorar(nivel, nome) {
    const partida = nivel === 'partida';
    if (partida) Som.campeao(); else Som.fanfarra();
    const camera = this.cameras.main;
    camera.flash(350, 255, 225, 140);
    camera.shake(300, 0.006);
    const titulo = partida ? 'CAMPEÃO DA PARTIDA!' : 'VITÓRIA!';
    const subtitulo = this.variosHumanos ? nome + ' venceu' + (partida ? ' a partida' : ' a mão') : partida ? 'Você venceu a partida' : 'Você venceu a mão';
    this.faixaDeVitoria(titulo, subtitulo, partida ? 3200 : 2100);
    const fogos = partida ? 14 : 7, cores = [0xf6dc8f, 0x4aa3df, 0xf59322, 0x7fe08a, 0xff6fb1, 0xffffff];
    for (let i = 0; i < fogos; i++) {
      this.time.delayedCall(150 + i * (partida ? 220 : 240), () => {
        const x = Phaser.Math.Between(330, 900), y = Phaser.Math.Between(110, 420);
        this.explodir(x, y, cores[i % cores.length], partida ? 46 : 34);
      });
    }
    this.chuvaDeConfete(partida ? 3000 : 1800);
    return partida ? 3600 : 2400;
  },

  /** Faixa dourada de vitória com título e subtítulo, que cresce e pulsa. */
  faixaDeVitoria(titulo, subtitulo, duracao) {
    const cx = 610, cy = 300;
    const fundo = this.add.graphics().setDepth(39).setAlpha(0);
    fundo.fillStyle(0x0d0a08, 0.78); fundo.fillRoundedRect(cx - 340, cy - 78, 680, 168, 18);
    fundo.lineStyle(4, 0xd9b260, 1); fundo.strokeRoundedRect(cx - 340, cy - 78, 680, 168, 18);
    fundo.lineStyle(1.5, 0xf6dc8f, 0.6); fundo.strokeRoundedRect(cx - 332, cy - 70, 664, 152, 14);
    const t = this.add.text(cx, cy - 8, titulo, {
      fontFamily: 'Cinzel, Georgia, serif', fontStyle: '900', fontSize: '76px', color: '#f6dc8f', stroke: '#5a3a08', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(40).setScale(0.3).setAlpha(0);
    if (t.width > 640) t.setFontSize(76 * 640 / t.width);
    const sub = this.add.text(cx, cy + 58, subtitulo, { fontFamily: 'Cinzel, Georgia, serif', fontStyle: '700', fontSize: '24px', color: '#efe3c6' })
      .setOrigin(0.5).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: fundo, alpha: 1, duration: 200 });
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 420, ease: 'Back.out' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 300 });
    this.tweens.add({ targets: t, scale: 1.06, duration: 380, yoyo: true, repeat: -1, delay: 450, ease: 'Sine.inOut' });
    this.time.delayedCall(duracao, () => this.tweens.add({
      targets: [fundo, t, sub], alpha: 0, duration: 350, onComplete: () => { fundo.destroy(); t.destroy(); sub.destroy(); },
    }));
  },

  /** Confete colorido caindo do alto da tela. */
  chuvaDeConfete(duracao) {
    const cores = ['#f6dc8f', '#4aa3df', '#f59322', '#7fe08a', '#ff6fb1', '#ffffff'];
    const chaves = cores.map((cor) => {
      const chave = 'confete-' + cor;
      if (!this.textures.exists(chave)) {
        const c = document.createElement('canvas'); c.width = 12; c.height = 20;
        const ctx = c.getContext('2d'); ctx.fillStyle = cor; ctx.fillRect(0, 0, 12, 20);
        this.textures.addCanvas(chave, c);
      }
      return chave;
    });
    for (const chave of chaves) {
      const emissor = this.add.particles(0, -20, chave, {
        x: { min: 260, max: 960 }, speedY: { min: 140, max: 260 }, speedX: { min: -60, max: 60 },
        rotate: { min: 0, max: 360 }, scale: { min: 0.35, max: 0.7 }, lifespan: 3200, frequency: 70, quantity: 1,
      }).setDepth(38);
      this.time.delayedCall(duracao, () => emissor.stop());
      this.time.delayedCall(duracao + 3400, () => emissor.destroy());
    }
  },

  /** HTML com a soma detalhada da rede do jogador `j`. */
  htmlDaRede(j) {
    const mao = this.mao, pontuacao = pontuarRede(mao, j), jogador = mao.jogadores[j];
    const travada = jogador.situacao === 'construindo' && mao.resultado && mao.resultado.travados[j];
    let termos = pontuacao.neuronios.map((n) =>
      '<span class="termo">' + escaparHtml(rotuloCarta(n.carta)) + (n.pilha > 1 ? '×' + n.pilha : '') + ' = ' + n.pontos +
      (n.notas.length ? ' <small>(' + escaparHtml(n.notas.join(', ')) + ')</small>' : '') + '</span>').join('');
    termos += pontuacao.combos.map((c) => '<span class="termo ' + (c.quantidade >= 4 ? 'ruim' : 'combo') + '">' + escaparHtml(c.rotulo) + '</span>').join('');
    return '<div class="rede j' + j + '"><div class="situacao">' + escaparHtml(travada ? 'travada' : NOME_SITUACAO[jogador.situacao]) + '</div>' +
      '<h3 style="margin:2px 0 6px;color:' + COR_JOGADOR_CSS[j] + '">' + escaparHtml(jogador.nome) + '</h3>' +
      '<div class="total">' + pontuacao.total + '</div><div class="termos">' + (termos || '<span class="termo">rede vazia</span>') + '</div>' +
      '<small>dropouts ' + jogador.dropouts + ' · mão ' + jogador.mao.length + '</small></div>';
  },

  /**
   * Tela de resultado: vencedor, critério, redes, placar de tentos, conquistas novas e o botão de
   * revisão da mão. Usa `this.ultimoResultado` (guardado em `encerrarMao`), para poder reabrir
   * depois da revisão.
   */
  mostrarResultado() {
    const { vencedor, ganho, completa, novas, valeConquistas, humanoVenceu } = this.ultimoResultado;
    const mao = this.mao, partida = this.partida;
    const nome = mao.jogadores[vencedor].nome;
    const titulo = this.variosHumanos ? nome + ' vence a mão' : vencedor === 0 ? 'Você venceu a mão!' : nome + ' venceu a mão';
    const motivo = completa ? 'Critério: ' + mao.resultado.motivo + '.' : mao.jogadores.filter((_, j) => j !== vencedor).map((j) => j.nome).join(', ') + ' correu do truco.';
    const campeao = partida.alvo > 1 && partida.encerrada && mao.jogadores[partida.vencedor].tipo === 'humano';
    let html = '<div class="folha' + (humanoVenceu ? ' vitoria' : '') + (campeao ? ' campeao' : '') + '">' +
      (humanoVenceu ? '<div class="trofeu" aria-hidden="true">' + TROFEU + '</div>' : '') +
      '<h2>' + escaparHtml(campeao ? (this.variosHumanos ? nome + ' é campeão da partida!' : 'Você é campeão da partida!') : titulo) + '</h2><p>' + escaparHtml(motivo) + '</p>';
    if (completa) html += '<div class="resultado-grade' + (mao.jogadores.length > 2 ? ' varios' : '') + '">' + mao.jogadores.map((_, j) => this.htmlDaRede(j)).join('') + '</div>';
    if (partida.alvo > 1) {
      html += '<div class="tentos">+' + ganho + (ganho === 1 ? ' tento' : ' tentos') + ' para ' + escaparHtml(nome) +
        ' \u00b7 placar <span class="grande">' + partida.tentos.join(' \u00d7 ') + '</span> (até ' + partida.alvo + ')</div>';
      if (partida.encerrada && !campeao) html += '<p><b>' + escaparHtml(mao.jogadores[partida.vencedor].nome) + ' venceu a partida!</b></p>';
    }
    if (novas.length) {
      html += '<h3>Conquistas desbloqueadas</h3><div class="desbloqueios">' + novas.map((c) => {
        const graduacao = GRADUACOES[c.graduacao];
        return '<div class="desbloqueio">' + medalhaHtml(c, true) + '<div><span class="selo" style="background:' + graduacao.cor + ';color:#24140a">' +
          graduacao.nome + '</span> ' + escaparHtml(c.nome) + '<br><small>' + escaparHtml(c.descricao) + '</small>' +
          avataresDaConquista(c.id).map((a) => '<br><small class="avatar-liberado">Avatar liberado: <b>' + escaparHtml(a.nome) + '</b> (escolha em Menu > Avatar)</small>').join('') + '</div></div>';
      }).join('') + '</div>';
    }
    if (!valeConquistas && !this.variosHumanos) html += '<p class="sem-conquistas">Mão jogada com dicas: não vale conquistas nem conta nas estatísticas.</p>';
    const partidaAcabou = partida.encerrada || partida.alvo <= 1;
    html += '<div class="linha fim" style="margin-top:16px"><button class="botao discreto" id="r-menu">Menu</button>' +
      '<button class="botao" id="r-revisar">Revisar ' + (partidaAcabou && this.historicoDaPartida.length > 1 ? 'a partida' : 'a mão') + '</button>' +
      '<button class="botao vinho" id="r-proxima">' + (partidaAcabou ? 'Nova partida' : 'Próxima mão') + '</button></div></div>';
    const painel = abrirPainel(html);
    painel.elemento.querySelector('#r-menu').addEventListener('click', () => { painel.fechar(); if (!partidaAcabou) this.registrarAbandono(); this.app.irParaMenu(); });
    painel.elemento.querySelector('#r-revisar').addEventListener('click', () => {
      painel.fechar();
      registrarEvento(EVENTOS.revisao, { escopo: partidaAcabou && this.historicoDaPartida.length > 1 ? 'partida' : 'mao' });
      abrirRevisao({
        mao, linhaDoTempo: this.linhaDoTempo, partida, historicoDaPartida: this.historicoDaPartida,
        numeroDaMao: partida.numeroMao + 1, aoFechar: () => this.mostrarResultado(),
      });
    });
    painel.elemento.querySelector('#r-proxima').addEventListener('click', () => {
      painel.fechar();
      if (partidaAcabou) { this.partida = novaPartida(this.opcoes.alvo, this.numJogadores); this.historicoDaPartida = []; if (this.online) this.partidasOnline++; }
      else proximaMao(this.partida);
      this.iniciarMao();
    });
  },
};
