import OfferSection from '../commerce/OfferSection'
import { facets, labels } from './types'
import type { Preview } from './types'

function referenceUrl(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export default function PreviewContent({ preview, detail = false }: { preview: Preview; detail?: boolean }) {
  const hasExternalReference = preview.references.some(source => source.sourceType === 'REFERENCE')
  const primaryReference = preview.references[0]
  return <>
    <div className="search-meta-bar">
      <span className="search-version">Versão {preview.versionLabel}</span>
      {hasExternalReference
        ? <span className="search-badge search-badge--reference">Ficha técnica informativa · Fonte pública externa</span>
        : preview.offer
          ? <span className="search-badge search-badge--synthetic">Demonstração comercial sintética · Fixture de software</span>
          : <span className="search-badge">Registro editorial interno</span>}
      {hasExternalReference && primaryReference?.ownerCredit && (
        <span className="search-origin">Fonte: {primaryReference.ownerCredit}{primaryReference.editionLabel ? ' (' + primaryReference.editionLabel + ')' : ''}</span>
      )}
    </div>
    <p className="search-text">{preview.freeSummary}</p>
    {detail && <section aria-label="Descrição gratuita"><h2>Descrição gratuita</h2><p className="search-text">{preview.publicDescription}</p></section>}
    {facets.some(facet => preview.technicalMetadata[facet].length > 0) && (
      <dl className="search-metadata">{facets.map(facet => preview.technicalMetadata[facet].length > 0 && <div key={facet}>
        <dt>{labels[facet]}</dt>
        <dd>{preview.technicalMetadata[facet].map(term => term.label + (facet === 'standards' && term.editionLabel ? ' (' + term.editionLabel + ')' : '')).join('; ')}</dd>
      </div>)}</dl>
    )}
    <section className="search-references-section" aria-label="Referências permitidas">
      <h3>Referências e identificação documental</h3>
      <ul className="search-references">{preview.references.map((source, index) => <li key={index}>
        {source.sourceType === 'REFERENCE' && <span className="search-source-tag">[Fonte pública] </span>}
        <span>{source.referenceText}</span>
        {source.editionLabel && <span> — {source.editionLabel}</span>}
        {source.locator && <span> — {source.locator}</span>}
        {source.ownerCredit && <span> · {source.ownerCredit}</span>}
        {referenceUrl(source.canonicalUrl) && <> · <a href={referenceUrl(source.canonicalUrl)!} target="_blank" rel="noopener noreferrer">Consultar fonte {index + 1}</a></>}
      </li>)}</ul>
    </section>
    {detail && <section aria-label="Autoria e curadoria"><h2>Autoria e curadoria</h2><ul>{preview.contributors.map((person, index) => <li key={index}>{person.displayName} — {person.role === 'AUTHOR' ? 'Autoria' : 'Curadoria'}{person.reference && ' · ' + person.reference}</li>)}</ul></section>}
    <OfferSection key={preview.versionId + ':' + (preview.offer?.revision ?? 0)} preview={preview} />
  </>
}
