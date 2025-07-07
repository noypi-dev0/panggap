import { globalShortcut, shell } from 'electron'
import type { AppSettings } from '../shared/types'
import { textEnhancer } from './enhance'

class ShortcutManager {
  private currentShortcut: string | null = null
  private isRegistered = false

  /**
   * Request macOS accessibility permissions
   */
  private async requestMacOSPermissions(): Promise<void> {
    if (process.platform !== 'darwin') {
      return
    }

    try {
      // Open System Preferences to Privacy & Security > Accessibility
      await shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
      )
      // Opened macOS accessibility settings
    } catch (error) {
      console.error('Failed to open macOS accessibility settings:', error)
    }
  }

  /**
   * Register a global shortcut for text enhancement
   */
  async registerShortcut(hotkey: string): Promise<boolean> {
    try {
      // Validate hotkey format
      if (!hotkey || typeof hotkey !== 'string') {
        console.error('Invalid hotkey format:', hotkey)
        return false
      }

      // Unregister any existing shortcut first
      this.unregisterShortcut()

      // Check if the shortcut is already registered by another application
      if (globalShortcut.isRegistered(hotkey)) {
        console.error(`Global shortcut ${hotkey} is already registered by another application`)
        return false
      }

      // Register the new shortcut
      const success = globalShortcut.register(hotkey, () => {
        // Global shortcut pressed
        // Handle async callback - don't wait for completion
        this.handleShortcutPressed().catch((error) => {
          console.error('Error handling shortcut press:', error)
        })
      })

      if (success) {
        this.currentShortcut = hotkey
        this.isRegistered = true
        // Successfully registered global shortcut
        return true
      } else {
        console.error(`Failed to register global shortcut: ${hotkey}`)

        // On macOS, shortcut registration might fail due to accessibility permissions
        if (process.platform === 'darwin') {
          // Shortcut registration failed on macOS - might need accessibility permissions
          await this.requestMacOSPermissions()
        }

        return false
      }
    } catch (error) {
      console.error('Error registering global shortcut:', error)
      return false
    }
  }

  /**
   * Unregister the current global shortcut
   */
  unregisterShortcut(): void {
    try {
      if (this.currentShortcut && this.isRegistered) {
        globalShortcut.unregister(this.currentShortcut)
        // Unregistered global shortcut
        this.currentShortcut = null
        this.isRegistered = false
      }
    } catch (error) {
      console.error('Error unregistering global shortcut:', error)
      // Force reset state even if unregister failed
      this.currentShortcut = null
      this.isRegistered = false
    }
  }

  /**
   * Update the registered shortcut (unregister old, register new)
   */
  async updateShortcut(newHotkey: string): Promise<boolean> {
    return await this.registerShortcut(newHotkey)
  }

  /**
   * Check if a shortcut is currently registered
   */
  isShortcutRegistered(): boolean {
    return this.isRegistered
  }

  /**
   * Get the currently registered shortcut
   */
  getCurrentShortcut(): string | null {
    return this.currentShortcut
  }

  /**
   * Handle when the global shortcut is pressed
   * This triggers the complete text enhancement flow
   */
  private async handleShortcutPressed(): Promise<void> {
    // Text enhancement shortcut pressed

    try {
      // Use the textEnhancer to handle the complete flow
      await textEnhancer.enhanceActiveText()
    } catch (error) {
      console.error('Error during text enhancement:', error)
    }
  }

  /**
   * Initialize shortcuts with settings
   */
  async initializeFromSettings(settings: AppSettings): Promise<boolean> {
    const hotkey = settings.hotkey || 'CommandOrControl+Shift+E'
    return await this.registerShortcut(hotkey)
  }

  /**
   * Get detailed status information about shortcuts
   */
  async getStatus(): Promise<{
    isRegistered: boolean
    currentShortcut: string | null
    platform: string
  }> {
    return {
      isRegistered: this.isRegistered,
      currentShortcut: this.currentShortcut,
      platform: process.platform
    }
  }

  /**
   * Clean up all shortcuts (called on app quit)
   */
  cleanup(): void {
    try {
      this.unregisterShortcut()
      globalShortcut.unregisterAll()
      // All global shortcuts cleaned up
    } catch (error) {
      console.error('Error during shortcut cleanup:', error)
    }
  }
}

export const shortcutManager = new ShortcutManager()
