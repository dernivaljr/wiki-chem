# Roteiro funcional para apresentação

Este roteiro descreve a demonstração acadêmica já exercitada automaticamente. Não exige que o avaliador execute testes manuais para comprovar a entrega. As instruções operacionais de preparação ficam separadas deste material.

## Percurso do cliente

1. Apresentar o problema de organização de metodologias de química analítica e a delimitação ética/técnica: separação rigorosa entre **15 fichas técnicas informativas** baseadas em fontes públicas oficiais (sem cópia de procedimento integral e sem oferta comercial) e **5 exemplos sintéticos originais de software** (`DEMO 01`–`DEMO 05`) para demonstrar aquisição simulada sem cobrança.
2. Mostrar Home, cadastro e login reais; explicar que sessão e autorização são verificadas pela API.
3. Na tela de Consultas, mostrar as 20 entradas publicadas no banco demonstrativo e os sete filtros compactos com vocabulário real de química analítica (`Técnicas`, `Tecnologias`, `Equipamentos`, `Matrizes`, `Analitos`, `Normas`, `Segmentos`), abrindo `Edição` em `Normas` para exibir emissor, identificador e revisão sem poluir os checkboxes.
4. Pesquisar `"ferro"` (ou o símbolo químico `"Fe"`) combinado com `Espectrofotometria de absorção molecular` e `UV-Vis (complexação molecular)` (ou os sete filtros correspondentes) para localizar a ficha `Determinação espectrofotométrica de ferro total com 1,10-fenantrolina (UV-Vis)` (USGS TEI-223), destacando também fichas como `EPA 200.7` (ICP-OES), `EPA 300.0` (cromatografia de íons) e `EPA 8260D` (COVs por GC-MS). Ressaltar o aviso explícito de ficha informativa de referência pública **sem oferta comercial de conteúdo de terceiros**.
5. Limpar os filtros, abrir a prévia de uma fixture comercial sintética (`DEMO 01 — Absorbância de marcador em água sintética`) e ressaltar que apenas o material sintético próprio possui oferta demonstrativa (`R$ 10,00`), sem expor o procedimento integral na prévia.
6. Adicionar `DEMO 01` ao carrinho, avançar à revisão pendente e observar **DEMONSTRAÇÃO — SEM COBRANÇA** e confirmação explícita obrigatória. Pedido pendente não concede acesso à biblioteca.
7. Confirmar a aquisição simulada e consultar o pedido persistido com título, versão e preço históricos preservados.
8. Abrir a biblioteca e a leitura integral autorizada do texto sintético de software (`v1`), e em seguida demonstrar a atualização para `v2` com seleção explícita da versão histórica `v1` adquirida, sem nova cobrança.

## Percurso administrativo separado

Apresentar em `/admin` a gestão das sete taxonomias analíticas reais (incluindo emissor, identificador e edição verificada nas normas), o rascunho versionado, fontes/condições de uso, autoria, conferência explícita e publicação imutável. Nas evidências, a conferência é automatizada e identificada, sem revisão científica humana presumida.

Mostrar que a versão publicada não é sobrescrita e que suspensão/restauração exige justificativa e auditoria. Diferenciar retirada de venda de suspensão de leitura e explicar que o papel `ADMIN` não concede automaticamente direito nas rotas de biblioteca de cliente.

## Evidências e fechamento

Utilizar as 18 capturas reais para os estados visualizados e a matriz de rastreabilidade para autorização, aliases sem falso positivo, reconciliação idempotente, concorrência e rollback. Apresentar os tempos medidos com escopo e limitações, sem transformá-los em SLA. O relatório final em DOCX não foi gerado nesta etapa.
