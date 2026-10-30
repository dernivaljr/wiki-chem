import { AppError } from '../../shared/errors.js'

export function createHealthService(checkDatabase: () => Promise<void>) {
  return {
    async databaseStatus(): Promise<{ status: 'available' }> {
      try {
        await checkDatabase()
        return { status: 'available' }
      } catch {
        throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Banco de dados temporariamente indisponível.')
      }
    },
  }
}
