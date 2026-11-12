# Relatórios de testes

**Versão 1.3.1** · commit `0b63147-dirty` (com as mudanças ainda não registradas) · 11/11/2026, 23:28 (horário de Brasília)  
Ambiente: Node v22.23.4 · Chromium 153.0.8010.12 · Linux x64 · 2 núcleos

Gerado por `npm run relatorios` (`ferramentas/relatorios.js`).

## Resultado

| Suíte | Testes | Aprovados | Reprovados | Duração | Relatório |
|---|---:|---:|---:|---:|---|
| ✅ Testes de unidade | 321 | 321 | 0 | 45,3 s | [unidade/](unidade/README.md) |
| ✅ Testes de interface | 23 | 23 | 0 | 1040,6 s | [interface/](interface/README.md) |
| ✅ Testes de performance | 12 | 12 | 0 | 22,6 s | [performance/](performance/README.md) |

## Cobertura

| Linhas | Instruções | Ramos | Funções (todas) | Funções e métodos com nome |
|---:|---:|---:|---:|---:|
| 98,0% | 98,0% | 91,8% | 95,2% | 787 de 827 |

Detalhe por arquivo e por função em [cobertura/](cobertura/README.md).

## Destaques de performance

| Medida | Valor | Limite |
|---|---:|---:|
| Tempo até o menu (WebGL) | 815 ms | ≤ 15.000 |
| Quadros por segundo na mesa (Canvas) | 59,65 qps | ≥ 20,00 |
| Mãos completas simuladas | 1.872 mãos/s | ≥ 150 |
| Decisão gulosa | 0,03 ms | ≤ 60,00 |
| Simulações por decisão (Monte Carlo) | 280 partidas | ≥ 80,00 |
| Tamanho do arquivo único | 598 KB | ≤ 700 |

Todas as medidas em [performance/](performance/README.md).

## Validação das regras de negócio

Testes de aceitação RN-01 a RN-40 (dentro da suíte de unidade), testes funcionais no site e pontos de regra para validar com o professor: [validacao/](validacao/README.md).

## Como rodar

```bash
npm run testar              # unidade
npm run testar:interface    # interface (Chromium)
npm run testar:performance  # performance
npm run relatorios          # tudo + relatórios e cobertura
```
