import type { Cart, Offer, Product } from '../commerce/types'
import type { Preview } from '../catalog/types'
// Objetos sintéticos exclusivos dos testes de interface, sem seed/valor comercial.
export const demoOffer = (): Offer => ({ productId: '1', revision: 3, active: true, priceId: '2', amountCentavos: '1000', currency: 'BRL', available: true, reason: null })
export const demoPreview = (): Preview => ({ owned: false, id: '10', versionId: '20', versionLabel: 'v1', title: 'DEMO original', freeSummary: 'Resumo DEMO original da suíte.', publicDescription: 'Descrição DEMO.', technicalMetadata: { techniques: [], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] }, references: [], contributors: [], offer: demoOffer(), purchasable: true })
export const demoProduct = (): Product => ({ id: '1', methodologyId: '10', slug: 'demo-original', title: 'DEMO original', revision: 3, active: true, offer: demoOffer() })
export const demoCart = (): Cart => ({ revision: 2, currency: 'BRL', totalCentavos: '1000', unavailableCount: 0, items: [{ owned: false, productId: '1', methodologyId: '10', title: 'DEMO original', quantity: 1, observedPriceId: '2', observedAmountCentavos: '1000', observedVersionId: '20', observedVersionLabel: 'v1', currentVersionId: '20', currentVersionLabel: 'v1', offer: demoOffer(), issues: [] }] })
