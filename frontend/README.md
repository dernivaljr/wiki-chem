# Interface web do Wiki-Chem

Frontend responsivo em **React, TypeScript e Vite**, responsável pela navegação, pesquisa de metodologias, visualização de guias digitais, carrinho, checkout simulado e biblioteca do usuário.

A aplicação utiliza a **API Fastify real** do projeto para cadastro, autenticação, catálogo, preços, pedidos e controle de acesso. Não se trata de interfaces simuladas de login ou pesquisa.

## Execução local

Para iniciar a experiência completa, com frontend, API e MySQL, prefira a [demonstração integrada com Docker](../README.md#executar-no-seu-computador).

Para trabalhar somente com o frontend:

```bash
npm ci
npm run dev
```

Os recursos autenticados dependem da API configurada. Para compilação e verificações locais:

```bash
npm run build
npm run lint
npm test
```

O navegador de testes pode ser instalado com `npm exec -- playwright install --no-shell chromium`. Veja o [guia técnico](../docs/desenvolvimento/GUIA-TECNICO.md) para configuração de backend, MySQL, variáveis de ambiente e verificações integradas.
