'use client'

import { useState } from 'react'
import {
  useSiscuniaStore,
  SCRIPT_TYPE_META,
  GeneratedResult,
  GeneratedVersion,
  ScriptType,
} from '@/store/siscunia'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Radio, Mic, Megaphone, Music, FileText,
  Sparkles, Copy, Send, Loader2, CheckCircle, Pencil, Save, X, RotateCcw, Volume2, Clock,
} from 'lucide-react'
import { toast } from 'sonner'

const ICON_MAP: Record<string, React.ReactNode> = {
  radio: <Radio className="h-5 w-5" />,
  mic: <Mic className="h-5 w-5" />,
  megaphone: <Megaphone className="h-5 w-5" />,
  music: <Music className="h-5 w-5" />,
  'file-text': <FileText className="h-5 w-5" />,
}

const INSTITUTION_TYPES = [
  { value: 'identificacion', label: 'Identificación de emisora/programa' },
  { value: 'cortinilla', label: 'Cortinilla / Separador musical' },
  { value: 'promo', label: 'Promo de Programación' },
  { value: 'informativo', label: 'Informativo / Boletín' },
  { value: 'lectura_texto', label: 'Lectura de Texto' },
]

const CAMPAIGN_INST_TYPES = [
  { value: 'ecologica', label: 'Ecológica' },
  { value: 'ciudadana', label: 'Comportamiento Ciudadano' },
  { value: 'ayuda_social', label: 'Ayuda Social' },
  { value: 'salud', label: 'Salud Pública' },
  { value: 'educativa', label: 'Educativa' },
  { value: 'seguridad_vial', label: 'Seguridad Vial' },
]

const PROGRAM_FRANJA_TYPES = [
  { value: 'programa', label: 'Programa de radio' },
  { value: 'franja_musical', label: 'Franja Musical' },
  { value: 'horario_destacado', label: 'Horario Destacado' },
]

const MODEL_OPTIONS = [
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (rápido)' },
  { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (calidad)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
]

export function GeneratorPanel() {
  const {
    formData, settings, isGenerating, generatedResult,
    setFormData, resetForm, setIsGenerating, setGeneratedResult, setScripts,
  } = useSiscuniaStore()

  const [lastScriptId, setLastScriptId] = useState<string | null>(null)
  const [editingVersion, setEditingVersion] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [sendingToNotion, setSendingToNotion] = useState<number | null>(null)
  const [formTab, setFormTab] = useState('tipo')

  const meta = SCRIPT_TYPE_META[formData.scriptType]
  const infoSource = meta?.infoSource || 'ambos'
  const showCliente = infoSource === 'cliente' || infoSource === 'ambos'
  const showEmisora = infoSource === 'emisora' || infoSource === 'ambos'

  const handleGenerate = async () => {
    // Validate based on type
    if (showCliente && !formData.clientName) {
      toast.error('Ingresa el nombre del cliente')
      setFormTab('cliente')
      return
    }
    if (formData.scriptType === 'LOCUCION_INSTITUCIONAL' && !formData.institutionType) {
      toast.error('Selecciona el tipo de locución')
      setFormTab('tipo')
      return
    }
    if (formData.scriptType === 'CAMPAIGNA_INSTITUCIONAL' && !formData.campaignInstitutionalType) {
      toast.error('Selecciona el tipo de campaña')
      setFormTab('tipo')
      return
    }
    if (formData.scriptType === 'CUNA_PROGRAMA_FRANJA' && !formData.programFranjaType) {
      toast.error('Selecciona el tipo de cuña')
      setFormTab('tipo')
      return
    }

    setIsGenerating(true)
    setGeneratedResult(null)
    setEditingVersion(null)

    try {
      const payload = {
        ...formData,
        // Pre-fill station from settings if empty
        stationName: formData.stationName || settings?.stationName || '',
        stationFrequency: formData.stationFrequency || settings?.stationFrequency || '',
        stationGenre: formData.stationGenre || settings?.stationGenre || '',
        stationAudience: formData.stationAudience || settings?.stationAudience || '',
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al generar')
        return
      }

      setGeneratedResult({
        titulo_sugerido: data.script.titulo_sugerido,
        versiones: data.script.versiones,
      })
      setLastScriptId(data.script.id)

      // Refresh history
      const scriptsRes = await fetch('/api/scripts')
      const scriptsData = await scriptsRes.json()
      setScripts(scriptsData.scripts || [])

      toast.success('Libreto generado correctamente')
    } catch {
      toast.error('Error de conexión al generar')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendToNotion = async (versionIndex: number, editedContent?: string) => {
    if (!lastScriptId) return
    setSendingToNotion(versionIndex)
    try {
      const res = await fetch('/api/send-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: lastScriptId, versionIndex, editedContent }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Enviado a Notion correctamente')
        // Refresh history
        const scriptsRes = await fetch('/api/scripts')
        const scriptsData = await scriptsRes.json()
        setScripts(scriptsData.scripts || [])
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

  const startEditing = (v: GeneratedVersion) => {
    setEditingVersion(v.version)
    setEditText(v.libreto)
  }

  const saveEditing = () => {
    if (!generatedResult || editingVersion === null) return
    const updated: GeneratedResult = {
      ...generatedResult,
      versiones: generatedResult.versiones.map((v) =>
        v.version === editingVersion ? { ...v, libreto: editText } : v
      ),
    }
    setGeneratedResult(updated)
    setEditingVersion(null)
    toast.success('Versión actualizada')
  }

  const formatDuration = (secs: number) => {
    if (secs >= 60) {
      const m = Math.floor(secs / 60)
      const s = secs % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${secs}"`
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* === LEFT: Form === */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuración del Libreto</CardTitle>
            <CardDescription>Completa los datos según el tipo de libreto</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="tipo" className="text-xs sm:text-sm">Tipo</TabsTrigger>
                {showCliente && <TabsTrigger value="cliente" className="text-xs sm:text-sm">Cliente</TabsTrigger>}
                <TabsTrigger value="emisora" className="text-xs sm:text-sm">Emisora</TabsTrigger>
                <TabsTrigger value="produccion" className="text-xs sm:text-sm">Producción</TabsTrigger>
              </TabsList>

              {/* --- TAB: Tipo --- */}
              <TabsContent value="tipo" className="space-y-4 mt-0">
                {/* Type selector */}
                <div className="space-y-2">
                  <Label>Tipo de libreto</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(Object.entries(SCRIPT_TYPE_META) as [ScriptType, typeof SCRIPT_TYPE_META[ScriptType]][]).map(
                      ([key, val]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setFormData({ scriptType: key })
                            setFormTab(showCliente ? 'cliente' : 'emisora')
                          }}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:bg-accent/50 ${
                            formData.scriptType === key
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-border'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center h-9 w-9 rounded-md shrink-0 ${
                              formData.scriptType === key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {ICON_MAP[val.icon] || <FileText className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">{val.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{val.desc}</p>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Conditional fields by type */}
                {formData.scriptType === 'LOCUCION_INSTITUCIONAL' && (
                  <div className="space-y-2">
                    <Label>Subtipo de locución</Label>
                    <Select value={formData.institutionType} onValueChange={(v) => setFormData({ institutionType: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {INSTITUTION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.scriptType === 'MICRO_PROGRAMA' && (
                  <div className="space-y-2">
                    <Label>Duración objetivo</Label>
                    <Select value={formData.microDuration} onValueChange={(v) => setFormData({ microDuration: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 minutos</SelectItem>
                        <SelectItem value="3">3 minutos</SelectItem>
                        <SelectItem value="4">4 minutos</SelectItem>
                        <SelectItem value="5">5 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.scriptType === 'CAMPAIGNA_INSTITUCIONAL' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Tipo de campaña</Label>
                      <Select value={formData.campaignInstitutionalType} onValueChange={(v) => setFormData({ campaignInstitutionalType: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                        <SelectContent>
                          {CAMPAIGN_INST_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tema específico (opcional)</Label>
                      <Input
                        placeholder="Ej: reciclaje en barrios, semáforos peatonales..."
                        value={formData.campaignTopic}
                        onChange={(e) => setFormData({ campaignTopic: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {formData.scriptType === 'CUNA_PROGRAMA_FRANJA' && (
                  <div className="space-y-2">
                    <Label>Tipo de cuña</Label>
                    <Select value={formData.programFranjaType} onValueChange={(v) => setFormData({ programFranjaType: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {PROGRAM_FRANJA_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.scriptType === 'INFOMERCIAL' && (
                  <div className="space-y-2">
                    <Label>Duración objetivo</Label>
                    <Select value={formData.infomercialDuration} onValueChange={(v) => setFormData({ infomercialDuration: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 minutos</SelectItem>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Info source indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  {infoSource === 'cliente' && <Badge variant="outline" className="text-xs">Requiere datos del cliente</Badge>}
                  {infoSource === 'emisora' && <Badge variant="outline" className="text-xs">Requiere datos de la emisora</Badge>}
                  {infoSource === 'ambos' && (
                    <>
                      <Badge variant="outline" className="text-xs">Cliente</Badge>
                      <span>+</span>
                      <Badge variant="outline" className="text-xs">Emisora</Badge>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* --- TAB: Cliente --- */}
              {showCliente && (
                <TabsContent value="cliente" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Nombre / Razón social *</Label>
                      <Input
                        placeholder="Ej: Restaurante El Sabor"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ clientName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rubro / Industria</Label>
                      <Input
                        placeholder="Ej: Gastronomía"
                        value={formData.clientBusiness}
                        onChange={(e) => setFormData({ clientBusiness: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tipo de oferta</Label>
                      <Select value={formData.clientCategory} onValueChange={(v) => setFormData({ clientCategory: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="producto">Producto</SelectItem>
                          <SelectItem value="servicio">Servicio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(formData.clientCategory === 'producto' || formData.clientCategory === 'servicio') && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>{formData.clientCategory === 'producto' ? 'Producto(s)' : 'Servicio(s)'}</Label>
                        <Input
                          placeholder={formData.clientCategory === 'producto' ? 'Ej: Menú ejecutivo, bebidas artesanales' : 'Ej: Catering para eventos, delivery'}
                          value={formData.productName}
                          onChange={(e) => setFormData({ productName: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Tono de marca</Label>
                      <Input
                        placeholder="Ej: Cercano, formal, juvenil"
                        value={formData.clientTone}
                        onChange={(e) => setFormData({ clientTone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Palabras clave</Label>
                      <Input
                        placeholder="Ej: fresco, natural, hogar"
                        value={formData.clientKeywords}
                        onChange={(e) => setFormData({ clientKeywords: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <p className="text-xs text-muted-foreground font-medium">Datos de contacto (se incorporarán naturalmente al libreto)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Dirección</Label>
                      <Input
                        placeholder="Cra 10 #5-32"
                        value={formData.clientAddress}
                        onChange={(e) => setFormData({ clientAddress: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Teléfono</Label>
                      <Input
                        placeholder="(601) 123-4567"
                        value={formData.clientPhone}
                        onChange={(e) => setFormData({ clientPhone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp</Label>
                      <Input
                        placeholder="+57 300 123 4567"
                        value={formData.clientWhatsapp}
                        onChange={(e) => setFormData({ clientWhatsapp: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Correo electrónico</Label>
                      <Input
                        placeholder="contacto@ejemplo.com"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ clientEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sitio web</Label>
                      <Input
                        placeholder="www.ejemplo.com"
                        value={formData.clientWebsite}
                        onChange={(e) => setFormData({ clientWebsite: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Redes sociales</Label>
                      <Input
                        placeholder="@ejemplo en Instagram, Facebook"
                        value={formData.clientSocialMedia}
                        onChange={(e) => setFormData({ clientSocialMedia: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Objetivo del libreto</Label>
                      <Textarea
                        placeholder="Ej: Dar a conocer el nuevo menú del restaurante"
                        rows={2}
                        value={formData.objective}
                        onChange={(e) => setFormData({ objective: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mensaje central</Label>
                      <Textarea
                        placeholder="Ej: Comida casera con ingredientes frescos del campo"
                        rows={2}
                        value={formData.coreMessage}
                        onChange={(e) => setFormData({ coreMessage: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Llamado a la acción (CTA)</Label>
                        <Input
                          placeholder="Ej: Visítanos en Cra 10 #5-32"
                          value={formData.ctaText}
                          onChange={(e) => setFormData({ ctaText: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Promoción / Dato adicional</Label>
                        <Input
                          placeholder="Ej: 20% de descuento los viernes"
                          value={formData.promotionText}
                          onChange={(e) => setFormData({ promotionText: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* --- TAB: Emisora --- */}
              <TabsContent value="emisora" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nombre de la emisora</Label>
                    <Input
                      placeholder={settings?.stationName || 'Ej: Radio Siscuñia'}
                      value={formData.stationName}
                      onChange={(e) => setFormData({ stationName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frecuencia</Label>
                    <Input
                      placeholder={settings?.stationFrequency || 'Ej: 101.9 FM'}
                      value={formData.stationFrequency}
                      onChange={(e) => setFormData({ stationFrequency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Género musical</Label>
                    <Input
                      placeholder={settings?.stationGenre || 'Ej: Pop latino, Vallenato'}
                      value={formData.stationGenre}
                      onChange={(e) => setFormData({ stationGenre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Audiencia objetivo</Label>
                    <Input
                      placeholder={settings?.stationAudience || 'Ej: Mujeres 25-45 años'}
                      value={formData.stationAudience}
                      onChange={(e) => setFormData({ stationAudience: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nombre del programa</Label>
                    <Input
                      placeholder="Ej: Mañanas Siscuñia"
                      value={formData.programName}
                      onChange={(e) => setFormData({ programName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horario</Label>
                    <Input
                      placeholder="Ej: Lunes a viernes 6:00 - 10:00 AM"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ scheduleTime: e.target.value })}
                    />
                  </div>
                </div>

                {infoSource === 'emisora' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Objetivo del libreto</Label>
                        <Textarea
                          placeholder="Ej: Promover el espacio de las mañana con temática deportiva"
                          rows={2}
                          value={formData.objective}
                          onChange={(e) => setFormData({ objective: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Mensaje central</Label>
                        <Textarea
                          placeholder="Ej: Lo mejor del deporte nacional cada mañana"
                          rows={2}
                          value={formData.coreMessage}
                          onChange={(e) => setFormData({ coreMessage: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* --- TAB: Producción --- */}
              <TabsContent value="produccion" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de voz</Label>
                    <Select value={formData.voiceType} onValueChange={(v) => setFormData({ voiceType: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculina_profunda">Masculina profunda</SelectItem>
                        <SelectItem value="masculina_joven">Masculina joven</SelectItem>
                        <SelectItem value="femenina_suave">Femenina suave</SelectItem>
                        <SelectItem value="femenina_enérgica">Femenina enérgica</SelectItem>
                        <SelectItem value="doble_voz">Doble voz (M+F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tono del locutor</Label>
                    <Select value={formData.voiceTone} onValueChange={(v) => setFormData({ voiceTone: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="cercano">Cercano / Amigable</SelectItem>
                        <SelectItem value="enérgico">Enérgico</SelectItem>
                        <SelectItem value="suave">Suave / Tranquilo</SelectItem>
                        <SelectItem value="dramático">Dramático</SelectItem>
                        <SelectItem value="humorístico">Humorístico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Estilo musical de fondo</Label>
                    <Input
                      placeholder="Ej: Lo-fi, corporativo, tropical, rock suave"
                      value={formData.musicStyle}
                      onChange={(e) => setFormData({ musicStyle: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Modelo de IA</Label>
                    <Select value={formData.model} onValueChange={(v) => setFormData({ model: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODEL_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cantidad de versiones</Label>
                    <Select value={String(formData.numVersions)} onValueChange={(v) => setFormData({ numVersions: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 versión</SelectItem>
                        <SelectItem value="2">2 versiones</SelectItem>
                        <SelectItem value="3">3 versiones</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Generate button */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar Libreto
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => { resetForm(); setFormTab('tipo') }}
            title="Limpiar formulario"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* === RIGHT: Results === */}
      <div>
        {!generatedResult && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-muted-foreground">
            <Volume2 className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Tu libreto aparecerá aquí</p>
            <p className="text-sm mt-1">Configura los datos y haz clic en &quot;Generar Libreto&quot;</p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
              <Sparkles className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <p className="text-lg font-medium">Generando libreto con IA...</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formData.model === 'gemini-3.6-flash' ? 'Gemini 3.6 Flash' :
               formData.model === 'gemini-3.7-flash' ? 'Gemini 3.7 Flash' :
               formData.model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash'}
              {' · '}{formData.numVersions} {formData.numVersions === 1 ? 'versión' : 'versiones'}
            </p>
          </div>
        )}

        {generatedResult && !isGenerating && (
          <ScrollArea className="max-h-[calc(100vh-200px)]">
            <div className="space-y-4 pr-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">{generatedResult.titulo_sugerido}</h3>
                  <p className="text-xs text-muted-foreground">
                    {generatedResult.versiones.length} {generatedResult.versiones.length === 1 ? 'versión' : 'versiones'} generada{generatedResult.versiones.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Badge variant="outline">
                  {SCRIPT_TYPE_META[formData.scriptType]?.label}
                </Badge>
              </div>

              {generatedResult.versiones.map((version) => (
                <Card key={version.version} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{version.titulo}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(version.duracion_estimada_segundos)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Libreto content */}
                    <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">
                      {editingVersion === version.version ? (
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={10}
                          className="font-mono text-sm bg-background"
                        />
                      ) : (
                        version.libreto
                      )}
                    </div>

                    {/* Production notes */}
                    {version.observaciones_produccion && (
                      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-md p-2.5">
                        <span className="font-medium text-blue-700 dark:text-blue-300">Notas de producción: </span>
                        {version.observaciones_produccion}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {editingVersion === version.version ? (
                        <>
                          <Button size="sm" variant="default" className="h-7 gap-1.5 text-xs" onClick={saveEditing}>
                            <Save className="h-3.5 w-3.5" /> Guardar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => setEditingVersion(null)}>
                            <X className="h-3.5 w-3.5" /> Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => startEditing(version)}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => handleCopy(version.libreto)}>
                            <Copy className="h-3.5 w-3.5" /> Copiar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => handleSendToNotion(version.version - 1)}
                            disabled={sendingToNotion === version.version}
                          >
                            {sendingToNotion === version.version ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Enviar a Notion
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
