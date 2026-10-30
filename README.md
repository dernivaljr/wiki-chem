# Wiki-Chem

Plataforma acadêmica de pesquisa e comercialização demonstrativa de metodologias de química analítica, desenvolvida no curso DSM da FATEC, disciplina de Engenharia de Software II.

## Estado do sistema

| Implementado | Limites |
| --- | --- |
| Home, Sobre, cadastro/login e perfil React | Identidade visual preservada; pesquisa e filtros estão explicitamente indisponíveis |
| Cadastro e login reais | CUSTOMER por padrão, e-mail normalizado único e senha Argon2id |
| Sessão opaca MySQL, logout e perfil próprio | Cookie HttpOnly/SameSite, Secure em produção; token somente como hash no banco, CSRF e expiração |
| Proteção de /consultas e /perfil | Bootstrap, retorno interno seguro, carregamento, sessão expirada e falhas de rede |
| API modular, saúde, pool e migrações controladas | users/auth_sessions e ledger implementados; sem catálogo, pedidos ou conteúdo pago |
| Bootstrap operacional inicial do ADMIN | Interativo, sem senha padrão ou promoção de cliente existente; nenhuma criação automática |

Recuperação de senha, e-mail verificado/mudança de e-mail e “manter conectado” não integram este incremento. Não há aceite de termos ou políticas inexistentes. A interface identifica o ambiente acadêmico de demonstração. Pesquisa efetiva, catálogo, comércio e biblioteca serão incrementos próprios. IA/RAG não integra o MVP.

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


## Identidade e administrador inicial

Configure APP_ORIGIN com a **origem exata do navegador**, incluindo porta (padrão http://localhost:5173). Usar 127.0.0.1 no navegador exige configurar essa origem; não usar wildcard. Em produção, APP_ORIGIN deve usar HTTPS e DB_TLS deve ser true. Cookie de produção usa prefixo __Host-, Secure, HttpOnly, SameSite=Lax e Path=/.

SESSION_ABSOLUTE_SECONDS=28800 e SESSION_IDLE_SECONDS=1800 são os padrões; o prazo de inatividade não pode superar o absoluto. AUTH_RATE_LIMIT_MAX=10 limita tentativas por IP/rota por minuto e por conta no login. Limites são locais em memória; coordenação entre instâncias e operação atrás de proxy exigem revisão antes de escalar. O servidor não confia em X-Forwarded-For arbitrário.

A senha aceita 12–128 caracteres e é armazenada com Argon2id (19 MiB, duas iterações, paralelismo um). Cadastro não inicia sessão. Nome pode ser editado no perfil; e-mail e papel não. Sessão/CSRF ficam em cookie HttpOnly e memória React, sem credencial em localStorage. A consulta de bootstrap não renova inatividade. As [decisões de identidade](docs/arquitetura/IDENTIDADE.md) detalham contratos e limites.

Nenhum administrador é criado ao instalar, migrar ou iniciar. Para provisionar o primeiro ADMIN, o responsável autorizado prepara uma **conta MySQL operacional distinta**, com SELECT/INSERT/UPDATE somente em users (sem DDL), configura ADMIN_DB_USER/ADMIN_DB_PASSWORD localmente e habilita temporariamente ADMIN_BOOTSTRAP_ENABLED=true. Então, em terminal interativo:

```sh
npm run admin:bootstrap
```

O comando solicita responsável, nome, e-mail e senha com confirmação **sem eco**. Não aceita argumentos; não passe senha de usuário em ambiente, linha de comando, arquivo ou histórico. Configure a senha somente na entrada interativa. Repetição para o mesmo admin não altera credencial; e-mail de CUSTOMER ou outro primeiro administrador gera conflito. O responsável é registrado em provisioned_by. Desabilite ADMIN_BOOTSTRAP_ENABLED ao concluir e preserve o acesso operacional. Este comando não cria regras ou telas de administração editorial.

## Execução

Em terminais separados, na raiz:

```sh
npm run dev:api
npm run dev
```

A API escuta em `127.0.0.1:3001`. O Vite encaminha `/api/v1` para ela, preservando a mesma origem no desenvolvimento. Para outra porta/origem local, configure `API_PROXY_TARGET` em `frontend/.env` (exemplo versionado). Login/cadastro, sessão e perfil consomem a API real. Pesquisa permanece indisponível.

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
| `npm run test:auth` | Navegador com backend e MySQL reais; exige ambiente de testes isolado |
| `npm run test:e2e` | Playwright/Chromium: navegação, responsividade, foco e contraste |
| `npm run test:watch` | Vitest interativo do frontend |
| `npm run audit:deps` | Auditoria completa dos dois pacotes |
| `npm run audit:prod` | Auditoria de dependências de produção dos dois pacotes |

Comandos por pacote: `build:frontend`, `build:backend`, `lint:frontend`, `lint:backend`, `test:frontend` e `test:backend`. Auditorias falham a partir de severidade moderada e precisam do registro npm; não utilizar `npm audit fix --force`.

### Integração automatizada

A suíte não pula testes quando o banco está indisponível. Para executá-la, configure no ambiente (ou em `backend/.env`) **NODE_ENV=test**, **MYSQL_TEST_ALLOW=true**, **DB_NAME=wikichem_test_<sufixo>** e as credenciais de uma conta restrita a esse banco descartável. Execute `npm run build:backend` antes da integração, pois a suíte também inicia o servidor compilado. Todos os pacotes precisam estar instalados, pois o teste inicia o Vite em `127.0.0.1:5175`; a porta precisa estar livre. Use somente banco descartável de testes; as suítes podem recriar ledger, users e auth_sessions, recusando outras tabelas inesperadas. A suíte recusa nomes não permitidos e tabelas inesperadas. Não execute sobre dados que deseja preservar.

São exercitados migração inicial/repetida, status sem escrita, checksum/histórico inválidos, lock concorrente, falha DDL, statements múltiplos rejeitados, precisão BIGINT, FKs, unicidade, commit/rollback, credenciais inválidas, banco inexistente, pool encerrado e proxy. A suite usa tabelas genéricas de teste, sem antecipar entidades ou regras comerciais.

Para o navegador integrado, prepare o esquema com `npm run db:migrate` após a integração, instale Chromium e execute `npm run test:auth`. A configuração exige NODE_ENV=test, MYSQL_TEST_ALLOW=true e banco wikichem_test_<sufixo>; inicia backend e Vite em portas 3002/4174, sem reutilizar processos existentes. As contas criadas são exclusivamente de teste.

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) preserva as verificações frontend e adiciona job backend com serviço MySQL 8.4 isolado, migrações, integração, sete jornadas reais de autenticação no navegador e auditorias. Suas credenciais são efêmeras de demonstração, exclusivas do serviço descartável. Não há credencial de produção no repositório nem deploy automático. Testes são executados pela automação, sem exigir verificações manuais do usuário.

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

Identidade preservada: React, Inter, paleta azul e ativos atuais. Permanecem pendentes a página 404 React, semântica das abas, foco após navegação SPA, otimização de ativos e avisos de favicon no build. A resposta 404 JSON da API não substitui a página 404 da interface. As abas de acesso e o cabeçalho autenticado recebem verificação de teclado/responsividade neste incremento.

Projeto licenciado sob a [GNU GPL v2](LICENSE).
