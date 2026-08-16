import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let settings = await db.settings.findFirst()
    if (!settings) {
      settings = await db.settings.create({ data: {} })
    }
    return NextResponse.json({
      id: settings.id,
      googleApiKey: settings.googleApiKey ? '••••' + settings.googleApiKey.slice(-4) : '',
      googleApiKeySet: !!settings.googleApiKey,
      notionToken: settings.notionToken ? '••••' + settings.notionToken.slice(-4) : '',
      notionTokenSet: !!settings.notionToken,
      notionDatabaseId: settings.notionDatabaseId || '',
      stationName: settings.stationName || '',
      stationFrequency: settings.stationFrequency || '',
      stationGenre: settings.stationGenre || '',
      stationAudience: settings.stationAudience || '',
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    let settings = await db.settings.findFirst()

    if (settings) {
      const updateData: Record<string, string> = {
        stationName: body.stationName ?? settings.stationName,
        stationFrequency: body.stationFrequency ?? settings.stationFrequency,
        stationGenre: body.stationGenre ?? settings.stationGenre,
        stationAudience: body.stationAudience ?? settings.stationAudience,
        notionDatabaseId: body.notionDatabaseId ?? settings.notionDatabaseId,
      }
      if (body.googleApiKey && !body.googleApiKey.startsWith('••••')) {
        updateData.googleApiKey = body.googleApiKey
      }
      if (body.notionToken && !body.notionToken.startsWith('••••')) {
        updateData.notionToken = body.notionToken
      }
      settings = await db.settings.update({
        where: { id: settings.id },
        data: updateData,
      })
    } else {
      settings = await db.settings.create({ data: body })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}