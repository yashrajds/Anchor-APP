import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const OTP_SENDER_EMAIL = import.meta.env.VITE_OTP_SENDER_EMAIL as string
const OTP_SENDER_NAME = (import.meta.env.VITE_OTP_SENDER_NAME as string) || 'Anchor'
const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY as string
const OTP_COLLECTION = 'email_verifications'
const OTP_TTL_MS = 5 * 60 * 1000

// Local storage key: `anchor.otp.<uid>` = true once verified
const localKey = (uid: string) => `anchor.otp.${uid}`

export function isOtpVerified(uid: string) {
  return localStorage.getItem(localKey(uid)) === 'true'
}

export function markOtpVerified(uid: string) {
  localStorage.setItem(localKey(uid), 'true')
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function requestOtp(email: string, uid: string) {
  const code = makeCode()
  const expiresAt = Date.now() + OTP_TTL_MS

  await setDoc(doc(db, OTP_COLLECTION, uid), {
    user_id: uid,
    email,
    code,
    expires_at: expiresAt,
  }, { merge: true })

  const html = `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;">
      <h2>Anchor verification code</h2>
      <p>Your verification code is <strong style="font-size:24px;letter-spacing:2px">${code}</strong>.</p>
      <p>This code is valid for 5 minutes. Please do not share it with anyone.</p>
    </div>`

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: OTP_SENDER_NAME, email: OTP_SENDER_EMAIL },
      to: [{ email }],
      subject: 'Anchor verification code',
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    throw new Error(`Brevo email failed: ${res.status} ${await res.text()}`)
  }
}

export async function verifyOtp(uid: string, code: string) {
  const snap = await getDoc(doc(db, OTP_COLLECTION, uid))
  if (!snap.exists()) throw new Error('No verification code found. Request a new one.')

  const data = snap.data()
  if (Date.now() > Number(data.expires_at ?? 0)) throw new Error('This code has expired.')
  if (String(data.code) !== String(code.trim())) throw new Error('Incorrect code.')

  markOtpVerified(uid)
  return true
}
