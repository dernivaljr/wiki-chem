# Registro interno — Etapa 08

Base main: 6cad8eadebffc41d5721f07c2c86c914c86a61d2. PR #8 integrado; execução 41085416275 aprovada. Branch codex/checkout-demonstrativo-pedidos.

Implementação: checkout em duas transações, snapshots imutáveis, registro de direitos, histórico próprio, idempotência durável no cliente e backend, 12 migrações novas (47 totais), sem pagamentos ou biblioteca integral.

Validação local: build/lint e 86 testes frontend + 95 backend aprovados. Instalação limpa inicialmente limitada pelo cache npm do sandbox; repetida com acesso autorizado ao cache. Integração MySQL e Chromium serão executados pelo CI isolado, pois não há servidor MySQL/Docker/navegador instalado neste ambiente Windows. Resultados finais pendentes. Nenhuma credencial de produção é utilizada.
