# Execução operacional da demonstração isolada

Este guia é interno e não integra o material acadêmico. Requer Node.js 24.19/npm 11 e Docker com Compose v2, daemon em execução e porta local 4180 livre. Não contrata serviços nem publica o sistema na internet.

```sh
npm run demo:prepare
npm run demo:access
```

O primeiro comando constrói React/API, aguarda MySQL 8.4, aplica migrações e prepara cinco exemplos acadêmicos pelos contratos editoriais reais. Usa exclusivamente NODE_ENV=test, banco wikichem_test_demo, habilitações MYSQL_TEST_ALLOW/DEMO_ALLOW e projeto Compose wikichem-academic-demo. O frontend fica em http://127.0.0.1:4180; API/MySQL não publicam portas no host. A origem deve ser usada exatamente como indicada, devido ao controle de origem/CSRF.

Os exemplos são material original de software, não métodos laboratoriais. Autoria é atribuída ao projeto/geração de fixtures e a conferência é automatizada, explicitamente sem revisão humana científica. Documentos de classificação são rótulos sintéticos, não normas analíticas existentes ou declarações de vigência. Publicação é um estado exercitado somente no banco de testes. Nenhuma permissão externa ou licença comercial é presumida; corpus real exige curadoria e autorizações antes de uso fora dos testes. Não há semente para produção.

O segundo comando exige terminal interativo. Gera nova senha aleatória da conta administrativa sintética, revoga suas sessões anteriores e exibe a credencial uma única vez. Não existe senha padrão; a senha nunca é salva em arquivo. Não registre a saída em capturas, arquivos ou histórico. Clientes podem cadastrar sua própria conta local para demonstrar a jornada. A conta de automação é uma fixture, não identidade de pessoa nem evidência de revisão científica.

Segredos de infraestrutura são gerados com aleatoriedade criptográfica em diretório temporário do sistema operacional, fora do repositório, com permissões restritas em sistemas que as suportam. O caminho é mostrado sem valores secretos. Em Windows, a proteção depende também das ACLs do perfil temporário. Não copie esses arquivos ao projeto. Se forem apagados enquanto existir volume, a preparação recusa gerar credenciais incompatíveis: restaure a configuração local preservada ou remova explicitamente apenas o volume demonstrativo com o projeto identificado.

```sh
npm run demo:status
npm run demo:down
npm run demo:up
npm run demo:backup
npm run demo:restore -- CAMINHO_ABSOLUTO_DO_BACKUP_GERADO
```

`down` preserva o volume. `up` repete a preparação concluída sem apagar contas/pedidos; preparação parcial ou banco já ocupado sem marcador é recusado, exigindo diagnóstico ou reset explícito. Backup inclui apenas o banco demonstrativo e fica fora do repositório. Trate-o como restrito, pois contém hashes de credenciais e sessões. Restore aceita apenas arquivo gerado no diretório próprio, com manifesto de projeto/banco e checksum válido; interrompe API/frontend durante a restauração. Não testa recuperação de produção nem oferece importação de SQL arbitrário.

```sh
npm run demo:verify
npm run demo:reset -- --confirm-demo-reset
```

`verify` usa contas aleatórias em memória e verifica prontidão, catálogo, aquisição, direito, backup/restauração, recusa de manifesto alterado e ausência de DDL na conta da API. Requer demonstração recém-preparada; não usar durante uma apresentação que precise preservar o estado. `reset` remove somente os volumes do projeto demonstrativo explicitamente nomeado. Nunca configure esses comandos com ambientes ou dados reais. Após reset, execute prepare novamente.

## Evidências e desempenho

Os comandos existentes de integração usam banco descartável wikichem_test_<sufixo>, NODE_ENV=test e MYSQL_TEST_ALLOW=true, como no README. `npm run test:integration` mede pesquisa com 5/100/500 publicações sintéticas, gravando .artifacts/performance.json. Não utiliza SLA artificial nem representa HTTP/renderização/carga concorrente. `npm run evidence:academic` executa uma jornada Playwright com API/MySQL reais, recria apenas o banco de testes explicitamente permitido e grava capturas mascaradas e manifesto em .artifacts/evidence. Exige Chromium instalado e as credenciais operacionais desse banco de testes; não apontar ao estado de apresentação a preservar.

As verificações automatizadas executam essas operações sem testes manuais do usuário. Apenas PNGs revisados e métricas sem segredos são incorporados ao material acadêmico; dumps, cookies, traces de sessão e segredos temporários não são publicados. Docker/MySQL/Chromium não estavam instalados no executor Windows inicial: o ambiente completo e a restauração são validados no runner Linux isolado, com a limitação registrada nos resultados.
