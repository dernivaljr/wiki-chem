# Etapa 01 — Estabilização técnica

Data de referência: 29/10/2026 (America/Sao_Paulo).

Branch: `fix/estabilizacao-inicial`, criada de `origin/main` no commit `1267d9bb945da9e76130fd9c92275120182457ec`.

Referência diagnóstica: [PR #1](https://github.com/dernivaljr/wiki-chem/pull/1), relatório no commit `1b9e287d4c8db7d085146023392b40b378fe126f`. Esse PR e seu relatório não foram modificados nem incorporados à branch desta etapa.

## Alterações e relação com a auditoria

| Área | Entrega | Achados relacionados |
| --- | --- | --- |
| Dependências | Correções compatíveis para os quatro pacotes vulneráveis; ferramentas de teste com lockfile versionado | AUD-04/05 |
| Testes | Vitest/Testing Library/jsdom para componentes e rotas; Playwright/Chromium para regressões de navegação e CSS | Parte inicial de AUD-06 |
| CI | Instalação limpa, build, lint, testes e auditorias em GitHub Actions; token somente de leitura | Parte inicial de AUD-06/10 |
| Documentação | README com ambiente, comandos, limites reais do protótipo, roadmap e funcionamento do CI | AUD-12 |
| Layout | Cabeçalho em duas linhas até 480 px, slogan oculto quando falta espaço e remoção do mínimo fixo do body que causava overflow com scrollbar | AUD-08 |
| Foco e contraste | Foco de teclado azul e textos auxiliares/placeholder com o cinza existente da identidade; altura de cabeçalho compartilhada com as páginas | Parte comprovada de AUD-09 |

Nenhum arquivo de lógica de negócio da aplicação (`App`, páginas ou componentes `.tsx` existentes) foi alterado. Login/cadastro continuam simulados e a pesquisa permanece sem implementação, conforme o limite desta etapa.

## Dependências e compatibilidade

| Pacote do grafo original | Antes | Depois |
| --- | --- | --- |
| Vite | 8.2.1 | 8.2.4 |
| brace-expansion | 5.0.9 | 5.0.12 |
| source-map-js | 1.2.1 | 1.2.2 |
| Zod | 4.4.3 | 4.6.7 |

O manifest mantém Vite na linha 8.2 (`~8.2.4`). As três dependências transitivas foram atualizadas dentro dos intervalos aceitos pelos respectivos consumidores, sem overrides e sem `npm audit fix --force`. A resolução das novas ferramentas também atualizou `picomatch` de 4.0.5 para 4.0.7 e `@jridgewell/sourcemap-codec` de 1.5.5 para 1.6.0. As cinco dependências diretas de runtime da aplicação mantêm suas versões anteriores.

Ferramentas iniciais: Vitest 5.0.5, jsdom 30.1.3, Testing Library React 16.3.3, DOM 10.4.2, user-event 14.6.8, jest-dom 6.9.1 e Playwright 1.64.1. Node 24.19.0/npm 11.17.0 foram usados localmente. `.nvmrc` fixa a referência do CI e os manifests declaram a faixa de Node suportada.

## Escopo dos testes

Os 10 testes de componentes/rotas cobrem renderização das quatro páginas existentes, landmarks e títulos, navegação por links/CTA, campos obrigatórios e restrições HTML, alternância visual de modo, mostrar/ocultar senha e edição do campo de consulta. Eles não submetem login/cadastro e não apresentam um redirecionamento como autenticação nem digitação como pesquisa funcional.

Os testes Playwright usam o build real em um preview temporário, sem reaproveitar servidor possivelmente desatualizado. Verificam quatro páginas em 320/375/480/481/600/601/700/701/768/1280 px, sem overflow global ou sobreposição dos links, além de navegação, foco por teclado e contraste mínimo dos textos corrigidos. Contadores, sugestões e placeholders usam `#526071` sobre branco (razão aproximada 6,42:1); a paleta azul foi preservada.

## Comandos e resultados

Os comandos abaixo são executados na raiz. A instalação limpa usa o pacote frontend, sem depender de `node_modules` anterior.

| Comando | Resultado local |
| --- | --- |
| `npm ci --prefix frontend --fetch-retries=0 --fetch-timeout=30000` | Exit 0; instalação limpa concluída, 234 pacotes instalados |
| `npm run build` | Exit 0; TypeScript e Vite 8.2.4, 1.826 módulos transformados |
| `npm run lint` | Exit 0, sem diagnósticos |
| `npm test` | Exit 0, 3 arquivos e 10 testes aprovados |
| `npm exec --prefix frontend -- playwright install --no-shell chromium` | Exit 0; Chromium/FFmpeg/Winldd disponíveis, sem download do shell separado |
| `npm run test:e2e` | Exit 1 local: 13 testes impedidos de iniciar por `browserType.launch: spawn UNKNOWN`; falha antes das asserções, sem aprovação local da suíte |
| `npm run audit:deps` | Exit 0, zero vulnerabilidades, incluindo ferramentas de desenvolvimento |
| `npm run audit:prod` | Exit 0, zero vulnerabilidades de produção |
| `npm --prefix frontend ls vite brace-expansion source-map-js zod --all` | Cadeias corrigidas e versões compatíveis confirmadas |
| `git diff --check` | Sem erros de whitespace; avisos de conversão LF/CRLF do Git local não indicam falha |

As falhas iniciais da configuração de testes foram corrigidas antes da validação final: import com extensão no config Vitest, opções de locator da Testing Library e encaminhamento de argumentos nos scripts da raiz. Não foram suprimidos avisos de compatibilidade nem desabilitadas verificações para obter aprovação.

A inspeção adicional pelo navegador integrado confirmou foco visível e ausência de overflow do painel de consultas nas dez larguras, inclusive com scrollbar clássica em 320 px (clientWidth/scrollWidth 305/305). Ela é evidência complementar e não substitui a execução da suíte Playwright. O binário instalado é PE x64 e o erro local de spawn persiste mesmo na execução autorizada; a causa detalhada não foi comprovada e não foram alteradas proteções do sistema para contorná-lo. O runner Linux do CI será usado para validar a suíte versionada.

## GitHub Actions

O workflow `.github/workflows/ci.yml` usa Ubuntu, checkout/setup-node v6, versão Node da `.nvmrc`, cache npm pelo lockfile frontend e `npm ci`. Executa build, lint, Vitest, instalação de Chromium com dependências do sistema, Playwright e ambas as auditorias npm. A auditoria bloqueia severidade moderada ou superior; o resultado local atual é zero em todos os níveis.

Dispara para PRs destinados a main, pushes em main e execução manual quando o workflow estiver disponível. Não há deploy, permissões de escrita ou alteração das regras de proteção. A execução remota depende da publicação/abertura do novo PR; seus checks são a fonte do resultado posterior à validação local registrada aqui.

## Pendências preservadas

- Catálogo, sete filtros, resultados, fontes e pesquisa real; backend, banco e eventual autenticação continuam fora desta etapa.
- Semântica/teclado completo das abas, agrupamento do campo de senha, foco e título após navegação SPA, skip link e avaliação integral de acessibilidade continuam pendentes. As correções de foco/contraste não equivalem a certificação WCAG.
- Página 404, estados de erro/carregamento/resultado vazio, otimização de imagens/fontes e avisos dos caminhos `public/` dos favicons continuam pendentes.
- TypeScript strict e regras adicionais de lint não foram ativados indiscriminadamente; a suíte inicial não impõe cobertura percentual mínima.
- CI está configurado para Chromium/Ubuntu; o lançamento direto do Chromium no Windows local foi limitado conforme registrado acima. A inspeção no navegador integrado não é uma matriz de navegadores ou dispositivos físicos. Não houve pentest ou teste de carga.
- Checks obrigatórios para merge dependem de configuração de proteção do repositório, que não foi alterada. O workflow não configura hospedagem/backup/observabilidade de uma aplicação futura.
- npm audit depende de rede e da base vigente do registro; zero alertas conhecidos não certifica segurança. Este PR não realiza merge e não modifica o PR #1.
