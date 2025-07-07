import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Check } from 'lucide-react'
import type { SuggestionData } from '../../../shared/types'

function Suggestion(): React.JSX.Element {
  const [data, setData] = useState<SuggestionData | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    // Fetch suggestion data directly from main process
    const loadData = async (): Promise<void> => {
      try {
        const suggestionData = await window.api.suggestion.getData()
        setData(suggestionData) // Set data even if null (for loading state)
      } catch (error) {
        console.error('React: Error loading data:', error)
      }
    }

    // Load data immediately
    loadData()

    // Poll for data updates every 100ms
    const pollInterval = setInterval(loadData, 100)

    // Handle keyboard shortcuts - only ESC to close
    const handleKeyDown = async (event: KeyboardEvent): Promise<void> => {
      if (event.key === 'Escape' && !isAccepting) {
        // Close suggestion window (implicit reject)
        window.api.window.close()
      }
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      clearInterval(pollInterval)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAccepting])

  const handleAccept = async (): Promise<void> => {
    if (!data || isAccepting) return

    try {
      setIsAccepting(true)
      await window.api.suggestion.accept(data.enhancedText)
      setIsAccepting(false)
    } catch {
      setIsAccepting(false)
    }
  }

  if (!data) {
    return (
      <div
        className="min-h-screen bg-background p-8 flex items-center justify-center"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <Card
          className="w-full max-w-md"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <CardContent className="flex items-center justify-center py-8 px-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading suggestion...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-background p-8 flex items-center justify-center"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <Card
        className="w-full max-w-md"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <CardContent className="p-6 space-y-4">
          {/* Enhanced text display */}
          <div>
            <Textarea
              value={data.enhancedText}
              readOnly
              className="resize-none bg-muted/50 border-muted text-sm min-h-16 max-h-48"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            />
          </div>

          {/* Action button - only show for non-error suggestions */}
          {!data.isError && (
            <div className="flex justify-center">
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="px-8"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Replacing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Error message footer */}
          {data.isError && (
            <div className="text-center text-xs text-muted-foreground">
              Press ESC to close
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Suggestion
