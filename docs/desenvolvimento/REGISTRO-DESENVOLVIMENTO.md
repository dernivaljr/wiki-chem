# Registro interno de desenvolvimento

Este registro é operacional e não integra a documentação acadêmica destinada à FATEC.

## Proveniência da especificação (histórico)


A branch documental parte de `main` em `6f48aecbca3fce10518e6224731086ec74c48d5c`. Pré-condições verificadas antes de criá-la:

| Verificação | Evidência |
| --- | --- |
| Auditoria integrada | [PR #1](https://github.com/dernivaljr/wiki-chem/pull/1), merge `2fe5ee6a330d2057783077d42165e68e717db146` |
| Etapa 01 integrada | [PR #2](https://github.com/dernivaljr/wiki-chem/pull/2), merge `6f48aecbca3fce10518e6224731086ec74c48d5c` |
| CI da main aprovada nesse SHA | [Execução 40980122133](https://github.com/dernivaljr/wiki-chem/actions/runs/40980122133), evento push em main, conclusão success |

Referências locais: [auditoria](../auditoria/AUDITORIA-2026-10-29.md) e [Etapa 01](../etapas/ETAPA-01-ESTABILIZACAO.md). A base tem frontend React, quatro rotas, testes e CI. Login/cadastro e consulta ainda são simulações. Não há backend, banco ou e-commerce implementados.

Foram consultadas as [diretrizes SDD v1.0](https://github.com/dernivaljr/sdd-methodology/blob/main/SDD-GUIDELINES.md), blob `05f4cb40e5b0a68c6bf7e606a74fe6c223c09e5b`. Requisitos, solução técnica e tarefas estão separados nestes cinco documentos. Não foi identificada constituição própria aprovada; sua formalização/adaptação permanece em V10. Consultar as diretrizes não constitui aprovação automática do desenho proposto.

Documentos associados: [arquitetura e API](../arquitetura/ARQUITETURA-MVP.md), [modelo de dados](../arquitetura/MODELO-DADOS.md), [regras comerciais](../arquitetura/ECOMMERCE.md) e [roadmap](../planejamento/ROADMAP-MVP.md).


## Validação documental anterior (histórico)


- Pré-condições de merge/CI da main verificadas e registradas na especificação.
- Revisão de consistência entre RF, P/V, contratos, entidades, estados e tarefas; diagramas Mermaid nativos incluídos.
- Revisão final local: cinco documentos existentes, 27 links locais válidos, 59 IDs definidos sem referências desconhecidas, oito blocos Mermaid, cercas/encoding e relações ER sem erros estruturais; cinco candidatas com fontes primárias reais e cinco fixtures monetárias distintas identificadas; somas de 2750/12000 centavos conferidas. Diff restrito aos cinco Markdown; nenhuma regra de backend foi implementada ou declarada testada.
- Não instalar pacotes, executar migrações, configurar banco/serviços, alterar CI ou modificar aplicação para validar documentos. O CI já existente pode validar a regressão da branch; resultado de CI não aprova requisitos nem comprova MVP implementado.
- CI de regressão documental aprovado no commit `7791496fe4d3cf688ba9fe663ff67b0ac0813f18`: [execução 40983062010](https://github.com/dernivaljr/wiki-chem/actions/runs/40983062010). Os checks do PR identificam os resultados de revisões posteriores.
- Na revisão inicial, os oito diagramas carregaram no visualizador do GitHub sem erro de parser: três ER no modelo, dois no documento comercial e um em cada outro documento. A revisão final preserva oito blocos e a checagem no PR deve acompanhar a versão corrente. Não há CLI Mermaid instalada nem dependência adicionada; checagens de estrutura/renderização não são aprovação de P03/P09 nem teste de implementação do MVP.


## Fundação do backend

Base confirmada: merge do PR #3 em c161fd0889e0d5a0bf85075a14857fe153fd5cf5; CI main aprovado em https://github.com/dernivaljr/wiki-chem/actions/runs/40990012819 . PRs #1 e #2 integrados. Branch: feat/backend-foundation.

Escopo: infraestrutura e saúde; sem autenticação, catálogo, comércio ou IA/RAG. As tecnologias da fundação foram explicitamente autorizadas, sem aprovação comercial implícita. Resultados verificados constam abaixo; a revisão final permanece vinculada aos checks correntes do PR. Não registrar segredos nem logs brutos de driver.

## Verificações da fundação

- Instalação limpa: `npm run install:clean`, reproduzida pelos lockfiles dos dois pacotes.
- `npm run build`, `npm run lint` e `npm test`: aprovados localmente; 10 testes frontend e 36 testes unitários/de contrato backend. Build/lint backend repetidos após as correções.
- `npm run audit:deps` e `npm run audit:prod`: zero vulnerabilidades nos dois pacotes.
- Checagem documental somente de leitura: oito documentos, 42 links locais existentes, oito blocos Mermaid, cercas/encoding válidos e remoção de registros operacionais do material acadêmico.
- `npm run test:e2e` no Windows: Chromium não iniciou (`spawn UNKNOWN`); não se atribuiu sucesso aos 13 casos locais. No CI Linux, os mesmos 13 testes passaram.
- Não há MySQL/Docker disponível neste ambiente Windows. As migrações e a integração real são executadas automaticamente pelo serviço MySQL 8.4 do CI, sem solicitar testes manuais ao usuário.

### Diagnóstico e correção durante a validação

Na execução [40992342032](https://github.com/dernivaljr/wiki-chem/actions/runs/40992342032), o frontend passou por todas as etapas; o backend passou por instalação/build/lint/unidade, mas o status de migrações detectou MIGRATION_LOCKED. A origem foi a comparação do retorno GET_LOCK com número: a preservação de BIGINT pode entregá-lo como string. A comparação de aquisição/liberação foi normalizada; o lock não foi removido nem desabilitado. A integração exige execução positiva, repetida, concorrente e com falhas de migração para confirmar a correção.

A verificação HTTP local do binário compilado confirmou liveness 200, banco ausente 503 e query inválida 400. A primeira asserção sobre encerramento supunha semântica POSIX; no Windows, child.kill termina diretamente o processo. A suíte de integração inclui verificação do processo compilado, ambiente inválido e saída limpa por SIGTERM no CI Linux.

O PR [#4](https://github.com/dernivaljr/wiki-chem/pull/4) concentra as revisões e os checks correntes. A aprovação final deve considerar o commit mais recente e os dois jobs completos; esta anotação não declara integração real aprovada antes de sua execução.

### Resultado confirmado da revisão técnica

A revisão `daa9e52662b519fa4b43a07854fa5226a88d80f7` teve os dois jobs concluídos com sucesso na execução [40992696438](https://github.com/dernivaljr/wiki-chem/actions/runs/40992696438). Foram aprovados instalação limpa, build, lint e auditorias, 10 testes frontend, 13 testes Playwright, 36 testes backend de unidade/contrato e **21 testes de integração** (16 MySQL, três do processo compilado e dois do proxy).

O fluxo CLI mostrou PENDING → APPLIED e repetição sem reaplicação. Os negativos de checksum, histórico, lock, DDL incompleto, múltiplos statements, credenciais, banco ausente e pool encerrado passaram. BIGINT, FKs, unicidade, commit/rollback e escrita concorrente foram verificados no MySQL 8.4 real. O processo compilado respondeu via HTTP e encerrou com código zero por SIGTERM no Linux.

Este registro comprova a fundação e a preservação das regressões existentes; não aprova propostas comerciais nem comprova autenticação, pesquisa, catálogo ou compra. A verificação da última revisão documental e da main após integração permanece nos checks do PR.

## Etapa 04 — identidade e perfil (registro interno)

Base main 696de73506d77643356afaa987dec1ac9a90c35f e CI 40993151669 confirmados antes da branch feat/auth-profile. Implementação autorizada: cadastro/login/sessão/logout/perfil e bootstrap inicial; sem catálogo, comércio ou IA/RAG.

Decisões acadêmicas de identidade estão em ../arquitetura/IDENTIDADE.md. Os registros de execução ficam neste documento, fora do material acadêmico. Instalação limpa, build/lint e testes de unidade/contrato foram executados localmente; a integração real e as jornadas de navegador serão confirmadas pelo serviço isolado MySQL 8.4 no CI. O ambiente Windows não possui MySQL/Docker e o Chromium local já apresentou spawn UNKNOWN; não se atribui sucesso local a testes não executados.

Comandos: npm run install:clean; npm run build; npm run lint; npm test; npm run audit:deps; npm run audit:prod. Automação adicional: npm run db:status; npm run db:migrate (repetido); npm run test:integration; npm run db:migrate; npm run test:e2e; npm run test:auth. Não registrar credenciais de usuário, cookies, tokens, arquivos .env nem logs brutos do driver.

### Verificação integrada de identidade

Execução [41039975425](https://github.com/dernivaljr/wiki-chem/actions/runs/41039975425) aprovada em ambos os jobs no commit 8ec1c0100a6b01b8cb79e6e286e4ca6852e3702b: 48 testes backend, 26 frontend, 43 integração (22 identidade, 16 infraestrutura MySQL, três processo e dois proxy), 13 regressões visuais e sete jornadas reais de autenticação no navegador. Instalação limpa, builds, lint, migrações iniciais/repetidas e auditorias aprovados; zero vulnerabilidades nas auditorias completas/produção.

A revisão final acrescenta isolamento do formulário ao trocar usuário e testes de recusa do CLI administrativo em execução não interativa. A checagem documental verificou oito documentos, 44 links locais e oito Mermaid preservados. Os checks da revisão corrente do PR #5 devem estar aprovados antes do merge, seguido da verificação da main. Esses registros não integram o material acadêmico.
