// Gemini-backed Anchor AI chat client.
// Uses a mental-health-friendly system prompt so replies feel warm and natural.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
const GEMINI_MODEL = 'gemini-3.8-flash'

const SYSTEM_PROMPT = `You are Anchor, a calm, friendly, and emotionally supportive mental health companion.
Talk like a real person—warm, concise, and non-judgmental.
Help the user feel heard, offer gentle perspective, and suggest simple grounding or coping steps when useful.
Do not diagnose or replace professional care. If the user seems in crisis, encourage reaching out to a crisis line or trusted person.`

type ChatMessage = { role: 'user' | 'ai'; text: string }

export async function anchorReply(history: ChatMessage[], userText: string): Promise<string> {
  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Got it. I am Anchor. How can I support you right now?' }] },
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userText }] },
  ]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini request failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No text returned from Gemini')
  return text.trim()
}
