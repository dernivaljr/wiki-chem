# Resultados verificáveis e limitações

O percurso integrado utiliza React, API e MySQL reais. A avaliação separa regras/contratos, componentes, persistência e navegador. São mantidos os cenários negativos de autenticação, autorização, CSRF, concorrência, expiração, preços alterados, rollback e conteúdo não exposto. Capturas são produzidas pelo navegador com dados sintéticos e campos sensíveis mascarados.

A [medição observada](desempenho/README.md) e seu registro bruto documentam tempos reais, ambiente e plano de execução. As [18 capturas revisadas](evidencias/README.md) e seu manifesto estão incorporados, sem edição dos originais. Não são apresentados valores estimados como tempos observados. O ensaio de pesquisa considera 5, 100 e 500 metodologias originais sintéticas, aquecimento e 20 amostras por cenário; mede SQL/montagem de DTO, excluindo rede HTTP, renderização e carga concorrente. O plano de execução é registrado junto dos tempos.

## Resultados funcionais e de ambiente

A verificação consolidada aprovou 406 testes: 102 de backend (regras e contratos), 99 de componentes/rotas React, 162 de integração com MySQL real, 15 de navegador de apresentação/ativos e 28 de navegador com API/MySQL reais. Instalação limpa, build, análise estática e auditorias completas/de produção foram aprovados; nenhuma vulnerabilidade foi detectada no momento da avaliação. As 48 migrações foram aplicadas e repetidas sem reaplicação. Esses números não constituem percentual de cobertura de código nem certificação de segurança.

O ambiente completo também foi verificado com containers: inicialização/prontidão, preparação repetida sem apagar dados, aquisição e direito persistidos, backup e restauração, recusa de manifesto alterado e recusa de DDL pela conta da API. A restauração preservou o pedido/direito e a representação integral adquirida, retirando os dados introduzidos depois do backup no ambiente de teste.

A inspeção visual cobriu capturas reais de cadastro, consulta, filtros, prévia, carrinho, revisão/resultado, pedido, biblioteca, leitura/histórico e administração. Em 320, 375, 768 e 1280 px, os cenários de leitura/pesquisa não apresentaram transbordamento horizontal. Testes anteriores continuam exercitando navegação por teclado, foco, contraste, erros de rede e sessão expirada. Não foi feita certificação integral de acessibilidade.

## Defeitos corrigidos na consolidação

Endereços desconhecidos anteriormente deixavam a interface sem conteúdo principal; agora apresentam mensagem e navegação de recuperação. Mensagens de acesso/administração ainda descreviam pesquisa ou checkout como ausentes e foram alinhadas às funções reais. A preparação do ambiente foi corrigida quanto aos privilégios de banco e à propriedade dos arquivos necessários ao cache do servidor de visualização, preservando a execução sem usuário root na API/interface. Esses ajustes não reescrevem a arquitetura nem aprovam novos recursos comerciais.

## Limitações e interpretação

- O catálogo é composto por fixtures originais, sem validade analítica/comercial, sem documentos normativos reais ou revisão científica humana. Conferência automatizada não comprova aplicabilidade de técnica, equipamento, matriz ou analito.
- A publicação demonstrativa ocorre somente em banco de testes habilitado, por contratos editoriais normais. Não autoriza incorporar corpus de terceiros ou publicar comercialmente.
- Valores de oferta são fictícios; o checkout não processa cobrança, pagamento ou documento fiscal. Condições comerciais definitivas continuam pendentes.
- O ambiente automatizado é controlado e compartilhado; tempos medidos não representam dimensionamento ou SLA de produção. Não foram comprovados alta disponibilidade, recuperação de desastre de produção, concorrência de carga ou operação pública.
- Testes de teclado/contraste/responsividade não certificam conformidade integral de acessibilidade. Avaliações com leitores de tela e usuários diversos permanecem necessárias.
- A restauração ensaia apenas dados demonstrativos no mesmo projeto isolado. Retenção, anonimização, backup externo, gestão operacional e políticas de fontes reais exigem definição própria.

## Conclusão técnica

A integração permite verificar o encadeamento de pesquisa, aquisição simulada e leitura por direito/versão. A separação entre prévia e procedimento e a preservação de snapshots permitem avaliar segurança e consistência sem antecipar pagamentos reais. A prontidão acadêmica refere-se à documentação e ao comportamento observado; a adaptação final ao modelo do professor, a curadoria científica e as decisões comerciais não são inferidas dos testes.
