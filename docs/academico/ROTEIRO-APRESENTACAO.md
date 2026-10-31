# Roteiro funcional para apresentação

Este roteiro descreve o percurso funcional completo exercitado automaticamente pela suíte integrada, sem exigir testes manuais do avaliador.

## Percurso do cliente

1. Apresentar a proposta do Wiki-Chem: catálogo digital de química analítica com **15 produtos digitais interpretativos originais** (`WK-ANL-001` a `WK-ANL-015`), fundamentados em métodos públicos oficiais da U.S. EPA e do USGS, oferecendo prévia gratuita concisa e conteúdo técnico autoral completo mediante aquisição isenta de cobrança financeira, sem reproduzir normas de terceiros como documentos licenciados.
2. Exibir a página inicial (`Home`), o cadastro e o login reais, destacando no cabeçalho autenticado a navegação enxuta (`Home`, `Sobre`, `Consultas`, menu suspenso `Perfil` e botão `Carrinho` com contador dinâmico inicialmente em `0`).
3. Acessar `Consultas` e observar a apresentação inicial limpa: apenas o campo `Termo de consulta`, o botão `Pesquisar` e o controle `Filtros avançados` recolhido, com orientação amigável e sem listagem automática do catálogo enquanto não houver termo pesquisado.
4. Expandir `Filtros avançados` para demonstrar os sete eixos analíticos (`Técnicas`, `Tecnologias`, `Equipamentos`, `Matrizes`, `Analitos`, `Normas` com detalhes de edição sob demanda e `Segmentos`) e verificar que aplicar filtros sem termo textual mantém a exigência de termo não vazio.
5. Pesquisar `"ferro"` (ou `"Fe"`) combinado aos filtros de espectrofotometria/UV-Vis para localizar o cartão compacto `Determinação espectrofotométrica de ferro total com 1,10-fenantrolina (UV-Vis)` (`WK-ANL-001`, USGS TEI-223, `R$ 39,00`), destacando também guias como `EPA 200.7` (`WK-ANL-002`, ICP-OES, `R$ 59,00`), `EPA 300.0` (`WK-ANL-005`, cromatografia de íons, `R$ 54,00`) e `EPA 8260D` (`WK-ANL-013`, COVs por GC-MS, `R$ 68,00`), sem rótulos de teste ou registros sintéticos legados na vitrine.
6. Abrir a página de produto de `WK-ANL-001` e apresentar o layout inspirado na ASTM: código documental, referência pública de base, versão, escopo resumido em um parágrafo breve, quadro explicativo do conteúdo incluído no guia autoral, classificações essenciais, referências rastreáveis e quadro lateral de compra com preço em BRL.
7. Clicar em `Adicionar ao carrinho`, observar a atualização imediata do contador no cabeçalho (`Carrinho 1`), abrir `/carrinho` (com remoção seletiva concisa e revalidação de valores) e avançar para `Revisão do pedido` (`/checkout/:id`), onde o usuário seleciona a modalidade de pagamento simulado (`PIX`, `Cartão de crédito` ou `Boleto bancário`, sem solicitação de dados de cartão, CPF ou código pagável) junto ao aviso discreto e inequívoco de isenção de cobrança financeira e à confirmação explícita obrigatória.
8. Confirmar o pedido, verificar o retorno imediato do contador do carrinho para `0`, a exibição da conclusão e modalidade utilizada (sem prazo pendente como metadado principal), realizar aquisições consecutivas na mesma sessão com modalidades distintas sem bloqueio, consultar o histórico persistido em `Perfil → Pedidos` e acessar `Perfil → Minha biblioteca` para abrir a leitura autorizada estruturada em seções técnicas (`Escopo analítico e princípio físico-químico`, `Matrizes aplicáveis`, `Interferências críticas`, `Estrutura operacional`, `Calibração e cálculos` e `Controle de qualidade`), demonstrando ainda a atualização para `v2` e a consulta à versão `v1` originalmente adquirida sem nova compra.

## Percurso administrativo separado

Demonstrar que o item `Administração` no menu `Perfil` aparece exclusivamente para contas `ADMIN`, abrindo `/admin` para gerenciar as sete taxonomias analíticas, versões editoriais imutáveis após publicação, revisão explícita, suspensão/restauração auditada e ofertas/histórico de preços em BRL — ressaltando que o papel administrativo não concede acesso automático à leitura de cliente sem direito adquirido.

## Evidências e fechamento

Apoiar a exposição nas 18 capturas reais geradas por navegador sobre API e MySQL reais, na matriz de rastreabilidade de requisitos e nos dados observados de desempenho da consulta parametrizada com suas respectivas delimitações.
