import { useEffect, type ReactNode } from 'react'
import { pct, sar } from '../lib/format'
import type { Level } from '../lib/stats'

export function Num({ children }: { children: ReactNode }) {
  return <bdi className="num">{children}</bdi>
}

export function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad' | 'gold'
  hint?: string
}) {
  return (
    <div className={`card stat ${tone ?? ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        <Num>{value}</Num>
      </div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function Progress({ ratio, level }: { ratio: number; level: Level }) {
  const width = Math.min(Number.isFinite(ratio) ? ratio : 1, 1) * 100
  return (
    <div className="progress" role="img" aria-label={`نسبة الصرف ${pct(ratio)}`}>
      <div className={`progress-bar ${level}`} style={{ width: `${width}%` }} />
    </div>
  )
}

export function LevelBadge({ level, ratio }: { level: Level; ratio: number }) {
  const text = level === 'over' ? 'تجاوز الميزانية' : level === 'warn' ? 'يقارب النفاد' : 'ضمن الميزانية'
  return (
    <span className={`badge ${level}`}>
      {text} · <Num>{pct(ratio)}</Num>
    </span>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Money({ value }: { value: number }) {
  return <Num>{sar(value)}</Num>
}
