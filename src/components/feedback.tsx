import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from './ui'

interface ConfirmOptions {
  title: string
  body: ReactNode
  confirmText?: string
  danger?: boolean
}

interface Feedback {
  toast(text: string, tone?: 'ok' | 'bad'): void
  confirm(opts: ConfirmOptions): Promise<boolean>
}

const Ctx = createContext<Feedback | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: 'ok' | 'bad' }[]>([])
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve(v: boolean): void }) | null>(null)
  const seq = useRef(0)

  const toast = useCallback((text: string, tone: 'ok' | 'bad' = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), [])
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  const close = (v: boolean) => {
    dialog?.resolve(v)
    setDialog(null)
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.tone === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {t.text}
          </div>
        ))}
      </div>
      {dialog && (
        <Modal title={dialog.title} onClose={() => close(false)}>
          <div className="confirm-body">{dialog.body}</div>
          <div className="actions">
            <button className="btn ghost" onClick={() => close(false)}>
              إلغاء
            </button>
            <button className={`btn ${dialog.danger ? 'danger' : ''}`} onClick={() => close(true)} autoFocus>
              {dialog.confirmText ?? 'تأكيد'}
            </button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  )
}

export function useFeedback(): Feedback {
  const v = useContext(Ctx)
  if (!v) throw new Error('useFeedback must be used inside FeedbackProvider')
  return v
}
