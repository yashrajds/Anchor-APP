const KEY = 'anchor.errorlog.v1'

export function logError(message: string) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    list.unshift({ time: new Date().toISOString(), message })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
  } catch {}
}

export function getErrorLog(): { time: string; message: string }[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function clearErrorLog() {
  localStorage.removeItem(KEY)
}
