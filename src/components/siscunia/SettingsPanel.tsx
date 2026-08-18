'use client'

import { useEffect, useState } from 'react'
import { useSiscuniaStore } from '@/store/siscunia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, Check, Eye, EyeOff, Radio, Database, Key, Loader2, CircleCheck, CircleX, ShieldCheck, Plus } from 'lucide-react'
import { toast } from 'sonner'

type VerifyState = 'idle' | 'checking' | 'ok' | 'error'

export function SettingsPanel() {
  const { settings, setSettings } = useSiscuniaStore()
  const [form, setForm] = useState({
    googleApiKey: '',
    notionToken: '',
    notionDatabaseId: '',
    stationName: '',
    stationFrequency: '',
    stationGenre: '',
    stationAudience: '',
  })
  const [showGoogleKey, setShowGoogleKey] = useState(false)
  const [showNotionToken, setShowNotionToken] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estados de verificación
  const [googleVerify, setGoogleVerify] = useState<VerifyState>('idle')
  const [notionTokenVerify, setNotionTokenVerify] = useState<VerifyState>('idle')
  const [notionDbVerify, setNotionDbVerify] = useState<VerifyState>('idle')
  const [creatingDb, setCreatingDb] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setSettings(data)
          setForm((f) => ({
            ...f,
            googleApiKey: '',
            notionToken: '',
            notionDatabaseId: data.notionDatabaseId || '',
            stationName: data.stationName || '',
            stationFrequency: data.stationFrequency || '',
            stationGenre: data.stationGenre || '',
            stationAudience: data.stationAudience || '',
          }))
        }
      })
  }, [setSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Configuración guardada correctamente')
        const fresh = await (await fetch('/api/settings')).json()
        setSettings(fresh)
        setForm((f) => ({ ...f, googleApiKey: '', notionToken: '' }))
      } else {
        toast.error(data.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const verifyGoogle = async () => {
    const key = form.googleApiKey
    if (!key) {
      toast.error('Ingresa la API Key primero')
      return
    }
    setGoogleVerify('checking')
    setVerifyMsg((m) => ({ ...m, google: '' }))
    try {
      const res = await fetch('/api/verify/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      })
      const data = await res.json()
      if (data.success) {
        setGoogleVerify('ok')
        setVerifyMsg((m) => ({ ...m, google: data.message }))
      } else {
        setGoogleVerify('error')
        setVerifyMsg((m) => ({ ...m, google: data.error }))
      }
    } catch {
      setGoogleVerify('error')
      setVerifyMsg((m) => ({ ...m, google: 'Error de conexión' }))
    }
  }

  const verifyNotionToken = async () => {
    const token = form.notionToken
    if (!token) {
      toast.error('Ingresa el Token primero')
      return
    }
    setNotionTokenVerify('checking')
    setVerifyMsg((m) => ({ ...m, notionToken: '' }))
    try {
      const res = await fetch('/api/verify/notion-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.success) {
        setNotionTokenVerify('ok')
        setVerifyMsg((m) => ({ ...m, notionToken: data.message }))
      } else {
        setNotionTokenVerify('error')
        setVerifyMsg((m) => ({ ...m, notionToken: data.error }))
      }
    } catch {
      setNotionTokenVerify('error')
      setVerifyMsg((m) => ({ ...m, notionToken: 'Error de conexión' }))
    }
  }

  const verifyNotionDb = async () => {
    const dbId = form.notionDatabaseId
    if (!dbId) {
      toast.error('Ingresa el ID de la base de datos primero')
      return
    }
    // Usa el token del formulario o el guardado en settings
    const token = form.notionToken || null
    if (!token) {
      toast.error('Configura y verifica el Token de Notion primero')
      return
    }
    setNotionDbVerify('checking')
    setVerifyMsg((m) => ({ ...m, notionDb: '' }))
    try {
      const res = await fetch('/api/verify/notion-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, databaseId: dbId }),
      })
      const data = await res.json()
      if (data.success) {
        setNotionDbVerify('ok')
        setVerifyMsg((m) => ({ ...m, notionDb: data.message }))
      } else {
        setNotionDbVerify('error')
        setVerifyMsg((m) => ({ ...m, notionDb: data.error }))
      }
    } catch {
      setNotionDbVerify('error')
      setVerifyMsg((m) => ({ ...m, notionDb: 'Error de conexión' }))
    }
  }

  const createNotionDb = async () => {
    const token = form.notionToken
    if (!token) {
      toast.error('Configura y verifica el Token de Notion primero')
      return
    }
    setCreatingDb(true)
    try {
      const res = await fetch('/api/create-notion-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.success) {
        setForm((f) => ({ ...f, notionDatabaseId: data.databaseId }))
        setNotionDbVerify('ok')
        setVerifyMsg((m) => ({ ...m, notionDb: `Creada correctamente — ${data.message}` }))
        toast.success('Base de datos creada en Notion')
      } else {
        setNotionDbVerify('error')
        setVerifyMsg((m) => ({ ...m, notionDb: data.error }))
        toast.error(data.error || 'Error al crear')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setCreatingDb(false)
    }
  }

  const StatusIcon = ({ state }: { state: VerifyState }) => {
    if (state === 'checking') return <Loader2 className="h-4 w-4 animate-spin" />
    if (state === 'ok') return <CircleCheck className="h-4 w-4 text-emerald-500" />
    if (state === 'error') return <CircleX className="h-4 w-4 text-red-500" />
    return null
  }

  const MessageLine = ({ msgKey }: { msgKey: string }) => {
    const msg = verifyMsg[msgKey]
    if (!msg) return null
    const isError = msgKey === 'google'
      ? googleVerify === 'error'
      : msgKey === 'notionToken'
        ? notionTokenVerify === 'error'
        : notionDbVerify === 'error'
    return (
      <p className={`text-xs mt-1 ${isError ? 'text-red-500' : 'text-emerald-600'}`}>
        {msg}
      </p>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Credenciales de API
          </CardTitle>
          <CardDescription>
            Configura y verifica las llaves de acceso. Verifica cada una antes de guardar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Google AI Studio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="googleApiKey" className="font-medium">API Key de Google AI Studio</Label>
              <div className="flex items-center gap-2">
                <StatusIcon state={googleVerify} />
                {settings?.googleApiKeySet && (
                  <Badge variant={settings?.googleApiKeyFromEnv ? 'outline' : 'secondary'} className="gap-1">
                    <Check className="h-3 w-3" /> {settings?.googleApiKeyFromEnv ? 'Desplegada (env)' : 'Guardada'}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="googleApiKey"
                  type={showGoogleKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={form.googleApiKey}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, googleApiKey: e.target.value }))
                    setGoogleVerify('idle')
                    setVerifyMsg((m) => ({ ...m, google: '' }))
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                >
                  {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={verifyGoogle}
                disabled={googleVerify === 'checking' || !form.googleApiKey}
                className="shrink-0 gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Verificar
              </Button>
            </div>
            <MessageLine msgKey="google" />
            <p className="text-xs text-muted-foreground">
              Obtén tu API Key en{' '}
              <span className="underline">aistudio.google.com/apikey</span>
            </p>
          </div>

          {/* Notion Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notionToken" className="font-medium">Token de Integración de Notion</Label>
              <div className="flex items-center gap-2">
                <StatusIcon state={notionTokenVerify} />
                {settings?.notionTokenSet && (
                  <Badge variant={settings?.notionTokenFromEnv ? 'outline' : 'secondary'} className="gap-1">
                    <Check className="h-3 w-3" /> {settings?.notionTokenFromEnv ? 'Desplegado (env)' : 'Guardado'}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="notionToken"
                  type={showNotionToken ? 'text' : 'password'}
                  placeholder="ntn_... o secret_..."
                  value={form.notionToken}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, notionToken: e.target.value }))
                    setNotionTokenVerify('idle')
                    setVerifyMsg((m) => ({ ...m, notionToken: '' }))
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNotionToken(!showNotionToken)}
                >
                  {showNotionToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={verifyNotionToken}
                disabled={notionTokenVerify === 'checking' || !form.notionToken}
                className="shrink-0 gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Verificar
              </Button>
            </div>
            <MessageLine msgKey="notionToken" />
            <p className="text-xs text-muted-foreground">
              Crea tu integración en{' '}
              <span className="underline">notion.so/my-integrations</span>
            </p>
          </div>

          {/* Notion Database ID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notionDatabaseId" className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" /> ID de Base de Datos en Notion
              </Label>
              <StatusIcon state={notionDbVerify} />
            </div>
            <div className="flex gap-2">
              <Input
                id="notionDatabaseId"
                placeholder="Pega un ID o crea una nueva abajo"
                value={form.notionDatabaseId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, notionDatabaseId: e.target.value }))
                  setNotionDbVerify('idle')
                  setVerifyMsg((m) => ({ ...m, notionDb: '' }))
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={verifyNotionDb}
                disabled={notionDbVerify === 'checking' || !form.notionDatabaseId || !form.notionToken}
                className="gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Verificar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={createNotionDb}
                disabled={creatingDb || !form.notionToken}
                className="gap-1.5"
              >
                {creatingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear base de datos
              </Button>
            </div>
            <MessageLine msgKey="notionDb" />
            <p className="text-xs text-muted-foreground">
              Copia el ID de la URL de tu base de datos en Notion (los 32 caracteres hex después del nombre).
              Columnas recomendadas: Nombre, Tipo, Cliente, Duración, Estado, Fecha.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Station Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Datos de la Emisora
          </CardTitle>
          <CardDescription>
            Estos datos se usarán como valores predeterminados en cada libreto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stationName">Nombre de la Emisora</Label>
              <Input
                id="stationName"
                placeholder="Ej: Radio Siscuña FM"
                value={form.stationName}
                onChange={(e) => setForm((f) => ({ ...f, stationName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stationFrequency">Frecuencia</Label>
              <Input
                id="stationFrequency"
                placeholder="Ej: 102.5 FM"
                value={form.stationFrequency}
                onChange={(e) => setForm((f) => ({ ...f, stationFrequency: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stationGenre">Género Musical Principal</Label>
              <Input
                id="stationGenre"
                placeholder="Ej: Pop Latino, Vallenato, Regional"
                value={form.stationGenre}
                onChange={(e) => setForm((f) => ({ ...f, stationGenre: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stationAudience">Audiencia Objetivo</Label>
              <Input
                id="stationAudience"
                placeholder="Ej: Mujeres 25-45, Jóvenes 18-30"
                value={form.stationAudience}
                onChange={(e) => setForm((f) => ({ ...f, stationAudience: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? 'Guardando...' : <><Save className="h-4 w-4 mr-2" /> Guardar Configuración</>}
      </Button>
    </div>
  )
}
