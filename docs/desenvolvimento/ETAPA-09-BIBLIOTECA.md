# Registro interno — Etapa 09

Base main dbb38fded0a0066bc094f4c4029f6cc9229b83b6; PR #9 integrado e execução 41094522838 aprovada. Branch codex/biblioteca-digital.

Biblioteca com quatro endpoints, suspensão/restauração administrativa, justificativa persistida e leitura sem cache. Migração 0048, 48 totais; nenhuma dependência adicionada.

Validação local: instalação limpa, build, lint, 98 testes frontend e 98 backend aprovados; auditorias completas/de produção sem vulnerabilidades. MySQL real e Chromium foram executados no CI isolado, pois não há servidor MySQL/Docker/navegador local disponível. Não há dados ou serviços de produção nos testes. Execução 41100166937 aprovada no head bc9fd196a1e9ca3b8c601e654991a37c7f42a1f6; PR #10: https://github.com/dernivaljr/wiki-chem/pull/10.

## Comandos e resultados

- npm run install:clean: instalação limpa dos dois pacotes.
- npm run build e npm run lint: aprovados.
- npm test: 98 frontend + 98 backend aprovados.
- npm run db:status; npm run db:migrate (duas vezes); npm run db:status: 48 migrações, repetição sem efeitos adicionais.
- npm run test:integration: 159 testes MySQL aprovados, incluindo 15 de biblioteca.
- npm run test:e2e: 14 testes de apresentação/ativos de produção aprovados.
- npm run test:auth: 27 jornadas com API/MySQL reais aprovadas, incluindo quatro novas de biblioteca.
- npm run audit:deps e npm run audit:prod: zero vulnerabilidades em frontend/backend.
- Validação documental: UTF-8, cercas Mermaid, links locais e separação acadêmica/operacional; git diff --check. Diagramas não renderizados por ferramenta externa.

A primeira execução, 41099423882, teve uma repetição na jornada de navegação: a asserção usava texto presente tanto no leitor quanto na listagem, antes da transição terminar. A correção espera URL e h1 próprios da listagem. A execução 41100166937 aprovou todos os 396 testes, sem flakiness ou skips. Consultas intermediárias à API do GitHub apresentaram timeout/502; os logs finais e checks foram reconfirmados na retomada.

A biblioteca não concede direitos por papel ADMIN, não implementa downloads, pagamentos, hospedagem ou IA/RAG. Produto/curadoria ainda precisam validar corpus e permissões reais, termos comerciais, retenção e implantação. O último commit documental e a main pós-merge devem manter checks aprovados; a proveniência final fica no PR e em suas execuções, sem metadados operacionais na documentação acadêmica.
