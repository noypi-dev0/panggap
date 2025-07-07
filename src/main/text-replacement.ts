import { clipboard } from 'electron'
import * as robot from 'robotjs'

export class TextReplacer {
  private originalClipboard: string | null = null

  /**
   * Replace text in the currently active text field
   * Uses keyboard automation: preserve clipboard → select all → paste → restore clipboard
   */
  async replaceActiveText(newText: string): Promise<void> {
    try {
      // Step 1: Save original clipboard content
      await this.preserveClipboard()

      // Step 2: Quick click at current mouse position to ensure focus
      const mousePos = robot.getMousePos()
      robot.moveMouse(mousePos.x, mousePos.y)
      robot.mouseClick()
      await this.delay(50)

      // Step 3: Copy new text to clipboard
      clipboard.writeText(newText)

      // Step 4: Select all text in active field
      await this.selectAllText()

      // Step 5: Paste the new text
      await this.pasteText()

      // Step 6: Restore original clipboard
      await this.restoreClipboard()
    } catch (error) {
      // Always try to restore clipboard on error
      await this.restoreClipboard()
      throw error
    }
  }

  /**
   * Save current clipboard content
   */
  private async preserveClipboard(): Promise<void> {
    try {
      this.originalClipboard = clipboard.readText()
    } catch {
      this.originalClipboard = null
    }
  }

  /**
   * Restore original clipboard content
   */
  private async restoreClipboard(): Promise<void> {
    try {
      if (this.originalClipboard !== null) {
        clipboard.writeText(this.originalClipboard)
      }
    } catch {
      // Silent error handling
    }
  }

  /**
   * Send "Select All" command to active application
   */
  private async selectAllText(): Promise<void> {
    // Use robotjs to send Cmd+A (macOS) or Ctrl+A (Windows/Linux)
    if (process.platform === 'darwin') {
      robot.keyTap('a', ['command'])
    } else {
      robot.keyTap('a', ['control'])
    }

    // Minimal delay for selection
    await this.delay(50)
  }

  /**
   * Send "Paste" command to active application
   */
  private async pasteText(): Promise<void> {
    // Use robotjs to send Cmd+V (macOS) or Ctrl+V (Windows/Linux)
    if (process.platform === 'darwin') {
      robot.keyTap('v', ['command'])
    } else {
      robot.keyTap('v', ['control'])
    }

    // Minimal delay for paste
    await this.delay(50)
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Test if text replacement is available on this system
   */
  async isTextReplacementAvailable(): Promise<boolean> {
    try {
      // Test clipboard access
      clipboard.readText()
      return true
    } catch {
      return false
    }
  }
}

export const textReplacer = new TextReplacer()
