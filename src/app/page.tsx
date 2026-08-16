'use client'

import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSiscuniaStore } from '@/store/siscunia'
import { SettingsPanel } from '@/components/siscunia/SettingsPanel'
import { GeneratorPanel } from '@/components/siscunia/GeneratorPanel'
import { HistoryPanel } from '@/components/siscunia/HistoryPanel'
import { Radio, Sparkles, Settings, Clock } from 'lucide-react'

export default function Home() {
  const { activeTab, setActiveTab, setSettings } = useSiscuniaStore()

  useEffect(() => {
    // Load settings on mount
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setSettings(data)
      })
      .catch(() => {})

    // Load history on mount
    fetch('/api/scripts')
      .then((r) => r.json())
      .then((data) => {
        const { setScripts } = useSiscuniaStore.getState()
        setScripts(data.scripts || [])
      })
      .catch(() => {})
  }, [setSettings])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">Siscuñia</h1>
              <p className="text-xs text-muted-foreground">Generador de Libretos de Radio con IA</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="generar" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Generar</span>
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Historial</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuración</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generar">
            <GeneratorPanel />
          </TabsContent>

          <TabsContent value="historial">
            <HistoryPanel />
          </TabsContent>

          <TabsContent value="config">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground">
          Siscuñia · Generador de libretos de radio con Google AI Studio + Notion
        </div>
      </footer>
    </div>
  )
}
