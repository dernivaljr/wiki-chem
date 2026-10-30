import { expect, test } from '@playwright/test'

// Respostas controladas somente para regressão visual; auth.spec.ts testa identidade real.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/session', route => {
    const ref = route.request().headers().referer ?? ''
    const protectedPage = new URL(ref || 'http://127.0.0.1').pathname === '/consultas'
    return route.fulfill({ status: protectedPage ? 200 : 401, contentType: 'application/json', body: JSON.stringify(protectedPage
      ? { data: { user: { id: '1', displayName: 'Fixture visual', email: 'visual@example.test', role: 'CUSTOMER', status: 'ACTIVE' }, csrfToken: 'a'.repeat(64), expiresAt: new Date(Date.now() + 600000).toISOString() } }
      : { error: { code: 'SESSION_REQUIRED', message: 'Entre novamente.' } }) })
  })
})

const routes = ['/', '/sobre', '/login', '/consultas']

for (const width of [320, 375, 480, 481, 600, 601, 700, 701, 768, 1280]) {
  test(`páginas e links do cabeçalho cabem em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })

    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)

      const layout = await page.evaluate(() => {
        const links = [...document.querySelectorAll('header a')].map(link => {
          const { left, right, top, bottom } = link.getBoundingClientRect()
          return { left, right, top, bottom }
        })
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          links,
        }
      })

      expect(layout.scrollWidth, `overflow em ${route}`).toBeLessThanOrEqual(layout.clientWidth)
      for (const [index, link] of layout.links.entries()) {
        expect(link.left).toBeGreaterThanOrEqual(0)
        expect(link.right).toBeLessThanOrEqual(layout.clientWidth)
        for (const other of layout.links.slice(index + 1)) {
          const overlap = link.left < other.right && link.right > other.left
            && link.top < other.bottom && link.bottom > other.top
          expect(overlap, `links sobrepostos em ${route}`).toBe(false)
        }
      }
    }
  })
}

test('links e CTA navegam entre as páginas existentes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sobre', exact: true }).click()
  await expect(page).toHaveURL(/\/sobre$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Sobre o Wiki-Chem' })).toBeVisible()

  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await page.getByRole('link', { name: 'Explorar conteúdos' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
  // Este caso cobre navegação; a autenticação real é exercitada na suíte integrada.
})

test('campo de consulta tem realce de foco ao navegar por teclado', async ({ page }) => {
  await page.goto('/consultas')
  const input = page.getByRole('searchbox', { name: 'Termo de consulta' })
  await input.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(input).toBeFocused()

  const focus = await input.evaluate(element => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) }
  })
  expect(focus.style).not.toBe('none')
  expect(focus.width).toBeGreaterThanOrEqual(2)
})

function luminance(color: string) {
  const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
  if (channels.length !== 3) throw new Error(`Cor RGB inesperada: ${color}`)
  const [r, g, b] = channels.map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

test('textos auxiliares e placeholders atingem contraste de 4,5:1', async ({ page }) => {
  const cases = [
    { route: '/consultas', selector: '.consultas__suggestions', panel: '.consultas__search-panel' },
    { route: '/consultas', selector: '.consultas__counter', panel: '.consultas__search-panel' },
    { route: '/login', selector: '.auth__step', panel: '.auth__panel' },
    { route: '/login', selector: 'input[name="email"]', panel: '.auth__panel', pseudo: '::placeholder' },
    { route: '/login', selector: 'input[name="password"]', panel: '.auth__panel', pseudo: '::placeholder' },
  ]

  for (const entry of cases) {
    await page.goto(entry.route)
    const colors = await page.locator(entry.selector).evaluate((element, { panel, pseudo }) => ({
      foreground: getComputedStyle(element, pseudo).color,
      background: getComputedStyle(element.closest(panel)!).backgroundColor,
    }), { panel: entry.panel, pseudo: entry.pseudo ?? null })
    const foreground = luminance(colors.foreground)
    const background = luminance(colors.background)
    const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
    expect(ratio, `${entry.route} ${entry.selector}`).toBeGreaterThanOrEqual(4.5)
  }
})
