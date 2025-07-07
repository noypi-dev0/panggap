export interface AppSettings {
  apiKey?: string
  model: string
  systemPrompt: string
  hotkey?: string
}

export interface SuggestionData {
  originalText: string
  enhancedText: string
  isError?: boolean
}
