# Pesquisa autenticada de metodologias

## Objetivo e alcance funcional

A pesquisa permite recuperar prévias técnicas e fichas informativas do catálogo MySQL sem depender de produtos, preços ou direitos de compra. A interface React em `/consultas` combina texto em múltiplas palavras, sete classificações analíticas compactas, ordenação e paginação. A página `/metodologias/:id` apresenta a prévia gratuita, limitações documentadas, fontes permitidas e autoria/curadoria. Ambas exigem sessão válida; a autorização é verificada novamente na API.

RF04–RF06 são implementados no recorte de recuperação editorial. RF07 inclui preço/disponibilidade quando há oferta cadastrada para conteúdo próprio elegível, conforme [Ofertas e carrinho](OFERTAS-CARRINHO.md), além dos metadados gratuitos. Para fichas técnicas informativas baseadas em fonte pública externa (`sourceType: 'REFERENCE'` e `offer: null`), a interface informa explicitamente que não há comercialização de conteúdos de terceiros; para demais registros sem oferta elegível, exibe “Oferta comercial ainda não disponível.”. Não há seed de produção nem IA/RAG.

## Contrato e regras de seleção

`GET /api/v1/methodologies` aceita `q`, `techniqueIds`, `technologyIds`, `equipmentIds`, `matrixIds`, `analyteIds`, `standardIds`, `segmentIds`, `page`, `pageSize` e `sort`. IDs são strings decimais; cada valor de um filtro ocupa uma ocorrência do parâmetro. Exemplo estrutural: `?q=ferro&techniqueIds=1&technologyIds=2&page=1&pageSize=20&sort=title_asc`. Os IDs devem existir e estar ativos no banco.

- OR entre valores de uma mesma categoria; AND entre categorias distintas e entre as palavras do texto.
- Cada palavra (ou uma de suas equivalências controladas de domínio) deve ocorrer em algum campo gratuito da mesma versão corrente: título, resumo, descrição pública, rótulo/código técnico de termo ativo (`t.active = TRUE`), identificação normativa (`issuer`, `identifier`, `edition_label`), referência bibliográfica, crédito, edição ou localizador permitido. URL da fonte e contribuições não são campos de busca textual.
- Texto de até 200 caracteres e 12 palavras, normalizado em NFC e com espaços consolidados. Comparação case/acento-insensível pela colação `utf8mb4_0900_ai_ci`. `%`, `_` e `!` são tratados literalmente com `ESCAPE '!'`.
- **Aliases químicos e siglas controladas sem perda de precisão:**
  - Símbolos químicos curtos (`Fe`, `Cu`, `Pb`, `Zn`, `Hg`, `Mn`, `Cr`) colidiriam por substring com palavras comuns em português (como `"referência"`, `"efluentes"`, `"interferências"`, `"curadoria"`). Por isso, não executam `LIKE '%fe%'` aberto em prosa: combinam os nomes/espécies canônicos (`ferro`, `Fe²⁺`, `Fe(II)`, `Fe(III)` etc.) com verificação de símbolo isolado delimitado por fronteira não alfanumérica sensível à caixa (`REGEXP_LIKE` sob `utf8mb4_0900_as_ci`). Palavras ambíguas do idioma (`"as"`) e letras isoladas (`"p"`, `"f"`, `"n"`) não são expandidas.
  - Siglas e grafias equivalentes de química analítica (`UV-Vis`/`UV/Vis`, `GC-MS`/`GC/MS`, `ICP-OES`/`ICP-AES`, `ICP-MS`/`ICP/MS`, `fenantrolina`/`phenanthroline`, `Cl-`/`cloreto`, `F-`/`fluoreto`, `NO3-`/`nitrato`, `NO2-`/`nitrito`, `SO4`/`sulfato`, `PO4`/`fosfato`, `NH3-N`/`amoniacal`, `Cr(VI)`, `VOC`/`COV`, `PAH`/`HPA`, `DQO`/`COD`) são resolvidas de modo determinístico e parametrizado.
- Até 20 IDs distintos por categoria. CSV, IDs malformados, desconhecidos/inativos, parâmetros desconhecidos, duplicação de campos escalares e ordenações não previstas são rejeitados com 400.
- `page` vai de 1 a 1000000; `pageSize` padrão 20, máximo 100. Página além do total retorna lista vazia com `total` preservado e ação rápida para retornar à primeira página.
- `title_asc` é o padrão; `updated_desc` ordena pela publicação da versão corrente. Ambos desempatam por ID crescente da metodologia. Não há ordenação por preço.

A elegibilidade exige metodologia não excluída e publicada, ponteiro para versão própria corrente, versão `PUBLISHED`/`ALLOWED` não excluída e fontes com condições aprovadas. `GET /methodologies/:id` aplica a mesma regra e retorna 404 para conteúdo indisponível. `GET /taxonomies` retorna apenas termos ativos das sete coleções.

## Arquitetura da consulta e proteção

```mermaid
flowchart LR
  U["Sessão e URL de consulta"] --> V["Zod: texto, IDs, página e ordenação"]
  V --> A["Normalização e aliases controlados"]
  A --> S["Snapshot REPEATABLE READ MySQL"]
  S --> E["Versão publicada corrente e autorizada"]
  E --> F["EXISTS parametrizado: texto + 7 facetas"]
  F --> P["Total e página com ordem estável"]
  P --> D["DTO gratuito por allowlist"]
  D --> R["Cartões de resultado e detalhe React"]
```

O módulo de catálogo reutiliza a mesma montagem de DTO gratuito para listagem e detalhe. Não consulta `methodology_contents`, evidências privadas, condições internas ou notas de revisão para compor a pesquisa. Os filtros e a busca textual em taxonomias/fontes usam `EXISTS` (uma subconsulta por faceta/fonte para cada termo de busca), impedindo multiplicação de linhas quando há múltiplos analitos, matrizes ou referências associadas.

SQL parametrizado trata texto, padrões `LIKE`/`REGEXP_LIKE`, IDs e paginação exclusivamente como parâmetros; somente nomes de tabela/coluna e ordenação de allowlists entram na estrutura SQL. Total, página e metadados são lidos em transação `REPEATABLE READ` somente leitura. As sete coleções de metadados, referências e contribuições são carregadas em lote por página, sem N+1. Não foi necessária migração adicional de esquema.

Referências de implementação: [MySQL 8.4 — conversão de caracteres](https://dev.mysql.com/doc/refman/8.4/en/cast-functions.html), [expressões regulares](https://dev.mysql.com/doc/refman/8.4/en/regexp.html) e [isolamento InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html).

## Experiência de consulta, filtros compactos e transparência de fontes

- **Sete filtros compactos:** organizados em grade responsiva (4 colunas em desktop, 2 em tablet e 1 até 480 px) com rolagem interna enxuta e zero transbordamento horizontal em 320 px. Na faceta `Normas`, os rótulos permanecem concisos (`EPA 200.7`, `EPA 300.0`, `EPA 8260D`, `USGS TEI-223`) enquanto emissor, identificador oficial e edição ficam acessíveis sob demanda em `<details>` (`Edição`) sem poluir os checkboxes.
- **Cartões de resultado e detalhe:** exibem título clicável, versão, selo explícito de natureza documental (`Ficha técnica informativa · Fonte pública externa` com emissor/edição versus `Demonstração comercial sintética · Fixture de software`), resumo original em português, grade de metadados técnicos e identificação bibliográfica com link externo seguro (`rel="noopener noreferrer"`).
- **Estados vazios orientativos:** preservam os critérios na URL, sugerem exemplos de analitos/símbolos/normas e oferecem botões diretos para limpar apenas o termo textual, limpar apenas os filtros ou redefinir toda a consulta.

## Verificação e limites de conteúdo

Os testes verificam cada filtro, combinações OR/AND, múltiplos analitos/matrizes, aliases químicos (`ferro`/`Fe`, `phenanthroline`, `UV-Vis`, `GC-MS`, `ICP-OES`) e ausência de falso positivo em palavras com substring `fe`/`cu`, além de caixa/acentos/NFC, curingas literais, paginação/desempate, bloqueio de rascunhos/suspensas/arquivadas/excluídas e confidencialidade de campos privados.

No ambiente demonstrativo isolado (`NODE_ENV=test`, `DEMO_ALLOW=true`, `wikichem_test_*`), o catálogo concilia cinco fixtures comerciais sintéticas (`DEMO 01`–`DEMO 05`) e 15 fichas técnicas informativas com referências oficiais públicas verificadas (USGS TEI-223, EPA 180.1, 200.7, 200.8, 245.1, 300.0, 350.1, 353.2, 365.1, 410.4, 7000B, 7196A, 8260D, 9040C e 9253), todas com textos descritivos próprios em português, limitações explícitas, sem reprodução de procedimentos integrais e sem oferta comercial (`offer: null`). Não há seed de produção nem revisão científica humana presumida.

### Resultados observados na suíte completa

A validação consolidada aprovou **410 testes automatizados**:

| Categoria | Testes aprovados | Evidência funcional |
| --- | ---: | --- |
| Unidade e contrato do backend | 104 | Validação, aliases da pesquisa, regras editoriais e integridade das 15 fichas técnicas e 7 taxonomias |
| Componentes, rotas e estado React | 100 | Sete filtros compactos, detalhes normativos sob demanda, cartões informativos, estados vazios, URL e sessão |
| Integração com MySQL 8.4 e processos reais | 163 | Pesquisa analítica real (`ferro` + UV-Vis, `Fe` sem falso positivo, EPA 200.7/300.0/8260D), reconciliação idempotente e benchmark |
| Regressões de navegador e ativos | 15 | Responsividade de 320 a 1280 px, foco visível, contraste ≥ 4,5:1 e inspeção do bundle público |
| Jornadas com API e MySQL reais | 28 | Identidade, catálogo técnico + 7 filtros analíticos, carrinho, checkout simulado, biblioteca e administração |

## Integração com aquisição demonstrativa

Fichas técnicas informativas de referência pública nunca recebem produto ou preço (`purchasable: false`, `offer: null`). As cinco fixtures sintéticas próprias (`DEMO 01`–`DEMO 05`) preservam integralmente o fluxo de ofertas BRL, carrinho, [Checkout demonstrativo](CHECKOUT-DEMONSTRATIVO.md) e [Biblioteca digital](BIBLIOTECA-DIGITAL.md).
