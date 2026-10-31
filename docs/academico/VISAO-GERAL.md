# Problema, objetivos e delimitação

## Problema

A consulta e a obtenção de metodologias de química analítica exigem relacionar técnicas instrumentais, tecnologias, equipamentos, matrizes, analitos, referências normativas e segmentos de aplicação. Informações dispersas e diferenças de versão dificultam localizar protocolos pertinentes, distinguir documentos públicos de guias interpretativos estruturados e controlar o acesso a versões adquiridas. O Wiki-Chem apresenta uma plataforma web para organizar esses metadados, pesquisar metodologias com precisão terminológica e disponibilizar guias técnicos digitais autorais com controle de acesso por titularidade.

O sistema não substitui normas oficiais, acreditação laboratorial ou validação experimental em matriz real. No ambiente acadêmico demonstrativo, as 15 metodologias comercializáveis constituem **produtos digitais interpretativos originais do Wiki-Chem** (`WK-ANL-001` a `WK-ANL-015`), tecnicamente fundamentados em publicações públicas verificadas da U.S. EPA e do USGS, sem vender nem reproduzir documentos de terceiros como normas licenciadas.

## Objetivo geral

Desenvolver e verificar um MVP integrado de pesquisa técnica, apresentação comercial inspirada na organização de catálogos normativos (como a ASTM, preservando identidade e conteúdo próprios do Wiki-Chem) e aquisição isenta de cobrança de guias analíticos digitais, com autenticação, sete taxonomias, versionamento editorial, histórico de pedidos e biblioteca digital autorizada pelo backend.

## Objetivos específicos

1. Disponibilizar pesquisa simplificada sob demanda — exigindo termo textual válido, mantendo os sete filtros analíticos recolhidos por padrão e tratando aliases químicos controlados (`ferro`/`Fe`, `UV-Vis`, `GC-MS`, `ICP-OES`) sem falsos positivos.
2. Estruturar páginas de produto claras com identificação documental, versão, escopo resumido, classificações essenciais, referências rastreáveis, preço em BRL e distinção transparente entre prévia gratuita e conteúdo autoral protegido.
3. Implementar cabeçalho responsivo com menu suspenso `Perfil` (`Minha biblioteca`, `Pedidos`, `Administração` restrita a `ADMIN`, `Dados pessoais` e `Sair`), contador dinâmico do carrinho, sessão revogável e isolamento entre usuários.
4. Persistir preços em BRL configuráveis e snapshots históricos da aquisição, informando de maneira discreta e inequívoca no checkout a ausência de cobrança financeira, com confirmação explícita e idempotência.
5. Liberar exclusivamente na biblioteca digital do titular o guia técnico integral organizado em seções e referências rastreáveis, incluindo acesso à versão adquirida e às atualizações publicadas elegíveis.
6. Verificar a solução por testes automatizados de regras, contratos, componentes, banco MySQL real e navegador em desktop e mobile, documentando evidências e limitações.

## Escopo entregue e exclusões

O MVP compreende cadastro, autenticação, dados pessoais, cabeçalho com menu `Perfil` e contador dinâmico em `Carrinho`, pesquisa simplificada com sete taxonomias N:N de química analítica recolhidas por padrão, cartões compactos de resultado, página de metodologia inspirada na ASTM, 15 guias técnicos digitais autorais em português com preços em BRL configuráveis no ambiente demonstrativo, carrinho persistente, checkout com aviso discreto de isenção de cobrança, histórico de pedidos, biblioteca digital estruturada e administração editorial/comercial separada. Os cinco registros sintéticos anteriores permanecem arquivados (`RETIRED`) sem perda de histórico.

Não integram o escopo pagamentos reais, geração de documentos fiscais, downloads em PDF, assinaturas, hospedagem pública, IA/RAG, e-mail verificado, recuperação de senha, seed de produção ou licenciamento comercial de normas externas. Revisão científica humana por pares e precificação comercial definitiva permanecem fora deste recorte acadêmico.

## Abordagem de verificação

A solução é validada sobre especificações verificáveis, modelagem relacional com integridade referencial e triggers de imutabilidade histórica, contratos REST estritos e suítes automatizadas sem dependência de etapas manuais. Os requisitos e decisões constam na [especificação](../especificacoes/MVP-WIKI-CHEM-v1.md), e cada requisito funcional é associado a testes executáveis e capturas reais na [matriz de rastreabilidade](RASTREABILIDADE.md).
