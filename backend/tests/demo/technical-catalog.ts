import type { Editor, Facet, TermInput } from '../../src/modules/catalog/catalog.contracts.js'
import { emptyEditor } from '../../src/modules/catalog/catalog.rules.js'

export interface TechnicalSheetSpec {
  slug: string
  title: string
  freeSummary: string
  publicDescription: string
  limitations: string
  classifications: Record<Facet, readonly string[]>
  source: {
    referenceText: string
    canonicalUrl: string
    ownerCredit: string
    editionLabel: string
    locator: string
  }
}

export const informativeNotice =
  'FICHA TÉCNICA INFORMATIVA — TEXTO DESCRITIVO ORIGINAL BASEADO EM FONTE PÚBLICA VERIFICÁVEL, SEM PROCEDIMENTO INTEGRAL E SEM OFERTA COMERCIAL'

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
    title: 'Determinação espectrofotométrica de ferro total com 1,10-fenantrolina (UV-Vis)',
    freeSummary:
      'Ficha técnica informativa sobre a quantificação de ferro total em soluções aquosas e extratos minerais por espectrofotometria de absorção molecular UV-Vis, baseada na redução a Fe²⁺ e formação do complexo laranja-avermelhado com 1,10-fenantrolina (orto-fenantrolina) em torno de 510 nm.',
    publicDescription:
      'Descreve o princípio clássico de determinação de ferro por reação de íons ferrosos (Fe²⁺) com 1,10-fenantrolina em meio tamponado, após redução prévia do ferro trivalente (Fe³⁺) com agente redutor apropriado, formando o quelato estável tris(1,10-fenantrolina)ferro(II) medido em espectrofotômetro UV-Vis.',
    limitations:
      'Exige controle de pH na faixa de estabilidade do complexo e ausência de agentes fortemente complexantes (como pirofosfato e cianeto) ou concentrações elevadas de cátions competidores sem mascaramento; esta ficha apresenta síntese informativa original e não substitui validação laboratorial nem reproduz o texto integral do relatório público.',
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
      locator: 'Registro bibliográfico oficial USGS Publications Warehouse e relatório PDF público TEI-223',
    },
  },
  {
    slug: 'info-epa-200-7-metais-icp-oes',
    title: 'Determinação multielementar de metais e elementos-traço em águas e resíduos por ICP-OES (EPA 200.7)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 200.7 (Rev. 4.4) para determinação simultânea ou sequencial de metais e elementos-traço dissolvidos ou totais recuperáveis em águas e resíduos aquosos/sólidos por espectrometria de emissão óptica com plasma indutivamente acoplado (ICP-OES / ICP-AES).',
    publicDescription:
      'A amostra nebulizada é introduzida em plasma de argônio de radiofrequência, promovendo excitação atômica e iônica cujas linhas de emissão características são medidas opticamente com correção de fundo. Contempla metais como ferro, cobre, chumbo, zinco, manganês e arsênio após preparo ácido compatível com a matriz.',
    limitations:
      'Sujeito a sobreposições espectrais, efeitos de matriz por sólidos dissolvidos elevados e diferenças de viscosidade/acidez entre padrões e amostras; requer digestão prévia para frações totais recuperáveis e não confere vigência regulatória automática fora da jurisdição da fonte.',
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
      locator: 'Seção 1.0 (Scope and Application) e sumário público ESAM do Método 200.7',
    },
  },
  {
    slug: 'info-epa-200-8-elementos-traco-icp-ms',
    title: 'Determinação de elementos-traço em águas e resíduos por ICP-MS (EPA 200.8)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 200.8 (Rev. 5.4) para quantificação multielementar em baixas concentrações de elementos-traço como arsênio, chumbo, cobre, zinco e manganês em águas e extratos digeridos por espectrometria de massas com plasma indutivamente acoplado (ICP-MS).',
    publicDescription:
      'Íons gerados em plasma de argônio são extraídos por interface sob vácuo e separados conforme a razão massa/carga (m/z), empregando padrões internos para compensar deriva instrumental e efeitos físicos de transporte de amostra em águas potáveis, superficiais, subterrâneas e resíduos.',
    limitations:
      'Exige controle rigoroso de interferências isobáricas e de íons poliatômicos (como ArCl⁺ sobre m/z 75 do arsênio), além de limitação de sólidos totais dissolvidos para evitar deposição nos cones de amostragem.',
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
      locator: 'Ficha pública ESAM e escopo analítico do Método 200.8 (Rev. 5.4)',
    },
  },
  {
    slug: 'info-epa-245-1-mercurio-cvaas',
    title: 'Determinação de mercúrio em água por absorção atômica com vapor frio — CVAAS (EPA 245.1)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 245.1 (Rev. 3.0) para determinação de mercúrio total em amostras de água por espectrometria de absorção atômica com geração manual de vapor frio (CVAAS) em 253,7 nm.',
    publicDescription:
      'Baseia-se na conversão oxidativa das formas inorgânicas e orgânicas de mercúrio a Hg²⁺ seguida de redução química a vapor monoatômico Hg⁰, arrastado por gás carreador até célula óptica de absorção posicionada no caminho de radiação de lâmpada de mercúrio.',
    limitations:
      'Vapores orgânicos voláteis, cloro livre e sulfetos podem causar absorção molecular inespecífica ou retenção do analito; requer preservação cuidadosa contra perdas por volatilização ou adsorção nas paredes do frasco.',
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
      locator: 'Ficha pública ESAM e sumário do Método 245.1 (Rev. 3.0)',
    },
  },
  {
    slug: 'info-epa-300-0-anions-ic',
    title: 'Determinação de ânions inorgânicos em água por cromatografia de íons (EPA 300.0)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 300.0 (Rev. 2.1) para separação e quantificação de ânions inorgânicos comuns (fluoreto, cloreto, nitrito, nitrato, fosfato e sulfato) em água potável, águas superficiais e efluentes por cromatografia de íons com detecção condutimétrica suprimida.',
    publicDescription:
      'Uma alíquota aquosa filtrada é injetada em eluente carbonato/bicarbonato através de coluna trocadora aniônica, seguida de supressão química da condutividade de fundo do eluente e medição condutimétrica das espécies convertidas às suas formas ácidas condutoras.',
    limitations:
      'Amostras com força iônica muito alta (como cloreto ou sulfato em excesso) podem sobrecarregar a coluna e degradar a resolução de picos adjacentes como fluoreto, nitrito e nitrato; tempos de guarda estritos aplicam-se especialmente a nitrito e ortofosfato.',
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
      locator: 'Parte A (ânions comuns: F⁻, Cl⁻, NO₂⁻, Br⁻, NO₃⁻, HPO₄²⁻, SO₄²⁻), seções 1.0 a 4.0',
    },
  },
  {
    slug: 'info-epa-180-1-turbidez-nefelometria',
    title: 'Determinação de turbidez em águas por nefelometria óptica (EPA 180.1)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 180.1 (agosto/1993) para medição nefelométrica de turbidez em água potável, águas naturais e efluentes com base na intensidade de luz espalhada a 90° em relação ao feixe incidente.',
    publicDescription:
      'Compara a intensidade da luz espalhada em ângulo reto pelas partículas em suspensão na amostra (argila, silte, matéria orgânica e microrganismos) contra padrões poliméricos de referência sob condições ópticas definidas em turbidímetro nefelométrico.',
    limitations:
      'Bolhas de gás dissolvido, detritos grosseiros de rápida sedimentação, vibração e absorção intensa de luz por substâncias dissolvidas fortemente coloridas causam desvios positivos ou negativos na leitura nefelométrica.',
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
    title: 'Determinação de nitrogênio amoniacal em águas por colorimetria semiautomatizada (EPA 350.1)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 350.1 (Rev. 2.0) para determinação de nitrogênio amoniacal (NH₃-N) em água potável, águas superficiais e efluentes domésticos ou industriais por análise colorimétrica semiautomatizada baseada na reação de Berthelot (fenolato alcalino e hipoclorito).',
    publicDescription:
      'Em sistema de fluxo contínuo, a amônia reage com hipoclorito e fenolato alcalino na presença de catalisador formando derivado indofenol azul cuja absorbância é monitorada fotometricamente, com complexação alcalina para evitar precipitação de hidróxidos de cálcio e magnésio.',
    limitations:
      'Turbidez residual, coloração intrínseca da matriz, cloro residual não declorado e hidrólise de compostos nitrogenados orgânicos lábeis em meio fortemente alcalino podem alterar o sinal analítico; algumas matrizes exigem destilação prévia.',
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
    title: 'Determinação de nitrato e nitrito em águas por colorimetria automatizada com redução em cádmio (EPA 353.2)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 353.2 (Rev. 2.0) para determinação de nitrato-nitrito (NO₃⁻ + NO₂⁻) ou nitrito isolado em águas potáveis, superficiais e efluentes por redução em coluna de cádmio cobreado e detecção colorimétrica automatizada após diazotação.',
    publicDescription:
      'O nitrato presente na amostra filtrada é reduzido quantitativamente a nitrito em coluna de cádmio tratado com cobre; o nitrito total resultante sofre reação de diazotação e acoplamento formando corante azo avermelhado medido em analisador colorimétrico de fluxo.',
    limitations:
      'Metais dissolvidos elevados, óleos/graxas, sulfeto e cloro residual reduzem a eficiência da coluna de cádmio; turbidez e cor própria da matriz exigem filtração ou compensação de branco sem coluna redutora.',
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
    title: 'Determinação de fósforo e ortofosfato em águas por colorimetria semiautomatizada (EPA 365.1)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 365.1 (Rev. 2.0) para determinação de ortofosfato dissolvido ou fósforo total (após digestão ácida com persulfato) em águas e efluentes aquosos por reação com molibdato de amônio, tartarato de antimônio e potássio e redução com ácido ascórbico.',
    publicDescription:
      'Íons ortofosfato reagem em meio ácido formando heteropoliácido fosfomolíbdico, reduzido pelo ácido ascórbico ao complexo azul de molibdênio monitorado fotometricamente em sistema colorimétrico de fluxo contínuo.',
    limitations:
      'Arseniato produz complexo azul semelhante ao fosfato e sílica/turbidez ou concentrações elevadas de sais podem interferir; a distinção entre ortofosfato solúvel e fósforo total depende estritamente da etapa prévia de filtração ou digestão.',
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
    title: 'Determinação de demanda química de oxigênio (DQO) por colorimetria semiautomatizada (EPA 410.4)',
    freeSummary:
      'Ficha técnica informativa do Método EPA 410.4 (Rev. 2.0) para determinação da demanda química de oxigênio (DQO) em águas superficiais e efluentes domésticos ou industriais por digestão ácida fechada com dicromato e leitura colorimétrica.',
    publicDescription:
      'A matéria oxidável da amostra é digerida em frasco selado sob aquecimento em presença de excesso de dicromato de potássio e ácido sulfúrico com catalisador de prata, avaliando-se fotometricamente a variação de absorção associada à redução do dicromato.',
    limitations:
      'Íons cloreto em concentrações superiores à capacidade de complexação pelo sulfato mercúrico sofrem oxidação positiva; compostos aromáticos voláteis ou nitrogenados refratários podem apresentar oxidação incompleta e os resíduos exigem descarte controlado de metais pesados.',
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
    title: 'Determinação de metais em solução e digeridos ácidos por absorção atômica em chama — FAAS (EPA 7000B)',
    freeSummary:
      'Ficha técnica informativa do Método EPA SW-846 7000B (Rev. 2) sobre espectrometria de absorção atômica em chama (FAAS) aplicável à determinação de metais como ferro, cobre, chumbo, zinco e manganês em águas subterrâneas, extratos aquosos, solos, lodos e resíduos previamente digeridos.',
    publicDescription:
      'Soluções aquosas ou digeridos ácidos são aspirados diretamente em chama laminar (ar-acetileno ou óxido nitroso-acetileno), atomizando o elemento de interesse para medição da atenuação da radiação emitida na linha de ressonância específica com correção de fundo.',
    limitations:
      'Apresenta limites de quantificação superiores aos de forno de grafite ou ICP-MS, além de interferências químicas de ionização, formação de óxidos refratários e efeitos físicos de viscosidade ou teor salino elevado na nebulização.',
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
    title: 'Determinação espectrofotométrica de cromo hexavalente — Cr(VI) com difenilcarbazida (EPA 7196A)',
    freeSummary:
      'Ficha técnica informativa do Método EPA SW-846 7196A (julho/1992) para quantificação de cromo hexavalente dissolvido — Cr(VI) em águas subterrâneas e extratos de lixiviação (EP/TCLP) por espectrofotometria UV-Vis no visível (540 nm) após reação com difenilcarbazida em meio ácido.',
    publicDescription:
      'Na ausência de interferentes redutores significativos, o Cr(VI) dissolvido reage seletivamente com difenilcarbazida em solução ácida produzindo complexo vermelho-violeta cuja absorbância é medida a 540 nm em espectrofotômetro UV-Vis.',
    limitations:
      'Espécies redutoras (como sulfito e matéria orgânica oxidável) podem converter Cr(VI) durante a coleta ou acidificação, gerando resultados subestimados; molibdênio, vanádio e mercúrio em concentrações elevadas também reagem com o reagente colorimétrico.',
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
    title: 'Determinação de compostos orgânicos voláteis (COVs) em águas, solos e resíduos por GC-MS (EPA 8260D)',
    freeSummary:
      'Ficha técnica informativa do Método EPA SW-846 8260D (Rev. 4, junho/2018) para identificação e quantificação de compostos orgânicos voláteis (COVs, como benzeno e tolueno) em matrizes aquosas, solos, sedimentos e resíduos sólidos por cromatografia gasosa acoplada à espectrometria de massas (GC-MS).',
    publicDescription:
      'Integra introdução de voláteis compatível com a matriz (como purga e captura, headspace estático ou dessorção apropriada) à separação em coluna capilar de sílica fundida e detecção por espectrometria de massas com confirmação espectral e quantificação por padrões internos/substitutos.',
    limitations:
      'Altamente sensível a contaminação laboratorial de fundo por vapores de solventes (como cloreto de metileno e acetona), perdas por volatilização na amostragem sem headspace zero e arraste (carryover) após amostras altamente concentradas.',
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
    title: 'Medição eletrométrica de pH em águas e resíduos aquosos (EPA 9040C)',
    freeSummary:
      'Ficha técnica informativa do Método EPA SW-846 9040C (Rev. 3, novembro/2004) para determinação eletrométrica do potencial hidrogeniônico (pH) em resíduos aquosos e sistemas multifásicos nos quais a fase aquosa constitua ao menos 20% do volume total.',
    publicDescription:
      'Determina a atividade hidrogeniônica por potenciometria direta utilizando eletrodo indicador de vidro e referência (ou eletrodo combinado) calibrado frente a soluções-tampão rastreáveis, com compensação manual ou automática de temperatura.',
    limitations:
      'Recobrimento da membrana de vidro por óleos, graxas ou material particulado, erro alcalino em pH extremo e baixa força iônica ou suspensões não aquosas comprometem a estabilidade do potencial; parâmetro definido pelo método (MDP) no contexto regulatório RCRA.',
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
    title: 'Determinação titrimétrica de cloreto com nitrato de prata — argentometria (EPA 9253)',
    freeSummary:
      'Ficha técnica informativa do Método EPA SW-846 9253 (Rev. 0, setembro/1994) para quantificação volumétrica de íons cloreto (Cl⁻) em águas e soluções resultantes de combustão em bomba de oxigênio por titulação de precipitação com nitrato de prata.',
    publicDescription:
      'Em meio levemente alcalino a neutro controlado, o cloreto é titulado com solução padronizada de nitrato de prata na presença de indicador cromato de potássio, formando precipitado branco de cloreto de prata até o ponto final indicado pela formação de cromato de prata avermelhado.',
    limitations:
      'Brometo, iodeto e cianeto são cotitulados como haletos/pseudohaletos equivalentes; sulfeto, tiossulfato e tiocianato exigem oxidação prévia e matrizes intensamente coloridas dificultam a observação visual do ponto final.',
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

export function informativeEditor(sheet: TechnicalSheetSpec, idsByCode: Record<Facet, ReadonlyMap<string, string>>): Editor {
  const classifications = {} as Record<Facet, string[]>
  for (const facet of Object.keys(sheet.classifications) as Facet[]) {
    classifications[facet] = sheet.classifications[facet].map(code => {
      const resolved = idsByCode[facet].get(code)
      if (!resolved) throw new Error('DEMO_TERM_CODE_MISSING_' + facet + '_' + code)
      return resolved
    })
  }
  const publicDescription = `${sheet.publicDescription}\n\nLimitações e interferências documentadas: ${sheet.limitations}\n\nAviso editorial: ${informativeNotice}.`
  return {
    ...emptyEditor(),
    title: sheet.title,
    freeSummary: sheet.freeSummary,
    publicDescription,
    fullDescription: `${informativeNotice}.\n\nSíntese descritiva original em português elaborada exclusivamente para catalogação e pesquisa demonstrativa no Wiki-Chem. Nenhuma etapa operacional integral do documento externo é copiada ou comercializada.`,
    fullProcedure: `${informativeNotice}.\n\nProcedimento operacional integral não reproduzido na plataforma para preservar a integridade documental e evitar apropriação de conteúdo de terceiros. Consulte diretamente a publicação oficial de acesso público indicada nas referências (${sheet.source.canonicalUrl}).`,
    changelog: 'Catalogação informativa v1 em ambiente demonstrativo isolado; metadados verificados em fonte pública oficial, sem revisão científica humana.',
    classifications,
    contributors: [
      {
        displayName: 'Projeto Wiki-Chem — síntese informativa original em português',
        contributorType: 'ORGANIZATION',
        reference: 'backend/tests/demo/technical-catalog.ts; descrição própria sem cópia de procedimento externo',
        role: 'AUTHOR',
      },
      {
        displayName: 'Automação de catalogação demonstrativa do Wiki-Chem',
        contributorType: 'ORGANIZATION',
        reference: 'Conferência estrutural automatizada de metadados públicos; não representa curadoria científica humana',
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
          'Referência bibliográfica e metadados factuais de documento público governamental, com texto descritivo original em português, sem reprodução de procedimento integral e sem oferta comercial.',
        permissionStatus: 'APPROVED',
        permissionEvidence: `Fonte oficial de acesso público verificada (${sheet.source.canonicalUrl}); registro exclusivo de demonstração isolada (NODE_ENV=test), sem comercialização de conteúdo de terceiros.`,
        permissionAcknowledged: true,
      },
    ],
  }
}
