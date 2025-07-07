import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { SuggestionData } from '../shared/types'

export class SuggestionWindow {
  private window: BrowserWindow | null = null
  private closeTimeout: NodeJS.Timeout | null = null
  private currentData: SuggestionData | null = null

  async showLoading(): Promise<void> {
    // Create and initialize window if needed
    if (!this.window || this.window.isDestroyed()) {
      this.window = this.createWindow()
      await this.loadRenderer()
    }

    // Clear any existing data to show loading state
    this.currentData = null

    // Position window (in case user moved between monitors)
    this.positionWindow()

    // Show the window immediately
    this.window.show()
    this.window.focus()

    // Set auto-close timeout (60 seconds)
    this.setAutoCloseTimeout()
  }

  async show(data: SuggestionData): Promise<void> {
    // Store data for retrieval
    this.currentData = data

    // Create and initialize window if needed
    if (!this.window || this.window.isDestroyed()) {
      this.window = this.createWindow()
      await this.loadRenderer()
    }

    // Position window (in case user moved between monitors)
    this.positionWindow()

    // Show the window
    this.window.show()
    this.window.focus()

    // Set auto-close timeout (60 seconds)
    this.setAutoCloseTimeout()
  }

  // Method to get current data (for IPC calls)
  getCurrentData(): SuggestionData | null {
    return this.currentData
  }

  async showError(errorMessage: string): Promise<void> {
    // Store error data with isError flag
    this.currentData = {
      originalText: '',
      enhancedText: errorMessage,
      isError: true
    }

    // Create and initialize window if needed
    if (!this.window || this.window.isDestroyed()) {
      this.window = this.createWindow()
      await this.loadRenderer()
    }

    // Position window
    this.positionWindow()

    // Show the window
    this.window.show()
    this.window.focus()

    // Set auto-close timeout (shorter for errors)
    this.setAutoCloseTimeout()
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide()
    }
    this.clearAutoCloseTimeout()
    // Clear data when window is hidden
    this.currentData = null
  }

  private createWindow(): BrowserWindow {
    const window = new BrowserWindow({
      width: 480,
      height: 280,
      resizable: false,
      maximizable: false,
      minimizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      autoHideMenuBar: true,
      title: 'Panggap Suggestion',
      titleBarStyle: 'hidden',
      frame: false,
      backgroundColor: '#00000000',
      transparent: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // Handle window events
    window.on('closed', () => {
      this.window = null
      this.clearAutoCloseTimeout()
    })

    // Handle external links
    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Close window when user switches away (Alt+Tab, etc.)
    window.on('blur', () => {
      // Small delay to avoid closing during quick focus changes
      setTimeout(() => {
        if (this.window && !this.window.isDestroyed() && !this.window.isFocused()) {
          this.hide()
        }
      }, 100)
    })

    return window
  }

  private positionWindow(): void {
    if (!this.window) return

    try {
      // Get the primary display (where dock/taskbar is)
      const primaryDisplay = screen.getPrimaryDisplay()

      // Calculate center position on primary display
      const windowBounds = this.window.getBounds()
      const x = primaryDisplay.workArea.x + (primaryDisplay.workArea.width - windowBounds.width) / 2
      const y =
        primaryDisplay.workArea.y + (primaryDisplay.workArea.height - windowBounds.height) / 2

      this.window.setPosition(Math.floor(x), Math.floor(y))
    } catch {
      // Fallback to center screen
      this.window.center()
    }
  }

  private async loadRenderer(): Promise<void> {
    if (!this.window) return

    try {
      // Load the same renderer as other windows
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        await this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#suggestion`)
      } else {
        await this.window.loadFile(join(__dirname, '../renderer/index.html'), {
          hash: 'suggestion'
        })
      }
    } catch {
      // Silent error handling
    }
  }

  private setAutoCloseTimeout(): void {
    this.clearAutoCloseTimeout()

    // Auto-close after 60 seconds if no action (longer timeout)
    this.closeTimeout = setTimeout(() => {
      this.hide()
    }, 60000)
  }

  private clearAutoCloseTimeout(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout)
      this.closeTimeout = null
    }
  }

  // Check if window is currently visible
  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed() && this.window.isVisible()
  }

  // Get window for IPC identification
  getWindow(): BrowserWindow | null {
    return this.window
  }
}

export const suggestionWindow = new SuggestionWindow()
