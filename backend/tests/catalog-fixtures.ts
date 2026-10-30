import type { Editor, Facet } from '../src/modules/catalog/catalog.contracts.js'
import { emptyEditor } from '../src/modules/catalog/catalog.rules.js'

// Texto original sintético da suíte, sem técnica laboratorial real ou autorização de terceiros.
export function demoEditor(ids: Record<Facet, string[]>, marker = 'DEMO_PROCEDURE_ONLY') : Editor {
  return {
    ...emptyEditor(), title: 'DEMO — metodologia sintética de teste', freeSummary: 'Resumo gratuito original da fixture DEMO, sem procedimento.',
    publicDescription: 'Descrição pública de uma fixture de software, sem uso laboratorial.',
    fullDescription: 'Descrição integral DEMO restrita à administração.',
    fullProcedure: marker + ': texto original de teste, sem instruções laboratoriais reais.',
    changelog: 'Criação de fixture original de demonstração.',
    classifications: structuredClone(ids),
    sources: [{
      referenceText: 'Texto original da fixture DEMO desta suíte de software.', sourceType: 'ORIGINAL',
      canonicalUrl: '', ownerCredit: 'Equipe sintética DEMO de testes', editionLabel: 'DEMO-v1', locator: 'Arquivo de fixture da suíte',
      usageConditions: 'Conteúdo original criado para testar software; não reproduz fonte técnica externa.',
      permissionStatus: 'APPROVED', permissionEvidence: 'Declaração de origem da própria fixture de teste; não representa licença de metodologia real.', permissionAcknowledged: true,
    }],
    contributors: [
      { displayName: 'Equipe sintética DEMO de testes', contributorType: 'ORGANIZATION', reference: 'Fixture original', role: 'AUTHOR' },
      { displayName: 'Curadoria sintética DEMO da suíte', contributorType: 'ORGANIZATION', reference: 'Somente teste de software', role: 'CURATOR' },
    ],
  }
}
