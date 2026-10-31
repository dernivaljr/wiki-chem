import { ExternalLink, FileCheck2 } from '../components/icons'
import OfferSection from '../commerce/OfferSection'
import { brl } from '../commerce/types'
import { facets, labels } from './types'
import type { Preview } from './types'
import { Link } from 'react-router-dom'

function referenceUrl(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

function summarizeSentences(text: string, maxSentences = 3): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const parts = normalized.split(/(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/).filter(Boolean)
  if (parts.length <= maxSentences) return normalized
  return parts.slice(0, maxSentences).join(' ').trim()
}

function extractDocumentCode(preview: Preview): string {
  const originalSource = preview.references.find(ref => ref.sourceType === 'ORIGINAL')
  if (originalSource?.editionLabel) {
    const code = originalSource.editionLabel.split('·')[0]?.trim()
    if (code) return code
  }
  const std = preview.technicalMetadata.standards[0]
  if (std?.identifier) return std.identifier
  if (std?.label) return std.label
  return `Metodologia #${preview.id}`
}

function extractReferenceLabel(preview: Preview): string {
  const std = preview.technicalMetadata.standards[0]
  if (std) {
    return std.editionLabel ? `${std.label} (${std.editionLabel})` : std.label
  }
  const ext = preview.references.find(ref => ref.sourceType === 'REFERENCE') ?? preview.references[0]
  if (!ext) return 'Acervo Wiki-Chem'
  return ext.editionLabel ? `${ext.ownerCredit || ext.referenceText} (${ext.editionLabel})` : (ext.ownerCredit || ext.referenceText)
}

export function CompactResultCard({ preview, detailHref }: { preview: Preview; detailHref: string }) {
  const docCode = extractDocumentCode(preview)
  const primaryTechnique = preview.technicalMetadata.techniques[0]?.label ?? 'Química analítica'
  const extraTechniques = Math.max(0, preview.technicalMetadata.techniques.length - 1)
  const analytes = preview.technicalMetadata.analytes.slice(0, 3).map(t => t.label).join(', ')
  const matrices = preview.technicalMetadata.matrices.slice(0, 2).map(t => t.label).join(', ')
  const analyteMatrix = [analytes, matrices].filter(Boolean).join(' · ') || 'Aplicação laboratorial geral'
  const refLabel = extractReferenceLabel(preview)

  return (
    <article className="search-card search-card--compact">
      <div className="search-card__top">
        <div className="search-card__identifiers">
          <span className="search-badge">{docCode}</span>
          <span className="search-version">Versão {preview.versionLabel}</span>
        </div>
        {preview.owned ? (
          <span className="search-card__price-pill search-card__price-pill--owned">Adquirido</span>
        ) : preview.offer?.available && preview.offer.amountCentavos ? (
          <span className="search-card__price-pill">{brl(preview.offer.amountCentavos)}</span>
        ) : null}
      </div>

      <h3 className="search-card__title">
        <Link to={detailHref}>{preview.title}</Link>
      </h3>

      <p className="search-card__summary">{summarizeSentences(preview.freeSummary, 3)}</p>

      <dl className="search-card__specs">
        <div>
          <dt>Técnica principal</dt>
          <dd>{primaryTechnique}{extraTechniques > 0 ? ` (+${extraTechniques})` : ''}</dd>
        </div>
        <div>
          <dt>Analito / Matriz</dt>
          <dd>{analyteMatrix}</dd>
        </div>
        <div>
          <dt>Referência</dt>
          <dd>{refLabel}</dd>
        </div>
      </dl>

      <div className="search-card__footer">
        <Link className="search-card__details-link" to={detailHref}>
          Ver detalhes
        </Link>
        <OfferSection key={preview.versionId + ':' + (preview.offer?.revision ?? 0)} preview={preview} compact />
      </div>
    </article>
  )
}

export default function PreviewContent({ preview, detail = false }: { preview: Preview; detail?: boolean }) {
  const docCode = extractDocumentCode(preview)
  const standardTerm = preview.technicalMetadata.standards[0]
  const hasOriginalGuide = preview.references.some(source => source.sourceType === 'ORIGINAL') && (preview.purchasable || preview.owned)

  if (!detail) {
    return <CompactResultCard preview={preview} detailHref={'/metodologias/' + preview.id} />
  }

  return (
    <div className="method-detail__grid">
      <div className="method-detail__main">
        <div className="method-detail__docbar">
          <span className="search-badge">{docCode}</span>
          {standardTerm && (
            <span className="search-badge search-badge--reference">
              Base documental: {standardTerm.label}{standardTerm.editionLabel ? ` · ${standardTerm.editionLabel}` : ''}
            </span>
          )}
          <span className="search-version">Versão {preview.versionLabel}</span>
        </div>

        <h1 className="method-detail__title">{preview.title}</h1>

        <p className="method-detail__lead">{summarizeSentences(preview.freeSummary, 3)}</p>

        <section className="method-detail__section" aria-label="Descrição gratuita">
          <h2>Escopo e resumo técnico</h2>
          <p className="search-text">{summarizeSentences(preview.publicDescription, 4)}</p>
        </section>

        {hasOriginalGuide && (
          <section className="method-detail__deliverables" aria-label="Conteúdo incluído no produto digital">
            <h2>
              <FileCheck2 size={18} aria-hidden="true" />
              <span>O que está incluído neste guia técnico Wiki-Chem</span>
            </h2>
            <ul>
              <li>Fundamentação físico-química, escopo analítico e condicionamento conceitual por matriz.</li>
              <li>Análise crítica de interferências químicas, espectrais ou cromatográficas e mitigação.</li>
              <li>Estrutura operacional comentada em português, modelo de calibração, equações e cálculos.</li>
              <li>Diretrizes conceituais de controle de qualidade (QC) e rastreabilidade à fonte pública oficial.</li>
            </ul>
            <p className="method-detail__transparency">
              Conteúdo interpretativo autoral do Wiki-Chem disponível na biblioteca após aquisição. Documentos públicos oficiais citados permanecem de livre acesso nos órgãos emissores e não são comercializados como normas licenciadas.
            </p>
          </section>
        )}

        {facets.some(facet => preview.technicalMetadata[facet].length > 0) && (
          <section className="method-detail__section" aria-label="Classificações essenciais">
            <h2>Classificações técnicas</h2>
            <dl className="search-metadata">
              {facets.map(facet => preview.technicalMetadata[facet].length > 0 && (
                <div key={facet}>
                  <dt>{labels[facet]}</dt>
                  <dd>
                    {preview.technicalMetadata[facet]
                      .map(term => term.label + (facet === 'standards' && term.editionLabel ? ' (' + term.editionLabel + ')' : ''))
                      .join('; ')}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="method-detail__section search-references-section" aria-label="Referências permitidas">
          <h2>Referências e identificação documental</h2>
          <ul className="search-references">
            {preview.references.map((source, index) => (
              <li key={index}>
                <span className="search-source-tag">
                  {source.sourceType === 'REFERENCE' ? '[Fonte pública de referência] ' : '[Produto autoral Wiki-Chem] '}
                </span>
                <span>{source.referenceText}</span>
                {source.editionLabel && <span> — {source.editionLabel}</span>}
                {source.locator && <span> — {source.locator}</span>}
                {source.ownerCredit && <span> · {source.ownerCredit}</span>}
                {referenceUrl(source.canonicalUrl) && (
                  <>
                    {' · '}
                    <a className="search-ext-link" href={referenceUrl(source.canonicalUrl)!} target="_blank" rel="noopener noreferrer">
                      <span>Consultar fonte {index + 1}</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="method-detail__section" aria-label="Autoria e curadoria">
          <h2>Responsabilidade editorial</h2>
          <ul className="method-detail__contributors">
            {preview.contributors.map((person, index) => (
              <li key={index}>
                <strong>{person.displayName}</strong> — {person.role === 'AUTHOR' ? 'Autoria técnica' : 'Catalogação e curadoria'}
                {person.reference && ` · ${person.reference}`}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="method-detail__aside">
        <OfferSection key={preview.versionId + ':' + (preview.offer?.revision ?? 0)} preview={preview} />
      </aside>
    </div>
  )
}
