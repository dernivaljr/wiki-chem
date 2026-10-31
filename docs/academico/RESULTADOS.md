# Resultados verificáveis e limitações

O percurso integrado é exercitado sobre React, API Fastify e MySQL 8.4 reais. A verificação abrange regras de domínio, contratos HTTP, componentes React, persistência relacional e navegação automatizada em desktop e mobile, incluindo cenários negativos de autenticação, autorização por papel, CSRF, concorrência otimista, expiração de pedido, preço/oferta alterados, rollback transacional e confidencialidade do conteúdo adquirido. Capturas reais são geradas automaticamente por navegador com dados mascarados na origem.

A [medição observada](desempenho/README.md) e seu registro bruto documentam tempos reais, ambiente e plano de execução. As [18 capturas revisadas](evidencias/README.md) e seu manifesto SHA-256 estão incorporados sem edição posterior. O ensaio de pesquisa avalia 20, 100 e 500 metodologias publicadas ativas (partindo dos 15 produtos digitais autorais de química analítica com 73 termos ativos nas sete taxonomias, expandidos com registros sintéticos de volume até 20, 100 e 500), com aquecimento e 20 amostras por cenário sobre SQL parametrizado e montagem de DTO.

## Resultados funcionais e de ambiente

A verificação automatizada consolidada aprovou **415 testes**: 105 de unidade e contratos do backend (regras de domínio, aliases químicos, preços acadêmicos configuráveis e validação de integridade dos guias comerciais), 102 de componentes e rotas React (menu suspenso `Perfil`, contador dinâmico em `Carrinho`, pesquisa simplificada com filtros recolhidos e termo obrigatório, cartões compactos, página de produto inspirada na ASTM, aviso discreto no checkout e leitura estruturada), 165 de integração com MySQL real, 15 de apresentação/responsividade/contraste/ativos e 28 de jornadas completas no navegador sobre API e MySQL reais. Instalação limpa, build, análise estática e auditorias de dependências completas e de produção foram aprovados com zero vulnerabilidades detectadas no momento da execução. As 48 migrações foram aplicadas e reexecutadas de forma idempotente.

No ambiente Docker Compose isolado (`wikichem-academic-demo`), foram verificados inicialização e prontidão dos serviços, reconciliação idempotente sem reset ou perda de contas/pedidos/direitos existentes, arquivamento dos cinco registros sintéticos legados (`RETIRED`, fora da pesquisa e da vitrine), disponibilidade dos **15 produtos digitais autorais do Wiki-Chem** (`WK-ANL-001` a `WK-ANL-015`) com preços em BRL (`R$ 29,00` a `R$ 68,00`), pesquisa combinada de `ferro` com espectrofotometria/UV-Vis, aquisição isenta de cobrança com desbloqueio imediato do guia estruturado na biblioteca, ciclo de backup/restauração, recusa de manifesto adulterado e ausência de privilégio DDL na conta da API.

A inspeção visual validou cadastro, login, pesquisa inicial simplificada, abertura sob demanda dos sete filtros analíticos, página de produto em duas colunas no desktop e empilhada no mobile, menu `Perfil` e contador dinâmico do carrinho, revisão de pedido com aviso discreto de isenção de cobrança, biblioteca do titular, leitura técnica estruturada por seções, histórico de versões (`v1`/`v2`) e gestão administrativa. Em viewports de 320, 375, 768 e 1280 px não houve transbordamento horizontal, mantendo navegação por teclado e contraste mínimo de 4,5:1 nos cenários testados.

## Consolidação da experiência de e-commerce e do catálogo autoral

O catálogo demonstrativo apresenta **15 guias técnicos digitais originais em português** (`WK-ANL-001` a `WK-ANL-015`), fundamentados em publicações públicas oficiais verificadas do USGS (TEI-223 para ferro total com 1,10-fenantrolina por UV-Vis) e da U.S. EPA (EPA 180.1, 200.7, 200.8, 245.1, 300.0, 350.1, 353.2, 365.1, 410.4, 7000B, 7196A, 8260D, 9040C e 9253). Cada metodologia exibe prévia pública concisa (2–3 frases nos resultados de busca e um parágrafo breve no detalhe) e protege na biblioteca digital conteúdo autoral substancial organizado em cinco seções técnicas e referências rastreáveis, indicando claramente o que o adquirente recebe sem reproduzir nem comercializar normas de terceiros como documentos licenciados.

## Limitações e interpretação

- Os 15 guias digitais do Wiki-Chem são sínteses técnicas interpretativas originais em português baseadas em documentos governamentais de acesso público; não reproduzem textos normativos integrais de terceiros, não passaram por revisão científica humana por pares e não conferem conformidade regulatória automática.
- Os preços exibidos em BRL (`R$ 29,00` a `R$ 68,00` por padrão, configuráveis por ambiente) destinam-se à experiência acadêmica de e-commerce; o checkout informa expressamente que não realiza cobrança financeira nem emite documento fiscal.
- Caso uma ficha seja configurada sem produto autoral elegível, o sistema preserva apenas a referência informativa com indicação de pendência, bloqueando ofertas comerciais vazias ou genéricas.
- A reconciliação demonstrativa opera exclusivamente em banco de testes explicitamente habilitado (`NODE_ENV=test`, `DEMO_ALLOW=true`, `wikichem_test_*`); não existe seed de produção.
- Os tempos de consulta observados refletem ambiente controlado sem carga concorrente e não constituem SLA de produção; as verificações automatizadas de teclado e contraste não substituem auditoria completa de acessibilidade com tecnologias assistivas.

## Conclusão técnica

O MVP entrega uma experiência coesa e responsiva de pesquisa analítica, apresentação comercial inspirada em catálogos normativos de referência e aquisição controlada de guias técnicos digitais próprios, preservando rigorosamente a rastreabilidade documental, o isolamento entre papéis e a integridade transacional em MySQL real.
