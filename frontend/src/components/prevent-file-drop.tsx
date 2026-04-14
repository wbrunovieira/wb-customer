'use client'

import { useEffect } from 'react'

export default function PreventFileDrop() {
  useEffect(() => {
    function prevent(e: DragEvent) {
      e.preventDefault()
      e.stopPropagation()
    }
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  return null
}
