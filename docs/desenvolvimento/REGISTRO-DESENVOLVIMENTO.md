# Registro interno de desenvolvimento

Este registro é operacional e não integra a documentação acadêmica destinada à FATEC.

## Proveniência da especificação (histórico)


A branch documental parte de `main` em `6f48aecbca3fce10518e6224731086ec74c48d5c`. Pré-condições verificadas antes de criá-la:

| Verificação | Evidência |
| --- | --- |
| Auditoria integrada | [PR #1](https://github.com/dernivaljr/wiki-chem/pull/1), merge `2fe5ee6a330d2057783077d42165e68e717db146` |
| Etapa 01 integrada | [PR #2](https://github.com/dernivaljr/wiki-chem/pull/2), merge `6f48aecbca3fce10518e6224731086ec74c48d5c` |
| CI da main aprovada nesse SHA | [Execução 40980122133](https://github.com/dernivaljr/wiki-chem/actions/runs/40980122133), evento push em main, conclusão success |

Referências locais: [auditoria](../auditoria/AUDITORIA-2026-10-29.md) e [Etapa 01](../etapas/ETAPA-01-ESTABILIZACAO.md). A base tem frontend React, quatro rotas, testes e CI. Login/cadastro e consulta ainda são simulações. Não há backend, banco ou e-commerce implementados.

Foram consultadas as [diretrizes SDD v1.0](https://github.com/dernivaljr/sdd-methodology/blob/main/SDD-GUIDELINES.md), blob `05f4cb40e5b0a68c6bf7e606a74fe6c223c09e5b`. Requisitos, solução técnica e tarefas estão separados nestes cinco documentos. Não foi identificada constituição própria aprovada; sua formalização/adaptação permanece em V10. Consultar as diretrizes não constitui aprovação automática do desenho proposto.

Documentos associados: [arquitetura e API](../arquitetura/ARQUITETURA-MVP.md), [modelo de dados](../arquitetura/MODELO-DADOS.md), [regras comerciais](../arquitetura/ECOMMERCE.md) e [roadmap](../planejamento/ROADMAP-MVP.md).


## Validação documental anterior (histórico)


- Pré-condições de merge/CI da main verificadas e registradas na especificação.
- Revisão de consistência entre RF, P/V, contratos, entidades, estados e tarefas; diagramas Mermaid nativos incluídos.
- Revisão final local: cinco documentos existentes, 27 links locais válidos, 59 IDs definidos sem referências desconhecidas, oito blocos Mermaid, cercas/encoding e relações ER sem erros estruturais; cinco candidatas com fontes primárias reais e cinco fixtures monetárias distintas identificadas; somas de 2750/12000 centavos conferidas. Diff restrito aos cinco Markdown; nenhuma regra de backend foi implementada ou declarada testada.
- Não instalar pacotes, executar migrações, configurar banco/serviços, alterar CI ou modificar aplicação para validar documentos. O CI já existente pode validar a regressão da branch; resultado de CI não aprova requisitos nem comprova MVP implementado.
- CI de regressão documental aprovado no commit `7791496fe4d3cf688ba9fe663ff67b0ac0813f18`: [execução 40983062010](https://github.com/dernivaljr/wiki-chem/actions/runs/40983062010). Os checks do PR identificam os resultados de revisões posteriores.
- Na revisão inicial, os oito diagramas carregaram no visualizador do GitHub sem erro de parser: três ER no modelo, dois no documento comercial e um em cada outro documento. A revisão final preserva oito blocos e a checagem no PR deve acompanhar a versão corrente. Não há CLI Mermaid instalada nem dependência adicionada; checagens de estrutura/renderização não são aprovação de P03/P09 nem teste de implementação do MVP.


## Fundação do backend

Base confirmada: merge do PR #3 em c161fd0889e0d5a0bf85075a14857fe153fd5cf5; CI main aprovado em https://github.com/dernivaljr/wiki-chem/actions/runs/40990012819 . PRs #1 e #2 integrados. Branch: feat/backend-foundation.

Escopo: infraestrutura e saúde; sem autenticação, catálogo, comércio ou IA/RAG. As tecnologias da fundação foram explicitamente autorizadas, sem aprovação comercial implícita. Resultados finais serão acrescentados após as verificações. Não registrar segredos nem logs brutos de driver.
