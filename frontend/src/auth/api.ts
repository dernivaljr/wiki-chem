export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code }
}
export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; csrf?: string } = {}): Promise<T> {
  try {
    const response = await fetch('/api/v1' + path, {
      method: options.method ?? 'GET', credentials: 'same-origin', signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json', ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(options.csrf ? { 'X-CSRF-Token': options.csrf } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })
    if (response.status === 204) return undefined as T
    const payload = await response.json()
    if (!response.ok) throw new ApiError(response.status, payload.error?.code ?? 'API_ERROR', payload.error?.message ?? 'Não foi possível concluir a ação.')
    if (!payload || !('data' in payload)) throw new ApiError(502, 'INVALID_RESPONSE', 'Resposta inválida do serviço.')
    return payload.data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível acessar o serviço. Verifique a conexão e tente novamente.')
  }
}
