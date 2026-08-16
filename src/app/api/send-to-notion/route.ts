import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const SCRIPT_TYPE_LABELS: Record<string, string> = {
  LOCUCION_INSTITUCIONAL: 'Locución Institucional',
  MICRO_PROGRAMA: 'Micro-programa',
  CAMPAIGNA_INSTITUCIONAL: 'Campaña Institucional',
  CUNA_PROGRAMA_FRANJA: 'Cuña de Programa / Franja',
  INFOMERCIAL: 'Infomercial',
}

export async function POST(request: Request) {
  try {
    const { scriptId, versionIndex, editedContent } = await request.json()

    // Get script from DB
    const script = await db.generatedScript.findUnique({ where: { id: scriptId } })
    if (!script) {
      return NextResponse.json({ error: 'Libreto no encontrado' }, { status: 404 })
    }

    // Get settings for Notion token
    const settings = await db.settings.findFirst()
    if (!settings?.notionToken || !settings?.notionDatabaseId) {
      return NextResponse.json(
        { error: 'Debes configurar el Token de Notion y el ID de la base de datos' },
        { status: 400 }
      )
    }

    // Parse generated content
    const content = JSON.parse(script.generatedContent)
    const version = content.versiones[versionIndex ?? 0] || content.versiones[0]
    const libretoText = editedContent || version?.libreto || ''

    // Build rich text blocks for Notion
    const blocks: object[] = []

    // Title block
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: version?.titulo || content.titulo_sugerido || 'Libreto de Radio' } }],
      },
    })

    // Script type and metadata
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Datos Generales' } }],
      },
    })

    const metadataLines = [
      `Tipo: ${SCRIPT_TYPE_LABELS[script.scriptType] || script.scriptType}`,
      `Cliente: ${script.clientName || 'No especificado'}`,
      `Rubro: ${script.clientBusiness || 'No especificado'}`,
      `Duración: ${script.duration} segundos`,
      `Programa: ${script.programName || 'No especificado'}`,
      `Emisora: ${script.stationName || 'No especificado'}`,
      `Modelo IA: ${script.modelUsed}`,
      `Generado: ${new Date(script.createdAt).toLocaleString('es-CO')}`,
    ]

    for (const line of metadataLines) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: line } }],
        },
      })
    }

    // Divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {},
    })

    // Libreto content
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Libreto' } }],
      },
    })

    // Split libreto into paragraphs
    const paragraphs = libretoText.split('\n').filter((p: string) => p.trim())
    for (const para of paragraphs) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: para.trim() } }],
        },
      })
    }

    // Production notes
    if (version?.observaciones_produccion) {
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {},
      })
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: 'Observaciones de Producción' } }],
        },
      })
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: version.observaciones_produccion } }],
        },
      })
    }

    // Create Notion page
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: settings.notionDatabaseId },
        properties: {
          'Nombre': {
            title: [{
              text: {
                content: `${script.clientName || 'Sin cliente'} - ${SCRIPT_TYPE_LABELS[script.scriptType] || 'Libreto'} - ${version?.titulo || 'v1'}`,
              },
            }],
          },
          'Tipo': {
            select: { name: SCRIPT_TYPE_LABELS[script.scriptType] || 'Otro' },
          },
          'Cliente': {
            rich_text: [{ text: { content: script.clientName || 'N/A' } }],
          },
          'Duración': {
            select: { name: `${script.duration}"` },
          },
          'Estado': {
            status: { name: 'Generado' },
          },
          'Fecha': {
            date: { start: new Date().toISOString().split('T')[0] },
          },
        },
        children: blocks,
      }),
    })

    if (!notionResponse.ok) {
      const err = await notionResponse.text()
      console.error('Notion API error:', err)
      return NextResponse.json(
        { error: `Error de Notion API (${notionResponse.status}): ${err}` },
        { status: 502 }
      )
    }

    const notionPage = await notionResponse.json()

    // Update script record
    await db.generatedScript.update({
      where: { id: scriptId },
      data: {
        sentToNotion: true,
        notionPageId: notionPage.id,
        notionSentAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      notionPageId: notionPage.id,
      notionUrl: notionPage.url,
    })
  } catch (error) {
    console.error('Error sending to Notion:', error)
    return NextResponse.json(
      { error: 'Error interno al enviar a Notion' },
      { status: 500 }
    )
  }
}