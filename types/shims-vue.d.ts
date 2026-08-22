declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

declare module 'mammoth/mammoth.browser' {
  export interface MammothMessage { type: string; message: string }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: Record<string, unknown>): Promise<{ value: string; messages: MammothMessage[] }>
}

