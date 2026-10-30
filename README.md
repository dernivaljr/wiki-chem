# Wiki-Chem

Plataforma acadêmica de pesquisa e comercialização demonstrativa de metodologias de química analítica, desenvolvida no curso DSM da FATEC, disciplina de Engenharia de Software II.

## Estado do sistema

| Implementado | Limites |
| --- | --- |
| Identidade real, sessão, logout, perfil e rotas protegidas | Recuperação e e-mail verificado continuam fora do incremento |
| Administração /admin exclusiva de ADMIN | CUSTOMER não recebe conteúdo editorial nem modifica o catálogo |
| Sete taxonomias, múltiplos vínculos por versão e normas identificadas por edição | Vocabulários científicos e curadoria ainda precisam de validação humana |
| Metodologias, rascunhos, fontes, autoria/curadoria e revisão explícita | Sem corpus científico ou permissões pré-carregados |
| Publicação imutável, nova versão, arquivamento e exclusão lógica de rascunhos | Versão publicada não é sobrescrita nem excluída por API |
| Pesquisa autenticada e detalhes gratuitos | Texto, sete filtros múltiplos, paginação e ordenação; sem procedimento/evidência privada; ofertas e preços quando cadastrados, carrinho autenticado |
| Ofertas, histórico imutável de preços BRL e carrinho por usuário | Valores comerciais reais exigem definição |
| Checkout demonstrativo, pedidos/histórico e direitos persistidos | DEMONSTRAÇÃO — SEM COBRANÇA; leitura integral da biblioteca fica para a próxima etapa |
| Migrações controladas, pool MySQL e testes automatizados | Fixtures DEMO existem somente nas suítes de teste |

A identidade visual React foi preservada. /consultas pesquisa prévias por texto e sete filtros; /metodologias/:id apresenta detalhes gratuitos. A administração aceita texto simples, sem executar HTML ou buscar automaticamente URLs. As candidatas da EPA permanecem somente referências documentais para futura avaliação. IA/RAG permanece fora do MVP.

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
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, TRIGGER
  ON wikichem.* TO 'wikichem_migrator'@'localhost';
```

Adapte host/origem das contas à instalação. A API usa `DB_USER/DB_PASSWORD`; somente o comando operacional usa `MIGRATION_DB_USER/MIGRATION_DB_PASSWORD`. Não conceda DDL à conta da API nem exponha MySQL ao navegador. Exemplos de conta não implementam o administrador funcional da plataforma.

```sh
npm run db:status
npm run db:migrate
npm run db:status
```

Os preços históricos têm triggers que rejeitam UPDATE/DELETE. A conta operacional precisa de TRIGGER e, conforme o binary logging da instância, dos privilégios administrativos exigidos pelo MySQL para criar triggers. Use uma conta operacional autorizada para a migração; não amplie os privilégios da API. O proprietário dos triggers deve manter seus privilégios. [Requisitos oficiais](https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html).

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


## Catálogo administrativo

Depois das migrações e do provisionamento operacional do primeiro ADMIN, acesse /admin pela conta correspondente. A navegação administrativa aparece somente para ADMIN, com autorização independente no backend. CUSTOMER não pode ler o formulário editorial nem utilizar seus endpoints, mesmo conhecendo IDs.

Em Classificações, crie termos para os sete eixos. Normas exigem emissor/identificador/edição e conferência da identificação. Não confunda esse registro com declaração de vigência regulatória ou permissão de reprodução. Vocabulário e conteúdo real precisam de curadoria; nenhuma migração popula conteúdo ou termos.

Em Metodologias e versões, crie identidade e rascunho; registre prévia, procedimento, múltiplos termos, fontes, condições de uso e autoria/curadoria. Fonte verificada exige evidência e conferência explícita. Salve antes de revisar/publicar: mudanças locais não salvas desabilitam publicação. Alterações concorrentes produzem 409 e exigem recarregar, sem sobrescrita automática.

A publicação valida completude/revisão em transação e preserva versões anteriores. Copiar versão exige nova conferência das condições de uso. Arquivar retira a prévia e preserva história. Exclusão é lógica e restrita a rascunhos/metodologias sem publicação. Consulte [Catálogo editorial](docs/arquitetura/CATALOGO-EDITORIAL.md) para contratos REST, limites, modelo e pendências.

## Execução

Em terminais separados, na raiz:

```sh
npm run dev:api
npm run dev
```

A API escuta em `127.0.0.1:3001`. O Vite encaminha `/api/v1` para ela, preservando a mesma origem no desenvolvimento. Para outra porta/origem local, configure `API_PROXY_TARGET` em `frontend/.env` (exemplo versionado). Login/cadastro, sessão e perfil consomem a API real. Pesquisa e detalhes gratuitos consultam o catálogo publicado pela API real, sem depender de preço/produto.

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

A suíte não pula testes quando o banco está indisponível. Para executá-la, configure no ambiente (ou em `backend/.env`) **NODE_ENV=test**, **MYSQL_TEST_ALLOW=true**, **DB_NAME=wikichem_test_<sufixo>** e as credenciais de uma conta restrita a esse banco descartável. Execute `npm run build:backend` antes da integração, pois a suíte também inicia o servidor compilado. Todos os pacotes precisam estar instalados, pois o teste inicia o Vite em `127.0.0.1:5175`; a porta precisa estar livre. Use somente banco descartável de testes; as suítes podem recriar todas as tabelas versionadas, recusando qualquer tabela desconhecida. FKs permanecem habilitadas; o ciclo do ponteiro corrente é desmontado explicitamente na limpeza. A suíte recusa nomes não permitidos e tabelas inesperadas. Não execute sobre dados que deseja preservar.

São exercitados migração inicial/repetida, status sem escrita, checksum/histórico inválidos, lock concorrente, falha DDL, statements múltiplos rejeitados, precisão BIGINT, FKs, unicidade, commit/rollback, credenciais inválidas, banco inexistente, pool encerrado e proxy. A suite usa tabelas genéricas de teste, sem antecipar entidades ou regras comerciais.

Para o navegador integrado, prepare o esquema com `npm run db:migrate` após a integração, instale Chromium e execute `npm run test:auth`. A configuração exige NODE_ENV=test, MYSQL_TEST_ALLOW=true e banco wikichem_test_<sufixo>; inicia backend e Vite em portas 3002/4174, sem reutilizar processos existentes. As contas criadas são exclusivamente de teste. O setup desse comando recria todas as tabelas conhecidas no banco descartável e prepara uma sessão ADMIN com senha aleatória, usada apenas para preparar testes de administração e pesquisa. Exige MIGRATION_DB_USER/MIGRATION_DB_PASSWORD; cookie temporário fica em frontend/.test-fixtures/ ignorado pelo Git. Não contém senha padrão nem semente de produção.

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) preserva as verificações frontend e adiciona job backend com serviço MySQL 8.4 isolado, migrações, integração, jornadas reais de autenticação, administração, pesquisa, carrinho e checkout demonstrativo no navegador e auditorias. Suas credenciais são efêmeras de demonstração, exclusivas do serviço descartável. Não há credencial de produção no repositório nem deploy automático. Testes são executados pela automação, sem exigir verificações manuais do usuário.

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

## Ofertas e carrinho

Selecione uma metodologia em /admin e abra “Gerenciar oferta e preços”. Crie produto inativo, cadastre preço em centavos BRL e ative somente após publicação revisada. Novo preço preserva o histórico; arquivamento desativa a oferta e restauração exige ativação explícita. A pesquisa funciona sem produto/preço.

Clientes adicionam ofertas disponíveis e consultam /carrinho. A API calcula os valores, mantém itens indisponíveis visíveis, registra mudanças e preserva o carrinho entre sessões. O checkout demonstrativo cria revisão e exige confirmação explícita, com pedidos e direitos persistidos. Não libera leitura integral da biblioteca. FX01–FX05 existem apenas nos testes e não são carregadas em produção. [Modelo e contratos](docs/arquitetura/OFERTAS-CARRINHO.md).

## Checkout demonstrativo

Em /carrinho, avance para criar pedido pendente; /checkout/:id exibe snapshots, prazo e aceite obrigatório. Confirme ou cancele explicitamente. /pedidos e /pedidos/:id consultam registros persistidos. Todas as etapas identificam DEMONSTRAÇÃO — SEM COBRANÇA. Não existe pagamento real ou biblioteca integral.

CHECKOUT_TTL_SECONDS=900 (5–3600) e CHECKOUT_RATE_LIMIT_MAX=60 definem prazo e mutações/minuto por usuário. Copie somente nomes/defaults seguros do exemplo de ambiente. As migrações continuam pelo comando db:migrate e conta operacional; a API não executa DDL. CREATE TRIGGER com BEGIN/END é um statement SQL, sem DELIMITER no arquivo e sem habilitar multipleStatements.

Os comandos existentes install:clean, build, lint, test, test:integration, test:e2e, test:auth, audit:deps e audit:prod verificam o incremento. Integração/navegador exigem banco descartável e credenciais operacionais conforme seção de testes. Falhas e relógio de checkout são injetados somente por composição dos testes, sem flags HTTP de produção. Nenhuma fixture comercial é carregada pela aplicação. [Regras e contratos](docs/arquitetura/CHECKOUT-DEMONSTRATIVO.md).
