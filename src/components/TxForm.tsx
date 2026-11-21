import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { useBudget } from '../data/budget'
import { db } from '../data/db'
import { sar, today } from '../lib/format'
import type { Receipt, Tx, TxKind } from '../types'
import { useFeedback } from './feedback'
import { ReceiptField } from './Receipt'
import { ErrorNote, FormActions, Modal, Num } from './ui'

const RECORDER_KEY = 'club-budget-recorder'
const lastRecorder = () => {
  try {
    return localStorage.getItem(RECORDER_KEY) ?? ''
  } catch {
    return ''
  }
}

interface Props {
  kind: TxKind
  /** بند محدد مسبقاً (عند الإضافة من صفحة البند) */
  defaultItemId?: string
  editing?: Tx
  onClose(): void
}

export function TxForm({ kind, defaultItemId, editing, onClose }: Props) {
  const { user } = useAuth()
  const { stats, txs } = useBudget()
  const { toast } = useFeedback()
  const rows = stats.rows
  const isExpense = kind === 'expense'
  const [date, setDate] = useState(editing?.date ?? today())
  const [itemId, setItemId] = useState(editing?.itemId ?? defaultItemId ?? rows[0]?.id ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [party, setParty] = useState(editing?.party ?? '')
  const [invoiceNo, setInvoiceNo] = useState(editing?.invoiceNo ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [recordedBy, setRecordedBy] = useState(editing ? (editing.recordedBy ?? '') : lastRecorder())
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = [...new Set(txs.filter((t) => t.kind === kind && t.category).map((t) => t.category))]
  const value = Number(amount)
  const row = rows.find((r) => r.id === itemId)
  // عند تعديل مصروف على نفس البند نستثني مبلغه القديم
  const alreadySpent = row ? row.spent - (editing && editing.itemId === row.id ? editing.amount : 0) : 0
  const remaining = row ? row.allocated - alreadySpent : 0
  const overBy = isExpense && row && value > 0 ? value - remaining : 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!description.trim()) return setError('اكتب وصف العملية')
    if (!Number.isFinite(value) || value <= 0) return setError('أدخل مبلغاً أكبر من صفر')
    if (isExpense && !itemId) return setError('اختر البند')
    if (!recordedBy.trim()) return setError('اكتب اسم المسجِّل')
    setBusy(true)
    const data = {
      id: editing?.id,
      kind,
      itemId: isExpense ? itemId : null,
      date,
      description: description.trim(),
      party: party.trim(),
      invoiceNo: invoiceNo.trim(),
      category: category.trim(),
      notes: notes.trim(),
      recordedBy: recordedBy.trim(),
      amount: Math.round(value * 100) / 100,
    }
    const uid = user?.uid ?? ''
    const done = isExpense ? 'المصروف' : 'الإيراد'
    try {
      try {
        await db.saveTx(data, uid, receipt)
        toast(editing ? 'تم حفظ التعديل' : `تم تسجيل ${done}`)
      } catch (err) {
        // إن رُفضت الفاتورة (قواعد Firebase غير محدّثة) نحفظ العملية نفسها دونها بدل رفض الحفظ كاملاً
        if ((err as { code?: string })?.code !== 'permission-denied' || receipt === undefined) throw err
        await db.saveTx(data, uid)
        toast(`تم حفظ ${done} بدون الفاتورة — قواعد Firebase لا تسمح بالفواتير بعد`, 'bad')
      }
      try {
        localStorage.setItem(RECORDER_KEY, recordedBy.trim())
      } catch {
        /* التخزين غير متاح */
      }
      onClose()
    } catch {
      setError('تعذر الحفظ. تأكد من الاتصال ثم أعد المحاولة.')
      setBusy(false)
    }
  }

  const title = `${editing ? 'تعديل' : 'إضافة'} ${isExpense ? 'مصروف' : 'إيراد'}`
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="grid2">
          <label>
            <span className="lbl">
              المبلغ (ر.س) <span className="req">*</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              placeholder="0.00"
            />
          </label>
          <label>
            <span className="lbl">
              التاريخ <span className="req">*</span>
            </span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        {isExpense && (
          <label>
            <span className="lbl">
              البند <span className="req">*</span>
            </span>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — متبقي {sar(r.remaining)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="lbl">
            {isExpense ? 'الوصف' : 'مصدر الإيراد'} <span className="req">*</span>
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder={isExpense ? 'مثال: ضيافة اجتماع الأعضاء' : 'مثال: رعاية من شركة …'}
          />
        </label>
        <div className="grid2">
          <label>
            الجهة
            <input value={party} onChange={(e) => setParty(e.target.value)} placeholder={isExpense ? 'المورد أو المحل' : 'الجهة الداعمة'} />
          </label>
          <label>
            رقم الفاتورة
            <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} dir="ltr" />
          </label>
        </div>
        <label>
          التصنيف
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list={`cats-${kind}`}
            placeholder={isExpense ? 'مثال: ضيافة، مطبوعات، مواصلات' : 'مثال: رعاية، اشتراكات'}
          />
          <datalist id={`cats-${kind}`}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label>
          <span className="lbl">
            اسم المسجِّل <span className="req">*</span>
          </span>
          <input value={recordedBy} onChange={(e) => setRecordedBy(e.target.value)} required placeholder="اسمك" autoComplete="name" />
        </label>
        <ReceiptField
          txId={editing?.id}
          hasExisting={Boolean(editing?.hasReceipt)}
          value={receipt}
          onChange={setReceipt}
          by={recordedBy.trim() || user?.email || ''}
        />
        <label>
          ملاحظات
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {isExpense && row && (
          <p className={`note ${overBy > 0 ? 'bad' : ''}`}>
            المتبقي في «{row.name}»: <Num>{sar(remaining)}</Num>
            {value > 0 && overBy <= 0 && (
              <>
                {' '}
                · بعد هذا المصروف: <Num>{sar(remaining - value)}</Num>
              </>
            )}
            {overBy > 0 && (
              <>
                {' '}
                — يتجاوز المتبقي بمقدار <Num>{sar(overBy)}</Num>، وسيُسجَّل مع تنبيه أحمر.
              </>
            )}
          </p>
        )}
        <ErrorNote error={error} />
        <FormActions busy={busy} onCancel={onClose} />
      </form>
    </Modal>
  )
}
