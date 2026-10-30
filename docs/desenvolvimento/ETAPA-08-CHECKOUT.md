# Registro interno — Etapa 08

Base main: 6cad8eadebffc41d5721f07c2c86c914c86a61d2. PR #8 integrado; execução 41085416275 aprovada. Branch codex/checkout-demonstrativo-pedidos.

Implementação: checkout em duas transações, snapshots imutáveis, registro de direitos, histórico próprio, idempotência durável no cliente e backend, 12 migrações novas (47 totais), sem pagamentos ou biblioteca integral.

Validação local: build/lint e 86 testes frontend + 95 backend aprovados. Instalação limpa inicialmente limitada pelo cache npm do sandbox; repetida com acesso autorizado ao cache. Integração MySQL e Chromium serão executados pelo CI isolado, pois não há servidor MySQL/Docker/navegador instalado neste ambiente Windows. Resultados finais do código em 8307dc06f582d50e86744bf8565963a01dfed6fe: execução 41093528456 aprovada nos dois jobs. PR #9: https://github.com/dernivaljr/wiki-chem/pull/9. Nenhuma credencial de produção é utilizada.

## Comandos e resultados

- npm run install:clean: ambos os pacotes instalados de forma limpa.
- npm run build e npm run lint: aprovados.
- npm test: 86 frontend + 95 backend aprovados.
- npm run db:status; npm run db:migrate (duas vezes); npm run db:status: 47 migrações aplicadas, repetição sem efeitos adicionais.
- npm run test:integration: 144 testes MySQL aprovados, incluindo 30 de checkout.
- npm run test:e2e: 13 testes Chromium aprovados.
- npm run test:auth: 23 jornadas com API/MySQL reais aprovadas.
- npm run audit:deps e npm run audit:prod: zero vulnerabilidades em frontend/backend.
- Validação documental: 12 documentos UTF-8, 14 diagramas Mermaid cercados corretamente, links locais existentes e separação acadêmica/operacional; git diff --check sem erros. Diagramas não foram renderizados por ferramenta externa.

A primeira execução (41093090442) detectou conflito de gap locks na preparação simultânea de carrinhos vazios. Corrigida a reserva desnecessária em cart_items, mantendo serialização pelo usuário/carrinho. A segunda execução aprovou todos os cenários sem testes instáveis ou ignorados. MySQL/Chromium reais foram executados em serviço isolado GitHub Actions; não estavam disponíveis localmente.

Nenhum endpoint de biblioteca integral foi criado. A Etapa 09 utilizará direitos persistidos; condições comerciais/retencão e curadoria continuam pendentes. Integração e verificação pós-merge serão registradas pelo estado do PR e da execução da main, sem inserir metadados operacionais no material acadêmico.
