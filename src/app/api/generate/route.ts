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

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  identificacion: 'Identificación de emisora/programa',
  cortinilla: 'Cortinilla / Separador musical',
  promo: 'Promo de Programación',
  informativo: 'Informativo / Boletín',
  lectura_texto: 'Lectura de Texto',
}

function getDurationLabel(data: Record<string, any>): string {
  if (data.scriptType === 'MICRO_PROGRAMA') {
    return `${data.microDuration || 3} minutos`
  }
  return 'según contenido' // Cuña y Campaña no tienen duración fija, la IA decide
}

function buildPrompt(data: Record<string, any>, settings: Record<string, string>, numVersions: number): string {
  const typeLabel = SCRIPT_TYPE_LABELS[data.scriptType] || data.scriptType
  const durationLabel = getDurationLabel(data)
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
  userPrompt += `- Duración: ${durationLabel}
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
La duración es libre: la IA debe decidir la extensión ideal según el mensaje (típicamente entre 15 y 60 segundos).
`
  } else if (data.scriptType === 'CAMPAIGNA') {
    const count = data.seriesCount || 3
    userPrompt += `
## INSTRUCCIONES ESPECÍFICAS PARA CAMPAÑA COMPLETA
Genera una serie de ${count} cuñas que formen una campaña coherente. Cada cuña debe tener su propia personalidad pero compartir un hilo narrativo y elementos comunes (sintonía, eslogan, frase gancho).
- Estructura progresiva: las primeras cuñas presentan el problema/necesidad, las intermedias desarrollan la solución y beneficios, la última cierra con CTA contundente y oferta.
- Cada cuña funciona de forma independiente pero se perciben como parte de una misma campaña.
- Incluir SFX y música sugeridos en cada cuña.
- En cada cuña, la duración es libre: la IA decide la extensión ideal (típicamente 20-45 segundos cada una).
`
  } else if (data.scriptType === 'LOCUCION_INSTITUCIONAL') {
    const instType = INSTITUTION_TYPE_LABELS[data.institutionType] || 'Locución general'
    userPrompt += `
## INSTRUCCIONES ESPECÍFICAS PARA LOCUCIÓN INSTITUCIONAL
Tipo de locución: ${instType}
`
    if (data.institutionType === 'identificacion') {
      userPrompt += `
El libreto debe ser una identificación de emisora o programa:
1. Frase de apertura con sintonía o frase característica
2. Nombre de la emisora y frecuencia
3. Eslogan o tagline si existe
4. Referencia al programa o horario si aplica
5. Musicalización sugerida (cortina musical breve)
Duración: 5-15 segundos.
`
    } else if (data.institutionType === 'cortinilla') {
      userPrompt += `
El libreto debe ser una cortinilla / separador:
1. Transición musical breve con o sin voz
2. Si lleva voz: frase corta de transición entre segmentos
3. Debe mantener la identidad sonora de la emisora
4. Indicar entrada y salida de música
Duración: 3-10 segundos.
`
    } else if (data.institutionType === 'promo') {
      userPrompt += `
El libreto debe ser un promo de programación:
1. Gancho con lo que viene en el programa
2. Mención del programa, horario y locutor
3. Razones para sintonizar (invitado especial, tema del día, etc.)
4. CTA: "no te lo pierdas" o similar
5. Sugerencias de SFX y musicalización
Duración: 15-30 segundos.
`
    } else if (data.institutionType === 'informativo') {
      userPrompt += `
El libreto debe ser un boletín informativo:
1. Apertura seria con identificación
2. Desarrollo del dato informativo de forma clara y concisa
3. Cierre con referencia a la emisora
4. Tono formal y objetivo
5. Indicaciones de ritmo (pausas entre datos)
Duración: 30-60 segundos según cantidad de información.
`
    } else if (data.institutionType === 'lectura_texto') {
      userPrompt += `
El libreto es para lectura de texto:
1. Texto adaptado para ser leído en voz alta con naturalidad
2. Frases cortas y ritmo de lectura fluido
3. Indicaciones de énfasis, pausas y tono entre paréntesis
4. Evitar palabras difíciles de pronunciar o indicar fonética
5. Tono adecuado al contexto (formal, emotivo, motivacional)
La duración depende de la extensión del texto proporcionado.
`
    } else {
      userPrompt += `
El libreto debe incluir:
1. Identificación clara de la emisora/programa
2. Sintonía o frase característica
3. Información relevante (horario, frecuencia, redes sociales)
4. Tono acorde a la identidad de la emisora
5. Sugerencias de musicalización y SFX
`
    }
  } else if (data.scriptType === 'MICRO_PROGRAMA') {
    const microDur = data.microDuration || 3
    userPrompt += `
## INSTRUCCIONES ESPECÍFICAS PARA MICRO-PROGRAMA
Duración objetivo: ${microDur} minutos.
El libreto debe incluir:
1. Apertura con identificación del micro y sintonía
2. Desarrollo del contenido temático (tips, curiosidades, mensaje editorial, entrevista ficticia)
   - El contenido debe ser suficiente para llenar ${microDur} minutos al aire
   - Incluir transiciones, rifas interactivas o secciones internas si aplica
3. Cierre con despedida, resumen y referencia a la emisora
4. Indicaciones de ritmo y tono para el locutor
5. Sugerencias de musicalización (cortina de entrada, fondo, salida) y SFX
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
        duration: data.scriptType === 'MICRO_PROGRAMA' ? `${data.microDuration || 3} min` : (data.duration || 'auto'),
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