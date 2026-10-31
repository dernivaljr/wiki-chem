import { createHash } from 'node:crypto'
import type { Editor, Facet, TermInput } from '../../src/modules/catalog/catalog.contracts.js'
import { emptyEditor } from '../../src/modules/catalog/catalog.rules.js'

export interface TechnicalSheetSpec {
  slug: string
  documentCode: string
  title: string
  freeSummary: string
  publicDescription: string
  defaultPriceCentavos: string | null
  fullDescription: string
  fullProcedure: string
  classifications: Record<Facet, readonly string[]>
  source: {
    referenceText: string
    canonicalUrl: string
    ownerCredit: string
    editionLabel: string
    locator: string
  }
}

const term = (code: string, label: string): TermInput => ({
  code,
  label,
  active: true,
  issuer: '',
  identifier: '',
  editionLabel: '',
  verifiedStatus: 'PENDING',
})

const standard = (code: string, label: string, issuer: string, identifier: string, editionLabel: string): TermInput => ({
  code,
  label,
  active: true,
  issuer,
  identifier,
  editionLabel,
  verifiedStatus: 'VERIFIED',
})

const epaIssuer = 'U.S. Environmental Protection Agency (EPA)'
const usgsIssuer = 'U.S. Geological Survey (USGS)'

export const technicalTaxonomies: Readonly<Record<Facet, readonly TermInput[]>> = {
  techniques: [
    term('espectrofotometria-uv-vis', 'Espectrofotometria de absorção molecular'),
    term('colorimetria-fluxo', 'Colorimetria automatizada em fluxo'),
    term('icp-oes', 'Espectrometria de emissão óptica (ICP-OES)'),
    term('icp-ms', 'Espectrometria de massas com plasma (ICP-MS)'),
    term('absorcao-atomica', 'Espectrometria de absorção atômica (AAS)'),
    term('cromatografia-ions', 'Cromatografia de íons (IC)'),
    term('cromatografia-gasosa', 'Cromatografia gasosa (GC)'),
    term('titrimetria-precipitacao', 'Titrimetria de precipitação'),
    term('potenciometria-eletrometrica', 'Potenciometria eletrométrica'),
    term('nefelometria-optica', 'Nefelometria óptica'),
  ],
  technologies: [
    term('uv-vis', 'UV-Vis (complexação molecular)'),
    term('fluxo-continuo-colorimetrico', 'Fluxo contínuo segmentado / FIA fotométrico'),
    term('plasma-indutivamente-acoplado', 'Plasma de argônio indutivamente acoplado'),
    term('vapor-frio-cvaas', 'Geração de vapor frio (CVAAS)'),
    term('atomizacao-chama-faas', 'Atomização em chama (FAAS)'),
    term('condutimetria-suprimida', 'Detecção condutimétrica com supressão química'),
    term('gc-ms', 'Espectrometria de massas acoplada a GC (GC-MS)'),
    term('argentometria', 'Argentometria com nitrato de prata'),
    term('eletrodo-combinado-vidro', 'Eletrodo combinado de vidro com compensação térmica'),
    term('espalhamento-nefelometrico-90', 'Espalhamento de luz a 90°'),
  ],
  equipment: [
    term('espectrofotometro-uv-vis', 'Espectrofotômetro UV-Vis'),
    term('analisador-colorimetrico-fluxo', 'Analisador colorimétrico de fluxo contínuo'),
    term('espectrometro-icp-oes', 'Espectrômetro ICP-OES'),
    term('espectrometro-icp-ms', 'Espectrômetro ICP-MS'),
    term('espectrometro-aas', 'Espectrômetro de absorção atômica'),
    term('cromatografo-ions', 'Cromatógrafo de íons'),
    term('sistema-gc-ms', 'Cromatógrafo a gás com espectrômetro de massas (GC-MS)'),
    term('conjunto-titrimetrico', 'Bureta calibrada e conjunto titrimétrico'),
    term('medidor-ph', 'Medidor eletrométrico de pH'),
    term('turbidimetro-nefelometrico', 'Turbidímetro nefelométrico'),
  ],
  matrices: [
    term('agua-potavel', 'Água potável e de abastecimento'),
    term('agua-superficial-subterranea', 'Água superficial e subterrânea'),
    term('efluentes-residuos-aquosos', 'Efluentes e resíduos aquosos'),
    term('solos-sedimentos-lodos', 'Solos, sedimentos e lodos'),
    term('extratos-digeridos-aquosos', 'Extratos aquosos, digeridos ácidos e soluções de combustão'),
  ],
  analytes: [
    term('ferro-fe', 'Ferro (Fe)'),
    term('cobre-cu', 'Cobre (Cu)'),
    term('chumbo-pb', 'Chumbo (Pb)'),
    term('zinco-zn', 'Zinco (Zn)'),
    term('arsenio-as', 'Arsênio (As)'),
    term('manganes-mn', 'Manganês (Mn)'),
    term('mercurio-hg', 'Mercúrio (Hg)'),
    term('cromo-hexavalente', 'Cromo hexavalente — Cr(VI)'),
    term('cloreto', 'Cloreto (Cl⁻)'),
    term('fluoreto', 'Fluoreto (F⁻)'),
    term('nitrato', 'Nitrato (NO₃⁻)'),
    term('nitrito', 'Nitrito (NO₂⁻)'),
    term('fosforo-fosfato', 'Fósforo / Fosfato (P / PO₄³⁻)'),
    term('sulfato', 'Sulfato (SO₄²⁻)'),
    term('nitrogenio-amoniacal', 'Nitrogênio amoniacal (NH₃-N)'),
    term('dqo', 'Demanda química de oxigênio (DQO)'),
    term('ph', 'Potencial hidrogeniônico (pH)'),
    term('turbidez', 'Turbidez'),
    term('benzeno-tolueno-cov', 'Compostos orgânicos voláteis — Benzeno e Tolueno'),
  ],
  standards: [
    standard('usgs-tei-223', 'USGS TEI-223', usgsIssuer, 'USGS Trace Elements Investigations Report 223', 'Relatório TEI-223 (1952)'),
    standard('epa-180-1', 'EPA 180.1', epaIssuer, 'EPA Method 180.1', 'Ago./1993'),
    standard('epa-200-7', 'EPA 200.7', epaIssuer, 'EPA Method 200.7', 'Rev. 4.4 (1994)'),
    standard('epa-200-8', 'EPA 200.8', epaIssuer, 'EPA Method 200.8', 'Rev. 5.4 (1994)'),
    standard('epa-245-1', 'EPA 245.1', epaIssuer, 'EPA Method 245.1', 'Rev. 3.0 (1994)'),
    standard('epa-300-0', 'EPA 300.0', epaIssuer, 'EPA Method 300.0', 'Rev. 2.1 (ago./1993)'),
    standard('epa-350-1', 'EPA 350.1', epaIssuer, 'EPA Method 350.1', 'Rev. 2.0 (ago./1993)'),
    standard('epa-353-2', 'EPA 353.2', epaIssuer, 'EPA Method 353.2', 'Rev. 2.0 (ago./1993)'),
    standard('epa-365-1', 'EPA 365.1', epaIssuer, 'EPA Method 365.1', 'Rev. 2.0 (ago./1993)'),
    standard('epa-410-4', 'EPA 410.4', epaIssuer, 'EPA Method 410.4', 'Rev. 2.0 (ago./1993)'),
    standard('epa-7000b', 'EPA 7000B', epaIssuer, 'EPA SW-846 Method 7000B', 'Rev. 2 (fev./2007)'),
    standard('epa-7196a', 'EPA 7196A', epaIssuer, 'EPA SW-846 Method 7196A', 'SW-846 (jul./1992)'),
    standard('epa-8260d', 'EPA 8260D', epaIssuer, 'EPA SW-846 Method 8260D', 'Rev. 4 (jun./2018)'),
    standard('epa-9040c', 'EPA 9040C', epaIssuer, 'EPA SW-846 Method 9040C', 'Rev. 3 (nov./2004)'),
    standard('epa-9253', 'EPA 9253', epaIssuer, 'EPA SW-846 Method 9253', 'Rev. 0 (set./1994)'),
  ],
  segments: [
    term('saneamento-agua', 'Saneamento e controle de água'),
    term('monitoramento-ambiental', 'Monitoramento ambiental'),
    term('residuos-efluentes', 'Caracterização de resíduos e efluentes'),
    term('geoquimica-matrizes-minerais', 'Geoquímica e matrizes minerais'),
  ],
}

export const technicalSheets: readonly TechnicalSheetSpec[] = [
  {
    slug: 'info-usgs-tei-223-ferro-fenantrolina',
    documentCode: 'WK-ANL-001',
    title: 'Determinação espectrofotométrica de ferro total com 1,10-fenantrolina (UV-Vis)',
    freeSummary:
      'Guia técnico interpretativo sobre a quantificação de ferro total em águas e extratos ácidos por espectrofotometria UV-Vis a 510 nm. Fundamenta a redução quantitativa a Fe²⁺ e a formação do quelato tris(1,10-fenantrolina)ferro(II) a partir do estudo clássico USGS TEI-223.',
    publicDescription:
      'Aborda o equilíbrio químico de complexação entre íons ferrosos (Fe²⁺) e 1,10-fenantrolina em meio tamponado após redução prévia do ferro trivalente (Fe³⁺), cobrindo janela de estabilidade de pH, interferentes competitivos (pirofosfato, cianeto e cátions de transição), calibração pela lei de Beer-Lambert e critérios conceituais de verificação espectrofotométrica.',
    defaultPriceCentavos: '3900',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Este guia técnico original do Wiki-Chem examina a determinação espectrofotométrica de ferro total dissolvido ou digerido com base no estudo de referência USGS TEI-223. A reação fundamenta-se na conversão integral das espécies de ferro ao estado divalente (Fe²⁺) por agente redutor compatível (tipicamente cloridrato de hidroxilamina em meio levemente ácido), seguida da coordenação estequiométrica 1:3 com 1,10-fenantrolina (orto-fenantrolina) para originar o cátion complexo laranja-avermelhado [Fe(C₁₂H₈N₂)₃]²⁺, cuja banda de transferência de carga metal-ligante apresenta máximo de absorção em torno de 510 nm.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Águas superficiais, águas subterrâneas filtradas e extratos ácidos provenientes da abertura de minerais ou particulados.',
      '- Quando há óxidos hidratados coloidais, complexos orgânicos naturais ou material particulado fino, a etapa de solubilização ácida a quente precede a redução para assegurar que todo o ferro passe à forma iônica reativa.',
      '- O ajuste de pH com sistema tampão acetato na faixa aproximada de 3,0 a 6,0 sustenta a cinética rápida e a estabilidade termodinâmica do complexo colorido sem precipitar hidróxidos férricos.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Agentes fortemente quelantes ou precipitantes (pirofosfato, polifosfatos, cianeto, oxalato e citrato em excesso) competem pelo Fe²⁺ e retardam ou suprimem o desenvolvimento de cor; a fervura ácida prévia hidrolisa polifosfatos condensados.',
      '- Cátions metálicos como Cu²⁺, Co²⁺, Ni²⁺, Zn²⁺ e Bi³⁺ consomem reagente cromogênico ou geram turbidez/absorção secundária; superam-se pelo emprego de excesso estequiométrico de 1,10-fenantrolina ou diluição dentro da faixa linear.',
      '- Coloração natural húmica ou turbidez residual exige filtração prévia e avaliação de branco de amostra sem o reagente cromogênico.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Preparação óptica e vidraria: empregar vidraria lavada com ácido diluído e enxaguada com água reagente isenta de traços de ferro; selecionar cubetas ópticas pareadas de caminho óptico conhecido (1 cm ou superior para baixas concentrações).',
      '- Arquitetura de redução e tamponamento: em alíquota acidificada da amostra ou digerido, promover a redução completa de Fe³⁺ a Fe²⁺ antes de elevar o pH com tampão acetato, evitando hidrólise prematura de espécies férricas.',
      '- Complexação e estabilização fotométrica: adicionar solução de 1,10-fenantrolina sob homogeneização, completar ao volume aferido e respeitar o intervalo de desenvolvimento pleno da cor antes da leitura a 510 nm frente ao branco de reagentes.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: A_corr = A_amostra - A_branco = a · b · C_leitura + intercepto',
      '- Construir curva analítica externa com ao menos cinco níveis de concentração de Fe²⁺ preparados sob a mesma matriz ácida e sequência de reagentes das amostras.',
      '- Converter a concentração lida no balão volumétrico final para a amostra original aplicando o fator de diluição ou razão volume aferido / volume de alíquota: C_Fe (mg/L) = C_leitura × (V_final / V_alíquota).',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Branco de reagentes processado integralmente a cada bateria para monitorar contaminação residual de ácidos, água e sais tampão.',
      '- Padrão independente de verificação de calibração no terço médio da faixa linear e duplicata analítica para avaliar repetibilidade fotométrica.',
      '- Ensaio de adição de padrão (fortificação de matriz) quando houver suspeita de inibição por ligantes complexantes na água ou no extrato.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Conteúdo interpretativo autoral do Wiki-Chem elaborado para estudo, treinamento e estruturação analítica. Não reproduz o texto integral da publicação USGS TEI-223, não declara revisão científica humana nem substitui validação intralaboratorial; consulte a fonte pública oficial nas referências.',
    ].join('\n'),
    classifications: {
      techniques: ['espectrofotometria-uv-vis'],
      technologies: ['uv-vis'],
      equipment: ['espectrofotometro-uv-vis'],
      matrices: ['agua-superficial-subterranea', 'extratos-digeridos-aquosos'],
      analytes: ['ferro-fe'],
      standards: ['usgs-tei-223'],
      segments: ['monitoramento-ambiental', 'geoquimica-matrizes-minerais'],
    },
    source: {
      referenceText:
        'Cuttitta, F. (1952). The colorimetric determination of total iron with o-phenanthroline: a spectrophotometric study. U.S. Geological Survey Trace Elements Investigations Report 223 (DOI: 10.3133/tei223).',
      canonicalUrl: 'https://pubs.usgs.gov/publication/tei223',
      ownerCredit: 'U.S. Geological Survey (USGS) — publicação governamental de acesso público',
      editionLabel: 'Relatório TEI-223 (1952)',
      locator: 'USGS Publications Warehouse — Report TEI-223',
    },
  },
  {
    slug: 'info-epa-200-7-metais-icp-oes',
    documentCode: 'WK-ANL-002',
    title: 'Determinação multielementar de metais e elementos-traço em águas e resíduos por ICP-OES (EPA 200.7)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA 200.7 (Rev. 4.4) para quantificação multielementar de metais dissolvidos e totais recuperáveis por ICP-OES. Sintetiza nebulização pneumática, excitação em plasma de argônio, correção espectral e controle de matriz.',
    publicDescription:
      'Apresenta uma análise estruturada da espectrometria de emissão óptica com plasma indutivamente acoplado (ICP-OES / ICP-AES) aplicada a águas potáveis, águas naturais, efluentes e digeridos ácidos de resíduos sólidos, detalhando seleção de linhas atômicas e iônicas, correção de fundo e interferências interelementares (IEC), compatibilização ácida e cálculos de recuperação.',
    defaultPriceCentavos: '5900',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Fundamentado na revisão 4.4 do Método EPA 200.7, este guia interpretativo do Wiki-Chem aborda a determinação simultânea ou sequencial de metais e semimetais (incluindo Fe, Cu, Pb, Zn, Mn e As) por espectrometria de emissão óptica em plasma de argônio acoplado indutivamente. O aerossol fino da solução acidificada atravessa a zona de alta temperatura do plasma (6.000 a 10.000 K), sofrendo dessolvatação, vaporização, atomização e ionização; o decaimento radiativo emite fótons em comprimentos de onda característicos cuja intensidade é proporcional à concentração elementar.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Fração dissolvida: filtração em membrana de 0,45 µm no momento da coleta ou recepção elegível, seguida de preservação nítrica (pH < 2).',
      '- Fração total recuperável em águas, efluentes, lodos, sedimentos e solos: digestão ácida oxidante controlada com HNO₃ e HCl diluídos, seguida de recomposição volumétrica e remoção de particulados insolúveis para proteger o nebulizador.',
      '- Sólidos totais dissolvidos (STD) devem ser mantidos dentro da tolerância física do sistema de introdução para prevenir incrustação salina no injetor da tocha.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Sobreposições espectrais diretas de linhas de matriz rica em Fe, Al, Ca, Mg ou Ti sobre elementos-traço: mitigadas pela escolha de linhas alternativas livres de coincidência, correção de fundo em pontos laterais e coeficientes de correção interelementar (IEC) verificados periodicamente.',
      '- Efeitos físicos de transporte e nebulização: diferenças de viscosidade, tensão superficial e teor ácido entre curva de calibração e digeridos causam erro sistemático; exige-se equiparação da matriz ácida ou emprego de padrão interno (ex.: ítrio ou escândio).',
      '- Ionização facilmente induzível por metais alcalinos em configuração axial: controlada por condições robustas de potência de RF e vazão do gás nebulizador.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Estabilização do plasma e alinhamento óptico: aguardar equilíbrio térmico do gerador de RF, policromador/detector e fluxo de argônio; verificar resolução espectral, perfil de linha e razão Mg II / Mg I como indicador de robustez do plasma.',
      '- Calibração multielementar compatível: preparar branco ácido e padrões rastreáveis agrupados por compatibilidade química (evitando coprecipitação de haletos ou oxiânions incompatíveis), respeitando o mesmo teor de HNO₃/HCl dos extratos.',
      '- Sequência analítica e lavagem: intercalar brancos de memória após amostras concentradas, monitorando o retorno da linha de base nas raias selecionadas antes da leitura seguinte.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: I_líquida = I_pico - I_fundo - Σ(k_ij · C_interferente_j)',
      '- Para amostras aquosas digeridas: C_amostra (mg/L) = C_extrato × (V_final / V_inicial).',
      '- Para matrizes sólidas em base seca: C_sólido (mg/kg) = [C_extrato (mg/L) × V_final (L)] / [m_úmida (kg) × (fração de sólidos secos)].',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Verificação inicial e contínua da calibração (ICV/CCV) com solução de fonte independente e checagem de branco contínuo (CCB).',
      '- Solução de verificação de interferência espectral (ICSA/ICSAB) contendo macroconstituintes (Al, Ca, Fe, Mg) para comprovar ausência de falsos positivos nos canais-traço.',
      '- Branco de preparo (MB), amostra fortificada de laboratório (LFB/LCS) e fortificação de matriz (MS/MSD) por lote de digestão.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia interpretativo autoral do Wiki-Chem baseado nos metadados e princípios públicos do Método EPA 200.7 (Rev. 4.4). Não reproduz tabelas normativas integrais, não constitui cópia licenciada de norma nem substitui validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['icp-oes'],
      technologies: ['plasma-indutivamente-acoplado'],
      equipment: ['espectrometro-icp-oes'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos', 'solos-sedimentos-lodos'],
      analytes: ['ferro-fe', 'cobre-cu', 'chumbo-pb', 'zinco-zn', 'arsenio-as', 'manganes-mn'],
      standards: ['epa-200-7'],
      segments: ['saneamento-agua', 'monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'U.S. EPA (1994). Method 200.7: Determination of Metals and Trace Elements in Water and Wastes by Inductively Coupled Plasma-Atomic Emission Spectrometry, Revision 4.4. Cincinnati, OH.',
      canonicalUrl:
        'https://www.epa.gov/esam/method-2007-determination-metals-and-trace-elements-water-and-wastes-inductively-coupled',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — programa ESAM / documento público',
      editionLabel: 'Rev. 4.4 (1994)',
      locator: 'Sumário público ESAM e escopo técnico do Método EPA 200.7 (Rev. 4.4)',
    },
  },
  {
    slug: 'info-epa-200-8-elementos-traco-icp-ms',
    documentCode: 'WK-ANL-003',
    title: 'Determinação de elementos-traço em águas e resíduos por ICP-MS (EPA 200.8)',
    freeSummary:
      'Guia técnico interpretativo fundamentado no Método EPA 200.8 (Rev. 5.4) para quantificação ultratraço de metais e semimetais por espectrometria de massas com plasma (ICP-MS). Detalha seleção isotópica, padronização interna e controle de íons poliatômicos.',
    publicDescription:
      'Explora a extração de íons monocarregados gerados em plasma de argônio através da interface sampler/skimmer para separação quadrupolar por razão massa/carga (m/z), discutindo correções isobáricas elementares, interferências poliatômicas críticas (como ⁴⁰Ar³⁵Cl⁺ sobre ⁷⁵As⁺), limite de sólidos dissolvidos e compensação de supressão espacial por padrões internos.',
    defaultPriceCentavos: '6400',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Elaborado pelo Wiki-Chem com base documental no Método EPA 200.8 (Rev. 5.4), este guia trata da determinação multielementar em níveis de µg/L de elementos-traço como As, Pb, Cu, Zn e Mn em águas e extratos digeridos. Os íons positivos formados no plasma de argônio à pressão atmosférica são expandidos supersonicamente por cones metálicos refrigerados até o analisador de massas sob alto vácuo, onde são discriminados pela razão m/z e contados por multiplicador de elétrons.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Águas potáveis, superficiais, subterrâneas e efluentes/extratos previamente filtrados ou submetidos a digestão nítrica limpa.',
      '- Teor de sólidos totais dissolvidos mantido tipicamente abaixo de 0,2% (m/v) para evitar obstrução dos orifícios dos cones de níquel ou platina e deriva acentuada de sensibilidade.',
      '- Preferência por meio nítrico ultrapuro diluído, minimizando a introdução desnecessária de íons cloreto ou sulfato quando isótopos sujeitos a poliatômicos de Cl e S estiverem no escopo.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Interferências isobáricas diretas (isótopos de elementos distintos na mesma massa nominal, como somas isotópicas em Pb, onde se monitora ²⁰⁶Pb + ²⁰⁷Pb + ²⁰⁸Pb para compensar variações naturais de abundância radiogênica).',
      '- Íons poliatômicos formados entre gás do plasma, solvente e matriz: ex.: ⁴⁰Ar³⁵Cl⁺ em m/z 75 interferindo sobre ⁷⁵As⁺, e óxidos refratários MO⁺/duplamente carregados M²⁺ controlados pela otimização da taxa CeO⁺/Ce⁺.',
      '- Efeitos de carga espacial (matrizes pesadas suprimindo íons leves): corrigidos pelo pareamento de padrões internos próximos em massa e primeiro potencial de ionização (ex.: ⁶Li, ⁴⁵Sc, ⁷²Ge, ¹¹⁵In, ²⁰⁹Bi).',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Sintonia diária (tuning) do espectrômetro: verificar calibração de eixo de massa, largura de pico na meia altura, sensibilidade em baixas/médias/altas massas e razões de óxidos e íons duplamente carregados antes de iniciar a calibração.',
      '- Adição contínua ou em alíquota de padrões internos: assegurar concentração constante da mistura de padrões internos em todos os brancos, curvas, controles e amostras, monitorando a recuperação relativa do sinal interno ao longo da corrida.',
      '- Aquisição e diluição de proteção: realizar varredura preliminar ou diluição criteriosa em amostras de condutividade/STD desconhecido para preservar o detector na região de contagem de pulsos ou calibração cruzada pulso/analógica.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: Razão_analítica = (CPS_analito_corrigido / CPS_padrão_interno) = m · C_analito + b',
      '- Para o chumbo, somar as contagens líquidas dos isótopos m/z 206, 207 e 208 antes de calcular a razão frente ao padrão interno pesado (como ²⁰⁹Bi ou ¹⁵⁹Tb/¹⁷⁵Lu).',
      '- Se a intensidade do padrão interno na amostra cair fora da faixa operacional aceitável em relação ao branco de calibração, diluir a amostra e reanalisar para eliminar supressão não linear de matriz.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Monitoramento sistemático de brancos de reagentes e de memória com reagentes grau traço-metais.',
      '- Padrão de verificação de calibração inicial/contínuo, amostra de controle laboratorial e ensaios de recuperação em matriz fortificada.',
      '- Registro da estabilidade dos padrões internos como critério objetivo de aceitação de cada injeção.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Síntese interpretativa original do Wiki-Chem fundamentada na documentação pública do Método EPA 200.8 (Rev. 5.4). Não comercializa nem reproduz o documento governamental externo e não substitui validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['icp-ms'],
      technologies: ['plasma-indutivamente-acoplado'],
      equipment: ['espectrometro-icp-ms'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['arsenio-as', 'chumbo-pb', 'cobre-cu', 'zinco-zn', 'manganes-mn'],
      standards: ['epa-200-8'],
      segments: ['saneamento-agua', 'monitoramento-ambiental'],
    },
    source: {
      referenceText:
        'U.S. EPA (1994). Method 200.8: Determination of Trace Elements in Waters and Wastes by Inductively Coupled Plasma-Mass Spectrometry, Revision 5.4. Cincinnati, OH.',
      canonicalUrl:
        'https://www.epa.gov/esam/epa-method-2008-determination-trace-elements-waters-and-wastes-inductively-coupled-plasma-mass',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — programa ESAM / documento público',
      editionLabel: 'Rev. 5.4 (1994)',
      locator: 'Ficha pública ESAM e escopo analítico do Método EPA 200.8 (Rev. 5.4)',
    },
  },
  {
    slug: 'info-epa-245-1-mercurio-cvaas',
    documentCode: 'WK-ANL-004',
    title: 'Determinação de mercúrio em água por absorção atômica com vapor frio — CVAAS (EPA 245.1)',
    freeSummary:
      'Guia técnico interpretativo sobre a determinação de mercúrio total em água por absorção atômica com geração de vapor frio (CVAAS) a 253,7 nm, fundamentado no Método EPA 245.1 (Rev. 3.0). Aborda digestão oxidante, redução a Hg⁰ e controle de perdas por volatilização.',
    publicDescription:
      'Analisa as etapas químicas críticas para quantificação de mercúrio inorgânico e organomercúrio em matrizes aquosas: oxidação ácida com permanganato e persulfato a quente para mineralização completa a Hg²⁺, eliminação do excesso oxidante, redução instantânea a vapor atômico Hg⁰ com cloreto estanoso e medição óptica em célula de quartzo a 253,7 nm.',
    defaultPriceCentavos: '4900',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Com base técnica no Método EPA 245.1 (Rev. 3.0), este guia autoral do Wiki-Chem detalha a espectrometria de absorção atômica por vapor frio (CVAAS), singular por dispensar chama ou forno eletrotérmico graças à pressão de vapor apreciável do mercúrio elementar à temperatura ambiente. Todas as espécies dissolvidas ou associadas a ligantes orgânicos são primeiramente oxidadas a íon mercúrico (Hg²⁺) e, em sistema fechado de aeração, reduzidas por Sn²⁺ a átomos livres de Hg⁰ no estado fundamental, que absorvem a linha de ressonância em 253,7 nm.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Águas potáveis, superficiais, subterrâneas e efluentes aquosos preservados em meio ácido (HNO₃ pH < 2) em frascos de vidro borossilicato ou fluoropolímero rigorosamente descontaminados.',
      '- Compostos alquilmercúrio e complexos com matéria orgânica dissolvida não são reduzidos diretamente pelo SnCl₂ a frio; por isso, padrões e amostras passam pelo mesmo ciclo oxidativo com H₂SO₄, HNO₃, KMnO₄ e K₂S₂O₈ sob aquecimento brando.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Sulfetos e matéria orgânica elevada consomem permanganato ou sequestram Hg²⁺; a persistência da coloração violácea na digestão confirma excesso oxidante suficiente.',
      '- Cloro livre em águas cloradas gera absorção UV e volatilização de Cl₂; é neutralizado pela adição controlada de cloridrato de hidroxilamina-cloreto de sódio antes da aeração.',
      '- Compostos orgânicos aromáticos voláteis e condensação de vapor d’água na janela da célula óptica provocam absorção de fundo inespecífica em 253,7 nm; mitigam-se com purga prévia sem redutor, tubo dessecante e correção de fundo.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Mineralização equiparada de curva e amostras: submeter brancos, padrões de calibração e amostras exatamente ao mesmo protocolo ácido-oxidante e resfriamento antes de reduzir o excesso de MnO₄⁻/MnO₂ com hidroxilamina.',
      '- Geração de vapor e purga fechada: adicionar o agente redutor SnCl₂ imediatamente antes de vedar o frasco gerador ou acionar a válvula do sistema gás-líquido, evitando escape fugitivo de Hg⁰ para o ambiente.',
      '- Leitura óptica e armadilha de exaustão: registrar a altura ou área máxima de absorbância a 253,7 nm até estabilização e direcionar o gás efluente para armadilha oxidante/adsorvente de retenção de vapor de mercúrio.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: A_líquida (ou Área_pico) = m · C_Hg (µg/L) + b',
      '- Verificar efeito de memória entre leituras consecutivas com solução ácida de limpeza até retorno integral à linha de base, pois o mercúrio adsorve facilmente em tubulações poliméricas envelhecidas.',
      '- Aplicar fator de diluição quando amostras com demanda oxidante elevada ou concentração acima do padrão superior forem fracionadas antes da digestão.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Branco de reagentes digerido completo para rastrear traços de Hg em ácidos concentrados e permanganato.',
      '- Padrão de verificação de fonte independente, duplicata de amostra e recuperação de matriz fortificada (incluindo verificação da eficiência oxidativa).',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia interpretativo original do Wiki-Chem fundamentado no Método EPA 245.1 (Rev. 3.0). Não reproduz o texto normativo externo nem substitui protocolos de segurança ocupacional e validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['absorcao-atomica'],
      technologies: ['vapor-frio-cvaas'],
      equipment: ['espectrometro-aas'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['mercurio-hg'],
      standards: ['epa-245-1'],
      segments: ['saneamento-agua', 'monitoramento-ambiental'],
    },
    source: {
      referenceText:
        'U.S. EPA (1994). Method 245.1: Determination of Mercury in Water by Cold Vapor Atomic Absorption Spectrometry, Revision 3.0. Cincinnati, OH.',
      canonicalUrl:
        'https://www.epa.gov/esam/epa-method-2451-determination-mercury-water-cold-vapor-atomic-absorption-spectrometry',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — programa ESAM / documento público',
      editionLabel: 'Rev. 3.0 (1994)',
      locator: 'Ficha pública ESAM e sumário técnico do Método EPA 245.1 (Rev. 3.0)',
    },
  },
  {
    slug: 'info-epa-300-0-anions-ic',
    documentCode: 'WK-ANL-005',
    title: 'Determinação de ânions inorgânicos em água por cromatografia de íons (EPA 300.0)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA 300.0 (Rev. 2.1) para separação e quantificação de fluoreto, cloreto, nitrito, nitrato, ortofosfato e sulfato em águas por cromatografia de íons. Destaca eluição carbonato/bicarbonato e condutimetria suprimida.',
    publicDescription:
      'Sintetiza o mecanismo de troca aniônica em fase estacionária funcionalizada com amônio quaternário acoplada à supressão química de condutividade de fundo, detalhando ordem de eluição, resolução crítica de picos precoces (F⁻ e ácidos orgânicos curtos), sobrecarga de coluna por matrizes salinas, tempos de guarda diferenciados e quantificação por área de pico.',
    defaultPriceCentavos: '5400',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Baseado na Parte A do Método EPA 300.0 (Rev. 2.1), este guia original do Wiki-Chem aborda a determinação simultânea dos principais ânions inorgânicos (F⁻, Cl⁻, NO₂⁻, NO₃⁻, HPO₄²⁻ e SO₄²⁻) em matrizes aquosas. Os ânions injetados competem com os íons carbonato/bicarbonato do eluente pelos sítios catiônicos da resina trocadora; na saída da coluna, a supressão química converte o eluente em ácido carbônico fracamente dissociado e transforma os ânions separados em seus ácidos fortes correspondentes de elevada condutividade molar.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Água potável, águas superficiais/subterrâneas e efluentes tratados filtrados em membrana de 0,45 µm isenta de lixiviáveis iônicos para proteção da pré-coluna e coluna analítica.',
      '- Respeito estrito à perecibilidade diferenciada: espécies biologicamente lábeis como nitrito (NO₂⁻), nitrato não acidificado e ortofosfato exigem refrigeração imediata e janelas curtas de análise (tipicamente 48 horas), enquanto fluoreto, cloreto e sulfato exibem estabilidade prolongada.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Vale negativo de água (water dip) e coeluição de ácidos monocarboxílicos de cadeia curta (formiato e acetato) próximos ao pico de fluoreto: atenuados pelo ajuste da força do eluente no alçapão de injeção ou coluna de seletividade apropriada.',
      '- Excesso pronunciado de Cl⁻ ou SO₄²⁻ frente a traços de NO₂⁻ ou Br⁻/NO₃⁻: provoca alargamento assimétrico de banda e perda de resolução na linha de base, exigindo diluição seletiva da amostra.',
      '- Tempo de retenção isolado não prova identidade inequívoca em matrizes industriais complexas; recomenda-se confirmação por fortificação cromatográfica em casos duvidosos.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Equilíbrio hidrodinâmico e condutimétrico: desgaseificar o eluente, estabilizar vazão isocrática, temperatura da célula condutimétrica e corrente/regeneração da supressora até obtenção de condutividade de fundo baixa e sem deriva.',
      '- Verificação de resolução cromatográfica: injetar mistura de desempenho contendo os ânions do escopo para confirmar separação adequada entre pares críticos (como Cl⁻/NO₂⁻ e picos adjacentes ao fluoreto).',
      '- Injeção filtrada e gestão de faixa dinâmica: filtrar amostras descartando as primeiras frações do filtro de seringa; realizar corridas em duas diluições quando coexistirem macroânions (Cl⁻, SO₄²⁻) e microânions (NO₂⁻, PO₄³⁻).',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: Área_pico (µS · min) = a · C_ânion + b',
      '- Atenção à base estequiométrica exigida na emissão do laudo: distinguir claramente concentrações expressas como o próprio íon (ex.: mg/L de NO₃⁻ ou PO₄³⁻) daquelas reportadas como elemento equivalente (mg/L de NO₃-N, NO₂-N ou PO₄-P), utilizando os fatores de massa molar correspondentes (ex.: N/NO₃⁻ ≈ 0,2259).',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Branco de água ultrapura filtrada no mesmo lote de seringas e filtros das amostras para descartar contaminação por cloreto ou nitrato.',
      '- Verificação da janela de tempo de retenção ao longo da sequência, padrão independente de controle e recuperação em matriz fortificada.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA 300.0 (Rev. 2.1). Não reproduz o texto oficial da EPA nem substitui validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['cromatografia-ions'],
      technologies: ['condutimetria-suprimida'],
      equipment: ['cromatografo-ions'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['cloreto', 'fluoreto', 'nitrato', 'nitrito', 'fosforo-fosfato', 'sulfato'],
      standards: ['epa-300-0'],
      segments: ['saneamento-agua', 'monitoramento-ambiental'],
    },
    source: {
      referenceText:
        'Pfaff, J. D.; U.S. EPA (1993). Method 300.0: Determination of Inorganic Anions by Ion Chromatography, Revision 2.1. Environmental Monitoring Systems Laboratory, Cincinnati, OH.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-08/documents/method_300-0_rev_2-1_1993.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — Office of Research and Development',
      editionLabel: 'Rev. 2.1 (ago./1993)',
      locator: 'Parte A (ânions inorgânicos comuns), seções 1.0 a 4.0',
    },
  },
  {
    slug: 'info-epa-180-1-turbidez-nefelometria',
    documentCode: 'WK-ANL-006',
    title: 'Determinação de turbidez em águas por nefelometria óptica (EPA 180.1)',
    freeSummary:
      'Guia técnico interpretativo fundamentado no Método EPA 180.1 (ago./1993) para medição óptica de turbidez em águas potáveis, naturais e efluentes por espalhamento de luz a 90°. Examina calibração nefelométrica, cuidado óptico das cubetas e interferências físicas.',
    publicDescription:
      'Aborda o princípio empírico da nefelometria óptica em geometria de 90° frente a suspensões poliméricas de referência (formazina ou padrões primários equivalentes), discutindo requisitos ópticos da fonte de tungstênio, indexação de cubetas de vidro, eliminação de microbolhas e tratamento de amostras com alta carga de sólidos em suspensão.',
    defaultPriceCentavos: '2900',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Fundamentado no Método EPA 180.1, este guia autoral do Wiki-Chem trata da determinação nefelométrica da turbidez (expressa em NTU) em águas de abastecimento, mananciais e efluentes. Como a turbidez é uma propriedade óptica agregada resultante da interação de partículas suspensas (argilas, silte, coloides inorgânicos, plâncton e matéria orgânica finamente dividida) com a luz incidente, a resposta depende do tamanho, forma e índice de refração das partículas, exigindo geometria instrumental padronizada com fotodetector posicionado a 90°.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Água tratada e potável (baixa turbidez, < 1 NTU), águas superficiais/subterrâneas e efluentes clarificados.',
      '- A medição deve ocorrer o mais próximo possível da coleta ou dentro da janela refrigerada permitida (com retorno prévio à temperatura ambiente antes da leitura para evitar embaçamento externo da parede óptica da cubeta).',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Microbolhas de ar dissolvido geram espalhamento espúrio positivo severo, especialmente em águas frias pressurizadas; devem ser eliminadas com repouso cuidadoso ou desgaseificação suave sem provocar floculação.',
      '- Riscos, impressões digitais, manchas ou heterogeneidades no vidro da cubeta desviam o feixe luminoso (luz espúria); exige-se limpeza externa impecável, aplicação opcional de filme fino de óleo de silicone de índice de refração compatível e indexação angular da cubeta.',
      '- Substâncias húmicas ou corantes dissolvidos que absorvem luz na faixa visível causam erro negativo por atenuação do feixe incidente e espalhado.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Verificação óptica e calibração: conferir a luz espúria (stray light) com água de baixíssima turbidez filtrada e verificar/calibrar as faixas do turbidímetro com padrões nefelométricos rastreáveis dentro da validade.',
      '- Homogeneização sem aeração: inverter suavemente o frasco de amostra para ressuspender sólidos finos sem incorporar bolhas de ar, enxaguar a cubeta indexada com porção da própria amostra e posicionar na orientação marcada.',
      '- Leitura estabilizada: aguardar estabilização após eventual sedimentação apenas de detritos grosseiros não representativos; quando a turbidez exceder o limite linear nefelométrico nominal (ex.: > 40 NTU em sistemas clássicos sem compensação de razão), diluir com água isenta de turbidez.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: Turbidez_final (NTU) = Leitura_diluída × [(V_amostra + V_água_isenta) / V_amostra]',
      '- Registrar os resultados respeitando o arredondamento escalonado usual conforme a faixa de leitura (maior precisão decimal abaixo de 1 NTU para controle de filtração em potabilidade, e valores inteiros em faixas elevadas).',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Checagem diária com padrão secundário selado ou suspensão recém-diluída de formazina/polímero certificado na faixa operacional das amostras.',
      '- Leitura em duplicata com reinversão suave da amostra para confirmar ausência de artefato por bolhas ou deriva por sedimentação rápida.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Síntese interpretativa autoral do Wiki-Chem baseada no Método EPA 180.1 (ago./1993). Não reproduz o documento governamental externo nem substitui calibração metrológica do instrumento.',
    ].join('\n'),
    classifications: {
      techniques: ['nefelometria-optica'],
      technologies: ['espalhamento-nefelometrico-90'],
      equipment: ['turbidimetro-nefelometrico'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['turbidez'],
      standards: ['epa-180-1'],
      segments: ['saneamento-agua', 'monitoramento-ambiental'],
    },
    source: {
      referenceText:
        'O’Dell, J. W.; U.S. EPA (1993). Method 180.1: Determination of Turbidity by Nephelometry, Revision 2.0. Environmental Monitoring Systems Laboratory, Cincinnati, OH.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-08/documents/method_180-1_1993.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — Office of Research and Development',
      editionLabel: 'Ago./1993',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 4.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-350-1-amonia-colorimetria',
    documentCode: 'WK-ANL-007',
    title: 'Determinação de nitrogênio amoniacal em águas por colorimetria semiautomatizada (EPA 350.1)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA 350.1 (Rev. 2.0) para determinação de nitrogênio amoniacal (NH₃-N) em águas e efluentes pela reação colorimétrica de Berthelot em fluxo contínuo. Aborda complexação alcalina, catálise e destilação prévia.',
    publicDescription:
      'Detalha a química da formação do azul de indofenol a partir da reação da amônia com hipoclorito e fenolato alcalino catalisada por nitroprussiato de sódio em analisadores de fluxo contínuo, explicando o papel do EDTA/tartarato contra precipitação de Ca²⁺ e Mg²⁺, a decloração de amostras tratadas e quando aplicar destilação preliminar.',
    defaultPriceCentavos: '3800',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Fundamentado no Método EPA 350.1 (Rev. 2.0), este guia original do Wiki-Chem explora a quantificação fotométrica automatizada de nitrogênio amoniacal total (soma do equilíbrio NH₄⁺/NH₃ expresso como NH₃-N). No manifold de fluxo contínuo aquecido, o íon amônio é convertido em monocloramina pelo hipoclorito em pH alcalino controlado e acopla-se ao íon fenolato sob catálise de nitroprussiato, produzindo o cromóforo indofenol intensamente colorido monitorado em torno de 630–660 nm.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Água potável, águas superficiais, subterrâneas e efluentes sanitários ou industriais.',
      '- Amostras cloradas exigem agente declorante imediato na coleta para impedir consumo ou formação contínua de cloraminas; a preservação ácida (H₂SO₄ pH < 2 sob refrigeração) exige neutralização ou capacidade tamponante compatível antes da reação alcalina no fluxo.',
      '- Efluentes intensamente turvos, coloridos ou ricos em interferentes orgânicos e metálicos requerem destilação alcalina tamponada prévia (absorção do destilado em ácido diluído) equiparada aos padrões.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Precipitação de hidróxidos de cálcio e magnésio no meio alcalino da reação de Berthelot: prevenida pela linha de agente complexante (EDTA dissódico ou tartarato de sódio e potássio) no sistema de fluxo.',
      '- Contaminação atmosférica no laboratório: vapores de soluções de hidróxido de amônio armazenadas ou manipuladas na mesma sala elevam erraticamente os brancos; o ambiente deve ser estritamente livre de vapores amoniacais.',
      '- Aminas alifáticas voláteis, ureia sob aquecimento excessivo ou sulfeto/turbidez residual alteram a absorbância líquida se não houver destilação ou filtração.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Condicionamento hidráulico do analisador: circular reagentes desgaseificados com surfactante apropriado até obter bolhas regulares (em CFA) ou dispersão reprodutível (em FIA), temperatura constante do banho de reação e linha de base estável.',
      '- Neutralização/equiparação de pH: garantir que padrões de calibração e amostras preservadas apresentem acidez equivalente antes da entrada no manifold, pois deslocamentos de pH final afetam drasticamente o rendimento do indofenol.',
      '- Sequência analítica e arraste: avaliar o fator de carryover injetando um branco imediatamente após o padrão de maior concentração.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: Altura_ou_Área_pico = m · C_(NH₃-N) + b',
      '- Preparar padrões a partir de cloreto ou sulfato de amônio anidro seco, calculando a concentração diretamente em mg N/L (massa molar do N = 14,007 g/mol; fator N/NH₄Cl ≈ 0,2618).',
      '- Quando houver destilação preliminar com mudança de volume entre alíquota tomada e destilado recolhido, corrigir pela razão volumétrica exata.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Branco de reagentes (e branco de destilação quando aplicável), verificação contínua da curva e padrão de controle independente.',
      '- Duplicata e matriz fortificada para verificar ausência de inibição do desenvolvimento de cor pela alcalinidade ou dureza da amostra.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA 350.1 (Rev. 2.0). Não reproduz procedimentos externos integrais nem substitui validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['colorimetria-fluxo'],
      technologies: ['fluxo-continuo-colorimetrico'],
      equipment: ['analisador-colorimetrico-fluxo'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['nitrogenio-amoniacal'],
      standards: ['epa-350-1'],
      segments: ['saneamento-agua', 'monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'O’Dell, J. W.; U.S. EPA (1993). Method 350.1: Determination of Ammonia Nitrogen by Semi-Automated Colorimetry, Revision 2.0. Cincinnati, OH.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-08/documents/method_350-1_1993.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — Office of Research and Development',
      editionLabel: 'Rev. 2.0 (ago./1993)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 4.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-353-2-nitrato-nitrito-colorimetria',
    documentCode: 'WK-ANL-008',
    title: 'Determinação de nitrato e nitrito em águas por colorimetria automatizada com redução em cádmio (EPA 353.2)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA 353.2 (Rev. 2.0) para determinação de nitrato-nitrito (NO₃⁻ + NO₂⁻) e nitrito isolado em águas por redução em cádmio cobreado e diazotação. Destaca verificação de eficiência redutora e cálculo diferencial.',
    publicDescription:
      'Examina a redução heterogênea quantitativa de NO₃⁻ a NO₂⁻ em coluna empacotada de grânulos de cádmio cobreado em tampão NH₄Cl-EDTA, seguida da reação de Griess (diazotação da sulfanilamida e acoplamento com dicloridrato de N-(1-naftil)etilenodiamina a ~540 nm), cobrindo envenenamento da coluna, medição diferencial sem coluna e controle estequiométrico.',
    defaultPriceCentavos: '4200',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Baseado no Método EPA 353.2 (Rev. 2.0), este guia interpretativo do Wiki-Chem descreve a quantificação colorimétrica automatizada da soma nitrato + nitrito (expressa em mg N/L) e a obtenção do nitrato por diferença. Na coluna redutora de cádmio revestido com cobre (Cd-Cu) condicionada em tampão cloreto de amônio/EDTA (pH próximo à neutralidade), o nitrato é reduzido a nitrito sem prosseguir até hidroxilamina ou amônia; o nitrito total diazota a sulfanilamida em meio fosfórico e acopla-se ao NEDD formando corante azo púrpura-avermelhado de alta absortividade molar em 540 nm.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Água potável, águas superficiais, subterrâneas e efluentes nitrificados previamente filtrados em membrana isenta de nitrato.',
      '- Para determinar nitrito isolado (e nitrato isolado por subtração), a amostra não acidificada é analisada em curto prazo refrigerado contornando-se a coluna de cádmio; para a soma NO₃⁻ + NO₂⁻ preservada com H₂SO₄ (pH < 2), neutraliza-se a alíquota antes da passagem pela coluna redutora para não dissolver o leito de cádmio.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Passivação ou envenenamento da coluna Cd-Cu: óleos e graxas recobrem os grânulos, cloro residual oxida a superfície ativa, sulfetos precipitam CdS/CuS e excesso de Fe³⁺/Cu²⁺ altera o potencial redox; utilizam-se pré-extração de óleos, decloração criteriosa e EDTA no tampão transportador.',
      '- Bolhas de ar retidas no leito da coluna causam caminhos preferenciais e queda abrupta da eficiência de redução; o leito deve permanecer permanentemente submerso em solução tampão.',
      '- Cor intrínseca em 540 nm ou turbidez coloidal exige filtração e avaliação de branco de matriz.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Ensaio obrigatório de eficiência da coluna redutora: comparar a resposta fotométrica de um padrão equimolar de nitrato (em mg N/L) contra um padrão equivalente de nitrito; a eficiência deve situar-se tipicamente acima de 90–95% antes de liberar a corrida.',
      '- Calibração com nitrato através da coluna ativa: todos os pontos da curva passam pela mesma coluna Cd-Cu das amostras para incorporar o rendimento real instantâneo do sistema.',
      '- Determinação diferencial quando requerida: executar segunda leitura com a coluna desconectada/contornada para quantificar apenas o NO₂-N nativo.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: C_(NO₃-N) = C_(NO₃+NO₂-N, com coluna) - C_(NO₂-N, sem coluna)',
      '- Caso o resultado final seja solicitado como íon nitrato (mg NO₃⁻/L) em vez de nitrogênio nítrico (mg N/L), multiplicar C_(NO₃-N) pelo fator estequiométrico 4,4268 (62,004 / 14,007).',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Monitoramento periódico da eficiência de redução NO₃⁻ → NO₂⁻ ao longo da sequência para detectar exaustão gradual da coluna.',
      '- Branco de reagentes, padrão independente de nitrato, duplicata e fortificação de matriz; descarte segregado de efluentes contendo cádmio conforme normas de resíduos perigosos.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA 353.2 (Rev. 2.0). Não reproduz o texto oficial da EPA nem substitui validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['colorimetria-fluxo'],
      technologies: ['fluxo-continuo-colorimetrico'],
      equipment: ['analisador-colorimetrico-fluxo'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['nitrato', 'nitrito'],
      standards: ['epa-353-2'],
      segments: ['saneamento-agua', 'monitoramento-ambiental'],
    },
    source: {
      referenceText:
        'O’Dell, J. W.; U.S. EPA (1993). Method 353.2: Determination of Nitrate-Nitrite Nitrogen by Automated Colorimetry, Revision 2.0. Cincinnati, OH.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-08/documents/method_353-2_1993.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — Office of Research and Development',
      editionLabel: 'Rev. 2.0 (ago./1993)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 4.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-365-1-fosforo-colorimetria',
    documentCode: 'WK-ANL-009',
    title: 'Determinação de fósforo e ortofosfato em águas por colorimetria semiautomatizada (EPA 365.1)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA 365.1 (Rev. 2.0) para determinação de ortofosfato dissolvido e fósforo total pelo método do ácido ascórbico / azul de molibdênio. Cobre digestão com persulfato, catálise antimoniada e controle de contaminação.',
    publicDescription:
      'Analisa o fracionamento operacional entre ortofosfato reativo dissolvido e fósforo total digerido, o mecanismo de formação do heteropoliácido antimonil-fosfomolíbdico reduzido por ácido ascórbico (leitura a ~880 nm ou 650–660 nm), as interferências por arseniato e sílica e os cuidados essenciais de descontaminação livre de detergentes fosfatados.',
    defaultPriceCentavos: '3800',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Fundamentado no Método EPA 365.1 (Rev. 2.0), este guia original do Wiki-Chem aborda a determinação colorimétrica semiautomatizada de fósforo em águas e efluentes. Somente o ortofosfato livre (H₂PO₄⁻ / HPO₄²⁻) reage diretamente com molibdato de amônio e tartarato de antimônio e potássio em meio sulfúrico controlado; o ácido ascórbico reduz esse complexo ao azul de molibdênio intenso, com absorção característica no vermelho/infravermelho próximo (tipicamente 880 nm ou 650–660 nm conforme o fotômetro do fluxo).',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Ortofosfato dissolvido reativo: filtração imediata em membrana de 0,45 µm pré-lavada (isenta de fósforo extraível), sem adição de ácido que hidrolisaria polifosfatos lábeis, mantendo refrigeração até análise rápida.',
      '- Fósforo total: homogeneização da amostra integral preservada com H₂SO₄ (pH < 2) e digestão oxidante ácida a quente com persulfato de amônio ou potássio para converter polifosfatos condensados e organofosforados em ortofosfato.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Íons arseniato (AsO₄³⁻) formam heteropoliácido azul análogo ao fosfato, gerando viés positivo proporcional quando presentes em águas impactadas.',
      '- Relação [H⁺]/[MoO₄²⁻] fora da janela ótima: acidez insuficiente permite autorredução do molibdato ou interferência severa de silicato (SiO₃²⁻); acidez excessiva inibe o desenvolvimento da cor — por isso extratos digeridos ácidos devem ter pH/acidez ajustados em paridade com a curva.',
      '- Detergentes alcalinos comerciais deixam filme adsorvido de fosfato nas paredes de vidro; toda a vidraria deve ser dedicada e lavada exclusivamente com HCl diluído a quente.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Preparo fresco do reagente combinado ou linhas separadas estáveis: o ácido ascórbico em solução oxida-se rapidamente à temperatura ambiente, exigindo preparo recente ou estabilização refrigerada conforme configuração do manifold.',
      '- Paridade entre curva e amostras: para fósforo total, conduzir brancos e padrões de calibração pelo mesmo ciclo térmico de digestão com persulfato e ajuste de volume/pH aplicado às amostras.',
      '- Leitura em fluxo e lavagem: monitorar adsorção residual na serpentina de vidro intercalando solução de lavagem compatível.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: Sinal_fotométrico = m · C_P (mg P/L) + b',
      '- Expressar resultados preferencialmente como fósforo elementar (mg P/L); quando exigida conversão para íon fosfato (PO₄³⁻), multiplicar mg P/L por 3,0662 (94,971 / 30,974).',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Branco de filtração (para ortofosfato) e branco de digestão (para fósforo total) obrigatórios a cada bateria.',
      '- Verificação de eficiência da digestão com composto fosforado condensado/orgânico ou padrão de controle certificado, além de duplicata e matriz fortificada.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA 365.1 (Rev. 2.0). Não reproduz o documento oficial da EPA nem substitui validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['colorimetria-fluxo'],
      technologies: ['fluxo-continuo-colorimetrico'],
      equipment: ['analisador-colorimetrico-fluxo'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['fosforo-fosfato'],
      standards: ['epa-365-1'],
      segments: ['saneamento-agua', 'monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'O’Dell, J. W.; U.S. EPA (1993). Method 365.1: Determination of Phosphorus by Semi-Automated Colorimetry, Revision 2.0. Cincinnati, OH.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-08/documents/method_365-1_1993.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — Office of Research and Development',
      editionLabel: 'Rev. 2.0 (ago./1993)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 4.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-410-4-dqo-colorimetria',
    documentCode: 'WK-ANL-010',
    title: 'Determinação de demanda química de oxigênio (DQO) por colorimetria semiautomatizada (EPA 410.4)',
    freeSummary:
      'Guia técnico interpretativo fundamentado no Método EPA 410.4 (Rev. 2.0) para determinação de DQO em águas superficiais e efluentes por digestão ácida fechada com dicromato e leitura colorimétrica. Detalha catálise por Ag⁺, mascaramento de Cl⁻ e seleção de comprimento de onda.',
    publicDescription:
      'Sintetiza o equilíbrio redox da oxidação da matéria orgânica e inorgânica redutora por dicromato de potássio em meio sulfúrico concentrado a 150 °C em tubos selados, explicando a catálise por sulfato de prata na oxidação de ácidos graxos lineares, o mascaramento de cloreto com sulfato mercúrico, a escolha entre leitura a ~420 nm ou ~600 nm e a gestão ambiental dos resíduos.',
    defaultPriceCentavos: '4400',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Com base no Método EPA 410.4 (Rev. 2.0), este guia autoral do Wiki-Chem analisa a determinação fotométrica da Demanda Química de Oxigênio (expressa em mg O₂/L equivalente). Em tubo de borossilicato hermeticamente fechado a 150 °C, o excesso conhecido de íon dicromato (Cr₂O₇²⁻, alaranjado) em H₂SO₄ concentrado oxida os compostos oxidáveis e reduz-se a íon crômico (Cr³⁺, esverdeado). Em faixas baixas avalia-se tipicamente o consumo do Cr(VI) próximo a 420–440 nm (inclinação negativa), enquanto em faixas médias/altas mede-se diretamente a formação de Cr(III) em torno de 600 nm (inclinação positiva).',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Águas superficiais impactadas e efluentes domésticos ou industriais (brutos ou tratados), preservados com H₂SO₄ (pH < 2) sob refrigeração quando não analisados imediatamente.',
      '- Homogeneização rigorosa (ou trituração fina quando há sólidos suspensos biodegradáveis/oxidáveis) para assegurar alíquota representativa no reduzido volume do tubo de microdigestão.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Oxidação quantitativa indesejada de íons cloreto (2Cl⁻ → Cl₂) pelo dicromato ácido: suprimida pela formação do complexo solúvel pouco dissociado HgCl₂/HgCl₄²⁻ mediante sulfato mercúrico (HgSO₄); quando a salinidade supera a capacidade de mascaramento (ex.: águas salobras/marinhas), diluição prévia ou abordagem específica é obrigatória.',
      '- Compostos aromáticos voláteis (benzeno, tolueno, piridina) resistem parcialmente à oxidação ou permanecem no headspace se a adição de ácido não for resfriada antes de vedar; o sistema fechado retém vapores orgânicos muito melhor que o refluxo aberto.',
      '- Partículas suspensas residuais ou precipitado de AgCl após digestão distorcem a leitura óptica no próprio tubo; aguardar decantação completa sem agitar o sedimento antes da medição.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Segurança térmica e preparo em tubo fechado: adicionar amostra de forma controlada sobre a solução digestora resfriada, vedar firmemente a tampa rosqueada com PTFE e inverter com proteção facial/luvas térmicas, pois a hidratação do H₂SO₄ é fortemente exotérmica.',
      '- Digestão isotérmica e resfriamento: manter em bloco digestor pré-aquecido a 150 °C pelo tempo regulamentar (2 horas), resfriar gradualmente e permitir repouso vertical até limpidez total do sobrenadante.',
      '- Calibração com biftalato de potássio (KHP): construir curva na mesma faixa espectral escolhida usando solução padrão de hidrogenoftalato de potássio (DQO teórica = 1,176 mg O₂ por mg de KHP).',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação (faixa Cr³⁺ ~600 nm): A_corr = A_amostra - A_branco = m · DQO (mg O₂/L) + b',
      '- Verificar visualmente se ainda resta coloração residual de dicromato nos tubos de alta carga: o esgotamento total do Cr(VI) (cor verde-azulada pura sem excesso oxidante) invalida a leitura e exige repetição com alíquota diluída.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Tubos de branco digeridos em todas as bateladas (altamente sensíveis a traços orgânicos na água reagente ou nas tampas).',
      '- Verificação de recuperação estequiométrica com padrão independente de KHP, duplicata de homogeneização e segregação estrita do resíduo líquido ácido contendo Hg, Ag e Cr.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA 410.4 (Rev. 2.0). Não reproduz o texto oficial da EPA nem dispensa normas de biossegurança, segurança química e gestão de resíduos perigosos.',
    ].join('\n'),
    classifications: {
      techniques: ['colorimetria-fluxo'],
      technologies: ['fluxo-continuo-colorimetrico'],
      equipment: ['analisador-colorimetrico-fluxo'],
      matrices: ['agua-superficial-subterranea', 'efluentes-residuos-aquosos'],
      analytes: ['dqo'],
      standards: ['epa-410-4'],
      segments: ['monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'O’Dell, J. W.; U.S. EPA (1993). Method 410.4: The Determination of Chemical Oxygen Demand by Semi-Automated Colorimetry, Revision 2.0. Cincinnati, OH.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-08/documents/method_410-4_1993.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — Office of Research and Development',
      editionLabel: 'Rev. 2.0 (ago./1993)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 4.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-7000b-metais-faas',
    documentCode: 'WK-ANL-011',
    title: 'Determinação de metais em solução e digeridos ácidos por absorção atômica em chama — FAAS (EPA 7000B)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA SW-846 7000B (Rev. 2) para determinação monoelementar de metais (Fe, Cu, Pb, Zn, Mn) em águas, extratos e digeridos ácidos por FAAS. Aborda estequiometria de chama, modificadores químicos e correção de fundo.',
    publicDescription:
      'Examina os fundamentos instrumentais e químicos da espectrometria de absorção atômica em chama (ar-acetileno e óxido nitroso-acetileno) no compêndio SW-846, discutindo alinhamento de lâmpada de cátodo oco, largura de fenda espectral, supressores de ionização, liberadores contra óxidos/fosfatos refratários e teste de diluição/adição de padrão.',
    defaultPriceCentavos: '4800',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Elaborado pelo Wiki-Chem a partir do Método EPA SW-846 7000B (Rev. 2), este guia aborda a quantificação de metais em soluções aquosas, extratos de lixiviação (como TCLP/SPLP) e digeridos ácidos de solos, sedimentos, lodos e resíduos. A solução é aspirada pneumaticamente para câmara de pré-mistura e introduzida em queimador laminar, onde a energia térmica da chama converte os sais dissolvidos em nuvem de átomos neutros no estado fundamental capazes de absorver seletivamente a linha estreita emitida pela lâmpada de cátodo oco (HCL) ou descarga sem eletrodo (EDL) do elemento.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Águas subterrâneas filtradas/digeridas, extratos aquosos/ácidos e digeridos de matrizes sólidas compatibilizados na mesma natureza e concentração ácida dos padrões.',
      '- Faixa de trabalho típica em mg/L; quando os limites regulatórios exigirem sensibilidade em níveis sub-µg/L, técnicas eletrotérmicas (GFAA) ou de plasma (ICP-MS) tornam-se necessárias.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Interferências químicas na fase condensada (formação de sais termicamente estáveis, como fosfatos/silicatos alcalino-terrosos ou óxidos refratários): superadas pela adição de agente liberador (ex.: lantânio) ou transição controlada para chama mais quente de N₂O-C₂H₂.',
      '- Interferência de ionização em chamas de alta temperatura: controlada por tampão de ionização (excesso de K⁺ ou Cs⁺ facilmente ionizável para deslocar o equilíbrio de volta ao átomo neutro).',
      '- Absorção molecular de banda larga e espalhamento por partículas salinas em comprimentos de onda curtos (< 300 nm, crítico para Pb e Zn): exigem correção de fundo simultânea (lâmpada contínua de deutério ou efeito Zeeman).',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Otimização óptica e estequiométrica da chama: estabilizar corrente nominal da lâmpada sem autoabsorção, centrar o comprimento de onda e ajustar altura de observação do queimador e razão combustível/oxidante (chama oxidante enxuta vs. redutora rica conforme o elemento).',
      '- Equiparação física de transporte: igualar o teor ácido (e solvente/modificador como La ou KCl) entre brancos, padrões e amostras para manter constante a taxa de aspiração capilar e eficiência de nebulização.',
      '- Verificação de interferência de matriz: aplicar teste de diluição seriada (ex.: 1:5) ou método de adição de padrão quando a matriz apresentar elevada carga salina ou viscosidade diferenciada.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: A_corrigida = m · C_solução (mg/L) + b  (restrita à faixa linear antes da curvatura de desvio óptico)',
      '- Converter a concentração lida no digerido para base úmida ou seca da amostra original incorporando massa digerida, volume final aferido e teor de sólidos totais.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Verificação inicial e contínua da calibração (ICV/CCV), branco de calibração (ICB/CCB) e branco de preparo por batelada.',
      '- Teste de recuperação de matriz (MS) e teste pós-digestão/diluição conforme sistemática de qualidade SW-846 para confirmar ausência de efeito multiplicativo de matriz.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia interpretativo autoral do Wiki-Chem fundamentado no Método EPA SW-846 7000B (Rev. 2). Não reproduz o documento oficial nem substitui normas operacionais de gases inflamáveis/oxidantes e validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['absorcao-atomica'],
      technologies: ['atomizacao-chama-faas'],
      equipment: ['espectrometro-aas'],
      matrices: ['agua-superficial-subterranea', 'efluentes-residuos-aquosos', 'solos-sedimentos-lodos', 'extratos-digeridos-aquosos'],
      analytes: ['ferro-fe', 'cobre-cu', 'chumbo-pb', 'zinco-zn', 'manganes-mn'],
      standards: ['epa-7000b'],
      segments: ['monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'U.S. EPA (2007). SW-846 Test Method 7000B: Flame Atomic Absorption Spectrophotometry, Revision 2. Test Methods for Evaluating Solid Waste, Physical/Chemical Methods.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-12/documents/7000b.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — compêndio SW-846 de acesso público',
      editionLabel: 'Rev. 2 (fev./2007)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 3.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-7196a-cromo-hexavalente-colorimetria',
    documentCode: 'WK-ANL-012',
    title: 'Determinação espectrofotométrica de cromo hexavalente — Cr(VI) com difenilcarbazida (EPA 7196A)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA SW-846 7196A para especiação espectrofotométrica de cromo hexavalente dissolvido — Cr(VI) a 540 nm com 1,5-difenilcarbazida. Enfatiza estabilidade redox, preservação não ácida e avaliação de matriz redutora.',
    publicDescription:
      'Analisa a seletividade da reação redox-complexante entre espécies de Cr(VI) (cromato/dicromato) e 1,5-difenilcarbazida em meio sulfúrico/fosfórico controlado (pH ~2) formando o complexo catiônico Cr(III)-difenilcarbazona vermelho-violeta a 540 nm, destacando o risco crítico de redução artefatual de Cr(VI) a Cr(III) durante preservação ou acidificação na presença de redutores.',
    defaultPriceCentavos: '4200',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Fundamentado no Método EPA SW-846 7196A, este guia original do Wiki-Chem trata da quantificação seletiva de cromo hexavalente dissolvido em águas subterrâneas, efluentes e extratos aquosos/alcalinos de resíduos. Em solução ácida (pH ajustado em torno de 1,6–2,2), o Cr(VI) oxida a 1,5-difenilcarbazida a difenilcarbazona enquanto é reduzido in situ a Cr(III), coordenando-se imediatamente para originar um complexo interno vermelho-violeta de elevada absortividade molar em 540 nm, sem resposta do Cr(III) originalmente livre na amostra.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Diferentemente dos metais totais, amostras destinadas a Cr(VI) NUNCA devem ser preservadas em meio ácido na coleta, pois o baixo pH acelera drasticamente a redução de Cr(VI) a Cr(III) por matéria orgânica, Fe²⁺ ou sulfetos; preserva-se sob refrigeração (e tamponamento alcalino compatível quando cabível) com análise em janela curta (tipicamente 24 horas para águas).',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Redutores endógenos (Fe²⁺, SO₃²⁻, S²⁻, nitrito e carbono orgânico facilmente oxidável): consomem Cr(VI) assim que a amostra é acidificada para a reação colorimétrica, produzindo resultados falsamente baixos; a fortificação de matriz (matrix spike de Cr(VI)) é indispensável para comprovar estabilidade redox da matriz.',
      '- Íons Mo(VI), V(V), Hg e Fe³⁺ em concentrações elevadas geram complexos secundários amarelados/violetas com difenilcarbazida; o vanádio exibe decaimento cinético que se atenua aguardando ~10 minutos antes da leitura.',
      '- Coloração própria ou turbidez em extratos de resíduos exige compensação com branco de amostra acidificado sem adição de difenilcarbazida.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Integridade do reagente cromogênico: preparar solução de 1,5-difenilcarbazida em acetona grau PA protegida da luz e descartar ao observar escurecimento/oxidação prematura.',
      '- Acidificação no momento exato do ensaio: ajustar o pH da alíquota filtrada com ácido (H₂SO₄ ou H₃PO₄ conforme variante operacional) imediatamente antes da adição da difenilcarbazida, minimizando o tempo de exposição do Cr(VI) livre em meio ácido.',
      '- Compensação óptica de cor intrínseca: medir paralelamente alíquota idêntica acidificada sem o reagente cromogênico quando o extrato apresentar absorbância visível em 540 nm.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: A_líquida = (A_amostra_com_DPC - A_amostra_sem_DPC) - A_branco_reagentes = m · C_Cr(VI) + b',
      '- Preparar padrões a partir de dicromato de potássio (K₂Cr₂O₇) primário seco, expressando os resultados especificamente como mg/L (ou µg/L) de Cr(VI).',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Fortificação obrigatória de matriz com Cr(VI) solúvel: recuperações muito baixas diagnosticam matriz fortemente redutora, sinalizando incompatibilidade direta ou necessidade de técnica cromatográfica alcalina complementar.',
      '- Branco de reagentes, padrão independente de verificação e duplicata analítica.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA SW-846 7196A. Não reproduz o texto oficial da EPA nem substitui validação de especiação redox em matrizes complexas.',
    ].join('\n'),
    classifications: {
      techniques: ['espectrofotometria-uv-vis'],
      technologies: ['uv-vis'],
      equipment: ['espectrofotometro-uv-vis'],
      matrices: ['agua-superficial-subterranea', 'extratos-digeridos-aquosos'],
      analytes: ['cromo-hexavalente'],
      standards: ['epa-7196a'],
      segments: ['monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'U.S. EPA (1992). SW-846 Test Method 7196A: Chromium, Hexavalent (Colorimetric). Test Methods for Evaluating Solid Waste, Physical/Chemical Methods.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-12/documents/7196a.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — compêndio SW-846 de acesso público',
      editionLabel: 'SW-846 (jul./1992)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 3.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-8260d-voc-gc-ms',
    documentCode: 'WK-ANL-013',
    title: 'Determinação de compostos orgânicos voláteis (COVs) em águas, solos e resíduos por GC-MS (EPA 8260D)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA SW-846 8260D (Rev. 4) para identificação e quantificação de compostos orgânicos voláteis (como benzeno e tolueno) em águas, solos e resíduos por GC-MS. Cobre introdução sem headspace, confirmação espectral e padrões internos/substitutos.',
    publicDescription:
      'Estrutura os princípios da cromatografia gasosa capilar acoplada à espectrometria de massas por impacto de elétrons (EI) aplicada a COVs, integrando amostragem hermética sem espaço vazio (zero headspace), técnicas compatíveis de introdução de voláteis (purge-and-trap / headspace), critérios de sintonia espectral (BFB), identificação qualitativa por íon quantificador/qualificadores e quantificação por fator relativo de resposta (RRF).',
    defaultPriceCentavos: '6800',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Elaborado pelo Wiki-Chem com fundamentação documental no Método EPA SW-846 8260D (Rev. 4, Update VI), este guia aborda a determinação qualitativa e quantitativa de compostos orgânicos voláteis halogenados e aromáticos (incluindo BTEX como benzeno e tolueno) em águas, solos, sedimentos e resíduos. Os analitos voláteis transferidos da matriz para a fase gasosa e focalizados no injetor/armadilha são separados em coluna capilar de sílica fundida com fase estacionária de polaridade intermediária e ionizados a 70 eV no espectrômetro de massas.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Amostras aquosas: coletadas em frascos VOA com septo revestido de PTFE sem qualquer bolha de ar (zero headspace), refrigeradas e protegidas contra degradação biológica/decloradas quando aplicável.',
      '- Solos e sedimentos: preservação hermética imediata em campo (ex.: amostradores selados ou imersão em metanol grau purge-and-trap para altas concentrações) evitando abertura ou homogeneização atmosférica que dissiparia rapidamente frações de alta pressão de vapor.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Contaminação cruzada de fundo no laboratório: vapores de diclorometano, acetona, hexano ou tolueno provenientes de extrações de semivoláteis em salas adjacentes difundem-se através de septos e aparecem nos brancos de método; exige-se segregação física da área de voláteis.',
      '- Efeito de arraste (carryover) após amostra altamente impactada por combustíveis ou solventes clorados: exige triagem prévia/diluição e injeção de brancos de verificação imediatamente subsequentes.',
      '- Umidade excessiva transferida à coluna/fonte de íons e decomposição térmica de compostos lábeis no sistema de transferência.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Verificação de sintonia de massas e performance cromatográfica: avaliar o espectro de 4-bromofluorobenzeno (BFB) frente aos critérios de abundância isotópica/fragmentação antes de validar calibrações ou corridas.',
      '- Adição sistemática de padrões internos (IS) e substitutos (surrogates): introduzir compostos deuterados ou fluorados em todos os brancos, padrões e amostras para monitorar individualmente a eficiência de extração/purga e variações instrumentais.',
      '- Confirmação qualitativa simultânea: exigir coincidência do tempo de retenção relativo (RRT) frente ao padrão interno e concordância das razões de intensidade entre o íon quantificador primário e os íons qualificadores secundários.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: RRF = (Área_analito × C_IS) / (Área_IS × C_analito)   ⇒   C_analito = (Área_analito × C_IS) / (Área_IS × RRF_médio)',
      '- Avaliar a constância do fator relativo de resposta (%RSD do RRF) na calibração inicial de múltiplos níveis ou utilizar regressão devidamente verificada no limite inferior de quantificação.',
      '- Para matrizes sólidas extraídas em metanol ou purgadas diretamente, incorporar massa úmida, volume total de fase líquida (incluindo umidade natural da amostra) e teor de sólidos secos.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Branco de método livre de artefatos acima do limite de relato, branco de transporte (trip blank) para auditar contaminação em trânsito, LCS e acompanhamento da carta de recuperação dos surrogates em cada amostra.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA SW-846 8260D (Rev. 4, jun./2018). Não reproduz tabelas ou texto integral da EPA nem substitui métodos preparatórios acoplados (ex.: série 5000 SW-846) e validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['cromatografia-gasosa'],
      technologies: ['gc-ms'],
      equipment: ['sistema-gc-ms'],
      matrices: ['agua-potavel', 'agua-superficial-subterranea', 'efluentes-residuos-aquosos', 'solos-sedimentos-lodos'],
      analytes: ['benzeno-tolueno-cov'],
      standards: ['epa-8260d'],
      segments: ['monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'U.S. EPA (2018). SW-846 Test Method 8260D: Volatile Organic Compounds by Gas Chromatography/Mass Spectrometry (GC/MS), Revision 4 (Update VI).',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2018-06/documents/method_8260d_update_vi_final_06-11-2018.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — compêndio SW-846 Update VI',
      editionLabel: 'Rev. 4 (jun./2018)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 4.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-9040c-ph-eletrometrico',
    documentCode: 'WK-ANL-014',
    title: 'Medição eletrométrica de pH em águas e resíduos aquosos (EPA 9040C)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA SW-846 9040C (Rev. 3) para determinação potenciométrica de pH em efluentes, extratos e resíduos aquosos. Sintetiza resposta de Nernst, compensação térmica, eficiência de inclinação e interferências de membrana.',
    publicDescription:
      'Aborda a medição potenciométrica da atividade hidrogeniônica com eletrodo combinado de vidro em sistemas aquosos e resíduos multifásicos com pelo menos 20% de fase aquosa, detalhando calibração com tampões certificados que flanqueiam a amostra, compensação de temperatura (ATC), erro alcalino de sódio, envenenamento da junção de referência e cuidados em matrizes oleosas.',
    defaultPriceCentavos: '2900',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Fundamentado no Método EPA SW-846 9040C (Rev. 3), este guia original do Wiki-Chem examina a determinação eletrométrica de pH em águas residuárias, extratos de lixiviação e resíduos líquidos nos quais a fase aquosa represente no mínimo 20% do volume total. O sistema mede a diferença de potencial eletromotriz entre um eletrodo indicador de membrana de vidro hidratada sensível a H₃O⁺ e um eletrodo de referência (Ag/AgCl ou calomelano) de potencial constante conectado à solução por junção líquida porosa, obedecendo à relação termodinâmica de Nernst.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Efluentes industriais, lixiviados e fases aquosas separadas de resíduos multifásicos.',
      '- Por tratar-se de parâmetro físico-químico sujeito a rápida alteração por desprendimento/absorção de CO₂, NH₃ ou H₂S e reações de oxidação-precipitação, a medição deve ocorrer o mais brevemente possível sob equilíbrio térmico registrado.',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Erro alcalino (erro de sódio) acima de pH 10: membranas de vidro convencionais passam a responder parcialmente a altas concentrações de Na⁺/Li⁺, subestimando o pH real; em resíduos cáusticos concentrados (avaliação de corrosividade pH ≥ 12,5), utilizam-se eletrodos de vidro especiais de baixo erro de sódio.',
      '- Recobrimento físico da membrana sensível ou entupimento da junção cerâmica/anular por óleos, graxas, alcatrão, proteínas ou sulfetos metálicos: causa deriva lenta e resposta amortecida, exigindo separação prévia da fase orgânica livre ou eletrodo de junção aberta/dupla junção.',
      '- Diferença entre efeito térmico na inclinação de Nernst (compensado por ATC) e variação química real do pK_a da matriz com a temperatura: exige reportar sempre a temperatura exata na qual o pH foi medido.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Calibração com tampões que enquadram a amostra: calibrar o medidor com no mínimo dois tampões primários rastreáveis separados por até 3 unidades de pH que flanqueiem a faixa esperada da amostra, verificando com terceiro tampão intermediário.',
      '- Verificação da inclinação (slope) e assimetria: confirmar que a inclinação Nernstiana percentual situa-se na janela saudável do sensor (~95% a 102% de 59,16 mV/década a 25 °C).',
      '- Medição sob agitação moderada uniforme: enxaguar eletrodo e sonda térmica entre leituras sem friccionar a membrana de vidro (evitando carga triboelétrica), agitar suavemente sem formar vórtice de aeração e registrar pH e temperatura após estabilização.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação de Nernst: E = E⁰\' - (2,3026 · R · T / F) · pH',
      '- Reportar o valor de pH com resolução condizente (tipicamente 0,01 ou 0,1 unidade de pH) acompanhado obrigatoriamente da temperatura de medição em °C; não calcular média aritmética simples de pH quando amostras apresentarem diferenças amplas sem ponderação físico-química adequada.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Checagem contínua de tampão de verificação (CCV) com tolerância estreita (ex.: ± 0,05 a ± 0,10 unidade de pH) e leitura em duplicata para confirmar ausência de envenenamento do eletrodo pela matriz.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA SW-846 9040C (Rev. 3, nov./2004). Não reproduz o texto oficial da EPA nem substitui procedimentos regulatórios de caracterização de corrosividade.',
    ].join('\n'),
    classifications: {
      techniques: ['potenciometria-eletrometrica'],
      technologies: ['eletrodo-combinado-vidro'],
      equipment: ['medidor-ph'],
      matrices: ['efluentes-residuos-aquosos', 'extratos-digeridos-aquosos'],
      analytes: ['ph'],
      standards: ['epa-9040c'],
      segments: ['monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'U.S. EPA (2004). SW-846 Test Method 9040C: pH Electrometric Measurement, Revision 3. Test Methods for Evaluating Solid Waste, Physical/Chemical Methods.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-12/documents/9040c.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — compêndio SW-846 de acesso público',
      editionLabel: 'Rev. 3 (nov./2004)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 3.0 (Interferences)',
    },
  },
  {
    slug: 'info-epa-9253-cloreto-argentometria',
    documentCode: 'WK-ANL-015',
    title: 'Determinação titrimétrica de cloreto com nitrato de prata — argentometria (EPA 9253)',
    freeSummary:
      'Guia técnico interpretativo baseado no Método EPA SW-846 9253 (Rev. 0) para determinação volumétrica de íons cloreto (Cl⁻) em águas e soluções de bomba calorimétrica por argentometria (método de Mohr). Detalha janela de pH, desconto de branco do indicador e cotitulação de haletos.',
    publicDescription:
      'Explica a precipitação fracionada de cloreto de prata (AgCl, branco) seguida da formação de cromato de prata (Ag₂CrO₄, vermelho-tijolo) no ponto final usando cromato de potássio como indicador visual, detalhando o controle de pH neutro a levemente alcalino (7–10), a oxidação prévia de sulfeto/tiossulfato com peróxido de hidrogênio e o desconto obrigatório do volume de viragem do branco.',
    defaultPriceCentavos: '3200',
    fullDescription: [
      '1. Escopo analítico e princípio físico-químico',
      'Fundamentado no Método EPA SW-846 9253 (Rev. 0), este guia original do Wiki-Chem aborda a titrimetria argentométrica clássica de precipitação para quantificação de cloreto em águas naturais, efluentes e soluções absorvedoras provenientes de combustão em bomba de oxigênio. Graças à menor solubilidade molar estequiométrica do AgCl frente ao Ag₂CrO₄ nas concentrações usuais de indicador CrO₄²⁻, a adição de solução padronizada de AgNO₃ precipita quantitativamente o cloreto como AgCl branco; o primeiro pequeno excesso de Ag⁺ após o ponto de equivalência reage com o cromato gerando coloração persistente amarelo-rósea a vermelho-tijolo.',
      '',
      '2. Matrizes aplicáveis e condicionamento conceitual da amostra',
      '- Águas superficiais/subterrâneas de média a alta salinidade, efluentes clarificados e lavados alcalinos/aquosos de bomba de oxigênio.',
      '- O ajuste prévio de pH à faixa de 7 a 10 (com H₂SO₄ ou NaOH diluídos isentos de cloreto) é crítico: em meio ácido (pH < 7), o cromato protona-se a HCrO₄⁻/Cr₂O₇²⁻ impedindo a precipitação de Ag₂CrO₄ no ponto de equivalência; em meio fortemente alcalino (pH > 10), precipita óxido/hidróxido de prata escuro (Ag₂O).',
      '',
      '3. Interferências críticas e estratégias de mitigação',
      '- Brometo (Br⁻), iodeto (I⁻) e cianeto (CN⁻) possuem sais de prata ainda menos solúveis que o AgCl e são cotitulados quantitativamente como equivalentes de cloreto.',
      '- Sulfeto (S²⁻), sulfito (SO₃²⁻) e tiossulfato (S₂O₃²⁻) reduzem ou precipitam Ag⁺ formando escurecimento coloidal que mascara a viragem; são oxidados previamente a sulfato por tratamento controlado com peróxido de hidrogênio (H₂O₂ 30%).',
      '- Ferro elevado (precipitado castanho de Fe(OH)₃) ou coloração orgânica intensa impede a visualização nítida do ponto final, requerendo clarificação prévia ou migração para potenciometria/cromatografia de íons.',
    ].join('\n'),
    fullProcedure: [
      '4. Estrutura operacional comentada (síntese interpretativa Wiki-Chem)',
      '- Padronização da solução titulante de AgNO₃: aferir a normalidade/molaridade real do nitrato de prata frente a solução padrão primária de NaCl seco sob condições idênticas de volume final e concentração do indicador K₂CrO₄.',
      '- Determinação obrigatória do branco do indicador: titular o mesmo volume de água reagente isenta de cloreto com a mesma alíquota de cromato de potássio para quantificar o pequeno volume de AgNO₃ consumido apenas para atingir a percepção visual da cor de Ag₂CrO₄ (~0,2–0,4 mL).',
      '- Condução da titulação sob iluminação constante: adicionar AgNO₃ sob agitação vigorosa (para dessorver Cl⁻ retido na superfície do coágulo de AgCl) até tonalidade amarelo-avermelhada idêntica à do branco titulado.',
      '',
      '5. Modelo de calibração, cálculos e expressão de resultados',
      'Equação: C_Cl⁻ (mg/L) = [(V_amostra_AgNO₃ - V_branco_AgNO₃) × N_AgNO₃ × 35.453] / V_alíquota (mL)',
      '- Para expressar o resultado como equivalente de cloreto de sódio: mg NaCl/L = mg Cl⁻/L × 1,6485.',
      '',
      '6. Diretrizes conceituais de controle de qualidade analítico',
      '- Padronização periódica do titulante protegido em frasco âmbar contra fotorredução de Ag⁺.',
      '- Branco de indicador em cada lote, duplicata volumétrica e verificação com solução independente de NaCl; coleta separada dos resíduos contendo sais de prata e cromato (Cr(VI)) para recuperação/tratamento.',
      '',
      '7. Escopo editorial e rastreabilidade documental',
      'Nota: Guia técnico autoral do Wiki-Chem fundamentado no Método EPA SW-846 9253 (Rev. 0, set./1994). Não reproduz o documento oficial da EPA nem substitui validação laboratorial.',
    ].join('\n'),
    classifications: {
      techniques: ['titrimetria-precipitacao'],
      technologies: ['argentometria'],
      equipment: ['conjunto-titrimetrico'],
      matrices: ['agua-superficial-subterranea', 'efluentes-residuos-aquosos', 'extratos-digeridos-aquosos'],
      analytes: ['cloreto'],
      standards: ['epa-9253'],
      segments: ['monitoramento-ambiental', 'residuos-efluentes'],
    },
    source: {
      referenceText:
        'U.S. EPA (1994). SW-846 Test Method 9253: Chloride (Titrimetric, Silver Nitrate), Revision 0. Test Methods for Evaluating Solid Waste, Physical/Chemical Methods.',
      canonicalUrl: 'https://www.epa.gov/sites/default/files/2015-12/documents/9253.pdf',
      ownerCredit: 'U.S. Environmental Protection Agency (EPA) — compêndio SW-846 de acesso público',
      editionLabel: 'Rev. 0 (set./1994)',
      locator: 'Seções 1.0 (Scope and Application), 2.0 (Summary of Method) e 3.0 (Interferences)',
    },
  },
]

const validCentavos = (value: string) => /^[1-9][0-9]{0,18}$/.test(value)

export function resolveAcademicPriceCentavos(sheet: TechnicalSheetSpec, env: NodeJS.ProcessEnv = process.env): string | null {
  if (sheet.defaultPriceCentavos === null) return null
  const overridesRaw = env.WIKICHEM_DEMO_PRICES?.trim()
  if (overridesRaw) {
    for (const pair of overridesRaw.split(',')) {
      const [rawSlug, rawAmount] = pair.split(':').map(part => part.trim())
      if (rawSlug === sheet.slug && rawAmount) {
        if (!validCentavos(rawAmount)) throw new Error('DEMO_INVALID_PRICE_OVERRIDE')
        return rawAmount
      }
    }
  }
  const globalDefault = env.WIKICHEM_DEMO_DEFAULT_PRICE_CENTAVOS?.trim()
  if (globalDefault) {
    if (!validCentavos(globalDefault)) throw new Error('DEMO_INVALID_PRICE_OVERRIDE')
    return globalDefault
  }
  if (!validCentavos(sheet.defaultPriceCentavos)) throw new Error('DEMO_INVALID_PRICE_DEFAULT')
  return sheet.defaultPriceCentavos
}

const forbiddenCommercialPatterns = [
  /procedimento operacional integral não reproduzido/i,
  /ficha técnica informativa — texto descritivo original/i,
  /\bdemo\b/i,
  /\bfixture\b/i,
  /simulação de software/i,
]

export function validateCommercialProductContent(editor: Pick<Editor, 'title' | 'freeSummary' | 'publicDescription' | 'fullDescription' | 'fullProcedure'>) {
  const fullDesc = editor.fullDescription.trim()
  const fullProc = editor.fullProcedure.trim()
  if (fullDesc.length < 400 || fullProc.length < 400) {
    throw new Error('COMMERCIAL_PRODUCT_REQUIRES_SUBSTANTIAL_CONTENT')
  }
  for (const field of [editor.title, editor.freeSummary, editor.publicDescription, fullDesc, fullProc]) {
    if (forbiddenCommercialPatterns.some(pattern => pattern.test(field))) {
      throw new Error('COMMERCIAL_PRODUCT_CONTAINS_PLACEHOLDER_OR_SYNTHETIC_LABEL')
    }
  }
}

export function technicalCatalogEditor(
  sheet: TechnicalSheetSpec,
  idsByCode: Record<Facet, ReadonlyMap<string, string>>,
  version = 'v1',
  commercial = sheet.defaultPriceCentavos !== null,
): Editor {
  const classifications = {} as Record<Facet, string[]>
  for (const facet of Object.keys(sheet.classifications) as Facet[]) {
    classifications[facet] = sheet.classifications[facet].map(code => {
      const resolved = idsByCode[facet].get(code)
      if (!resolved) throw new Error('DEMO_TERM_CODE_MISSING_' + facet + '_' + code)
      return resolved
    })
  }

  if (!commercial) {
    return {
      ...emptyEditor(),
      title: sheet.title,
      freeSummary: sheet.freeSummary,
      publicDescription: sheet.publicDescription,
      fullDescription: 'Referência técnica catalogada no acervo Wiki-Chem. Produto digital interpretativo em preparação editorial.',
      fullProcedure: `Consulta referencial de metadados públicos (${sheet.source.canonicalUrl}). Conteúdo autoral estendido pendente de elaboração; item mantido sem oferta comercial.`,
      changelog: `Catalogação referencial ${version}; pendência de produto autoral registrada sem oferta comercial.`,
      classifications,
      contributors: [
        {
          displayName: 'Acervo Editorial Wiki-Chem',
          contributorType: 'ORGANIZATION',
          reference: 'Síntese descritiva de metadados técnicos em português',
          role: 'AUTHOR',
        },
        {
          displayName: 'Catalogação Técnica Wiki-Chem',
          contributorType: 'ORGANIZATION',
          reference: 'Verificação bibliográfica estrutural de fonte pública oficial (sem revisão científica humana)',
          role: 'CURATOR',
        },
      ],
      sources: [
        {
          referenceText: sheet.source.referenceText,
          sourceType: 'REFERENCE',
          canonicalUrl: sheet.source.canonicalUrl,
          ownerCredit: sheet.source.ownerCredit,
          editionLabel: sheet.source.editionLabel,
          locator: sheet.source.locator,
          usageConditions:
            'Referência bibliográfica e metadados factuais de documento público governamental, sem comercialização de conteúdo externo.',
          permissionStatus: 'APPROVED',
          permissionEvidence: `Fonte pública oficial verificada (${sheet.source.canonicalUrl}); pendência de guia autoral registrada.`,
          permissionAcknowledged: true,
        },
      ],
    }
  }

  const editor: Editor = {
    ...emptyEditor(),
    title: sheet.title,
    freeSummary: sheet.freeSummary,
    publicDescription: sheet.publicDescription,
    fullDescription: sheet.fullDescription,
    fullProcedure: sheet.fullProcedure,
    changelog: `Edição digital ${version} (${sheet.documentCode}) — guia técnico interpretativo autoral do Wiki-Chem fundamentado em referência pública verificada.`,
    classifications,
    contributors: [
      {
        displayName: 'Acervo Editorial Wiki-Chem',
        contributorType: 'ORGANIZATION',
        reference: `Guia analítico interpretativo original ${sheet.documentCode} em português`,
        role: 'AUTHOR',
      },
      {
        displayName: 'Catalogação Técnica Wiki-Chem',
        contributorType: 'ORGANIZATION',
        reference: 'Verificação estrutural e rastreabilidade bibliográfica (sem revisão paritária humana)',
        role: 'CURATOR',
      },
    ],
    sources: [
      {
        referenceText: `Guia Técnico Interpretativo Wiki-Chem ${sheet.documentCode} — síntese autoral estruturada sobre ${sheet.title}.`,
        sourceType: 'ORIGINAL',
        canonicalUrl: '',
        ownerCredit: 'Wiki-Chem — Conteúdo Técnico Original',
        editionLabel: `${sheet.documentCode} · ${version}`,
        locator: `Catálogo Digital Wiki-Chem (${sheet.slug})`,
        usageConditions:
          'Produto digital interpretativo original do Wiki-Chem destinado a consulta e estudo individual; não transfere direitos sobre normas externas nem substitui validação laboratorial.',
        permissionStatus: 'APPROVED',
        permissionEvidence:
          'Texto técnico autoral do projeto Wiki-Chem; integridade SHA-256: ' +
          createHash('sha256').update(sheet.fullDescription + '\n' + sheet.fullProcedure).digest('hex'),
        permissionAcknowledged: true,
      },
      {
        referenceText: sheet.source.referenceText,
        sourceType: 'REFERENCE',
        canonicalUrl: sheet.source.canonicalUrl,
        ownerCredit: sheet.source.ownerCredit,
        editionLabel: sheet.source.editionLabel,
        locator: sheet.source.locator,
        usageConditions:
          'Publicação governamental de acesso público citada como fundamentação técnica e bibliográfica; o documento oficial permanece gratuito na URL do órgão emissor e não é objeto da oferta comercial.',
        permissionStatus: 'APPROVED',
        permissionEvidence: `URL pública oficial verificada (${sheet.source.canonicalUrl}); citada exclusivamente como referência técnica.`,
        permissionAcknowledged: true,
      },
    ],
  }

  validateCommercialProductContent(editor)
  return editor
}

export const informativeEditor = (sheet: TechnicalSheetSpec, idsByCode: Record<Facet, ReadonlyMap<string, string>>) =>
  technicalCatalogEditor(sheet, idsByCode, 'v1', false)
