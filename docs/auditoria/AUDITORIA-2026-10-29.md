# Auditoria técnica diagnóstica — Wiki-Chem

**Data:** 29/10/2026, referência de calendário America/Sao_Paulo.

**Repositório:** `dernivaljr/wiki-chem`.

**Base auditada:** `main`, commit `1267d9bb945da9e76130fd9c92275120182457ec`.

**Branch do relatório:** `audit/diagnostico-2026-10-29`.

**Natureza:** diagnóstico; nenhuma correção de aplicação, dependência ou configuração integra esta entrega.

## 1. Parecer executivo

O projeto é um **protótipo navegável de frontend**, ainda sem o fluxo de consulta necessário para um MVP funcional. Existem quatro páginas React, identidade visual, formulários e uma tela de pesquisa. Não existem catálogo consultável, resultados, filtros de domínio, API de aplicação, banco de dados ou autenticação real.

O login aceita quaisquer valores que passem pela validação HTML e apenas redireciona para `/consultas`. O cadastro exibe uma mensagem de sucesso sem criar conta. A pesquisa e suas categorias não executam ações. O acesso direto a `/consultas` funciona sem autenticação. Isso demonstra simulação de acesso, mas **não comprova vazamento de dados privados**, pois não foi encontrado armazenamento ou serviço protegido.

O build de produção e o lint passaram. Não existe suíte automatizada versionada nem script `test`. A auditoria npm encontrou **quatro pacotes com severidade agregada alta, todos de desenvolvimento**: Vite, brace-expansion, source-map-js e Zod. A verificação com `--omit=dev` retornou zero vulnerabilidades conhecidas naquele momento. Esse resultado não certifica a segurança da aplicação.

As verificações no navegador confirmaram navegação básica, validação HTML, simulações de acesso, pesquisa inerte, ausência de página 404, perda do estado de cadastro após recarga, problemas de foco/contraste e transbordamento do cabeçalho em 320 px. Os favicons **funcionaram** em desenvolvimento e no build, embora os caminhos atuais produzam avisos do Vite.

A conclusão do MVP depende primeiro de definir acesso público ou autenticado, conteúdo inicial e semântica dos sete filtros; depois, implementar catálogo durável, consulta e apresentação de resultados com fontes. IA, busca semântica, RAG e geração de procedimentos são evolução futura e não devem bloquear uma primeira consulta estruturada funcional.

## 2. Método, abrangência e referência

- Inspeção dos **39 arquivos versionados** da base: código, CSS, HTML, documentação, licença, manifests, configurações, lockfiles e metadados dos arquivos de imagem. Não havia `AGENTS.md` aplicável nos caminhos verificados.
- Leitura integral do código da aplicação; inventário da árvore de dependências e dos lockfiles, sem alteração de versões. Busca por chamadas de rede, armazenamento no navegador, autenticação e integrações no código próprio.
- Comparação de `HEAD`, `origin/main` após fetch e referência remota via GitHub: mesmo SHA indicado acima. O checkout estava limpo antes do relatório.
- Build e lint reais, tentativa de executar testes, consulta ao npm audit e smoke tests exploratórios automatizados pelo navegador, DOM/árvore de acessibilidade e HTTP local. Não foram solicitados testes manuais ao usuário.
- Build servido por `vite preview` em `127.0.0.1:4173`; servidor de desenvolvimento em `127.0.0.1:4174`. As saídas geradas são ignoradas pelo Git e não fazem parte da entrega.
- Ambiente utilizado: Windows/PowerShell, Node.js `24.19.0`, npm `11.17.0`. Dependências já estavam instaladas; não foi executado `npm install`, `npm ci`, `npm update` ou `npm audit fix`.

As [diretrizes SDD v1.0](https://github.com/dernivaljr/sdd-methodology/blob/main/SDD-GUIDELINES.md) estavam acessíveis e foram consultadas **somente como referência**. Documento aprovado em 09/10/2026; blob consultado `05f4cb40e5b0a68c6bf7e606a74fe6c223c09e5b`. Foram aproveitados os princípios de critérios verificáveis, separação entre requisitos e decisões técnicas e rastreabilidade requisito → implementação → validação. Não se presume adoção formal do SDD pelo Wiki-Chem; esta auditoria não aprova uma constituição ou arquitetura em nome do mantenedor.

### 2.1 Índice de evidências da base

Os links abaixo fixam o commit auditado; números de linha e caminhos no restante do documento referem-se a essa base.

| ID | Evidência |
| --- | --- |
| E01 | [README principal](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/README.md): tecnologias, escopo futuro e estrutura planejada |
| E02 | [package.json raiz](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/package.json), [manifest frontend](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/package.json) e [lock frontend](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/package-lock.json) |
| E03 | [main.tsx, linhas 1–14](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/main.tsx#L1-L14) e [App.tsx, linhas 9–20](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/App.tsx#L9-L20) |
| E04 | [Header.tsx, linhas 9–33](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/components/Header/Header.tsx#L9-L33) e [Header.css](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/components/Header/Header.css) |
| E05 | [Home.tsx](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/Home/Home.tsx), [Hero.tsx](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/components/Hero/Hero.tsx) e [Hero.css](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/components/Hero/Hero.css) |
| E06 | [About.tsx](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/About/About.tsx) e [About.css](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/About/About.css) |
| E07 | [Login.tsx, linhas 10–29](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/Login/Login.tsx#L10-L29), [formulário, linhas 62–144](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/Login/Login.tsx#L62-L144) e [Login.css](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/Login/Login.css) |
| E08 | [Consultas.tsx, linhas 4–38](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/Consultas/Consultas.tsx#L4-L38) e [Consultas.css](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/pages/Consultas/Consultas.css) |
| E09 | [index.html](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/index.html), [index.css](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/index.css) e [App.css](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/src/App.css) |
| E10 | [tsconfig.app.json](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/tsconfig.app.json), [tsconfig.node.json](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/tsconfig.node.json), [eslint.config.js](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/eslint.config.js) e [vite.config.ts](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/vite.config.ts) |
| E11 | [Árvore completa da base](https://github.com/dernivaljr/wiki-chem/tree/1267d9bb945da9e76130fd9c92275120182457ec), [README frontend](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/frontend/README.md), [.gitignore](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/.gitignore) e [LICENSE](https://github.com/dernivaljr/wiki-chem/blob/1267d9bb945da9e76130fd9c92275120182457ec/LICENSE) |

## 3. Inventário e arquitetura real

### 3.1 Organização

| Local | Conteúdo e responsabilidade observada |
| --- | --- |
| Raiz | README, licença GPL v2, `.gitignore`, `package.json` com apenas `dev` e lockfile sem pacotes. Não configura npm workspaces |
| `frontend/src/main.tsx` | Entrada React, fonte Inter local, CSS global, `StrictMode` e `BrowserRouter` |
| `frontend/src/App.tsx` / `App.css` | Cabeçalho global, quatro rotas e altura mínima da raiz |
| `frontend/src/components/Header/` | Marca e links Home, Sobre e Entrar; CSS do cabeçalho |
| `frontend/src/components/Hero/` | Apresentação da Home e CTA para `/login`; imagem de fundo e CSS |
| `frontend/src/pages/Home/` | Composição da Home com Hero |
| `frontend/src/pages/About/` | Conteúdo institucional estático e imagem; CSS com adaptações responsivas |
| `frontend/src/pages/Login/` | Login/cadastro visuais; estado local de modo, visibilidade de senha e feedback |
| `frontend/src/pages/Consultas/` | Painel de busca e três categorias estáticas; nenhum serviço de pesquisa |
| `frontend/src/assets/` | Seis arquivos: `about-lab.png`, `hero-home.webp`, `icon-192.png`, `icon-512.png`, `logo-horizontal.png`, `wiki-chem-symbol.png`. Os ícones 192/512 e a logo horizontal não são referenciados pelo código inspecionado |
| `frontend/public/` | Favicons 16×16 e 32×32, apple-touch-icon 180×180 |
| Configuração frontend | Vite/React, três tsconfigs, ESLint flat config, manifest, lockfile, `.gitignore` e README de template |
| Ausentes na base | `backend/`, `docs/`, testes, workflows `.github/`, contratos de API, schemas/migrações/seeds, corpus, adaptadores externos, configuração de deploy e arquivos de constituição/especificação |

O diretório `docs/` passa a existir apenas com este relatório. `node_modules/` e `frontend/dist/` são artefatos locais ignorados, não módulos adicionais da aplicação versionada.

### 3.2 Fluxo de execução e fronteiras

O navegador carrega `index.html` → `main.tsx` → `BrowserRouter` → `App` → página escolhida, com `Header` persistente. O único estado de negócio aparente está no componente Login e dura apenas enquanto ele permanece montado. Os campos são inputs não controlados pelo React. Não existe camada compartilhada de sessão, cliente HTTP, repositório de dados ou serviço de domínio.

**Frontend:** SPA React/TypeScript e CSS próprio, construída com Vite. **Backend:** ausente; Node.js é usado pelas ferramentas, o que não caracteriza uma API Node de aplicação. **Banco:** ausente; não há MySQL, ORM, conexão, schema, migração ou seed. **Integrações:** fonte e ícones vêm de pacotes locais; não foram encontrados SDK de IA, APIs externas, busca vetorial, ingestão de documentos, e-mail transacional ou telemetria. Trello e Figma são mencionados no README como ferramentas, sem integração executável comprovada.

### 3.3 Rotas e navegação

| Rota | Conteúdo | Acesso e comportamento |
| --- | --- | --- |
| `/` | Home/Hero | Pública; CTA “Explorar conteúdos” leva ao login |
| `/sobre` | Sobre o projeto | Pública; texto institucional, sem catálogo ou ferramentas descritas no texto |
| `/login` | Login e cadastro na mesma URL | Pública; alternância de abas funcional; cadastro não possui rota própria |
| `/consultas` | Painel de consulta | Pública na implementação; não há guard, sessão ou autorização |
| Qualquer rota desconhecida | Apenas cabeçalho | Não há rota `*`, página 404 ou redirecionamento; preview retorna HTML com status 200 |

O cabeçalho permanece com “Entrar” depois do login simulado. Não há link direto para Consultas, perfil ou ação de sair. Voltar à Home/Sobre funciona. A navegação interna usa Link/NavLink. A recarga de rotas conhecidas funciona no preview, mas ainda depende de fallback SPA na hospedagem real, que não está configurada no repositório.

### 3.4 Classificação funcional

**Implementada:** comportamento real observável dentro do escopo indicado. **Parcial:** parte do requisito funciona, com lacunas. **Simulada:** interface aparenta executar uma operação sem realizá-la. **Ausente:** sem implementação encontrada.

| Funcionalidade | Estado | Evidência e limite |
| --- | --- | --- |
| Home, identidade e apresentação institucional | Implementada | E04–E06; conteúdo estático renderizado, fonte e imagens carregadas |
| Navegação entre páginas conhecidas | Implementada | E03–E05; navegação pelo navegador confirmada |
| Descoberta do catálogo/navegação após acesso | Parcial | CTA existe, mas leva a login fictício; Header não oferece Consultas ou estado de usuário |
| Layout responsivo | Parcial | Media queries em 600/850 px; overflow confirmado em 320 px |
| Campos e validação básica do formulário | Implementada | E07: `required`, e-mail e senha com `minLength=6`; é validação do cliente, não autenticação |
| Alternância login/cadastro e mostrar/ocultar senha | Implementada | E07: estado React e handlers; mudança do tipo de input confirmada |
| Login/autenticação | Simulada | E07:22–29; não lê/valida credenciais em serviço e apenas navega |
| Cadastro de usuário | Simulada | E07:28 e 133–136; sucesso visual sem gravação |
| Sessão, expiração, logout e proteção de recursos | Ausente | E03/E07; sem contexto, cookies de sessão no código, armazenamento ou guard |
| “Manter conectado” e recuperação de senha | Simulada | E07:120–125; checkbox sem lógica e botão sem handler |
| Termos e política de privacidade | Parcial | E07:115–118; apenas texto e checkbox obrigatório, sem documentos ou links |
| Pesquisa por termo, clique ou Enter | Simulada | E08:29–34; sem form, handler, estado, consulta ou retorno |
| Abas Substâncias/Técnicas/Conceitos | Simulada | E08:23–26; seleção fixa em Substâncias, sem handlers |
| Sugestões e contador de consulta | Simulada | E08:20/34; texto fixo, sem ação ou contagem real |
| Filtro por técnica | Ausente | A aba “Técnicas” não é filtro nem seleção funcional |
| Filtro por tecnologia | Ausente | Sem campo, taxonomia ou lógica |
| Filtro por equipamento | Ausente | Sem campo, taxonomia ou lógica |
| Filtro por matriz | Ausente | Sem campo, taxonomia ou lógica |
| Filtro por analito | Ausente | Sem campo, taxonomia ou lógica; categoria Substâncias não o substitui |
| Filtro por norma | Ausente | Sem identificador/edição, campo ou vínculo a conteúdo |
| Filtro por segmento | Ausente | Sem campo, taxonomia ou lógica |
| Resultados, detalhes e referências de fontes | Ausente | E08 renderiza somente o painel; nenhuma coleção/detalhe implementado |
| Ordenação, paginação, limpar filtros e URL de pesquisa | Ausente | Sem modelo de consulta ou estado correspondente |
| Catálogo durável e curadoria | Ausente | E11; sem dataset, schema, administração ou importação |
| API REST/MVC e MySQL | Ausente | Citados em E01; sem código/infraestrutura correspondente |
| Busca semântica, IA, RAG, embeddings e ingestão | Ausente | Citados como futuro em E01; nenhum módulo/provedor encontrado |
| Resumos e procedimentos gerados | Ausente | Sem geração, histórico, validação científica ou rastreabilidade |
| Conteúdos didáticos, cálculos e procedimentos anunciados | Ausente | E05/E06 os descrevem, mas não há páginas/conteúdos correspondentes |
| Tratamento de erros e estados assíncronos | Ausente | Sem boundary, 404, loading, vazio, timeout ou falha de serviço |
| Acessibilidade | Parcial | Bons landmarks/labels; problemas de foco, contraste e semântica das abas |
| Favicon e apple-touch-icon | Implementada | E09; arquivos e respostas PNG válidas nos dois modos, com ressalvas na seção 5 |
| Testes automatizados versionados e CI | Ausente | E02/E11; nenhum runner/script/teste/workflow encontrado |

### 3.5 Comparação com o README

| Declaração | Situação verificada |
| --- | --- |
| React, TypeScript, HTML e CSS | Condiz com o código. Vite, Router e bibliotecas visuais também são usados |
| Node.js, REST, MVC, MySQL | Não implementados como aplicação. A seção Status esclarece implementação progressiva, mas a lista “Tecnologias” isolada pode sugerir disponibilidade atual |
| `frontend/`, `backend/`, `docs/` | Estrutura explicitamente planejada; apenas frontend existia na base |
| Busca semântica, RAG e respostas com fontes | Corretamente marcadas como futuras; continuam ausentes |
| Plataforma para consulta e aprendizado | Objetivo ainda não entregue funcionalmente; não há conteúdo consultável |
| Paleta e tipografia Inter | Refletidas em CSS global e import da fonte local |
| Licença GPL v2 | Arquivo LICENSE correspondente presente; não resolve direitos de reprodução das futuras fontes técnicas |
| Execução e contribuição | README principal não documenta instalação, comandos de build/lint, versão mínima de Node, variáveis, dados ou deploy. README frontend permanece template |

## 4. Dependências e qualidade do código

### 4.1 Versões efetivamente observadas

O lockfile frontend é versão 3 e contém 182 entradas de pacotes, sem contar a entrada do projeto: 9 sem flag `dev` e 173 com `dev`. A metadata do npm conta 10 em `prod` incluindo a raiz. O lockfile da raiz contém `packages: {}`. `npm ls --depth=0` não indicou pacote inválido/ausente nas dependências diretas.

| Tipo | Pacotes/versões instaladas e conferidas no inventário |
| --- | --- |
| Runtime | React `19.2.8`, React DOM `19.2.8`, React Router DOM `7.18.2`, lucide-react `1.33.0`, Inter variável `5.3.0` |
| Build e tipos | Vite `8.2.1`, plugin-react `6.0.5`, TypeScript `6.0.3`, @types/node `24.13.3`, @types/react `19.2.18`, @types/react-dom `19.2.4` |
| Lint | ESLint `10.8.1`, @eslint/js `10.0.1`, typescript-eslint `8.67.0`, react-hooks `7.1.1`, react-refresh `0.5.4`, globals `17.11.0` |

Os manifests usam intervalos `^`/`~`; o lock fixa as versões auditadas. Não há `engines`, `packageManager` ou arquivo de versão de runtime do projeto. Os metadados locais exigem, por exemplo, Node `^20.19.0 || >=22.12.0` para Vite/plugin-react e `^20.19.0 || ^22.13.0 || >=24` para ESLint. O Node usado atende a esses requisitos. Não se recomenda interpretar “qualquer Node” como ambiente suportado.

### 4.2 Auditoria de vulnerabilidades

`npm --prefix frontend audit --json` consultou o registro oficial e retornou exit code 1: **4 high, 0 critical**. São quatro pacotes afetados, não apenas quatro advisories; alguns pacotes possuem múltiplos avisos.

| Pacote e cadeia | Resultado e contexto | Prioridade contextual |
| --- | --- | --- |
| `vite@8.2.1`, direto e via plugin-react | Avisos de launch-editor e acesso indevido a arquivos/middleware. O [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) é relevante a Windows e descreve possibilidade de injeção de comando em combinação com falha de escape. A linha 8.2 possui correção indicada em 8.2.4 nesse advisory | P1 para saneamento do ambiente antes de ampliar exposição do servidor de desenvolvimento; exploração não testada |
| `brace-expansion@5.0.9` ← minimatch ← ESLint | Três avisos no audit, envolvendo consumo de CPU/recursão. Exemplo: [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7). O conjunto do audit inclui faixa afetada até 5.0.11 | P2: ferramenta de desenvolvimento; risco condicionado ao processamento de entradas não confiáveis |
| `source-map-js@1.2.1` ← PostCSS ← Vite | Negação de serviço com source maps malformados; [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), correção indicada em 1.2.2 | P2: processamento de build/desenvolvimento; sem caminho de entrada de usuário demonstrado na aplicação |
| `zod@4.4.3` ← eslint-plugin-react-hooks / zod-validation-error | Consumo excessivo de memória com coleções; [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), correção indicada em 4.6.6 | P2: dependência transitiva de lint; não é um validador da aplicação |

O JSON do npm também listou, para Vite, GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22 e GHSA-vfpm-58rq-9qcg; e, para brace-expansion, GHSA-q2hr-2g5m-vwhr e GHSA-6j4f-fj2g-mc7p. As referências principais da tabela foram conferidas na GitHub Advisory Database. O audit indicou `fixAvailable: true` para os quatro pacotes; **nenhuma atualização foi aplicada**. Versões corretivas devem ser avaliadas contra todos os avisos vigentes, com novo build/lint e revisão do lock, sem presumir que resolver um advisory resolva todos.

`npm --prefix frontend audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000` retornou exit code 0 e zero alertas. A classificação `dev` indica a posição no grafo, não ausência de risco: Vite roda na máquina do desenvolvedor e no build. Não foi demonstrado que esses pacotes sejam acessíveis a usuários do site estático. Os servidores usados nesta auditoria ficaram em loopback; não houve exploração, payload malicioso ou alteração de proteções.

### 4.3 Manutenibilidade

Pontos favoráveis: poucos componentes, separação de páginas/componentes e seus estilos, nomes previsíveis, uso de HTML semântico em várias áreas, tipos para o modo de autenticação, dependências travadas e build/lint limpos.

Lacunas: não há camada de domínio/serviços/dados, contratos, estratégia de erros ou testes. Os tsconfigs não habilitam `strict`; `StrictMode` do React não substitui a verificação estrita de TypeScript. O lint usa presets recomendados, hooks e refresh, sem regras tipadas ou de acessibilidade. CSS de Consultas é condensado em linhas longas, dificultando revisão. A dimensão reduzida não justifica introduzir abstrações extensas agora; serviços e modelos devem surgir junto dos casos de uso reais.

## 5. Auditoria funcional, visual e de acessibilidade

### 5.1 Autenticação e persistência

`handleSubmit` cancela o submit HTML. No login, executa `navigate('/consultas')`; no cadastro, apenas `setSubmitted(true)`. Não há leitura de FormData/credenciais, armazenamento, requisição, verificação de usuário ou erro de autenticação. “Conta criada com sucesso.” é uma confirmação indevida. A recarga remove o feedback e volta ao modo de login.

O formulário vazio foi bloqueado pelo navegador com “Preencha este campo.”. Um e-mail fictício e uma senha fictícia com tamanho válido permitiram entrada. A visibilidade da senha alternou corretamente. “Esqueci minha senha” não mudou a tela. “Manter conectado” não é consumido por nenhum handler. Não há recuperação, verificação de e-mail, expiração, renovação, revogação ou logout.

Não existem contas ou consultas persistidas, sequer em localStorage/sessionStorage/IndexedDB no código próprio. A ausência dessas chamadas foi verificada por leitura e busca textual; não se presume que um serviço externo fora do repositório inexista.

### 5.2 Pesquisa e adequação ao domínio

Consultas oferece somente um input não controlado e botões sem handlers. Clicar em Técnicas não altera `aria-selected`; clicar em Pesquisar ou pressionar Enter com “titulação” não produz resultado, erro ou mudança de rota. “Substâncias”, “Técnicas” e “Conceitos” não representam o conjunto de filtros solicitado e não constituem uma taxonomia funcional.

Faltam os sete eixos técnica, tecnologia, equipamento, matriz, analito, norma e segmento, sua combinação, vocabulários controlados, cardinalidades, identificação de métodos e vínculo às fontes. Também faltam resultados, contagem real, detalhe, ordenação e comportamento definido para termo vazio, nenhum resultado e filtros incompatíveis. A definição desses comportamentos deve preceder a implementação.

### 5.3 Responsividade

Medições de `document.documentElement.clientWidth` e `scrollWidth` foram feitas nas quatro páginas, com viewport temporário. O override foi restaurado ao terminar.

| Viewport | Resultado |
| --- | --- |
| 320×740 | Todas as páginas: clientWidth 305 px e scrollWidth 331 px no ambiente com scrollbar. O link Entrar alcança x≈331 px; cabeçalho transborda e a marca disputa espaço com Home |
| 375×812 | Nenhum overflow horizontal global medido; clientWidth/scrollWidth 360/360 nas páginas longas e 375/375 em Consultas |
| 768×1024 | Quatro páginas: 753/753 px, sem overflow horizontal global medido |
| 1280×800 | Quatro páginas: 1265/1265 px, sem overflow horizontal global medido |

As media queries adaptam About e Login para coluna única e reduzem o cabeçalho, mas não resolvem a largura mínima. Ausência de overflow nas outras larguras não equivale a aprovação integral de todos os componentes, orientações, zoom ou dispositivos físicos.

### 5.4 Acessibilidade

Acertos: `lang="pt-BR"`, viewport, `main`, títulos e navegação identificada; marca com nome acessível e imagem decorativa vazia; imagem About com alternativa textual; campos de login envolvidos por labels; busca com aria-label; alternância de senha com nome acessível; feedback de cadastro com `role="status"`.

Problemas comprovados ou diretamente observáveis no código:

- **Foco da busca:** `Consultas.css:16` remove outline e não oferece alternativa. Após foco por teclado, o input tinha `outline-style: none`, largura de outline 0 e `box-shadow: none`; o contêiner não indicava foco. Isso prejudica localizar o controle. Referência: [WCAG 2.4.7 — foco visível](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).
- **Contraste:** sugestões `#8592a3` sobre branco, 11,52 px, razão calculada ≈3,16:1; contador `#9aa8ba` sobre branco, 10,56 px, ≈2,42:1. Ambos abaixo de 4,5:1 para texto comum. As cores/tamanhos foram confirmados no DOM. O placeholder de Login `#a5afbd` sobre branco também resulta em ≈2,22:1. Referência: [WCAG 1.4.3 — contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Abas incompletas:** Login e Consultas usam `tablist`/`tab` sem `tabpanel`, relação `aria-controls` e gerenciamento de foco/teclado correspondente. ArrowRight na aba Entrar não selecionou Criar conta. Em Consultas nem o clique muda a seleção.
- Não há skip link, atualização de título por página ou gerenciamento explícito de foco/anúncio após navegação SPA. Há labels envolvendo o botão de mostrar senha, o que merece revisão de agrupamento e nome acessível; autocomplete de nome/e-mail/senha não foi configurado.

Não foi executado axe, Lighthouse ou teste com leitor de tela externo. Esta análise não é uma certificação WCAG e não reduz os defeitos comprovados à mera ausência dessas ferramentas.

### 5.5 Erros, rotas e favicon

A URL de teste `/rota-inexistente-auditoria` retornou status HTTP 200 no preview e renderizou apenas o cabeçalho, sem `main` ou `h1`. O console registrou `No routes matched location`. Não há fallback de rota, ErrorBoundary ou telas de falha. Não é possível exercitar erros reais de API/DB porque essas camadas não existem.

Os três PNGs de ícones existem e possuem dimensões declaradas corretas. O HTML usa `public/favicon-*.png` e `public/apple-touch-icon.png`; o Vite de desenvolvimento responde 200/image/png nesses caminhos, mas registra aviso recomendando o caminho na raiz. O build reescreve as referências para `/assets/*-hash.png`, todas confirmadas com status 200, MIME image/png e assinatura PNG. Portanto, **não há favicon quebrado comprovado no ambiente auditado**. Padronizar caminhos e evitar a cópia adicional no build é melhoria futura; comportamento sob subdiretório de hospedagem não foi validado.

## 6. Segurança, persistência e arquitetura pendentes

| Área | Diagnóstico e recomendação para trabalho posterior |
| --- | --- |
| Identidade e autorização | Resolver a simulação antes de apresentar o produto como autenticado. Se houver conteúdo privado, aplicar autorização no serviço e testes negativos; guard React sozinho não protege dados. Se o catálogo for público, remover a obrigatoriedade fictícia de login no fluxo futuro |
| Credenciais e sessão | Não existe gestão real. Ao implementá-la, usar provedor ou hashing de senha adequado no servidor, política de sessão/expiração/logout, proteção contra tentativas abusivas e recuperação com tokens limitados. Cookies, se adotados, precisam atributos apropriados e proteção CSRF conforme o modelo escolhido |
| Dados pessoais e políticas | Definir dados mínimos coletados, finalidade, retenção e documentos acessíveis. Não há evidência de envio ou gravação dos dados digitados no protótipo; não afirmar incidente ou conformidade jurídica |
| Catálogo e integridade | Definir identificadores, relações entre facetas e fontes, edição de normas, versão de registros, publicação/revisão e integridade referencial. Não há schema ou política de persistência a auditar |
| API | Sem contratos, validação no servidor, limites, paginação, ordenação ou política de erros. Adotá-los quando a decisão de arquitetura exigir serviço. Não há superfície implementada em que provar SQL injection ou falha CORS |
| Fontes e conteúdo técnico | Nenhum corpus, licença de uso de documentos, processo de curadoria ou revisão técnica encontrado. A licença do software não concede automaticamente uso de artigos, normas e handbooks. Registrar origem e permissão antes de incorporar conteúdo |
| Hospedagem | Sem definição versionada de deploy, ambientes, HTTPS, cache ou fallback SPA. O preview local não retornou CSP, X-Frame-Options ou X-Content-Type-Options; isso não demonstra a configuração de um ambiente de produção desconhecido |
| Operação | Sem configuração de observabilidade, migração, backup/restore, disponibilidade ou recuperação. Dimensionar conforme a solução escolhida; requisitos de DB só se aplicam se ele for adotado |
| Cadeia de fornecimento | Quatro pacotes dev com alertas; revisar compatibilidade e atualizar em trabalho separado. Não servir Vite dev/preview como serviço de produção |
| Controle de mudanças | Nenhum workflow versionado. GitHub informou `protected: false` para main e lista vazia de rulesets na consulta. Não foram alteradas permissões ou regras; falta um controle de verificação antes de merge |
| Segredos | `.gitignore` exclui `.env`/`.env.*`. Uma busca heurística em texto versionado da base, sem emitir valores, não encontrou padrões de chave privada, tokens GitHub/OpenAI ou atribuições longas de chaves/tokens. Não equivale a scanner especializado nem cobre histórico, variáveis de CI ou serviços externos |

Uma base durável e rastreável é essencial para o produto; **MySQL e uma API não são pré-condição lógica de toda consulta pública somente leitura**. São o caminho declarado no README e devem ser confirmados antes de implementar. Um recorte com catálogo curado versionado também pode ser avaliado explicitamente. Nenhuma dessas alternativas está pronta hoje, e esta auditoria não decide a substituição da arquitetura planejada.

## 7. Verificações executadas e comandos

### 7.1 Comandos principais e resultados

Todos os comandos npm abaixo foram executados da raiz do repositório; `--prefix frontend` seleciona o pacote correto.

| Comando/ação | Resultado |
| --- | --- |
| `git status --short`, `git branch --show-current`, `git remote -v`, `git log -5 --oneline`, `git ls-files` | Checkout inicialmente limpo, main e remoto esperados; 39 arquivos na base |
| `rg --files` e leitura numerada com `Get-Content` dos arquivos versionados | Inventário, evidências estáticas e comparação com README |
| `git fetch origin main` | Primeiro bloqueado por escrita de FETCH_HEAD no sandbox; repetição autorizada no ambiente executou com exit 0 |
| `git rev-parse HEAD origin/main` e GitHub `branches/main` | Ambos `1267d9bb945da9e76130fd9c92275120182457ec` |
| `node --version` / `npm --version` | `v24.19.0` / `11.17.0` |
| `npm --prefix frontend ls --depth=0` | Exit 0; dependências diretas presentes, sem inconsistências reportadas |
| `npm --prefix frontend ls --omit=dev --depth=0` | Exit 0; cinco dependências diretas de runtime |
| `npm --prefix frontend ls brace-expansion source-map-js vite zod --all` | Exit 0; confirmou cadeias/versões da seção 4 |
| `npm --prefix frontend run build` | **Exit 0**; `tsc -b && vite build`, 1.826 módulos transformados, Vite 8.2.1; bundle gerado |
| `npm --prefix frontend run lint` | **Exit 0**, nenhum diagnóstico emitido pelo ESLint |
| `npm --prefix frontend test` | **Exit 1**, `Missing script: "test"`; não existe suíte a executar |
| `npm run build` / `npm run lint` na raiz | Ambos **exit 1**, scripts ausentes; os comandos corretos de frontend acima passaram |
| `npm --prefix frontend audit --json` | Primeira tentativa sem acesso ao endpoint, exit 1; repetição com acesso autorizado ao registro concluiu, exit 1 por **4 high** |
| `npm --prefix frontend audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000` | **Exit 0**, nenhuma vulnerabilidade reportada em produção |
| `npm --prefix frontend run preview -- --host 127.0.0.1 --port 4173 --strictPort` | Build servido localmente; suporte aos testes HTTP e de navegador |
| `npm --prefix frontend run dev -- --host 127.0.0.1 --port 4174 --strictPort` | Servidor local iniciado; ícones respondem e geram avisos sobre `/public/` |
| `node --input-type=module -e '<inspeções somente de leitura>'` | Leu lock e dimensões PNG, calculou contrastes, buscou padrões de segredos sem expor valores e realizou HTTP GET local |
| GitHub: leitura de `sdd-methodology/SDD-GUIDELINES.md`, `wiki-chem/branches/main` e `wiki-chem/rulesets` | Referência SDD acessível, base confirmada, main sem proteção indicada e rulesets vazios |
| GitHub: tentativa de leitura de `actions/workflows` pelo conector | Endpoint recusado pela lista permitida do conector; ausência de workflows **versionados** foi verificada localmente, sem inventar resultado remoto |
| `git diff --exit-code` / `git status --short` antes de escrever o relatório | Exit 0/limpo; verificações não modificaram arquivos versionados da aplicação |

Build gerou JS principal de **244,77 kB** (gzip 78,23 kB) e CSS de **15,63 kB** (gzip 3,78 kB). Imagens dominam o tráfego: `hero-home.webp` ≈1,50 MB, `about-lab.png` ≈1,64 MB e símbolo da marca ≈269 kB. A importação geral de Inter inclui múltiplos subconjuntos de fontes. Isso sugere oportunidades de otimização, mas não substitui uma medição de Core Web Vitals em hospedagem e rede reais.

O aviso de impossibilidade de gravar logs no cache npm ocorreu nas tentativas restritas; não é uma falha da aplicação. Não houve instalação limpa para provar reprodutibilidade do zero. O build aprovado usa as dependências existentes e versões conferidas no lock/inventário.

### 7.2 Smoke tests exploratórios pelo navegador

Estas verificações foram executadas pelo agente, não constituem uma suíte de regressão entregue no repositório. Foram usados somente dados fictícios de teste; nenhum serviço externo de autenticação foi acionado.

| Caso | Ação e resultado observado |
| --- | --- |
| NAV-01 | Abrir Home e clicar em Explorar conteúdos → `/login`; links Home/Sobre/Entrar carregam as respectivas páginas |
| AUTH-01 | Enviar login vazio → navegador bloqueia e solicita preencher o campo |
| AUTH-02 | Preencher dados fictícios de formato/tamanho válidos e enviar → `/consultas`, sem comprovação de identidade; Header ainda oferece Entrar |
| AUTH-03 | Alternar mostrar senha → input passa a tipo text; controle funcional |
| AUTH-04 | Clicar em Esqueci minha senha → nenhuma mudança de tela ou fluxo |
| AUTH-05 | Alternar Criar conta, preencher campos e checkbox do protótipo, enviar → “Conta criada com sucesso.”; após reload, retorna ao login sem feedback; código confirma ausência de criação/persistência |
| AUTH-06 | Abrir `/consultas` diretamente em nova aba → painel acessível, sem login na aba; recarga também preserva acesso público |
| SEARCH-01 | Clicar em Técnicas → seleção permanece em Substâncias |
| SEARCH-02 | Digitar “titulação”, clicar Pesquisar e pressionar Enter → nenhum resultado, feedback ou navegação |
| SEARCH-03 | Recarregar Consultas → campo é esvaziado; não há estado de consulta recuperável |
| ROUTE-01 | Abrir `/rota-inexistente-auditoria` → só cabeçalho; contagem DOM main=0 e h1=0, warning do Router |
| A11Y-01 | Focar busca via Tab/Shift+Tab → input focado sem outline/sombra/realce equivalente no contêiner |
| A11Y-02 | ArrowRight na aba Entrar → não ativa Criar conta; DOM confirma abas sem painéis associados |
| A11Y-03 | Ler cores/tamanhos computados de sugestões/contador e calcular luminância relativa → razões insuficientes da seção 5 |
| UI-01 | Medir quatro páginas nas larguras 320, 375, 768 e 1280 px → resultados da seção 5; capturas visuais inspecionadas, sem adicionar imagens à entrega |
| ICON-01 | GET dos três ícones em dev e dos três URLs emitidos no HTML do build → 200, MIME e assinatura PNG corretos |

No console consultado, o warning relevante foi o da rota desconhecida gerada pelo teste. Não foi observada exceção JavaScript não tratada nos fluxos básicos inspecionados; isso não valida fluxos ainda inexistentes.

### 7.3 Reprodução das inspeções auxiliares

Os scripts auxiliares foram passados ao Node inline, sem criar arquivos de aplicação. O trecho abaixo reproduz a checagem HTTP principal após o build/preview; os URLs de ícones são extraídos do HTML gerado, sem supor nomes de hash:

```javascript
// Executar na raiz com Node em modo módulo e o preview ativo.
import fs from 'node:fs';
const html = fs.readFileSync('frontend/dist/index.html', 'utf8');
const icons = [...html.matchAll(/href="([^"]+\.png)"/g)].map(m => m[1]);
for (const path of ['/', '/sobre', '/login', '/consultas',
  '/rota-inexistente-auditoria', ...icons]) {
  const response = await fetch('http://127.0.0.1:4173' + path);
  const bytes = new Uint8Array(await response.arrayBuffer());
  console.log({path, status: response.status,
    type: response.headers.get('content-type'), bytes: bytes.length,
    png: bytes[0] === 137 && bytes[1] === 80});
}
```

Nas medições de layout foram lidos `innerWidth`, `document.documentElement.clientWidth`, `scrollWidth` e `getBoundingClientRect()` dos links do cabeçalho; nas de foco/contraste, `document.activeElement` e `getComputedStyle()`. Interações ocorreram por locators de papel/nome, clique, preenchimento, Enter, Tab/Shift+Tab e ArrowRight. Os valores de senha e quaisquer possíveis segredos foram excluídos do relatório.

## 8. Problemas por severidade

**P0:** incidente crítico ou exposição grave comprovada, ação imediata. **P1:** bloqueia o fluxo central do MVP, falsa garantia essencial ou risco elevado com contexto relevante. **P2:** defeito relevante de qualidade, segurança contextual ou preparação operacional. **P3:** manutenção, clareza e otimização. Prioridade de pacote no npm e prioridade do projeto são classificações diferentes.

**Nenhum P0 comprovado.** Não foram encontrados dados persistidos expostos ou exploração em curso, e não houve pentest de infraestrutura.

| ID | Severidade | Problema, impacto e evidência | Encaminhamento |
| --- | --- | --- | --- |
| AUD-01 | P1 | Pesquisa/categorias inertes e sete filtros ausentes; impede consultar qualquer informação. E08, SEARCH-01/02 | MVP-01/05 |
| AUD-02 | P1 | Catálogo, persistência e referências inexistentes; não há conteúdo para sustentar respostas nem resultados. E11, seção 3 | MVP-03/04/06 |
| AUD-03 | P1 | Login/cadastro simulam sucesso, sem sessão e sem proteção; gera falsa expectativa de conta/acesso. E03/E07, AUTH-02/05/06. Acesso público só é falha de autorização se restrição for requisito; a falsa confirmação já é defeito | MVP-01/07 |
| AUD-04 | P1 | Vite dev vulnerável em ambiente Windows, com advisory de potencial execução de comando sob condições específicas. Não demonstrado explorável no site estático. E02 e seção 4 | MVP-02 |
| AUD-05 | P2 | Três dependências transitivas dev com avisos altos de DoS; risco na cadeia de ferramentas, condicionado às entradas processadas | MVP-02 |
| AUD-06 | P2 | Sem testes versionados, CI ou proteção indicada de main; regressões não são bloqueadas. E02/E11 e consultas GitHub | MVP-10 |
| AUD-07 | P2 | Rota desconhecida não tem conteúdo/404 e faltam estados de falha, vazio e carregamento do futuro fluxo. E03/E08, ROUTE-01 | MVP-08 |
| AUD-08 | P2 | Cabeçalho transborda em 320 px e limita navegação em largura suportada pelo próprio CSS. E04, UI-01 | MVP-09 |
| AUD-09 | P2 | Busca sem foco visível, textos com contraste insuficiente e abas incompletas. E07–E09, A11Y-01/02/03 | MVP-09 |
| AUD-10 | P2 | Publicação/operação não especificadas; fallback SPA e controles de ambiente real sem evidência. E10/E11. Ausência de headers no preview não prova falha de produção | MVP-11 |
| AUD-11 | P3 | Imagens/fontes pesadas e ícones com caminho `/public/` gerando avisos e cópias extras; favicon funciona. E05/E06/E09, build e ICON-01 | MVP-12 |
| AUD-12 | P3 | Documentação de execução ausente/template; scripts build/lint inexistentes na raiz e tecnologias futuras podem ser confundidas com atuais. E01/E02/E11 | MVP-01/11 |
| AUD-13 | P3 | TypeScript sem modo strict e lint sem verificações tipadas/acessibilidade; menor detecção preventiva de defeitos. E10 | MVP-10 |

## 9. Escopo proposto e backlog de conclusão do MVP

O backlog é **proposta para especificação e aprovação posterior**, não compromisso já aprovado nem implementação efetuada. A ordem considera dependências; itens de acesso se tornam condicionais conforme D01. Não se atribuem estimativas sem volume de conteúdo, equipe e decisão de arquitetura.

### 9.1 O que precisa existir no MVP

Consulta real sobre um catálogo curado e durável, com os sete filtros aprovados, resultados verificáveis, detalhe útil e fontes identificáveis; navegação e estados de erro compreensíveis; uso por teclado e em telas pequenas; publicação reproduzível e verificações automáticas do caminho principal. Autenticação real é obrigatória se o produto exigir acesso restrito ou funções pessoais. Uma confirmação fictícia de autenticação/cadastro não é aceitável em nenhum dos modelos.

Referências às fontes são parte do valor mínimo da consulta técnica, mesmo sem IA. A geração automática de resumos e procedimentos, ao contrário, não é necessária para entregar uma primeira busca estruturada.

### 9.2 Backlog priorizado com aceitação

| ID / ordem | Entrega proposta e origem | Critérios de aceitação verificáveis | Dependências |
| --- | --- | --- | --- |
| **MVP-01 — primeiro** | Especificar recorte, acesso e vocabulário. AUD-01/02/03/12 | Documento versionado distingue estado atual/futuro, público-alvo, casos de consulta, sete facetas e regras de combinação; registra decisões D01–D04 e critérios de cada fluxo; exemplos esperados e exceções podem ser usados como fixtures de testes | Decisão de produto |
| **MVP-02 — imediato** | Sanear dependências vulneráveis em alteração separada. AUD-04/05 | Revisão de avisos e de compatibilidade com o runtime; lock atualizado de forma controlada; build/lint passam; novo audit não possui high/critical aplicável sem tratamento ou justificativa explícita de risco; auditoria de produção separada; nenhuma atualização cega por `--force` | Não depende do catálogo |
| **MVP-03** | Definir modelo e catálogo inicial curado. AUD-02 | Registros têm ID estável, título/descrição, relações com as sete facetas, fonte/edição/localizador, versão e status de revisão; vocabulários distinguem técnica/tecnologia/equipamento; amostra aprovada cobre cada faceta, combinações e ausência de resultados; dados sem fonte/status permitido não são publicados | MVP-01, D02/D04 |
| **MVP-04** | Persistência e camada de leitura. AUD-02/10 | Catálogo sobrevive a recarga/reinício e é reproduzível em outro ambiente; implementa caminho D03 aprovado. Se REST/MySQL: contratos, schema, migrações e seed versionados; validação e consultas parametrizadas; listagem/detalhe/facetas com limites e ordenação definidos; teste de integração cobre leitura e entrada inválida. Se catálogo estático: dados versionados validados por schema e pipeline de publicação documentado | MVP-03, D03 |
| **MVP-05** | Busca e filtros funcionais. AUD-01 | Clique e Enter executam a mesma consulta; cada uma das sete facetas restringe resultados e combina conforme regra aprovada; limpar restaura estado inicial; termo/filtros são recuperáveis por URL; pesquisa vazia/sem correspondência/filtro incompatível têm comportamento testado; resposta anterior não sobrescreve busca mais recente; contagem e ordenação são reais | MVP-04, D02 |
| **MVP-06** | Resultados, detalhe e fontes. AUD-02 | Resultado abre registro correto, exibe técnica/matriz/analito e outros metadados relevantes, fonte com identificador/edição e localizador acessível conforme permissão; resultados e detalhes concordam; conteúdo é apresentado como revisado somente se houve revisão registrada; nenhum texto gerado é apresentado como norma oficial | MVP-03/04/05, D04 |
| **MVP-07 — condicional de acesso** | Resolver identidade e fluxo de entrada. AUD-03 | Se público: consulta acessível pelo CTA e navegação, sem simulação de conta/sessão. Se autenticado: cadastro cria usuário durável ou provedor efetivo; login inválido falha; sessão expira e logout revoga; recurso protegido rejeita pedido direto sem autorização; duplicidade e recuperação são tratadas; “Manter conectado” tem política real ou é removido; termos/política têm destino válido. Testes positivos/negativos automatizados verificam o modelo escolhido | MVP-01, D01; serviço se aplicável |
| **MVP-08** | Estados e tratamento de erros. AUD-07 | Há loading, lista vazia, erro recuperável e prevenção de envio duplicado; teste com falha/timeout simulado retorna feedback e permite tentar de novo; detalhes inválidos/rota desconhecida mostram página adequada; erro inesperado tem fallback sem expor stack/segredos ao usuário | MVP-04/05/06; roteamento |
| **MVP-09** | Acessibilidade e responsividade. AUD-08/09 | Navegação/cabeçalho e filtros utilizáveis sem rolagem horizontal em 320/375/768/1280 px; foco visível e ordem lógica; abas seguem padrão completo ou usam semântica mais simples apropriada; textos atingem contraste aplicável; formulários têm labels, erros associados e autocomplete adequado; títulos/foco de SPA são tratados; verificações automatizadas de UI/a11y não apresentam falhas críticas conhecidas do fluxo | Telas do fluxo definido |
| **MVP-10** | Testes e CI proporcionais ao risco. AUD-06/13 | Comandos de teste documentados e repetíveis; filtros e combinações testados com dataset de referência; integração da persistência/camada de leitura e acesso quando aplicável; teste de navegador cobre busca→resultado→fonte, erro e rota direta; CI de PR executa instalação pelo lock, build, lint e testes; exigência de checks/revisão configurada conforme governança; adoção de strict/regras adicionais avaliada com correções próprias | MVP-02 e implementações incrementais |
| **MVP-11** | Publicação e documentação operacional. AUD-10/12 | Clone limpo sobe seguindo README; versão de Node e comandos corretos declarados; build publicado em ambiente definido; abrir/recarregar `/consultas` e detalhe funciona; HTTPS/headers/cache definidos na hospedagem, sem chaves no cliente; logs e falhas observáveis sem dados sensíveis; se houver banco, backup e restauração testados; documentação distingue implementação e roadmap | D03/D05 e fluxo funcional |
| **MVP-12 — acabamento** | Otimizar entrega visual e ícones. AUD-11 | Orçamento de carregamento definido e medido; imagens com dimensões/formato/tamanho apropriados e carregamento conforme uso; revisar subconjuntos de fonte; ícones sem avisos/cópias desnecessárias e URLs válidos na hospedagem escolhida; build e inspeção HTTP confirmam preservação do favicon | MVP-11; sem bloquear a especificação funcional |

Sequência sugerida: especificação e correção da cadeia de ferramentas → catálogo/modelo → leitura durável → busca/facetas → resultados/fontes. Resolver acesso em paralelo conceitual à especificação e antes da liberação; incorporar estados, acessibilidade e testes em cada incremento, evitando concentrá-los no final.

### 9.3 Evolução após o MVP

| Frente futura | Pré-condições e validação proposta |
| --- | --- |
| Busca semântica | Catálogo/fontes estabilizados; conjunto de perguntas e métricas de recuperação; comparação com busca estruturada antes de escolher infraestrutura |
| Assistência por IA e RAG | Permissões de uso do corpus, ingestão/versionamento, citações verificáveis, recusa quando faltarem fontes, controle de prompt injection e segredos no servidor, limites de custo/latência e avaliação de qualidade |
| Resumos assistidos | Ligação ao documento/trecho e versão, distinção entre extração e inferência, avaliação por referência e revisão humana conforme risco técnico |
| Procedimentos técnicos gerados | Contexto explícito de técnica/equipamento/matriz/analito/norma, rastreabilidade de cada orientação, limites de aplicabilidade e fluxo de revisão; geração não substitui documento normativo ou validação do laboratório |
| Recursos adicionais | Histórico, favoritos, exportação, colaboração, administração visual, cálculos, painéis e integrações externas apenas mediante requisitos e prioridade próprios |

Não há necessidade demonstrada de adotar agora banco vetorial, fornecedor de LLM, microserviços ou trocar React/Vite. A ausência de IA/RAG não é defeito do MVP estruturado; anunciar respostas/fontes inexistentes é que exige ajuste de expectativa.

## 10. Decisões ainda pendentes

| ID | Decisão | Efeito e responsável sugerido |
| --- | --- | --- |
| D01 | Consulta pública ou restrita? Haverá conta e conteúdo pessoal no MVP? | Define autenticação, privacidade, autorização e UX. Responsável de produto/mantenedor |
| D02 | O que distingue técnica, tecnologia e equipamento? Como combinar facetas, aliases, fórmulas, acentos e campos vazios? Norma exige edição/situação vigente? | Determina modelo, UI, busca e fixtures. Produto com especialista de química analítica |
| D03 | Confirmar Node/REST/MVC/MySQL planejados, persistência, hosting e contratos; avaliar explicitamente qualquer recorte estático | Define implementação, migração, sessão, operação e custos. Mantenedor/arquitetura |
| D04 | Quais fontes e quantos registros iniciais, quais permissões de uso, quem revisa e como versionar/publicar correções? | Define cobertura real, confiabilidade e critérios de conclusão. Curadoria técnica/produto |
| D05 | Ambiente de publicação, navegadores suportados, requisitos mensuráveis de disponibilidade/desempenho e acesso à operação | Define validação de deploy, observabilidade, recuperação e orçamento de ativos. Mantenedor/operação |
| D06 | Adoção formal de SDD, constituição do projeto, revisão obrigatória e checks de merge | Define governança; esta referência metodológica não efetiva adoção ou aprovação. Mantenedor/equipe |
| D07 | Quando IA é necessária e com que critérios de fidelidade, custo, citações e revisão de procedimentos? | Delimita roadmap após consulta estruturada; não selecionar fornecedor antes do caso de uso. Produto/curadoria/arquitetura |

## 11. Limitações e integridade da entrega

- A conclusão está vinculada ao SHA auditado e ao código acessível. Não foi fornecida URL de produção; não se auditou uma implantação externa, infraestrutura, contas de nuvem, configurações de CI secretas, Trello ou Figma.
- Sem backend, banco, corpus ou provedor de identidade, não é possível aprovar integração, migração, recuperação de dados ou segurança dessas camadas. Ausência de código não prova inexistência de trabalho em outro repositório.
- Não houve instalação limpa, matriz de navegadores, dispositivos físicos, leitor de tela dedicado, Lighthouse, teste de carga, pentest ativo, verificação formal de licenças de todas as dependências ou scanner completo de segredos/histórico Git.
- Resultados npm audit refletem a consulta de 29/10/2026 e podem mudar. Vulnerabilidade em dependência não foi automaticamente tratada como exploração confirmada; classificação de risco considerou uso dev/runtime e Windows.
- Os testes exploratórios executados pelo agente fornecem evidências do comportamento observado, mas não criam uma suíte permanente. Build e lint verdes não demonstram que pesquisa/autenticação estejam implementadas.
- A tentativa de ler a coleção remota de workflows foi limitada pelo conector; o inventário local não contém `.github/`. Os dados de proteção de branch/rulesets foram lidos com sucesso e são uma fotografia do momento.
- A entrega versionada se limita a este arquivo. Nenhum segredo/credencial ou dado real de formulário foi incluído. Geração local de build/cache é efeito das verificações e não integra o PR. Não foram implementadas correções ou mudanças de escopo, e não há autorização de merge nesta auditoria.
