# Validação das regras de negócio

Testes das regras do jogo unificado (NeuroDeck + Truco de Turing), feitos em 10/11/2026, ao fim da Etapa 1 da fusão: a interface do Truco de Turing jogando com o motor de regras do NeuroDeck.

A rodada anterior (Truco de Turing 1.2.0, de 09/11/2026, com 24 testes funcionais no site publicado) está no histórico deste arquivo e da planilha.

## Arquivos

- [`testes-regras-de-negocio.xlsx`](testes-regras-de-negocio.xlsx): planilha com todos os testes e resultados.
  - **Resumo**: totais por bloco, totais das suítes completas e legenda do status.
  - **Testes TDD**: os 40 testes de regra de negócio (RN-01 a RN-40), com cenário, esperado, base da regra, o que mudou na fusão e o resultado.
  - **Motor do NeuroDeck**: os 37 testes do motor em `src/motor/`: equivalência com o site publicado (1.000 partidas), as quatro mudanças de regra (B1, B2, R1, R2), a regra de início e a regressão.
  - **Testes funcionais**: 28 cenários refeitos no jogo unificado (F-01 a F-28).
  - **Robustez**: números de 3.000 mãos aleatórias.
  - **Decisões**: as regras que estavam em aberto, como eram em cada jogo e como ficaram.
- [`../../testes/unidade/regras-de-negocio.test.js`](../../testes/unidade/regras-de-negocio.test.js): os testes de regra de negócio. Cada um tem o identificador RN-xx da planilha e um comentário com o cenário e o resultado esperado; os que mudaram de expectativa têm um comentário "Mudou na fusão". Rodam com a suíte de unidade (`npm run testar`).
- [`../../testes/unidade/motor-equivalencia.test.js`](../../testes/unidade/motor-equivalencia.test.js), [`motor-regras.test.js`](../../testes/unidade/motor-regras.test.js) e [`motor-inicio.test.js`](../../testes/unidade/motor-inicio.test.js): os testes do motor.

## Resultado

| Bloco | Testes | Passou | Atenção | Falhou |
|---|---:|---:|---:|---:|
| Regras de negócio (RN-01 a RN-40) | 40 | 40 | 0 | 0 |
| Motor do NeuroDeck | 37 | 37 | 0 | 0 |
| Testes funcionais do jogo unificado | 28 | 27 | 1 | 0 |

As suítes completas do projeto também passam: 255 testes de unidade, 15 de interface (no Chromium) e 12 de performance.

O único "Atenção" (F-28) é uma pendência já prevista: os textos conceituais do Grimório ainda não foram revistos (issue #7, Etapa 2).

## Como a rodada funcional foi feita

- **Cenários de regra (F-01 a F-22):** montados no estado do motor com `testes/apoio/montagem.js` e executados pelas mesmas funções que as telas usam (`src/nucleo/partida.js`, `pontuacao.js` e `truco.js`).
- **Oponentes (F-23):** 100 mãos completas do Zé do Ruído e do Gradiente Guloso e 20 do Mestre Monte Carlo, todas contra o Zé do Ruído.
- **Robustez (F-24):** 3.000 mãos com jogadas sorteadas entre as legais, alternando os 5 baralhos, os 4 terrenos e as 3 regras de início; a cada jogada, conferência de que nenhuma carta sumiu ou duplicou.
- **Interface (F-25 a F-27):** os testes de `testes/interface/` no Chromium, com capturas em [`../interface/capturas/`](../interface/capturas/).

## Regras que mudaram

Dez dos 40 testes de regra de negócio mudaram de expectativa em relação ao Truco de Turing 1.2.0: RN-03, 09, 10, 13, 15, 25, 27, 30, 31 e 35. As mudanças vêm das respostas do professor e das decisões do grupo de 10/11/2026 (aba **Decisões** da planilha): par de figuras a 20, trio a 30, carta empilhada contando na sequência de figuras, dropout tirando o neurônio da mesa, transfer learning sem gastar a vez, rede sem neurônio livre finalizada na hora, regra do passar, desempate pela carta mais alta e a opção (a) como padrão de quem começa.
