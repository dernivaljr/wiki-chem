# Resultados verificáveis e limitações

O percurso integrado utiliza React, API e MySQL reais. A avaliação separa regras/contratos, componentes, persistência e navegador. São mantidos os cenários negativos de autenticação, autorização, CSRF, concorrência, expiração, preços alterados, rollback e conteúdo não exposto. Capturas são produzidas pelo navegador com dados demonstrativos isolados e campos sensíveis mascarados.

A [medição observada](desempenho/README.md) e seu registro bruto documentam tempos reais, ambiente e plano de execução. As [18 capturas revisadas](evidencias/README.md) e seu manifesto estão incorporados, sem edição dos originais. Não são apresentados valores estimados como tempos observados. O ensaio de pesquisa considera 20, 100 e 500 metodologias publicadas (partindo do catálogo demonstrativo inicial de 20 itens com 73 termos analíticos ativos, expandido com fixtures sintéticas de volume), aquecimento e 20 amostras por cenário; mede SQL/montagem de DTO, excluindo rede HTTP, renderização e carga concorrente. O plano de execução é registrado junto dos tempos.

## Resultados funcionais e de ambiente

A verificação consolidada aprovou **410 testes**: 104 de backend (regras, aliases de pesquisa, validação das fichas técnicas e contratos), 100 de componentes/rotas React, 163 de integração com MySQL real, 15 de navegador de apresentação/ativos e 28 de navegador com API/MySQL reais. Instalação limpa, build, análise estática e auditorias completas/de produção foram aprovados com zero vulnerabilidades detectadas no momento da avaliação. As 48 migrações foram aplicadas e repetidas sem reaplicação. Esses números não constituem percentual de cobertura de código nem certificação de segurança.

O ambiente completo também foi verificado com containers: inicialização/prontidão, reconciliação idempotente sem apagar contas/pedidos existentes, catálogo com 20 publicações (15 fichas técnicas informativas de referência pública sem oferta comercial + 5 fixtures sintéticas comercializáveis), pesquisa combinada de `ferro` com espectrofotometria/UV-Vis, aquisição e direito persistidos, backup e restauração, recusa de manifesto alterado e recusa de DDL pela conta da API.

A inspeção visual cobriu capturas reais de cadastro, consulta analítica com sete filtros compactos, prévia sintética, carrinho, revisão/resultado, pedido, biblioteca, leitura/histórico e administração das taxonomias reais de química analítica. Em 320, 375, 768 e 1280 px, os cenários de leitura/pesquisa não apresentaram transbordamento horizontal. Testes automatizados exercitam navegação por teclado, foco, contraste (≥ 4,5:1), erros de rede e sessão expirada. Não foi feita certificação integral de acessibilidade.

## Evolução do catálogo técnico e da pesquisa demonstrativa

Na Etapa 11, o catálogo demonstrativo foi ampliado com 15 fichas técnicas informativas originais em português referenciando publicações governamentais de acesso público (USGS TEI-223 para ferro por 1,10-fenantrolina em UV-Vis e 14 métodos EPA, incluindo EPA 200.7, EPA 300.0 e EPA 8260D), sem copiar procedimentos integrais e sem oferta comercial (`offer: null`). As taxonomias ativas foram atualizadas para 73 termos reais de química analítica, com sete filtros compactos e detalhes normativos sob demanda. A busca textual passou a tratar aliases químicos e siglas (`ferro`/`Fe`, `UV-Vis`, `GC-MS`, `ICP-OES` etc.) com delimitação sensível à caixa para símbolos curtos, evitando falsos positivos por substring em palavras comuns.

## Limitações e interpretação

- As 15 fichas técnicas informativas possuem texto descritivo original em português, limitações explícitas e URLs verificadas da U.S. EPA e do USGS, mas não reproduzem procedimentos operacionais integrais, não possuem revisão científica humana nem conferem vigência regulatória automática.
- As 5 ofertas comerciais (`DEMO 01`–`DEMO 05`) permanecem estritamente sintéticas e separadas das fichas de referência externa; nenhum conteúdo de terceiros é comercializado.
- A preparação e reconciliação demonstrativa ocorrem somente em banco de testes explicitamente habilitado (`NODE_ENV=test`, `DEMO_ALLOW=true`, `wikichem_test_*`); não existe seed de produção.
- Valores de oferta são fictícios; o checkout não processa cobrança, pagamento ou documento fiscal. Condições comerciais definitivas continuam pendentes.
- O ambiente automatizado é controlado e compartilhado; tempos medidos não representam dimensionamento ou SLA de produção.
- Testes de teclado/contraste/responsividade não certificam conformidade integral de acessibilidade. Avaliações com leitores de tela e usuários diversos permanecem necessárias.

## Conclusão técnica

A integração permite verificar simultaneamente a consulta técnica representativa de química analítica (com sete taxonomias reais, referências documentais verificáveis e proteção contra comercialização de fontes externas) e o encadeamento completo de aquisição simulada e leitura versionada sobre fixtures próprias de software. O relatório acadêmico final em DOCX não foi gerado nesta etapa.
