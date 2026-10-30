# Wiki-Chem

Plataforma em desenvolvimento para consulta e aprendizado de **Química Analítica**, destinada a estudantes, professores e profissionais de laboratório.

## Estado atual

O projeto contém um **protótipo de frontend**, ainda sem um MVP de consulta funcional.

| Disponível | Limite atual |
| --- | --- |
| Home (`/`) e Sobre (`/sobre`) | Apresentação institucional estática |
| Navegação pelo cabeçalho e CTA | O CTA leva à tela de acesso |
| Formulários de acesso (`/login`) | Alternância de modo, campos HTML e mostrar/ocultar senha funcionam; login e cadastro são simulados |
| Painel de consultas (`/consultas`) | Campo editável e controles visuais; não executa pesquisa nem filtros |
| Estabilização técnica inicial | Build, lint, testes de componentes/rotas, regressões visuais no navegador e GitHub Actions |

**Não existe autenticação, criação de conta ou sessão real.** O redirecionamento do login não comprova identidade e a mensagem de cadastro não significa que uma conta foi persistida. `/consultas` é uma rota pública. As categorias e o botão de pesquisa ainda não têm lógica de consulta.

A auditoria de referência está no [PR #1](https://github.com/dernivaljr/wiki-chem/pull/1). A estabilização é uma alteração independente, baseada em `main`; não incorpora nem modifica o relatório daquele PR.

Consulte o [registro da Etapa 01](docs/etapas/ETAPA-01-ESTABILIZACAO.md) para mudanças, resultados das verificações e pendências.

## Ambiente e instalação

Use **Node.js 24.19.0** (versão de referência em `.nvmrc`) e **npm 11 ou superior**. O intervalo de Node suportado está em `engines`; o CI usa a mesma versão de referência. Com nvm compatível, execute `nvm install` e `nvm use`; também é possível instalar essa versão diretamente.

Na raiz do repositório:

```sh
npm ci --prefix frontend
npm exec --prefix frontend -- playwright install --no-shell chromium
npm run dev
```

O pacote que contém a aplicação e suas dependências é `frontend/`. Executar apenas `npm ci` na raiz não instala o frontend. Use o lockfile versionado e `npm ci` para reproduzir a instalação; os scripts da raiz encaminham os comandos para o frontend.

No Linux, a primeira preparação do navegador pode exigir bibliotecas do sistema:

```sh
npm exec --prefix frontend -- playwright install --with-deps --no-shell chromium
```

O servidor de desenvolvimento informa a URL no terminal. Os testes de componentes não exigem navegador instalado; Playwright é necessário somente para `test:e2e`.

A configuração usa o canal Chromium no modo headless atual; `--no-shell` evita baixar também o binário headless shell separado.

## Comandos de desenvolvimento e qualidade

Execute na raiz:

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor Vite com atualização durante desenvolvimento |
| `npm run build` | Verificação TypeScript e build em `frontend/dist/` |
| `npm run preview` | Inspeção local do build existente; execute build antes |
| `npm run lint` | ESLint do frontend, configurações e testes |
| `npm test` | Vitest em execução única, apropriado para CI |
| `npm run test:watch` | Vitest em modo interativo durante desenvolvimento |
| `npm run test:e2e` | Playwright/Chromium: navegação, cabeçalho responsivo, foco e contraste |
| `npm run audit:deps` | Auditoria npm incluindo ferramentas de desenvolvimento |
| `npm run audit:prod` | Auditoria npm somente das dependências de produção |

`test:e2e` gera seu próprio build e inicia/encerra um preview em `127.0.0.1:4173`. A porta precisa estar livre. Falhas geram capturas e traces em `frontend/test-results/`, ignorado pelo Git. Vite dev/preview são servidores de desenvolvimento e inspeção local, não uma configuração de hospedagem de produção.

As auditorias dependem do registro npm e falham a partir de severidade **moderada**, incluindo alta e crítica. Omitir dependências de desenvolvimento não substitui a auditoria completa. Não use `npm audit fix --force`; revise mudanças de versão e execute as verificações após atualizar o lockfile.

## Estratégia inicial de testes

- **Vitest + Testing Library + jsdom:** renderização das quatro páginas, navegação real por links/CTA, nomes acessíveis e restrições HTML dos campos, alternância visual login/cadastro, visibilidade da senha e edição do termo de consulta.
- **Playwright + Chromium:** navegação no build, ausência de overflow/sobreposição dos links em 320, 375, 768 e 1280 px e nos limites das media queries (480/481, 600/601, 700/701 px), foco de teclado na busca e contraste mínimo de 4,5:1 nos textos/placeholder corrigidos.
- Os testes **não submetem login/cadastro simulados nem certificam autenticação, persistência, pesquisa ou proteção de rotas**. Essas funcionalidades exigirão implementação e testes próprios.

Não há cobertura percentual mínima nesta suíte inicial. Os testes de navegador não equivalem a uma auditoria WCAG completa nem a uma matriz de navegadores/dispositivos.

## Integração contínua

O workflow [ci.yml](.github/workflows/ci.yml) roda em PRs destinados a `main`, pushes em `main` e execução manual quando disponível. Em Ubuntu/Node definido por `.nvmrc`, executa:

1. Instalação limpa pelo lockfile (`npm ci --prefix frontend`).
2. Build, lint e testes de componentes/rotas.
3. Instalação do Chromium e testes de navegador.
4. Auditoria completa e auditoria das dependências de produção.

O workflow tem permissão somente de leitura do repositório e não publica a aplicação. Tornar seus checks obrigatórios para merge depende das regras de proteção do repositório; este workflow não altera essas regras.

## Tecnologias implementadas

React 19, TypeScript, React Router, Vite 8, CSS próprio, Inter e lucide-react. Vitest, Testing Library, jsdom e Playwright dão suporte à qualidade. Node.js é o runtime das ferramentas; **não existe backend Node de aplicação neste repositório**.

```text
wiki-chem/
├── .github/workflows/   # Verificações de CI
├── frontend/
│   ├── e2e/            # Regressões no navegador
│   ├── public/         # Ícones
│   └── src/            # Páginas, componentes, estilos e testes
├── docs/               # Registro das etapas e resultados
└── README.md
```

## Planejado, ainda não implementado

- Catálogo curado, resultados, detalhes e referências às fontes.
- Filtros por técnica, tecnologia, equipamento, matriz, analito, norma e segmento.
- Backend Node.js/API REST/MVC e MySQL: arquitetura prevista, ainda sem implementação.
- Modelo de acesso, autenticação real, sessões e persistência de usuários, se aprovados para o MVP.
- Busca semântica, assistência por IA/RAG, resumos e procedimentos técnicos com fontes: evolução futura.

Persistem pendências registradas na auditoria, incluindo página 404, semântica/teclado das abas, gestão de foco após navegação SPA, otimização de imagens/fontes, caminhos de favicon que geram avisos no Vite e configuração de hospedagem. Não foram incluídas nesta etapa alterações dessas funcionalidades.

## Identidade visual e licença

Paleta principal: azul escuro `#0D1B4C`, azul `#1E66FF`, azul claro `#D6E9FF`, fundo `#F2F6FF` e branco `#FFFFFF`, com tipografia Inter. Textos auxiliares usam o cinza do projeto para contraste legível.

Projeto desenvolvido para a disciplina de Engenharia de Software II. Licenciado sob a [GNU GPL v2](LICENSE).
