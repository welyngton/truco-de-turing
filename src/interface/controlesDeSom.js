/**
 * @file Botões de ícone para ligar e desligar os efeitos sonoros e a música no menu principal
 * (issue #133). Na mesa, efeitos e música ficam só dentro da janela MENU (os botões de ícone que
 * ficavam no alto do painel esquerdo foram removidos); os dois lados leem o mesmo estado
 * (`progresso.mudo` e `progresso.musica`) e se atualizam quando qualquer lugar muda o áudio
 * (`Aplicacao.aoMudarAudio`).
 */
import { ICONES_DE_SOM } from '../arte/icones.js';
import { Som } from './som.js';

/** Os dois controles: chave, rótulo fixo, texto da ação para cada estado e ícones. */
export const CONTROLES_DE_SOM = {
  som: { rotulo: 'Efeitos sonoros', ligar: 'Ligar efeitos sonoros', desligar: 'Desligar efeitos sonoros', ligado: 'efeitosLigado', desligadoIcone: 'efeitosDesligado' },
  musica: { rotulo: 'Música', ligar: 'Ligar música', desligar: 'Desligar música', ligado: 'musicaLigada', desligadoIcone: 'musicaDesligada' },
};

/** O controle `chave` está ligado? Efeitos: `progresso.mudo` falso. Música: `progresso.musica` verdadeiro. */
export function controleLigado(progresso, chave) {
  return chave === 'som' ? !progresso.mudo : !!progresso.musica;
}

/** HTML dos dois botões (no estado inicial "ligado"; `ligarControlesDeSom` acerta o estado de verdade). */
export function htmlDosControlesDeSom() {
  const botao = (chave) => {
    const c = CONTROLES_DE_SOM[chave];
    return '<button type="button" class="botao botao-icone" data-controle="' + chave + '" aria-label="' + c.rotulo + '" aria-pressed="true" title="' + c.desligar + '">' +
      '<span class="icone-som" aria-hidden="true">' + ICONES_DE_SOM[c.ligado] + '</span></button>';
  };
  return '<div class="controles-de-som" role="group" aria-label="Som">' + botao('som') + botao('musica') + '</div>';
}

/**
 * Liga os botões do HTML dentro de `raiz` à aplicação: mostram o estado de `app.progresso`,
 * alternam efeitos e música ao clicar e se atualizam sozinhos quando o áudio muda em outro lugar.
 * @param {HTMLElement} raiz Elemento que contém `htmlDosControlesDeSom()`.
 * @param {object} app Aplicacao.
 * @param {string} terrenoDaMusica Trilha que a música liga ao ser ligada aqui ('menu').
 * @returns {() => void} Cancela a ligação.
 */
export function ligarControlesDeSom(raiz, app, terrenoDaMusica) {
  const botoes = [...raiz.querySelectorAll('[data-controle]')];
  const atualizar = () => {
    for (const botao of botoes) {
      const chave = botao.dataset.controle, c = CONTROLES_DE_SOM[chave], ligado = controleLigado(app.progresso, chave);
      botao.setAttribute('aria-pressed', ligado ? 'true' : 'false');
      botao.title = ligado ? c.desligar : c.ligar;
      botao.querySelector('.icone-som').innerHTML = ICONES_DE_SOM[ligado ? c.ligado : c.desligadoIcone];
    }
  };
  const parar = app.aoMudarAudio(() => { if (!raiz.isConnected) parar(); else atualizar(); });
  for (const botao of botoes) {
    botao.addEventListener('click', () => {
      Som.desbloquear(); /* o clique é o gesto que o navegador exige para liberar o áudio */
      if (botao.dataset.controle === 'som') app.alternarSom(); else app.alternarMusica(terrenoDaMusica);
      atualizar();
    });
  }
  atualizar();
  return parar;
}
