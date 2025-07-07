import { ElectronAPI } from '@electron-toolkit/preload'
import type { AppSettings, SuggestionData } from '../shared/types'

export interface API {
  settings: {
    save: (settings: AppSettings) => Promise<void>
    load: () => Promise<AppSettings>
    clear: () => Promise<void>
    getDefaults: () => Promise<AppSettings>
  }
  enhance: {
    process: () => Promise<void>
  }
  suggestion: {
    accept: (enhancedText: string) => Promise<void>
    getData: () => Promise<SuggestionData | null>
  }
  window: {
    close: () => void
    minimize: () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
