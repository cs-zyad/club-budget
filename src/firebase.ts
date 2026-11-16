import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = import.meta.env

// إعدادات تطبيق الويب في Firebase ليست أسراراً: تظهر لكل زائر في المتصفح، والحماية الفعلية
// في قواعد Firestore (firestore.rules) وفي تسجيل الدخول. يمكن تجاوزها بمتغيرات VITE_FIREBASE_*.
const defaults = {
  apiKey: 'AIzaSyA-ynxEDiCOo1PSVDZbvqQQEnz3AJJ9bAc',
  authDomain: 'club-budget-9e88a.firebaseapp.com',
  projectId: 'club-budget-9e88a',
  storageBucket: 'club-budget-9e88a.firebasestorage.app',
  messagingSenderId: '525776238068',
  appId: '1:525776238068:web:9b932e3d4834fe9b94b5a1',
}

const config = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) || defaults.apiKey,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || defaults.authDomain,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) || defaults.projectId,
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || defaults.storageBucket,
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || defaults.messagingSenderId,
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) || defaults.appId,
}

/** إذا لم تُضبط إعدادات Firebase يعمل النظام بوضع تجريبي محلي (بيانات في المتصفح فقط). */
// VITE_DEMO=1 يفرض الوضع التجريبي (للاختبار دون لمس البيانات الحقيقية).
export const firebaseReady = env.VITE_DEMO !== '1' && Boolean(config.apiKey && config.projectId && config.appId)

const app = firebaseReady ? initializeApp(config) : null
export const auth = app ? getAuth(app) : null
export const firestore = app ? getFirestore(app) : null
