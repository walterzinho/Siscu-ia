import { NextResponse } from 'next/server'

// Busca una página accesible en el workspace para usar como padre
async function findFirstPage(token: string): Promise<string | null> {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: '',
      filter: { property: 'object', value: 'page' },
      page_size: 1,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0]?.id || null
}

export async function POST(request: Request) {
  try {
    const { token, parentPageId } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token de Notion requerido' }, { status: 400 })
    }

    // Determinar el page_id padre
    let pageId = parentPageId?.trim() || ''
    if (pageId) {
      const uuidMatch = pageId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      if (uuidMatch) pageId = uuidMatch[0]
    }

    // Si no hay page padre, buscar una página en el workspace
    if (!pageId) {
      pageId = await findFirstPage(token)
      if (!pageId) {
        return NextResponse.json({
          error: 'No se encontró ninguna página en tu workspace. La integración necesita acceso a al menos una página. Comparte una página con la integración en Notion e intenta de nuevo.',
        }, { status: 400 })
      }
    }

    // Crea la base de datos con las columnas que necesita Siscuñia
    const body: any = {
      parent: { page_id: pageId },
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
    return NextResponse.json({
      success: true,
      databaseId: data.id,
      message: `Base de datos creada correctamente`,
      url: data.url,
    })
  } catch {
    return NextResponse.json({ error: 'Error de conexion con Notion' }, { status: 502 })
  }
}
