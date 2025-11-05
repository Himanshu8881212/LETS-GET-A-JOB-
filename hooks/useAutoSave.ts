import { useEffect, useRef } from 'react'

interface UseAutoSaveOptions {
  key: string
  data: any
  delay?: number
}

export function useAutoSave({ key, data, delay = 1000 }: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch (error) {
        console.error('Failed to auto-save:', error)
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [key, data, delay])
}

export function loadSavedData<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load saved data:', error)
  }
  return defaultValue
}

export function clearSavedData(key: string) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear saved data:', error)
  }
}

