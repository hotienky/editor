import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { mountKindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

export const KindyEditorReact = forwardRef(function KindyEditorReact(props, ref) {
  const containerRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clean up previous instance if any
    if (instanceRef.current) {
      instanceRef.current.unmount()
      instanceRef.current = null
    }

    // Mount KindyEditor into container DOM element
    const instance = mountKindyEditor(containerRef.current, {
      locale: 'vi-VN',
      ...props,
    })

    instanceRef.current = instance

    return () => {
      if (instanceRef.current) {
        instanceRef.current.unmount()
        instanceRef.current = null
      }
    }
  }, [props.editorKey])

  // Expose instance methods to parent via React ref
  useImperativeHandle(ref, () => ({
    getApp: () => instanceRef.current?.app,
  }), [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
})
