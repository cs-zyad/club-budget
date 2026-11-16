import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LevelBadge, Money, Progress, StatCard } from '../components/ui'
import { TxForm } from '../components/TxForm'
import { TxTable } from '../components/TxTable'
import { useBudget } from '../data/budget'
import { db } from '../data/db'
import { pct, sar } from '../lib/format'
import { DEFAULT_ITEMS } from '../lib/stats'
import type { Tx } from '../types'

const COLORS = { ok: '#4f7a2b', warn: '#ecb02e', over: '#c91717' }

export function Dashboard() {
  const { stats, txs, loading } = useBudget()
  const [editing, setEditing] = useState<Tx | null>(null)
  const [adding, setAdding] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)

  if (loading) return <p className="muted">جارٍ التحميل…</p>

  async function seed() {
    setSeeding(true)
    setSeedError(null)
    try {
      await db.seedItems(DEFAULT_ITEMS.map((x, i) => ({ ...x, order: i })))
    } catch {
      setSeedError('تعذر إضافة البنود. تأكد من الاتصال وصلاحيات الحساب.')
      setSeeding(false)
    }
  }

  if (stats.rows.length === 0) {
    return (
      <section className="card empty-state">
        <h1>لوحة التحكم</h1>
        <p>لا توجد بنود ميزانية بعد. أضف بنود ميزانية 2026/2027 من ملف الميزانية بضغطة واحدة:</p>
        <ul className="plain">
          {DEFAULT_ITEMS.map((i) => (
            <li key={i.name}>
              {i.name}: <bdi className="num">{sar(i.allocated)}</bdi>
            </li>
          ))}
        </ul>
        {seedError && (
          <p className="note bad" role="alert">
            {seedError}
          </p>
        )}
        <button className="btn" onClick={seed} disabled={seeding}>
          {seeding ? 'جارٍ الإضافة…' : 'إضافة البنود السبعة'}
        </button>
      </section>
    )
  }

  const names = new Map(stats.rows.map((r) => [r.id, r.name]))
  const chart = stats.rows.map((r) => ({
    name: r.name,
    percent: Number.isFinite(r.ratio) ? Math.round(r.ratio * 1000) / 10 : 100,
    allocated: r.allocated,
    spent: r.spent,
    level: r.level,
  }))
  const maxPercent = Math.max(100, ...chart.map((c) => c.percent))
  const alerts = stats.rows.filter((r) => r.level !== 'ok')
  const recent = txs.filter((t) => t.kind === 'expense')
  const latest = [...recent].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8)

  return (
    <>
      <header className="page-head">
        <h1>لوحة التحكم</h1>
        <button className="btn" onClick={() => setAdding(true)}>
          + إضافة مصروف
        </button>
      </header>

      <section className="stats">
        <StatCard label="إجمالي الميزانية" value={sar(stats.totalBudget)} />
        <StatCard label="إجمالي المصروفات" value={sar(stats.totalSpent)} tone="gold" hint={`نسبة الصرف ${pct(stats.spentRatio)}`} />
        <StatCard
          label="إجمالي المتبقي"
          value={sar(stats.totalRemaining)}
          tone={stats.totalRemaining < 0 ? 'bad' : 'good'}
          hint={`${pct(1 - stats.spentRatio)} من الميزانية`}
        />
        <StatCard label="إجمالي الإيرادات" value={sar(stats.totalIncome)} />
      </section>

      {alerts.length > 0 && (
        <section className="card alerts" aria-label="تنبيهات">
          <h2>تنبيهات</h2>
          <ul className="plain">
            {alerts.map((r) => (
              <li key={r.id}>
                <Link to={`/item/${r.id}`}>{r.name}</Link> <LevelBadge level={r.level} ratio={r.ratio} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>نسبة الصرف لكل بند</h2>
        <div className="chart" dir="ltr">
          <ResponsiveContainer width="100%" height={Math.max(260, chart.length * 48)}>
            <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, Math.ceil(maxPercent / 10) * 10]} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 13 }} />
              <Tooltip
                formatter={(v, _n, item) => {
                  const p = item.payload as (typeof chart)[number]
                  return [`${Number(v).toFixed(1)}% — ${sar(p.spent)} من ${sar(p.allocated)}`, 'نسبة الصرف']
                }}
              />
              <ReferenceLine x={100} stroke={COLORS.over} strokeDasharray="4 4" label={{ value: '100%', fill: COLORS.over, fontSize: 12 }} />
              <Bar dataKey="percent" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {chart.map((c) => (
                  <Cell key={c.name} fill={COLORS[c.level]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2>البنود</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>البند</th>
                <th className="end">المخصص</th>
                <th className="end">المصروف</th>
                <th className="end">المتبقي</th>
                <th className="progress-col">نسبة الصرف</th>
              </tr>
            </thead>
            <tbody>
              {stats.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/item/${r.id}`}>{r.name}</Link>
                  </td>
                  <td className="end nowrap">
                    <Money value={r.allocated} />
                  </td>
                  <td className="end nowrap">
                    <Money value={r.spent} />
                  </td>
                  <td className={`end nowrap strong ${r.remaining < 0 ? 'bad-text' : ''}`}>
                    <Money value={r.remaining} />
                  </td>
                  <td className="progress-col">
                    <Progress ratio={r.ratio} level={r.level} />
                    <bdi className="num small">{pct(r.ratio)}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>آخر المصروفات</h2>
        <TxTable txs={latest} itemName={(id) => (id ? (names.get(id) ?? null) : null)} onEdit={setEditing} empty="لا توجد مصروفات مسجلة بعد." />
      </section>

      {adding && <TxForm kind="expense" rows={stats.rows} onClose={() => setAdding(false)} />}
      {editing && <TxForm kind="expense" rows={stats.rows} editing={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
