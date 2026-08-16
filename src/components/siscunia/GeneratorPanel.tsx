'use client'

import { useState } from 'react'
import { useSiscuniaStore, ScriptType } from '@/store/siscunia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sparkles, Send, Copy, Pencil, Check, Loader2,
  Radio, User, Mic, Target, FileText
} from 'lucide-react'
import { toast } from 'sonner'

const SCRIPT_TYPES: { value: ScriptType; label: string; desc: string }[] = [
  { value: 'CUNA_COMERCIAL', label: 'Cuña Comercial', desc: 'Spot publicitario de 15" a 60"' },
  { value: 'CAMPAIGNA', label: 'Campaña Completa', desc: 'Serie de 3 cuñas con hilo narrativo' },
  { value: 'LOCUCION_INSTITUCIONAL', label: 'Locución Institucional', desc: 'Identificaciones, cortinillas, promos' },
  { value: 'MICRO_PROGRAMA', label: 'Micro-programa', desc: 'Contenido de 1-3 minutos' },
]

export function GeneratorPanel() {
  const {
    formData, setFormData, resetForm,
    isGenerating, setIsGenerating,
    generatedResult, setGeneratedResult,
    settings, activeTab, setActiveTab,
  } = useSiscuniaStore()

  const [sendingToNotion, setSendingToNotion] = useState<string | null>(null)
  const [editingVersion, setEditingVersion] = useState<number | null>(null)
  const [editedText, setEditedText] = useState('')
  const [lastNotionUrl, setLastNotionUrl] = useState('')

  const handleGenerate = async () => {
    if (!settings?.googleApiKeySet) {
      toast.error('Configura tu API Key de Google AI Studio primero')
      setActiveTab('config')
      return
    }

    setIsGenerating(true)
    setGeneratedResult(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (data.success) {
        setGeneratedResult(data.script)
        toast.success('Libreto generado exitosamente')
      } else {
        toast.error(data.error || 'Error al generar')
      }
    } catch {
      toast.error('Error de conexión con el servidor')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendToNotion = async (versionIndex: number) => {
    if (!generatedResult?.id) return
    if (!settings?.notionTokenSet || !settings?.notionDatabaseId) {
      toast.error('Configura el Token de Notion y el ID de la base de datos primero')
      setActiveTab('config')
      return
    }

    setSendingToNotion(String(versionIndex))
    try {
      const contentToSend = editingVersion === versionIndex ? editedText : undefined
      const res = await fetch('/api/send-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: generatedResult.id,
          versionIndex,
          editedContent: contentToSend,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Enviado a Notion correctamente')
        setLastNotionUrl(data.notionUrl)
      } else {
        toast.error(data.error || 'Error al enviar a Notion')
      }
    } catch {
      toast.error('Error de conexión con Notion')
    } finally {
      setSendingToNotion(null)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  const startEditing = (idx: number, text: string) => {
    setEditingVersion(idx)
    setEditedText(text)
  }

  const saveEditing = () => {
    if (generatedResult?.versiones && editingVersion !== null) {
      const updated = { ...generatedResult }
      updated.versiones = [...updated.versiones]
      updated.versiones[editingVersion] = {
        ...updated.versiones[editingVersion],
        libreto: editedText,
      }
      setGeneratedResult(updated)
    }
    setEditingVersion(null)
    toast.success('Versión actualizada')
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generar Nuevo Libretos
              </CardTitle>
              <CardDescription className="mt-1">
                Completa los datos para que la IA genere el libreto ideal para tu emisora
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Limpiar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generar</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cliente" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="tipo" className="text-xs sm:text-sm">Tipo</TabsTrigger>
              <TabsTrigger value="cliente" className="text-xs sm:text-sm">Cliente</TabsTrigger>
              <TabsTrigger value="emisora" className="text-xs sm:text-sm">Emisora</TabsTrigger>
              <TabsTrigger value="produccion" className="text-xs sm:text-sm">Producción</TabsTrigger>
            </TabsList>

            {/* Tab: Tipo de Libreto */}
            <TabsContent value="tipo" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCRIPT_TYPES.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setFormData({ scriptType: st.value })}
                    className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      formData.scriptType === st.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="font-medium">{st.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{st.desc}</div>
                  </button>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Modelo de IA</Label>
                  <Select value={formData.model} onValueChange={(v) => setFormData({ model: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-3.6-flash">Gemini 3.6 Flash (Recomendado)</SelectItem>
                      <SelectItem value="gemini-3.7-flash">Gemini 3.7 Flash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Versiones a Generar</Label>
                  <Select value={String(formData.numVersions)} onValueChange={(v) => setFormData({ numVersions: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 versión</SelectItem>
                      <SelectItem value="2">2 versiones</SelectItem>
                      <SelectItem value="3">3 versiones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duración</Label>
                  <Select value={formData.duration} onValueChange={(v) => setFormData({ duration: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 segundos</SelectItem>
                      <SelectItem value="30">30 segundos</SelectItem>
                      <SelectItem value="60">60 segundos</SelectItem>
                      <SelectItem value="120">2 minutos</SelectItem>
                      <SelectItem value="180">3 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Cliente */}
            <TabsContent value="cliente" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Nombre del Cliente</Label>
                  <Input
                    placeholder="Ej: Restaurantes El Sabor"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rubro / Industria</Label>
                  <Input
                    placeholder="Ej: Gastronomía, Salud, Tecnología"
                    value={formData.clientBusiness}
                    onChange={(e) => setFormData({ clientBusiness: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tono de Marca</Label>
                  <Select value={formData.clientTone} onValueChange={(v) => setFormData({ clientTone: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="cercano">Cercano / Amigable</SelectItem>
                      <SelectItem value="joven">Joven / Casual</SelectItem>
                      <SelectItem value="lujoso">Premium / Lujo</SelectItem>
                      <SelectItem value="divertido">Divertido / Humorístico</SelectItem>
                      <SelectItem value="emocional">Emocional / Inspirador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Palabras Clave</Label>
                  <Input
                    placeholder="Ej: frescura, tradición, confianza, innovación"
                    value={formData.clientKeywords}
                    onChange={(e) => setFormData({ clientKeywords: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Objetivo de la Pieza</Label>
                  <Select value={formData.objective} onValueChange={(v) => setFormData({ objective: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venta">Generar Ventas</SelectItem>
                      <SelectItem value="informacion">Informar / Comunicar</SelectItem>
                      <SelectItem value="imagen">Posicionar Imagen / Marca</SelectItem>
                      <SelectItem value="entretenimiento">Entretenimiento</SelectItem>
                      <SelectItem value="recordacion">Generar Recordación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mensaje Central</Label>
                  <Textarea
                    placeholder="¿Cuál es el mensaje principal que debe quedar en la mente del escucha?"
                    value={formData.coreMessage}
                    onChange={(e) => setFormData({ coreMessage: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Llamado a la Acción (CTA)</Label>
                    <Input
                      placeholder="Ej: Visítanos en Av. Principal #123"
                      value={formData.ctaText}
                      onChange={(e) => setFormData({ ctaText: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Oferta / Promoción</Label>
                    <Input
                      placeholder="Ej: 20% de descuento este fin de semana"
                      value={formData.promotionText}
                      onChange={(e) => setFormData({ promotionText: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Emisora */}
            <TabsContent value="emisora" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Estos campos sobreescriben los datos predeterminados de la emisora configurados en &quot;Configuración&quot;.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Radio className="h-3.5 w-3.5" /> Nombre Emisora</Label>
                  <Input
                    placeholder={settings?.stationName || 'Ej: Radio Siscuñia FM'}
                    value={formData.stationName}
                    onChange={(e) => setFormData({ stationName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Input
                    placeholder={settings?.stationFrequency || 'Ej: 102.5 FM'}
                    value={formData.stationFrequency}
                    onChange={(e) => setFormData({ stationFrequency: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre del Programa</Label>
                  <Input
                    placeholder="Ej: Mañanas Activas"
                    value={formData.programName}
                    onChange={(e) => setFormData({ programName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horario</Label>
                  <Input
                    placeholder="Ej: Lunes a Viernes 6:00 AM"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ scheduleTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Género Musical</Label>
                  <Input
                    placeholder={settings?.stationGenre || 'Ej: Pop Latino, Regional'}
                    value={formData.stationGenre}
                    onChange={(e) => setFormData({ stationGenre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audiencia</Label>
                  <Input
                    placeholder={settings?.stationAudience || 'Ej: Mujeres 25-45 años'}
                    value={formData.stationAudience}
                    onChange={(e) => setFormData({ stationAudience: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Producción */}
            <TabsContent value="produccion" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> Tipo de Voz</Label>
                  <Select value={formData.voiceType} onValueChange={(v) => setFormData({ voiceType: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculina">Masculina</SelectItem>
                      <SelectItem value="femenina">Femenina</SelectItem>
                      <SelectItem value="doble">Doble (Masculina + Femenina)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tono del Locutor</Label>
                  <Select value={formData.voiceTone} onValueChange={(v) => setFormData({ voiceTone: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal / Institucional</SelectItem>
                      <SelectItem value="coloquial">Coloquial / Conversacional</SelectItem>
                      <SelectItem value="joven">Joven / Dinámico</SelectItem>
                      <SelectItem value="entusiasta">Entusiasta / Enérgico</SelectItem>
                      <SelectItem value="suave">Suave / Relajado</SelectItem>
                      <SelectItem value="autoritario">Autoritario / Seguro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Estilo Musical de Fondo</Label>
                  <Input
                    placeholder="Ej: Pop alegre, Instrumental corporativo, Sin música"
                    value={formData.musicStyle}
                    onChange={(e) => setFormData({ musicStyle: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {generatedResult?.versiones && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {generatedResult.titulo_sugerido || 'Resultado Generado'}
            </h2>
            <div className="flex items-center gap-2">
              {generatedResult.scriptType && (
                <Badge variant="outline">{generatedResult.scriptType}</Badge>
              )}
              {generatedResult.clientName && (
                <Badge variant="secondary">{generatedResult.clientName}</Badge>
              )}
            </div>
          </div>

          {generatedResult.versiones.map((version, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">{version.titulo}</CardTitle>
                    <CardDescription>
                      Versión {version.version} · ~{version.duracion_estimada_segundos}s estimados
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(
                        editingVersion === idx ? editedText : version.libreto
                      )}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copiar
                    </Button>
                    {editingVersion === idx ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveEditing}
                      >
                        <Check className="h-4 w-4 mr-1" /> Guardar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(idx, version.libreto)}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={sendingToNotion === String(idx)}
                      onClick={() => handleSendToNotion(idx)}
                    >
                      {sendingToNotion === String(idx) ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-1" /> Enviar a Notion</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingVersion === idx ? (
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                ) : (
                  <ScrollArea className="max-h-96">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {version.libreto}
                    </pre>
                  </ScrollArea>
                )}
                {version.observaciones_produccion && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Observaciones de Producción
                    </p>
                    <p className="text-sm">{version.observaciones_produccion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {lastNotionUrl && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                Último envío exitoso:{' '}
                <a href={lastNotionUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  Ver en Notion
                </a>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isGenerating && !generatedResult && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Generando libretos con IA...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Esto puede tardar unos segundos dependiendo del modelo y la cantidad de versiones.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
