import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { useBudget } from '../data/budget'
import { db } from '../data/db'
import { sar } from '../lib/format'
import type { ItemRow } from '../lib/stats'
import { useFeedback } from './feedback'
import { ErrorNote, FormActions, Modal, Num } from './ui'

const FAIL = 'تعذر الحفظ. تأكد من الاتصال ثم أعد المحاولة.'

export function BudgetForm({ item, onClose }: { item: ItemRow; onClose(): void }) {
  const { user } = useAuth()
  const { toast } = useFeedback()
  const [value, setValue] = useState(String(item.allocated))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const n = Number(value)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!Number.isFinite(n) || n < 0) return setError('أدخل مبلغاً صحيحاً')
    if (n === item.allocated) return onClose()
    setBusy(true)
    try {
      await db.setAllocation(item, n, note.trim(), user?.uid ?? '')
      toast('تم تحديث ميزانية البند')
      onClose()
    } catch {
      setError(FAIL)
      setBusy(false)
    }
  }

  const diff = Number.isFinite(n) ? n - item.allocated : 0
  return (
    <Modal title={`تعديل ميزانية «${item.name}»`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          الميزانية الجديدة (ر.س)
          <input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} autoFocus required />
        </label>
        <label>
          سبب التعديل
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="يظهر في سجل التعديلات" />
        </label>
        <p className={`note ${n < item.spent ? 'bad' : ''}`}>
          الحالية <Num>{sar(item.allocated)}</Num>
          {diff !== 0 && (
            <>
              {' '}
              ← الفرق <Num>{sar(diff, true)}</Num>
            </>
          )}
          {' · '}المصروف حتى الآن <Num>{sar(item.spent)}</Num>
          {n < item.spent && ' — الميزانية الجديدة أقل من المصروف وسيظهر البند متجاوزاً.'}
        </p>
        <ErrorNote error={error} />
        <FormActions busy={busy} onCancel={onClose} />
      </form>
    </Modal>
  )
}

export function RenameForm({ item, onClose }: { item: ItemRow; onClose(): void }) {
  const { stats } = useBudget()
  const { toast } = useFeedback()
  const [name, setName] = useState(item.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const v = name.trim()
    if (!v) return setError('اكتب اسم البند')
    if (v === item.name) return onClose()
    if (stats.rows.some((r) => r.id !== item.id && r.name === v)) return setError('يوجد بند بنفس الاسم')
    setBusy(true)
    try {
      await db.renameItem(item.id, v)
      toast('تم تغيير اسم البند')
      onClose()
    } catch {
      setError(FAIL)
      setBusy(false)
    }
  }

  return (
    <Modal title="تغيير اسم البند" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          اسم البند
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>
        <p className="note">المصروفات المسجلة تبقى مرتبطة بالبند بعد تغيير الاسم.</p>
        <ErrorNote error={error} />
        <FormActions busy={busy} onCancel={onClose} />
      </form>
    </Modal>
  )
}

export function TransferForm({ fromId, onClose }: { fromId?: string; onClose(): void }) {
  const { user } = useAuth()
  const { stats } = useBudget()
  const { toast } = useFeedback()
  const rows = stats.rows
  const [from, setFrom] = useState(fromId ?? rows[0]?.id ?? '')
  const [to, setTo] = useState(rows.find((r) => r.id !== (fromId ?? rows[0]?.id))?.id ?? '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const src = rows.find((r) => r.id === from)
  const dst = rows.find((r) => r.id === to)
  const n = Number(amount)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!src || !dst) return setError('اختر البندين')
    if (src.id === dst.id) return setError('اختر بندين مختلفين')
    if (!Number.isFinite(n) || n <= 0) return setError('أدخل مبلغاً أكبر من صفر')
    if (n > src.allocated) return setError(`المبلغ أكبر من ميزانية «${src.name}» (${sar(src.allocated)})`)
    setBusy(true)
    try {
      await db.transfer(src, dst, Math.round(n * 100) / 100, note.trim(), user?.uid ?? '')
      toast(`تم نقل ${sar(n)} إلى «${dst.name}»`)
      onClose()
    } catch {
      setError(FAIL)
      setBusy(false)
    }
  }

  return (
    <Modal title="نقل مبلغ بين البنود" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="grid2">
          <label>
            من بند
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            إلى بند
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {rows.map((r) => (
                <option key={r.id} value={r.id} disabled={r.id === from}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          المبلغ (ر.س)
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required placeholder="0.00" />
        </label>
        <label>
          السبب
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="يظهر في سجل البندين" />
        </label>
        {src && dst && src.id !== dst.id && (
          <div className="transfer-preview">
            <div>
              <span className="muted small">{src.name}</span>
              <Num>{sar(src.allocated)}</Num> ← <Num>{sar(src.allocated - (n > 0 ? n : 0))}</Num>
            </div>
            <div>
              <span className="muted small">{dst.name}</span>
              <Num>{sar(dst.allocated)}</Num> ← <Num>{sar(dst.allocated + (n > 0 ? n : 0))}</Num>
            </div>
          </div>
        )}
        {src && n > 0 && src.allocated - n < src.spent && (
          <p className="note bad">بعد النقل تصبح ميزانية «{src.name}» أقل من المصروف عليه وسيظهر متجاوزاً.</p>
        )}
        <ErrorNote error={error} />
        <FormActions busy={busy} onCancel={onClose} submitText="نقل المبلغ" />
      </form>
    </Modal>
  )
}

export function AddItemForm({ onClose }: { onClose(): void }) {
  const { user } = useAuth()
  const { stats } = useBudget()
  const { toast } = useFeedback()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const v = name.trim()
    const n = Number(amount || 0)
    if (!v) return setError('اكتب اسم البند')
    if (stats.rows.some((r) => r.name === v)) return setError('يوجد بند بنفس الاسم')
    if (!Number.isFinite(n) || n < 0) return setError('أدخل مبلغاً صحيحاً')
    setBusy(true)
    try {
      const order = stats.rows.reduce((m, r) => Math.max(m, r.order), -1) + 1
      await db.addItem(v, n, order, user?.uid ?? '')
      toast(`تمت إضافة بند «${v}»`)
      onClose()
    } catch {
      setError(FAIL)
      setBusy(false)
    }
  }

  return (
    <Modal title="إضافة بند جديد" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          اسم البند
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required placeholder="مثال: الرحلات" />
        </label>
        <label>
          الميزانية المخصصة (ر.س)
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        <p className="note">
          إجمالي الميزانية الحالي <Num>{sar(stats.totalBudget)}</Num>، ويزيد بمقدار ميزانية البند الجديد.
        </p>
        <ErrorNote error={error} />
        <FormActions busy={busy} onCancel={onClose} submitText="إضافة البند" />
      </form>
    </Modal>
  )
}
