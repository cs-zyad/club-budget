import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftRight, ChevronRight, History, Minus, Pencil, Receipt, Search, SlidersHorizontal } from 'lucide-react'
import { BudgetForm, RenameForm, TransferForm } from '../components/ItemForms'
import { TxForm } from '../components/TxForm'
import { TxTable } from '../components/TxTable'
import { Empty, LevelBadge, Money, PageHead, Progress, StatCard } from '../components/ui'
import { useBudget } from '../data/budget'
import { fmtDateTime, pct, sar } from '../lib/format'
import type { Tx } from '../types'

type Dialog = 'add' | 'budget' | 'rename' | 'transfer' | null

export function ItemPage() {
  const { id } = useParams()
  const { stats, txs, loading } = useBudget()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [editing, setEditing] = useState<Tx | null>(null)
  const [q, setQ] = useState('')

  if (loading) return <p className="muted">جارٍ التحميل…</p>
  const row = stats.rows.find((r) => r.id === id)
  if (!row) {
    return (
      <Empty title="البند غير موجود">
        <Link to="/items">العودة للبنود</Link>
      </Empty>
    )
  }

  const own = txs.filter((t) => t.kind === 'expense' && t.itemId === row.id)
  const term = q.trim()
  const shown = term
    ? own.filter((t) => [t.description, t.party, t.invoiceNo, t.category, t.notes, t.recordedBy ?? ''].some((f) => f.includes(term)))
    : own
  const history = [...(row.history ?? [])].sort((a, b) => b.at - a.at)
  const close = () => setDialog(null)

  return (
    <>
      <Link to="/items" className="back">
        <ChevronRight size={16} aria-hidden /> البنود
      </Link>
      <PageHead title={row.name} sub={<LevelBadge level={row.level} ratio={row.ratio} />}>
        <button className="btn ghost" onClick={() => setDialog('budget')}>
          <SlidersHorizontal size={18} aria-hidden /> تعديل الميزانية
        </button>
        <button className="btn ghost" onClick={() => setDialog('transfer')} disabled={stats.rows.length < 2}>
          <ArrowLeftRight size={18} aria-hidden /> نقل
        </button>
        <button className="icon-btn" onClick={() => setDialog('rename')} title="تغيير الاسم" aria-label="تغيير اسم البند">
          <Pencil size={18} />
        </button>
        <button className="btn" onClick={() => setDialog('add')}>
          <Minus size={18} aria-hidden /> مصروف
        </button>
      </PageHead>

      <section className="stats">
        <StatCard label="الميزانية المخصصة" value={sar(row.allocated)} />
        <StatCard label="المصروف" value={sar(row.spent)} tone="gold" hint={`${own.length} عملية`} />
        <StatCard label="المتبقي" value={sar(row.remaining)} tone={row.remaining < 0 ? 'bad' : 'good'} />
        <StatCard label="نسبة الصرف" value={pct(row.ratio)} hint={<Progress ratio={row.ratio} level={row.level} />} />
      </section>

      <section className="card">
        <div className="section-head">
          <h2>
            المصروفات <span className="count">{own.length}</span>
          </h2>
          {own.length > 0 && (
            <label className="search">
              <Search size={16} aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في المصروفات" aria-label="بحث في المصروفات" />
            </label>
          )}
        </div>
        {own.length === 0 ? (
          <Empty icon={<Receipt size={28} />} title="لا توجد مصروفات على هذا البند بعد">
            <button className="btn sm" onClick={() => setDialog('add')}>
              تسجيل أول مصروف
            </button>
          </Empty>
        ) : shown.length === 0 ? (
          <Empty title="لا توجد نتائج مطابقة" />
        ) : (
          <>
            <TxTable txs={shown} onEdit={setEditing} />
            <p className="total-line">
              الإجمالي{term && ' (نتائج البحث)'}: <Money value={shown.reduce((s, t) => s + t.amount, 0)} />
            </p>
          </>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>
            <History size={18} aria-hidden /> سجل تعديلات الميزانية
          </h2>
        </div>
        {history.length === 0 ? (
          <p className="muted">لا توجد تعديلات مسجلة.</p>
        ) : (
          <ol className="history">
            {history.map((h, i) => {
              const diff = h.to - h.from
              return (
                <li key={`${h.at}-${i}`}>
                  <div className="history-main">
                    <strong>{h.note}</strong>
                    <span className="muted small">
                      <bdi className="num">{fmtDateTime(h.at)}</bdi>
                    </span>
                  </div>
                  <div className="history-amounts">
                    <bdi className="num muted">{sar(h.from)}</bdi> ← <bdi className="num strong">{sar(h.to)}</bdi>
                    <span className={`chip ${diff >= 0 ? 'good' : 'bad'}`}>
                      <bdi className="num">{sar(diff, true)}</bdi>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {dialog === 'add' && <TxForm kind="expense" defaultItemId={row.id} onClose={close} />}
      {dialog === 'budget' && <BudgetForm item={row} onClose={close} />}
      {dialog === 'rename' && <RenameForm item={row} onClose={close} />}
      {dialog === 'transfer' && <TransferForm fromId={row.id} onClose={close} />}
      {editing && <TxForm kind="expense" editing={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
