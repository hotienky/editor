import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react'
import Editor from '../editor'
import type { IEditorData, IEditorOption } from '../editor/interface/Editor'
import type { IElement } from '../editor/interface/Element'

export interface CanvasEditorProps {
  data: IEditorData | IElement[]
  options?: IEditorOption
  className?: string
  style?: React.CSSProperties
  onInit?: (instance: Editor) => void
  onContentChange?: () => void
}

export interface CanvasEditorRef {
  getInstance: () => Editor | null
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  (props, ref) => {
    const { data, options, className, style, onInit, onContentChange } = props
    const containerRef = useRef<HTMLDivElement>(null)
    const instanceRef = useRef<Editor | null>(null)

    useImperativeHandle(ref, () => ({
      getInstance: () => instanceRef.current
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const instance = new Editor(containerRef.current, data, options)
      instanceRef.current = instance

      if (onContentChange) {
        instance.listener.contentChange = onContentChange
      }

      if (onInit) {
        onInit(instance)
      }

      return () => {
        instance.destroy()
        instanceRef.current = null
      }
    }, [])

    return (
      <div
        ref={containerRef}
        className={`canvas-editor ${className || ''}`.trim()}
        style={{
          width: '100%',
          height: '100%',
          ...style
        }}
      />
    )
  }
)

CanvasEditor.displayName = 'CanvasEditor'

export default CanvasEditor
