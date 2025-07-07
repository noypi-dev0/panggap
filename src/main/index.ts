import { app, shell, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon-400x400.png?asset'
import trayIcon from '../../resources/icon-22x22.png?asset'
import { settingsManager } from './settings'
import { shortcutManager } from './shortcuts'
import { textEnhancer } from './enhance'
import { suggestionWindow } from './suggestion-window'
import { textReplacer } from './text-replacement'

let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null

function createSettingsWindow(): void {
  // Don't create multiple settings windows
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  // Create the settings window
  settingsWindow = new BrowserWindow({
    width: 650,
    height: 480,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    title: 'Panggap Settings',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the same renderer as main window
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show window when ready
  settingsWindow.on('ready-to-show', () => {
    settingsWindow?.show()
  })
}

function createSystemTray(): void {
  try {
    // Creating system tray

    // Use pre-resized 22x22 tray icon for optimal performance
    tray = new Tray(trayIcon)
    // Tray created successfully

    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Settings',
        click: () => {
          createSettingsWindow()
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        click: () => {
          // Quit clicked
          app.quit()
        }
      }
    ])

    tray.setContextMenu(contextMenu)
    tray.setToolTip('Panggap - AI Text Enhancement')
    // System tray setup complete
  } catch (error) {
    console.error('Failed to create system tray:', error)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Hide dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize global shortcuts with current settings
  try {
    const settings = await settingsManager.loadSettings()
    const success = await shortcutManager.initializeFromSettings(settings)
    if (success) {
      // Global shortcuts initialized successfully
    } else {
      console.warn('Failed to register global shortcuts - functionality may be limited')
    }
  } catch (error) {
    console.error('Failed to initialize global shortcuts:', error)
  }

  // IPC test
  ipcMain.on('ping', () => {
    // Ping received
  })

  // Settings IPC handlers
  ipcMain.handle('settings:save', async (_, settings) => {
    try {
      // Load current settings to check if API key changed
      const currentSettings = await settingsManager.loadSettings()

      await settingsManager.saveSettings(settings)

      // Clear OpenAI client cache only if API key changed
      if (settings.apiKey && settings.apiKey !== currentSettings.apiKey) {
        const { openaiClient } = await import('./ai/openai')
        openaiClient.clearClient()
      }

      // Update global shortcuts when settings change
      if (settings.hotkey) {
        const shortcutSuccess = await shortcutManager.updateShortcut(settings.hotkey)
        if (!shortcutSuccess) {
          console.warn(`Failed to register global shortcut: ${settings.hotkey}`)
          // Don't throw error - settings were saved successfully
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  })

  ipcMain.handle('settings:load', async () => {
    try {
      return await settingsManager.loadSettings()
    } catch (error) {
      console.error('Failed to load settings:', error)
      throw error
    }
  })

  ipcMain.handle('settings:clear', async () => {
    try {
      await settingsManager.clearSettings()
      return { success: true }
    } catch (error) {
      console.error('Failed to clear settings:', error)
      throw error
    }
  })

  ipcMain.handle('settings:getDefaults', async () => {
    try {
      return settingsManager.getDefaultSettings()
    } catch (error) {
      console.error('Failed to get default settings:', error)
      throw error
    }
  })

  // Enhancement IPC handlers
  ipcMain.handle('enhance:process', async () => {
    try {
      await textEnhancer.enhanceActiveText()
      return { success: true }
    } catch (error) {
      console.error('Failed to enhance text:', error)
      throw error
    }
  })

  // Permission status IPC handler
  ipcMain.handle('permissions:getStatus', async () => {
    try {
      return await shortcutManager.getStatus()
    } catch (error) {
      console.error('Failed to get permission status:', error)
      throw error
    }
  })

  // Get suggestion data IPC handler
  ipcMain.handle('suggestion:getData', async () => {
    return suggestionWindow.getCurrentData()
  })

  // Suggestion IPC handlers
  ipcMain.handle('suggestion:accept', async (_, enhancedText: string) => {
    // Hide suggestion window to remove focus
    suggestionWindow.hide()

    // Minimal wait before text replacement
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Replace text in active application
    await textReplacer.replaceActiveText(enhancedText)

    return { success: true }
  })

  // Window management IPC handlers
  ipcMain.on('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
  })

  ipcMain.on('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
  })

  // Create system tray instead of window
  createSystemTray()

  // Remove automatic window creation - app runs in tray only
  // createWindow()

  app.on('activate', function () {
    // On macOS, don't recreate windows automatically
    // App lives in system tray
  })
})

// Don't quit when all windows are closed - app lives in system tray
app.on('window-all-closed', () => {
  // App continues running in system tray
  // Only quit via tray menu
})

// Clean up global shortcuts when app is quitting
app.on('before-quit', () => {
  shortcutManager.cleanup()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
