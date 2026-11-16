const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export const num = (n: number): string => nf.format(n)

// الرقم داخل عزل اتجاه (LRI…PDI) حتى تبقى الإشارة ملاصقة له داخل النص العربي: ‎-100 ر.س
export const sar = (n: number, signed = false): string =>
  `\u2066${signed && n > 0 ? '+' : ''}${nf.format(n)}\u2069 ر.س`

export const pct = (ratio: number): string =>
  Number.isFinite(ratio) ? `${(Math.round(ratio * 1000) / 10).toFixed(1)}%` : '—'

const pad = (n: number) => String(n).padStart(2, '0')

export const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 2026-11-16 → 16/11/2026 */
export const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

export const fmtDateTime = (ms: number): string => {
  const d = new Date(ms)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const monthFmt = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { month: 'long', year: 'numeric' })

/** 2026-11 → نوفمبر 2026 */
export const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number)
  return y && m ? monthFmt.format(new Date(y, m - 1, 1)) : ym
}
