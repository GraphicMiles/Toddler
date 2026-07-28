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
  async loadModel() { return { loaded: true, reused: true, loadMs: 0 }; }
  async stream({ model, messages, signal, onToken }) {
    const modelName = typeof model === 'string' ? model : model?.ollamaName || model?.id;
    if (!modelName) throw new Error('An Ollama model name is required.');
    return streamOllamaChat({ url: this.url, model: modelName, messages, signal, onToken });
  }
  async stop() { return { stopped: true }; }
  async unloadModel() { return { unloaded: true }; }
}

export class OnDeviceProvider {
  constructor() { this.kind = 'on-device'; }
  async getStatus() { return { ...(await getOnDeviceRuntimeInfo()), kind: this.kind }; }
  async loadModel(model) {
    if (!model?.localPath) throw new Error('Select a downloaded offline model first.');
    if (typeof model.localPath !== 'string' || !model.localPath.startsWith('/')) throw new Error(`Invalid Android runtime model path: ${model.localPath}`);
    const status = await getOnDeviceRuntimeInfo();
    if (status.loaded && status.loadedModelId === model.id && status.loadedPath === model.localPath) {
      return { loaded: true, reused: true, modelId: model.id, loadMs: status.lastLoadMs || 0 };
    }
    try { return await loadOnDeviceModel(model); }
    catch (error) {
      const wrapped = new Error(`Native model load failed: ${error.message || 'unknown error'}`);
      wrapped.code = error.code || 'MODEL_LOAD_FAILED';
      throw wrapped;
    }
  }
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
