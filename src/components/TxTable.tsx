import { db } from '../data/db'
import type { Tx } from '../types'
import { Money } from './ui'

interface Props {
  txs: Tx[]
  itemName?: (id: string | null) => string | null
  onEdit(tx: Tx): void
  empty: string
}

export function TxTable({ txs, itemName, onEdit, empty }: Props) {
  if (txs.length === 0) return <p className="empty">{empty}</p>
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  async function remove(tx: Tx) {
    if (!window.confirm(`حذف «${tx.description}»؟ لا يمكن التراجع عن الحذف.`)) return
    try {
      await db.removeTx(tx.id)
    } catch {
      window.alert('تعذر الحذف. تأكد من الاتصال وصلاحيات الحساب.')
    }
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>الوصف</th>
            {itemName && <th>البند</th>}
            <th>الجهة</th>
            <th>الفاتورة</th>
            <th>التصنيف</th>
            <th className="end">المبلغ</th>
            <th aria-label="إجراءات" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id}>
              <td className="nowrap">
                <bdi className="num">{t.date}</bdi>
              </td>
              <td>
                {t.description}
                {t.notes && <div className="muted small">{t.notes}</div>}
              </td>
              {itemName && <td>{itemName(t.itemId) ?? '—'}</td>}
              <td>{t.party || '—'}</td>
              <td>{t.invoiceNo ? <bdi className="num">{t.invoiceNo}</bdi> : '—'}</td>
              <td>{t.category || '—'}</td>
              <td className="end nowrap strong">
                <Money value={t.amount} />
              </td>
              <td className="nowrap">
                <button className="link" onClick={() => onEdit(t)}>
                  تعديل
                </button>
                <button className="link danger" onClick={() => remove(t)}>
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
