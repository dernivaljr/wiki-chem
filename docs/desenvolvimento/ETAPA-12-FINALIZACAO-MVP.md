# Etapa 12 — Finalização do MVP e experiência de e-commerce

Registro técnico interno de engenharia das alterações implementadas para consolidar a experiência de pesquisa, apresentação de produto e aquisição de metodologias analíticas no Wiki-Chem.

## 1. Cabeçalho, perfil em menu suspenso e contador dinâmico do carrinho

- **Navegação principal enxuta (`frontend/src/components/Header/`):** mantém `Home`, `Sobre`, `Consultas`, o controle suspenso `Perfil` e o botão `Carrinho` com ícone e contador dinâmico (`0`, `1`, `2`...).
- **Menu suspenso `Perfil`:** reúne `Minha biblioteca` (`/biblioteca`), `Pedidos` (`/pedidos`), `Administração` (`/admin`, exibido exclusivamente para `role === 'ADMIN'`), `Dados pessoais` (`/perfil`) e `Sair`. Suporta fechamento por tecla `Escape` (devolvendo foco ao botão `Perfil`), clique externo e mudança de rota, preservando responsividade de `320 px` a `1280 px`.
- ** Estado sincronizado do carrinho (`frontend/src/commerce/CartContext.tsx`):** `CartSummaryProvider` consulta `GET /api/v1/cart` para sessões autenticadas e expõe `syncCart`/`refreshCart`, atualizando imediatamente o contador do cabeçalho ao adicionar item na pesquisa/detalhe, remover item no carrinho ou concluir pedido no checkout.

## 2. Pesquisa simplificada sob demanda

- **Apresentação inicial limpa (`frontend/src/pages/Consultas/Consultas.tsx`):** exibe inicialmente apenas o campo `Termo de consulta`, o botão `Pesquisar` e o controle `Filtros avançados` (`aria-expanded="false"`).
- **Sete filtros recolhidos por padrão:** abrem sob demanda preservando multisseleção nas sete taxonomias, ordenação, itens por página, detalhes normativos sob demanda (`Edição`), `Aplicar filtros` e `Limpar pesquisa e filtros`. Se a URL restaurada já contiver filtros ativos, o painel abre automaticamente.
- **Termo obrigatório na interface:** pesquisas sem termo textual (`q.trim().length === 0`), inclusive quando há filtros selecionados, não disparam `GET /api/v1/methodologies` nem listam o catálogo, exibindo orientação amigável e sugestões rápidas (`ferro`, `EPA 200.7`, `EPA 300.0`, `EPA 8260D`, `GC-MS`, `Cr(VI)`).
- **Cartões de resultado compactos (`CompactResultCard` em `frontend/src/catalog/PreviewContent.tsx`):** exibem código documental (`WK-ANL-001`..`WK-ANL-015`), versão, preço em BRL, título, resumo limitado a até três frases, técnica principal, analito/matriz, referência normativa e ações de detalhes/aquisição.

## 3. Catálogo comercial consistente e reconciliação idempotente

- **15 produtos digitais originais do Wiki-Chem (`backend/tests/demo/technical-catalog.ts`):** as 15 fichas analíticas fundamentadas em fontes públicas oficiais da U.S. EPA e do USGS passaram a constituir guias técnicos interpretativos autorais em português (`WK-ANL-001` a `WK-ANL-015`), cada qual com prévia gratuita concisa e conteúdo técnico integral substancial protegido por aquisição (cinco seções numeradas cobrindo escopo físico-químico, interferências e mitigação, estrutura operacional comentada, calibração/equações e controle de qualidade analítica com referências rastreáveis).
- **Transparência documental e bloqueio de ofertas vazias:** nenhum procedimento integral de norma externa é reproduzido ou comercializado como documento licenciado; `validateCommercialProductContent` recusa publicação comercial de conteúdo curto, genérico ou composto apenas por avisos. Quando uma ficha tem preço configurado como `null` em `WIKICHEM_DEMO_PRICES`, permanece publicada apenas como referência informativa com pendência explícita (`Referência catalogada — produto autoral pendente`), sem simular venda.
- **Preços em BRL configuráveis:** padrões acadêmicos de `R$ 29,00` a `R$ 68,00`, sobrescritíveis por `WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS` ou `WIKICHEM_DEMO_PRICES`.
- **Arquivamento não destrutivo dos sintéticos legados (`backend/tests/demo/seed.ts`):** os cinco exemplos sintéticos (`academic-demo-1`..`5`, `DEMO 01`..`05`) são conciliados em `lifecycle = 'RETIRED'` e `products.active = FALSE`, saindo da vitrine e da pesquisa sem apagar registros nem afetar pedidos, snapshots ou direitos históricos.

## 4. Página de produto inspirada na ASTM, checkout discreto e leitor estruturado

- **Detalhe da metodologia (`MethodologyDetail.tsx`, `PreviewContent.tsx`, `OfferSection.tsx`):** layout em duas colunas no desktop (empilhado no mobile) com código `WK-ANL-*`, base documental, versão, resumo/escopo de um parágrafo breve, quadro explicativo do conteúdo entregue na biblioteca, classificações técnicas essenciais, referências rastreáveis e caixa lateral fixa com preço BRL e ação de compra/acesso à biblioteca.
- **Linguagem limpa e checkout transparente (`DemoBanner.tsx`, `CartCheckout.tsx`, `OrderPage.tsx`):** removidos rótulos artificiais (`DEMO`, `TESTE`, `fixture`, `simulação de software`) do catálogo, pesquisa, carrinho, pedidos e biblioteca; no checkout, `CheckoutNotice` informa de modo discreto e inequívoco que a transação é isenta de cobrança financeira, exigindo confirmação explícita antes de liberar a biblioteca.
- **Leitor técnico estruturado (`LibraryReader.tsx`):** renderiza títulos de seção, parágrafos e listas técnicas em React puro (sem `dangerouslySetInnerHTML`), preservando confidencialidade, controle de acesso por titularidade, histórico de versões e revalidação de sessão.
