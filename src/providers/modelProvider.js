import {
  checkOllamaConnection,
  getOnDeviceRuntimeInfo,
  loadOnDeviceModel,
  runOnDeviceChat,
  streamOllamaChat,
  unloadOnDeviceModel,
} from '../nativeBridge.js';

export class OllamaProvider {
  constructor(url = 'http://localhost:11434') { this.url = url; this.kind = 'ollama'; }
  async getStatus() { const result = await checkOllamaConnection(this.url); return { ...result, kind: this.kind }; }
  async loadModel() { return { loaded: true }; }
  async stream({ model, messages, signal, onToken }) { return streamOllamaChat({ url: this.url, model, messages, signal, onToken }); }
  async stop() { return { stopped: true }; }
  async unloadModel() { return { unloaded: true }; }
}

export class OnDeviceProvider {
  constructor() { this.kind = 'on-device'; }
  async getStatus() { return { ...(await getOnDeviceRuntimeInfo()), kind: this.kind }; }
  async loadModel(path) { if (!path) throw new Error('Select a downloaded offline model first.'); if (typeof path !== 'string' || !path.startsWith('/')) throw new Error(`Invalid Android runtime model path: ${path}`); try { return await loadOnDeviceModel(path); } catch (error) { throw new Error(`Native model load failed for ${path}: ${error.message || 'unknown error'}`); } }
  async stream({ model, messages, signal, onToken }) { return runOnDeviceChat({ model, messages, signal, onToken }); }
  async stop() { return { stopped: true }; }
  async unloadModel() { return unloadOnDeviceModel(); }
}

export function createModelProvider({ mode = 'ollama', endpoint } = {}) {
  return assertModelProvider(mode === 'on-device' ? new OnDeviceProvider() : new OllamaProvider(endpoint));
}

export function assertModelProvider(provider) {
  const required = ['getStatus', 'loadModel', 'stream', 'stop', 'unloadModel'];
  for (const method of required) {
    if (typeof provider?.[method] !== 'function') throw new Error(`Invalid model provider: missing ${method}()`);
  }
  return provider;
}
