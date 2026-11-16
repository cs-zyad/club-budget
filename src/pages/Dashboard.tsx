import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Coins, Minus, PiggyBank, Plus, TrendingUp, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../auth'
import { useFeedback } from '../components/feedback'
import { TxForm } from '../components/TxForm'
import { Empty, LevelBadge, Money, PageHead, Progress, StatCard } from '../components/ui'
import { useBudget } from '../data/budget'
import { db } from '../data/db'
import { fmtDate, pct, sar } from '../lib/format'
import { DEFAULT_ITEMS } from '../lib/stats'
import type { Tx, TxKind } from '../types'

const COLORS = { ok: '#4f7a2b', warn: '#ecb02e', over: '#c91717' }

export function Dashboard() {
  const { user } = useAuth()
  const { stats, txs, loading } = useBudget()
  const { toast } = useFeedback()
  const [adding, setAdding] = useState<TxKind | null>(null)
  const [editing, setEditing] = useState<Tx | null>(null)
  const [seeding, setSeeding] = useState(false)

  if (loading) return <p className="muted">جارٍ التحميل…</p>

  async function seed() {
    setSeeding(true)
    try {
      await db.seedItems(DEFAULT_ITEMS, user?.uid ?? '')
      toast('تمت إضافة بنود الميزانية')
    } catch {
      toast('تعذر إضافة البنود، تأكد من الاتصال', 'bad')
      setSeeding(false)
    }
  }

  if (stats.rows.length === 0) {
    return (
      <>
        <PageHead title="مرحباً بك 👋" sub="لنبدأ بإعداد ميزانية النادي" />
        <section className="card onboarding">
          <h2>ابدأ بميزانية 2026/2027</h2>
          <p className="muted">أضف البنود السبعة من ملف الميزانية بضغطة واحدة، وتقدر تعدّلها أو تضيف بنوداً لاحقاً.</p>
          <ul className="seed-list">
            {DEFAULT_ITEMS.map((i) => (
              <li key={i.name}>
                <span>{i.name}</span>
                <bdi className="num">{sar(i.allocated)}</bdi>
              </li>
            ))}
            <li className="total">
              <span>الإجمالي</span>
              <bdi className="num">{sar(DEFAULT_ITEMS.reduce((s, i) => s + i.allocated, 0))}</bdi>
            </li>
          </ul>
          <button className="btn lg" onClick={seed} disabled={seeding}>
            {seeding ? 'جارٍ الإضافة…' : 'إضافة البنود السبعة'}
          </button>
        </section>
      </>
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
  const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 6)

  return (
    <>
      <PageHead title="لوحة التحكم" sub="ملخص ميزانية النادي للعام الجامعي 2026/2027">
        <button className="btn ghost" onClick={() => setAdding('income')}>
          <Plus size={18} aria-hidden /> إيراد
        </button>
        <button className="btn" onClick={() => setAdding('expense')}>
          <Minus size={18} aria-hidden /> مصروف
        </button>
      </PageHead>

      <section className="stats">
        <StatCard label="إجمالي الميزانية" value={sar(stats.totalBudget)} icon={<Wallet size={20} />} hint={`${stats.rows.length} بنود`} />
        <StatCard label="المصروف" value={sar(stats.totalSpent)} tone="gold" icon={<Coins size={20} />} hint={`${pct(stats.spentRatio)} من الميزانية`} />
        <StatCard
          label="المتبقي"
          value={sar(stats.totalRemaining)}
          tone={stats.totalRemaining < 0 ? 'bad' : 'good'}
          icon={<PiggyBank size={20} />}
          hint={<Progress ratio={stats.spentRatio} level={stats.spentRatio > 1 ? 'over' : stats.spentRatio >= 0.8 ? 'warn' : 'ok'} />}
        />
        <StatCard label="الإيرادات" value={sar(stats.totalIncome)} icon={<TrendingUp size={20} />} hint={<Link to="/transactions?kind=income">عرض الإيرادات</Link>} />
      </section>

      {alerts.length > 0 && (
        <section className="card alerts" aria-label="تنبيهات">
          <div className="alerts-head">
            <AlertTriangle size={20} aria-hidden />
            <h2>تنبيهات تحتاج انتباهك</h2>
          </div>
          <ul>
            {alerts.map((r) => (
              <li key={r.id}>
                <Link to={`/item/${r.id}`}>{r.name}</Link>
                <span className="muted small">
                  متبقي <Money value={r.remaining} />
                </span>
                <LevelBadge level={r.level} ratio={r.ratio} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>البنود</h2>
          <Link to="/items" className="more">
            إدارة البنود <ArrowLeft size={16} aria-hidden />
          </Link>
        </div>
        <div className="item-cards">
          {stats.rows.map((r) => (
            <Link key={r.id} to={`/item/${r.id}`} className={`card item-card ${r.level}`}>
              <div className="item-card-head">
                <span className="item-card-name">{r.name}</span>
                <span className={`dot ${r.level}`} aria-hidden />
              </div>
              <div className={`item-card-value ${r.remaining < 0 ? 'bad-text' : ''}`}>
                <Money value={r.remaining} />
              </div>
              <div className="muted small">
                متبقي من <Money value={r.allocated} />
              </div>
              <Progress ratio={r.ratio} level={r.level} />
              <div className="item-card-foot">
                <span>
                  مصروف <Money value={r.spent} />
                </span>
                <bdi className="num">{pct(r.ratio)}</bdi>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>نسبة الصرف لكل بند</h2>
          <div className="chart" dir="ltr">
            <ResponsiveContainer width="100%" height={Math.max(240, chart.length * 44)}>
              <BarChart data={chart} layout="vertical" margin={{ left: 4, right: 20, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, Math.ceil(maxPercent / 10) * 10]} tickFormatter={(v: number) => `${v}%`} fontSize={12} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v, _n, item) => {
                    const p = item.payload as (typeof chart)[number]
                    return [`${Number(v).toFixed(1)}% — ${sar(p.spent)} من ${sar(p.allocated)}`, 'نسبة الصرف']
                  }}
                />
                <ReferenceLine x={100} stroke={COLORS.over} strokeDasharray="4 4" />
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
          <div className="section-head">
            <h2>آخر العمليات</h2>
            <Link to="/transactions" className="more">
              عرض الكل <ArrowLeft size={16} aria-hidden />
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty title="لا توجد عمليات بعد">
              <span className="muted small">سجّل أول مصروف من زر «مصروف» بالأعلى.</span>
            </Empty>
          ) : (
            <ul className="recent">
              {recent.map((t) => (
                <li key={t.id}>
                  <button className="recent-row" onClick={() => setEditing(t)}>
                    <span className={`kind-dot ${t.kind}`} aria-hidden />
                    <span className="recent-main">
                      <span className="recent-title">{t.description}</span>
                      <span className="muted small">
                        {t.kind === 'income' ? 'إيراد' : (names.get(t.itemId ?? '') ?? '—')} · <bdi className="num">{fmtDate(t.date)}</bdi>
                      </span>
                    </span>
                    <span className={`strong nowrap ${t.kind === 'income' ? 'good-text' : ''}`}>
                      <Money value={t.amount} signed={t.kind === 'income'} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {adding && <TxForm kind={adding} onClose={() => setAdding(null)} />}
      {editing && <TxForm kind={editing.kind} editing={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
