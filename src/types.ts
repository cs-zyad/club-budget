export interface AllocationChange {
  at: number
  by: string
  from: number
  to: number
  note: string
}

export interface BudgetItem {
  id: string
  name: string
  allocated: number
  order: number
  /** سجل تعديلات الحصة (إنشاء، تعديل، نقل) */
  history?: AllocationChange[]
}

export type TxKind = 'expense' | 'income'

export interface Tx {
  id: string
  kind: TxKind
  /** البند الذي يُخصم منه المصروف. يكون null للإيرادات. */
  itemId: string | null
  date: string // YYYY-MM-DD
  description: string
  party: string
  invoiceNo: string
  amount: number
  category: string
  notes: string
  /** اسم الشخص الذي سجّل العملية (يُكتب يدوياً) */
  recordedBy?: string
  /** توجد صورة فاتورة في مجموعة receipts بنفس المعرّف */
  hasReceipt?: boolean
  createdAt: number
  createdBy: string
}

/** صورة الفاتورة (مضغوطة) — تُحفظ منفصلة عن العملية حتى لا تُثقل تحميل الجداول */
export interface Receipt {
  data: string // data URL
  type: string
  name: string
  uploadedAt: number
  by: string
}

export type TxInput = Omit<Tx, 'id' | 'createdAt' | 'createdBy'> & { id?: string }
