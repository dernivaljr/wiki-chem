# Etapa 13 — Correção definitiva do checkout consecutivo e simulação de pagamento

## Diagnóstico confirmado por teste automatizado

Antes da correção, `OrderPage.tsx` e `confirmIntent` não removiam `wikichem-demo-create:<userId>` do `localStorage` ao confirmar o pedido (`COMPLETED_SIMULATED`) — a limpeza só ocorria quando o usuário clicava manualmente no botão secundário `"Voltar ao carrinho para nova revisão"`. Ao adicionar um novo item ao carrinho pela vitrine e abrir `/carrinho`, `CartCheckout.tsx` lia a intenção antiga sem consultar seu status no servidor, exibia `"Recuperar revisão do pedido"` e reenviava a `Idempotency-Key` anterior para `POST /checkout/simulations`, recebendo em replay o pedido já concluído e bloqueando compras subsequentes.

## Soluções implementadas

1. **Compras consecutivas e reconciliação de intenção (`frontend/src/checkout/intent.ts`, `CartCheckout.tsx`, `OrderPage.tsx`):**
   - `confirmIntent` libera automaticamente `wikichem-demo-create:<userId>` e `wikichem-demo-confirm:<userId>:<orderId>` assim que a confirmação retorna estado não pendente.
   - `OrderPage.tsx` também libera intenções locais em qualquer estado terminal (`COMPLETED_SIMULATED`, `CANCELLED`, `EXPIRED`) e em recusas determinísticas (`OFFER_CHANGED`, `ALREADY_OWNED`, `PRODUCT_UNAVAILABLE`, `ORDER_EXPIRED`).
   - `reconcileIntent` verifica no servidor intenções residuais ao abrir `/carrinho`: pedidos concluídos, cancelados, expirados, inexistentes ou de revisões anteriores já persistidas são descartados silenciosamente, mantendo a recuperação apenas para pedidos efetivamente pendentes da revisão corrente ou falhas de rede incertas (`!orderId`).
   - `begin` gera chave UUID nova para cada nova intenção e descarta eventual pedido terminal recebido em replay.

2. **Simulação de pagamento sem cobrança real (`0049`–`0051`, `checkout.contracts.ts`, `checkout.repository.ts`, `OrderPage.tsx`, `Orders.tsx`):**
   - Adicionada coluna `payment_method ENUM('PIX','CREDIT_CARD','BOLETO') NULL` em `orders` com constraint `CHECK (status = 'COMPLETED_SIMULATED' OR payment_method IS NULL)` e trigger `immutable_order_update` atualizada para impedir mutação pós-conclusão, mantendo compatibilidade integral com pedidos antigos (`payment_method IS NULL`).
   - Seleção obrigatória entre **PIX**, **Cartão de crédito** e **Boleto bancário** na revisão do pedido, com ícones SVG próprios, resumo consolidado e aprovação/quitação simulada sem solicitar número de cartão, CVV, CPF ou gerar QR Code/boleto pagável.
   - `requestHash` vincula `paymentMethod` à `Idempotency-Key` de confirmação; repetições com modalidade divergente são rejeitadas com `409 IDEMPOTENCY_CONFLICT`.

3. **Ajustes de usabilidade e histórico (`Cart.tsx`, `OrderPage.tsx`, `Orders.tsx`):**
   - Botão de exclusão no carrinho encurtado visualmente para `"Remover"`, preservando `aria-label="Remover <título>"` acessível.
   - `Prazo de confirmação` removido dos metadados principais de pedidos concluídos, dando lugar a `Concluído em`, `Forma de pagamento`, mensagem de aprovação simulada da modalidade escolhida e links diretos de leitura na biblioteca.
   - Histórico em `/pedidos` exibe a modalidade persistida em cada pedido concluído.
