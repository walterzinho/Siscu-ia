'use client'

import { useEffect, useState } from 'react'
import { useSiscuniaStore } from '@/store/siscunia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, Check, Eye, EyeOff, Radio, Database, Key } from 'lucide-react'
import { toast } from 'sonner'

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
            Configura las llaves de acceso para Google AI Studio y Notion. Las claves se almacenan localmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google AI Studio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="googleApiKey" className="font-medium">API Key de Google AI Studio</Label>
              {settings?.googleApiKeySet && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" /> Configurada
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="googleApiKey"
                  type={showGoogleKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={form.googleApiKey}
                  onChange={(e) => setForm((f) => ({ ...f, googleApiKey: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                >
                  {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtén tu API Key en{' '}
              <span className="underline">aistudio.google.com/apikey</span>
            </p>
          </div>

          {/* Notion Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notionToken" className="font-medium">Token de Integración de Notion</Label>
              {settings?.notionTokenSet && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" /> Configurado
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                id="notionToken"
                type={showNotionToken ? 'text' : 'password'}
                placeholder="ntn_... o secret_..."
                value={form.notionToken}
                onChange={(e) => setForm((f) => ({ ...f, notionToken: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNotionToken(!showNotionToken)}
              >
                {showNotionToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            </div>
            <Input
              id="notionDatabaseId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={form.notionDatabaseId}
              onChange={(e) => setForm((f) => ({ ...f, notionDatabaseId: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Copia el ID de la URL de tu base de datos en Notion (los 32 caracteres hex después del nombre)
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
                placeholder="Ej: Radio Siscuñia FM"
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