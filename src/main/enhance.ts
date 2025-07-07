import { textCaptureManager } from './capture'
import { openaiClient } from './ai/openai'
import { suggestionWindow } from './suggestion-window'

export class TextEnhancer {
  private isProcessing = false

  async enhanceActiveText(): Promise<void> {
    if (this.isProcessing) {
      // Enhancement already in progress, skipping
      await suggestionWindow.showLoading()
      return
    }

    this.isProcessing = true

    try {
      const originalText = await textCaptureManager.captureActiveText()

      if (!originalText || !originalText.trim()) {
        // No text captured, nothing to enhance
        await suggestionWindow.showError(
          'No text found to enhance.\n\nPlease:\n• Click in a text field\n• Type some text\n• Press the hotkey again'
        )
        return
      }

      // Text captured successfully - NOW show loading window
      await suggestionWindow.showLoading()

      // Send to OpenAI for enhancement
      const enhancedText = await openaiClient.enhanceText(originalText)

      // Update suggestion window with results
      await suggestionWindow.show({
        originalText,
        enhancedText
      })
    } catch (error) {
      console.error('Text enhancement failed:', error)

      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message === 'COULD_NOT_CAPTURE_TEXT') {
          // Show generic error message about text capture and permissions
          await suggestionWindow.showError(
            'Could not capture text from the active window.\n\n' +
            'Please check that:\n' +
            '• A text field is in focus (click in a text field first)\n' +
            '• Accessibility permissions are granted for Panggap\n' +
            '• The active app allows text selection\n\n' +
            'On macOS, you can check accessibility permissions in:\n' +
            'System Preferences → Security & Privacy → Accessibility'
          )
          
          // Don't automatically open System Preferences - let user read the message first
          // They can manually open it if needed
          return
        }
      }

      // Show generic error for other types of failures
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await suggestionWindow.showError(errorMessage)

      // Enhancement failed - error logged by caller
    } finally {
      this.isProcessing = false
    }
  }

  isEnhancing(): boolean {
    return this.isProcessing
  }
}
export const textEnhancer = new TextEnhancer()
