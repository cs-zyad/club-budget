import { useEffect, useRef, useState } from 'react'
import { Camera, Download, ExternalLink, FileText, Paperclip, RefreshCw, Trash2 } from 'lucide-react'
import { db } from '../data/db'
import { openReceipt, prepareReceipt, ReceiptError } from '../lib/receipt'
import type { Receipt } from '../types'
import { Empty, Modal } from './ui'

/** عرض فاتورة محفوظة */
export function ReceiptViewer({ txId, title, onClose }: { txId: string; title: string; onClose(): void }) {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    db.getReceipt(txId).then(
      (r) => alive && setReceipt(r),
      () => alive && setError(true),
    )
    return () => {
      alive = false
    }
  }, [txId])

  return (
    <Modal title={`فاتورة: ${title}`} onClose={onClose} wide>
      {error ? (
        <p className="note bad">تعذر تحميل الفاتورة. تأكد من الاتصال ومن تحديث قواعد الأمان في Firebase.</p>
      ) : receipt === undefined ? (
        <p className="muted">جارٍ تحميل الفاتورة…</p>
      ) : receipt === null ? (
        <Empty title="لا توجد فاتورة محفوظة لهذه العملية" />
      ) : (
        <>
          {receipt.type.startsWith('image/') ? (
            <img className="receipt-full" src={receipt.data} alt={`فاتورة ${title}`} />
          ) : (
            <div className="receipt-pdf">
              <FileText size={40} aria-hidden />
              <span>{receipt.name}</span>
            </div>
          )}
          <div className="actions">
            <button className="btn ghost" onClick={() => openReceipt(receipt.data)}>
              <ExternalLink size={16} aria-hidden /> فتح في تبويب
            </button>
            <a className="btn" href={receipt.data} download={receipt.name || 'receipt'}>
              <Download size={16} aria-hidden /> تنزيل
            </a>
          </div>
        </>
      )}
    </Modal>
  )
}

/**
 * حقل الفاتورة في نموذج العملية.
 * value: undefined = بلا تغيير، null = إزالة، كائن = فاتورة جديدة
 */
export function ReceiptField({
  txId,
  hasExisting,
  value,
  onChange,
  by,
}: {
  txId?: string
  hasExisting: boolean
  value: Receipt | null | undefined
  onChange(v: Receipt | null | undefined): void
  by: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState(false)

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      const { data, type } = await prepareReceipt(file)
      const name = type === 'image/jpeg' ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name
      onChange({ data, type, name, uploadedAt: Date.now(), by })
    } catch (e) {
      setError(e instanceof ReceiptError ? e.message : 'تعذر تجهيز الملف')
    } finally {
      setProcessing(false)
      if (input.current) input.current.value = ''
    }
  }

  const choose = () => input.current?.click()
  const showExisting = hasExisting && value === undefined

  return (
    <div className="receipt-field">
      <span className="field-label">صورة الفاتورة</span>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
        aria-label="اختيار صورة الفاتورة"
      />
      {value ? (
        <div className="receipt-chip">
          {value.type.startsWith('image/') ? <img src={value.data} alt="معاينة الفاتورة" /> : <FileText size={28} aria-hidden />}
          <span className="receipt-name">
            {value.name}
            <span className="muted small">جاهزة للحفظ · {Math.round((value.data.length * 0.75) / 1024)} ك.ب</span>
          </span>
          <button type="button" className="icon-btn sm" onClick={choose} title="تغيير" aria-label="تغيير الفاتورة">
            <RefreshCw size={16} />
          </button>
          <button type="button" className="icon-btn sm danger" onClick={() => onChange(hasExisting ? null : undefined)} title="إزالة" aria-label="إزالة الفاتورة">
            <Trash2 size={16} />
          </button>
        </div>
      ) : showExisting ? (
        <div className="receipt-chip">
          <Paperclip size={22} aria-hidden />
          <span className="receipt-name">فاتورة مرفقة</span>
          <button type="button" className="btn ghost sm" onClick={() => setViewing(true)}>
            عرض
          </button>
          <button type="button" className="icon-btn sm" onClick={choose} title="استبدال" aria-label="استبدال الفاتورة">
            <RefreshCw size={16} />
          </button>
          <button type="button" className="icon-btn sm danger" onClick={() => onChange(null)} title="إزالة" aria-label="إزالة الفاتورة">
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <button type="button" className="dropzone" onClick={choose} disabled={processing}>
          <Camera size={22} aria-hidden />
          <span>
            {processing ? 'جارٍ تجهيز الصورة…' : value === null ? 'أُزيلت الفاتورة — اضغط لإرفاق أخرى' : 'صوّر الفاتورة أو اختر صورة / PDF'}
          </span>
        </button>
      )}
      {error && (
        <p className="note bad" role="alert">
          {error}
        </p>
      )}
      {viewing && txId && <ReceiptViewer txId={txId} title="الفاتورة الحالية" onClose={() => setViewing(false)} />}
    </div>
  )
}
