# Execução operacional da demonstração isolada

Este guia é interno e não integra o material acadêmico. Requer Node.js 24.19/npm 11 e Docker com Compose v2, daemon em execução e porta local 4180 livre. Não contrata serviços nem publica o sistema na internet.

```sh
npm run demo:prepare
npm run demo:access
```

`demo:prepare` constrói React/API, aguarda MySQL 8.4, aplica as 48 migrações e reconcilia de forma idempotente o catálogo demonstrativo pelos contratos editoriais e comerciais reais. Usa exclusivamente `NODE_ENV=test`, banco `wikichem_test_demo`, habilitações `MYSQL_TEST_ALLOW=true` / `DEMO_ALLOW=true` e projeto Compose `wikichem-academic-demo`. O frontend fica em `http://127.0.0.1:4180`; API e MySQL não publicam portas no host. A origem deve ser usada exatamente como indicada, devido ao controle de origem/CSRF. Não existe seed de produção.

O catálogo demonstrativo reconciliado organiza as metodologias em dois grupos:

1. **15 produtos digitais autorais de química analítica** (`info-*`, códigos editoriais `WK-ANL-001` a `WK-ANL-015`), fundamentados em referências públicas verificadas da U.S. EPA e do USGS (ferro total com 1,10-fenantrolina por UV-Vis / USGS TEI-223, EPA 180.1, EPA 200.7, EPA 200.8, EPA 245.1, EPA 300.0, EPA 350.1, EPA 353.2, EPA 365.1, EPA 410.4, EPA 7000B, EPA 7196A, EPA 8260D, EPA 9040C e EPA 9253). Cada guia possui prévia concisa gratuita, conteúdo interpretativo autoral substancial protegido na biblioteca digital (escopo físico-químico, interferências e mitigação, estrutura operacional comentada, calibração/cálculos e controle de qualidade com referências rastreáveis) e preço em BRL configurável (`R$ 29,00` a `R$ 68,00` por padrão, ajustável via `WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS` ou `WIKICHEM_DEMO_PRICES`), sem reproduzir nem comercializar normas de terceiros como documentos licenciados. Caso uma ficha seja configurada sem produto autoral elegível (`null` em `WIKICHEM_DEMO_PRICES`), permanece publicada exclusivamente como referência informativa com pendência explícita, sem oferta falsa.
2. **5 registros sintéticos legados arquivados** (`academic-demo-1` a `academic-demo-5`), conciliados em `lifecycle = 'RETIRED'` e `products.active = FALSE` para não figurarem na vitrine ou na pesquisa principal, preservando integralmente pedidos históricos, snapshots e direitos adquiridos existentes no banco.

`demo:access` exige terminal interativo. Gera nova senha aleatória da conta administrativa sintética, revoga suas sessões anteriores e exibe a credencial uma única vez, sem senha padrão nem gravação em arquivo. Clientes podem cadastrar sua própria conta local para demonstrar a jornada. A conta de automação é uma fixture de software, não identidade humana nem evidência de revisão científica.

Segredos de infraestrutura são gerados com aleatoriedade criptográfica em diretório temporário do sistema operacional, fora do repositório, com permissões restritas onde suportado. Se forem apagados enquanto existir volume, a preparação recusa gerar credenciais incompatíveis.

```sh
npm run demo:status
npm run demo:down
npm run demo:up
npm run demo:backup
npm run demo:restore -- CAMINHO_ABSOLUTO_DO_BACKUP_GERADO
```

`down` preserva o volume. `up` reconcilia de forma incremental e idempotente um banco demonstrativo já preparado: preserva integralmente contas de usuários, senhas, sessões, carrinhos, pedidos e direitos adquiridos existentes, arquiva os cinco registros sintéticos legados sem apagá-los, atualiza as sete taxonomias analíticas reais e assegura os 15 produtos digitais autorais e seus preços em BRL. Banco ocupado sem a conta administrativa de automação demonstrativa é recusado antes de qualquer mutação.

Backup inclui apenas o banco demonstrativo e fica fora do repositório. Restore aceita apenas arquivo gerado no diretório próprio, com manifesto de projeto/banco e checksum SHA-256 válido.

```sh
npm run demo:verify
npm run demo:reset -- --confirm-demo-reset
```

`verify` usa contas sintéticas temporárias para validar prontidão, catálogo de 15 produtos digitais autorais comercializáveis (zero itens sintéticos legados na busca), pesquisa combinada de `ferro` com espectrofotometria/UV-Vis, aquisição isenta de cobrança, desbloqueio do guia autoral na biblioteca, backup/restauração, recusa de manifesto adulterado e ausência de privilégio DDL na conta da API. Como `verify` executa ciclo de backup/restauração, destina-se a ambientes recém-preparados ou CI, não devendo substituir `demo:up` sobre sessões de apresentação em andamento. `reset` remove apenas os volumes do projeto `wikichem-academic-demo` mediante flag explícita `--confirm-demo-reset`.

## Evidências e desempenho

Os comandos de integração usam banco descartável `wikichem_test_<sufixo>`, `NODE_ENV=test` e `MYSQL_TEST_ALLOW=true`. `npm run test:integration` mede a pesquisa com 20, 100 e 500 publicações ativas e 73 termos ativos das sete taxonomias, gravando `.artifacts/performance.json`. `npm run evidence:academic` executa a jornada Playwright real (`zz-academic.spec.ts`) e grava 18 capturas mascaradas e manifesto em `.artifacts/evidence`.
