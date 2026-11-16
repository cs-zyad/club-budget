const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export const sar = (n: number): string => `${nf.format(n)} ر.س`

export const pct = (ratio: number): string => `${(Math.round(ratio * 1000) / 10).toFixed(1)}%`

export const today = (): string => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
