# Wiki-Chem

**Pesquisa, seleção e acesso digital a guias técnicos de química analítica.**

O Wiki-Chem organiza metodologias analíticas por assunto e referência documental, apresenta prévias técnicas e permite selecionar guias digitais próprios para consulta na biblioteca do usuário. O objetivo é aproximar a pesquisa científica da experiência de um catálogo de publicações técnicas.

![Página inicial do Wiki-Chem](docs/academico/evidencias/01-home.png)

## O que a plataforma oferece

- **Pesquisa especializada:** consultas por analito, técnica, instrumento ou código de referência, com reconhecimento de termos como `ferro`/`Fe`, `UV-Vis`, `ICP-OES` e `GC-MS`.
- **Sete filtros avançados:** técnicas, tecnologias, equipamentos, matrizes, analitos, normas e segmentos, exibidos apenas quando o usuário deseja refinar a busca.
- **Catálogo de guias digitais:** título, edição, escopo resumido, classificações, referências de origem e preço em reais.
- **Carrinho e pedidos:** seleção de produtos, revisão do pedido e escolha de PIX, cartão de crédito ou boleto **em fluxo simulado, sem cobrança**.
- **Biblioteca pessoal:** acesso ao conteúdo ampliado de cada guia adquirido, com histórico e versões permitidas.
- **Administração editorial:** cadastro de metodologias, controle de versões, fontes, classificações e ofertas, com acesso restrito.

### Experiência da plataforma

| Pesquisa de metodologias | Página de um guia digital |
| :---: | :---: |
| <img src="docs/academico/evidencias/04-pesquisa.png" alt="Pesquisa simplificada com filtros avançados recolhidos" width="440"> | <img src="docs/academico/evidencias/06-previa.png" alt="Página de metodologia com referência, resumo e preço" width="440"> |
| Carrinho | Minha biblioteca |
| <img src="docs/academico/evidencias/07-carrinho.png" alt="Carrinho de guias digitais" width="440"> | <img src="docs/academico/evidencias/11-biblioteca.png" alt="Biblioteca pessoal de metodologias adquiridas" width="440"> |

Essas imagens são **capturas da aplicação executada com React, API e banco de dados reais**, em ambiente local controlado. Consulte a [galeria completa de evidências](docs/academico/evidencias/README.md); algumas telas do checkout foram aprimoradas depois da captura.

## Como funciona

**1. Pesquise** por um analito, técnica ou documento de referência. **2. Compare** prévias, aplicações e identificações das fontes. **3. Selecione** o guia desejado e revise os itens no carrinho. **4. Confirme** uma aquisição simulada. **5. Acesse** o conteúdo ampliado em *Minha biblioteca*.

O catálogo de demonstração reúne **15 guias digitais de autoria do projeto**, em português, fundamentados em documentos públicos identificados da **U.S. EPA** e do **USGS**, incluindo espectrofotometria UV-Vis, cromatografia, titulações, absorção atômica e técnicas instrumentais. O Wiki-Chem **não comercializa cópias de normas externas**: os itens oferecidos são sínteses interpretativas próprias com referências às fontes.

## Executar no seu computador

Requisitos: **Node.js 24.19+ (linha 24), npm 11+ e Docker Desktop/Compose**, com o mecanismo Docker ativo e a porta local `4180` disponível.

```bash
git clone https://github.com/dernivaljr/wiki-chem.git
cd wiki-chem
npm run demo:prepare
```

Abra **http://127.0.0.1:4180**. Você pode criar uma conta pelo cadastro da aplicação e percorrer pesquisa, carrinho, confirmação do pedido e biblioteca. Para habilitar o acesso administrativo da demonstração, execute `npm run demo:access` em terminal interativo e **não divulgue as credenciais geradas**.

Em um ambiente já preparado, utilize `npm run demo:up` para atualizar os serviços e os dados sem remover o volume do banco. Para interromper os serviços preservando os dados, utilize `npm run demo:down`.

**Importante:** o ambiente fornecido é uma demonstração funcional local. Os preços e as formas de pagamento não resultam em transferência financeira; não há emissão de nota fiscal, hospedagem pública ou operação comercial de produção. Os guias técnicos não substituem os documentos oficiais nem uma revisão científica independente.

Para instalação sem Docker, configuração de MySQL, administração operacional, migrações e testes, consulte o [guia técnico](docs/desenvolvimento/GUIA-TECNICO.md). Para executar a demonstração com detalhes e instruções de backup, consulte a [execução local](docs/desenvolvimento/DEMONSTRACAO-LOCAL.md).

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | React, TypeScript, Vite |
| API e regras de negócio | Node.js, Fastify, TypeScript, validação com Zod |
| Persistência | MySQL 8.4, migrações SQL versionadas |
| Execução local | Docker Compose |
| Verificação | Vitest, Playwright e GitHub Actions |

**Organização do repositório:** `frontend/` (interface), `backend/` (API e persistência), `demo/` (containers), `scripts/` (automação de execução) e `docs/` (especificações, arquitetura e materiais acadêmicos).

## Documentação

- [Visão geral e requisitos](docs/especificacoes/MVP-WIKI-CHEM-v1.md)
- [Arquitetura e modelo de dados](docs/arquitetura/ARQUITETURA-MVP.md)
- [Regras de catálogo, compra e biblioteca](docs/README.md)
- [Material acadêmico da FATEC](docs/academico/README.md)
- [Galeria de capturas da aplicação](docs/academico/evidencias/README.md)

## Contexto e limites

Projeto desenvolvido no curso de **Desenvolvimento de Software Multiplataforma (DSM) da FATEC**, na disciplina de Engenharia de Software II. O MVP implementa a jornada digital de pesquisa e acesso a guias técnicos, mas **não inclui IA/RAG, cobrança real, hospedagem pública ou validação científica independente**. A utilização de conteúdo de terceiros permanece sujeita às respectivas condições de uso.

**Licença do código:** [GNU GPL v2](LICENSE).
