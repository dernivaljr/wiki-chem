import { loadConfig } from '../src/config/env.js'

export const testEnv = {
  NODE_ENV: 'test', LOG_LEVEL: 'silent',
  DB_NAME: 'wikichem_test_unit', DB_USER: 'unit_only', DB_PASSWORD: 'unit-test-only',
}
export const testConfig = loadConfig(testEnv)
