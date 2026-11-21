import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { firebaseReady, firestore } from '../firebase'
import type { AllocationChange, BudgetItem, Receipt, Tx, TxInput } from '../types'

type Unsub = () => void
const round = (n: number) => Math.round(n * 100) / 100

export interface Db {
  watchItems(cb: (items: BudgetItem[]) => void, onError: (e: Error) => void): Unsub
  watchTx(cb: (tx: Tx[]) => void, onError: (e: Error) => void): Unsub
  seedItems(items: { name: string; allocated: number }[], uid: string): Promise<void>
  addItem(name: string, allocated: number, order: number, uid: string): Promise<void>
  renameItem(id: string, name: string): Promise<void>
  setAllocation(item: BudgetItem, to: number, note: string, uid: string): Promise<void>
  transfer(from: BudgetItem, to: BudgetItem, amount: number, note: string, uid: string): Promise<void>
  /** receipt: undefined = بلا تغيير، null = إزالة الفاتورة، كائن = فاتورة جديدة */
  saveTx(tx: TxInput, uid: string, receipt?: Receipt | null): Promise<void>
  removeTx(id: string, hasReceipt?: boolean): Promise<void>
  getReceipt(id: string): Promise<Receipt | null>
}

const change = (from: number, to: number, note: string, by: string): AllocationChange => ({
  at: Date.now(),
  by,
  from: round(from),
  to: round(to),
  note,
})

const transferNotes = (from: BudgetItem, to: BudgetItem, note: string) => {
  const extra = note ? ` — ${note}` : ''
  return { out: `نقل إلى «${to.name}»${extra}`, in: `نقل من «${from.name}»${extra}` }
}

/* ───────────── Firestore ───────────── */

function firestoreDb(): Db {
  const fs = firestore!
  const items = collection(fs, 'items')
  const txs = collection(fs, 'transactions')
  const receipts = collection(fs, 'receipts')
  return {
    watchItems: (cb, onError) =>
      onSnapshot(items, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BudgetItem, 'id'>) }))), onError),
    watchTx: (cb, onError) =>
      onSnapshot(
        txs,
        (snap) =>
          cb(
            snap.docs.map((d) => {
              const data = d.data()
              const created = data.createdAt
              return {
                id: d.id,
                ...data,
                createdAt: typeof created?.toMillis === 'function' ? created.toMillis() : Date.now(),
              } as Tx
            }),
          ),
        onError,
      ),
    async seedItems(list, uid) {
      const batch = writeBatch(fs)
      list.forEach((it, i) =>
        batch.set(doc(items), { ...it, order: i, history: [change(0, it.allocated, 'الميزانية الافتتاحية', uid)] }),
      )
      await batch.commit()
    },
    async addItem(name, allocated, order, uid) {
      await addDoc(items, { name, allocated: round(allocated), order, history: [change(0, allocated, 'إنشاء البند', uid)] })
    },
    async renameItem(id, name) {
      await updateDoc(doc(items, id), { name })
    },
    async setAllocation(item, to, note, uid) {
      await updateDoc(doc(items, item.id), {
        allocated: round(to),
        history: arrayUnion(change(item.allocated, to, note || 'تعديل الحصة', uid)),
      })
    },
    async transfer(from, to, amount, note, uid) {
      const n = transferNotes(from, to, note)
      const batch = writeBatch(fs)
      batch.update(doc(items, from.id), {
        allocated: round(from.allocated - amount),
        history: arrayUnion(change(from.allocated, from.allocated - amount, n.out, uid)),
      })
      batch.update(doc(items, to.id), {
        allocated: round(to.allocated + amount),
        history: arrayUnion(change(to.allocated, to.allocated + amount, n.in, uid)),
      })
      await batch.commit()
    },
    async saveTx({ id, ...data }, uid, receipt) {
      const batch = writeBatch(fs)
      const ref = id ? doc(txs, id) : doc(txs)
      const extra: { hasReceipt?: boolean } = {}
      if (receipt) {
        batch.set(doc(receipts, ref.id), receipt)
        extra.hasReceipt = true
      } else if (receipt === null) {
        batch.delete(doc(receipts, ref.id))
        extra.hasReceipt = false
      }
      if (id) batch.set(ref, { ...data, ...extra }, { merge: true })
      else batch.set(ref, { ...data, hasReceipt: false, ...extra, createdBy: uid, createdAt: serverTimestamp() })
      await batch.commit()
    },
    async removeTx(id, hasReceipt) {
      const batch = writeBatch(fs)
      batch.delete(doc(txs, id))
      if (hasReceipt) batch.delete(doc(receipts, id))
      await batch.commit()
    },
    async getReceipt(id) {
      const snap = await getDoc(doc(receipts, id))
      return snap.exists() ? (snap.data() as Receipt) : null
    },
  }
}

/* ───────────── وضع تجريبي محلي (localStorage) ───────────── */

const LS_ITEMS = 'club-budget-demo-items'
const LS_TX = 'club-budget-demo-tx'
const LS_RECEIPTS = 'club-budget-demo-receipts'

function readReceipts(): Record<string, Receipt> {
  try {
    return JSON.parse(localStorage.getItem(LS_RECEIPTS) ?? '{}') as Record<string, Receipt>
  } catch {
    return {}
  }
}

function readLS<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* التخزين غير متاح */
  }
}

function localDb(): Db {
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())
  const watch =
    <T,>(key: string) =>
    (cb: (rows: T[]) => void): Unsub => {
      const push = () => cb(readLS<T>(key))
      listeners.add(push)
      push()
      return () => listeners.delete(push)
    }
  const newId = () => crypto.randomUUID()
  const editItems = (fn: (all: BudgetItem[]) => void) => {
    const all = readLS<BudgetItem>(LS_ITEMS)
    fn(all)
    writeLS(LS_ITEMS, all)
    notify()
  }
  const apply = (all: BudgetItem[], id: string, to: number, c: AllocationChange) => {
    const it = all.find((x) => x.id === id)
    if (!it) return
    it.allocated = round(to)
    it.history = [...(it.history ?? []), c]
  }
  return {
    watchItems: (cb) => watch<BudgetItem>(LS_ITEMS)(cb),
    watchTx: (cb) => watch<Tx>(LS_TX)(cb),
    async seedItems(list, uid) {
      editItems((all) =>
        list.forEach((it, i) =>
          all.push({ id: newId(), ...it, order: i, history: [change(0, it.allocated, 'الميزانية الافتتاحية', uid)] }),
        ),
      )
    },
    async addItem(name, allocated, order, uid) {
      editItems((all) =>
        all.push({ id: newId(), name, allocated: round(allocated), order, history: [change(0, allocated, 'إنشاء البند', uid)] }),
      )
    },
    async renameItem(id, name) {
      editItems((all) => {
        const it = all.find((x) => x.id === id)
        if (it) it.name = name
      })
    },
    async setAllocation(item, to, note, uid) {
      editItems((all) => apply(all, item.id, to, change(item.allocated, to, note || 'تعديل الحصة', uid)))
    },
    async transfer(from, to, amount, note, uid) {
      const n = transferNotes(from, to, note)
      editItems((all) => {
        apply(all, from.id, from.allocated - amount, change(from.allocated, from.allocated - amount, n.out, uid))
        apply(all, to.id, to.allocated + amount, change(to.allocated, to.allocated + amount, n.in, uid))
      })
    },
    async saveTx({ id, ...data }, user, receipt) {
      const all = readLS<Tx>(LS_TX)
      const txId = id ?? newId()
      const extra: { hasReceipt?: boolean } = {}
      if (receipt !== undefined) {
        const map = readReceipts()
        if (receipt) map[txId] = receipt
        else delete map[txId]
        writeLS(LS_RECEIPTS, map)
        extra.hasReceipt = Boolean(receipt)
      }
      const i = all.findIndex((x) => x.id === txId)
      if (i >= 0) all[i] = { ...all[i], ...data, ...extra }
      else all.push({ id: txId, ...data, hasReceipt: false, ...extra, createdBy: user, createdAt: Date.now() })
      writeLS(LS_TX, all)
      notify()
    },
    async removeTx(id) {
      writeLS(
        LS_TX,
        readLS<Tx>(LS_TX).filter((x) => x.id !== id),
      )
      const map = readReceipts()
      delete map[id]
      writeLS(LS_RECEIPTS, map)
      notify()
    },
    async getReceipt(id) {
      return readReceipts()[id] ?? null
    },
  }
}

export const db: Db = firebaseReady ? firestoreDb() : localDb()
