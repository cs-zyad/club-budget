import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { firebaseReady, firestore } from '../firebase'
import type { BudgetItem, ItemInput, Tx, TxInput } from '../types'

type Unsub = () => void

export interface Db {
  watchItems(cb: (items: BudgetItem[]) => void, onError: (e: Error) => void): Unsub
  watchTx(cb: (tx: Tx[]) => void, onError: (e: Error) => void): Unsub
  saveItem(item: ItemInput): Promise<void>
  seedItems(items: Omit<BudgetItem, 'id'>[]): Promise<void>
  saveTx(tx: TxInput, uid: string): Promise<void>
  removeTx(id: string): Promise<void>
}

/* ───────────── Firestore ───────────── */

function firestoreDb(): Db {
  const fs = firestore!
  const items = collection(fs, 'items')
  const txs = collection(fs, 'transactions')
  return {
    watchItems: (cb, onError) =>
      onSnapshot(
        items,
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BudgetItem, 'id'>) }))),
        onError,
      ),
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
    async saveItem({ id, ...data }) {
      if (id) await setDoc(doc(items, id), data, { merge: true })
      else await addDoc(items, data)
    },
    async seedItems(list) {
      const batch = writeBatch(fs)
      for (const it of list) batch.set(doc(items), it)
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
    <T>(key: string) =>
    (cb: (rows: T[]) => void): Unsub => {
      const push = () => cb(readLS<T>(key))
      listeners.add(push)
      push()
      return () => listeners.delete(push)
    }
  const uid = () => crypto.randomUUID()
  return {
    watchItems: (cb) => watch<BudgetItem>(LS_ITEMS)(cb),
    watchTx: (cb) => watch<Tx>(LS_TX)(cb),
    async saveItem({ id, ...data }) {
      const all = readLS<BudgetItem>(LS_ITEMS)
      const i = all.findIndex((x) => x.id === id)
      if (i >= 0) all[i] = { ...all[i], ...data }
      else all.push({ id: uid(), ...data })
      writeLS(LS_ITEMS, all)
      notify()
    },
    async seedItems(list) {
      writeLS(LS_ITEMS, [...readLS<BudgetItem>(LS_ITEMS), ...list.map((x) => ({ id: uid(), ...x }))])
      notify()
    },
    async saveTx({ id, ...data }, user) {
      const all = readLS<Tx>(LS_TX)
      const i = all.findIndex((x) => x.id === id)
      if (i >= 0) all[i] = { ...all[i], ...data }
      else all.push({ id: uid(), ...data, createdBy: user, createdAt: Date.now() })
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
