# Medição observada da pesquisa

Ensaio realizado em 2026-10-30T22:21:52.990Z, com Node v24.19.0, MySQL 8.4.13 e linux. O processo reportou 4 CPUs lógicas, modelo AMD EPYC 9V74 80-Core Processor e 15.61 GiB de memória visível; esses valores não representam reserva exclusiva de recursos.

Foram utilizadas 500 metodologias/versões publicadas originais sintéticas, 14 termos e 3700 associações N:N. Somente cinco metodologias possuem produtos/ofertas. As demais avaliam pesquisa independente de oferta. Cada série inclui três aquecimentos e 20 amostras; p95 usa a posição de ordem ceil(0,95 × n), sem excluir amostras. Preparação do corpus não integra o tempo de consulta.

| Metodologias | Cenário | Amostras | Resultados | Mediana (ms) | p95 (ms) | Máximo (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | texto com acento | 20 | 1 | 3.75 | 4.00 | 4.22 |
| 5 | sete filtros AND | 20 | 3 | 4.75 | 5.37 | 15.05 |
| 5 | matrizes e analitos OR | 20 | 5 | 4.13 | 4.23 | 4.24 |
| 5 | sem resultados | 20 | 0 | 1.35 | 1.52 | 1.53 |
| 5 | pagina intermediaria ordenada | 20 | 5 | 0.84 | 1.04 | 1.07 |
| 100 | texto com acento | 20 | 20 | 7.80 | 8.50 | 9.36 |
| 100 | sete filtros AND | 20 | 60 | 6.09 | 6.56 | 6.70 |
| 100 | matrizes e analitos OR | 20 | 100 | 5.37 | 5.45 | 5.55 |
| 100 | sem resultados | 20 | 0 | 5.39 | 5.56 | 6.03 |
| 100 | pagina intermediaria ordenada | 20 | 100 | 4.38 | 4.84 | 5.05 |
| 500 | texto com acento | 20 | 100 | 23.73 | 27.20 | 30.38 |
| 500 | sete filtros AND | 20 | 300 | 10.34 | 10.93 | 11.05 |
| 500 | matrizes e analitos OR | 20 | 500 | 9.37 | 9.77 | 9.77 |
| 500 | sem resultados | 20 | 0 | 23.24 | 23.66 | 23.94 |
| 500 | pagina intermediaria ordenada | 20 | 500 | 7.44 | 7.83 | 7.83 |

A página 2 do volume de cinco registros é vazia; não deve ser interpretada como leitura de 20 resultados. Texto/ausência de resultados cresceram mais que os filtros neste corpus. Com 500 publicações, as medianas ficaram entre 7.44 e 23.73 ms. Não existe meta ou SLA aprovado; esses números não representam latência HTTP, experiência do usuário ou carga concorrente.

O EXPLAIN da combinação dos sete filtros, incluído no [registro bruto](medicao.json), estimou varredura ALL em methodology_versions (500 linhas) e acessos eq_ref/PRIMARY nas sete associações, além de consultas por chave às fontes. São estimativas do otimizador, não tempos medidos por nó. O desenho evita duplicação de resultados, mas o ensaio não demonstra eliminação de varreduras nem dimensionamento para grande corpus.

Limitações: categorias pouco variadas, conteúdo curto e repetitivo, ambiente compartilhado aquecido, uma conexão por caso de uso e ausência de clientes concorrentes/rede/renderização. Curadoria real, distribuição de termos, dados extensos e percentis sob carga precisam de novo estudo antes de qualquer prontidão de produção. Não foi introduzido mecanismo externo de busca ou IA para este ensaio.
