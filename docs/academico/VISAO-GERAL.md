# Problema, objetivos e delimitação

## Problema

A consulta de metodologias de química analítica exige relacionar técnicas, tecnologias, equipamentos, matrizes, analitos, documentos normativos e segmentos. Informações dispersas e diferenças de versão dificultam localizar conteúdos pertinentes e identificar sua origem. O Wiki-Chem explora uma solução de software para organizar esses metadados, recuperar fichas técnicas pertinentes e controlar o acesso a conteúdo digital próprio adquirido em uma demonstração acadêmica.

O trabalho não demonstra eficácia analítica de procedimentos nem substitui normas, validação laboratorial ou avaliação de direitos de uso. No ambiente demonstrativo isolado, as 15 fichas técnicas de química analítica apresentam descrições originais e limitações documentadas com referência a fontes públicas oficiais (sem reproduzir procedimentos integrais e sem comercialização), enquanto os fluxos comerciais utilizam cinco fixtures sintéticas de software.

## Objetivo geral

Desenvolver e verificar um MVP integrado de pesquisa técnica e aquisição demonstrativa de metodologias, com autenticação, classificação analítica em sete eixos, versionamento editorial, histórico de pedidos e biblioteca autorizada pelo backend.

## Objetivos específicos

1. Pesquisar texto com aliases químicos controlados (`ferro`/`Fe`, `UV-Vis`, `GC-MS`, `ICP-OES`) e combinar sete categorias de filtros com OR na mesma categoria e AND entre categorias.
2. Separar prévias gratuitas e fichas informativas de referências externas (sem oferta comercial) dos conteúdos próprios com acesso integral controlado.
3. Implementar sessão revogável, proteção de operações e isolamento entre usuários.
4. Persistir preços e fatos históricos da aquisição simulada, com confirmação demonstrativa transacional e idempotência.
5. Permitir acesso ao original e às atualizações publicadas da mesma metodologia adquirida, condicionado ao direito e à disponibilidade de cada versão.
6. Verificar o sistema por testes de regras, contratos, interface, MySQL real e navegador, apresentando evidências e limitações.

## Escopo entregue e exclusões

O MVP inclui cadastro/login/perfil, catálogo editorial administrativo, sete taxonomias N:N com vocabulário real de química analítica na demonstração isolada, pesquisa otimizada, prévias e fichas informativas, ofertas BRL para conteúdo próprio sintético, carrinho, pedido pendente/confirmação simulada, histórico, biblioteca e suspensão/restauração editorial. A identidade visual React é preservada. Aquisição e valores dos exemplos sintéticos são demonstrativos; não existe pagamento real.

Não integram o escopo pagamentos reais, downloads, assinaturas, hospedagem pública, IA/RAG, e-mail verificado, recuperação de senha, seed de produção ou comercialização de conteúdos externos. Curadoria científica humana, condições comerciais definitivas e permissões contratuais exigem validação posterior.

## Abordagem de desenvolvimento e verificação

O desenvolvimento utiliza especificação verificável, modelagem relacional, contratos de entrada/saída e incrementos pequenos com validação automatizada. Requisitos, decisões adotadas e propostas são diferenciados na [especificação](../especificacoes/MVP-WIKI-CHEM-v1.md). A execução demonstrativa é isolada de produção e reconcilia idempotentemente o banco demonstrativo preservando contas e pedidos existentes. A rastreabilidade relaciona cada requisito a testes e evidências, sem confundir aprovação de testes com validação científica ou jurídica.
