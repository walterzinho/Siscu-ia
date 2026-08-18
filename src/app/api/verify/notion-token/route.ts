import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    // Verifica el token llamando al endpoint users/me de Notion
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
      }
      const err = await res.text()
      return NextResponse.json({ error: `Error (${res.status}): ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const workspace = data.workspace_name || 'Workspace'

    return NextResponse.json({
      success: true,
      message: `Token válido — conectado a: ${workspace}`,
    })
  } catch {
    return NextResponse.json({ error: 'Error de conexión con Notion' }, { status: 502 })
  }
}
