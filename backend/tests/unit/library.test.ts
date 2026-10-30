import { describe, expect, it } from 'vitest'
import { contentQuery, libraryEntry, libraryParams } from '../../src/modules/library/library.contracts.js'
import { versionAccessInput } from '../../src/modules/catalog/catalog.contracts.js'
describe('contratos de biblioteca e disponibilidade editorial', () => {
  it('valida metodologia e versão sem aceitar proprietário fornecido pelo cliente', () => {
    expect(libraryParams.parse({ methodologyId: '10' })).toEqual({ methodologyId: '10' })
    expect(contentQuery.parse({ versionId: '20' })).toEqual({ versionId: '20' })
    expect(contentQuery.safeParse({ userId: '1' }).success).toBe(false)
    expect(contentQuery.safeParse({ versionId: ['1', '2'] }).success).toBe(false)
    expect(contentQuery.safeParse({ versionId: '18446744073709551616' }).success).toBe(false)
  })
  it('suspensão exige revisão, estado permitido e justificativa não vazia', () => {
    expect(versionAccessInput.parse({ expectedRevision: 2, accessState: 'SUSPENDED', reason: ' Verificação editorial ' }).reason).toBe('Verificação editorial')
    for (const body of [{ expectedRevision: 2, accessState: 'SUSPENDED', reason: '' }, { expectedRevision: 2, accessState: 'SUSPENDED', reason: 'Motivo', fullProcedure: 'alteração' }, { expectedRevision: 0, accessState: 'ALLOWED', reason: 'Motivo' }]) expect(versionAccessInput.safeParse(body).success).toBe(false)
  })
  it('listagem não admite conteúdo integral ou prova privada', () => {
    const entry = { methodologyId: '10', entitlementStatus: 'ACTIVE', grantedAt: '2026-10-30T00:00:00Z', orderId: '30', originalVersionId: '20', originalVersionLabel: 'v1', title: 'DEMO', originalAmountCentavos: '1000', currentVersionId: '20', currentVersionLabel: 'v1', accessState: 'AVAILABLE' }
    expect(libraryEntry.safeParse(entry).success).toBe(true)
    expect(libraryEntry.safeParse({ ...entry, fullProcedure: 'PRIVATE' }).success).toBe(false)
    expect(libraryEntry.safeParse({ ...entry, permissionEvidence: 'PRIVATE' }).success).toBe(false)
  })
})
