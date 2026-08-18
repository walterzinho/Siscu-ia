import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, databaseId } = await request.json()
    if (!token || !databaseId) {
      return NextResponse.json({ error: 'Token y Database ID requeridos' }, { status: 400 })
    }

    // Limpia el ID por si viene con URL completa
    let cleanId = databaseId.trim()
    if (cleanId.includes('?')) cleanId = cleanId.split('?')[0]
    cleanId = cleanId.split('/').pop() || cleanId

    // Verifica que el token tiene acceso a la base de datos
    const res = await fetch(`https://api.notion.com/v1/databases/${cleanId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({
          error: 'Base de datos no encontrada. Verifica el ID y que el token tenga acceso.',
        }, { status: 400 })
      }
      if (res.status === 401) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
      }
      const err = await res.text()
      return NextResponse.json({ error: `Error (${res.status}): ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const dbTitle = data.title?.[0]?.plain_text || 'Sin título'

    // Verifica que tenga las propiedades esperadas
    const props = Object.keys(data.properties || {})
    const hasRequired = ['Nombre', 'Tipo', 'Estado'].every((p) =>
      props.some((sp) => sp.toLowerCase() === p.toLowerCase())
    )

    let warning = ''
    if (!hasRequired) {
      const missing = ['Nombre', 'Tipo', 'Estado'].filter(
        (p) => !props.some((sp) => sp.toLowerCase() === p.toLowerCase())
      )
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
