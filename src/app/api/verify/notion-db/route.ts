import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, databaseId } = await request.json()
    if (!token || !databaseId) {
      return NextResponse.json({ error: 'Token y Database ID requeridos' }, { status: 400 })
    }

    // Limpia el ID: acepta URL completa o solo el ID
    let cleanId = databaseId.trim()
    if (cleanId.includes('?')) cleanId = cleanId.split('?')[0]
    // Quita query params y fragmentos
    cleanId = cleanId.replace(/[?#].*/, '')
    // Extrae el UUID (32 hex chars con guiones)
    const uuidMatch = cleanId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuidMatch) {
      cleanId = uuidMatch[0]
    }

    // Verifica que el token tiene acceso a la base de datos
    const res = await fetch(`https://api.notion.com/v1/databases/${cleanId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      const errMsg = errBody?.message || ''

      if (res.status === 401) {
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
      }
      if (res.status === 404) {
        return NextResponse.json({
          error: 'Base de datos no encontrada. Verifica el ID y que la integración tenga acceso compartido a la base.',
        }, { status: 400 })
      }
      // Detectar si el ID es de una página en vez de una base de datos
      if (errMsg.includes('is a page, not a database')) {
        return NextResponse.json({
          error: 'El ID que ingresaste es de una PÁGINA, no de una BASE DE DATOS. Ve a Notion, abre la vista de base de datos (tabla), y copia el ID de esa URL.',
        }, { status: 400 })
      }
      return NextResponse.json({ error: `Error (${res.status}): ${errMsg}` }, { status: 502 })
    }

    const data = await res.json()
    const dbTitle = data.title?.[0]?.plain_text || 'Sin título'

    // Verifica que tenga las propiedades esperadas
    const props = Object.keys(data.properties || {})
    const required = ['Nombre', 'Tipo', 'Estado']
    const missing = required.filter(
      (p) => !props.some((sp) => sp.toLowerCase() === p.toLowerCase())
    )

    let warning = ''
    if (missing.length > 0) {
      warning = `Faltan columnas recomendadas: ${missing.join(', ')}. El envío puede fallar.`
    }

    return NextResponse.json({
      success: true,
      message: `Base de datos encontrada: «${dbTitle}»${warning ? ' — ' + warning : ''}`,
      properties: props,
    })
  } catch {
    return NextResponse.json({ error: 'Error de conexión con Notion' }, { status: 502 })
  }
}
