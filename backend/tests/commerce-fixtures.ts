// Exclusivo de testes/dev. Não é seed e nunca é importado por src/.
export function demoPrices() {
  if (!['test', 'development'].includes(process.env.NODE_ENV ?? '')) throw new Error('Fixtures FX bloqueadas fora de teste/desenvolvimento.')
  return ['1000', '1750', '2250', '3000', '4000'] as const
}
