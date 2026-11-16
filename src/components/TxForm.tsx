import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { db } from '../data/db'
import { sar, today } from '../lib/format'
import type { ItemRow } from '../lib/stats'
import type { Tx, TxKind } from '../types'
import { Modal, Num } from './ui'

interface Props {
  kind: TxKind
  rows: ItemRow[]
  /** بند محدد مسبقاً (عند الإضافة من صفحة البند) */
  defaultItemId?: string
  editing?: Tx
  onClose(): void
}

export function TxForm({ kind, rows, defaultItemId, editing, onClose }: Props) {
  const { user } = useAuth()
  const isExpense = kind === 'expense'
  const [date, setDate] = useState(editing?.date ?? today())
  const [itemId, setItemId] = useState(editing?.itemId ?? defaultItemId ?? rows[0]?.id ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [party, setParty] = useState(editing?.party ?? '')
  const [invoiceNo, setInvoiceNo] = useState(editing?.invoiceNo ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = Number(amount)
  const row = rows.find((r) => r.id === itemId)
  // عند تعديل مصروف نفس البند نستثني مبلغه القديم من المصروف الحالي
  const alreadySpent = row ? row.spent - (editing && editing.itemId === row.id ? editing.amount : 0) : 0
  const remaining = row ? row.allocated - alreadySpent : 0
  const overBy = isExpense && row && value > 0 ? value - remaining : 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!description.trim()) return setError('اكتب وصف العملية')
    if (!Number.isFinite(value) || value <= 0) return setError('أدخل مبلغاً أكبر من صفر')
    if (isExpense && !itemId) return setError('اختر البند')
    setBusy(true)
    try {
      await db.saveTx(
        {
          id: editing?.id,
          kind,
          itemId: isExpense ? itemId : null,
          date,
          description: description.trim(),
          party: party.trim(),
          invoiceNo: invoiceNo.trim(),
          category: category.trim(),
          notes: notes.trim(),
          amount: Math.round(value * 100) / 100,
        },
        user?.uid ?? '',
      )
      onClose()
    } catch {
      setError('تعذر الحفظ. تأكد من الاتصال وصلاحيات الحساب ثم أعد المحاولة.')
      setBusy(false)
    }
  }

  const title = `${editing ? 'تعديل' : 'إضافة'} ${isExpense ? 'مصروف' : 'إيراد'}`
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="grid2">
          <label>
            التاريخ
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            المبلغ (ر.س)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </label>
        </div>
        {isExpense && (
          <label>
            البند
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {isExpense ? 'الوصف' : 'مصدر الإيراد / الوصف'}
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <div className="grid2">
          <label>
            الجهة
            <input value={party} onChange={(e) => setParty(e.target.value)} />
          </label>
          <label>
            رقم الفاتورة
            <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} dir="ltr" />
          </label>
        </div>
        <label>
          التصنيف
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثال: ضيافة، مطبوعات" />
        </label>
        <label>
          ملاحظات
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {isExpense && row && (
          <p className={`note ${overBy > 0 ? 'bad' : ''}`}>
            المتبقي في «{row.name}»: <Num>{sar(remaining)}</Num>
            {overBy > 0 && (
              <>
                {' '}
                — هذا المصروف يتجاوز المتبقي بمقدار <Num>{sar(overBy)}</Num>، وسيُسجَّل مع تنبيه أحمر.
              </>
            )}
          </p>
        )}
        {error && (
          <p className="note bad" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
