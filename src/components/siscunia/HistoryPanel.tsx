'use client'

import { useEffect, useState } from 'react'
import { useSiscuniaStore, GeneratedScript } from '@/store/siscunia'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Clock, Copy, Send, ExternalLink, Trash2, FileText, Loader2, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'

const TYPE_LABELS: Record<string, string> = {
  CUNA_COMERCIAL: 'Cuña Comercial',
  CAMPAIGNA: 'Campaña',
  LOCUCION_INSTITUCIONAL: 'Locución Institucional',
  MICRO_PROGRAMA: 'Micro-programa',
}

export function HistoryPanel() {
  const { scripts, setScripts } = useSiscuniaStore()
  const [loading, setLoading] = useState(true)
  const [sendingToNotion, setSendingToNotion] = useState<string | null>(null)
  const [selectedScript, setSelectedScript] = useState<GeneratedScript | null>(null)
  const [selectedContent, setSelectedContent] = useState<any>(null)

  useEffect(() => {
    loadScripts()
  }, [])

  const loadScripts = async () => {
    try {
      const res = await fetch('/api/scripts')
      const data = await res.json()
      setScripts(data.scripts || [])
    } catch {
      toast.error('Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/scripts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setScripts(scripts.filter((s) => s.id !== id))
      toast.success('Libreto eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleResendToNotion = async (script: GeneratedScript) => {
    setSendingToNotion(script.id)
    try {
      const res = await fetch('/api/send-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: script.id, versionIndex: 0 }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Re-enviado a Notion')
        loadScripts()
      } else {
        toast.error(data.error || 'Error al enviar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSendingToNotion(null)
    }
  }

  const openScript = async (script: GeneratedScript) => {
    // For scripts loaded from history, we need to get content from the API or reconstruct
    setSelectedScript(script)
    // The content is in the DB, but we only have summary from list endpoint.
    // We show a modal with available info
    setSelectedContent(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (scripts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg">No hay libretos generados aún</p>
        <p className="text-sm mt-1">Ve a &quot;Generar&quot; para crear tu primer libreto con IA</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Historial ({scripts.length})
        </h2>
      </div>

      <ScrollArea className="max-h-[calc(100vh-280px)]">
        <div className="space-y-3">
          {scripts.map((script) => (
            <Card key={script.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">
                      {script.clientName || 'Sin cliente'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[script.scriptType] || script.scriptType}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {script.duration}&quot;
                      </Badge>
                      {script.sentToNotion && (
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                          <CheckCircle className="h-3 w-3 mr-1" /> Enviado a Notion
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleResendToNotion(script)}
                      disabled={sendingToNotion === script.id}
                      title="Re-enviar a Notion"
                    >
                      {sendingToNotion === script.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(script.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(script.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
