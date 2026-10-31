# Diagrama de arquitetura de software — Wiki-Chem (Eraser)

**Objetivo:** gerar a imagem de arquitetura solicitada na disciplina de Engenharia de Software II, usando a implementação atual do Wiki-Chem como referência, sem introduzir funcionalidades planejadas mas não entregues.

## Fonte editável

[**arquitetura-wiki-chem.eraser**](arquitetura-wiki-chem.eraser) é o código Diagram-as-Code do Eraser. Ele descreve:
- Atores (cliente e administrador) e aplicação React/TypeScript executada no navegador;
- Servidor do frontend (Vite preview) e proxy de chamadas `/api/v1`;
- API Node.js 24, Fastify e Zod como **monólito modular** com identidade, catálogo, comércio, checkout, biblioteca e administração;
- Banco MySQL 8.4 na rede interna e infraestrutura Docker Compose **somente para demonstração local**.

O checkout representa **PIX, cartão e boleto simulados, sem processamento financeiro real**. IA/RAG, gateway de pagamento externo, microserviços e hospedagem pública **não estão representados porque não integram o MVP**. O diagrama mostra módulos lógicos, não processos separados.

## Gerar a imagem no Eraser

1. Acesse o [diagrama já criado no Eraser](https://app.eraser.io/workspace/XzHWqEo8ogZcoPdLxsKl?diagram=4qm0dR5Imeo-I1uG7p_W&layout=canvas). Para recriar a figura em outro workspace, abra um canvas novo.
2. Insira um **Diagram as Code** do tipo **Cloud Architecture Diagram** (arquitetura); abra o editor do código do diagrama.
3. Copie o conteúdo integral de [arquitetura-wiki-chem.eraser](arquitetura-wiki-chem.eraser), cole no editor e confira a renderização, em especial agrupamentos, setas e rótulos.
4. No menu de exportação (`...` no alto à direita ou `Ctrl+E`), selecione **Canvas** e exporte em **SVG**, com tema claro e fundo sólido. Se necessário para o relatório, exporte também **PNG** em boa resolução.
5. A [imagem PNG exportada diretamente do Eraser](arquitetura-wiki-chem.png) já está versionada nesta pasta e inserida na seção acadêmica. Para obter uma versão vetorial, exporte manualmente um SVG no próprio Eraser, confira sua renderização e só então anexe-o ao GitHub.

Se o Eraser reorganizar automaticamente os elementos, mantenha a semântica: no navegador está o React, a API é um único backend modular e o MySQL não é exposto diretamente ao usuário. Não atribua ao sistema IA, pagamentos reais ou infraestrutura de produção.

## Fonte e relacionamento com o relatório

A [seção acadêmica de arquitetura](../ARQUITETURA-E-MODELO.md) contém um diagrama Mermaid equivalente que o próprio GitHub consegue apresentar antes da exportação do Eraser; o **modelo entidade-relacionamento** fica separado do diagrama de arquitetura para não sobrecarregar a figura.

Arquivos que fundamentam o diagrama: `frontend/src/App.tsx`, `backend/src/app.ts`, `demo/compose.yaml`, [arquitetura detalhada](../../arquitetura/ARQUITETURA-MVP.md) e [checkout](../../arquitetura/CHECKOUT-DEMONSTRATIVO.md).

**Legenda sugerida para o relatório:** *Figura X — Arquitetura de software do Wiki-Chem: interface React, API Fastify em monólito modular, persistência MySQL e ambiente demonstrativo Docker Compose. Fonte: elaboração própria, 2026.*
