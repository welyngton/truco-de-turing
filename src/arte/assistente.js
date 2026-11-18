/**
 * @file Rosto do Percy, o assistente do tutorial: uma cabeça redonda de perceptron, com antena de
 * neurônio e olhos-camada. É um SVG pequeno (HTML), usado nos balões de fala.
 */

/** SVG do rosto do assistente (64 x 64), sem texto, para decoração. */
export function rostoDoAssistente() {
  return '<svg class="rosto-do-assistente" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">' +
    '<line x1="32" y1="6" x2="32" y2="15" stroke="#d9b260" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="32" cy="6" r="4.5" fill="#f6dc8f" stroke="#7a5a1c" stroke-width="1.5"/>' +
    '<rect x="8" y="15" width="48" height="42" rx="15" fill="#3a0810" stroke="#d9b260" stroke-width="3"/>' +
    '<circle cx="22" cy="33" r="7.5" fill="#fff6dc"/><circle cx="42" cy="33" r="7.5" fill="#fff6dc"/>' +
    '<circle cx="23.5" cy="34" r="3.4" fill="#2a1c0c"/><circle cx="43.5" cy="34" r="3.4" fill="#2a1c0c"/>' +
    '<circle cx="24.6" cy="32.6" r="1.1" fill="#fff"/><circle cx="44.6" cy="32.6" r="1.1" fill="#fff"/>' +
    '<path d="M22 46 Q32 53 42 46" fill="none" stroke="#f6dc8f" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="13" cy="44" r="2" fill="#d9b260"/><circle cx="51" cy="44" r="2" fill="#d9b260"/>' +
    '</svg>';
}
