import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const SCRIPT_TYPE_LABELS: Record<string, string> = {
  LOCUCION_INSTITUCIONAL: 'Locución Institucional',
  MICRO_PROGRAMA: 'Micro-programa',
  CAMPAIGNA_INSTITUCIONAL: 'Campaña Institucional',
  CUNA_PROGRAMA_FRANJA: 'Cuña de Programa / Franja Musical',
  INFOMERCIAL: 'Infomercial',
}

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  identificacion: 'Identificación de emisora/programa',
  cortinilla: 'Cortinilla / Separador musical',
  promo: 'Promo de Programación',
  informativo: 'Informativo / Boletín',
  lectura_texto: 'Lectura de Texto',
}

const CAMPAIGN_INST_LABELS: Record<string, string> = {
  ecologica: 'Ecológica',
  ciudadana: 'Comportamiento Ciudadano',
  ayuda_social: 'Ayuda Social',
  salud: 'Salud Pública',
  educativa: 'Educativa',
  seguridad_vial: 'Seguridad Vial',
}

const PROGRAM_FRANJA_LABELS: Record<string, string> = {
  programa: 'Programa de radio',
  franja_musical: 'Franja Musical',
  horario_destacado: 'Horario Destacado',
}

function getDurationLabel(data: Record<string, any>): string {
  if (data.scriptType === 'MICRO_PROGRAMA') return `${data.microDuration || 3} minutos`
  if (data.scriptType === 'INFOMERCIAL') return `${data.infomercialDuration || 5} minutos`
  return 'según contenido'
}

function buildPrompt(data: Record<string, any>, settings: Record<string, string>, numVersions: number): string {
  const typeLabel = SCRIPT_TYPE_LABELS[data.scriptType] || data.scriptType
  const durationLabel = getDurationLabel(data)
  const stationName = data.stationName || settings.stationName || 'la emisora'
  const stationFreq = data.stationFrequency || settings.stationFrequency || ''
  const stationGenre = data.stationGenre || settings.stationGenre || ''
  const stationAudience = data.stationAudience || settings.stationAudience || ''

  const systemPrompt = `Eres un experto creador de libretos para radio con más de 20 años de experiencia en producción de audio para emisoras. Dominas la escritura de cuñas, campañas institucionales, locuciones, promociones de programas, infomerciales y micro-programas. Conoces técnicas de copywriting para audio: ganchos auditivos, ritmo de lectura, pausas dramáticas, efectos de sonido sugeridos y llamados a la acción efectivos. Generas contenido en español.`

  let userPrompt = `Genera ${numVersions} ${numVersions === 1 ? 'versión' : 'versiones'} de un libreto de radio tipo "${typeLabel}" con las siguientes especificaciones:\n\n`

  // --- FORMATO COMERCIAL DEL CLIENTE ---
  if (data.clientFormat) {
    const formatLabels: Record<string, string> = { cuna: 'Cuña', campaña: 'Campaña', infomercial: 'Infomercial' }
    const formatLabel = formatLabels[data.clientFormat] || data.clientFormat
    userPrompt += `## FORMATO COMERCIAL\n- Formato: ${formatLabel}\n`
    if (data.clientFormat === 'campaña' && data.campaignProductCount) {
      userPrompt += `- Cantidad de productos/servicios en la campaña: ${data.campaignProductCount}\n`
      userPrompt += `IMPORTANTE: Genera ${data.campaignProductCount} cuñas individuales, cada una enfocada en un producto/servicio diferente del cliente. Cada versión del libreto debe incluir las ${data.campaignProductCount} cuñas claramente separadas y numeradas.\n`
    }
    if (data.clientFormat === 'cuna') {
      userPrompt += `La cuña debe ser concisa, directa y de impacto rápido. Duración típica: 20-40 segundos.\n`
    }
    userPrompt += '\n'
  }

  // --- DATOS DEL CLIENTE (si aplica) ---
  const hasClientData = data.clientName || data.clientBusiness || data.productName
  if (hasClientData) {
    userPrompt += `## DATOS DEL CLIENTE\n`
    if (data.clientName) userPrompt += `- Nombre/Razón social: ${data.clientName}\n`
    if (data.clientBusiness) userPrompt += `- Rubro/Industria: ${data.clientBusiness}\n`
    if (data.clientCategory) {
      const catLabel = data.clientCategory === 'producto' ? 'Producto(s)' : 'Servicio(s)'
      userPrompt += `- Tipo de oferta: ${catLabel}\n`
      if (data.productName) userPrompt += `- ${catLabel}: ${data.productName}\n`
    }
    if (data.clientTone) userPrompt += `- Tono de marca: ${data.clientTone}\n`
    if (data.clientKeywords) userPrompt += `- Palabras clave: ${data.clientKeywords}\n`

    const contactData: string[] = []
    if (data.clientAddress) contactData.push(`Dirección: ${data.clientAddress}`)
    if (data.clientPhone) contactData.push(`Teléfono: ${data.clientPhone}`)
    if (data.clientWhatsapp) contactData.push(`WhatsApp: ${data.clientWhatsapp}`)
    if (data.clientEmail) contactData.push(`Correo: ${data.clientEmail}`)
    if (data.clientWebsite) contactData.push(`Web: ${data.clientWebsite}`)
    if (data.clientSocialMedia) contactData.push(`Redes: ${data.clientSocialMedia}`)
    if (contactData.length > 0) {
      userPrompt += `\n## DATOS DE CONTACTO DEL CLIENTE\n`
      userPrompt += contactData.map(c => `- ${c}`).join('\n') + '\n'
      userPrompt += `IMPORTANTE: Incorpora los datos de contacto de forma natural en el libreto (dirección para \"visítanos\", WhatsApp para \"escríbenos al\", redes para \"síguenos en\"). No los enumeres todos; elige los más relevantes.\n`
    }
  }

  // --- DATOS DE LA EMISORA ---
  userPrompt += `\n## DATOS DE LA EMISORA / PROGRAMA\n`
  userPrompt += `- Emisora: ${stationName}${stationFreq ? ` (${stationFreq})` : ''}\n`
  if (stationGenre) userPrompt += `- Género musical: ${stationGenre}\n`
  if (stationAudience) userPrompt += `- Audiencia objetivo: ${stationAudience}\n`
  if (data.programName) userPrompt += `- Programa: ${data.programName}\n`
  if (data.scheduleTime) userPrompt += `- Horario: ${data.scheduleTime}\n`

  // --- ESPECIFICACIONES DE AUDIO ---
  userPrompt += `\n## ESPECIFICACIONES DE AUDIO\n`
  userPrompt += `- Duración: ${durationLabel}\n`
  if (data.voiceType) userPrompt += `- Tipo de voz: ${data.voiceType}\n`
  if (data.voiceTone) userPrompt += `- Tono del locutor: ${data.voiceTone}\n`
  if (data.musicStyle) userPrompt += `- Estilo musical de fondo: ${data.musicStyle}\n`

  // --- OBJETIVO Y MENSAJE ---
  userPrompt += `\n## OBJETIVO Y MENSAJE\n`
  if (data.objective) userPrompt += `- Objetivo: ${data.objective}\n`
  if (data.coreMessage) userPrompt += `- Mensaje central: ${data.coreMessage}\n`
  if (data.ctaText) userPrompt += `- Llamado a la acción (CTA): ${data.ctaText}\n`
  if (data.promotionText) userPrompt += `- Dato adicional / Promoción: ${data.promotionText}\n`

  // === INSTRUCCIONES POR TIPO ===
  if (data.scriptType === 'LOCUCION_INSTITUCIONAL') {
    const instType = INSTITUTION_TYPE_LABELS[data.institutionType] || 'Locución general'
    userPrompt += `\n## INSTRUCCIONES PARA LOCUCIÓN INSTITUCIONAL\nTipo: ${instType}\n`
    if (data.institutionType === 'identificacion') {
      userPrompt += `1. Frase de apertura con sintonía o frase característica\n2. Nombre de la emisora y frecuencia\n3. Eslogan o tagline si existe\n4. Referencia al programa o horario si aplica\n5. Musicalización sugerida (cortina musical breve)\nDuración: 5-15 segundos.\n`
    } else if (data.institutionType === 'cortinilla') {
      userPrompt += `1. Transición musical breve con o sin voz\n2. Si lleva voz: frase corta de transición entre segmentos\n3. Identidad sonora de la emisora\n4. Indicar entrada y salida de música\nDuración: 3-10 segundos.\n`
    } else if (data.institutionType === 'promo') {
      userPrompt += `1. Gancho con lo que viene en el programa\n2. Mención del programa, horario y locutor\n3. Razones para sintonizar\n4. CTA: \"no te lo pierdas\" o similar\n5. SFX y musicalización\nDuración: 15-30 segundos.\n`
    } else if (data.institutionType === 'informativo') {
      userPrompt += `1. Apertura seria con identificación\n2. Desarrollo del dato informativo claro y conciso\n3. Cierre con referencia a la emisora\n4. Tono formal y objetivo\n5. Indicaciones de ritmo (pausas entre datos)\nDuración: 30-60 segundos.\n`
    } else if (data.institutionType === 'lectura_texto') {
      userPrompt += `1. Texto adaptado para lectura en voz alta con naturalidad\n2. Frases cortas y ritmo fluido\n3. Indicaciones de énfasis, pausas y tono entre paréntesis\n4. Evitar palabras difíciles de pronunciar\n5. Tono adecuado al contexto\nLa duración depende del texto.\n`
    } else {
      userPrompt += `1. Identificación clara de la emisora/programa\n2. Sintonía o frase característica\n3. Información relevante\n4. Tono acorde a la identidad\n5. Sugerencias de musicalización y SFX\n`
    }

  } else if (data.scriptType === 'MICRO_PROGRAMA') {
    const microDur = data.microDuration || 3
    userPrompt += `\n## INSTRUCCIONES PARA MICRO-PROGRAMA\nDuración objetivo: ${microDur} minutos.\n1. Apertura con identificación del micro y sintonía\n2. Desarrollo del contenido temático (tips, curiosidades, mensaje editorial, entrevista ficticia)\n   - El contenido debe ser suficiente para llenar ${microDur} minutos al aire\n   - Incluir transiciones o secciones internas si aplica\n3. Cierre con despedida, resumen y referencia a la emisora\n4. Indicaciones de ritmo y tono para el locutor\n5. Sugerencias de musicalización (cortina de entrada, fondo, salida) y SFX\n`

  } else if (data.scriptType === 'CAMPAIGNA_INSTITUCIONAL') {
    const campType = CAMPAIGN_INST_LABELS[data.campaignInstitutionalType] || 'Institucional'
    userPrompt += `\n## INSTRUCCIONES PARA CAMPAÑA INSTITUCIONAL\nTipo de campaña: ${campType}\n`
    if (data.campaignTopic) userPrompt += `Tema específico: ${data.campaignTopic}\n`
    userPrompt += `1. Genera un libreto completo (no una serie) que funcione como pieza autónoma de la campaña\n2. Debe transmitir un mensaje institucional alineado con el tipo de campaña\n3. Tono apropiado: serio si es seguridad/salud, cálido si es ayuda social, inspirador si es ecológica\n4. Puede incluir datos estadísticos, preguntas retóricas o frases de impacto\n5. Cierre con identificación de la emisora como aliada de la causa\n6. SFX y musicalización sugeridos\nDuración: libre según el mensaje (típicamente 30-60 segundos).\n`

  } else if (data.scriptType === 'CUNA_PROGRAMA_FRANJA') {
    const pfType = PROGRAM_FRANJA_LABELS[data.programFranjaType] || 'Programa o Franja'
    userPrompt += `\n## INSTRUCCIONES PARA CUÑA DE PROGRAMA / FRANJA MUSICAL\nTipo: ${pfType}\n`
    if (data.programFranjaType === 'franja_musical') {
      userPrompt += `1. Identificación de la franja musical (nombre, horario)\n2. Descripción del género o estilo musical que se escucha\n3. Referencia a la emisora\n4. Ambiente sonoro sugerido (tipo de música de fondo que se usa en la franja)\n5. Tono relajado o enérgico según el género\nDuración: 15-30 segundos.\n`
    } else {
      userPrompt += `1. Gancho atractivo que invite a sintonizar\n2. Mención del programa, horario y locutor(es)\n3. Tema del día o invitado especial si aplica\n4. Razones para escuchar (dinámica, premios, contenido exclusivo)\n5. CTA claro: \"sintoniza\", \"no te lo pierdas\"\n6. SFX y musicalización sugeridos\nDuración: 20-45 segundos.\n`
    }

  } else if (data.scriptType === 'INFOMERCIAL') {
    const infoDur = data.infomercialDuration || 5
    userPrompt += `\n## INSTRUCCIONES PARA INFOMERCIAL\nDuración objetivo: ${infoDur} minutos.\nEl infomercial es un contenido largo de lectura que presenta en detalle un producto o servicio del cliente.\n1. Apertura: gancho que capte la atención con un problema o necesidad del público\n2. Desarrollo del tema: presentación detallada del producto/servicio con beneficios, características, diferenciadores\n   - El contenido debe ser suficiente para ${infoDur} minutos al aire\n   - Usar lenguaje coloquial y cercano, como si el locutor estuviera conversando con el escucha\n   - Incluir ejemplos, analogías o casos de uso\n3. Incorporar datos de contacto del cliente de forma natural a lo largo del texto\n4. Cierre contundente con CTA y recapitulación del beneficio principal\n5. Sugerencias de musicalización de fondo (suave, no intrusiva) y SFX puntuales\n6. Indicaciones detalladas de tono, ritmo, pausas y énfasis entre paréntesis\n`
  }

  userPrompt += "\n## FORMATO DE SALIDA\nResponde UNICAMENTE en formato JSON valido (sin markdown) con esta estructura exacta:\n{\n  \"titulo_sugerido\": \"titulo del libreto\",\n  \"versiones\": [\n    {\n      \"version\": 1,\n      \"titulo\": \"titulo de esta version\",\n      \"libreto\": \"el texto completo del libreto con indicaciones de [SFX], (pausas) y musicalizacion\",\n      \"duracion_estimada_segundos\": 30,\n      \"observaciones_produccion\": \"notas para el productor de audio\"\n    }\n  ]\n}\n"

  return { systemPrompt, userPrompt }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { numVersions = 2, model = 'gemini-3.6-flash' } = data

    // Leer settings de BD o fallback a env vars (para Vercel)
    let settings = await db.settings.findFirst().catch(() => null)
    const apiKey = settings?.googleApiKey || process.env.GOOGLE_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'Debes configurar la API Key de Google AI Studio primero' }, { status: 400 })
    }
    const mergedSettings = {
      stationName: settings?.stationName || process.env.STATION_NAME || '',
      stationFrequency: settings?.stationFrequency || process.env.STATION_FREQUENCY || '',
      stationGenre: settings?.stationGenre || process.env.STATION_GENRE || '',
      stationAudience: settings?.stationAudience || process.env.STATION_AUDIENCE || '',
    }

    const { systemPrompt, userPrompt } = buildPrompt(data, mergedSettings, numVersions)

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.8, topP: 0.95, topK: 40, maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return NextResponse.json({ error: `Error de Google AI Studio (${response.status}): ${err}` }, { status: 502 })
    }

    const result = await response.json()
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent) {
      return NextResponse.json({ error: 'La IA no generó contenido. Intenta de nuevo.' }, { status: 502 })
    }

    let parsed
    try {
      const cleaned = textContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        titulo_sugerido: `Libreto ${SCRIPT_TYPE_LABELS[data.scriptType] || 'Radio'}`,
        versiones: [{ version: 1, titulo: 'Versión 1', libreto: textContent, duracion_estimada_segundos: 30, observaciones_produccion: '' }],
      }
    }

    const script = await db.generatedScript.create({
      data: {
        scriptType: data.scriptType, clientName: data.clientName || '', clientBusiness: data.clientBusiness || '',
        clientTone: data.clientTone || '', clientKeywords: data.clientKeywords || '',
        stationName: data.stationName || mergedSettings.stationName || '', stationFrequency: data.stationFrequency || mergedSettings.stationFrequency || '',
        stationGenre: data.stationGenre || mergedSettings.stationGenre || '', stationAudience: data.stationAudience || mergedSettings.stationAudience || '',
        programName: data.programName || '', scheduleTime: data.scheduleTime || '',
        duration: getDurationLabel(data), voiceType: data.voiceType || '', voiceTone: data.voiceTone || '',
        musicStyle: data.musicStyle || '', objective: data.objective || '', coreMessage: data.coreMessage || '',
        ctaText: data.ctaText || '', promotionText: data.promotionText || '',
        generatedContent: JSON.stringify(parsed), modelUsed: model,
      },
    })

    return NextResponse.json({
      success: true,
      script: { id: script.id, ...parsed, scriptType: data.scriptType, clientName: data.clientName, createdAt: script.createdAt },
    })
  } catch (error) {
    console.error('Error generating script:', error)
    return NextResponse.json({ error: 'Error interno al generar el libreto' }, { status: 500 })
  }
}
