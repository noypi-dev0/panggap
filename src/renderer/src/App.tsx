import { useEffect, useState, useRef } from 'react'
import Settings from './components/Settings'
import Suggestion from './components/Suggestion'
import Versions from './components/Versions'
import './assets/main.css'

function App(): React.JSX.Element {
  // Initialize route state with current hash
  const [route, setRoute] = useState<string>(() => {
    const hash = window.location.hash.slice(1)
    return hash
  })

  // Use ref to track current route for comparison
  const routeRef = useRef(route)
  routeRef.current = route

  useEffect(() => {
    // Get route from URL hash
    const hash = window.location.hash.slice(1) // Remove the '#'
    setRoute(hash)

    // Listen for hash changes
    const handleHashChange = (): void => {
      const newHash = window.location.hash.slice(1)
      setRoute(newHash)
    }

    window.addEventListener('hashchange', handleHashChange)

    // Also check for hash immediately after component mounts
    // This handles cases where the hash is set before the component is ready
    const checkHashTimeout = setTimeout(() => {
      const currentHash = window.location.hash.slice(1)
      if (currentHash !== routeRef.current) {
        setRoute(currentHash)
      }
    }, 100)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      clearTimeout(checkHashTimeout)
    }
  }, [])

  // Route to different components based on hash
  switch (route) {
    case 'suggestion':
      return <Suggestion />
    case 'versions':
      return <Versions />
    default:
      return <Settings />
  }
}

export default App
