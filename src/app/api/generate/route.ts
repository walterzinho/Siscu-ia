import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const SCRIPT_TYPE_LABELS: Record<string, string> = {
  CUNA_COMERCIAL: 'Cuña Comercial',
  CAMPAIGNA: 'Campaña Completa',
  LOCUCION_INSTITUCIONAL: 'Locución Institucional',
  MICRO_PROGRAMA: 'Micro-programa',
}

const DURATION_LABELS: Record<string, string> = {
  '15': '15 segundos',
  '30': '30 segundos',
  '60': '60 segundos',
  '120': '2 minutos',
  '180': '3 minutos',
}

function buildPrompt(data: Record<string, string>, settings: Record<string, string>, numVersions: number): string {
  const typeLabel = SCRIPT_TYPE_LABELS[data.scriptType] || data.scriptType
  const durationLabel = DURATION_LABELS[data.duration] || `${data.duration} segundos`
  const stationName = data.stationName || settings.stationName || 'la emisora'
  const stationFreq = data.stationFrequency || settings.stationFrequency || ''
  const stationGenre = data.stationGenre || settings.stationGenre || ''
  const stationAudience = data.stationAudience || settings.stationAudience || ''

  const systemPrompt = `Eres un experto creador de libretos para radio con más de 20 años de experiencia en producción de audio para emisoras. Dominas la escritura de cuñas comerciales, campañas publicitarias, locuciones institucionales y micro-programas de radio. Conoces las técnicas de copywriting para audio: ganchos auditivos, ritmo de lectura, pausas dramáticas, efectos de sonido sugeridos y llamados a la acción efectivos. Generas contenido en español.`

  let userPrompt = `Genera ${numVersions} ${numVersions === 1 ? 'versión' : 'versiones'} de un libreto de radio tipo "${typeLabel}" con las siguientes especificaciones:

`
  userPrompt += `## DATOS DEL CLIENTE
`
  userPrompt += `- Nombre/Razón social: ${data.clientName || 'No especificado'}
`
  userPrompt += `- Rubro/Industria: ${data.clientBusiness || 'No especificado'}
`
  userPrompt += `- Tono de marca: ${data.clientTone || 'Profesional y cercano'}
`
  userPrompt += `- Palabras clave: ${data.clientKeywords || 'No especificadas'}
`

  userPrompt += `
## DATOS DE LA EMISORA / PROGRAMA
`
  userPrompt += `- Emisora: ${stationName}${stationFreq ? ` (${stationFreq})` : ''}
`
  userPrompt += `- Género musical: ${stationGenre || 'No especificado'}
`
  userPrompt += `- Audiencia objetivo: ${stationAudience || 'General'}
`
  userPrompt += `- Programa: ${data.programName || 'Cualquier programa'}
`
  userPrompt += `- Horario: ${data.scheduleTime || 'Cualquier horario'}
`

  userPrompt += `
## ESPECIFICACIONES DE AUDIO
`
  userPrompt += `- Duración aproximada: ${durationLabel}
`
  userPrompt += `- Tipo de voz: ${data.voiceType || 'No especificado'}
`
  userPrompt += `- Tono del locutor: ${data.voiceTone || 'Profesional'}
`
  userPrompt += `- Estilo musical de fondo: ${data.musicStyle || 'Sin música / Lo que mejor se adapte'}
`

  userPrompt += `
## OBJETIVO Y MENSAJE
`
  userPrompt += `- Objetivo: ${data.objective || 'Generar recordación de marca'}
`
  userPrompt += `- Mensaje central: ${data.coreMessage || 'No especificado'}
`
  if (data.ctaText) userPrompt += `- Llamado a la acción (CTA): ${data.ctaText}
`
  if (data.promotionText) userPrompt += `- Oferta/Promoción: ${data.promotionText}
`

  // Type-specific instructions
  if (data.scriptType === 'CUNA_COMERCIAL') {
    userPrompt += `
## INSTRUCCIONES ESPECÍFICAS PARA CUÑA COMERCIAL
El libreto debe incluir:
1. Gancho auditivo de apertura (primeros 3 segundos)
2. Desarrollo del mensaje con beneficios clave
3. Mención de la marca al menos 2 veces
4. CTA claro y memorable
5. Sugerencias de efectos de sonido (SFX) y música entre corchetes [SFX: ...]
6. Indicaciones de tono y ritmo para el locutor entre paréntesis (ej: (pausa), (con énfasis))
7. Cierre con identificación de la emisora
`
  } else if (data.scriptType === 'CAMPAIGNA') {
    userPrompt += `
## INSTRUCCIONES ESPECÍFICAS PARA CAMPAÑA COMPLETA
Genera una serie de 3 cuñas que formen una campaña coherente:
1. Cuña 1: Presentación del problema/necesidad (gancho)
2. Cuña 2: Solución y beneficios de la marca
3. Cuña 3: Cierre contundente con CTA y oferta
Cada cuña debe funcionar de forma independiente pero mantener un hilo narrativo común.
Incluir SFX y música sugeridos.
`
  } else if (data.scriptType === 'LOCUCION_INSTITUCIONAL') {
    userPrompt += `
## INSTRUCCIONES ESPECÍFICAS PARA LOCUCIÓN INSTITUCIONAL
El libreto debe incluir:
1. Identificación clara de la emisora/programa
2. Sintonía o frase característica
3. Información relevante (horario, frecuencia, redes sociales)
4. Tono acorde a la identidad de la emisora
5. Sugerencias de musicalización y SFX
`
  } else if (data.scriptType === 'MICRO_PROGRAMA') {
    userPrompt += `
## INSTRUCCIONES ESPECÍFICAS PARA MICRO-PROGRAMA
El libreto debe incluir:
1. Apertura con identificación del micro
2. Desarrollo del contenido temático (tips, curiosidades, mensaje editorial)
3. Cierre con despedida y referencia a la emisora
4. Indicaciones de ritmo y tono para el locutor
5. Sugerencias de musicalización y SFX
`
  }

  userPrompt += `
## FORMATO DE SALIDA
Responde ÚNICAMENTE en formato JSON válido (sin markdown, sin \`\`\`json) con esta estructura exacta:
{
  "titulo_sugerido": "título del libreto",
  "versiones": [
    {
      "version": 1,
      "titulo": "título de esta versión",
      "libreto": "el texto completo del libreto con indicaciones de [SFX], (pausas) y musicalización",
      "duracion_estimada_segundos": 30,
      "observaciones_produccion": "notas para el productor de audio"
    }
  ]
}
`

  return { systemPrompt, userPrompt }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { numVersions = 2, model = 'gemini-2.5-pro' } = data

    // Get settings for API key and default station data
    const settings = await db.settings.findFirst()
    if (!settings?.googleApiKey) {
      return NextResponse.json(
        { error: 'Debes configurar la API Key de Google AI Studio primero' },
        { status: 400 }
      )
    }

    const { systemPrompt, userPrompt } = buildPrompt(data, settings, numVersions)

    // Call Google AI Studio (Gemini API)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.googleApiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return NextResponse.json(
        { error: `Error de Google AI Studio (${response.status}): ${err}` },
        { status: 502 }
      )
    }

    const result = await response.json()
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent) {
      return NextResponse.json(
        { error: 'La IA no generó contenido. Intenta de nuevo.' },
        { status: 502 }
      )
    }

    // Parse the JSON response
    let parsed
    try {
      // Clean potential markdown wrapping
      const cleaned = textContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // If JSON parsing fails, wrap raw text as single version
      parsed = {
        titulo_sugerido: `Libreto ${SCRIPT_TYPE_LABELS[data.scriptType] || 'Radio'}`,
        versiones: [{
          version: 1,
          titulo: 'Versión 1',
          libreto: textContent,
          duracion_estimada_segundos: parseInt(data.duration) || 30,
          observaciones_produccion: '',
        }],
      }
    }

    // Save to database
    const script = await db.generatedScript.create({
      data: {
        scriptType: data.scriptType,
        clientName: data.clientName || '',
        clientBusiness: data.clientBusiness || '',
        clientTone: data.clientTone || '',
        clientKeywords: data.clientKeywords || '',
        stationName: data.stationName || settings.stationName || '',
        stationFrequency: data.stationFrequency || settings.stationFrequency || '',
        stationGenre: data.stationGenre || settings.stationGenre || '',
        stationAudience: data.stationAudience || settings.stationAudience || '',
        programName: data.programName || '',
        scheduleTime: data.scheduleTime || '',
        duration: data.duration || '30',
        voiceType: data.voiceType || '',
        voiceTone: data.voiceTone || '',
        musicStyle: data.musicStyle || '',
        objective: data.objective || '',
        coreMessage: data.coreMessage || '',
        ctaText: data.ctaText || '',
        promotionText: data.promotionText || '',
        generatedContent: JSON.stringify(parsed),
        modelUsed: model,
      },
    })

    return NextResponse.json({
      success: true,
      script: {
        id: script.id,
        ...parsed,
        scriptType: data.scriptType,
        clientName: data.clientName,
        createdAt: script.createdAt,
      },
    })
  } catch (error) {
    console.error('Error generating script:', error)
    return NextResponse.json(
      { error: 'Error interno al generar el libreto' },
      { status: 500 }
    )
  }
}