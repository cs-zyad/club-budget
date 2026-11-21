/**
 * تجهيز صورة الفاتورة قبل الحفظ في Firestore (حد المستند 1 ميغابايت):
 * الصور تُصغَّر وتُضغط JPEG حتى تقل عن الحد، وملفات PDF الصغيرة تُحفظ كما هي.
 */
export const MAX_CHARS = 900_000
const MAX_PDF_BYTES = 650_000

export class ReceiptError extends Error {}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new ReceiptError('تعذرت قراءة الملف'))
    r.readAsDataURL(file)
  })
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new ReceiptError('تعذر فتح الصورة. جرّب صورة بصيغة JPG أو PNG.')
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

export async function prepareReceipt(file: File): Promise<{ data: string; type: string }> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new ReceiptError('ملف PDF كبير. الحد 650 كيلوبايت، أو صوّر الفاتورة بالكاميرا بدلاً منه.')
    return { data: await readAsDataURL(file), type: file.type }
  }
  if (!file.type.startsWith('image/')) throw new ReceiptError('اختر صورة أو ملف PDF')

  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ReceiptError('المتصفح لا يدعم تجهيز الصور')

  let maxSide = 1600
  let quality = 0.75
  for (let i = 0; i < 10; i++) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/jpeg', quality)
    if (data.length <= MAX_CHARS) return { data, type: 'image/jpeg' }
    if (quality > 0.5) quality -= 0.1
    else maxSide = Math.round(maxSide * 0.8)
  }
  throw new ReceiptError('الصورة كبيرة جداً، جرّب صورة أصغر')
}

/** يفتح الفاتورة في تبويب جديد (مفيد لملفات PDF على الجوال) */
export async function openReceipt(dataUrl: string): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
