import { create } from 'zustand'

export type ScriptType =
  | 'LOCUCION_INSTITUCIONAL'
  | 'MICRO_PROGRAMA'
  | 'CAMPAIGNA_INSTITUCIONAL'
  | 'CUNA_PROGRAMA_FRANJA'
  | 'INFOMERCIAL'

// Cada tipo sabe de dónde toma la info principal
export const SCRIPT_TYPE_META: Record<ScriptType, {
  label: string
  desc: string
  infoSource: 'emisora' | 'cliente' | 'ambos'
  icon: string
}> = {
  LOCUCION_INSTITUCIONAL: {
    label: 'Locución Institucional',
    desc: 'Identificaciones, cortinillas, promos, informativos',
    infoSource: 'emisora',
    icon: 'radio',
  },
  MICRO_PROGRAMA: {
    label: 'Micro-programa',
    desc: 'Contenido corto de 2 a 5 minutos',
    infoSource: 'emisora',
    icon: 'mic',
  },
  CAMPAIGNA_INSTITUCIONAL: {
    label: 'Campaña Institucional',
    desc: 'Ecológica, ciudadana, de ayuda social',
    infoSource: 'ambos',
    icon: 'megaphone',
  },
  CUNA_PROGRAMA_FRANJA: {
    label: 'Cuña de Programa / Franja Musical',
    desc: 'Promoción de programa o bloque musical',
    infoSource: 'emisora',
    icon: 'music',
  },
  INFOMERCIAL: {
    label: 'Infomercial',
    desc: 'Contenido largo sobre producto o servicio del cliente',
    infoSource: 'cliente',
    icon: 'file-text',
  },
}

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
  // Cliente
  clientName: string
  clientBusiness: string
  clientTone: string
  clientKeywords: string
  clientCategory: string
  productName: string
  clientAddress: string
  clientEmail: string
  clientWebsite: string
  clientPhone: string
  clientWhatsapp: string
  clientSocialMedia: string
  // Emisora
  stationName: string
  stationFrequency: string
  stationGenre: string
  stationAudience: string
  programName: string
  scheduleTime: string
  // Específicos por tipo
  institutionType: string
  microDuration: string
  campaignInstitutionalType: string
  campaignTopic: string
  programFranjaType: string
  infomercialDuration: string
  // Producción
  voiceType: string
  voiceTone: string
  musicStyle: string
  // Mensaje
  objective: string
  coreMessage: string
  ctaText: string
  promotionText: string
  // Generación
  numVersions: number
  model: string
}

interface SiscuniaState {
  settings: {
    googleApiKeySet: boolean
    notionTokenSet: boolean
    notionDatabaseId: string
    stationName: string
    stationFrequency: string
    stationGenre: string
    stationAudience: string
  } | null
  formData: FormData
  isGenerating: boolean
  generatedResult: GeneratedResult | null
  scripts: GeneratedScript[]
  activeTab: string
  setSettings: (settings: SiscuniaState['settings']) => void
  setFormData: (data: Partial<FormData>) => void
  resetForm: () => void
  setIsGenerating: (v: boolean) => void
  setGeneratedResult: (r: GeneratedResult | null) => void
  setScripts: (s: GeneratedScript[]) => void
  setActiveTab: (t: string) => void
}

const defaultFormData: FormData = {
  scriptType: 'LOCUCION_INSTITUCIONAL',
  clientName: '',
  clientBusiness: '',
  clientTone: '',
  clientKeywords: '',
  clientCategory: '',
  productName: '',
  clientAddress: '',
  clientEmail: '',
  clientWebsite: '',
  clientPhone: '',
  clientWhatsapp: '',
  clientSocialMedia: '',
  stationName: '',
  stationFrequency: '',
  stationGenre: '',
  stationAudience: '',
  programName: '',
  scheduleTime: '',
  institutionType: '',
  microDuration: '3',
  campaignInstitutionalType: '',
  campaignTopic: '',
  programFranjaType: '',
  infomercialDuration: '5',
  voiceType: '',
  voiceTone: '',
  musicStyle: '',
  objective: '',
  coreMessage: '',
  ctaText: '',
  promotionText: '',
  numVersions: 2,
  model: 'gemini-3.6-flash',
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
