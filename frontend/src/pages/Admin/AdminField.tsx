import { cloneElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'

export default function AdminField({ label, children }: { label: ReactNode; children: ReactElement<{ id?: string }> }) {
  const id = useId()
  return <div className="admin-field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>
}
