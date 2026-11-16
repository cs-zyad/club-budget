export interface BudgetItem {
  id: string
  name: string
  allocated: number
  order: number
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
  createdAt: number
  createdBy: string
}

export type TxInput = Omit<Tx, 'id' | 'createdAt' | 'createdBy'> & { id?: string }
export type ItemInput = Omit<BudgetItem, 'id'> & { id?: string }
