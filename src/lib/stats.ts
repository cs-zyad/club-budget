import type { BudgetItem, Tx } from '../types'

export type Level = 'ok' | 'warn' | 'over'

export interface ItemRow extends BudgetItem {
  spent: number
  remaining: number
  ratio: number
  level: Level
}

export interface Stats {
  rows: ItemRow[]
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  spentRatio: number
  totalIncome: number
}

export const WARN_AT = 0.8

export function levelOf(ratio: number): Level {
  if (ratio > 1) return 'over'
  if (ratio >= WARN_AT) return 'warn'
  return 'ok'
}

export function computeStats(items: BudgetItem[], txs: Tx[]): Stats {
  const spentBy = new Map<string, number>()
  let totalIncome = 0
  let totalSpent = 0
  for (const t of txs) {
    if (t.kind === 'income') {
      totalIncome += t.amount
    } else {
      totalSpent += t.amount
      if (t.itemId) spentBy.set(t.itemId, (spentBy.get(t.itemId) ?? 0) + t.amount)
    }
  }
  const rows = [...items]
    .sort((a, b) => a.order - b.order)
    .map((i): ItemRow => {
      const spent = spentBy.get(i.id) ?? 0
      const ratio = i.allocated > 0 ? spent / i.allocated : spent > 0 ? Infinity : 0
      return { ...i, spent, remaining: i.allocated - spent, ratio, level: levelOf(ratio) }
    })
  const totalBudget = items.reduce((s, i) => s + i.allocated, 0)
  return {
    rows,
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    spentRatio: totalBudget > 0 ? totalSpent / totalBudget : 0,
    totalIncome,
  }
}

/** البنود الافتراضية من ملف ميزانية نادي ريادة الأعمال 2026/2027 */
export const DEFAULT_ITEMS: { name: string; allocated: number }[] = [
  { name: 'الفعاليات', allocated: 57500 },
  { name: 'المعسكرات', allocated: 40000 },
  { name: 'التكريم والضيافة والهوية', allocated: 16200 },
  { name: 'احتياطي الطوارئ', allocated: 15000 },
  { name: 'الإدارة والأنظمة الرقمية', allocated: 4850 },
  { name: 'تطوير الأعضاء', allocated: 1050 },
  { name: 'التسويق', allocated: 600 },
]
