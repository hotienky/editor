export class WebsocketProvider {
  constructor() {
    this.awareness = {
      getStates: () => new Map(),
      setLocalState: () => {},
    }
  }
  connect() {}
  disconnect() {}
  on() {}
  off() {}
}
