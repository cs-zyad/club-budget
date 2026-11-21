import type { Worksheet } from 'exceljs'
import type { Stats } from './stats'
import type { Tx } from '../types'
import { today } from './format'

const NAVY = 'FF232055'
const MONEY = '#,##0.00 "ر.س"'

function styleHeader(ws: Worksheet) {
  const row = ws.getRow(1)
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  row.alignment = { vertical: 'middle' }
  row.height = 22
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }]
}

/** يصدّر ملف Excel كامل: الملخص، المصروفات، الإيرادات، وورقة لكل بند. */
export async function exportWorkbook(stats: Stats, txs: Tx[]): Promise<void> {
  const mod = await import('exceljs')
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'نظام ميزانية نادي ريادة الأعمال'
  wb.created = new Date()
  const names = new Map(stats.rows.map((r) => [r.id, r.name]))
  const byDate = (a: Tx, b: Tx) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt

  // الملخص
  const s = wb.addWorksheet('الملخص')
  s.columns = [
    { header: 'البند', key: 'name', width: 32 },
    { header: 'المخصص', key: 'allocated', width: 18, style: { numFmt: MONEY } },
    { header: 'المصروف', key: 'spent', width: 18, style: { numFmt: MONEY } },
    { header: 'المتبقي', key: 'remaining', width: 18, style: { numFmt: MONEY } },
    { header: 'نسبة الصرف', key: 'ratio', width: 14, style: { numFmt: '0.0%' } },
  ]
  styleHeader(s)
  for (const r of stats.rows) {
    const row = s.addRow({ ...r, ratio: Number.isFinite(r.ratio) ? r.ratio : null })
    if (r.remaining < 0) row.getCell('remaining').font = { color: { argb: 'FFC91717' }, bold: true }
  }
  const total = s.addRow({
    name: 'الإجمالي',
    allocated: stats.totalBudget,
    spent: stats.totalSpent,
    remaining: stats.totalRemaining,
    ratio: stats.spentRatio,
  })
  total.font = { bold: true }
  s.addRow({})
  s.addRow({ name: 'إجمالي الإيرادات', allocated: stats.totalIncome }).font = { bold: true }

  // المصروفات والإيرادات
  const txSheet = (title: string, list: Tx[], withItem: boolean) => {
    const ws = wb.addWorksheet(title)
    ws.columns = [
      { header: 'التاريخ', key: 'date', width: 13 },
      ...(withItem ? [{ header: 'البند', key: 'item', width: 28 }] : []),
      { header: 'الوصف', key: 'description', width: 36 },
      { header: 'الجهة', key: 'party', width: 22 },
      { header: 'رقم الفاتورة', key: 'invoiceNo', width: 16 },
      { header: 'التصنيف', key: 'category', width: 18 },
      { header: 'المبلغ', key: 'amount', width: 16, style: { numFmt: MONEY } },
      { header: 'المسجِّل', key: 'recordedBy', width: 18 },
      { header: 'فاتورة مرفقة', key: 'receipt', width: 13 },
      { header: 'ملاحظات', key: 'notes', width: 30 },
    ]
    styleHeader(ws)
    for (const t of [...list].sort(byDate)) ws.addRow({ ...t, item: t.itemId ? (names.get(t.itemId) ?? '') : '', receipt: t.hasReceipt ? 'نعم' : '' })
    const sum = list.reduce((a, t) => a + t.amount, 0)
    const last = ws.addRow({ description: 'الإجمالي', amount: sum })
    last.font = { bold: true }
    return ws
  }
  txSheet(
    'المصروفات',
    txs.filter((t) => t.kind === 'expense'),
    true,
  )
  txSheet(
    'الإيرادات',
    txs.filter((t) => t.kind === 'income'),
    false,
  )

  // ورقة لكل بند
  const used = new Set(wb.worksheets.map((w) => w.name))
  for (const r of stats.rows) {
    let name = r.name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31).trim() || 'بند'
    while (used.has(name)) name = `${name.slice(0, 28)} ${used.size}`
    used.add(name)
    txSheet(
      name,
      txs.filter((t) => t.kind === 'expense' && t.itemId === r.id),
      false,
    )
  }

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `club-budget-${today()}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
