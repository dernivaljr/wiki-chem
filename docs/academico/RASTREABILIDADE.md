# Requisitos, critérios e rastreabilidade

Os RF01–RF17 e RNFs completos são definidos na [especificação](../especificacoes/MVP-WIKI-CHEM-v1.md). A tabela relaciona cada requisito aos testes automatizados executáveis e às capturas reais correspondentes. As capturas ilustram estados da interface e complementam — sem substituir — as validações de autorização e integridade no backend.

| Requisito | Critério verificável | Testes executáveis | Evidência visual |
| --- | --- | --- | --- |
| RF01 Cadastro | Cria `CUSTOMER`, rejeita duplicidade e promoção de papel | [Identidade MySQL](../../backend/tests/integration/identity.test.ts), [percurso acadêmico](../../frontend/e2e/zz-academic.spec.ts) | 02–03 |
| RF02 Sessão/login/logout | Autentica, expira, revoga pelo menu `Perfil` e protege credenciais | [Identidade MySQL](../../backend/tests/integration/identity.test.ts), [navegador](../../frontend/e2e/auth.spec.ts) | 03 |
| RF03 Perfil/propriedade | Menu `Perfil` (`Dados pessoais`), edita apenas nome próprio e isola dados | [Interface de identidade](../../frontend/src/auth/identity.test.tsx), [MySQL](../../backend/tests/integration/identity.test.ts) | Evidência automatizada mascarada |
| RF04 Pesquisa autenticada | Sem sessão não acessa consultas; exige termo não vazio na busca inicial | [Pesquisa React](../../frontend/src/pages/Consultas/Consultas.test.tsx), [navegador](../../frontend/e2e/search.spec.ts) | 04, 17 |
| RF05 Sete filtros | Filtros recolhidos por padrão, multisseleção OR/AND sob demanda | [Pesquisa MySQL](../../backend/tests/integration/catalog.test.ts), [percurso acadêmico](../../frontend/e2e/zz-academic.spec.ts) | 05, 18 |
| RF06 Texto/listagem | Aliases químicos sem falso positivo, acentos, paginação e cartões compactos | [Regras de pesquisa](../../backend/tests/unit/catalog-search.test.ts), [pesquisa MySQL](../../backend/tests/integration/catalog.test.ts) | 04–05, 17 |
| RF07 Página de produto | Layout estilo ASTM com código, escopo curto, referências e preço sem expor conteúdo integral | [Catálogo MySQL](../../backend/tests/integration/catalog.test.ts), [ofertas](../../frontend/e2e/commerce.spec.ts) | 06 |
| RF08 Catálogo/versionamento | Rascunho não exposto; publicação imutável; arquivamento retira da vitrine | [Catálogo MySQL](../../backend/tests/integration/catalog.test.ts), [admin navegador](../../frontend/e2e/admin.spec.ts) | 13–15 |
| RF09 Oferta | Produto digital original, preço BRL inteiro configurável e histórico imutável | [Comércio MySQL](../../backend/tests/integration/commerce.test.ts), [catálogo demonstrativo](../../backend/tests/unit/demo.test.ts) | 06–07 |
| RF10 Carrinho | Contador dinâmico no cabeçalho, persistência, unicidade, revisão e total do servidor | [Comércio React](../../frontend/src/commerce/commerce.test.tsx), [navegador](../../frontend/e2e/commerce.spec.ts) | 07 |
| RF11 Aquisição e simulação de pagamento | Duas transações, seleção obrigatória (`PIX`/`Cartão`/`Boleto`), aviso discreto sem cobrança e aceite obrigatório | [Checkout MySQL](../../backend/tests/integration/checkout.test.ts), [checkout navegador](../../frontend/e2e/checkout.spec.ts) | 08–09 |
| RF12 Repetição/concorrência | Idempotência com preservação de modalidade, compras consecutivas na mesma sessão, rollback atômico e bloqueio de recompra | [Checkout MySQL](../../backend/tests/integration/checkout.test.ts), [navegador](../../frontend/e2e/checkout.spec.ts) | Evidência automatizada de concorrência |
| RF13 Pedidos | Histórico próprio em `Perfil → Pedidos` com modalidade persistida, snapshots imutáveis e link direto à biblioteca | [Checkout MySQL](../../backend/tests/integration/checkout.test.ts), [checkout React](../../frontend/src/checkout/checkout.test.tsx) | 10 |
| RF14 Biblioteca | Conteúdo autoral estruturado liberado apenas ao titular; versões elegíveis | [Biblioteca MySQL](../../backend/tests/integration/library.test.ts), [navegador](../../frontend/e2e/library.spec.ts) | 11–12, 15–16 |
| RF15 Administração | `Perfil → Administração` exclusivo de `ADMIN`, CSRF, revisão concorrente e auditoria | [Catálogo](../../backend/tests/integration/catalog.test.ts), [biblioteca](../../backend/tests/integration/library.test.ts), [admin navegador](../../frontend/e2e/admin.spec.ts) | 13–14, 18 |
| RF16 UX/acessibilidade | Responsividade 320–1280 px, teclado (`Escape`/foco), contraste ≥ 4,5:1 e recuperação de erro | [Estabilização visual](../../frontend/e2e/estabilizacao.spec.ts), [navegação](../../frontend/e2e/navigation.spec.ts), [leitor React](../../frontend/src/library/library.test.tsx) | 16–17 |
| RF17 Fontes e autoria | Referência pública rastreada separada do produto autoral Wiki-Chem; bloqueio de oferta vazia | [Catálogo](../../backend/tests/integration/catalog.test.ts), [validação de produtos](../../backend/tests/unit/demo.test.ts) | 06, 12–14 |

| Atributo de qualidade | Verificação e delimitação |
| --- | --- |
| Segurança e confidencialidade | Sessão/CSRF, proprietário, papel, SQL parametrizado, hashes e ausência do guia integral em prévias, erros e bundle público ([ativos](../../frontend/e2e/protected-assets.spec.ts)) |
| Integridade e persistência | FKs compostas, unicidade, triggers de imutabilidade, migração repetida e reconciliação não destrutiva em MySQL real |
| Desempenho | [Medição](../../backend/tests/demo/performance.ts) com 20, 100 e 500 metodologias publicadas; não representa SLA de produção ou carga concorrente |
| Reprodutibilidade | [Reconciliação isolada](../../backend/tests/integration/demo.test.ts), Compose completo e ciclo de backup/restauração verificados automaticamente |
| Acessibilidade | Rótulos, teclado, foco visível e contraste verificados nos cenários automatizados; não equivale a certificação integral WCAG |

Cobertura percentual de linhas não é adotada isoladamente como critério de aceite. Embora os 15 produtos digitais autorais sejam fundamentados em fontes públicas oficiais verificáveis da U.S. EPA e do USGS, a revisão científica humana por pares, o licenciamento de normas de terceiros e a operação comercial com meios de pagamento reais permanecem fora do escopo do MVP.
