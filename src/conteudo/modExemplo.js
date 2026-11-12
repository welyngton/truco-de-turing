/**
 * @file Mod de exemplo mostrado na tela "Mods" (interface/telas/mods.js).
 *
 * O código fica num texto para a tela poder exibi-lo e copiá-lo; o teste
 * `testes/unidade/mods.test.js` carrega esse mesmo texto como módulo e confere que ele funciona
 * com o motor do NeuroDeck.
 */

/** Código do mod de exemplo: o terreno "Regularização L1". */
export const CODIGO_DO_MOD_DE_EXEMPLO = `// Mod de exemplo: terreno "Regularização L1".
//
// Em redes neurais, a regularização L1 penaliza pesos grandes para o modelo não
// depender demais de poucos deles. Neste terreno, cada neurônio da rede que vale
// mais de 8 pontos perde 1 ponto.

// Versão da API de mods do motor. O carregador avisa se for diferente.
export const apiVersion = 2;

// O carregador chama a função padrão do módulo com o registro do motor.
export default function (NeuroDeck) {
  NeuroDeck.registerTerrain({
    id: 'regularizacao-l1',          // identificador único (obrigatório)
    name: 'Regularização L1',        // nome mostrado no menu (obrigatório)
    emoji: '⚖️',
    desc: 'Neurônios que valem mais de 8 pontos perdem 1 ponto.',

    // Ajuste sobre um neurônio da rede do jogador p. Devolve { delta, note } ou null.
    // O baralho aplica o ajuste no lugar certo (na soma, no Clássico).
    neuronBonus(state, p, slot) {
      const rank = slot.card.rank;                         // 1 = Ás, 11 = J, 12 = Q, 13 = K
      const valor = rank === 1 ? 11 : rank >= 11 ? 0 : rank; // valor no baralho Clássico
      return valor > 8 ? { delta: -1, note: '−1 L1' } : null;
    },
  });
}
`;
