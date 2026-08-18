import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, parentPageId } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token de Notion requerido' }, { status: 400 })
    }

    // Limpia el ID del padre (puede ser una página)
    let parentId = parentPageId?.trim() || ''
    if (parentId) {
      const uuidMatch = parentId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      if (uuidMatch) parentId = uuidMatch[0]
    }

    // Crea la base de datos con las columnas que necesita Siscuñia
    const body: any = {
      properties: {
        'Nombre': {
          title: {},
        },
        'Tipo': {
          select: {
            options: [
              { name: 'Locución Institucional' },
              { name: 'Micro-programa' },
              { name: 'Campaña Institucional' },
              { name: 'Cuña de Programa / Franja' },
              { name: 'Infomercial' },
              { name: 'Otro' },
            ],
          },
        },
        'Cliente': {
          rich_text: {},
        },
        'Duración': {
          select: {
            options: [
              { name: '15"' },
              { name: '20"' },
              { name: '30"' },
              { name: '45"' },
              { name: '60"' },
              { name: '1 min' },
              { name: '2 min' },
              { name: '3 min' },
              { name: '5 min' },
              { name: '10+ min' },
            ],
          },
        },
        'Estado': {
          status: {
            options: [
              { name: 'Generado', color: 'blue' },
              { name: 'En producción', color: 'yellow' },
              { name: 'Al aire', color: 'green' },
              { name: 'Revision', color: 'red' },
            ],
          },
        },
        'Fecha': {
          date: {},
        },
      },
    }

    // Si hay un page padre, crear la DB dentro de esa página
    if (parentId) {
      body.parent = { page_id: parentId }
    }

    const res = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      const errMsg = errBody?.message || ''
      if (res.status === 401) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
      }
      return NextResponse.json({ error: `Error al crear: ${errMsg}` }, { status: 502 })
    }

    const data = await res.json()
    const dbId = data.id
    const dbTitle = data.title?.[0]?.plain_text || 'Siscuñia - Libretos'
    const dbUrl = data.url

    return NextResponse.json({
      success: true,
      databaseId: dbId,
      message: `Base de datos creada: ${dbTitle}`,
      url: dbUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Error de conexion con Notion' }, { status: 502 })
  }
}
