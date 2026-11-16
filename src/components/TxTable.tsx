import { Pencil, Trash2 } from 'lucide-react'
import { db } from '../data/db'
import { fmtDate, sar } from '../lib/format'
import type { Tx } from '../types'
import { useFeedback } from './feedback'
import { Money } from './ui'

interface Props {
  txs: Tx[]
  /** يعرض عمود البند (أسماء البنود حسب المعرّف) */
  itemNames?: Map<string, string>
  showKind?: boolean
  onEdit(tx: Tx): void
}

export function TxTable({ txs, itemNames, showKind, onEdit }: Props) {
  const { confirm, toast } = useFeedback()
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  async function remove(tx: Tx) {
    const ok = await confirm({
      title: 'حذف العملية',
      body: (
        <>
          سيتم حذف «{tx.description}» بمبلغ <bdi className="num">{sar(tx.amount)}</bdi> نهائياً، ولا يمكن التراجع.
        </>
      ),
      confirmText: 'حذف',
      danger: true,
    })
    if (!ok) return
    try {
      await db.removeTx(tx.id)
      toast('تم حذف العملية')
    } catch {
      toast('تعذر الحذف، تأكد من الاتصال', 'bad')
    }
  }

  return (
    <div className="table-wrap">
      <table className="tx-table">
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>الوصف</th>
            {itemNames && <th>البند</th>}
            <th className="hide-sm">الجهة</th>
            <th className="hide-sm">الفاتورة</th>
            <th className="hide-sm">التصنيف</th>
            <th className="hide-sm">المسجِّل</th>
            <th className="end">المبلغ</th>
            <th className="end" aria-label="إجراءات" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const income = t.kind === 'income'
            return (
              <tr key={t.id}>
                <td className="nowrap muted">
                  <bdi className="num">{fmtDate(t.date)}</bdi>
                </td>
                <td>
                  <div className="cell-title">
                    {showKind && <span className={`kind ${t.kind}`}>{income ? 'إيراد' : 'مصروف'}</span>}
                    {t.description}
                  </div>
                  {t.notes && <div className="muted small">{t.notes}</div>}
                </td>
                {itemNames && <td>{t.itemId ? (itemNames.get(t.itemId) ?? '—') : <span className="muted">—</span>}</td>}
                <td className="hide-sm">{t.party || <span className="muted">—</span>}</td>
                <td className="hide-sm">{t.invoiceNo ? <bdi className="num">{t.invoiceNo}</bdi> : <span className="muted">—</span>}</td>
                <td className="hide-sm">{t.category ? <span className="chip">{t.category}</span> : <span className="muted">—</span>}</td>
                <td className="hide-sm">{t.recordedBy || <span className="muted">—</span>}</td>
                <td className={`end nowrap strong ${income ? 'good-text' : ''}`}>
                  <Money value={t.amount} signed={income} />
                </td>
                <td className="end nowrap">
                  <button className="icon-btn sm" onClick={() => onEdit(t)} aria-label={`تعديل ${t.description}`} title="تعديل">
                    <Pencil size={16} />
                  </button>
                  <button className="icon-btn sm danger" onClick={() => remove(t)} aria-label={`حذف ${t.description}`} title="حذف">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
