import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Minus, Plus, Receipt, Search } from 'lucide-react'
import { useFeedback } from '../components/feedback'
import { TxForm } from '../components/TxForm'
import { TxTable } from '../components/TxTable'
import { Empty, PageHead, StatCard } from '../components/ui'
import { useBudget } from '../data/budget'
import { exportWorkbook } from '../lib/excel'
import { monthLabel, sar } from '../lib/format'
import type { Tx, TxKind } from '../types'

const KINDS = [
  { v: 'all', label: 'الكل' },
  { v: 'expense', label: 'المصروفات' },
  { v: 'income', label: 'الإيرادات' },
] as const

export function Transactions() {
  const { stats, txs, loading } = useBudget()
  const { toast } = useFeedback()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState<TxKind | null>(null)
  const [editing, setEditing] = useState<Tx | null>(null)
  const [exporting, setExporting] = useState(false)

  if (loading) return <p className="muted">جارٍ التحميل…</p>

  const kind = (params.get('kind') ?? 'all') as (typeof KINDS)[number]['v']
  const itemId = params.get('item') ?? ''
  const month = params.get('month') ?? ''
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v && v !== 'all') p.set(k, v)
    else p.delete(k)
    if (k === 'kind' && v === 'income') p.delete('item')
    setParams(p, { replace: true })
  }

  const names = new Map(stats.rows.map((r) => [r.id, r.name]))
  const months = [...new Set(txs.map((t) => t.date.slice(0, 7)))].sort().reverse()
  const term = q.trim()
  const filtered = txs.filter(
    (t) =>
      (kind === 'all' || t.kind === kind) &&
      (!itemId || t.itemId === itemId) &&
      (!month || t.date.startsWith(month)) &&
      (!term || [t.description, t.party, t.invoiceNo, t.category, t.notes, t.recordedBy ?? ''].some((f) => f.includes(term))),
  )
  const sumOf = (k: TxKind) => filtered.filter((t) => t.kind === k).reduce((s, t) => s + t.amount, 0)
  const isFiltered = kind !== 'all' || itemId || month || term

  async function doExport() {
    setExporting(true)
    try {
      await exportWorkbook(stats, txs)
      toast('تم تنزيل ملف Excel')
    } catch {
      toast('تعذر إنشاء ملف Excel', 'bad')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHead title="العمليات" sub="كل المصروفات والإيرادات في مكان واحد">
        <button className="btn ghost" onClick={doExport} disabled={exporting}>
          <Download size={18} aria-hidden /> {exporting ? 'جارٍ التصدير…' : 'Excel'}
        </button>
        <button className="btn ghost" onClick={() => setAdding('income')}>
          <Plus size={18} aria-hidden /> إيراد
        </button>
        <button className="btn" onClick={() => setAdding('expense')}>
          <Minus size={18} aria-hidden /> مصروف
        </button>
      </PageHead>

      <section className="card filters">
        <div className="segmented" role="tablist" aria-label="نوع العمليات">
          {KINDS.map((k) => (
            <button key={k.v} role="tab" aria-selected={kind === k.v} className={kind === k.v ? 'on' : ''} onClick={() => setParam('kind', k.v)}>
              {k.label}
            </button>
          ))}
        </div>
        <select value={itemId} onChange={(e) => setParam('item', e.target.value)} aria-label="البند" disabled={kind === 'income'}>
          <option value="">كل البنود</option>
          {stats.rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select value={month} onChange={(e) => setParam('month', e.target.value)} aria-label="الشهر">
          <option value="">كل الأشهر</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <label className="search grow">
          <Search size={16} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالوصف أو الجهة أو الفاتورة أو المسجِّل" aria-label="بحث" />
        </label>
        {isFiltered && (
          <button
            className="link"
            onClick={() => {
              setQ('')
              setParams({}, { replace: true })
            }}
          >
            مسح الفلاتر
          </button>
        )}
      </section>

      <section className="stats">
        <StatCard label="عدد العمليات" value={String(filtered.length)} />
        {kind !== 'income' && <StatCard label="المصروفات" value={sar(sumOf('expense'))} tone="gold" />}
        {kind !== 'expense' && <StatCard label="الإيرادات" value={sar(sumOf('income'))} tone="good" />}
      </section>

      <section className="card">
        {filtered.length === 0 ? (
          <Empty icon={<Receipt size={28} />} title={txs.length === 0 ? 'لا توجد عمليات بعد' : 'لا توجد نتائج مطابقة'}>
            {txs.length === 0 && (
              <button className="btn sm" onClick={() => setAdding('expense')}>
                تسجيل أول مصروف
              </button>
            )}
          </Empty>
        ) : (
          <TxTable txs={filtered} itemNames={kind === 'income' ? undefined : names} showKind={kind === 'all'} onEdit={setEditing} />
        )}
      </section>

      {adding && <TxForm kind={adding} defaultItemId={itemId || undefined} onClose={() => setAdding(null)} />}
      {editing && <TxForm kind={editing.kind} editing={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
