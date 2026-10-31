# Medição observada da pesquisa

Ensaio realizado em 2026-10-31T00:30:36.305Z, com Node v24.19.0, MySQL 8.4.13 e linux. O processo reportou 4 CPUs lógicas, modelo AMD EPYC 9V45 96-Core Processor e 15.61 GiB de memória visível (`16759443456` bytes); esses valores não representam reserva exclusiva de recursos.

O ensaio parte das 20 publicações iniciais do catálogo demonstrativo (15 fichas técnicas informativas verificadas + 5 fixtures comerciais sintéticas) e escala com fixtures sintéticas até 100 e 500 metodologias/versões publicadas, totalizando 73 termos ativos nas sete taxonomias e 3723 associações N:N ao final. Somente cinco metodologias possuem produtos/ofertas comerciais. Cada série inclui três aquecimentos e 20 amostras; p95 usa a posição de ordem `ceil(0,95 × n)`, sem excluir amostras. Preparação do corpus não integra o tempo de consulta.

| Metodologias | Cenário | Amostras | Resultados | Mediana (ms) | p95 (ms) | Máximo (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | texto com acento | 20 | 3 | 4.43 | 5.49 | 9.55 |
| 20 | sete filtros AND | 20 | 0 | 1.43 | 1.47 | 1.48 |
| 20 | matrizes e analitos OR | 20 | 4 | 2.56 | 2.92 | 2.98 |
| 20 | sem resultados | 20 | 0 | 2.98 | 3.07 | 3.13 |
| 20 | pagina intermediaria ordenada | 20 | 20 | 0.55 | 0.74 | 0.79 |
| 100 | texto com acento | 20 | 19 | 11.37 | 11.82 | 11.96 |
| 100 | sete filtros AND | 20 | 48 | 4.21 | 14.95 | 17.35 |
| 100 | matrizes e analitos OR | 20 | 84 | 3.66 | 4.07 | 4.08 |
| 100 | sem resultados | 20 | 0 | 10.72 | 10.91 | 11.80 |
| 100 | pagina intermediaria ordenada | 20 | 100 | 2.99 | 3.32 | 3.38 |
| 500 | texto com acento | 20 | 99 | 43.18 | 45.32 | 47.69 |
| 500 | sete filtros AND | 20 | 288 | 7.07 | 7.75 | 8.04 |
| 500 | matrizes e analitos OR | 20 | 484 | 7.20 | 7.63 | 7.91 |
| 500 | sem resultados | 20 | 0 | 49.62 | 50.71 | 52.40 |
| 500 | pagina intermediaria ordenada | 20 | 500 | 5.16 | 5.33 | 5.46 |

A página 2 do volume de 20 registros é vazia (`pageSize = 20`); não deve ser interpretada como leitura de 20 cartões completos. As consultas puramente por filtros e paginação mantiveram medianas entre 5.16 e 7.20 ms com 500 publicações, enquanto a varredura textual completa (`LIKE` parametrizado em campos gratuitos, sete facetas ativas e fontes) apresentou medianas de 43.18 ms (com resultados) e 49.62 ms (sem resultados). Não existe meta ou SLA aprovado; esses números não representam latência HTTP, experiência do usuário ou carga concorrente.

O `EXPLAIN` da combinação dos sete filtros, incluído no [registro bruto](medicao.json), estimou varredura `ALL` em `methodology_versions` (500 linhas) e acessos `eq_ref`/`PRIMARY` nas sete tabelas de associação, além de consultas por chave às fontes. São estimativas do otimizador, não tempos medidos por nó.

Limitações: conteúdo sintético de volume após os 20 registros iniciais, ambiente compartilhado aquecido, uma conexão por caso de uso e ausência de clientes concorrentes/rede/renderização. Não foi introduzido mecanismo externo de busca ou IA para este ensaio.
