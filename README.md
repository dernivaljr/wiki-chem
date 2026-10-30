# Wiki-Chem

Plataforma acadêmica de pesquisa e comercialização demonstrativa de metodologias de química analítica, desenvolvida no curso DSM da FATEC, disciplina de Engenharia de Software II.

## Estado do sistema

| Implementado | Limites |
| --- | --- |
| Frontend React/TypeScript: Home, Sobre, acesso e painel de consultas | Login/cadastro são simulações; pesquisa e filtros ainda não consultam dados |
| Backend modular Node.js 24/TypeScript strict/Fastify | Somente infraestrutura, sem autenticação, catálogo ou comércio |
| API `/api/v1/health` e `/api/v1/health/database` | Saúde do processo e disponibilidade do MySQL são verificações distintas; não certificam esquema de negócio |
| Pool MySQL 8.4, SQL parametrizado e helper transacional | Única tabela persistente implementada: controle de migrações |
| Migrações SQL controladas, erros JSON, validação Zod e requestId | Não há migração automática ao iniciar o servidor |
| Testes unitários, de contrato, MySQL real e navegador | Testes de apresentação não comprovam funcionalidades simuladas |

A rota React `/consultas` continua pública. Não há conta, sessão, conteúdo técnico, pedido ou direito de acesso persistido. Autenticação real será o próximo incremento. Catálogo, sete filtros, checkout simulado e biblioteca são requisitos posteriores. IA/RAG, pagamentos reais, pacotes e assinaturas não integram o MVP.

## Instalação

Requisitos: Node.js 24.19.0 (referência em [.nvmrc](.nvmrc)), npm 11 ou superior e MySQL 8.4 para integração/migrações.

```sh
npm run install:clean
npm exec --prefix frontend -- playwright install --no-shell chromium
```

No Linux, a instalação do navegador pode exigir `--with-deps`. As dependências são independentes em `frontend/` e `backend/`; executar somente `npm ci` na raiz não instala ambos.

Copie [backend/.env.example](backend/.env.example) para `backend/.env` e configure suas credenciais localmente. O arquivo é ignorado pelo Git. Nunca use variáveis `VITE_*` para credenciais de banco. O backend valida ambiente, porta, pool e timeouts, não exibe valores secretos em erros e exige TLS verificado em produção (`DB_TLS=true`, CA opcional em `DB_TLS_CA_FILE`).

## MySQL e migrações

O banco e as contas devem existir antes da execução. Use uma instância local ou ambiente isolado sem serviços pagos. Um administrador MySQL pode provisionar, por canal seguro, os objetos abaixo; substitua os marcadores de senha fora do repositório:

```sql
CREATE DATABASE wikichem CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'wikichem_app'@'localhost' IDENTIFIED BY '<senha-segura-da-api>';
GRANT SELECT, INSERT, UPDATE, DELETE ON wikichem.* TO 'wikichem_app'@'localhost';
CREATE USER 'wikichem_migrator'@'localhost' IDENTIFIED BY '<senha-segura-operacional>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON wikichem.* TO 'wikichem_migrator'@'localhost';
```

Adapte host/origem das contas à instalação. A API usa `DB_USER/DB_PASSWORD`; somente o comando operacional usa `MIGRATION_DB_USER/MIGRATION_DB_PASSWORD`. Não conceda DDL à conta da API nem exponha MySQL ao navegador. Exemplos de conta não implementam o administrador funcional da plataforma.

```sh
npm run db:status
npm run db:migrate
npm run db:status
```

Cada arquivo `backend/migrations/NNNN_nome.sql` contém **um único statement**, sequência contígua e checksum SHA-256 com normalização LF/CRLF. A primeira migração cria apenas `schema_migrations`. O executor usa lock por banco e registra APPLYING/APPLIED; repetir uma execução concluída não reaplica arquivos. Status não cria tabelas.

Não edite ou remova migrações aplicadas. Falha/execução interrompida deixa APPLYING e bloqueia novas execuções para inspeção. DDL do MySQL faz commit implícito: não existe rollback automático de esquema. Faça backup antes de mudanças futuras, examine o estado real e use correção progressiva controlada ou restauração; não apague o marcador para repetir DDL às cegas. A API inicia sem migrar, permitindo distinguir liveness de falha do banco.

## Execução

Em terminais separados, na raiz:

```sh
npm run dev:api
npm run dev
```

A API escuta em `127.0.0.1:3001`. O Vite encaminha `/api/v1` para ela, preservando a mesma origem no desenvolvimento. Para outra porta/origem local, configure `API_PROXY_TARGET` em `frontend/.env` (exemplo versionado). Nenhuma tela atual consome autenticação ou pesquisa da API.

```sh
npm run build
npm run start:api
```

O build gera `frontend/dist/` e `backend/dist/`. `npm run preview` serve apenas o frontend compilado; proxy Vite e preview não são configuração de hospedagem em produção. Hospedagem, HTTPS, limites de carga e backup/restauração continuam pendentes.

## Comandos de qualidade

| Comando na raiz | Finalidade |
| --- | --- |
| `npm run install:clean` | Instalação limpa dos dois pacotes pelos lockfiles |
| `npm run build` | Build de frontend e backend |
| `npm run lint` | ESLint dos dois pacotes e TypeScript strict do backend/testes |
| `npm test` | Testes de apresentação frontend e unidade/contrato backend |
| `npm run test:integration` | MySQL 8.4 real e proxy Vite/API |
| `npm run test:e2e` | Playwright/Chromium: navegação, responsividade, foco e contraste |
| `npm run test:watch` | Vitest interativo do frontend |
| `npm run audit:deps` | Auditoria completa dos dois pacotes |
| `npm run audit:prod` | Auditoria de dependências de produção dos dois pacotes |

Comandos por pacote: `build:frontend`, `build:backend`, `lint:frontend`, `lint:backend`, `test:frontend` e `test:backend`. Auditorias falham a partir de severidade moderada e precisam do registro npm; não utilizar `npm audit fix --force`.

### Integração automatizada

A suíte não pula testes quando o banco está indisponível. Para executá-la, configure no ambiente (ou em `backend/.env`) **NODE_ENV=test**, **MYSQL_TEST_ALLOW=true**, **DB_NAME=wikichem_test_<sufixo>** e as credenciais de uma conta restrita a esse banco descartável. Todos os pacotes precisam estar instalados, pois o teste inicia o Vite em `127.0.0.1:5175`; a porta precisa estar livre. O banco não deve conter tabelas de aplicação. A suíte recusa nomes não permitidos e tabelas inesperadas, recria o ledger e remove somente tabelas/linhas próprias de teste.

São exercitados migração inicial/repetida, status sem escrita, checksum/histórico inválidos, lock concorrente, falha DDL, statements múltiplos rejeitados, precisão BIGINT, FKs, unicidade, commit/rollback, credenciais inválidas, banco inexistente, pool encerrado e proxy. A suite usa tabelas genéricas de teste, sem antecipar entidades ou regras comerciais.

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) preserva as verificações frontend e adiciona job backend com serviço MySQL 8.4 isolado, migrações, integração e auditorias. Suas credenciais são efêmeras de demonstração, exclusivas do serviço descartável. Não há credencial de produção no repositório nem deploy automático. Testes são executados pela automação, sem exigir verificações manuais do usuário.

## Organização e documentação

```text
backend/
  migrations/          # SQL de infraestrutura versionado
  src/
    config/            # Validação do ambiente
    database/          # Pool, transações e executor de migrações
    modules/health/    # Rotas, serviço e repositório
    shared/            # Contratos, validação e erros
    app.ts             # Composição testável, sem listen
    server.ts          # Inicialização HTTP e encerramento
  tests/
    unit/
    contract/
    integration/
frontend/              # Interface React e seus testes existentes
docs/
  especificacoes/      # Objetivos, requisitos e critérios de aceitação
  arquitetura/         # Solução, modelo e regras propostas
  planejamento/        # Incrementos e rastreabilidade
  desenvolvimento/     # Registros operacionais internos
  auditoria/           # Diagnóstico histórico interno
  etapas/              # Registros históricos internos
```

O [mapa documental](docs/README.md) separa material acadêmico de registros operacionais. Não existe ainda relatório acadêmico final. A especificação diferencia comportamento implementado de propostas de produto/comércio pendentes.

Identidade preservada: React, Inter, paleta azul e ativos atuais. Permanecem pendentes a página 404 React, semântica das abas, foco após navegação SPA, otimização de ativos e avisos de favicon no build. A resposta 404 JSON da API não substitui a página 404 da interface.

Projeto licenciado sob a [GNU GPL v2](LICENSE).
