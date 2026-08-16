import { create } from 'zustand'

export type ScriptType = 'CUNA_COMERCIAL' | 'CAMPAIGNA' | 'LOCUCION_INSTITUCIONAL' | 'MICRO_PROGRAMA'

export interface GeneratedVersion {
  version: number
  titulo: string
  libreto: string
  duracion_estimada_segundos: number
  observaciones_produccion: string
}

export interface GeneratedResult {
  titulo_sugerido: string
  versiones: GeneratedVersion[]
}

export interface GeneratedScript {
  id: string
  titulo_sugerido?: string
  versiones?: GeneratedVersion[]
  scriptType: string
  clientName: string
  createdAt: string
  sentToNotion: boolean
  notionPageId: string
  notionSentAt?: string
}

export interface FormData {
  scriptType: ScriptType
  clientName: string
  clientBusiness: string
  clientTone: string
  clientKeywords: string
  stationName: string
  stationFrequency: string
  stationGenre: string
  stationAudience: string
  programName: string
  scheduleTime: string
  duration: string
  voiceType: string
  voiceTone: string
  musicStyle: string
  objective: string
  coreMessage: string
  ctaText: string
  promotionText: string
  numVersions: number
  model: string
}

interface SiscuniaState {
  // Settings
  settings: {
    googleApiKeySet: boolean
    notionTokenSet: boolean
    notionDatabaseId: string
    stationName: string
    stationFrequency: string
    stationGenre: string
    stationAudience: string
  } | null
  // Form
  formData: FormData
  // Generation
  isGenerating: boolean
  generatedResult: GeneratedResult | null
  // History
  scripts: GeneratedScript[]
  // Tab
  activeTab: string
  // Actions
  setSettings: (settings: SiscuniaState['settings']) => void
  setFormData: (data: Partial<FormData>) => void
  resetForm: () => void
  setIsGenerating: (v: boolean) => void
  setGeneratedResult: (r: GeneratedResult | null) => void
  setScripts: (s: GeneratedScript[]) => void
  setActiveTab: (t: string) => void
}

const defaultFormData: FormData = {
  scriptType: 'CUNA_COMERCIAL',
  clientName: '',
  clientBusiness: '',
  clientTone: '',
  clientKeywords: '',
  stationName: '',
  stationFrequency: '',
  stationGenre: '',
  stationAudience: '',
  programName: '',
  scheduleTime: '',
  duration: '30',
  voiceType: '',
  voiceTone: '',
  musicStyle: '',
  objective: '',
  coreMessage: '',
  ctaText: '',
  promotionText: '',
  numVersions: 2,
  model: 'gemini-2.5-pro',
}

export const useSiscuniaStore = create<SiscuniaState>((set) => ({
  settings: null,
  formData: defaultFormData,
  isGenerating: false,
  generatedResult: null,
  scripts: [],
  activeTab: 'generar',
  setSettings: (settings) => set({ settings }),
  setFormData: (data) => set((s) => ({ formData: { ...s.formData, ...data } })),
  resetForm: () => set({ formData: defaultFormData, generatedResult: null }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGeneratedResult: (r) => set({ generatedResult: r }),
  setScripts: (s) => set({ scripts: s }),
  setActiveTab: (t) => set({ activeTab: t }),
}))
