import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFeedback } from '../components/feedback'
import { Empty, Money, PageHead, Progress, StatCard } from '../components/ui'
import { useBudget } from '../data/budget'
import { exportWorkbook } from '../lib/excel'
import { monthLabel, num, pct, sar } from '../lib/format'

export function Reports() {
  const { stats, txs, loading } = useBudget()
  const { toast } = useFeedback()
  const [exporting, setExporting] = useState(false)
  if (loading) return <p className="muted">جارٍ التحميل…</p>

  const byMonth = new Map<string, { expense: number; income: number }>()
  const byCat = new Map<string, { sum: number; count: number }>()
  for (const t of txs) {
    const m = t.date.slice(0, 7)
    const e = byMonth.get(m) ?? { expense: 0, income: 0 }
    e[t.kind] += t.amount
    byMonth.set(m, e)
    if (t.kind === 'expense') {
      const c = t.category || 'غير مصنف'
      const v = byCat.get(c) ?? { sum: 0, count: 0 }
      v.sum += t.amount
      v.count += 1
      byCat.set(c, v)
    }
  }
  const monthly = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({ month: monthLabel(m), ...v }))
  const cats = [...byCat.entries()].sort((a, b) => b[1].sum - a[1].sum)
  const expenses = txs.filter((t) => t.kind === 'expense')
  const avg = expenses.length ? stats.totalSpent / expenses.length : 0

  async function doExport() {
    setExporting(true)
    try {
      await exportWorkbook(stats, txs)
      toast('تم تنزيل ملف Excel')
    } catch {
      toast('تعذر إنشاء ملف Excel', 'bad')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHead title="التقارير" sub="تحليل الصرف والإيرادات، وتصدير الميزانية كاملة">
        <button className="btn" onClick={doExport} disabled={exporting}>
          <Download size={18} aria-hidden /> {exporting ? 'جارٍ التصدير…' : 'تصدير Excel'}
        </button>
      </PageHead>

      <section className="stats">
        <StatCard label="نسبة الصرف الكلية" value={pct(stats.spentRatio)} hint={<Progress ratio={stats.spentRatio} level={stats.spentRatio > 1 ? 'over' : stats.spentRatio >= 0.8 ? 'warn' : 'ok'} />} />
        <StatCard label="عدد المصروفات" value={String(expenses.length)} hint={`متوسط المصروف ${sar(avg)}`} />
        <StatCard label="صافي الإيرادات − المصروفات" value={sar(stats.totalIncome - stats.totalSpent)} tone={stats.totalIncome - stats.totalSpent < 0 ? 'bad' : 'good'} />
      </section>

      <section className="card">
        <h2>الصرف والإيرادات حسب الشهر</h2>
        {monthly.length === 0 ? (
          <Empty title="لا توجد عمليات لعرضها بعد" />
        ) : (
          <div className="chart" dir="ltr">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(v: number) => num(v)} fontSize={12} width={70} />
                <Tooltip formatter={(v, n) => [sar(Number(v)), n === 'expense' ? 'المصروفات' : 'الإيرادات']} />
                <Legend formatter={(v) => (v === 'expense' ? 'المصروفات' : 'الإيرادات')} />
                <Bar dataKey="expense" fill="#ecb02e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="income" fill="#4f7a2b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>المصروفات حسب التصنيف</h2>
          {cats.length === 0 ? (
            <p className="muted">لا توجد مصروفات بعد.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>التصنيف</th>
                    <th className="end">العدد</th>
                    <th className="end">المبلغ</th>
                    <th className="end">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map(([c, v]) => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td className="end">
                        <bdi className="num">{v.count}</bdi>
                      </td>
                      <td className="end nowrap strong">
                        <Money value={v.sum} />
                      </td>
                      <td className="end muted">
                        <bdi className="num">{pct(stats.totalSpent ? v.sum / stats.totalSpent : 0)}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>ملخص البنود</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>البند</th>
                  <th className="end">المخصص</th>
                  <th className="end">المصروف</th>
                  <th className="end">الصرف</th>
                </tr>
              </thead>
              <tbody>
                {stats.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="end nowrap">
                      <Money value={r.allocated} />
                    </td>
                    <td className="end nowrap">
                      <Money value={r.spent} />
                    </td>
                    <td className={`end nowrap strong ${r.level === 'over' ? 'bad-text' : ''}`}>
                      <bdi className="num">{pct(r.ratio)}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card export-card">
        <FileSpreadsheet size={32} aria-hidden />
        <div>
          <h2>ملف Excel كامل</h2>
          <p className="muted">ورقة للملخص، وورقة لكل المصروفات، وورقة للإيرادات، وورقة لكل بند بمصروفاته. مناسب للأرشفة ورفعه للجهات المعنية.</p>
        </div>
        <button className="btn" onClick={doExport} disabled={exporting}>
          <Download size={18} aria-hidden /> تنزيل
        </button>
      </section>
    </>
  )
}
