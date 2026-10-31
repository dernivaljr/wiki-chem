# Registro interno — Etapa 11 (Catálogo técnico e otimização da pesquisa)

Base `main` em `6df94e1`; branch isolada `feat/catalogo-tecnico-pesquisa`, PR #12. Nenhum relatório DOCX foi gerado.

## Escopo implementado

1. **Catálogo técnico informativo verificável (`backend/tests/demo/technical-catalog.ts`):**
   - Mantidos os 5 exemplos sintéticos originais (`academic-demo-1`..`5`, `DEMO 01`..`05`) para os percursos de oferta BRL, carrinho, checkout simulado e biblioteca digital, usando justificativa explícita de não aplicabilidade nas sete facetas para não poluir filtros analíticos.
   - Adicionadas **15 fichas técnicas informativas** em português com textos descritivos originais, limitações/interferências documentadas, sete classificações analíticas reais e referências públicas oficiais verificadas por HTTP 200 e inspeção primária:
     - **USGS TEI-223 (1952)** — Determinação espectrofotométrica de ferro total com 1,10-fenantrolina (UV-Vis)
     - **EPA 180.1 (ago./1993)** — Turbidez por nefelometria óptica
     - **EPA 200.7 (Rev. 4.4, 1994)** — Metais e elementos-traço em águas e resíduos por ICP-OES
     - **EPA 200.8 (Rev. 5.4, 1994)** — Elementos-traço em águas e resíduos por ICP-MS
     - **EPA 245.1 (Rev. 3.0, 1994)** — Mercúrio em água por CVAAS (vapor frio)
     - **EPA 300.0 (Rev. 2.1, ago./1993)** — Ânions inorgânicos em água por cromatografia de íons
     - **EPA 350.1 (Rev. 2.0, ago./1993)** — Nitrogênio amoniacal por colorimetria semiautomatizada
     - **EPA 353.2 (Rev. 2.0, ago./1993)** — Nitrato e nitrito por colorimetria automatizada com redução em cádmio
     - **EPA 365.1 (Rev. 2.0, ago./1993)** — Fósforo e ortofosfato por colorimetria semiautomatizada
     - **EPA 410.4 (Rev. 2.0, ago./1993)** — Demanda química de oxigênio (DQO) por colorimetria semiautomatizada
     - **EPA 7000B (Rev. 2, fev./2007)** — Metais em solução e digeridos ácidos por absorção atômica em chama (FAAS)
     - **EPA 7196A (SW-846, jul./1992)** — Cromo hexavalente Cr(VI) por colorimetria com difenilcarbazida
     - **EPA 8260D (Rev. 4, jun./2018)** — Compostos orgânicos voláteis (COVs) por GC-MS
     - **EPA 9040C (Rev. 3, nov./2004)** — pH eletrométrico em águas e resíduos aquosos
     - **EPA 9253 (Rev. 0, set./1994)** — Cloreto por titrimetria argentométrica
   - Nenhuma ficha informativa copia procedimentos integrais nem cria registro em `products` (`offer: null`, `purchasable: false`). Nenhuma revisão científica humana ou licença comercial externa é inventada.
2. **Taxonomias reais e pesquisa otimizada (`backend/src/modules/catalog/catalog.search.ts`, `Consultas.tsx`, `PreviewContent.tsx`, `OfferSection.tsx`):**
   - Sete taxonomias ativas atualizadas para 73 termos reais de química analítica; filtros organizados em grade compacta de 4 colunas em desktop (2 até 920 px, 1 até 480 px), com rótulos concisos e `<details>` (`Edição`) para detalhes normativos em `Normas`.
   - Expansão controlada de aliases e símbolos (`ferro`/`Fe`, `Cu`, `Pb`, `Zn`, `Hg`, `Mn`, `Cr`, `phenanthroline`, `UV-Vis`, `GC-MS`, `ICP-OES`, `ICP-MS`, íons e siglas) usando fronteira não alfanumérica sensível à caixa (`REGEXP_LIKE` com `utf8mb4_0900_as_ci`) para símbolos curtos, evitando falsos positivos em palavras como `"referência"`, `"efluentes"` e `"curadoria"`, e filtrando apenas taxonomias ativas (`t.active = TRUE`).
   - Cartões de resultado aprimorados com selo de natureza documental, atribuição da fonte pública e aviso explícito de ausência de oferta comercial para referências externas; estados vazios com atalhos de recuperação.
3. **Reconciliação idempotente e não destrutiva (`backend/tests/demo/seed.ts`):**
   - Restrita a `NODE_ENV=test`, `MYSQL_TEST_ALLOW=true`, `DEMO_ALLOW=true` e `DB_NAME=wikichem_test_*`; nenhuma seed de produção foi criada.
   - Reconciliado localmente o ambiente `wikichem-academic-demo` em execução por `npm run demo:up` (repetido duas vezes) sem reset, sem remoção de volumes e preservando integralmente o usuário administrativo original (`id=1`, `created_at=2026-10-30T23:42:43.425Z`), desativando termos legados `academic-demo-*` e disponibilizando os 20 registros publicados (`5` comerciais sintéticos + `15` informativos).
4. **Manutenção de segurança de dependências:**
   - Adicionado `overrides.minimatch = "^11.0.3"` em `frontend/package.json` e `backend/package.json` para mitigar o aviso recém-publicado `GHSA-g3hv-75wg-m249` (`minimatch < 11.0.1`) sem usar `npm audit fix --force`, mantendo `npm run audit:deps` e `npm run audit:prod` com zero vulnerabilidades.

## Resultados verificados

- **Contagem automatizada:** `104` testes backend (unidade/contrato) + `100` testes React + `163` testes de integração MySQL 8.4 + `15` testes de navegador/ativos (`test:e2e`) + `28` jornadas integradas no navegador (`test:auth`) = **410 testes aprovados**, além da verificação completa `demo:prepare` + `demo:up` + `demo:verify` no job `demonstracao`.
- **Pesquisa validada em MySQL real e Compose:** `"ferro"` combinado com `Espectrofotometria de absorção molecular` e `UV-Vis (complexação molecular)` retorna exatamente `Determinação espectrofotométrica de ferro total com 1,10-fenantrolina (UV-Vis)` (`purchasable: false`, `offer: null`); `"Fe"` retorna apenas as 3 fichas de ferro (USGS TEI-223, EPA 200.7 e EPA 7000B), sem falsos positivos.
