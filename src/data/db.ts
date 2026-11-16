import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { firebaseReady, firestore } from '../firebase'
import type { AllocationChange, BudgetItem, Tx, TxInput } from '../types'

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
  saveTx(tx: TxInput, uid: string): Promise<void>
  removeTx(id: string): Promise<void>
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
    async saveTx({ id, ...data }, uid) {
      if (id) await setDoc(doc(txs, id), data, { merge: true })
      else await addDoc(txs, { ...data, createdBy: uid, createdAt: serverTimestamp() })
    },
    async removeTx(id) {
      await deleteDoc(doc(txs, id))
    },
  }
}

/* ───────────── وضع تجريبي محلي (localStorage) ───────────── */

const LS_ITEMS = 'club-budget-demo-items'
const LS_TX = 'club-budget-demo-tx'

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
    async saveTx({ id, ...data }, user) {
      const all = readLS<Tx>(LS_TX)
      const i = all.findIndex((x) => x.id === id)
      if (i >= 0) all[i] = { ...all[i], ...data }
      else all.push({ id: newId(), ...data, createdBy: user, createdAt: Date.now() })
      writeLS(LS_TX, all)
      notify()
    },
    async removeTx(id) {
      writeLS(
        LS_TX,
        readLS<Tx>(LS_TX).filter((x) => x.id !== id),
      )
      notify()
    },
  }
}

export const db: Db = firebaseReady ? firestoreDb() : localDb()
