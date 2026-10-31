# Medição observada da pesquisa

Ensaio realizado em 2026-10-31T11:19:02.202Z, com Node v24.19.0, MySQL 8.4.13 e linux. O processo reportou 4 CPUs lógicas, modelo AMD EPYC 7763 64-Core Processor e 15.61 GiB de memória visível (`16759443456` bytes); esses valores não representam reserva exclusiva de recursos.

O ensaio parte das 15 metodologias publicadas ativas do catálogo demonstrativo (produtos digitais autorais do Wiki-Chem fundamentados em fontes públicas EPA/USGS, com os 5 registros sintéticos legados arquivados em `RETIRED`) e escala com registros sintéticos de volume até 20, 100 e 500 versões publicadas, totalizando 73 termos ativos nas sete taxonomias e 3723 associações N:N ao final. Cada série inclui três aquecimentos e 20 amostras; p95 usa a posição de ordem `ceil(0,95 × n)`, sem excluir amostras. Preparação do corpus não integra o tempo de consulta.

| Metodologias | Cenário | Amostras | Resultados | Mediana (ms) | p95 (ms) | Máximo (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 20 | texto com acento | 20 | 0 | 5.12 | 5.23 | 5.26 |
| 20 | sete filtros AND | 20 | 0 | 2.79 | 2.91 | 3.00 |
| 20 | matrizes e analitos OR | 20 | 4 | 5.54 | 5.87 | 5.99 |
| 20 | sem resultados | 20 | 0 | 5.19 | 5.28 | 5.34 |
| 20 | pagina intermediaria ordenada | 20 | 15 | 1.43 | 1.45 | 1.46 |
| 100 | texto com acento | 20 | 16 | 18.94 | 19.42 | 19.63 |
| 100 | sete filtros AND | 20 | 48 | 7.87 | 8.31 | 8.46 |
| 100 | matrizes e analitos OR | 20 | 84 | 6.72 | 7.19 | 7.20 |
| 100 | sem resultados | 20 | 0 | 17.23 | 17.47 | 18.20 |
| 100 | pagina intermediaria ordenada | 20 | 95 | 6.00 | 6.47 | 6.55 |
| 500 | texto com acento | 20 | 96 | 70.71 | 71.75 | 71.82 |
| 500 | sete filtros AND | 20 | 288 | 13.45 | 13.90 | 13.93 |
| 500 | matrizes e analitos OR | 20 | 484 | 12.35 | 12.61 | 16.47 |
| 500 | sem resultados | 20 | 0 | 78.16 | 78.95 | 84.75 |
| 500 | pagina intermediaria ordenada | 20 | 495 | 9.65 | 9.96 | 10.16 |

As consultas puramente por filtros e paginação mantiveram medianas entre 9.65 e 13.45 ms com 500 publicações, enquanto a varredura textual completa (`LIKE` parametrizado em campos gratuitos, sete facetas ativas e fontes) apresentou medianas de 70.71 ms (com resultados) e 78.16 ms (sem resultados). Não existe meta ou SLA aprovado; esses números não representam latência HTTP, experiência do usuário ou carga concorrente.

O `EXPLAIN` da combinação dos sete filtros, incluído no [registro bruto](medicao.json), estimou varredura sobre `methodology_versions` e acessos `eq_ref`/`PRIMARY` nas tabelas de associação e fontes. São estimativas do otimizador, não tempos medidos por nó.

Limitações: conteúdo sintético de volume após os registros analíticos iniciais, ambiente compartilhado aquecido, uma conexão por caso de uso e ausência de clientes concorrentes/rede/renderização. Não foi introduzido mecanismo externo de busca ou IA para este ensaio.
