# Problema, objetivos e delimitação

## Problema

A consulta de metodologias de química analítica exige relacionar técnicas, tecnologias, equipamentos, matrizes, analitos, documentos normativos e segmentos. Informações dispersas e diferenças de versão dificultam localizar conteúdos pertinentes e identificar sua origem. O Wiki-Chem explora uma solução de software para organizar esses metadados e controlar o acesso a conteúdo digital adquirido em uma demonstração acadêmica.

O trabalho não demonstra eficácia analítica de procedimentos nem substitui normas, validação laboratorial ou avaliação de direitos de uso. O corpus utilizado nas evidências é original e sintético; o problema de curadoria científica real permanece reconhecido.

## Objetivo geral

Desenvolver e verificar um MVP integrado de pesquisa e aquisição demonstrativa de metodologias, com autenticação, classificação técnica, versionamento editorial, histórico de pedidos e biblioteca autorizada pelo backend.

## Objetivos específicos

1. Pesquisar texto e combinar sete categorias de filtros com OR na mesma categoria e AND entre categorias.
2. Separar prévias gratuitas de conteúdo integral, com referências e identificação de versões.
3. Implementar sessão revogável, proteção de operações e isolamento entre usuários.
4. Persistir preços e fatos históricos da aquisição, com confirmação demonstrativa transacional e idempotência.
5. Permitir acesso ao original e às atualizações publicadas da mesma metodologia, condicionado ao direito e à disponibilidade de cada versão.
6. Verificar o sistema por testes de regras, contratos, interface, MySQL real e navegador, apresentando evidências e limitações.

## Escopo entregue e exclusões

O MVP inclui cadastro/login/perfil, catálogo editorial administrativo, sete taxonomias N:N, pesquisa, prévias, ofertas BRL, carrinho, pedido pendente/confirmação simulada, histórico, biblioteca e suspensão/restauração editorial. A identidade visual React é preservada. Aquisição e valores dos exemplos são demonstrativos; não existe pagamento real.

Não integram o escopo pagamentos, downloads, assinaturas, hospedagem pública, IA/RAG, e-mail verificado, recuperação de senha ou política comercial definitiva. Corpus científico, condições comerciais e permissões reais exigem validação posterior. As cinco candidatas técnicas anteriormente estudadas não foram publicadas automaticamente.

## Abordagem de desenvolvimento e verificação

O desenvolvimento utiliza especificação verificável, modelagem relacional, contratos de entrada/saída e incrementos pequenos com validação automatizada. Requisitos, decisões adotadas e propostas são diferenciados na [especificação](../especificacoes/MVP-WIKI-CHEM-v1.md). A execução demonstrativa é isolada de produção. A rastreabilidade relaciona cada requisito a testes e evidências, sem confundir aprovação de testes com validação científica ou jurídica.

Os resultados sustentam conclusões sobre o comportamento observado no ambiente controlado. Não autorizam generalizar desempenho para produção, conformidade integral de acessibilidade ou qualidade de metodologias reais.
