# Requisitos, critérios e rastreabilidade

Os RF01–RF17 e RNFs completos são definidos na [especificação](../especificacoes/MVP-WIKI-CHEM-v1.md). A tabela identifica testes executáveis e evidência visual complementar. Capturas comprovam apresentação de estados; não substituem as verificações de autorização e integridade no backend.

| Requisito | Critério verificável | Testes executáveis | Evidência visual |
| --- | --- | --- | --- |
| RF01 Cadastro | Cria CUSTOMER, rejeita duplicidade e promoção de papel | [Identidade MySQL](../../backend/tests/integration/identity.test.ts), [percurso acadêmico](../../frontend/e2e/zz-academic.spec.ts) | 02–03 |
| RF02 Sessão/login/logout | Autentica, expira, revoga e protege credenciais | [Identidade MySQL](../../backend/tests/integration/identity.test.ts), [navegador](../../frontend/e2e/auth.spec.ts) | 03 |
| RF03 Perfil/propriedade | Edita apenas nome próprio e isola dados | [Interface de identidade](../../frontend/src/auth/identity.test.tsx), [MySQL](../../backend/tests/integration/identity.test.ts) | Evidência automatizada sem dados pessoais |
| RF04 Pesquisa autenticada | Sem sessão não acessa consultas | [Pesquisa MySQL](../../backend/tests/integration/catalog.test.ts), [navegador](../../frontend/e2e/search.spec.ts) | 04 |
| RF05 Sete filtros | Multisseleção OR/AND na mesma versão | [Pesquisa MySQL](../../backend/tests/integration/catalog.test.ts), [percurso acadêmico](../../frontend/e2e/zz-academic.spec.ts) | 05, 18 |
| RF06 Texto/listagem | Acentos, termos curtos, literais, paginação e ordem estável | [Regras de pesquisa](../../backend/tests/unit/catalog-search.test.ts), [pesquisa MySQL](../../backend/tests/integration/catalog.test.ts) | 04–05, 17 |
| RF07 Prévia | Metadados/referências/preço sem procedimento | [Catálogo MySQL](../../backend/tests/integration/catalog.test.ts), [ofertas](../../frontend/e2e/commerce.spec.ts) | 06 |
| RF08 Catálogo/versionamento | Rascunho não exposto; publicação imutável | [Catálogo MySQL](../../backend/tests/integration/catalog.test.ts), [admin navegador](../../frontend/e2e/admin.spec.ts) | 13–15 |
| RF09 Oferta | Produto individual, BRL inteiro e histórico de preços | [Comércio MySQL](../../backend/tests/integration/commerce.test.ts) | 06–07 |
| RF10 Carrinho | Persistência, unicidade, revisão e total do servidor | [Comércio MySQL](../../backend/tests/integration/commerce.test.ts), [navegador](../../frontend/e2e/commerce.spec.ts) | 07 |
| RF11 Demonstração | Duas transações e confirmação explícita sem cobrança | [Checkout MySQL](../../backend/tests/integration/checkout.test.ts), [checkout navegador](../../frontend/e2e/checkout.spec.ts) | 08–09 |
| RF12 Repetição/concorrência | Idempotência, rollback e prevenção de recompra | [Checkout MySQL](../../backend/tests/integration/checkout.test.ts), [navegador](../../frontend/e2e/checkout.spec.ts) | Evidência automatizada de concorrência |
| RF13 Pedidos | Histórico próprio e snapshots imutáveis | [Checkout MySQL](../../backend/tests/integration/checkout.test.ts) | 10 |
| RF14 Biblioteca | Original/atualizações próprias; nega versão alheia/rascunho/suspensa | [Biblioteca MySQL](../../backend/tests/integration/library.test.ts), [navegador](../../frontend/e2e/library.spec.ts) | 11–12, 15–16 |
| RF15 Administração | ADMIN/CSRF, revisão concorrente, justificativa e auditoria | [Catálogo](../../backend/tests/integration/catalog.test.ts), [biblioteca](../../backend/tests/integration/library.test.ts), [admin navegador](../../frontend/e2e/admin.spec.ts) | 13–14, 18 |
| RF16 UX/erros | Responsividade, teclado, vazio, erro e navegação recuperável | [Estabilização visual](../../frontend/e2e/estabilizacao.spec.ts), [navegação](../../frontend/e2e/navigation.spec.ts), [leitor React](../../frontend/src/library/library.test.tsx) | 16–17 |
| RF17 Fontes | Origem rastreada; pendência bloqueia publicação/leitura | [Catálogo](../../backend/tests/integration/catalog.test.ts), [biblioteca](../../backend/tests/integration/library.test.ts), [fixtures acadêmicas](../../backend/tests/unit/demo.test.ts) | 06, 13–14 |

| Qualidade | Verificação e limite |
| --- | --- |
| Segurança e confidencialidade | Sessão/CSRF, proprietário, papel, SQL parametrizado, hashes e ausência de procedimento em prévias/erros/ativos; testes de identidade, biblioteca e [ativos](../../frontend/e2e/protected-assets.spec.ts) |
| Integridade/persistência | FKs, unicidade, snapshots, migração repetida e rollback com MySQL real; confirmação e biblioteca não dependem de memória do frontend |
| Desempenho | [Medição](../../backend/tests/demo/performance.ts) com volume sintético e tempos observados; sem SLA de produção, teste concorrente de carga ou extrapolação para corpus científico |
| Reprodutibilidade | [Preparação isolada](../../backend/tests/integration/demo.test.ts), sistema completo e restauração verificados em ambiente descartável |
| Acessibilidade | Labels, teclado, foco e contraste nos cenários automatizados; não equivale a auditoria integral WCAG ou avaliação com todas as tecnologias assistivas |

Cobertura de código percentual não é apresentada como métrica de atendimento. Os testes e as limitações estão associados aos critérios; curadoria de fontes reais e requisitos de implantação permanecem pendentes.
