/**
 * @file Terrenos (seção "Extensões" da especificação). O efeito de cada um é aplicado pelo motor
 * do NeuroDeck (`src/motor/engine/terrains.js`); aqui ficam só nome e descrição.
 */
export const TERRENOS = {
  neutro: { nome: 'Mesa neutra', resumo: 'Sem efeito. Feltro verde, café e truco.' },
  montanha: { nome: 'Montanha', resumo: 'A trilha sobe: cada neurônio vale 1 ponto a mais por camada alcançada (a oculta 1 ganha 1, a oculta 2 ganha 2…).' },
  pantano: { nome: 'Pântano', resumo: 'A cada rodada, neurônios sem tunagem afundam e perdem 1 ponto. Tunar mantém o neurônio à tona.' },
  oceano: { nome: 'Oceano', resumo: 'A cada rodada o vento escolhe um naipe. Neurônios desse naipe revelados na rodada valem o dobro para sempre.' },
};
