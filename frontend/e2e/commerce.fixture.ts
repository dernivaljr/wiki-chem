import { randomUUID } from 'node:crypto'
import { expect } from '@playwright/test'
import type { Browser, BrowserContext } from '@playwright/test'
import { demoEditor } from '../../backend/tests/catalog-fixtures'
import { demoPrices } from '../../backend/tests/commerce-fixtures'
import { facets } from '../src/catalog/types'
import type { Product } from '../src/commerce/types'
export const origin = 'http://127.0.0.1:4174'
export async function signed(context: BrowserContext) {
  const response = await context.request.get('/api/v1/auth/session')
  expect(response.status()).toBe(200)
  return { Origin: origin, 'X-CSRF-Token': (await response.json()).data.csrfToken as string }
}
export function fields(title: string, marker: string) {
  const value = demoEditor({ techniques: [], technologies: [], equipment: [], matrices: [], analytes: [], standards: [], segments: [] }, marker)
  value.title = title; value.sources[0]!.permissionEvidence = marker
  for (const facet of facets) value.notApplicable[facet] = 'Fixture original DEMO de software, sem classificação científica real.'
  return value
}
export async function publish(context: BrowserContext, version: { id: string; revision: number }, title: string, marker: string) {
  const headers = await signed(context)
  const saved = await context.request.patch('/api/v1/admin/versions/' + version.id, { headers, data: { ...fields(title, marker), expectedRevision: version.revision } })
  expect(saved.status()).toBe(200)
  const response = await context.request.post('/api/v1/admin/versions/' + version.id + '/publish', { headers, data: { expectedRevision: (await saved.json()).data.revision, reviewAcknowledged: true, reviewNote: 'Revisão explícita de conteúdo original DEMO da suíte; sem fonte técnica externa.' } })
  expect(response.status()).toBe(200)
}
export async function seed(context: BrowserContext, count = 1, products = true) {
  const token = 'demo-fx-' + randomUUID().slice(0, 12), headers = await signed(context)
  const items: { methodologyId: string; slug: string; title: string; marker: string; product: Product | null }[] = []
  for (const [index, amount] of demoPrices().slice(0, count).entries()) {
    const slug = token + '-' + index, title = 'DEMO FX0' + (index + 1) + ' original ' + token, marker = 'PRIVATE_FX_' + randomUUID()
    const created = await context.request.post('/api/v1/admin/methodologies', { headers, data: { slug } }); expect(created.status()).toBe(201)
    const method = (await created.json()).data
    const version = (await (await context.request.post('/api/v1/admin/methodologies/' + method.id + '/versions', { headers, data: { versionLabel: 'v1' } })).json()).data
    await publish(context, version, title, marker)
    let product: Product | null = null
    if (products) {
      product = (await (await context.request.post('/api/v1/admin/products', { headers, data: { methodologyId: method.id } })).json()).data
      const priced = await context.request.post('/api/v1/admin/products/' + product!.id + '/prices', { headers, data: { expectedRevision: product!.revision, amountCentavos: amount, currency: 'BRL' } }); expect(priced.status()).toBe(201)
      product = (await priced.json()).data
      const activated = await context.request.patch('/api/v1/admin/products/' + product!.id, { headers, data: { active: true, expectedRevision: product!.revision } }); expect(activated.status()).toBe(200)
      product = (await activated.json()).data
    }
    items.push({ methodologyId: method.id, slug, title, marker, product })
  }
  return { token, items }
}
export async function customer(browser: Browser) {
  const context = await browser.newContext({ baseURL: origin, storageState: { cookies: [], origins: [] } })
  const email = 'fx-' + randomUUID() + '@example.test', password = 'Senha sintética FX DEMO 123!'
  expect((await context.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { email, password, displayName: 'Cliente FX DEMO' } })).status()).toBe(201)
  expect((await context.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { email, password } })).status()).toBe(200)
  return { context, page: await context.newPage(), email, password }
}
export async function price(context: BrowserContext, productId: string, amountCentavos: string) {
  const headers = await signed(context), current = (await (await context.request.get('/api/v1/admin/products/' + productId)).json()).data
  const response = await context.request.post('/api/v1/admin/products/' + productId + '/prices', { headers, data: { expectedRevision: current.revision, amountCentavos, currency: 'BRL' } })
  expect(response.status()).toBe(201)
  return (await response.json()).data as Product
}
