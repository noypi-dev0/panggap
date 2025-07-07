import OpenAI from 'openai'
import { settingsManager } from '../settings'

export class OpenAIClient {
  private client: OpenAI | null = null

  private async initializeClient(): Promise<OpenAI> {
    if (this.client) {
      return this.client
    }

    const settings = await settingsManager.loadSettings()
    if (!settings.apiKey) {
      throw new Error('OpenAI API key is not configured')
    }

    this.client = new OpenAI({
      apiKey: settings.apiKey
    })

    return this.client
  }

  async enhanceText(text: string): Promise<string> {
    if (!text.trim()) {
      throw new Error('No text provided to enhance')
    }

    const settings = await settingsManager.loadSettings()
    const client = await this.initializeClient()

    try {
      // Add timeout to prevent hanging
      const completion = (await Promise.race([
        client.chat.completions.create({
          model: settings.model,
          messages: [
            {
              role: 'system',
              content: settings.systemPrompt
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI API timeout (30 seconds)')), 30000)
        )
      ])) as OpenAI.Chat.Completions.ChatCompletion

      const enhancedText = completion.choices[0]?.message?.content
      if (!enhancedText) {
        throw new Error('No response from OpenAI')
      }

      return enhancedText.trim()
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error(
        `Failed to enhance text: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Clear the client instance when settings change
  clearClient(): void {
    this.client = null
  }
}

export const openaiClient = new OpenAIClient()
