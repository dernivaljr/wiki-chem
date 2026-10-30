import { describe, expect, it } from 'vitest'
import { ConfigurationError, loadConfig, loadMigrationConfig } from '../../src/config/env.js'
import { testConfig, testEnv } from '../helpers.js'

describe('configuração segura', () => {
  it('fornece padrões locais e números limitados', () => {
    expect(testConfig).toMatchObject({ HOST: '127.0.0.1', PORT: 3001, DB_PORT: 3306, DB_TLS: false })
    expect(loadConfig({ ...testEnv, PORT: '4321', DB_TLS: 'false' }).PORT).toBe(4321)
  })
  it.each([
    { DB_PASSWORD: '' }, { DB_NAME: 'db;DROP DATABASE other' }, { DB_POOL_SIZE: '0' },
    { DB_PORT: '65536' }, { DB_TIMEOUT_MS: '-1' }, { DB_TLS: 'yes' },
    { NODE_ENV: 'production', DB_TLS: 'false' }, { DB_TLS_CA_FILE: 'ca.pem', DB_TLS: 'false' },
  ])('rejeita configuração inválida %j', overrides => {
    expect(() => loadConfig({ ...testEnv, DB_TLS: 'false', ...overrides })).toThrow(ConfigurationError)
  })
  it('não retorna segredos nos erros', () => {
    try { loadConfig({ DB_PASSWORD: 'secret-not-to-print', PORT: 'invalid' }) } catch (error) {
      expect(String(error)).not.toContain('secret-not-to-print')
      expect(String(error)).toContain('PORT')
    }
  })
  it('exige credenciais operacionais explícitas e não usa a conta da API', () => {
    expect(() => loadMigrationConfig({ DB_USER: 'app', DB_PASSWORD: 'app-secret' })).toThrow()
    const config = loadMigrationConfig({
      DB_NAME: 'wikichem_test_migration', MIGRATION_DB_USER: 'migrator', MIGRATION_DB_PASSWORD: 'isolated-test',
    })
    expect(config.DB_USER).toBe('migrator')
  })
})
