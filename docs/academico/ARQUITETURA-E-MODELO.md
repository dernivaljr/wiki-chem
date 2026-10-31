# Arquitetura geral e modelo relacional

O frontend React/TypeScript consome uma API REST Fastify/Node.js 24/TypeScript strict, com validação Zod. MySQL 8.4 persiste usuários, sessões, conhecimento editorial e comércio demonstrativo. O backend é um monólito modular; não há serviço externo de pagamento ou IA.

A **Figura 1** apresenta a arquitetura lógica do MVP e a execução local por Docker Compose. O frontend React é executado no navegador; o container frontend disponibiliza os arquivos e encaminha `/api/v1` para a API. Os módulos do backend pertencem a **um único monólito modular**, não a serviços independentes. A API e o MySQL não ficam expostos diretamente ao navegador no ambiente de demonstração.

A figura foi criada e renderizada diretamente no **Eraser**. O [arquivo de diagrama editável](https://app.eraser.io/workspace/XzHWqEo8ogZcoPdLxsKl?diagram=4qm0dR5Imeo-I1uG7p_W&layout=canvas) e o [código-fonte versionado](diagramas/arquitetura-wiki-chem.eraser) permitem revisões futuras. A [imagem PNG](diagramas/arquitetura-wiki-chem.png) foi exportada do Eraser em tema claro.

**Figura 1 — Arquitetura de software do Wiki-Chem (Eraser, 2026).**

![Arquitetura do Wiki-Chem: React, Fastify modular, MySQL e Docker Compose](diagramas/arquitetura-wiki-chem.png)

**Representação equivalente em Mermaid (editável no GitHub):**

```mermaid
flowchart LR
  P["Cliente / Administrador"] --> R["Navegador<br/>React + TypeScript"]

  subgraph D["Ambiente local de demonstração · Docker Compose"]
    direction LR
    F["Frontend<br/>Vite preview"]
    subgraph B["Backend · monólito modular · Node.js 24 / Fastify"]
      direction TB
      A["API REST /api/v1<br/>Zod · sessão · autorização"]
      I["Identidade"]
      C["Catálogo e pesquisa"]
      E["Ofertas e carrinho"]
      O["Checkout e pedidos"]
      L["Biblioteca autorizada"]
      AD["Administração editorial"]
      A --> I & C & E & O & L & AD
    end
    DB[("MySQL 8.4<br/>usuários · metodologias<br/>preços · pedidos · direitos")]
    F -->|"Proxy /api/v1"| A
    I & C & E & O & L & AD --> DB
  end

  R -->|"HTTP local :4180"| F
  style B fill:#F3EFFF,stroke:#7B6EAC,color:#151E43
  style D fill:#F5F8FF,stroke:#ABBEDB,color:#151E43
  style DB fill:#DCEFE8,stroke:#43806B,color:#16382B
```


```mermaid
erDiagram
  USERS ||--o{ AUTH_SESSIONS : possui
  USERS ||--o| CARTS : possui
  CARTS ||--o{ CART_ITEMS : contem
  METHODOLOGIES ||--o{ METHODOLOGY_VERSIONS : possui
  METHODOLOGY_VERSIONS ||--o| METHODOLOGY_CONTENTS : protege
  METHODOLOGY_VERSIONS ||--o{ VERSION_SOURCES : referencia
  SOURCES ||--o{ VERSION_SOURCES : identifica
  METHODOLOGIES ||--o| PRODUCTS : comercializa
  PRODUCTS ||--o{ PRODUCT_PRICES : historiza
  PRODUCTS ||--o{ CART_ITEMS : integra
  USERS ||--o{ ORDERS : cria
  ORDERS ||--|{ ORDER_ITEMS : preserva
  ORDER_ITEMS ||--o| ENTITLEMENTS : origina
  USERS ||--o{ ENTITLEMENTS : possui
  METHODOLOGIES ||--o{ ENTITLEMENTS : autoriza
  ORDERS ||--o{ IDEMPOTENCY_RECORDS : identifica
  METHODOLOGY_VERSIONS ||--o{ VERSION_ACCESS_EVENTS : audita
```

Cada uma das sete taxonomias possui associação N:N por versão; o [modelo completo](../arquitetura/MODELO-DADOS.md) discrimina todas as entidades, chaves e índices. O diagrama resumido omite apenas essas sete associações e contribuições para facilitar leitura, sem substituí-las por campos de texto.

Sessões usam cookie HttpOnly/SameSite e tokens armazenados como hash; senhas usam Argon2id. Escritas verificam origem/CSRF e autorização. O cliente não define titular, papel, preço ou direito. A confirmação demonstrativa conclui pedido, concede direitos, atualiza carrinho e audita atomicamente; a primeira transação apenas persiste a revisão. Snapshots preservam os fatos originais da aquisição.

A biblioteca verifica usuário, direito ACTIVE, identidade e estado da versão e condições das fontes em cada leitura integral. ADMIN não recebe direito de cliente automaticamente. Suspensão bloqueia a versão sem fallback silencioso; retirada de venda não elimina direito. Respostas protegidas não são armazenadas em cache compartilhado nem nos ativos do frontend.

A demonstração local utiliza containers separados e banco de testes, com porta publicada somente na interface de loopback. Esse arranjo reproduz a integração, sem caracterizar arquitetura de produção. [Arquitetura detalhada](../arquitetura/ARQUITETURA-MVP.md), [identidade](../arquitetura/IDENTIDADE.md) e [biblioteca](../arquitetura/BIBLIOTECA-DIGITAL.md) complementam o modelo.
