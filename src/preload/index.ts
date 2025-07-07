import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppSettings, SuggestionData } from '../shared/types'

// Custom APIs for renderer
const api = {
  // Settings APIs
  settings: {
    save: (settings: AppSettings): Promise<void> => ipcRenderer.invoke('settings:save', settings),
    load: (): Promise<AppSettings> => ipcRenderer.invoke('settings:load'),
    clear: (): Promise<void> => ipcRenderer.invoke('settings:clear'),
    getDefaults: (): Promise<AppSettings> => ipcRenderer.invoke('settings:getDefaults')
  },

  // Enhancement APIs
  enhance: {
    process: (): Promise<void> => ipcRenderer.invoke('enhance:process')
  },

  // Suggestion APIs
  suggestion: {
    accept: (enhancedText: string): Promise<void> =>
      ipcRenderer.invoke('suggestion:accept', enhancedText),
    getData: (): Promise<SuggestionData | null> => ipcRenderer.invoke('suggestion:getData')
  },

  // Window APIs
  window: {
    close: (): void => ipcRenderer.send('window:close'),
    minimize: (): void => ipcRenderer.send('window:minimize')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
