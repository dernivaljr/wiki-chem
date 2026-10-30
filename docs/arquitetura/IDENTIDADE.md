# Identidade, sessões e perfil

## Objetivo e recorte

Implementar RF01–RF04, RNF02 e MD01: cadastro persistente, credenciais verificadas no servidor, sessão revogável, logout e perfil próprio. Preservar a interface React. A pesquisa permanece indisponível; a área de consultas passa a exigir sessão. Catálogo, comércio, recuperação de senha, e-mail verificado e IA/RAG não integram este incremento.

## Decisões mínimas adotadas

- E-mail ASCII válido, até 254 caracteres, com trim e lowercase; sem remover pontos/sufixos de provedores. Índice único ascii_bin sobre a forma normalizada. Nome de exibição com 1–100 caracteres, trim e sem controles.
- Senha com 12–128 caracteres, sem trim ou truncamento. Argon2id, salt aleatório individual, 19 MiB, duas iterações, paralelismo um. Hash codificado armazena parâmetros; nenhum texto puro é persistido ou registrado. Há limite de trabalho concorrente para evitar esgotamento de memória.
- Registro sempre CUSTOMER; campos desconhecidos, papel, estado e IDs recebidos do cliente são rejeitados. Duplicidade normalizada retorna 409 ACCOUNT_UNAVAILABLE. Cadastro não inicia sessão automaticamente.
- Cookie de sessão opaca com 32 bytes aleatórios; banco armazena somente SHA-256 do token. Cookie HttpOnly, SameSite=Lax, Path=/, sem Domain; Secure e prefixo __Host- em produção. Sem “manter conectado”: cookie de sessão do navegador.
- Expiração absoluta padrão de oito horas e inatividade de 30 minutos, configuráveis dentro de limites validados. O servidor verifica revogação, estado da conta e prazos em cada acesso. Consulta de bootstrap da sessão não renova inatividade; ações autenticadas válidas renovam até o limite absoluto.
- Login válido cria token novo e revoga o token anterior apresentado, sem invalidar arbitrariamente outros dispositivos. Logout revoga no servidor e remove o cookie; repetição não reativa sessão.
- CSRF é HMAC-SHA-256 derivado do token secreto da sessão, com domínio fixo. É entregue em JSON de login/bootstrap e mantido apenas na memória React. Comparação em tempo constante; não existe token de sessão em JSON ou localStorage.
- Escritas exigem origem exatamente igual a APP_ORIGIN, rejeitam cross-site explícito e usam JSON. PATCH do perfil e logout autenticado exigem X-CSRF-Token. Login/cadastro também verificam origem, sem depender apenas de SameSite ou ausência de CORS.
- Limites por IP nas rotas de identidade e por e-mail normalizado no login. Estado de limite é local e limitado em memória; reinício remove contadores. Operação com múltiplas instâncias requer coordenar esses limites antes de escalar. Erros de credencial não distinguem conta inexistente, bloqueada ou senha incorreta.
- Perfil só lê/edita o usuário da sessão. E-mail e papel são somente leitura. Não há parâmetro de proprietário aceito nem endpoint de promoção.
- Primeiro administrador: comando local interativo, habilitação explícita, conta operacional distinta, senha sem eco e sem argumentos/variáveis de senha de usuário. Registro do responsável no banco. Repetição para o mesmo admin é no-op; não altera senha nem promove cliente existente. Outro primeiro admin é recusado. Não há endpoint público ou senha padrão.

## Contratos implementados

Prefixo /api/v1. Sucesso usa data; erros seguem o envelope central com requestId. Respostas não são armazenáveis em cache.

| Método/rota | Entrada | Saída |
| --- | --- | --- |
| POST /auth/register | displayName, email, password | 201 com usuário seguro, sem sessão |
| POST /auth/login | email, password | 200 com user, csrfToken, expiresAt; cookie HttpOnly |
| GET /auth/session | Cookie | 200 com user, csrfToken, expiresAt ou 401 |
| POST /auth/logout | JSON vazio e X-CSRF-Token quando há cookie válido | 204; revoga token e apaga cookie |
| GET /me | Cookie | 200 com perfil próprio |
| PATCH /me | displayName e X-CSRF-Token | 200 com perfil atualizado |

401 significa sessão inválida/expirada ou credencial incorreta, conforme o código. 403 cobre origem/CSRF; 409 duplicidade/conflito; 429 limite de tentativas; 503 indisponibilidade ou limite de trabalho. Erros não expõem SQL, senha, hash, cookie, token, stack ou dados de outra conta.

## Interface e autorização

Cadastro confirmado retorna à entrada com mensagem baseada na resposta real. Login retorna somente para /consultas ou /perfil, com query permitida e sem origem externa. A proteção React aguarda bootstrap; indisponibilidade de rede oferece tentar novamente, sem mostrar página protegida. 401 limpa estado sensível e solicita novo login. Perfil edita somente nome. Cabeçalho oferece consultas, perfil e logout; falha de logout é exibida, sem afirmar revogação não confirmada.

O backend continua sendo a autoridade; uma rota React protegida não autoriza dados. Não existem ainda dados de pesquisa nem conteúdo pago. A interface indica pesquisa indisponível e não executa buscas fictícias.

## Verificação e pendências

Testes devem cobrir hash e limites, validação, origem, CSRF, cadastro duplicado e concorrente, rotação/revogação, expiração absoluta/inatividade, conta bloqueada, persistência entre instâncias de API, isolamento, perfil e bootstrap administrativo. MySQL real verifica persistência/constraints; navegador executa fluxos reais por proxy. Testes isolados de apresentação usam respostas explicitamente controladas e não substituem a integração.

Retenção/limpeza de sessões expiradas, implantação HTTPS, recuperação, verificação de e-mail e textos jurídicos exigem incrementos próprios. Políticas comerciais/editoriais e permissões de conteúdo permanecem propostas pendentes.

Referências: [OWASP — armazenamento de senhas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [node-argon2](https://github.com/ranisalt/node-argon2), [cookies Fastify](https://github.com/fastify/fastify-cookie).

## Resultados da verificação funcional

A verificação automatizada confirmou cadastro persistente com papel CUSTOMER, rejeição de campos privilegiados, normalização/duplicidade e conflito entre cadastros simultâneos. Os hashes usam Argon2id com salts distintos; senha incorreta, conta ausente e conta bloqueada não autenticam.

No MySQL real, sessão sobreviveu à recriação da instância da API; rotação e logout invalidaram o token anterior. Foram comprovadas expiração absoluta e por inatividade, ausência de renovação pelo bootstrap, isolamento de perfil, edição exclusiva do nome e rejeição de CSRF/origem inválidos. A rotina de provisionamento inicial foi idempotente e recusou promoção de cliente e criação de outro primeiro administrador.

As jornadas de navegador confirmaram cadastro/login reais, retorno seguro, perfil persistido após recarga e nova aba, cookie HttpOnly, ausência de credenciais em localStorage, logout, revogação, falha de rede e responsividade do cabeçalho autenticado. A troca de identidade remonta o formulário para não reutilizar campos do usuário anterior.

Esses resultados comprovam o recorte de identidade e suas regressões. Não demonstram pesquisa, catálogo, comércio ou conformidade integral de acessibilidade. Recuperação, e-mail verificado, condições jurídicas e implantação pública continuam fora deste incremento.
