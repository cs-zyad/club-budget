# نظام ميزانية نادي ريادة الأعمال

نظام ويب (React + TypeScript + Vite + Firebase) لمتابعة ميزانية النادي: بنود لكل منها حصة وصفحة، وتسجيل المصروفات والإيرادات، ولوحة تحكم بالمتبقي ونسب الصرف.

## التشغيل محلياً

```bash
npm install
npm run dev
```

بدون إعدادات Firebase يعمل النظام **بوضع تجريبي** (بيانات في المتصفح فقط) لتجربة الواجهة.

## ربط Firebase

1. أنشئ مشروعاً في [Firebase Console](https://console.firebase.google.com).
2. فعّل **Authentication ← Email/Password**، ثم أضف حساب المدير من تبويب Users. لا توجد صفحة تسجيل حساب جديد في النظام.
3. فعّل **Firestore Database** وانشر القواعد من `firestore.rules`.
4. أضف تطبيق **Web** وانسخ إعداداته إلى ملف `.env.local` (النموذج في `.env.example`).
5. شغّل `npm run dev` وسجّل الدخول، ثم اضغط «إضافة البنود السبعة» في لوحة التحكم.

## النشر

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules
```

## ملاحظات

- الأمان مفروض بقواعد Firestore (`firestore.rules`): لا قراءة ولا كتابة بدون تسجيل دخول.
- لا ترفع `.env.local` أو أي بيانات مالية للمستودع.
- الصرف فوق حصة البند مسموح مع تنبيه أحمر، والتنبيه الأصفر يبدأ عند 80% من الحصة.
