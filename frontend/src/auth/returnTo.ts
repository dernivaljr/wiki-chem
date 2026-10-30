export function safeReturnTo(value: string | null) {
  if (!value || !/^\/(consultas|perfil|admin|carrinho|pedidos(?:\/[1-9][0-9]{0,19})?|checkout\/[1-9][0-9]{0,19}|metodologias\/[1-9][0-9]{0,19})(\?[^#\\]*)?$/.test(value)) return '/consultas'
  try {
    const url = new URL(value, 'https://wikichem.invalid')
    if (url.origin !== 'https://wikichem.invalid' || !/^\/(consultas|perfil|admin|carrinho|pedidos(?:\/[1-9][0-9]{0,19})?|checkout\/[1-9][0-9]{0,19}|metodologias\/[1-9][0-9]{0,19})$/.test(url.pathname)) return '/consultas'
    return url.pathname + url.search
  } catch { return '/consultas' }
}
