import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Eye, EyeOff, Loader2, RotateCcw } from 'lucide-react'

// Detect if we're on macOS
const isMacOS = navigator.userAgent.includes('Mac')

// Convert hotkey string to display format with macOS symbols
const formatHotkeyForDisplay = (hotkey: string): string => {
  if (!isMacOS) return hotkey

  return hotkey
    .replace(/CommandOrControl/g, '⌘')
    .replace(/Command/g, '⌘')
    .replace(/Alt/g, '⌥')
    .replace(/Control/g, '⌃')
    .replace(/Shift/g, '⇧')
}

function Settings(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [hotkey, setHotkey] = useState('CommandOrControl+Shift+E')
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hotkeyInputRef = useRef<HTMLInputElement>(null)

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const settings = await window.api.settings.load()

      setApiKey(settings.apiKey || '')
      setSelectedModel(settings.model)
      setSystemPrompt(settings.systemPrompt)
      setHotkey(settings.hotkey || 'CommandOrControl+Shift+E')
    } catch (err) {
      console.error('Failed to load settings:', err)
      setError('Failed to load settings. Using defaults.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    try {
      setIsSaving(true)
      setError(null)

      await window.api.settings.save({
        apiKey: apiKey.trim() || undefined,
        model: selectedModel,
        systemPrompt: systemPrompt,
        hotkey: hotkey || 'CommandOrControl+Shift+E'
      })

      // Close window after successful save
      window.api.window.close()
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = (): void => {
    window.api.window.close()
  }

  const handleHotkeyCapture = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.preventDefault()

    // Allow escape to cancel
    if (e.key === 'Escape') {
      setIsCapturingHotkey(false)
      hotkeyInputRef.current?.blur()
      return
    }

    const keys: string[] = []
    if (e.ctrlKey || e.metaKey) keys.push(e.metaKey ? 'Command' : 'Control')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')

    // Use e.code to get the physical key, not the composed character
    // This prevents issues with Option+Letter creating special characters on macOS
    let mainKey = ''
    if (e.code.startsWith('Key')) {
      // KeyA, KeyB, etc. -> A, B, etc.
      mainKey = e.code.slice(3)
    } else if (e.code.startsWith('Digit')) {
      // Digit1, Digit2, etc. -> 1, 2, etc.
      mainKey = e.code.slice(5)
    } else if (e.code === 'Space') {
      mainKey = 'Space'
    } else if (e.code === 'Enter') {
      mainKey = 'Return'
    } else if (e.code === 'Backspace') {
      mainKey = 'Backspace'
    } else if (e.code === 'Tab') {
      mainKey = 'Tab'
    } else if (e.code.startsWith('F') && e.code.length <= 3) {
      // F1, F2, etc.
      mainKey = e.code
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      mainKey = e.code.replace('Arrow', '')
    } else {
      // For other special keys, use the key name
      mainKey = e.key
    }

    // Only add main key if it's not a modifier key
    const modifierCodes = [
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'ShiftLeft',
      'ShiftRight',
      'MetaLeft',
      'MetaRight'
    ]
    if (mainKey && !modifierCodes.includes(e.code)) {
      keys.push(mainKey)
    }

    // Require at least one modifier + one main key
    const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey
    const hasMainKey = mainKey && !modifierCodes.includes(e.code)

    if (hasModifier && hasMainKey && keys.length >= 2) {
      const newHotkey = keys.join('+').replace('Command', 'CommandOrControl')
      setHotkey(newHotkey)
      setIsCapturingHotkey(false)
      hotkeyInputRef.current?.blur()
    }
  }

  const startHotkeyCapture = (): void => {
    setIsCapturingHotkey(true)
    // Focus the input field so it can capture key events
    setTimeout(() => {
      hotkeyInputRef.current?.focus()
    }, 0)
  }

  const resetSystemPrompt = async (): Promise<void> => {
    try {
      const defaults = await window.api.settings.getDefaults()
      setSystemPrompt(defaults.systemPrompt)
    } catch (error) {
      console.error('Failed to get default system prompt:', error)
      // Fallback - could show an error message to user
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading settings...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Panggap Settings</CardTitle>
            <CardDescription>
              Configure your AI-powered text enhancement preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            {/* API Key Section */}
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-sm font-medium">
                OpenAI API Key
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="shrink-0"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and never shared
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model-select" className="text-sm font-medium">
                AI Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the AI model that best fits your needs and budget
              </p>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="system-prompt" className="text-sm font-medium">
                  System Prompt
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetSystemPrompt}
                  className="h-8 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to Default
                </Button>
              </div>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Customize how the AI enhances your text..."
                className="min-h-32 font-mono text-sm"
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Customize the AI&apos;s behavior and writing style preferences
              </p>
            </div>

            {/* Global Hotkey */}
            <div className="space-y-2">
              <Label htmlFor="hotkey" className="text-sm font-medium">
                Global Hotkey
              </Label>
              <div className="flex gap-2">
                <Input
                  ref={hotkeyInputRef}
                  id="hotkey"
                  value={
                    isCapturingHotkey
                      ? 'Press your desired key combination...'
                      : formatHotkeyForDisplay(hotkey)
                  }
                  readOnly
                  placeholder="Click 'Set Hotkey' and press keys"
                  className="flex-1 font-mono"
                  onKeyDown={isCapturingHotkey ? handleHotkeyCapture : undefined}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={startHotkeyCapture}
                  className="shrink-0"
                  disabled={isCapturingHotkey}
                >
                  {isCapturingHotkey ? 'Press Keys...' : 'Set Hotkey'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press a combination like {isMacOS ? '⌘⇧E' : 'Cmd+Shift+E'} to set your global
                hotkey. Press Escape to cancel.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Settings
