import { clipboard } from 'electron'
import * as robot from 'robotjs'

class TextCaptureManager {
  private originalClipboard: string | null = null

  /**
   * Capture text from the currently active text field
   * Uses keyboard automation: Cmd+A → Cmd+C → capture from clipboard
   */
  async captureActiveText(): Promise<string | null> {
    try {
      // Starting text capture

      // Add timeout to prevent hanging
      return await Promise.race([
        this.performTextCapture(),
        new Promise<string | null>((_, reject) =>
          setTimeout(() => reject(new Error('Text capture timeout (5 seconds)')), 5000)
        )
      ])
    } catch (error) {
      console.error('Text capture failed:', error)
      // Always try to restore clipboard on error
      await this.restoreClipboard()

      // Convert timeout errors to generic capture error
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('COULD_NOT_CAPTURE_TEXT')
      }

      // Re-throw the error so the caller can handle it appropriately
      throw error
    }
  }

  private async performTextCapture(): Promise<string | null> {
    // Step 1: Save original clipboard content
    await this.preserveClipboard()

    // Step 2: Select all text in active field
    await this.selectAllText()

    // Step 3: Copy selected text to clipboard
    await this.copyToClipboard()

    // Step 4: Capture text from clipboard
    const capturedText = await this.getClipboardText()

    // Step 5: Check if robotjs operations actually worked
    // If accessibility permissions are missing, robotjs operations silently fail
    // and the clipboard won't change from the original content
    if (process.platform === 'darwin') {
      const originalEmpty = !this.originalClipboard || this.originalClipboard.trim() === ''
      const capturedEmpty = !capturedText || capturedText.trim() === ''

      // Case 1: Clipboard didn't change from original (robotjs operations had no effect)
      if (capturedText === this.originalClipboard) {
        throw new Error('COULD_NOT_CAPTURE_TEXT')
      }

      // Case 2: Both original and captured are empty
      // This is ambiguous - could be no text to capture, or permission issue
      // But since user pressed hotkey, they likely expect to capture something
      if (originalEmpty && capturedEmpty) {
        throw new Error('COULD_NOT_CAPTURE_TEXT')
      }
    }

    // Step 6: Deselect the text (move cursor to end)
    await this.deselectText()

    // Step 7: Restore original clipboard
    await this.restoreClipboard()

    // Text capture completed
    return capturedText
  }

  /**
   * Save current clipboard content
   */
  private async preserveClipboard(): Promise<void> {
    try {
      this.originalClipboard = clipboard.readText()
    } catch (error) {
      console.warn('Failed to preserve clipboard:', error)
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
        // Clipboard restored
      }
    } catch (error) {
      console.warn('Failed to restore clipboard:', error)
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

    // Small delay to ensure selection completes
    await this.delay(50)
  }

  /**
   * Send "Copy" command to active application
   */
  private async copyToClipboard(): Promise<void> {
    // Use robotjs to send Cmd+C (macOS) or Ctrl+C (Windows/Linux)
    if (process.platform === 'darwin') {
      robot.keyTap('c', ['command'])
    } else {
      robot.keyTap('c', ['control'])
    }

    // Small delay to ensure clipboard is updated
    await this.delay(100)
  }

  /**
   * Deselect text by moving cursor to end
   */
  private async deselectText(): Promise<void> {
    // Move cursor to end of text to deselect
    robot.keyTap('right')

    // Small delay to ensure cursor movement completes
    await this.delay(30)
  }

  /**
   * Get text from clipboard
   */
  private async getClipboardText(): Promise<string | null> {
    try {
      const text = clipboard.readText()

      // Validate captured text
      if (!text || text.trim().length === 0) {
        // No text found in clipboard
        return null
      }

      // Don't process extremely long text (> 50KB)
      if (text.length > 50000) {
        // Text too long, skipping enhancement
        return null
      }

      return text
    } catch (error) {
      console.error('Failed to read clipboard:', error)
      return null
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Test if text capture is available on this system
   */
  async isTextCaptureAvailable(): Promise<boolean> {
    try {
      // Test clipboard access
      clipboard.readText()

      // Test robotjs - it should be available if the app started correctly
      // since it's a native dependency
      return true
    } catch (error) {
      console.error('Text capture not available:', error)
      return false
    }
  }
}

export const textCaptureManager = new TextCaptureManager()
