import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
test('bundle de produção e arquivos públicos não contêm conteúdo integral de fixtures ou provas privadas', async () => {
  let checked = 0
  async function scan(folder: string) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name)
      if (entry.isDirectory()) await scan(file)
      else if (/\.(js|ts|json|html|map|txt|md|css)$/.test(file)) {
        expect(await readFile(file, 'utf8'), file).not.toMatch(/FULL_DEMO_LIBRARY_|FULL_LIBRARY_|PRIVATE_PERMISSION_|DEMO_PROCEDURE_ONLY/)
        checked++
      }
    }
  }
  await scan('dist'); await scan('public')
  expect(checked).toBeGreaterThan(2)
})
