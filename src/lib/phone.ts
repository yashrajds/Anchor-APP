import { auth } from './firebase'
import { linkWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'

let recaptchaVerifier: RecaptchaVerifier | null = null

export async function requestPhoneOtp(phoneNumber: string): Promise<ConfirmationResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in first.')
  const container = document.getElementById('recaptcha-container')
  if (!container) throw new Error('reCAPTCHA container missing.')
  recaptchaVerifier = new RecaptchaVerifier(auth, container, { size: 'invisible' })
  return await linkWithPhoneNumber(user, phoneNumber, recaptchaVerifier)
}

export async function confirmPhoneOtp(confirmationResult: ConfirmationResult, code: string) {
  return await confirmationResult.confirm(code)
}
