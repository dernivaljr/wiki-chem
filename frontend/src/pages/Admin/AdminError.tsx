import { ApiError } from '../../auth/api'
export default function AdminError({ error }: { error: unknown }) {
  if (!error) return null
  return <div className="admin-error" role="alert">
    <p>{error instanceof Error ? error.message : 'Não foi possível concluir esta ação.'}</p>
    {error instanceof ApiError && error.details.length > 0 && <ul>{error.details.map((detail, index) => <li key={index}>{detail.field}: {detail.reason}</li>)}</ul>}
  </div>
}
