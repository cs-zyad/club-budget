import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Pencil, Plus, SlidersHorizontal } from 'lucide-react'
import { AddItemForm, BudgetForm, RenameForm, TransferForm } from '../components/ItemForms'
import { LevelBadge, Money, PageHead, Progress, StatCard } from '../components/ui'
import { useBudget } from '../data/budget'
import { pct, sar } from '../lib/format'
import type { ItemRow } from '../lib/stats'

type Dialog = { type: 'add' } | { type: 'transfer' } | { type: 'budget'; item: ItemRow } | { type: 'rename'; item: ItemRow } | null

export function Items() {
  const { stats, loading } = useBudget()
  const [dialog, setDialog] = useState<Dialog>(null)
  if (loading) return <p className="muted">جارٍ التحميل…</p>
  const close = () => setDialog(null)

  return (
    <>
      <PageHead title="البنود" sub="توزيع الميزانية على البنود، وتعديل الحصص ونقل المبالغ">
        <button className="btn ghost" onClick={() => setDialog({ type: 'transfer' })} disabled={stats.rows.length < 2}>
          <ArrowLeftRight size={18} aria-hidden /> نقل مبلغ
        </button>
        <button className="btn" onClick={() => setDialog({ type: 'add' })}>
          <Plus size={18} aria-hidden /> بند جديد
        </button>
      </PageHead>

      <section className="stats">
        <StatCard label="إجمالي الميزانية" value={sar(stats.totalBudget)} />
        <StatCard label="المصروف" value={sar(stats.totalSpent)} tone="gold" />
        <StatCard label="المتبقي" value={sar(stats.totalRemaining)} tone={stats.totalRemaining < 0 ? 'bad' : 'good'} />
      </section>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>البند</th>
                <th className="end">المخصص</th>
                <th className="end hide-sm">من الإجمالي</th>
                <th className="end">المصروف</th>
                <th className="end">المتبقي</th>
                <th className="progress-col hide-sm">نسبة الصرف</th>
                <th className="end" aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {stats.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/item/${r.id}`} className="strong">
                      {r.name}
                    </Link>
                    <div>
                      <LevelBadge level={r.level} />
                    </div>
                  </td>
                  <td className="end nowrap">
                    <Money value={r.allocated} />
                  </td>
                  <td className="end nowrap muted hide-sm">
                    <bdi className="num">{pct(stats.totalBudget ? r.allocated / stats.totalBudget : 0)}</bdi>
                  </td>
                  <td className="end nowrap">
                    <Money value={r.spent} />
                  </td>
                  <td className={`end nowrap strong ${r.remaining < 0 ? 'bad-text' : ''}`}>
                    <Money value={r.remaining} />
                  </td>
                  <td className="progress-col hide-sm">
                    <Progress ratio={r.ratio} level={r.level} />
                    <bdi className="num small muted">{pct(r.ratio)}</bdi>
                  </td>
                  <td className="end nowrap">
                    <button className="icon-btn sm" title="تعديل الميزانية" aria-label={`تعديل ميزانية ${r.name}`} onClick={() => setDialog({ type: 'budget', item: r })}>
                      <SlidersHorizontal size={16} />
                    </button>
                    <button className="icon-btn sm" title="تغيير الاسم" aria-label={`تغيير اسم ${r.name}`} onClick={() => setDialog({ type: 'rename', item: r })}>
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>الإجمالي</td>
                <td className="end nowrap">
                  <Money value={stats.totalBudget} />
                </td>
                <td className="end hide-sm">100%</td>
                <td className="end nowrap">
                  <Money value={stats.totalSpent} />
                </td>
                <td className="end nowrap">
                  <Money value={stats.totalRemaining} />
                </td>
                <td className="hide-sm" />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {dialog?.type === 'add' && <AddItemForm onClose={close} />}
      {dialog?.type === 'transfer' && <TransferForm onClose={close} />}
      {dialog?.type === 'budget' && <BudgetForm item={dialog.item} onClose={close} />}
      {dialog?.type === 'rename' && <RenameForm item={dialog.item} onClose={close} />}
    </>
  )
}
