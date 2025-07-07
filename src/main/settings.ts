import { app, safeStorage } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { DEFAULT_SYSTEM_PROMPT } from '../shared/constants'
import type { AppSettings } from '../shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  model: 'gpt-4o',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  hotkey: 'CommandOrControl+Shift+E'
}

class SettingsManager {
  private settingsPath: string
  private encryptedApiKeyPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.settingsPath = join(userDataPath, 'settings.json')
    this.encryptedApiKeyPath = join(userDataPath, 'api-key.encrypted')
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      // Handle API key separately with encryption
      if (settings.apiKey) {
        await this.saveApiKey(settings.apiKey)
      }

      // Save other settings as JSON
      const settingsToSave = {
        model: settings.model,
        systemPrompt: settings.systemPrompt,
        hotkey: settings.hotkey || 'CommandOrControl+Shift+E'
      }
      await fs.writeFile(this.settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf-8')

      // Settings saved successfully
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw new Error('Failed to save settings')
    }
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      // Load regular settings
      let settings: Partial<AppSettings> = { ...DEFAULT_SETTINGS }

      try {
        const settingsData = await fs.readFile(this.settingsPath, 'utf-8')
        const loadedSettings = JSON.parse(settingsData)
        settings = { ...settings, ...loadedSettings }
      } catch {
        // Settings file doesn't exist yet, use defaults
        // No settings file found, using defaults
      }

      // Load API key separately
      try {
        const apiKey = await this.loadApiKey()
        if (apiKey) {
          settings.apiKey = apiKey
        }
      } catch {
        // No API key found
      }

      return settings as AppSettings
    } catch (error) {
      console.error('Failed to load settings:', error)
      return DEFAULT_SETTINGS
    }
  }

  async clearSettings(): Promise<void> {
    try {
      // Remove settings file
      try {
        await fs.unlink(this.settingsPath)
      } catch {
        // File might not exist
      }

      // Remove encrypted API key
      try {
        await fs.unlink(this.encryptedApiKeyPath)
      } catch {
        // File might not exist
      }

      // Settings cleared successfully
    } catch (error) {
      console.error('Failed to clear settings:', error)
      throw new Error('Failed to clear settings')
    }
  }

  /**
   * Get default settings (useful for reset functionality)
   */
  getDefaultSettings(): AppSettings {
    return { ...DEFAULT_SETTINGS }
  }

  private async saveApiKey(apiKey: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system')
    }

    const encryptedKey = safeStorage.encryptString(apiKey)
    await fs.writeFile(this.encryptedApiKeyPath, encryptedKey)
  }

  private async loadApiKey(): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Encryption not available on this system')
      return null
    }

    try {
      const encryptedKey = await fs.readFile(this.encryptedApiKeyPath)
      return safeStorage.decryptString(encryptedKey)
    } catch {
      // API key file doesn't exist
      return null
    }
  }
}

export const settingsManager = new SettingsManager()
