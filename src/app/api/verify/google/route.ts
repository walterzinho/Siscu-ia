import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key requerida' }, { status: 400 })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hola' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      }
    )

    if (!res.ok) {
      if (res.status === 400 || res.status === 403) {
        return NextResponse.json({ error: 'API Key inválida o sin permisos' }, { status: 400 })
      }
      const err = await res.text()
      return NextResponse.json({ error: `Error (${res.status}): ${err}` }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: 'API Key válida — conexión exitosa con Gemini' })
  } catch {
    return NextResponse.json({ error: 'Error de conexión con Google' }, { status: 502 })
  }
}
