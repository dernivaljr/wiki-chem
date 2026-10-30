# Registro interno — Etapa 10

Base main 269333881b288f58325e9d25b0a7f1f10689df56; PR #10 integrado, execução 41133268650 aprovada. Branch codex/consolidacao-demonstracao.

Demonstração Compose isolada, fixture original com conferência automatizada identificada, preparação idempotente, segredos temporários fora do repositório, backup/restauração restritos e acesso aleatório por terminal. Corrigida navegação sem conteúdo em rotas desconhecidas. Material acadêmico separado em docs/academico; nenhum DOCX final gerado.

Verificação local: instalação limpa, build, lint, 99 testes frontend e 102 backend aprovados; auditorias completas/de produção sem vulnerabilidades. Docker, MySQL e o Chromium gerenciado pela suíte não estavam disponíveis no executor Windows; Edge local foi utilizado para renderizar/inspecionar os dois diagramas BPMN; integração, imagens, medições e restauração serão validados no Linux isolado. Execução final funcional 41139229030 aprovada nos três jobs, com failOnFlakyTests habilitado: 406 testes aprovados sem repetições e verificação Compose/restauração concluída. Capturas finais do artefato 13017951938, proveniente do head 4d7736742358a0458719d976aac2ea327dd7e677. Medição bruta preservada da execução 41137378179, artefato 13016104695, com módulo de pesquisa idêntico.

## Verificação e diagnóstico

Comandos: npm run install:clean; npm run build; npm run lint; npm test; npm run audit:deps; npm run audit:prod; db:status/db:migrate repetidos; test:integration; test:e2e; test:auth; demo:prepare; demo:up; demo:verify; demo:reset -- --confirm-demo-reset. Contagem: 102 backend + 99 frontend + 162 MySQL + 15 navegador de apresentação + 28 navegador integrado = 406. Nenhum teste manual é exigido do usuário.

Defeitos demonstrativos encontrados/corrigidos: REVOKE por padrão de esquema não correspondia ao grant escapado da imagem MySQL; substituído por revogação integral do usuário de demonstração e concessão DML no esquema literal. A execução sem root do preview necessitava propriedade dos arquivos/cache; o build frontend passa a instalar/copiar como usuário node. Corrigidas mensagens obsoletas e rota inexistente sem conteúdo. Logs de diagnóstico sanitizam os segredos do ambiente antes de exibição.

Capturas: 18 PNGs reais, com credenciais/e-mails/evidências privadas mascarados; revisadas por imagens individuais e folhas de contato, sem modificar os originais. BPMN XML bem-formado e referências de fluxos resolvidas; duas representações SVG renderizadas em Edge headless e inspecionadas. Não realizada validação XSD completa por ferramenta BPMN externa. Os diagramas são descritivos e não executáveis.

Medição: 5/100/500 publicações, 14 termos, 3700 associações ao final, 15 séries de 20 amostras após três aquecimentos. Medianas com 500 registros: 7,44–23,73 ms; p95 máximo 27,20 ms no ensaio preservado. Valores não incluem HTTP/renderização/carga concorrente; plano estimou ALL em versões e acessos por chave nas associações. Preparação editorial usa casos de uso reais e conferência automatizada identificada de material original, sem pessoa/revisão humana/licença externa fictícia.

A demonstração é somente NODE_ENV=test/wikichem_test_demo, não prontidão de produção. Exige Docker/Compose instalado para execução local; não foi instalado Docker no Windows deste executor. Não gerado DOCX final. Ainda é necessário adequar o material ao modelo efetivo do professor, sem inventar nomes de docentes, autores acadêmicos, campus ou semestre.

A inspeção dos logs também revelou duas condições de corrida em testes: edição de perfil após remoção legítima da sessão por foco e asserção da prévia antes de concluir navegação. O cenário de revogação agora aciona retomada de foco e a prévia aguarda pathname/h1, preservando query de retorno. failOnFlakyTests torna repetições um bloqueio no CI. A execução final funcional teve 28 jornadas integradas aprovadas sem flakiness. As 18 capturas finais foram copiadas byte a byte e receberam hashes/dimensões em manifesto sem dados operacionais; imagens, matriz, roteiro, dois BPMN/SVG e medição bruta ficam versionados no material acadêmico.
