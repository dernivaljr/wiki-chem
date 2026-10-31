# Wiki-Chem

Plataforma acadêmica de pesquisa, apresentação e aquisição digital de metodologias de química analítica, desenvolvida no curso DSM da FATEC, disciplina de Engenharia de Software II.

## Estado do sistema

| Implementado | Limites |
| --- | --- |
| Identidade real, sessão, logout, perfil e rotas protegidas | Recuperação de senha e e-mail verificado permanecem fora do escopo |
| Cabeçalho com menu suspenso `Perfil` e `Carrinho` com contador dinâmico | Item `Administração` exibido somente para `ADMIN`; autorização validada no servidor |
| Administração `/admin` exclusiva de `ADMIN` | `CUSTOMER` não recebe conteúdo editorial nem modifica o catálogo |
| Sete taxonomias, múltiplos vínculos por versão e normas identificadas por edição | Vocabulário analítico demonstrativo restrito a `NODE_ENV=test`; curadoria humana exigida fora de testes |
| Metodologias, rascunhos, fontes, autoria/curadoria e revisão explícita | Produção permanece sem seed; demonstração isolada publica 15 guias digitais autorais (`WK-ANL-001`–`WK-ANL-015`) fundamentados em fontes públicas EPA/USGS e arquiva registros sintéticos legados |
| Publicação imutável, nova versão, arquivamento e exclusão lógica de rascunhos | Versão publicada não é sobrescrita nem excluída por API |
| Pesquisa autenticada simplificada e página de produto inspirada na ASTM | Exige termo não vazio, recolhe os sete filtros por padrão, preserva aliases (`ferro`/`Fe`, `UV-Vis`, `GC-MS`, `ICP-OES`) e exibe prévia concisa sem expor o conteúdo integral |
| Ofertas, histórico imutável de preços BRL configuráveis e carrinho por usuário | Valores acadêmicos configuráveis (`WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS` / `WIKICHEM_DEMO_PRICES`), sem cobrança financeira |
| Checkout com simulação de pagamento, pedidos/histórico e direitos persistidos | Modalidades simuladas (`PIX`, `Cartão de crédito` e `Boleto bancário`), sem cobrança real nem solicitação de dados sensíveis; biblioteca integral liberada após confirmação |
| Migrações controladas, pool MySQL e testes automatizados | Reconciliação demonstrativa idempotente restrita a `NODE_ENV=test`, preservando contas, pedidos e direitos |

A identidade visual do Wiki-Chem foi preservada e refinada em tipografia, ícones e hierarquia visual. O cabeçalho principal apresenta `Home`, `Sobre`, `Consultas`, o menu suspenso `Perfil` (`Minha biblioteca`, `Pedidos`, `Administração` apenas para `ADMIN`, `Dados pessoais` e `Sair`) e `Carrinho` com contador dinâmico de itens. `/consultas` exige termo de pesquisa não vazio (inclusive com filtros selecionados), mantém os sete filtros recolhidos sob demanda (`Filtros avançados`) e apresenta cartões compactos apenas após pesquisa válida. `/metodologias/:id` organiza título, identificação documental (`WK-ANL-*`), versão, escopo resumido, classificações essenciais, referências rastreáveis e quadro de compra em BRL inspirado na organização comercial da ASTM, sem copiar identidade ou comercializar normas de terceiros. A administração aceita texto simples, sem executar HTML ou buscar automaticamente URLs. IA/RAG e pagamentos reais permanecem fora do MVP.

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

A senha aceita 12–128 caracteres e é armazenada com Argon2id (19 MiB, duas iterações, paralelismo um). Cadastro não inicia sessão. Nome pode ser editado em Dados pessoais (`/perfil`); e-mail e papel não. Sessão/CSRF ficam em cookie HttpOnly e memória React, sem credencial em localStorage. A consulta de bootstrap não renova inatividade. As [decisões de identidade](docs/arquitetura/IDENTIDADE.md) detalham contratos e limites.

Nenhum administrador é criado ao instalar, migrar ou iniciar. Para provisionar o primeiro ADMIN, o responsável autorizado prepara uma **conta MySQL operacional distinta**, com SELECT/INSERT/UPDATE somente em users (sem DDL), configura ADMIN_DB_USER/ADMIN_DB_PASSWORD localmente e habilita temporariamente ADMIN_BOOTSTRAP_ENABLED=true. Então, em terminal interativo:

```sh
npm run admin:bootstrap
```

O comando solicita responsável, nome, e-mail e senha com confirmação **sem eco**. Não aceita argumentos; não passe senha de usuário em ambiente, linha de comando, arquivo ou histórico. Configure a senha somente na entrada interativa. Repetição para o mesmo admin não altera credencial; e-mail de CUSTOMER ou outro primeiro administrador gera conflito. O responsável é registrado em provisioned_by. Desabilite ADMIN_BOOTSTRAP_ENABLED ao concluir e preserve o acesso operacional. Este comando não cria regras ou telas de administração editorial.

## Catálogo administrativo

Depois das migrações e do provisionamento operacional do primeiro ADMIN, acesse `/admin` pelo menu `Perfil → Administração`. A opção administrativa aparece somente para `ADMIN`, com autorização independente no backend. `CUSTOMER` não pode ler o formulário editorial nem utilizar seus endpoints, mesmo conhecendo IDs.

Em Classificações, crie termos para os sete eixos. Normas exigem emissor/identificador/edição e conferência da identificação. Não confunda esse registro com declaração de vigência regulatória ou permissão de reprodução. Vocabulário e conteúdo real precisam de curadoria; nenhuma migração popula conteúdo ou termos.

Em Metodologias e versões, crie identidade e rascunho; registre prévia, conteúdo integral protegido, múltiplos termos, fontes, condições de uso e autoria/curadoria. Fonte verificada exige evidência e conferência explícita. Salve antes de revisar/publicar: mudanças locais não salvas desabilitam publicação. Alterações concorrentes produzem 409 e exigem recarregar, sem sobrescrita automática.

A publicação valida completude/revisão em transação e preserva versões anteriores. Copiar versão exige nova conferência das condições de uso. Arquivar retira a prévia da vitrine e preserva história. Exclusão é lógica e restrita a rascunhos/metodologias sem publicação. Consulte [Catálogo editorial](docs/arquitetura/CATALOGO-EDITORIAL.md) para contratos REST, limites, modelo e pendências.

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

O build gera `frontend/dist/` e `backend/dist/`. `npm run preview` serve apenas o frontend compilado; proxy Vite e preview não são configuração de hospedagem em produção. Hospedagem, HTTPS, limites de carga e backup/restauração de produção continuam pendentes.

## Comandos de qualidade

| Comando na raiz | Finalidade |
| --- | --- |
| `npm run install:clean` | Instalação limpa dos dois pacotes pelos lockfiles |
| `npm run build` | Build de frontend e backend |
| `npm run lint` | ESLint dos dois pacotes, TypeScript strict do backend e checagem de scripts |
| `npm test` | Testes de apresentação frontend e unidade/contrato backend |
| `npm run test:integration` | MySQL 8.4 real e proxy Vite/API |
| `npm run test:auth` | Navegador com backend e MySQL reais; exige ambiente de testes isolado |
| `npm run test:e2e` | Playwright/Chromium: navegação, responsividade, foco, contraste e ativos |
| `npm run test:watch` | Vitest interativo do frontend |
| `npm run audit:deps` | Auditoria completa dos dois pacotes |
| `npm run audit:prod` | Auditoria de dependências de produção dos dois pacotes |

Comandos por pacote: `build:frontend`, `build:backend`, `lint:frontend`, `lint:backend`, `test:frontend` e `test:backend`. Auditorias falham a partir de severidade moderada e precisam do registro npm; não utilizar `npm audit fix --force`.

### Integração automatizada

A suíte não pula testes quando o banco está indisponível. Para executá-la, configure no ambiente (ou em `backend/.env`) **NODE_ENV=test**, **MYSQL_TEST_ALLOW=true**, **DB_NAME=wikichem_test_<sufixo>** e as credenciais de uma conta restrita a esse banco descartável. Execute `npm run build:backend` antes da integração, pois a suíte também inicia o servidor compilado. Todos os pacotes precisam estar instalados, pois o teste inicia o Vite em `127.0.0.1:5175`; a porta precisa estar livre. Use somente banco descartável de testes; as suítes podem recriar todas as tabelas versionadas, recusando qualquer tabela desconhecida. FKs permanecem habilitadas; o ciclo do ponteiro corrente é desmontado explicitamente na limpeza. Não execute sobre dados que deseja preservar.

Para o navegador integrado, prepare o esquema com `npm run db:migrate` após a integração, instale Chromium e execute `npm run test:auth`. A configuração exige NODE_ENV=test, MYSQL_TEST_ALLOW=true e banco wikichem_test_<sufixo>; inicia backend e Vite em portas 3002/4174, sem reutilizar processos existentes. As contas criadas são exclusivamente de teste. Exige MIGRATION_DB_USER/MIGRATION_DB_PASSWORD; cookie temporário fica em `frontend/.test-fixtures/` ignorado pelo Git. Não contém senha padrão nem semente de produção.

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) executa as verificações frontend, o job backend com MySQL 8.4 isolado, migrações, integração, jornadas reais no navegador e a demonstração Compose com reconciliação idempotente e backup/restauração. Não há credencial de produção no repositório nem deploy automático.

## Organização e documentação

```text
backend/
  migrations/          # SQL de infraestrutura versionado
  src/
    config/            # Validação do ambiente
    database/          # Pool, transações e executor de migrações
    modules/           # Identidade, catálogo, comércio, checkout, biblioteca e saúde
    shared/            # Contratos, validação e erros
    app.ts             # Composição testável, sem listen
    server.ts          # Inicialização HTTP e encerramento
  tests/
    unit/
    contract/
    integration/
    demo/              # Catálogo técnico autoral e reconciliação demonstrativa
frontend/              # Interface React, estado do carrinho e suítes Vitest/Playwright
docs/
  academico/           # Material acadêmico estruturado (FATEC)
  especificacoes/      # Objetivos, requisitos e critérios de aceitação
  arquitetura/         # Solução, modelo e regras implementadas
  planejamento/        # Incrementos e rastreabilidade
  desenvolvimento/     # Registros operacionais internos
  auditoria/           # Diagnóstico histórico interno
  etapas/              # Registros históricos internos
```

O [mapa documental](docs/README.md) separa material acadêmico de registros operacionais. Projeto licenciado sob a [GNU GPL v2](LICENSE).

## Ofertas e carrinho

Selecione uma metodologia em `/admin` e abra “Gerenciar oferta e preços”. Crie produto inativo, cadastre preço em centavos BRL e ative somente após publicação revisada. Novo preço preserva o histórico; arquivamento desativa a oferta e restauração exige ativação explícita.

Clientes adicionam produtos elegíveis a partir da pesquisa ou da página de metodologia, acompanhando o contador dinâmico em `Carrinho` no cabeçalho e gerenciando a seleção em `/carrinho`. A API calcula valores com precisão inteira, mantém itens indisponíveis visíveis, sinaliza alterações e preserva o carrinho entre sessões. [Modelo e contratos](docs/arquitetura/OFERTAS-CARRINHO.md).

## Checkout e pedidos

Em `/carrinho`, avance para criar a revisão pendente do pedido (intenção concluída, cancelada ou expirada é reconciliada e liberada automaticamente para permitir compras consecutivas na mesma sessão); `/checkout/:id` exibe itens e valores consolidados, seleção obrigatória de modalidade simulada (`PIX`, `Cartão de crédito` ou `Boleto bancário` sem coleta de dados de cartão, CPF ou emissão de código pagável), aviso discreto e inequívoco de isenção de cobrança financeira e confirmação explícita obrigatória. `/pedidos` e `/pedidos/:id` consultam o histórico persistido com a modalidade utilizada e ligação direta para os guias adquiridos. Não existe cobrança real; o acesso ao guia completo é liberado em `/biblioteca` após confirmação. [Regras e contratos](docs/arquitetura/CHECKOUT-DEMONSTRATIVO.md).

## Biblioteca digital

`/biblioteca` lista metodologias adquiridas e `/biblioteca/:methodologyId` apresenta o conteúdo técnico integral estruturado em seções e referências rastreáveis da versão vigente, com seleção explícita de histórico elegível. Direito próprio `ACTIVE` e condições de fontes são verificados no backend em cada leitura; `ADMIN` não recebe acesso de cliente sem aquisição. [Regras e contratos](docs/arquitetura/BIBLIOTECA-DIGITAL.md).

## Demonstração acadêmica isolada

Com Docker/Compose v2 e Node.js 24 disponíveis, execute `npm run demo:prepare` (ou `npm run demo:up` para reconciliar de forma idempotente um ambiente demonstrativo já preparado sem apagar contas, pedidos, direitos ou volumes). Abra `http://127.0.0.1:4180`. O ambiente utiliza MySQL 8.4 privado, API Fastify e React exclusivamente no banco de testes (`wikichem_test_demo`, `NODE_ENV=test`, `DEMO_ALLOW=true`), com **15 produtos digitais autorais de química analítica** (`WK-ANL-001` a `WK-ANL-015`) fundamentados em referências públicas oficiais verificadas da U.S. EPA e do USGS (incluindo ferro por 1,10-fenantrolina UV-Vis / USGS TEI-223, EPA 200.7, EPA 300.0 e EPA 8260D), preços configuráveis em BRL (`R$ 29,00` a `R$ 68,00` por padrão) e conteúdo técnico interpretativo original protegido por aquisição, além dos cinco registros sintéticos legados arquivados (`RETIRED`) sem perda histórica. Não existe seed de produção, revisão científica humana presumida nem venda ou reprodução de normas de terceiros como documentos licenciados.

`npm run demo:access` gera acesso administrativo aleatório em terminal interativo, sem senha padrão ou arquivo de credenciais. Segredos de infraestrutura e backups ficam fora do repositório, em diretório temporário restrito do sistema. Consulte o [guia operacional](docs/desenvolvimento/DEMONSTRACAO-LOCAL.md) para requisitos, reconciliação, recuperação e reset explícito.
