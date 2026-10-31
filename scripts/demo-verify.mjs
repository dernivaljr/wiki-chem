import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
const exec = promisify(execFile), origin = 'http://127.0.0.1:4180'
const assert = (value, message) => { if (!value) throw new Error(message) }
async function command(action, ...args) { return exec(process.execPath, ['scripts/demo.mjs', action, ...args], { timeout: 120000, maxBuffer: 2000000 }) }
async function call(path, { method = 'GET', body, cookie, csrf, key } = {}) {
  const response = await fetch(origin + '/api/v1' + path, { method, headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { response, payload: await response.json() }
}
try {
  for (let n = 0; ; n++) {
    try { if ((await call('/health/database')).response.ok) break } catch { /* aguardar prontidão */ }
    if (n >= 30) throw new Error('DEMO_START_TIMEOUT')
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  const email = 'restore-' + randomUUID() + '@example.invalid', password = randomBytes(24).toString('base64url')
  assert((await call('/auth/register', { method: 'POST', body: { email, password, displayName: 'Conta sintética de restauração' } })).response.status === 201, 'REGISTER')
  const login = await call('/auth/login', { method: 'POST', body: { email, password } }), cookie = login.response.headers.getSetCookie()[0]?.split(';')[0], csrf = login.payload.data.csrfToken
  const auth = { cookie, csrf }, search = await call('/methodologies?pageSize=50', auth)
  assert(search.payload.total === 15, 'CATALOG_FIFTEEN_ACTIVE')
  assert(search.payload.data.every(item => !/^DEMO\b/i.test(item.title)), 'NO_LEGACY_DEMO_IN_SHOWCASE')
  const purchasableItems = search.payload.data.filter(item => item.purchasable && item.offer?.available && item.offer?.amountCentavos)
  assert(purchasableItems.length === 15, 'COMMERCIAL_ORIGINAL_PRODUCTS_FIFTEEN')
  const taxonomies = (await call('/taxonomies', auth)).payload.data
  const uvVis = taxonomies.technologies.find(term => term.code === 'uv-vis')
  const specTech = taxonomies.techniques.find(term => term.code === 'espectrofotometria-uv-vis')
  assert(uvVis && specTech, 'ANALYTICAL_TAXONOMIES_PRESENT')
  const ironSearch = await call(`/methodologies?q=ferro&techniqueIds=${specTech.id}&technologyIds=${uvVis.id}`, auth)
  assert(ironSearch.payload.total === 1 && ironSearch.payload.data[0].title.includes('1,10-fenantrolina') && ironSearch.payload.data[0].purchasable, 'IRON_UVVIS_PRODUCT_FOUND')

  // Valida três aquisições consecutivas com PIX, CREDIT_CARD e BOLETO na mesma sessão
  const targets = [
    ironSearch.payload.data[0],
    ...purchasableItems.filter(item => item.id !== ironSearch.payload.data[0].id).slice(0, 2),
  ]
  const methods = ['PIX', 'CREDIT_CARD', 'BOLETO']
  const orderIds = []
  for (let idx = 0; idx < 3; idx++) {
    const preview = targets[idx]
    const cart = (await call('/cart', auth)).payload.data
    assert((await call('/cart/items/' + preview.offer.productId, { ...auth, method: 'PUT', body: { expectedRevision: cart.revision, offerRevision: preview.offer.revision, priceId: preview.offer.priceId, versionId: preview.versionId } })).response.ok, 'CART_' + idx)
    const current = (await call('/cart', auth)).payload.data
    const order = await call('/checkout/simulations', { ...auth, method: 'POST', key: randomUUID(), body: { cartRevision: current.revision } })
    assert(order.response.status === 201, 'PENDING_ORDER_' + idx)
    assert(!orderIds.includes(order.payload.data.id), 'DISTINCT_ORDER_' + idx)
    orderIds.push(order.payload.data.id)
    assert((await call('/library/' + preview.id + '/content', auth)).response.status === 403, 'PENDING_DENIED_' + idx)
    const confirmed = await call('/orders/' + order.payload.data.id + '/confirm-simulation', { ...auth, method: 'POST', key: randomUUID(), body: { demoAcknowledged: true, paymentMethod: methods[idx] } })
    assert(confirmed.response.ok && confirmed.payload.data.paymentMethod === methods[idx], 'CONFIRM_' + idx)
    assert((await call('/cart', auth)).payload.data.items.length === 0, 'CART_CLEARED_' + idx)
  }

  const preview = targets[0]
  const original = (await call('/library/' + preview.id + '/content', auth)).payload.data
  assert(original.fullDescription.includes('1. Escopo analítico') && original.fullProcedure.includes('4. Estrutura operacional'), 'SUBSTANTIAL_ORIGINAL_CONTENT')
  const backup = await command('backup'), file = backup.stdout.trim().split('\n').at(-1).replace(/^.*: /, '').trim()
  const metadata = await readFile(file + '.json', 'utf8')
  await writeFile(file + '.json', metadata.replace('wikichem_test_demo', 'wikichem_production'))
  let refused = false
  try { await command('restore', file) } catch { refused = true }
  assert(refused, 'RESTORE_TAMPER_REFUSED'); await writeFile(file + '.json', metadata)
  const after = await call('/auth/register', { method: 'POST', body: { email: 'after-' + email, password, displayName: 'Conta sintética posterior ao backup' } })
  assert(after.response.status === 201, 'AFTER_BACKUP')
  await command('restore', file)
  assert((await call('/auth/login', { method: 'POST', body: { email: 'after-' + email, password } })).response.status === 401, 'RESTORE_REMOVED_LATER_DATA')
  const restored = (await call('/library/' + preview.id + '/content', auth)).payload.data
  assert(createHash('sha256').update(JSON.stringify(original)).digest('hex') === createHash('sha256').update(JSON.stringify(restored)).digest('hex'), 'RESTORED_CONTENT')
  assert((await call('/orders', auth)).payload.total === 3, 'RESTORED_ORDERS')
  assert((await call('/library', auth)).payload.total === 3, 'RESTORED_RIGHTS')
  const { stdout } = await exec('docker', ['ps', '--filter', 'label=com.docker.compose.project=wikichem-academic-demo', '--filter', 'label=com.docker.compose.service=api', '--format', '{{.ID}}'])
  const id = stdout.trim(); assert(/^[a-f0-9]+$/.test(id), 'API_CONTAINER')
  await exec('docker', ['exec', id, 'node', '--input-type=module', '-e', "import mysql from 'mysql2/promise';const p=mysql.createPool({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});try{await p.execute('CREATE TABLE demo_forbidden_ddl (id INT)');process.exitCode=1}catch(e){if(e.code!=='ER_TABLEACCESS_DENIED_ERROR'&&e.code!=='ER_DBACCESS_DENIED_ERROR')process.exitCode=1}finally{await p.end()}"])
  console.log('Demonstração Compose validada: prontidão, catálogo (15 produtos técnicos Wiki-Chem ativos), 3 compras consecutivas (PIX, Cartão e Boleto), desbloqueio de guias autorais, restauração, checksum e recusa de DDL da API.')
} catch (error) { console.error('Verificação demonstrativa falhou: ' + (error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'DEMO_VERIFICATION_FAILED')); process.exitCode = 1 }
