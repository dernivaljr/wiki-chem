export function safeReturnTo(value: string | null) {
  if (!value || !/^\/(consultas|perfil)(\?[^#\\]*)?$/.test(value)) return '/consultas'
  try {
    const url = new URL(value, 'https://wikichem.invalid')
    if (url.origin !== 'https://wikichem.invalid' || !['/consultas', '/perfil'].includes(url.pathname)) return '/consultas'
    return url.pathname + url.search
  } catch { return '/consultas' }
}
