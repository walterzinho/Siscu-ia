import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Fallback a variables de entorno (para Vercel donde SQLite es efímero)
function envSettings() {
  return {
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    notionToken: process.env.NOTION_TOKEN || '',
    notionDatabaseId: process.env.NOTION_DATABASE_ID || '',
    stationName: process.env.STATION_NAME || '',
    stationFrequency: process.env.STATION_FREQUENCY || '',
    stationGenre: process.env.STATION_GENRE || '',
    stationAudience: process.env.STATION_AUDIENCE || '',
  }
}

export async function GET() {
  try {
    let settings = await db.settings.findFirst().catch(() => null)
    const env = envSettings()

    // Mezcla: valores de BD优先, fallback a env vars
    const googleApiKey = settings?.googleApiKey || env.googleApiKey
    const notionToken = settings?.notionToken || env.notionToken
    const notionDatabaseId = settings?.notionDatabaseId || env.notionDatabaseId

    return NextResponse.json({
      id: settings?.id || 'env',
      googleApiKey: googleApiKey ? '••••' + googleApiKey.slice(-4) : '',
      googleApiKeySet: !!googleApiKey,
      googleApiKeyFromEnv: !settings?.googleApiKey && !!env.googleApiKey,
      notionToken: notionToken ? '••••' + notionToken.slice(-4) : '',
      notionTokenSet: !!notionToken,
      notionTokenFromEnv: !settings?.notionToken && !!env.notionToken,
      notionDatabaseId: notionDatabaseId || '',
      notionDatabaseIdFromEnv: !settings?.notionDatabaseId && !!env.notionDatabaseId,
      stationName: settings?.stationName || env.stationName,
      stationFrequency: settings?.stationFrequency || env.stationFrequency,
      stationGenre: settings?.stationGenre || env.stationGenre,
      stationAudience: settings?.stationAudience || env.stationAudience,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    let settings = await db.settings.findFirst().catch(() => null)

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
