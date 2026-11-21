import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { pct, sar } from '../lib/format'
import type { Level } from '../lib/stats'

export function Num({ children }: { children: ReactNode }) {
  return <bdi className="num">{children}</bdi>
}

export function Money({ value, signed }: { value: number; signed?: boolean }) {
  return <Num>{sar(value, signed)}</Num>
}

export function StatCard({
  label,
  value,
  tone,
  hint,
  icon,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad' | 'gold'
  hint?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className={`card stat ${tone ?? ''}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value">
        <Num>{value}</Num>
      </div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function Progress({ ratio, level, big }: { ratio: number; level: Level; big?: boolean }) {
  const width = Math.min(Number.isFinite(ratio) ? ratio : 1, 1) * 100
  return (
    <div className={`progress ${big ? 'big' : ''}`} role="img" aria-label={`نسبة الصرف ${pct(ratio)}`}>
      <div className={`progress-bar ${level}`} style={{ width: `${width}%` }} />
    </div>
  )
}

export function LevelBadge({ level, ratio }: { level: Level; ratio?: number }) {
  const text = level === 'over' ? 'تجاوز الميزانية' : level === 'warn' ? 'يقارب النفاد' : 'ضمن الميزانية'
  return (
    <span className={`badge ${level}`}>
      {text}
      {ratio !== undefined && (
        <>
          {' · '}
          <Num>{pct(ratio)}</Num>
        </>
      )}
    </span>
  )
}

export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </header>
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <strong>{title}</strong>
      {children}
    </div>
  )
}

const modalStack: number[] = []
let modalSeq = 0

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose(): void
  children: ReactNode
  wide?: boolean
}) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    const id = ++modalSeq
    modalStack.push(id)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && modalStack[modalStack.length - 1] === id && closeRef.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      modalStack.splice(modalStack.indexOf(id), 1)
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FormActions({ busy, onCancel, submitText = 'حفظ' }: { busy: boolean; onCancel(): void; submitText?: string }) {
  return (
    <div className="actions">
      <button type="button" className="btn ghost" onClick={onCancel}>
        إلغاء
      </button>
      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'جارٍ الحفظ…' : submitText}
      </button>
    </div>
  )
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p className="note bad" role="alert">
      {error}
    </p>
  )
}
