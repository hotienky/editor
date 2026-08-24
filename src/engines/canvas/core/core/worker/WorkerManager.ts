import { version } from '../../version'
import { Draw } from '../draw/Draw'
import { ICatalog } from '../../interface/Catalog'
import { IEditorResult } from '../../interface/Editor'
import { IGetValueOption } from '../../interface/Draw'
import { deepClone } from '../../utils'

export class WorkerManager {
  private draw: Draw
  private wordCountWorker: Worker | null = null
  private catalogWorker: Worker | null = null
  private groupWorker: Worker | null = null
  private valueWorker: Worker | null = null

  constructor(draw: Draw) {
    this.draw = draw
    try {
      if (typeof Worker !== 'undefined') {
        this.wordCountWorker = new Worker(new URL('./works/wordCount.ts', import.meta.url), { type: 'module' })
        this.catalogWorker = new Worker(new URL('./works/catalog.ts', import.meta.url), { type: 'module' })
        this.groupWorker = new Worker(new URL('./works/group.ts', import.meta.url), { type: 'module' })
        this.valueWorker = new Worker(new URL('./works/value.ts', import.meta.url), { type: 'module' })
      }
    } catch {
      // Fallback in environments without Web Worker support
    }
  }

  public getWordCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.wordCountWorker) {
        // Simple fallback
        const elementList = this.draw.getOriginalMainElementList()
        let count = 0
        elementList.forEach(el => { count += (el.value || '').length })
        return resolve(count)
      }

      this.wordCountWorker.onmessage = evt => {
        resolve(evt.data)
      }

      this.wordCountWorker.onerror = evt => {
        reject(evt)
      }

      const elementList = this.draw.getOriginalMainElementList()
      this.wordCountWorker.postMessage(elementList)
    })
  }

  public getCatalog(): Promise<ICatalog | null> {
    return new Promise((resolve, reject) => {
      if (!this.catalogWorker) {
        return resolve(null)
      }

      this.catalogWorker.onmessage = evt => {
        resolve(evt.data)
      }

      this.catalogWorker.onerror = evt => {
        reject(evt)
      }

      const elementList = this.draw.getOriginalMainElementList()
      const positionList = this.draw.getPosition().getOriginalMainPositionList()
      this.catalogWorker.postMessage({
        elementList,
        positionList
      })
    })
  }

  public getGroupIds(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.groupWorker) {
        return resolve([])
      }

      this.groupWorker.onmessage = evt => {
        resolve(evt.data)
      }

      this.groupWorker.onerror = evt => {
        reject(evt)
      }

      const elementList = this.draw.getOriginalMainElementList()
      this.groupWorker.postMessage(elementList)
    })
  }

  public getValue(options?: IGetValueOption): Promise<IEditorResult> {
    return new Promise((resolve, reject) => {
      if (!this.valueWorker) {
        return resolve({
          version,
          data: this.draw.getOriginValue(options) as any,
          options: deepClone(this.draw.getOptions())
        })
      }

      this.valueWorker.onmessage = evt => {
        resolve({
          version,
          data: evt.data,
          options: deepClone(this.draw.getOptions())
        })
      }

      this.valueWorker.onerror = evt => {
        reject(evt)
      }

      this.valueWorker.postMessage({
        data: this.draw.getOriginValue(options),
        options
      })
    })
  }

  public destroy() {
    this.wordCountWorker?.terminate()
    this.catalogWorker?.terminate()
    this.groupWorker?.terminate()
    this.valueWorker?.terminate()
  }
}
